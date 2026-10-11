import type { Catalog, Condition, ExitJson, GroupJson, Operand, RuleJson, TF } from './types';

/* ---- editable tree (UI) <-> rule JSON (API) ------------------------------------------------ */
export type Mode = 'all' | 'any';
export interface Group { mode: Mode; items: Node[] }
export type Node = Condition | Group;
export const isGroup = (n: Node): n is Group => 'items' in n;

export const toJson = (g: Group): GroupJson => ({ [g.mode]: g.items.map(n => (isGroup(n) ? toJson(n) : n)) });
export const toRule = (g: Group): RuleJson => ({ v: 1, ...toJson(g) });
export function fromJson(j: GroupJson): Group {
  const mode: Mode = j.any ? 'any' : 'all';
  return { mode, items: (j[mode] ?? []).map(n => ('l' in n ? n : fromJson(n))) };
}
export const countConds = (g: Group): number => g.items.reduce((a, n) => a + (isGroup(n) ? countConds(n) : 1), 0);
export const newCond = (): Condition => ({ l: { f: 'rsi_14' }, op: '>', r: { c: 50 } });

export const validCond = (c: Condition) => !!c.l.f && (c.op === 'is_true' || (c.op === 'between'
  ? c.r?.list?.length === 2 && c.r.list.every(x => typeof x === 'number' && !Number.isNaN(x))
  : c.r?.f != null || (typeof c.r?.c === 'number' && !Number.isNaN(c.r.c))));
export const validGroup = (g: Group): boolean => g.items.length > 0 && g.items.every(n => (isGroup(n) ? validGroup(n) : validCond(n)));

/* ---- plain-English descriptions -------------------------------------------------------------- */
const label = (cat: Catalog, key?: string) => cat.features.find(f => f.key === key)?.label ?? key ?? '';
const operand = (cat: Catalog, o?: Operand) => (o == null ? '' : o.f ? label(cat, o.f) : o.list ? o.list.join(' and ') : String(o.c));
const opText = (cat: Catalog, op: string) => cat.operators.find(x => x.op === op)?.label ?? op;
export function describeCond(cat: Catalog, c: Condition) {
  return `${operand(cat, c.l)} ${opText(cat, c.op)} ${c.op === 'is_true' ? '' : operand(cat, c.r)}`.trim();
}
export function describeGroup(cat: Catalog, g: Group, top = true): string {
  const parts = g.items.map(n => (isGroup(n) ? describeGroup(cat, n, false) : describeCond(cat, n)));
  const s = parts.join(g.mode === 'all' ? ' AND ' : ' OR ');
  return top || parts.length < 2 ? s : `(${s})`;
}
export function describeRule(cat: Catalog, r: RuleJson): string[] {
  const g = fromJson(r);
  const lines = (x: Group, depth: number): string[] => x.items.flatMap(n => isGroup(n)
    ? [`${' '.repeat(depth * 2)}${n.mode === 'all' ? 'All of:' : 'Any of:'}`, ...lines(n, depth + 1)]
    : [`${' '.repeat(depth * 2)}${describeCond(cat, n)}`]);
  return [g.mode === 'all' ? 'All of these must be true:' : 'Any one of these is enough:', ...lines(g, 1)];
}
export function describeExit(e: ExitJson, cat: Catalog): string[] {
  if (!e.any.length) return ['Held until the safety time limit (60 daily or 26 weekly bars)'];
  return e.any.map(i => {
    const t = cat.exits.find(x => x.type === i.type);
    return i.type === 'rule' ? 'When the exit rule is true' : `${t?.label ?? i.type}: ${i.v}${t?.unit === '%' ? '%' : ' ' + (t?.unit ?? '')}`;
  });
}
export function buildExit(stop: string, target: string, time: string): ExitJson {
  const any = [];
  const n = (s: string) => (s.trim() === '' ? null : Number(s));
  if (n(stop)) any.push({ type: 'stop_pct', v: n(stop)! });
  if (n(target)) any.push({ type: 'target_pct', v: n(target)! });
  if (n(time)) any.push({ type: 'time', v: Math.round(n(time)!) });
  return { v: 1, any };
}

/* ---- ready-made scans -------------------------------------------------------------------------- */
const c = (l: string, op: string, r?: string | number | [number, number]): Condition => ({
  l: { f: l }, op, ...(r === undefined ? {} : { r: typeof r === 'string' ? { f: r } : Array.isArray(r) ? { list: r } : { c: r } }),
});
export interface PresetScan { id: string; name: string; blurb: string; tag: 'QuantSync' | 'Trend' | 'Momentum' | 'Breakout' | 'Volume' | 'Reversal'; tf: TF; tree: Group }
const all = (...items: Node[]): Group => ({ mode: 'all', items });
export const PRESET_SCANS: PresetScan[] = [
  { id: 'sig-alpha', name: 'AI Alpha signals', blurb: 'Any of our three momentum breakouts: RS leader, Stage-2 base breakout, or power gap.', tag: 'QuantSync', tf: '1D', tree: { mode: 'any', items: [c('sig_rs_leader', 'is_true'), c('sig_stage2_base', 'is_true'), c('sig_power_gap', 'is_true')] } },
  { id: 'sig-pattern', name: 'AI Pattern signals', blurb: 'An apex base breakout or a high tight flag, our two chart-structure setups.', tag: 'QuantSync', tf: '1D', tree: { mode: 'any', items: [c('sig_apex_base', 'is_true'), c('sig_high_tight_flag', 'is_true')] } },
  { id: 'sig-rs', name: 'RS leader breakout', blurb: 'A strong stock breaks its 20-bar high on 2× volume with a firm close.', tag: 'QuantSync', tf: '1D', tree: all(c('sig_rs_leader', 'is_true')) },
  { id: 'sig-s2', name: 'Stage-2 base breakout', blurb: 'A 3-month base breaks out while the 30-week average turns up.', tag: 'QuantSync', tf: '1D', tree: all(c('sig_stage2_base', 'is_true')) },
  { id: 'ema-cross', name: 'EMA crossover', blurb: 'The fast average (EMA 9) moves above the slower one (EMA 21) today.', tag: 'Trend', tf: '1D', tree: all(c('ema_9', 'crosses_above', 'ema_21')) },
  { id: 'macd-cross', name: 'MACD crossover', blurb: 'The MACD line crosses above its signal line today.', tag: 'Momentum', tf: '1D', tree: all(c('macd', 'crosses_above', 'macd_signal')) },
  { id: 'rsi-turn', name: 'RSI turning up', blurb: 'RSI (14) crosses above its own 10-bar EMA while still below 60.', tag: 'Momentum', tf: '1D', tree: all(c('rsi_14', 'crosses_above', 'rsi_ema_10'), c('rsi_14', '<', 60)) },
  { id: 'golden', name: 'Golden cross', blurb: 'The 50-day average crosses above the 200-day average.', tag: 'Trend', tf: '1D', tree: all(c('sma_50', 'crosses_above', 'sma_200')) },
  { id: 'hh52', name: '52-week high breakout', blurb: 'Closes above the prior 52-week high on strong volume.', tag: 'Breakout', tf: '1D', tree: all(c('close', '>', 'hh_52'), c('vol_ratio', '>', 1.5)) },
  { id: 'vol-surge', name: 'Volume surge', blurb: 'Traded at least 2× its 20-day average volume and closed up 2% or more.', tag: 'Volume', tf: '1D', tree: all(c('vol_ratio', '>', 2), c('ret_1', '>', 2)) },
  { id: 'strong-trend', name: 'Strong uptrend', blurb: 'ADX above 25, with price above both its 50 and 200-day averages.', tag: 'Trend', tf: '1D', tree: all(c('adx_14', '>', 25), c('close', '>', 'sma_50'), c('close', '>', 'sma_200')) },
  { id: 'oversold', name: 'Oversold bounce', blurb: 'RSI below 35 and today finished as a green candle.', tag: 'Reversal', tf: '1D', tree: all(c('rsi_14', '<', 35), c('is_green', 'is_true')) },
  { id: 'bb-break', name: 'Bollinger breakout', blurb: 'Price closes above the upper Bollinger band.', tag: 'Breakout', tf: '1D', tree: all(c('close', 'crosses_above', 'bb_upper')) },
  { id: 'pullback', name: 'Pullback in uptrend', blurb: 'Above the 200-day average, RSI cooled to 35–45.', tag: 'Reversal', tf: '1D', tree: all(c('close', '>', 'sma_200'), c('rsi_14', 'between', [35, 45])) },
  { id: 'either', name: 'EMA or MACD crossover', blurb: 'Either signal fires: the EMA 9/21 crossover or the MACD crossover.', tag: 'Momentum', tf: '1D', tree: { mode: 'any', items: [c('ema_9', 'crosses_above', 'ema_21'), c('macd', 'crosses_above', 'macd_signal')] } },
  { id: 'weekly-trend', name: 'Weekly trend start', blurb: 'On the weekly chart, EMA 10 moves above EMA 20.', tag: 'Trend', tf: '1W', tree: all(c('ema_10', 'crosses_above', 'ema_20')) },
];
