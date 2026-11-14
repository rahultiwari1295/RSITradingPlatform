/* What each holding means next to the AI calls. Shared by the portfolio list and the single-stock page.
   status  'exit'   the AI call on this stock was CLOSED in the last EXIT_DAYS days and you still hold it -> sell signal
           'stop'   open AI call, price is at or below its stop
           'target' open AI call, price is at or above its target
           'ai'     open AI call, in play
           'none'   no AI call on this stock */
import { ownerApi, loadTerminal, allSignals, toDate, n } from '../core.js';

export const EXIT_DAYS = 7;
const T = d => { const t = toDate(d); return t ? t.getTime() : 0; };

export function enrich(rows, term) {
  const open = term ? allSignals(term) : [], closed = term ? term.closed || [] : [];
  const cut = Date.now() - EXIT_DAYS * 864e5;
  return (rows || []).map(x => {
    const s = String(x.symbol).toUpperCase();
    const calls = open.filter(c => String(c.sym).toUpperCase() === s);
    const call = calls[0] || null;
    const exitCall = call ? null : closed.filter(c => String(c.sym).toUpperCase() === s && T(c.exitDate) >= cut).sort((a, b) => T(b.exitDate) - T(a.exitDate))[0] || null;
    const status = call ? (x.ltp > 0 && x.ltp <= call.stop ? 'stop' : x.ltp >= call.target ? 'target' : 'ai') : exitCall ? 'exit' : 'none';
    const vsCall = call && call.entry > 0 && x.avg > 0 ? (x.avg / call.entry - 1) * 100 : NaN;      // how much more / less you paid than the call
    return { ...x, call, calls, exitCall, status, vsCall };
  });
}

export async function loadBook(fresh = false) {
  const [pf, term] = await Promise.all([
    ownerApi('/owner/portfolio' + (fresh ? '?fresh=1' : '')).catch(e => ({ error: e.message, rows: [], by_source: {}, brokers: {} })),
    loadTerminal().catch(() => null),
  ]);
  return { pf, term, rows: enrich((pf.rows || []).filter(x => x.qty > 0), term) };
}

export const STATUS = {
  exit: { t: 'Exit call', cls: 'dn', rank: 0 }, stop: { t: 'At stop', cls: 'dn', rank: 1 }, target: { t: 'Target reached', cls: 'up', rank: 2 },
  ai: { t: 'AI call', cls: 'ai', rank: 3 }, none: { t: 'Not an AI call', cls: '', rank: 4 },
};

/* ---- plain technical read-out from daily candles [{t,o,h,l,c,v,e20,e50,e200}] ---- */
export function technicals(cs) {
  const L = cs.length, c = cs[L - 1];
  if (L < 30) return null;
  const close = cs.map(x => x.c);
  const ret = k => (L > k ? (c.c / close[L - 1 - k] - 1) * 100 : NaN);
  let up = 0, dn = 0;
  for (let i = L - 14; i < L; i++) { const d = close[i] - close[i - 1]; if (d > 0) up += d; else dn -= d; }
  const rsi = dn === 0 ? 100 : 100 - 100 / (1 + up / dn);
  const yr = cs.slice(-250), hi = Math.max(...yr.map(x => x.h)), lo = Math.min(...yr.map(x => x.l));
  const v20 = cs.slice(-21, -1).reduce((a, x) => a + (x.v || 0), 0) / 20;
  const atr = cs.slice(-14).reduce((a, x, i, A) => { const p = i ? A[i - 1].c : x.o; return a + Math.max(x.h - x.l, Math.abs(x.h - p), Math.abs(x.l - p)); }, 0) / 14;
  const above = k => (isFinite(c[k]) ? c.c > c[k] : null);
  const stack = isFinite(c.e20) && isFinite(c.e50) && isFinite(c.e200);
  const trend = stack && c.c > c.e20 && c.e20 > c.e50 && c.e50 > c.e200 ? 'up' : stack && c.c < c.e20 && c.e20 < c.e50 && c.e50 < c.e200 ? 'down'
    : above('e50') && above('e200') ? 'up-weak' : above('e50') === false && above('e200') === false ? 'down-weak' : 'side';
  const rising20 = L > 6 && isFinite(c.e20) && isFinite(cs[L - 6].e20) ? c.e20 > cs[L - 6].e20 : null;
  return { last: c, rsi, hi, lo, pos52: hi > lo ? (c.c - lo) / (hi - lo) * 100 : NaN, offHigh: (c.c / hi - 1) * 100, vol: v20 ? (c.v || 0) / v20 : NaN, atrPct: atr / c.c * 100,
    r5: ret(5), r21: ret(21), r63: ret(63), r250: ret(Math.min(250, L - 1)), trend, rising20,
    d20: isFinite(c.e20) ? (c.c / c.e20 - 1) * 100 : NaN, d50: isFinite(c.e50) ? (c.c / c.e50 - 1) * 100 : NaN, d200: isFinite(c.e200) ? (c.c / c.e200 - 1) * 100 : NaN };
}
export const TREND = { up: ['Strong uptrend', 'up', 'Price is above its 20, 50 and 200-day averages, and they are stacked in order.'],
  'up-weak': ['Uptrend', 'up', 'Price is above its 50 and 200-day averages.'], side: ['Sideways', '', 'Price is between its main averages. No clear direction.'],
  'down-weak': ['Downtrend', 'dn', 'Price is below its 50 and 200-day averages.'], down: ['Strong downtrend', 'dn', 'Price is below its 20, 50 and 200-day averages, and they are stacked downward.'] };
export { n };
