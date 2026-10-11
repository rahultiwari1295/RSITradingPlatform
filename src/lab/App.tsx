import { useEffect, useState } from 'react';
import { BarChart3, Compass, Home, Layers, Wallet } from 'lucide-react';
import { useUser } from './auth';
import Charts from './views/Charts';
import Portfolio from './views/Portfolio';
import Scanner from './views/Scanner';
import StrategyDetail from './views/StrategyDetail';
import Strategies from './views/Strategies';
import Today from './views/Today';
import { Toaster } from './ui';

const TABS = [
  { id: 'today', label: 'Today', Icon: Home }, { id: 'strategies', label: 'Strategies', Icon: Layers }, { id: 'scanner', label: 'Scanner', Icon: Compass },
  { id: 'charts', label: 'Charts', Icon: BarChart3 }, { id: 'portfolio', label: 'Portfolio', Icon: Wallet },
] as const;

const useHash = () => {
  const [h, set] = useState(() => location.hash.slice(1) || 'today');
  useEffect(() => { const f = () => { set(location.hash.slice(1) || 'today'); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};

const TITLES: Record<string, string> = { today: 'Today', strategies: 'Strategies', scanner: 'Scanner', charts: 'Charts', portfolio: 'Portfolio' };
const useScrolled = () => {
  const [on, set] = useState(false);
  useEffect(() => { const f = () => set(window.scrollY > 52); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  return on;
};

export default function App() {
  const h = useHash();
  const scrolled = useScrolled();
  const { user } = useUser();
  const uid = user?.uid ?? null;
  const tab = h.startsWith('s-') ? 'strategies' : h.startsWith('c-') ? 'charts' : h;
  const nav = TABS.map(({ id, label, Icon }) => (
    <a key={id} className="tab" href={`#${id}`} aria-current={tab === id ? 'page' : undefined}><Icon />{label}</a>
  ));
  let view;
  if (h.startsWith('s-')) view = <StrategyDetail key={h} id={h.slice(2)} uid={uid} />;
  else if (h.startsWith('c-')) view = <Charts symbol={h.slice(2)} />;
  else if (h === 'strategies') view = <Strategies />;
  else if (h === 'scanner') view = <Scanner />;
  else if (h === 'charts') view = <Charts symbol={null} />;
  else if (h === 'portfolio') view = <Portfolio />;
  else view = <Today />;
  return (
    <div className="shell">
      <nav className="rail" aria-label="Main"><div className="brand"><i />QuantSync Lab</div>{nav}</nav>
      <div className="navbar" data-on={scrolled} aria-hidden="true">{TITLES[h] ?? (h.startsWith('c-') ? h.slice(2) : 'Strategy')}</div>
      <main className="main top">
        {view}
        <footer className="foot">QuantSync Lab is a research and tracking tool. Scans and results are informational only and are not investment advice or a recommendation to buy or sell. QuantSync is not a SEBI-registered investment adviser. Past results, tested or live, do not predict future results.</footer>
      </main>
      <nav className="tabbar" aria-label="Main">{nav}</nav>
      <Toaster />
    </div>
  );
}
