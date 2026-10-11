import { Sparkles, Users } from 'lucide-react';
import type { StrategyCard, Trade } from './types';
import { freshness, inr, pct, plainPct, shortDate, tone } from './ui';

export const go = (h: string) => { location.hash = h; };

export function StrategyTile({ s, hero }: { s: StrategyCard; hero?: boolean }) {
  const st = s.stats;
  return (
    <a className={`tile ${s.enhanced ? 'enh' : ''} ${hero ? 'hero' : ''}`} href={`#s-${s.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">{s.kind === 'flagship' ? 'QuantSync' : s.mine ? 'Yours' : s.owner ? `@${s.owner}` : 'Member'}</div>
          <h2 style={{ fontSize: hero ? 22 : 17, marginTop: 4 }}>{s.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {st.open > 0 && <span className="pill up">{st.open} active</span>}
          {s.enhanced && <span className="pill gold"><Sparkles /> AI ≥ {s.ai_gate}</span>}
          <span className="pill">{s.tf === '1D' ? 'Daily' : 'Weekly'}</span>
        </div>
      </div>
      <div className="kv num" style={{ marginTop: 16 }}>
        <div><span className="mute" style={{ fontSize: 11 }}>Win rate</span><b>{st.shown ? plainPct(st.win_rate, 0) : '—'}</b></div>
        <div><span className="mute" style={{ fontSize: 11 }}>Active</span><b className={st.open > 0 ? 'up' : ''}>{st.open}</b></div>
        <div><span className="mute" style={{ fontSize: 11 }}>Closed (W/L)</span><b><span className="up">{st.wins}</span> / <span className="down">{st.losses}</span></b></div>
        {s.kind === 'user' && <div><span className="mute" style={{ fontSize: 11 }}>Followers</span><b><Users size={13} style={{ verticalAlign: -1 }} /> {s.followers}</b></div>}
      </div>
      {!st.shown && <p className="mute" style={{ fontSize: 12, marginTop: 12 }}>Win rate shows after 30 closed results.</p>}
    </a>
  );
}

export function TradeRow({ t, showStrategy }: { t: Trade; showStrategy?: boolean }) {
  const f = t.is_open ? freshness(t.age_days) : null;
  const old = !!f && f.cls === 'old';
  return (
    <a className={`row ${old ? 'old' : ''}`} href={`#c-${t.symbol}`}>
      <div style={{ minWidth: 0 }}>
        <div className="t">{t.symbol}{f && <span className={`pill ${f.cls}`}>{f.label}</span>}{!t.is_open && t.origin && <span className={`pill ${t.origin === 'live' ? 'up' : ''}`}>{t.origin === 'live' ? 'Live' : 'Tested'}</span>}{t.group && <span className="pill">{t.group}</span>}{showStrategy && t.enhanced ? <span className="pill gold">AI</span> : null}</div>
        <div className="s num">
          {t.is_open ? `Entered ${shortDate(t.entry_date)} · ${inr(t.entry_price)}` : `${shortDate(t.entry_date)} → ${shortDate(t.exit_date)} · ${inr(t.entry_price)}`}
          {showStrategy && t.strategy_name ? <span> · {t.strategy_name}</span> : null}
        </div>
      </div>
      <div className={`num ${tone(t.ret_pct)}`} style={{ fontWeight: 700, fontSize: 16 }} aria-label={t.is_open ? 'Current change' : 'Result'}>{pct(t.ret_pct, 2)}</div>
    </a>
  );
}
