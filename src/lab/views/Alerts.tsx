import { useState } from 'react';
import { api } from '../api';
import { signIn, useUser } from '../auth';
import { CAT_NAME, Avatar, HowTo } from '../kit';
import type { AlertItem, Cat } from '../types';
import { ErrorBox, Skeleton, toast, useAsync } from '../ui';

const GROUPS: { cat: Cat; why: string; empty: string }[] = [
  { cat: 'q', why: 'Our own strategies, enhanced by AI. They always stay on this list so you can switch them back on any time.', empty: '' },
  { cat: 'y', why: 'Strategies you made. Switch one off and it leaves this list.', empty: 'Save a scan as a strategy, then tap “Get alerts” on its page.' },
  { cat: 'f', why: 'Public strategies you chose to follow. Switch one off and it leaves this list.', empty: 'Open any public strategy and tap “Get alerts” to add it here.' },
];

export default function Alerts() {
  const { user, ready } = useUser();
  const a = useAsync(() => (ready ? api.alerts() : new Promise<never>(() => {})), [ready, user?.uid]);
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [removed, setRemoved] = useState<AlertItem | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const signedIn = !!a.data?.signed_in;

  const set = async (it: AlertItem, on: boolean) => {
    if (!signedIn) { await signIn(); return; }
    const prevLocal = local;
    setLocal({ ...local, [it.id]: on });
    if (it.cat !== 'q' && !on) { setGone(new Set(gone).add(it.id)); setRemoved(it); }
    try { await api.follow(it.id, it.cat === 'q' ? true : on, on); if (on) { setGone(g => { const n = new Set(g); n.delete(it.id); return n; }); setRemoved(null); } }
    catch (err) { setLocal(prevLocal); setGone(g => { const n = new Set(g); n.delete(it.id); return n; }); setRemoved(null); toast((err as Error).message); }
  };
  const items = (a.data?.items ?? []).filter(i => !gone.has(i.id));
  const isOn = (i: AlertItem) => local[i.id] ?? i.on;
  const nOn = items.filter(isOn).length;
  return (
    <>
      <div className="pagehead">
        <div className="eyebrow">Alerts</div>
        <h1>Your alerts</h1>
        <p className="lede">{a.data ? `${nOn} ${nOn === 1 ? 'strategy is' : 'strategies are'} switched on.` : 'Choose which strategies show up in Today’s matches.'} Matches from the ones switched on appear in <a href="#matches" style={{ color: 'var(--accent)' }}>Today’s matches</a>.</p>
      </div>
      <HowTo id="alerts" title="How to read this page">
        <p>Use the switches to choose what you see. Purple is QuantSync, blue is yours, orange is followed. Your own and followed strategies disappear when you switch them off; QuantSync ones stay so you can turn them back on.</p>
      </HowTo>
      {a.data && !signedIn && <div className="banner"><span>Sign in to save your choices and add your own strategies.</span><button className="btn gold sm" onClick={() => signIn()}>Sign in</button></div>}
      {removed && (
        <div className="undo" role="status"><span>Removed {removed.name}</span><button className="btn sm ghost" onClick={() => set(removed, true)}>Undo</button></div>
      )}
      {a.error ? <ErrorBox msg={a.error} retry={a.reload} /> : a.loading ? <Skeleton n={3} /> : GROUPS.map(g => {
        const list = items.filter(i => i.cat === g.cat);
        return (
          <section key={g.cat} className={`swgroup cat-${g.cat}`}>
            <header><span className="dot" /><h2>{CAT_NAME[g.cat]}</h2></header>
            <p className="why">{g.why}</p>
            <div className="rows">
              {list.length === 0 ? <div className="empty" style={{ padding: '22px 18px', fontSize: 14 }}>{g.empty}</div> : list.map(i => (
                <label key={i.id} className="swrow">
                  <Avatar symbol={i.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || '··'} cat={i.cat} />
                  <span style={{ minWidth: 0 }}><b>{i.name}</b><span className="s">{i.cat === 'f' && i.owner ? `by @${i.owner} · ` : ''}{i.tf === '1D' ? 'Daily' : 'Weekly'}{i.cat === 'q' ? ' · AI enhanced' : ''}</span></span>
                  <span className="sw"><input type="checkbox" role="switch" checked={isOn(i)} onChange={e => set(i, e.target.checked)} aria-label={`Alerts for ${i.name}`} /><i /></span>
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
