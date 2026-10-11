import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';
import { Chart } from '../Chart';
import { go } from '../components';
import { Empty, ErrorBox, Seg, Skeleton, inr, pct, tone, useAsync } from '../ui';
import type { TF } from '../types';

export default function Charts({ symbol }: { symbol: string | null }) {
  const [tf, setTf] = useState<TF>('1D');
  const [q, setQ] = useState('');
  const pat = useAsync(() => api.patterns(tf), [tf]);
  const ch = useAsync(() => (symbol ? api.chart(symbol, tf) : Promise.resolve(null)), [symbol, tf]);
  const last = ch.data?.bars.at(-1), prev = ch.data?.bars.at(-2);
  const chg = last && prev ? (last.close / prev.close - 1) * 100 : null;
  return (
    <>
      <div className="head"><div><div className="eyebrow">Charts</div><h1>{symbol ? symbol : 'Patterns and price charts'}</h1></div>
        <Seg label="Timeframe" value={tf} onChange={v => setTf(v)} options={[{ v: '1D', label: 'Daily' }, { v: '1W', label: 'Weekly' }]} /></div>
      <form onSubmit={e => { e.preventDefault(); if (q.trim()) go(`c-${q.trim().toUpperCase()}`); }} style={{ position: 'relative', marginBottom: 18 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--ink3)' }} />
        <input className="inp" style={{ paddingLeft: 40 }} placeholder="Open a chart, e.g. RELIANCE" aria-label="Symbol" value={q} onChange={e => setQ(e.target.value)} />
      </form>
      {symbol ? (
        ch.error ? <ErrorBox msg={ch.error} retry={ch.reload} /> : ch.loading || !ch.data ? <Skeleton n={2} /> : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }} className="num"><span style={{ fontSize: 28, fontWeight: 800 }}>{inr(last?.close)}</span><span className={tone(chg)} style={{ fontWeight: 700 }}>{pct(chg, 2)}</span></div>
            <Chart bars={ch.data.bars} />
            <p className="mute" style={{ fontSize: 12, marginTop: 10 }}><span style={{ color: 'var(--accent)' }}>━</span> SMA 50 &nbsp; <span>━</span> SMA 200</p>
          </>)
      ) : (
        <section>
          <div className="sec-h"><h2>Chart-pattern scan</h2></div>
          {pat.loading ? <Skeleton n={2} /> : !pat.data?.configured ? <div className="rows"><Empty title="Pattern scans switch on soon" body="They appear here once the pattern feed is connected. You can already open any chart above." /></div>
            : <div className="rows">{pat.data.rows.map((r, i) => <a key={i} className="row" href={`#c-${r.symbol}`}><div><div className="t">{String(r.symbol)}</div><div className="s">{String(r.pattern ?? '')}</div></div></a>)}</div>}
        </section>
      )}
    </>
  );
}
