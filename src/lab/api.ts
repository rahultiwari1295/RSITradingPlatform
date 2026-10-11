import { auth } from '../lib/firebase';
import { demoApi } from './demo';
import type { LabApi } from './types';

export const DEMO = new URLSearchParams(location.search).has('demo') || import.meta.env.VITE_LAB_DEMO === '1';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown, authed = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let token: string | undefined;
  if (authed && auth.currentUser) {
    try {
      token = await Promise.race([
        auth.currentUser.getIdToken(),
        new Promise<undefined>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
    } catch { /* proceed without token if Firebase auth hangs */ }
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const send = (h: Record<string, string>) => fetch(`/lab/api/v1${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  let r: Response;
  try { r = await send(headers); } catch { if (method !== 'GET') throw new ApiError(0, 'Network error. Check your connection.'); await new Promise(x => setTimeout(x, 800)); r = await send(headers); }
  if (method === 'GET' && r.status >= 502 && r.status <= 504) { await new Promise(x => setTimeout(x, 800)); r = await send(headers); }
  // a token the server cannot verify must not block public pages: retry reads and scans anonymously
  if (r.status === 401 && headers.Authorization && (method === 'GET' || path === '/scan')) { const { Authorization: _drop, ...anon } = headers; r = await send(anon); }
  if (!r.ok) {
    let msg = r.status >= 502 && r.status <= 504 ? 'The Lab server is busy or restarting. Try again in a moment.' : `Something went wrong (${r.status}). Please try again.`;
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* keep default */ }
    throw new ApiError(r.status, msg);
  }
  return r.json() as Promise<T>;
}
const q = (o: Record<string, string | number | boolean | undefined>) =>
  '?' + Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

const real: LabApi = {
  catalog: () => call('GET', '/catalog', undefined, false),
  today: () => call('GET', '/today', undefined, false),
  matches: () => call('GET', '/matches'),
  alerts: () => call('GET', '/alerts'),
  scan: (tf, entry) => call('POST', '/scan', { tf, entry }, false),
  backtest: (tf, entry, exit) => call('POST', '/backtest', { tf, entry, exit }),
  strategyBacktest: id => call('GET', `/strategies/${id}/backtest`),
  runStrategyBacktest: id => call('POST', `/strategies/${id}/backtest`),
  job: id => call('GET', `/jobs/${id}`),
  strategies: scope => call('GET', `/strategies${q({ scope })}`, undefined, scope === 'mine'),
  strategy: id => call('GET', `/strategies/${id}`),
  createStrategy: b => call('POST', '/strategies', b),
  copyStrategy: id => call('POST', `/strategies/${id}/copy`),
  trades: (id, status) => call('GET', `/strategies/${id}/trades${q({ status })}`),
  follow: async (id, on, alerts) => { await call('POST', `/strategies/${id}/follow${q({ on, alerts })}`); },
  enhance: id => call('POST', `/strategies/${id}/enhance`),
  enhancement: id => call('GET', `/strategies/${id}/enhancement`),
  setGate: async (id, gate) => { await call('POST', `/strategies/${id}/ai-gate`, { gate }); },
  enhanceExit: (id, gate) => call('POST', `/strategies/${id}/enhance-exit`, { gate }),
  setExitChoice: async (id, choice) => { await call('POST', `/strategies/${id}/exit-choice`, { choice }); },
  portfolio: status => call('GET', `/me/portfolio${q({ status })}`),
  chart: (symbol, tf) => call('GET', `/chart/${symbol}${q({ tf })}`, undefined, false),
  patterns: tf => call('GET', `/patterns${q({ tf })}`, undefined, false),
  setHandle: async h => { await call('PUT', `/me/handle${q({ handle: h })}`); },
};

export const api: LabApi = DEMO ? demoApi : real;

/** Polls a job until it finishes. */
export async function waitJob(id: string, onTick: (j: import('./types').JobStatus) => void, signal?: AbortSignal) {
  for (;;) {
    const j = await api.job(id);
    onTick(j);
    if (j.status === 'done') return j;
    if (j.status === 'failed') throw new ApiError(500, j.error || 'The job failed.');
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    await new Promise(r => setTimeout(r, 1500));
  }
}
