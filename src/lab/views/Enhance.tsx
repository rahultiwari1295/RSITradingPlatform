import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { api, waitJob } from '../api';
import { describeExit } from '../rules';
import type { Catalog, Enhancement, JobStatus, StrategyCard, YearStat } from '../types';
import { plainPct, pct, tone, toast, Skeleton } from '../ui';

const GATES = ['50', '60', '70', '80', '90'];

function Processing({ job, label }: { job: JobStatus | null; label: string }) {
  return (
    <div className="tile enh" aria-live="polite">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="spin" /><div><b>{label}</b>
        <div className="sub" style={{ fontSize: 13 }}>{job?.status === 'queued' && job.position ? `In line · position ${job.position}${job.eta_s ? ` · about ${Math.max(1, Math.round(job.eta_s / 60))} min` : ''}` : job?.stage ?? 'Starting'}</div></div></div>
      <div className="bar" style={{ marginTop: 16 }}><i style={{ width: `${job?.progress ?? 4}%` }} /></div>
      <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>You can leave this page. We keep working and the result will be here when you return.</p>
    </div>
  );
}

const cell = (s: YearStat | undefined) => s ?? { trades: 0, wins: 0, losses: 0, win_rate: null, avg_ret: null };

export function EnhancePanel({ s, cat, onChanged }: { s: StrategyCard; cat: Catalog; onChanged: () => void }) {
  const [e, setE] = useState<Enhancement | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [busy, setBusy] = useState<'entry' | 'exit' | null>(null);
  const [year, setYear] = useState('All');
  const [more, setMore] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => { const r = await api.enhancement(s.id); if (alive.current) setE(r); return r; }, [s.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (busy || !e || (e.status !== 'queued' && e.status !== 'running')) return;
    const t = setInterval(async () => { const r = await load(); if (r.status === 'done') onChanged(); }, 3000);
    return () => clearInterval(t);
  }, [e, busy, load, onChanged]);

  const run = async (kind: 'entry' | 'exit', start: () => Promise<{ job_id: string }>) => {
    try {
      setBusy(kind); setJob(null);
      const { job_id } = await start();
      await waitJob(job_id, j => alive.current && setJob(j));
      await load(); onChanged();
    } catch (err) { toast((err as Error).message); }
    finally { if (alive.current) setBusy(null); }
  };

  if (!e) return <Skeleton n={1} />;
  if (busy === 'entry' || e.status === 'queued' || e.status === 'running') return <Processing job={job} label="AI enhancement in progress" />;

  if (e.status === 'none' || e.status === 'failed' || e.status === 'insufficient') {
    return (
      <div className="tile">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Sparkles color="var(--accent)" /><h2>Enhance with AI</h2></div>
        <p className="sub" style={{ margin: '10px 0 14px' }}>We replay every past result of this scan, find which ones tended to work, and let you filter out the noise with a score from 50 to 90. Tested on 2023 onward.</p>
        {e.status === 'insufficient' && <p className="down" style={{ marginBottom: 12 }}>{e.reason ?? 'Not enough past results yet.'}</p>}
        {e.status === 'failed' && <p className="down" style={{ marginBottom: 12 }}>The last run didn’t finish. {e.reason}</p>}
        {s.mine && <button className="btn gold" onClick={() => run('entry', () => api.enhance(s.id))}><Sparkles /> Enhance with AI</button>}
      </div>
    );
  }

  const r = e.result!;
  const view = (g: string) => (year === 'All' ? r.gates[g].All : cell(r.gates[g][year] as YearStat));
  const years = ['All', ...Object.keys(r.gates['50']).filter(k => /^\d{4}$/.test(k))];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={`tile ${s.enhanced ? 'enh' : ''}`}>
        <div className="sec-h"><div><div className="eyebrow">AI enhancement</div><h2>Pick a score</h2></div>
          {s.ai_gate && <button className="btn sm ghost" onClick={async () => { await api.setGate(s.id, null); toast('AI filter removed. Live record restarts.'); onChanged(); }}>Remove filter</button>}</div>
        {!r.edge_found && <p className="sub" style={{ marginBottom: 12 }}>We didn’t find a clear, repeatable edge on this scan. The numbers are shown as they are.</p>}
        <div className="chips" style={{ marginBottom: 12 }} role="group" aria-label="Year">{years.map(y => <button key={y} className="chip" aria-pressed={year === y} onClick={() => setYear(y)}>{y}</button>)}</div>
        <div className="rows num" style={{ background: 'var(--bg2)' }}>
          <div className="gate" style={{ gridTemplateColumns: '54px 1fr auto', fontSize: 11, color: 'var(--ink3)' }}><span>Score</span><span>Win rate · trades</span><span>Avg</span></div>
          {GATES.map(g => {
            const v = view(g);
            return (
              <div key={g}>
                <button className="gate" aria-pressed={s.ai_gate === Number(g)} onClick={() => setMore(more === g ? null : g)}>
                  <span className="sc">{g}</span>
                  <span><b>{plainPct(v.win_rate)}</b> <span className="mute">· {v.trades} trades · <span className="up">{v.wins}</span>/<span className="down">{v.losses}</span></span></span>
                  <span className={tone(v.avg_ret)}>{pct(v.avg_ret, 2)} <ChevronDown size={14} style={{ verticalAlign: -2, transform: more === g ? 'rotate(180deg)' : undefined }} /></span>
                </button>
                {more === g && (
                  <div style={{ padding: '4px 16px 16px' }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Trades per month</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{r.gates[g].months.map(m => <span key={m.month} className="pill">{m.month.slice(2)} · {m.trades}</span>)}</div>
                    <button className="btn gold sm" style={{ marginTop: 14 }} disabled={s.ai_gate === Number(g)} onClick={async () => { await api.setGate(s.id, Number(g)); toast(`Score ${g} applied. Live record restarts from today.`); onChanged(); }}>{s.ai_gate === Number(g) ? 'In use' : `Use score ${g}`}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>Without the filter: {plainPct(r.plain.win_rate)} win rate on {r.plain.trades} trades. Past results from tests; live results are tracked separately.</p>
        {r.drivers.length > 0 && <div style={{ marginTop: 14 }}><div className="eyebrow">What the score leaned on</div><ul className="sub" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{r.drivers.map(d => <li key={d}>{d}</li>)}</ul></div>}
      </div>

      {s.ai_gate && s.mine && (
        <div className="tile">
          <h2>Enhance exit</h2>
          {!e.exit ? (
            busy === 'exit' ? <div style={{ marginTop: 12 }}><Processing job={job} label="Testing exit rules" /></div> : (
              <><p className="sub" style={{ margin: '8px 0 14px' }}>We test about 25 exit styles on the scored entries and keep the one that held up best, then compare it with yours.</p>
                <button className="btn" onClick={() => run('exit', () => api.enhanceExit(s.id, s.ai_gate!))}><Sparkles /> Enhance exit</button></>)
          ) : (
            <div style={{ marginTop: 12 }}>
              <div className="grid two num">
                <div className="cond"><span className="eyebrow">Your exit</span><b>{plainPct(e.exit.yours.win_rate)} win · {pct(e.exit.yours.avg_ret, 2)}</b></div>
                <div className="cond" style={{ borderColor: 'var(--accent)' }}><span className="eyebrow" style={{ color: 'var(--accent)' }}>AI exit</span><b>{e.exit.best ? `${plainPct(e.exit.best.win_rate)} win · ${pct(e.exit.best.avg_ret, 2)}` : '—'}</b></div>
              </div>
              {e.exit.best_exit && <p className="sub" style={{ marginTop: 10, fontSize: 13 }}>{describeExit(e.exit.best_exit, cat).join(' · ')}</p>}
              <p className="mute" style={{ fontSize: 12, margin: '8px 0 12px' }}>{e.exit.improved ? 'The AI exit held up better in tests.' : 'Your exit was as good as anything we tested.'} Tested {e.exit.tested} styles.</p>
              {e.exit.improved && <button className="btn gold sm" onClick={async () => { const to = s.exit_choice === 'ai' ? 'user' : 'ai'; await api.setExitChoice(s.id, to); toast(to === 'ai' ? 'AI exit applied. Live record restarts.' : 'Back to your exit.'); onChanged(); }}>{s.exit_choice === 'ai' ? 'Use my exit' : 'Use AI exit'}</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
