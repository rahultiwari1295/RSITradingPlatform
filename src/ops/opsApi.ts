/**
 * Ops page API client. The server (not this file) decides who is an admin: every call sends the
 * signed-in user's Firebase ID token and /api/admin/* verifies it. The email constant below only
 * decides whether to *show* the page.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../lib/firebase";

export const OWNER_EMAIL = "rahultiwari1295@gmail.com";

function base(): string {
  return ((import.meta as any).env?.VITE_VPS_API_URL as string | undefined) || "";
}

export class OpsAuthError extends Error {}

export async function opsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const u = auth.currentUser;
  if (!u) throw new OpsAuthError("not signed in");
  const token = await u.getIdToken();
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (res.status === 401 || res.status === 403) throw new OpsAuthError("not allowed");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const opsPost = <T = any>(path: string, body?: unknown) =>
  opsFetch<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

/** GET with polling; pauses while the tab is hidden. */
export function useOps<T>(path: string | null, intervalMs = 30000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const d = await opsFetch<T>(path);
      if (alive.current) { setData(d); setError(null); }
    } catch (e: any) {
      if (alive.current) setError(e?.message || "failed");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    load();
    if (!intervalMs) return () => { alive.current = false; };
    const t = setInterval(() => { if (!document.hidden) load(); }, intervalMs);
    return () => { alive.current = false; clearInterval(t); };
  }, [load, intervalMs]);

  return { data, error, loading, reload: load };
}

export function ago(iso?: string | null): string {
  if (!iso) return "never";
  const t = new Date(iso.replace(" ", "T")).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const num = (v: any, d = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: d }));
