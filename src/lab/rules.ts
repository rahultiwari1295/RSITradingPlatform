import type { Catalog, Condition, ExitJson, Operand, RuleJson } from './types';

export const PRESETS: { label: string; cond: Condition }[] = [
  { label: 'RSI above 50', cond: { l: { f: 'rsi_14' }, op: '>', r: { c: 50 } } },
  { label: 'Close above SMA 50', cond: { l: { f: 'close' }, op: '>', r: { f: 'sma_50' } } },
  { label: 'MACD crosses signal', cond: { l: { f: 'macd' }, op: 'crosses_above', r: { f: 'macd_signal' } } },
  { label: 'Volume 2× average', cond: { l: { f: 'vol_ratio' }, op: '>', r: { c: 2 } } },
  { label: 'Near 52-week high', cond: { l: { f: 'dist_hh52_pct' }, op: '>', r: { c: -3 } } },
];

const label = (cat: Catalog, key?: string) => cat.features.find(f => f.key === key)?.label ?? key ?? '';
const operand = (cat: Catalog, o?: Operand) => (o == null ? '' : o.f ? label(cat, o.f) : o.list ? o.list.join(' and ') : String(o.c));
const opText = (cat: Catalog, op: string) => cat.operators.find(x => x.op === op)?.label ?? op;

export function describeCond(cat: Catalog, c: Condition) {
  return `${operand(cat, c.l)} ${opText(cat, c.op)} ${operand(cat, c.r)}`.trim();
}
export function describeRule(cat: Catalog, r: RuleJson): string[] {
  return (r.all ?? r.any ?? []).map(c => (('all' in c || 'any' in c) ? 'Group of conditions' : describeCond(cat, c)));
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

export const validCond = (c: Condition) => !!c.l.f && (c.op === 'between' ? c.r?.list?.length === 2 && c.r.list.every(x => typeof x === 'number' && !Number.isNaN(x)) : c.r?.f != null || (typeof c.r?.c === 'number' && !Number.isNaN(c.r.c)));
