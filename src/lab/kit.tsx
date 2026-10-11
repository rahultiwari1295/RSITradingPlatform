// Building blocks for the v2 pages: year picker, how-to card, headline numbers, before/after table.
import { useState, type ReactNode } from 'react';
import { ChevronDown, Lightbulb, X } from 'lucide-react';
import { count, plainPct, pct, tone } from './fmt';
import type { Cat, YearStat } from './types';
import type { CompareRow } from './pick';

export const YEARS = ['2026', '2025', '2024'] as const;
export const DEFAULT_YEAR = '2026';
export const CAT_NAME: Record<Cat, string> = { q: 'QuantSync', y: 'Yours', f: 'Followed' };

export function YearSelect({ value, onChange }: { value: string; onChange: (y: string) => void }) {
  return (
    <label className="yearsel">
      <span className="sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Year</span>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label="Year">
        {[...YEARS].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <ChevronDown aria-hidden="true" />
    </label>
  );
}

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: card simply shows again */ } };

/** A short, dismissible "how to read this page" card. */
export function HowTo({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const key = `lab.howto.${id}`;
  const [open, setOpen] = useState(() => read(key) !== 'off');
  if (!open) return null;
  return (
    <aside className="howto" aria-label="How this page works">
      <span className="ic"><Lightbulb aria-hidden="true" /></span>
      <div><b>{title}</b>{children}</div>
      <button className="x" aria-label="Hide these tips" onClick={() => { write(key, 'off'); setOpen(false); }}><X size={16} /></button>
    </aside>
  );
}

export function SrcPill({ cat, children }: { cat: Cat; children?: ReactNode }) {
  return <span className={`srcpill cat-${cat}`}>{children ?? CAT_NAME[cat]}</span>;
}

export function Avatar({ symbol, cat }: { symbol: string; cat: Cat }) {
  return <span className={`av cat-${cat}`} aria-hidden="true">{symbol.slice(0, 2)}</span>;
}

/** Win rate · Average per result · Total results for one year. */
export function StatBoxes({ s, year, loading }: { s?: YearStat | null; year: string; loading?: boolean }) {
  const none = !s || s.trades === 0;
  const dash = loading ? '…' : '—';
  return (
    <>
      <div className="stats3 num">
        <div className="statbox" style={{ ['--k' as string]: 'var(--up)' }}><small>Win rate</small><b>{none ? dash : plainPct(s!.win_rate)}</b><em>{year}</em></div>
        <div className="statbox" style={{ ['--k' as string]: 'var(--accent)' }}><small>Average per result</small><b className={none ? '' : tone(s!.avg_ret)}>{none ? dash : pct(s!.avg_ret, 2)}</b><em>{year}</em></div>
        <div className="statbox" style={{ ['--k' as string]: 'var(--c-q)' }}><small>Total results</small><b>{none ? dash : count(s!.trades)}</b><em>{year}</em></div>
      </div>
      <p className="tally num">
        {loading ? 'Loading the numbers…' : none ? `No closed results in ${year} yet.` : <><span className="up">{count(s!.wins)} won</span> · <span className="down">{count(s!.losses)} lost</span> · each result is a stock this scan matched, followed until it closed.</>}
      </p>
    </>
  );
}

/** Old value struck through, new value in bold. */
export function CompareTable({ rows, beforeHead = 'Before', afterHead = 'With AI' }: { rows: CompareRow[]; beforeHead?: string; afterHead?: string }) {
  return (
    <table className="cmp">
      <thead><tr><th scope="col"><span className="sr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Measure</span></th><th scope="col">{beforeHead}</th><th scope="col">{afterHead}</th></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td className="was"><s aria-label={`was ${r.before}`}>{r.before}</s></td>
            <td className={`now ${r.better === true ? 'good' : r.better === false ? 'bad' : ''}`}>{r.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
