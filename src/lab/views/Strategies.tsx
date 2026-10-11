import { Plus } from 'lucide-react';
import { api } from '../api';
import { signIn, useUser } from '../auth';
import { StrategyTile } from '../components';
import { Empty, ErrorBox, Skeleton, useAsync } from '../ui';

const Block = ({ title, scope, empty }: { title: string; scope: 'mine' | 'flagship' | 'people'; empty?: string }) => {
  const { user, ready } = useUser();
  const signedOut = scope === 'mine' && ready && !user;
  const r = useAsync(() => (scope === 'mine' && !ready ? new Promise<never>(() => {}) : signedOut ? Promise.resolve([]) : api.strategies(scope)), [scope, ready, user?.uid]);
  if (signedOut) return (
    <section className="sec"><div className="sec-h"><h2>{title}</h2></div>
      <div className="rows"><div className="empty"><b>Sign in to see your strategies</b><button className="btn sm" style={{ marginTop: 10 }} onClick={() => signIn()}>Sign in</button></div></div></section>);
  return (
    <section className="sec">
      <div className="sec-h"><h2>{title}</h2></div>
      {r.error ? <ErrorBox msg={r.error} retry={r.reload} /> : r.loading ? <Skeleton n={2} /> : r.data!.length === 0 ? <div className="rows"><Empty title={empty ?? 'Nothing here yet'} /></div>
        : <div className="grid two">{r.data!.map(s => <StrategyTile key={s.id} s={s} hero={scope === 'flagship'} />)}</div>}
    </section>
  );
};

export default function Strategies() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">Strategies</div><h1>Scans with a live track record</h1></div>
        <a className="btn gold" href="#scanner"><Plus /> New from a scan</a></div>
      <Block title="From QuantSync" scope="flagship" />
      <Block title="Yours" scope="mine" empty="Run a scan and save it as a strategy" />
      <Block title="People’s strategies" scope="people" />
    </>
  );
}
