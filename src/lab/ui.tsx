import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Rec, Stats } from './types';

export const pct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`);
export const plainPct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${v.toFixed(d)}%`);
export const inr = (v: number | null | undefined) => (v == null ? '—' : '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
export const tone = (v: number | null | undefined) => (v == null ? 'mute' : v >= 0 ? 'up' : 'down');
export const shortDate = (s: string | null | undefined) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const run = useCallback(() => {
    let live = true;
    set(s => ({ ...s, loading: true, error: undefined }));
    fn().then(data => live && set({ data, loading: false }), e => live && set({ loading: false, error: e?.message || 'Something went wrong.' }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { v: NoInfer<T>; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => <button key={o.v} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="sec-h" style={{ marginBottom: 16 }}><h2>{title}</h2><button aria-label="Close" onClick={onClose} className="mute"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function StatStrip({ s, rec }: { s: Stats; rec?: Rec | null }) {
  return (
    <>
      <div className="strip num" aria-label="Record">
        <div><b>{rec ? plainPct(rec.win_rate, 1) : '—'}</b><small>Win rate</small></div>
        <div><b>{rec ? rec.trades.toLocaleString('en-IN') : '—'}</b><small>Closed</small></div>
        <div><b className="up">{rec ? rec.wins.toLocaleString('en-IN') : '—'}</b><small>Won</small></div>
        <div><b className="down">{rec ? rec.losses.toLocaleString('en-IN') : '—'}</b><small>Lost</small></div>
        <div><b className={tone(rec?.avg_ret)}>{pct(rec?.avg_ret, 2)}</b><small>Avg</small></div>
        <div><b className={s.open > 0 ? 'up' : ''}>{s.open}</b><small>Active</small></div>
      </div>
      <p className="mute num" style={{ fontSize: 12, margin: '8px 2px 0' }}>
        {rec ? rec.label : 'Past test running…'}{rec?.profit_factor != null ? ` · PF ${rec.profit_factor.toFixed(2)}` : ''}{rec?.max_dd != null ? ` · worst dip ${pct(rec.max_dd, 1)}` : ''}
        {' · '}Live so far: {s.trades} closed, <span className="up">{s.wins}</span>/<span className="down">{s.losses}</span>{s.avg_ret != null ? `, ${pct(s.avg_ret, 2)} avg` : ''}
      </p>
    </>
  );
}

export const Skeleton = ({ n = 3 }: { n?: number }) => <>{Array.from({ length: n }, (_, i) => <div key={i} className="shimmer skel" />)}</>;
export const Empty = ({ title, body }: { title: string; body?: string }) => <div className="empty"><b>{title}</b>{body}</div>;
export const ErrorBox = ({ msg, retry }: { msg: string; retry?: () => void }) => (
  <div className="tile" role="alert"><b>{msg}</b>{retry && <div style={{ marginTop: 12 }}><button className="btn sm" onClick={retry}>Try again</button></div>}</div>
);

let toastSet: ((m: string) => void) | null = null;
export const toast = (m: string) => toastSet?.(m);
export function Toaster() {
  const [m, setM] = useState('');
  const t = useRef<number>(0);
  useEffect(() => { toastSet = x => { setM(x); clearTimeout(t.current); t.current = window.setTimeout(() => setM(''), 2600); }; return () => { toastSet = null; }; }, []);
  return m ? <div className="toast" role="status">{m}</div> : null;
}

export function freshness(age?: number) {
  if (age == null) return null;
  if (age <= 0) return { label: 'New today', cls: 'gold' };
  if (age <= 3) return { label: `Day ${age + 1}`, cls: '' };
  return { label: `Day ${age + 1}`, cls: '' };
}
