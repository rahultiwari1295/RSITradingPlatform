import { useState } from 'react';
import { Bell, BellRing, Copy, Info } from 'lucide-react';
import { api } from '../api';
import { signIn } from '../auth';
import { TradeRow, go } from '../components';
import { HowTo, SrcPill, StatBoxes, YearSelect, DEFAULT_YEAR } from '../kit';
import { describeExit, describeRule } from '../rules';
import type { Cat } from '../types';
import { EmptyOrRows } from './shared';
import { AiEnhance } from './AiEnhance';
import { BacktestState, ClosedList, useBacktest, yearStat } from './Backtest';
import { Seg, Sheet, Skeleton, ErrorBox, shortDate, toast, useAsync } from '../ui';

export default function StrategyDetail({ id, uid }: { id: string; uid: string | null }) {
  const s = useAsync(() => api.strategy(id), [id]);
  const cat = useAsync(() => api.catalog(), []);
  const al = useAsync(() => (uid ? api.alerts() : Promise.resolve({ signed_in: false, items: [] })), [uid, id]);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [tab, setTab] = useState<'open' | 'closed'>('closed');
  const [info, setInfo] = useState(false);
  const bt = useBacktest(id, s.reload);
  const open = useAsync(() => api.trades(id, 'active'), [id, s.data?.version]);
  if (s.error) return <ErrorBox msg={s.error} retry={s.reload} />;
  if (s.loading || !s.data || !cat.data) return <Skeleton />;
  const d = s.data;
  const source: Cat = d.kind === 'flagship' ? 'q' : d.mine ? 'y' : 'f';
  const alertsOn = !!al.data?.items.find(i => i.id === id && i.on);
  const needAuth = async (fn: () => Promise<void>) => { if (!uid) { await signIn(); return; } await fn(); };
  const toggleAlert = () => needAuth(async () => {
    const next = !alertsOn;
    await api.follow(id, d.kind === 'flagship' ? true : next, next);
    toast(next ? 'Alerts on. Matches show in Today’s matches.' : 'Alerts off.');
    al.reload();
  });
  const stat = yearStat(bt.result, year);
  const nOpen = open.data?.length ?? d.stats.open;
  return (
    <>
      <div className="pagehead">
        <a href="#strategies" className="crumb">‹ Strategies</a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <SrcPill cat={source}>{source === 'q' ? 'QuantSync' : source === 'y' ? 'Yours' : d.owner ? `@${d.owner}` : 'Followed'}</SrcPill>
          <span className="pill">{d.tf === '1D' ? 'Daily' : 'Weekly'}</span>
          {(d.kind === 'flagship' || d.enhanced || d.exit_choice === 'ai') && <span className="pill gold">AI enhanced</span>}
        </div>
        <h1>{d.name}</h1>
        <p className="lede">{d.kind === 'flagship'
          ? 'A QuantSync scan. It looks at every NSE stock after each market close and lists the ones that fit its rules.'
          : 'A scan that looks at every NSE stock after each market close and lists the ones that fit its rules.'}</p>
        <div className="actions">
          <button className="btn sm" onClick={toggleAlert}>{alertsOn ? <BellRing /> : <Bell />} {alertsOn ? 'Alerts on' : 'Get alerts'}</button>
          <button className="btn sm" onClick={() => needAuth(async () => { const r = await api.copyStrategy(id); toast('Copied to your strategies'); go(`s-${r.id}`); })}><Copy /> Copy &amp; edit</button>
          <button className="btn sm" onClick={() => setInfo(true)}><Info /> Show rules</button>
        </div>
      </div>

      <HowTo id="strategy" title="How to read this page">
        <ol>
          <li>The three numbers show how this scan did in the year you pick.</li>
          <li>Tap an AI button to see if we can make it better. You choose whether to use it.</li>
          <li>Below, see what is open now and what has already closed.</li>
        </ol>
      </HowTo>

      <section>
        <div className="sech"><h2>How it did</h2><YearSelect value={year} onChange={setYear} /></div>
        <p className="secnote">Every time this scan matched a stock in {year}, we followed it until it closed. Here is how those ended. Past results do not predict future results.</p>
        <BacktestState bt={bt} />
        {bt.status !== 'running' && !bt.error && <StatBoxes s={stat} year={year} loading={bt.loading} />}
        <p className="tally">{d.source === 'engine'
          ? <>Recorded by the QuantSync engine; results since {shortDate(d.live_from)} are live, earlier ones were tested on past data.</>
          : <>Tested on past data with costs of 0.10% per side. Live tracking started {shortDate(d.live_from)}.</>}</p>
      </section>

      {d.source !== 'engine' && (d.mine || d.enhanced || d.exit_choice === 'ai') && (
        <section className="sec">
          <AiEnhance s={d} year={year} uid={uid} onChanged={() => { s.reload(); open.reload(); bt.reload(); }} />
        </section>
      )}
      {d.source === 'engine' && (
        <section className="sec">
          <div className="opt" style={{ marginTop: 0 }}><h3><span className="pill gold">AI enhanced</span> Already enhanced by QuantSync</h3>
            <p className="why" style={{ marginBottom: 0 }}>Every match from this strategy is already filtered by our AI. Copy it to make your own version.</p></div>
        </section>
      )}

      <section className="sec">
        <div className="tabs2">
          <Seg label="Results" value={tab} onChange={v => setTab(v as 'open' | 'closed')} options={[{ v: 'closed', label: 'Closed' }, { v: 'open', label: `Open${nOpen ? ` · ${nOpen}` : ''}` }]} />
        </div>
        {tab === 'open' ? (
          <>
            <p className="listnote">Matched recently and still open. Shown for every year.</p>
            {open.loading ? <Skeleton n={3} /> : <EmptyOrRows items={open.data ?? []} empty="Nothing open right now. New matches appear after the next market close." render={t => <TradeRow key={t.id} t={t} />} />}
          </>
        ) : bt.result ? <ClosedList r={bt.result} year={year} /> : bt.status === 'running' || bt.loading ? <Skeleton n={3} /> : null}
      </section>

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
