import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Sparkles, Undo2 } from 'lucide-react';
import { api, waitJob } from '../api';
import { signIn } from '../auth';
import { CompareTable } from '../kit';
import { compareRows, exitGate, gateStat, pickOptions, plainStat, type Option } from '../pick';
import type { Enhancement, JobStatus, StrategyCard } from '../types';
import { Skeleton, toast } from '../ui';

function Working({ job, label, step }: { job: JobStatus | null; label: string; step?: string }) {
  const where = job?.status === 'queued' && job.position ? `In line · position ${job.position}${job.eta_s ? ` · about ${Math.max(1, Math.round(job.eta_s / 60))} min` : ''}` : 'Working on it';
  return (
    <div className="working" aria-live="polite">
      <span className="spin" />
      <div style={{ flex: 1, minWidth: 0 }}><b>{label}</b><span className="s">{step ? `${step} · ` : ''}{where}. You can leave this page; the result will be here when you return.</span>
        <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${job?.progress ?? 4}%` }} /></div></div>
    </div>
  );
}

/** Two buttons: improve the entry, improve the exit. The AI picks the options; the user only chooses to apply. */
export function AiEnhance({ s, year, uid, onChanged }: { s: StrategyCard; year: string; uid: string | null; onChanged: () => void }) {
  const [e, setE] = useState<Enhancement | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [busy, setBusy] = useState<'entry' | 'exit' | null>(null);
  const [step, setStep] = useState<string | undefined>();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    const r: Enhancement = await api.enhancement(s.id).catch(err => ({ status: 'failed', reason: (err as Error).message, result: null, exit: null }));
    if (alive.current) setE(r);
    return r;
  }, [s.id]);
  useEffect(() => { load(); }, [load, s.version]);
  useEffect(() => {
    if (busy || !e || (e.status !== 'queued' && e.status !== 'running')) return;
    const t = setInterval(async () => { const r = await load(); if (r.status === 'done') onChanged(); }, 3000);
    return () => clearInterval(t);
  }, [e, busy, load, onChanged]);

  const runJob = async (start: () => Promise<{ job_id: string }>) => { setJob(null); const { job_id } = await start(); await waitJob(job_id, j => alive.current && setJob(j)); return load(); };
  const guard = async (kind: 'entry' | 'exit', fn: () => Promise<void>) => {
    if (!uid) { await signIn(); return; }
    try { setBusy(kind); await fn(); onChanged(); } catch (err) { toast((err as Error).message); } finally { if (alive.current) { setBusy(null); setStep(undefined); } }
  };
  const enhanceEntry = () => guard('entry', async () => { await runJob(() => api.enhance(s.id)); });
  const enhanceExit = () => guard('exit', async () => {
    let cur = e;
    let gate = exitGate(s.ai_gate, pickOptions(cur?.result ?? null));
    if (!gate) { setStep('Step 1 of 2 · entries'); cur = await runJob(() => api.enhance(s.id)); gate = exitGate(s.ai_gate, pickOptions(cur.result)); }
    if (!gate) { toast('We could not find a safe improvement to build on yet.'); return; }
    setStep(cur === e ? undefined : 'Step 2 of 2 · exits');
    await runJob(() => api.enhanceExit(s.id, gate!));
  });

  if (!e) return <Skeleton n={1} />;
  const r = e.result;
  const options = pickOptions(r);
  const working = busy ?? (e.status === 'queued' || e.status === 'running' ? 'entry' : null);
  const inUse = s.ai_gate != null;
  const canRun = s.mine;
  const staleExit = !!e.exit && inUse && e.exit.gate !== s.ai_gate;

  const applyEntry = async (o: Option) => { await api.setGate(s.id, o.gate); toast('Done. Your enhanced version is live; its record starts today.'); onChanged(); load(); };
  const removeEntry = async () => { await api.setGate(s.id, null); toast('Back to your original. Its record starts today.'); onChanged(); load(); };
  const applyExit = async () => {
    if (!e.exit) return;
    if (!inUse) await api.setGate(s.id, e.exit.gate); // the enhanced exit was tested on the enhanced entries
    await api.setExitChoice(s.id, 'ai'); toast('Done. Your enhanced exit is live; its record starts today.'); onChanged(); load();
  };
  const removeExit = async () => { await api.setExitChoice(s.id, 'user'); toast('Back to your own exit.'); onChanged(); load(); };

  return (
    <section className="ai" aria-labelledby="ai-h">
      <h2 id="ai-h"><Sparkles aria-hidden="true" /> Make it better with AI</h2>
      <p className="secnote">The AI studies every past result of this scan, learns which ones tended to work, and builds a stronger version. Nothing changes until you choose to use it.</p>

      {canRun && (
        <div className="aibtns">
          <button className="aibtn" onClick={enhanceEntry} disabled={!!working} aria-busy={working === 'entry'}><i><Sparkles /></i><div><b>Enhance entry with AI</b><span>Pick the stocks that tend to work</span></div></button>
          <button className="aibtn" onClick={enhanceExit} disabled={!!working} aria-busy={working === 'exit'}><i><Sparkles /></i><div><b>Enhance exit with AI</b><span>Close results at better moments</span></div></button>
        </div>
      )}
      {!canRun && <p className="secnote" style={{ margin: 0 }}>{inUse ? 'This strategy’s owner enhanced it with AI.' : 'Only the owner can enhance a strategy. Copy it to make your own.'}</p>}

      {working && <Working job={job} label={working === 'entry' ? 'The AI is studying your entries' : 'The AI is studying your exits'} step={step} />}

      {!working && e.status === 'insufficient' && <p className="secnote" style={{ marginTop: 14, marginBottom: 0 }}>{e.reason ?? 'There are not enough past results yet.'}</p>}
      {!working && e.status === 'failed' && <p className="down" style={{ marginTop: 14 }}>The last run didn’t finish. {e.reason} Please try again.</p>}

      {!working && e.status === 'done' && r && (
        options.length === 0 && !inUse ? (
          <div className="opt"><h3>Your entry is already solid</h3><p className="why" style={{ marginBottom: 0 }}>We tested it carefully and found no change that clearly helps, so we are leaving it as it is.</p></div>
        ) : (
          <>
            {options.map(o => {
              const mine = s.ai_gate === o.gate;
              const rows = compareRows(plainStat(r, year), gateStat(r, o.gate, year));
              return (
                <div className="opt" key={o.gate}>
                  <h3>{o.title}{mine && <span className="pill up"><Check /> In use</span>}</h3>
                  <p className="why">{o.blurb}</p>
                  <CompareTable rows={rows} afterHead="Enhanced" />
                  <p className="cmp-note">Past results in {year}. Your live record restarts from the day you switch.</p>
                  <div className="cta">
                    {mine ? <button className="btn sm ghost" onClick={removeEntry}><Undo2 /> Back to my original</button>
                      : canRun ? <button className="btn gold sm" onClick={() => applyEntry(o)}><Sparkles /> Use this version</button> : null}
                    {!mine && <span className="proud"><Sparkles size={14} /> We enhanced your strategy</span>}
                  </div>
                </div>
              );
            })}
            {options.length === 0 && inUse && (
              <div className="opt"><h3>Enhanced by AI <span className="pill up"><Check /> In use</span></h3>
                <div className="cta"><button className="btn sm ghost" onClick={removeEntry}><Undo2 /> Back to my original</button></div></div>
            )}
          </>
        )
      )}

      {!working && e.exit && (
        e.exit.improved && e.exit.best ? (
          <div className="opt">
            <h3>Better exit found{s.exit_choice === 'ai' && <span className="pill up"><Check /> In use</span>}</h3>
            <p className="why">The AI tried many ways of closing a result and kept the one that held up best.</p>
            <CompareTable rows={compareRows(e.exit.yours, e.exit.best)} afterHead="Enhanced" />
            <p className="cmp-note">Past results, {r?.gates ? '2023 to 2026 together' : 'all years together'}.{staleExit ? ' Tested with a different entry version; run it again to refresh.' : ''}{!inUse && s.exit_choice !== 'ai' ? ' Using it also switches on the enhanced entry it was tested with.' : ''}</p>
            <div className="cta">
              {s.exit_choice === 'ai' ? <button className="btn sm ghost" onClick={removeExit}><Undo2 /> Back to my own exit</button>
                : canRun && !staleExit ? <button className="btn gold sm" onClick={applyExit}><Sparkles /> Use this exit</button> : null}
              {s.exit_choice !== 'ai' && <span className="proud"><Sparkles size={14} /> We enhanced your strategy</span>}
            </div>
          </div>
        ) : (
          <div className="opt"><h3>Your exit is already solid</h3><p className="why" style={{ marginBottom: 0 }}>We tried many alternatives and none clearly beat yours, so it stays as it is.</p></div>
        )
      )}
    </section>
  );
}
