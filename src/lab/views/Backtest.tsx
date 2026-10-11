import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { api, waitJob } from '../api';
import { signIn } from '../auth';
import type { BacktestResult } from '../types';
import { pct, plainPct, tone, useAsync } from '../ui';

/** Past-test results for a strategy, by year (2023 onwards). Cached on the server; run on demand if missing. */
export function BacktestPanel({ id, uid }: { id: string; uid: string | null }) {
  const bt = useAsync(() => api.strategyBacktest(id), [id]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const run = async () => {
    try { setBusy(true); setMsg('Starting…'); if (!uid) await signIn();
      const { job_id } = await api.runStrategyBacktest(id);
      await waitJob(job_id, j => setMsg(j.status === 'queued' ? `In line · position ${j.position ?? 1}` : j.stage ?? 'Working'));
      bt.reload();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const r: BacktestResult | undefined = bt.data?.result;
  return (
    <>
      <div className="eyebrow">Past test · 2023–2026</div>
      {r ? (
        <div className="rows num" style={{ marginTop: 8 }}>
          {['All', ...r.years.map(String)].map(y => { const x = r.summary[y];
            return (
              <div key={y} className="row"><div><div className="t">{y === 'All' ? 'All years' : y}</div>
                <div className="s">{x?.trades ?? 0} trades · <span className="up">{x?.wins ?? 0}</span>/<span className="down">{x?.losses ?? 0}</span>{x?.max_dd != null && <> · worst dip {pct(x.max_dd, 1)}</>}</div></div>
                <div style={{ textAlign: 'right' }}><b>{plainPct(x?.win_rate)}</b><div className={`s ${tone(x?.avg_ret)}`}>{pct(x?.avg_ret, 2)} avg</div></div></div>); })}
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <button className="btn" disabled={busy || bt.loading} onClick={run}>{busy ? <span className="spin" /> : <FlaskConical />} Run past test</button>
          {busy && <p className="sub" aria-live="polite">{msg}</p>}
          {!busy && msg && <p className="down">{msg}</p>}
        </div>)}
      <p className="mute" style={{ fontSize: 12, margin: '8px 2px 0' }}>Past tests, not a forecast. Costs of 0.10% per side included.</p>
    </>
  );
}
