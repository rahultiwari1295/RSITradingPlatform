import { useMemo, useState } from 'react';
import { BellRing } from 'lucide-react';
import { api } from '../api';
import { signIn, useUser } from '../auth';
import { CAT_NAME, Avatar, HowTo, SrcPill } from '../kit';
import type { Cat, MatchRow } from '../types';
import { Empty, ErrorBox, Seg, Skeleton, inr, pct, shortDate, tone, useAsync } from '../ui';

const dayLabel = (d: string | null, age: number | null) => (d == null ? 'Earlier' : age === 0 ? 'Today' : age === 1 ? 'Yesterday' : shortDate(d) + ' ' + d.slice(0, 4));

function group(rows: MatchRow[]) {
  const out: { label: string; rows: MatchRow[] }[] = [];
  for (const r of rows) {
    const label = dayLabel(r.date, r.age_days);
    const last = out[out.length - 1];
    if (last?.label === label) last.rows.push(r); else out.push({ label, rows: [r] });
  }
  return out;
}

export default function Matches() {
  const { user, ready } = useUser();
  const m = useAsync(() => (ready ? api.matches() : new Promise<never>(() => {})), [ready, user?.uid]);
  const [tab, setTab] = useState<'latest' | 'older'>('latest');
  const rows = useMemo(() => (m.data?.rows ?? []).filter(r => (tab === 'latest') === r.latest), [m.data, tab]);
  const groups = useMemo(() => group(rows), [rows]);
  const days = m.data?.latest_days ?? 4;
  const cats = new Set((m.data?.rows ?? []).map(r => r.cat));
  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Your scan results</div>
        <h1>Today’s matches</h1>
        <p className="lede">Stocks that fit the strategies you have switched on. The colour tells you where each one came from.</p>
        <div className="actions"><a className="btn sm" href="#alerts"><BellRing /> Your alerts</a></div>
      </div>

      <HowTo id="matches" title="How to read this page">
        <ol>
          <li><b style={{ display: 'inline' }}>Latest</b> shows matches from the last {days} days. <b style={{ display: 'inline' }}>Older</b> shows ones that matched earlier and are still open.</li>
          <li>The stock is on top and the strategy that found it is underneath.</li>
          <li>Choose which strategies show up in <a href="#alerts" style={{ color: 'var(--accent)' }}>Your alerts</a>.</li>
        </ol>
      </HowTo>

      <div className="tabs2">
        <Seg label="When" value={tab} onChange={v => setTab(v as 'latest' | 'older')} options={[{ v: 'latest', label: `Latest${m.data ? ` · ${m.data.counts.latest}` : ''}` }, { v: 'older', label: `Older${m.data ? ` · ${m.data.counts.older}` : ''}` }]} />
        <div className="legend2" aria-label="Colour key">{(['q', 'y', 'f'] as Cat[]).map(c => <SrcPill key={c} cat={c}>{CAT_NAME[c]}</SrcPill>)}</div>
      </div>
      <p className="listnote">{tab === 'latest' ? `Matched in the last ${days} days, newest first.` : `Matched more than ${days} days ago and still open.`}</p>

      {m.data && !m.data.signed_in && (
        <div className="banner"><span>You are seeing QuantSync matches. Sign in to add your own and followed strategies.</span><button className="btn gold sm" onClick={() => signIn()}>Sign in</button></div>
      )}
      {m.error ? <ErrorBox msg={m.error} retry={m.reload} /> : m.loading ? <Skeleton n={4} /> : rows.length === 0 ? (
        <div className="rows"><Empty title={tab === 'latest' ? `Nothing new in the last ${days} days` : 'Nothing older is open'} body={tab === 'latest' ? 'New matches appear here after each market close. Check Older, or switch on more strategies in Your alerts.' : 'When a match stays open for more than a few days, it moves here.'} /></div>
      ) : groups.map(g => (
        <section key={g.label}>
          <div className="daygroup">{g.label}</div>
          <div className="rows">{g.rows.map(r => (
            <a key={`${r.sid}-${r.symbol}-${r.date}`} className={`mrow cat-${r.cat}`} href={`#c-${r.symbol}`} aria-label={`${r.symbol}, from ${r.strategy}, ${CAT_NAME[r.cat]} strategy`}>
              <Avatar symbol={r.symbol} cat={r.cat} />
              <div className="sub2"><div className="nm">{r.symbol}</div><div className="st">{r.strategy}</div><div className="dt num">Matched {shortDate(r.date)} · {inr(r.price)}</div></div>
              <div className={`ch num ${tone(r.chg)}`}>{pct(r.chg, 2)}<small>since match</small></div>
            </a>))}</div>
        </section>
      ))}
      {m.data && cats.size > 0 && <p className="mute" style={{ fontSize: 12, margin: '18px 4px 0', lineHeight: 1.5 }}>A match means a stock fit a scan’s rules. It is information only, not advice or a recommendation to buy or sell.</p>}
    </>
  );
}
