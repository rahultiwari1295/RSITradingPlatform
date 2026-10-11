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
  const token = authed ? await auth.currentUser?.getIdToken() : undefined;
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/lab/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) {
    let msg = 'Something went wrong. Please try again.';
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* keep default */ }
    throw new ApiError(r.status, msg);
  }
  return r.json() as Promise<T>;
}
const q = (o: Record<string, string | number | boolean | undefined>) =>
  '?' + Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

const real: LabApi = {
  catalog: () => call('GET', '/catalog', undefined, false),
  today: () => call('GET', '/today'),
  scan: (tf, entry) => call('POST', '/scan', { tf, entry }),
  backtest: (tf, entry, exit) => call('POST', '/backtest', { tf, entry, exit }),
  strategyBacktest: id => call('GET', `/strategies/${id}/backtest`, undefined, false),
  runStrategyBacktest: id => call('POST', `/strategies/${id}/backtest`),
  job: id => call('GET', `/jobs/${id}`),
  strategies: scope => call('GET', `/strategies${q({ scope })}`),
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
