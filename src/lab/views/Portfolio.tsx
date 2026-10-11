import { useState } from 'react';
import { api } from '../api';
import { signIn, useUser } from '../auth';
import { TradeRow } from '../components';
import { EmptyOrRows } from './shared';
import type { Trade } from '../types';
import { ErrorBox, Seg, Skeleton, pct, plainPct, tone, useAsync } from '../ui';

export default function Portfolio() {
  const { user, ready } = useUser();
  const [tab, setTab] = useState<'active' | 'closed'>('active');
  const p = useAsync(() => (user ? api.portfolio(tab) : Promise.resolve(null)), [user?.uid, tab]);
  if (ready && !user) return (
    <div className="tile hero" style={{ textAlign: 'center' }}><h1>Your results, in one place</h1><p className="sub" style={{ margin: '4px 0 18px' }}>Sign in to see the strategies you follow and create.</p><button className="btn gold" onClick={signIn}>Continue with Google</button></div>
  );
  if (p.error) return <ErrorBox msg={p.error} retry={p.reload} />;
  const s = p.data?.summary;
  return (
    <>
      <div className="head"><div><div className="eyebrow">Portfolio</div><h1>Your report</h1></div></div>
      {!s ? <Skeleton n={2} /> : (
        <div className="tile hero">
          <div className="eyebrow">Active now</div>
          <div className="big num"><span className={tone(s.active_avg)}>{pct(s.active_avg, 2)}</span></div>
          <p className="sub" style={{ marginTop: 6 }}>average across {s.active} active {s.active === 1 ? 'result' : 'results'}</p>
          <div className="kv num">
            <div><span className="mute" style={{ fontSize: 11 }}>Closed</span><b>{s.closed}</b></div>
            <div><span className="mute" style={{ fontSize: 11 }}>Win rate</span><b>{s.win_rate != null ? plainPct(s.win_rate, 0) : '—'}</b></div>
            <div><span className="mute" style={{ fontSize: 11 }}>Wins / Losses</span><b><span className="up">{s.wins}</span> / <span className="down">{s.losses}</span></b></div>
            <div><span className="mute" style={{ fontSize: 11 }}>Avg closed</span><b className={tone(s.avg_ret)}>{pct(s.avg_ret, 2)}</b></div>
          </div>
          {s.win_rate == null && <p className="mute" style={{ fontSize: 12, marginTop: 14 }}>Win rate appears after 30 closed results.</p>}
        </div>)}
      <section className="sec">
        <Seg label="Trades" value={tab} onChange={v => setTab(v)} options={[{ v: 'active', label: 'Active' }, { v: 'closed', label: 'Closed' }]} />
        <div style={{ marginTop: 12 }}>{p.loading ? <Skeleton n={3} /> : <EmptyOrRows<Trade> items={p.data?.trades ?? []} empty={tab === 'active' ? 'Nothing active' : 'Nothing closed yet'} render={t => <TradeRow key={`${t.strategy_id}${t.id}`} t={t} showStrategy />} />}</div>
      </section>
    </>
  );
}
