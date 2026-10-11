import { useState } from 'react';
import { BellRing, Copy, Info } from 'lucide-react';
import { api } from '../api';
import { signIn } from '../auth';
import { TradeRow, go } from '../components';
import { describeExit, describeRule } from '../rules';
import { EmptyOrRows } from './shared';
import { EnhancePanel } from './Enhance';
import { BacktestPanel } from './Backtest';
import { Seg, Sheet, Skeleton, StatStrip, ErrorBox, shortDate, toast, useAsync } from '../ui';

export default function StrategyDetail({ id, uid }: { id: string; uid: string | null }) {
  const s = useAsync(() => api.strategy(id), [id]);
  const cat = useAsync(() => api.catalog(), []);
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  const [info, setInfo] = useState(false);
  const trades = useAsync(() => api.trades(id, tab), [id, tab, s.data?.version]);
  if (s.error) return <ErrorBox msg={s.error} retry={s.reload} />;
  if (s.loading || !s.data || !cat.data) return <Skeleton />;
  const d = s.data;
  const needAuth = async (fn: () => Promise<void>) => { if (!uid) { await signIn(); } await fn(); };
  return (
    <>
      <a href="#strategies" className="sub" style={{ fontSize: 13 }}>‹ Strategies</a>
      <div className="head" style={{ marginTop: 10 }}>
        <div><div className="eyebrow">{d.kind === 'flagship' ? 'QuantSync' : `@${d.owner}`} · {d.tf === '1D' ? 'Daily' : 'Weekly'} · v{d.version}</div>
          <h1>{d.name}</h1>{d.enhanced && <span className="pill gold">AI score ≥ {d.ai_gate}</span>}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="btn sm" onClick={() => needAuth(async () => { const r = await api.copyStrategy(id); toast('Copied to your strategies'); go(`s-${r.id}`); })}><Copy /> Copy &amp; edit</button>
        <button className="btn sm" onClick={() => needAuth(async () => { await api.follow(id, true, true); toast('Alerts on for this strategy'); })}><BellRing /> Get alert</button>
        <button className="btn sm" onClick={() => setInfo(true)}><Info /> Show info</button>
      </div>
      <StatStrip s={d.stats} />
      <p className="mute" style={{ fontSize: 12, margin: '10px 2px 0' }}>Live since {shortDate(d.live_from)}. Results are recorded as they happen; past tests are shown separately.</p>
      <section className="sec">
        <Seg label="Trades" value={tab} onChange={v => setTab(v)} options={[{ v: 'active', label: `Active${d.stats.open ? ` · ${d.stats.open}` : ''}` }, { v: 'closed', label: 'Closed' }]} />
        <div style={{ marginTop: 12 }}>
          {trades.loading ? <Skeleton n={3} /> : <EmptyOrRows items={trades.data ?? []} empty={tab === 'active' ? 'No active results' : 'No closed results yet'} render={t => <TradeRow key={t.id} t={t} />} />}
        </div>
      </section>
      <section className="sec"><BacktestPanel id={id} uid={uid} /></section>
      {(d.mine || d.enhanced) && <section className="sec"><EnhancePanel s={d} cat={cat.data} onChanged={() => { s.reload(); trades.reload(); }} /></section>}
      {info && (
        <Sheet title="Strategy rules" onClose={() => setInfo(false)}>
          <div className="eyebrow">Entry</div>
          <ul className="sentence" style={{ paddingLeft: 18, margin: '6px 0 16px' }}>{describeRule(cat.data, d.info!.entry).map(x => <li key={x}>{x}</li>)}</ul>
          <div className="eyebrow">Exit</div>
          <ul className="sentence" style={{ paddingLeft: 18, margin: '6px 0 0' }}>{describeExit(d.info!.exit, cat.data).map(x => <li key={x}>{x}</li>)}</ul>
          <p className="mute" style={{ fontSize: 12, marginTop: 16 }}>Entries happen at the next open after a scan result. Costs of 0.10% per side are included.</p>
        </Sheet>
      )}
    </>
  );
}
