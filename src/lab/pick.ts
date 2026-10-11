// The AI chooses for the user: no scores are shown. We turn the gate table into at most two plain options.
import { count, plainPct, pct } from './fmt';
import type { Enhancement, YearStat } from './types';

export const MIN_RESULTS = 30; // an option needs at least this many past results to be offered

export interface Option { gate: number; kind: 'winner' | 'quality' | 'volume'; title: string; blurb: string }
export interface CompareRow { label: string; before: string; after: string; better: boolean | null }

const num = (v: number | null | undefined) => (v == null ? -Infinity : v);

/** Offer only options that beat the plain strategy with enough results behind them. */
export function pickOptions(r: Enhancement['result']): Option[] {
  if (!r || !r.edge_found || r.leak?.passed === false) return [];
  const plain = r.plain;
  const eligible = Object.entries(r.gates)
    .map(([g, x]) => ({ gate: Number(g), s: x.All as YearStat }))
    .filter(({ s }) => s && s.trades >= MIN_RESULTS && num(s.win_rate) >= num(plain.win_rate) + 1 && num(s.avg_ret) > num(plain.avg_ret));
  if (!eligible.length) return [];
  const quality = [...eligible].sort((a, b) => num(b.s.win_rate) - num(a.s.win_rate) || b.s.trades - a.s.trades)[0];
  const volume = [...eligible].filter(e => e.gate !== quality.gate && e.s.trades >= quality.s.trades * 1.5).sort((a, b) => b.s.trades - a.s.trades)[0];
  if (!volume) return [{ gate: quality.gate, kind: 'winner', title: 'Enhanced by AI', blurb: 'The AI kept the stronger matches and left out the weaker ones.' }];
  return [
    { gate: quality.gate, kind: 'quality', title: 'Fewer matches, higher win rate', blurb: 'The pickiest version. Fewer stocks match, and more of them worked out.' },
    { gate: volume.gate, kind: 'volume', title: 'More matches, still better', blurb: 'A relaxed version. More stocks match, and it still beats your original.' },
  ];
}

/** Stats of a gate for one year, falling back to all years. */
export function gateStat(r: NonNullable<Enhancement['result']>, gate: number, year: string): YearStat {
  const g = r.gates[String(gate)];
  const y = g?.[year] as YearStat | undefined;
  return (year === 'All' ? g?.All : y) ?? { trades: 0, wins: 0, losses: 0, win_rate: null, avg_ret: null };
}

export function plainStat(r: NonNullable<Enhancement['result']>, year: string): YearStat {
  // the plain (unfiltered) strategy by year is the 50-score table's parent; the server reports all years only,
  // so for a single year we show the unfiltered numbers that the page already has from the past test.
  return year === 'All' ? r.plain : (r.plain_by_year?.[year] as YearStat | undefined) ?? r.plain;
}

/** Old value → new value rows. `better` is null where neither direction is "good" (the number of results). */
export function compareRows(before: YearStat, after: YearStat): CompareRow[] {
  const up = (a: number | null, b: number | null) => (a == null || b == null ? null : b > a);
  return [
    { label: 'Win rate', before: plainPct(before.win_rate), after: plainPct(after.win_rate), better: up(before.win_rate, after.win_rate) },
    { label: 'Average per result', before: pct(before.avg_ret, 2), after: pct(after.avg_ret, 2), better: up(before.avg_ret, after.avg_ret) },
    { label: 'Total results', before: count(before.trades), after: count(after.trades), better: null },
  ];
}

/** The gate to test an exit with: the one in use, else the best entry option, else none. */
export function exitGate(inUse: number | null, options: Option[]): number | null {
  return inUse ?? options[0]?.gate ?? null;
}
