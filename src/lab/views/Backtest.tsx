import { useEffect, useState } from 'react';
import { api } from '../api';
import type { BacktestResult, BacktestTrade } from '../types';
import { Seg, Skeleton, inr, pct, plainPct, shortDate, tone, useAsync } from '../ui';

const yearOf = (d: string | null) => (d ? d.slice(0, 4) : '');

/** Past test for a strategy (2023 onwards). The server queues it on save and recomputes stale results; this panel polls. */
export function BacktestPanel({ id }: { id: string; uid?: string | null }) {
  const bt = useAsync(() => api.strategyBacktest(id), [id]);
  const status = bt.data?.status;
  useEffect(() => {
    if (status !== 'running') return;
    const t = setTimeout(bt.reload, 4000);
    return () => clearTimeout(t);
  }, [status, bt.data, bt.reload]);
  const r: BacktestResult | undefined = bt.data?.result;
  const engine = r?.source === 'engine';
  const title = engine ? `Full record · ${r!.years[0]}–${r!.years[r!.years.length - 1]}` : r?.ai_gate ? `Past test · 2023–2026 · AI score ≥ ${r.ai_gate}` : 'Past test · 2023–2026';
  return (
    <>
      <div className="eyebrow">{title}</div>
      {r?.note && <p className="mute" style={{ fontSize: 12, margin: '4px 2px 0' }}>{r.note}</p>}
      {bt.loading && !bt.data ? <div style={{ marginTop: 8 }}><Skeleton n={2} /></div>
        : bt.error ? <p className="down" style={{ marginTop: 8 }}>{bt.error} <button className="btn sm" onClick={bt.reload}>Try again</button></p>
        : status === 'running' ? <p className="sub" aria-live="polite" style={{ marginTop: 8 }}><span className="spin" /> Running the past test on every NSE stock since 2020. This takes up to a minute.</p>
        : status === 'failed' ? <p className="down" style={{ marginTop: 8 }}>The past test could not run: {bt.data?.error || 'unknown error'}. <button className="btn sm" onClick={bt.reload}>Try again</button></p>
        : r ? <Results r={r} /> : <p className="sub" style={{ marginTop: 8 }}>No past test yet.</p>}
      <p className="mute" style={{ fontSize: 12, margin: '8px 2px 0' }}>{engine ? 'Recorded results, not a forecast.' : 'Past tests, not a forecast. Costs of 0.10% per side included.'} Worst dip is on an equal-weight curve of closed results.</p>
    </>
  );
}

function Results({ r }: { r: BacktestResult }) {
  const years = r.years.map(String);
  const [yr, setYr] = useState<string>('All');
  const [n, setN] = useState(50);
  const trades = (r.trades ?? []).filter(t => yr === 'All' || yearOf(t.entry_date) === yr);
  return (
    <>
      <div className="rows num" style={{ marginTop: 8 }}>
        {['All', ...(r.summary.Live ? ['Live'] : []), ...years].map(y => { const x = r.summary[y];
          return (
            <div key={y} className="row"><div><div className="t">{y === 'All' ? 'All years' : y === 'Live' ? `Live only · since ${shortDate(r.live_since)}` : y}</div>
              <div className="s">{x?.trades ?? 0} closed · <span className="up">{x?.wins ?? 0}</span>/<span className="down">{x?.losses ?? 0}</span>
                {x?.profit_factor != null && <> · PF {x.profit_factor.toFixed(2)}</>}
                {x?.max_dd != null && <> · worst dip {pct(x.max_dd, 1)}</>}</div></div>
              <div style={{ textAlign: 'right' }}><b>{plainPct(x?.win_rate)}</b><div className={`s ${tone(x?.avg_ret)}`}>{pct(x?.avg_ret, 2)} avg</div></div></div>); })}
      </div>
      {r.trades && r.trades.length > 0 && (
        <section className="sec">
          <div className="eyebrow">{r.source === 'engine' ? 'Closed results' : 'Past-test results'} · newest first{r.trades.length < (r.summary.All?.trades ?? 0) ? ` · latest ${r.trades.length} of ${r.summary.All.trades.toLocaleString('en-IN')}` : ''}</div>
          <div style={{ margin: '8px 0' }}>
            <Seg label="Year" value={yr} onChange={v => { setYr(v); setN(50); }} options={[{ v: 'All', label: 'All' }, ...years.map(y => ({ v: y, label: y }))]} />
          </div>
          <div className="rows num">
            {trades.length === 0 ? <div className="row"><div className="s">No results in this year among the latest {r.trades.length}.</div></div>
              : trades.slice(0, n).map(t => <PastRow key={`${t.symbol}-${t.entry_date}`} t={t} />)}
          </div>
          {trades.length > n && <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setN(n + 50)}>Show more ({trades.length - n})</button>}
        </section>
      )}
    </>
  );
}

function PastRow({ t }: { t: BacktestTrade }) {
  return (
    <a className="row" href={`#c-${t.symbol}`}>
      <div style={{ minWidth: 0 }}>
        <div className="t">{t.symbol}{t.is_open && <span className="pill">Still open</span>}{t.origin && <span className={`pill ${t.origin === 'live' ? 'up' : ''}`}>{t.origin === 'live' ? 'Live' : 'Tested'}</span>}{t.group && <span className="pill">{t.group}</span>}</div>
        <div className="s">{shortDate(t.entry_date)} {t.entry_date?.slice(0, 4)} → {t.is_open ? 'now' : `${shortDate(t.exit_date)} ${t.exit_date?.slice(0, 4) ?? ''}`} · {inr(t.entry_price)}{t.exit_reason && !t.is_open ? ` · ${reason(t.exit_reason)}` : ''}</div>
      </div>
      <div className={`num ${tone(t.ret_pct)}`} style={{ fontWeight: 700, fontSize: 15 }}>{pct(t.ret_pct, 2)}</div>
    </a>
  );
}

const reason = (r: string) => ({ stop: 'loss limit', target: 'gain limit', time: 'time limit', trail: 'trailing exit', rule: 'exit rule' } as Record<string, string>)[r] ?? r.replace(/_/g, ' ');
