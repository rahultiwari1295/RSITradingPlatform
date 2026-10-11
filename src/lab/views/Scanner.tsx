import { useState } from 'react';
import { FlaskConical, Play, Save } from 'lucide-react';
import { api, waitJob } from '../api';
import { signIn, useUser } from '../auth';
import { go } from '../components';
import { GroupEditor } from '../RuleBuilder';
import { PRESET_SCANS, buildExit, countConds, describeGroup, toRule, validGroup, type Group } from '../rules';
import type { BacktestResult, Catalog, ScanResult, TF } from '../types';
import { Empty, ErrorBox, Seg, Sheet, Skeleton, inr, pct, plainPct, shortDate, toast, tone, useAsync } from '../ui';

function SaveSheet({ tf, tree, onClose }: { tf: TF; tree: Group; onClose: () => void }) {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [stop, setStop] = useState('5'), [target, setTarget] = useState('10'), [time, setTime] = useState('20');
  const [bt, setBt] = useState<BacktestResult | null>(null);
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);
  const [msg, setMsg] = useState('');
  const entry = toRule(tree);
  const exit = buildExit(stop, target, time);

  const guard = async () => { if (!user) await signIn(); };
  const test = async () => {
    try { setBusy('test'); setMsg('Starting…'); await guard();
      const { job_id } = await api.backtest(tf, entry, exit);
      const j = await waitJob(job_id, x => setMsg(x.status === 'queued' ? `In line · position ${x.position ?? 1}` : x.stage ?? 'Working'));
      setBt(j.result as BacktestResult);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  };
  const save = async () => {
    try { setBusy('save'); await guard(); const r = await api.createStrategy({ name: name.trim(), tf, entry, exit }); toast('Strategy saved'); go(`s-${r.id}`); }
    catch (e) { setMsg((e as Error).message); setBusy(null); }
  };
  const sm = bt?.summary;
  return (
    <Sheet title="Save as strategy" onClose={onClose}>
      <div style={{ display: 'grid', gap: 14 }}>
        <label><span className="eyebrow">Name</span><input className="inp" style={{ marginTop: 6 }} maxLength={60} placeholder="e.g. RSI trend, daily" value={name} onChange={e => setName(e.target.value)} /></label>
        <div><div className="eyebrow">Exit when any of these happens</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 6 }}>
            {[['Drop %', stop, setStop], ['Rise %', target, setTarget], [`Bars (${tf})`, time, setTime]].map(([l, v, f]) => (
              <label key={l as string}><span className="mute" style={{ fontSize: 12 }}>{l as string}</span><input className="inp num" inputMode="decimal" value={v as string} onChange={e => (f as (s: string) => void)(e.target.value)} /></label>))}
          </div></div>
        <button className="btn" disabled={!!busy} onClick={test}>{busy === 'test' ? <span className="spin" /> : <FlaskConical />} Test on 2023–2026</button>
        {busy === 'test' && <p className="sub" aria-live="polite">{msg}</p>}
        {!busy && msg && <p className="down">{msg}</p>}
        {sm && (
          <div className="rows num">
            {['All', ...bt!.years.map(String)].map(y => (
              <div key={y} className="row"><div><div className="t">{y === 'All' ? 'All years' : y}</div><div className="s">{sm[y]?.trades ?? 0} trades · <span className="up">{sm[y]?.wins ?? 0}</span>/<span className="down">{sm[y]?.losses ?? 0}</span></div></div>
                <div style={{ textAlign: 'right' }}><b>{plainPct(sm[y]?.win_rate)}</b><div className={`s ${tone(sm[y]?.avg_ret)}`}>{pct(sm[y]?.avg_ret, 2)} avg</div></div></div>))}
          </div>)}
        {sm && <p className="mute" style={{ fontSize: 12 }}>Past tests, not a forecast. After saving, the live record starts from today.</p>}
        <button className="btn gold" disabled={name.trim().length < 2 || !!busy} onClick={save}>{busy === 'save' ? <span className="spin" /> : <Save />} Save strategy</button>
      </div>
    </Sheet>
  );
}

export default function Scanner() {
  const cat = useAsync(() => api.catalog(), []);
  const [tf, setTf] = useState<TF>('1D');
  const [tree, setTree] = useState<Group>(structuredClone(PRESET_SCANS.find(p => p.id === 'rsi-turn')!.tree));
  const [picked, setPicked] = useState<string | null>('rsi-turn');
  const [res, setRes] = useState<ScanResult | null>(null);
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [save, setSave] = useState(false);

  const run = async (t: Group = tree, f: TF = tf) => {
    setState({ loading: true });
    try { setRes(await api.scan(f, toRule(t))); setState({ loading: false }); }
    catch (e) { setState({ loading: false, error: (e as Error).message }); }
  };
  const pick = (id: string) => {
    const p = PRESET_SCANS.find(x => x.id === id)!;
    const t = structuredClone(p.tree);
    setPicked(id); setTf(p.tf); setTree(t); setRes(null); run(t, p.tf);
    requestAnimationFrame(() => document.getElementById('scan-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  if (cat.error) return <ErrorBox msg={cat.error} retry={cat.reload} />;
  if (!cat.data) return <Skeleton />;
  const ready = validGroup(tree);
  const edit = (t: Group) => { setTree(t); setPicked(null); setRes(null); };
  return (
    <>
      <div className="head"><div><div className="eyebrow">Scanner</div><h1>Scan the market</h1>
        <p className="sub" style={{ margin: '4px 0 0' }}>Start with a ready-made scan, or build your own below.</p></div></div>

      {(cat.data.fsv ?? 1) < 2 && <p className="plain" role="status">The scan server is still on the previous data version, so some ready-made scans may not run until it is refreshed.</p>}
      <div className="sec-h"><h2>Ready-made scans</h2></div>
      <div className="pre-row" role="list">
        {PRESET_SCANS.map(p => (
          <button key={p.id} role="listitem" className="pre" aria-pressed={picked === p.id} onClick={() => pick(p.id)}>
            <span className={`tag t-${p.tag.toLowerCase()}`}>{p.tag}{p.tf === '1W' ? ' · Weekly' : ''}</span>
            <b>{p.name}</b>
            <span className="d">{p.blurb}</span>
          </button>))}
      </div>

      <div className="sec-h" style={{ marginTop: 26 }}><h2>Your scan</h2>
        <Seg label="Timeframe" value={tf} onChange={v => { setTf(v); setRes(null); }} options={[{ v: '1D', label: 'Daily' }, { v: '1W', label: 'Weekly' }]} /></div>
      <GroupEditor cat={cat.data} g={tree} used={countConds(tree)} onChange={edit} />
      {ready && <p className="plain">{describeGroup(cat.data, tree)}</p>}
      <div style={{ marginTop: 14 }}><button className="btn gold" disabled={!ready || state.loading} onClick={() => run()}>{state.loading ? <span className="spin" /> : <Play />} Show results</button>
        {!ready && <span className="mute" style={{ marginLeft: 10, fontSize: 12.5 }}>Fill in every value to run</span>}</div>
      {state.error && <div style={{ marginTop: 14 }}><ErrorBox msg={state.error} /></div>}
      <div id="scan-results" />
      {state.loading && !res && <section className="sec"><Skeleton n={4} /></section>}
      {res && (
        <section className="sec">
          <div className="sec-h"><h2>{res.count} {res.count === 1 ? 'match' : 'matches'}</h2><span className="mute" style={{ fontSize: 12.5 }}>As of {shortDate(res.as_of)}</span></div>
          <div className="rows">
            {res.rows.length === 0 ? <Empty title="No stocks match right now" body="Loosen a condition and try again." /> : res.rows.map(r => (
              <a className="row" key={r.symbol} href={`#c-${r.symbol}`}>
                <div><div className="t">{r.symbol}</div><div className="s num">{inr(r.close)}{r.rsi_14 != null && ` · RSI ${r.rsi_14.toFixed(0)}`}{r.vol_ratio != null && ` · Vol ${r.vol_ratio.toFixed(1)}×`}</div></div>
                <div className={`num ${tone(r.ret_1)}`} style={{ fontWeight: 700 }}>{pct(r.ret_1, 2)}</div>
              </a>))}
          </div>
          <div className="tile" style={{ marginTop: 16 }}>
            <h2>Want to see how this would have done?</h2>
            <p className="sub" style={{ margin: '6px 0 14px' }}>Turn this scan into a strategy. We test it on 2023 onward, then track it live from today.</p>
            <button className="btn gold" disabled={!ready} onClick={() => setSave(true)}><Save /> Make this a strategy</button>
          </div>
        </section>
      )}
      {save && <SaveSheet tf={tf} tree={tree} onClose={() => setSave(false)} />}
    </>
  );
}
