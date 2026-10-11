import React, { useState } from "react";
import { q } from "./core";
import { Icon } from "./ui";
import { useAccount, signIn, signUp, signInGoogle, resetPassword, logOut, friendlyAuthError, getPrefs, setPrefs, turnOnPush, pushState, type Prefs } from "./account";

const initial = (e?: string | null) => (e || "?").trim().charAt(0).toUpperCase();

export function AccountSheet({ onClose, onTheme, dark }: { onClose: () => void; onTheme: () => void; dark: boolean }) {
  const { user } = useAccount();
  return user ? <Signed user={user} onClose={onClose} onTheme={onTheme} dark={dark} /> : <Auth onClose={onClose} />;
}

function Auth({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<any>) => { setErr(""); setInfo(""); setBusy(true); try { await f(); onClose(); } catch (e) { setErr(friendlyAuthError(e)); } finally { setBusy(false); } };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!email.trim()) return setErr("Enter your email."); if (pw.length < 6) return setErr("Use at least 6 characters for the password."); run(() => (mode === "in" ? signIn(email.trim(), pw) : signUp(email.trim(), pw))); };
  const forgot = async () => { if (!email.trim()) return setErr("Type your email first, then tap Forgot password."); setErr(""); try { await resetPassword(email.trim()); setInfo("Reset link sent. Check your inbox."); } catch (e) { setErr(friendlyAuthError(e)); } };
  return (
    <>
      <div className={q("acc-head")}>
        <span className={q("avatar big")}><Icon n="user" s={26} w={2} /></span>
        <div><h2>{mode === "in" ? "Welcome back" : "Create your account"}</h2><p className={q("mu")} style={{ margin: "4px 0 0", fontSize: 14 }}>Your portfolio is saved safely and opens on any device.</p></div>
      </div>
      <div className={q("seg")} role="tablist">
        <button type="button" role="tab" aria-selected={mode === "in"} className={mode === "in" ? q("on") : ""} onClick={() => { setMode("in"); setErr(""); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "up"} className={mode === "up" ? q("on") : ""} onClick={() => { setMode("up"); setErr(""); }}>Sign up</button>
      </div>
      <button type="button" className={q("btn soft w")} style={{ marginTop: 14, flexDirection: "row", gap: 10 }} disabled={busy} onClick={() => run(signInGoogle)}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ flex: "none" }}><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
        Continue with Google
      </button>
      <p className={q("or")}><span>or with email</span></p>
      <form onSubmit={submit} noValidate>
        <div className={q("fld")} style={{ marginTop: 0 }}><label htmlFor="q-em">Email</label><input id="q-em" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className={q("fld")}><label htmlFor="q-pw">Password</label><input id="q-pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" /></div>
        <p className={q("err")} role="alert">{err}{info ? <span style={{ color: "var(--up)" }}>{info}</span> : null}</p>
        <button type="submit" className={q("btn acc w")} disabled={busy} style={{ ["--acc" as any]: "var(--ax)" }}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        {mode === "in" ? <button type="button" className={q("lnk")} onClick={forgot}>Forgot password?</button> : null}
      </form>
    </>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={q("sw" + (on ? " on" : ""))} onClick={() => onChange(!on)}><i /></button>;
}

function Signed({ user, onClose, onTheme, dark }: { user: any; onClose: () => void; onTheme: () => void; dark: boolean }) {
  const [p, setP] = useState<Prefs>(getPrefs()), [msg, setMsg] = useState(""), [ps, setPs] = useState(pushState());
  const upd = async (k: keyof Prefs, v: boolean) => {
    const n = { ...p, [k]: v }; setP(n); setPrefs(n);
    if (v && ps !== "granted") { const ok = await turnOnPush(); setPs(pushState()); setMsg(ok ? "Phone alerts are on." : ps === "denied" ? "Alerts are blocked in your browser settings." : "Could not turn on phone alerts here."); }
  };
  const rows: [keyof Prefs, string, string][] = [["calls", "AI Calls", "New buy and sell calls"], ["patterns", "Pattern Calls", "Breakouts on your watch"], ["portfolio", "My portfolio", "Daily check on your stocks"]];
  return (
    <>
      <div className={q("acc-head")}>
        <span className={q("avatar big on")}>{initial(user.displayName || user.email)}</span>
        <div style={{ minWidth: 0 }}><h2 style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{user.displayName || "Your account"}</h2><p className={q("mu")} style={{ margin: "4px 0 0", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p></div>
      </div>
      <p className={q("grp")}>Alerts</p>
      <div className={q("list")}>
        {rows.map(([k, t, s]) => (
          <div key={k} className={q("row ind")}><span className={q("ico sm")} style={{ ["--c" as any]: "var(--ax)" }}><Icon n="bell" s={17} w={2.2} /></span><div className={q("grow")}><div className={q("t1")}>{t}</div><div className={q("t2")}>{s}</div></div><Toggle on={p[k]} onChange={(v) => upd(k, v)} label={t + " alerts"} /></div>
        ))}
      </div>
      <p className={q("err")} style={{ color: "var(--mu)" }}>{msg}</p>
      <p className={q("grp")}>Appearance</p>
      <div className={q("list")}>
        <div className={q("row ind")}><span className={q("ico sm")} style={{ ["--c" as any]: "var(--pt)" }}><Icon n={dark ? "moon" : "sun"} s={17} w={2.2} /></span><div className={q("grow")}><div className={q("t1")}>Dark mode</div></div><Toggle on={dark} onChange={onTheme} label="Dark mode" /></div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="button" className={q("btn soft")} style={{ flex: 1 }} onClick={onClose}>Close</button>
        <button type="button" className={q("btn soft")} style={{ flex: 1, color: "var(--dn)" }} onClick={async () => { await logOut(); onClose(); }}><Icon n="out" s={17} w={2.2} /> Sign out</button>
      </div>
    </>
  );
}
