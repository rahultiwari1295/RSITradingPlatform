import { api } from '../api';
import { StrategyTile, go } from '../components';
import { Empty, ErrorBox, Skeleton, shortDate, useAsync } from '../ui';

export default function Today() {
  const t = useAsync(() => api.today(), []);
  const p = useAsync(() => api.strategies('people'), []);
  const asOf = t.data?.data['1D']?.as_of;
  return (
    <>
      <div className="head"><div><div className="eyebrow">{asOf ? `Updated after close · ${shortDate(asOf)}` : 'Today'}</div><h1>What the market scanned today</h1>
        <p className="sub">Two QuantSync strategies, tracked live. Results only; every entry and exit is recorded as it happens.</p></div></div>
      {t.error ? <ErrorBox msg={t.error} retry={t.reload} /> : t.loading ? <Skeleton /> : (
        <>
          <div className="grid two">{t.data!.flagship.map(s => <StrategyTile key={s.id} s={s} hero />)}</div>
          <section className="sec">
            <div className="sec-h"><h2>Fresh results</h2><a href="#matches" className="sub" style={{ fontSize: 13 }}>All matches</a></div>
            {t.data!.fresh.length === 0 ? <div className="rows"><Empty title="Nothing new yet" body="New results appear after the daily update." /></div> : (
              <div className="rows">{t.data!.fresh.map(f => (
                <button key={f.sid + f.symbol} className="row" onClick={() => go(`s-${f.sid}`)}>
                  <div><div className="t">{f.symbol}</div><div className="s">{f.name} · {shortDate(f.signal_date)}</div></div><span className="mute">›</span>
                </button>))}</div>
            )}
          </section>
        </>
      )}
      <section className="sec">
        <div className="sec-h"><h2>People’s strategies</h2><a href="#strategies" className="sub" style={{ fontSize: 13 }}>See all</a></div>
        {p.loading ? <Skeleton n={2} /> : <div className="grid two">{(p.data ?? []).slice(0, 4).map(s => <StrategyTile key={s.id} s={s} />)}</div>}
      </section>
    </>
  );
}
