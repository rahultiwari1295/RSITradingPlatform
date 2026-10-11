import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { requestPushPermission } from "../lib/pushNotifications";
import { getHoldings, setHoldings, onHoldingsChange, type Holding } from "./data";

/* ---------- who is signed in ---------- */
let current: User | null = null, ready = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
try {
  onAuthStateChanged(auth, (u) => { current = u; ready = true; emit(); if (u) pull(u); });
} catch { ready = true; }

export function useAccount() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return { user: current, ready };
}

export function friendlyAuthError(e: any): string {
  const c = e?.code || "";
  if (c === "auth/unauthorized-domain") return `This site (${location.hostname}) is not allowed in Firebase yet. Add it under Authorized domains.`;
  if (c === "auth/email-already-in-use") return "This email already has an account. Use Sign in.";
  if (c === "auth/invalid-email") return "That email does not look right.";
  if (c === "auth/weak-password") return "Use at least 6 characters for the password.";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "Sign-in was closed before it finished.";
  if (["auth/wrong-password", "auth/user-not-found", "auth/invalid-credential"].includes(c)) return "Wrong email or password.";
  if (c === "auth/too-many-requests") return "Too many tries. Wait a minute and try again.";
  if (c === "auth/network-request-failed") return "No internet. Check your connection.";
  return e?.message || "Something went wrong. Try again.";
}
export const signIn = (email: string, pw: string) => signInWithEmailAndPassword(auth, email, pw);
export const signUp = (email: string, pw: string) => createUserWithEmailAndPassword(auth, email, pw);
export const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const logOut = () => signOut(auth);

/* ---------- portfolio sync (same Firestore document the classic app uses: users/{uid}.portfolio) ---------- */
const toHold = (p: any): Holding | null => {
  const sym = String(p?.symbol || "").toUpperCase(), qty = Number(p?.quantity), avg = Number(p?.buyPrice);
  return sym && qty > 0 && avg > 0 ? { sym, qty, avg } : null;
};
async function pull(u: User) {
  try {
    const ref = doc(db, "users", u.uid), snap = await getDoc(ref);
    const cloud: any[] = snap.exists() && Array.isArray(snap.data().portfolio) ? snap.data().portfolio : [];
    const cloudH = cloud.map(toHold).filter(Boolean) as Holding[], local = getHoldings();
    if (cloudH.length) {
      // cloud wins; keep any local-only stocks so nothing typed before signing in is lost
      const merged = cloudH.slice();
      local.forEach((l) => { if (!merged.some((m) => m.sym === l.sym)) merged.push(l); });
      setHoldings(merged, true);
      if (merged.length !== cloudH.length) await push(u, merged);
    } else if (local.length) await push(u, local);
    notify();
  } catch (e) { console.warn("portfolio sync failed", e); }
}
async function push(u: User, hs: Holding[]) {
  const ref = doc(db, "users", u.uid), snap = await getDoc(ref);
  const old: any[] = snap.exists() && Array.isArray(snap.data().portfolio) ? snap.data().portfolio : [];
  const next = hs.map((h) => {
    const ex = old.find((o) => String(o?.symbol || "").toUpperCase() === h.sym);
    return ex ? { ...ex, buyPrice: h.avg, quantity: h.qty, totalInvested: h.avg * h.qty }
      : { tradeId: "m_" + h.sym + "_" + Date.now().toString(36), symbol: h.sym, buyPrice: h.avg, quantity: h.qty, totalInvested: h.avg * h.qty, buyDate: new Date().toISOString().slice(0, 10), date: new Date().toISOString().slice(0, 10) };
  });
  await setDoc(ref, { portfolio: next, email: u.email || null }, { merge: true });
}
let t: any;
onHoldingsChange(() => {
  if (!current) return;
  clearTimeout(t);
  t = setTimeout(() => { if (current) push(current, getHoldings()).catch((e) => console.warn("portfolio save failed", e)); }, 600);
});
const refreshers = new Set<() => void>();
const notify = () => refreshers.forEach((f) => f());
export const onCloudPortfolio = (f: () => void) => { refreshers.add(f); return () => { refreshers.delete(f); }; };

/* ---------- settings (alerts) ---------- */
export interface Prefs { calls: boolean; patterns: boolean; portfolio: boolean }
const PK = "q-prefs";
export const getPrefs = (): Prefs => { try { return { calls: true, patterns: true, portfolio: true, ...JSON.parse(localStorage.getItem(PK) || "{}") }; } catch { return { calls: true, patterns: true, portfolio: true }; } };
export async function setPrefs(p: Prefs) {
  try { localStorage.setItem(PK, JSON.stringify(p)); } catch { /* blocked */ }
  if (current) try { await setDoc(doc(db, "users", current.uid), { alertPrefs: p }, { merge: true }); } catch { /* offline */ }
}
export async function turnOnPush(): Promise<boolean> { return current ? requestPushPermission(current.uid) : false; }
export const pushState = (): string => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
