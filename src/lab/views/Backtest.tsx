import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { BacktestResult, BacktestTrade, YearStat } from '../types';
import { Skeleton, inr, pct, shortDate, tone, useAsync } from '../ui';
import { count } from '../fmt';

const yearOf = (d: string | null) => (d ? d.slice(0, 4) : '');
export const PAGE = 50;

/** The past test (or the engine's record) for a strategy. The server queues it on save; this hook polls while it runs. */
export function useBacktest(id: string, onReady?: () => void) {
  const bt = useAsync(() => api.strategyBacktest(id), [id]);
  const status = bt.data?.status;
  const wasRunning = useRef(false);
  useEffect(() => { if (status === 'running') wasRunning.current = true; else if (status === 'done' && wasRunning.current) { wasRunning.current = false; onReady?.(); } }, [status, onReady]);
  useEffect(() => {
    if (status !== 'running') return;
    const t = setTimeout(bt.reload, 4000);
    return () => clearTimeout(t);
  }, [status, bt.data, bt.reload]);
  return { status, result: bt.data?.result as BacktestResult | undefined, error: bt.error ?? (status === 'failed' ? `The past test could not run: ${bt.data?.error || 'unknown error'}.` : undefined), loading: bt.loading && !bt.data, reload: bt.reload };
}

export const yearStat = (r: BacktestResult | undefined, year: string): YearStat | null => (r?.summary?.[year] as YearStat | undefined) ?? null;

/** Closed results for one year, newest first, latest 50 with a Show more button. The counts above cover every result. */
export function ClosedList({ r, year }: { r: BacktestResult; year: string }) {
  const [n, setN] = useState(PAGE);
  useEffect(() => setN(PAGE), [year]);
  const all = (r.trades ?? []).filter(t => yearOf(t.entry_date) === year);
  const total = yearStat(r, year)?.trades ?? all.length;
  if (all.length === 0) return <div className="empty"><b>No closed results in {year}</b>{total > 0 ? 'They are counted above; the list holds the most recent ones.' : 'When this scan matches a stock and it closes, it appears here.'}</div>;
  return (
    <>
      <p className="listnote num">Showing the latest {Math.min(n, all.length)} of {count(total)} closed in {year}</p>
      <div className="rows num">{all.slice(0, n).map(t => <PastRow key={`${t.symbol}-${t.entry_date}`} t={t} />)}</div>
      {all.length > n && <div style={{ textAlign: 'center', marginTop: 12 }}><button className="btn sm" onClick={() => setN(n + PAGE)}>Show {Math.min(PAGE, all.length - n)} more</button></div>}
    </>
  );
}

export function BacktestState({ bt }: { bt: ReturnType<typeof useBacktest> }) {
  if (bt.loading) return <Skeleton n={1} />;
  if (bt.error) return <p className="down" style={{ marginTop: 8 }}>{bt.error} <button className="btn sm" onClick={bt.reload}>Try again</button></p>;
  if (bt.status === 'running') return <p className="sub" aria-live="polite" style={{ marginTop: 8 }}><span className="spin" /> Checking every NSE stock since 2020 against this scan. This takes up to a minute.</p>;
  return null;
}

function PastRow({ t }: { t: BacktestTrade }) {
  return (
    <a className="row" href={`#c-${t.symbol}`}>
      <div style={{ minWidth: 0 }}>
        <div className="t">{t.symbol}{t.origin === 'live' && <span className="pill up">Live</span>}{t.group && <span className="pill">{t.group}</span>}</div>
        <div className="s">{shortDate(t.entry_date)} → {shortDate(t.exit_date)} · {inr(t.entry_price)}{t.exit_reason ? ` · ${reason(t.exit_reason)}` : ''}</div>
      </div>
      <div className={`num ${tone(t.ret_pct)}`} style={{ fontWeight: 700, fontSize: 16 }}>{pct(t.ret_pct, 2)}</div>
    </a>
  );
}

const reason = (r: string) => ({ stop: 'loss limit', target: 'gain limit', time: 'time limit', trail: 'trailing exit', rule: 'exit rule' } as Record<string, string>)[r] ?? r.replace(/_/g, ' ');
