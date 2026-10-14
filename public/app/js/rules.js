/* Rules: plain words in, rules out, and rules back into plain words.
   Everything here is transparent: the person always sees exactly which conditions they are running. */
import { lab, esc } from './app.js';

let CAT = null;
export const catalog = async () => (CAT ||= await lab.catalog());
const c = (l, op, r) => ({ l: { f: l }, op, ...(r === undefined ? {} : { r: typeof r === 'string' ? { f: r } : Array.isArray(r) ? { list: r } : { c: r } }) });
export const toRule = (mode, conds) => ({ v: 1, [mode]: conds });

/* ---------------------------------------------------------------- plain-English descriptions */
const PCT = new Set(['ret_1', 'ret_5', 'ret_20', 'dist_sma_50_pct', 'dist_sma_200_pct', 'atr_pct', 'bb_width_pct', 'range_pct', 'dist_hh52_pct', 'dist_hh20_pct', 'gap_pct', 'body_pct', 'upper_wick_pct']);
const X = new Set(['vol_ratio', 'vol_surge']);
const NAME = { close: 'Price', vol_ratio: 'Volume vs its 20-day average', vol_surge: 'Volume vs the prior 20 days', ret_1: 'Change today', ret_5: 'Change over 5 days', ret_20: 'Change over 20 days',
  hh_52: 'the 52-week high', hh_20: 'the 20-day high', ll_20: 'the 20-day low', ll_52: 'the 52-week low', dist_hh52_pct: 'Distance from the 52-week high', is_green: 'Closes higher than it opened', is_inside_bar: 'Inside bar (range inside the day before)',
  sig_rs_leader: 'Relative-strength leader breakout', sig_stage2_base: 'Stage-2 base breakout', sig_power_gap: 'Power gap on heavy volume', sig_apex_base: 'Apex (tightening) base breakout', sig_high_tight_flag: 'High tight flag breakout' };
const OP = { '>': 'is above', '>=': 'is at least', '<': 'is below', '<=': 'is at most', '==': 'equals', '!=': 'is not', crosses_above: 'crosses above', crosses_below: 'crosses below', between: 'is between' };
const label = (cat, k) => NAME[k] || (cat && (cat.features.find(f => f.key === k) || {}).label) || k;
const val = (k, v) => (PCT.has(k) ? `${v}%` : X.has(k) ? `${v}×` : String(v));
/** One condition as a short sentence, with the key parts in bold. */
export function say(cat, x) {
  const L = label(cat, x.l.f);
  if (x.op === 'is_true') return `<b>${esc(L)}</b>`;
  let R = '';
  if (x.r) R = x.r.f ? `<b>${esc(label(cat, x.r.f))}</b>` : x.r.list ? `<b>${val(x.l.f, x.r.list[0])}</b> and <b>${val(x.l.f, x.r.list[1])}</b>` : `<b>${esc(val(x.l.f, x.r.c))}</b>`;
  return `<b>${esc(L)}</b> ${OP[x.op] || x.op} ${R}`;
}
export const sayAll = (cat, conds) => conds.map(x => say(cat, x));
export const exitSay = e => [e.stop ? `falls ${e.stop}% from where it matched` : '', e.target ? `rises ${e.target}%` : '', e.time ? `${e.time} days have passed` : ''].filter(Boolean);

/* ---------------------------------------------------------------- plain words -> rules
   A small, transparent phrase reader. It shows what it understood and what it skipped, and the person can edit everything. */
const num = s => parseFloat(String(s).replace(/,/g, ''));
const MA = (kind, p) => `${/ema|exponential/i.test(kind) ? 'ema' : 'sma'}_${p}`;
const OK_MA = new Set(['sma_10', 'sma_20', 'sma_50', 'sma_100', 'sma_150', 'sma_200', 'ema_9', 'ema_10', 'ema_20', 'ema_21', 'ema_50', 'ema_100', 'ema_200']);
const PATTERNS = [
  [/(?:new\s+)?52[\s-]*(?:week|wk)s?\s+high|all[\s-]*time\s+high|yearly high/i, () => c('close', '>', 'hh_52'), '52-week high'],
  [/near (?:the |its )?52[\s-]*(?:week|wk)s?\s+high|close to (?:the |its )?52[\s-]*(?:week|wk) high/i, () => c('dist_hh52_pct', '>', -5), 'near 52-week high'],
  [/(?:20|twenty)[\s-]*(?:day|bar) high|1[\s-]*month high|breaks? out|breakout(?! of)/i, () => c('close', '>', 'hh_20'), 'breaks its 20-day high'],
  [/(\d+(?:\.\d+)?)\s*(?:x|times)\s*(?:the\s+)?(?:avg|average|normal)?\s*volume/i, m => c('vol_ratio', '>', num(m[1])), 'volume multiple'],
  [/heavy volume|high volume|volume (?:spike|surge|jump)|big volume|strong volume/i, () => c('vol_ratio', '>', 2), 'heavy volume (2×)'],
  [/rsi\s*(?:\(14\)\s*)?(?:is\s+)?(?:below|under|less than|<)\s*(\d+)/i, m => c('rsi_14', '<', num(m[1])), 'RSI below'],
  [/rsi\s*(?:\(14\)\s*)?(?:is\s+)?(?:above|over|more than|greater than|>)\s*(\d+)/i, m => c('rsi_14', '>', num(m[1])), 'RSI above'],
  [/rsi\s*(?:\(14\)\s*)?(?:is\s+)?between\s*(\d+)\s*(?:and|-|to)\s*(\d+)/i, m => c('rsi_14', 'between', [num(m[1]), num(m[2])]), 'RSI between'],
  [/rsi\s+crosses?\s+(?:above\s+)?(\d+)/i, m => c('rsi_14', 'crosses_above', num(m[1])), 'RSI crosses above'],
  [/oversold/i, () => c('rsi_14', '<', 35), 'oversold (RSI below 35)'],
  [/overbought/i, () => c('rsi_14', '>', 70), 'overbought (RSI above 70)'],
  [/golden cross/i, () => c('sma_50', 'crosses_above', 'sma_200'), 'golden cross'],
  [/death cross/i, () => c('sma_50', 'crosses_below', 'sma_200'), 'death cross'],
  [/macd\s+(?:bullish\s+)?cross(?:es|over)?(?:\s+above)?(?:\s+(?:the\s+)?signal)?/i, () => c('macd', 'crosses_above', 'macd_signal'), 'MACD crosses its signal line'],
  [/(ema|sma|dma|moving average|ma)\s*(\d+)\s+cross(?:es)?\s+(?:above\s+)?(?:the\s+)?(ema|sma|dma|ma)?\s*(\d+)/i, m => { const a = MA(m[1], m[2]), b = MA(m[3] || m[1], m[4]); return OK_MA.has(a) && OK_MA.has(b) ? c(a, 'crosses_above', b) : null; }, 'average crossover'],
  [/(?:price\s+)?(?:above|over)\s+(?:the\s+)?(\d+)[\s-]*(?:day\s+)?(ema|sma|dma|moving average|ma|day average|day avg)/i, m => { const k = MA(m[2], m[1]); return OK_MA.has(k) ? c('close', '>', k) : null; }, 'price above average'],
  [/(?:price\s+)?(?:below|under)\s+(?:the\s+)?(\d+)[\s-]*(?:day\s+)?(ema|sma|dma|moving average|ma|day average|day avg)/i, m => { const k = MA(m[2], m[1]); return OK_MA.has(k) ? c('close', '<', k) : null; }, 'price below average'],
  [/uptrend|up[\s-]?trend|trending up/i, () => c('close', '>', 'sma_200'), 'uptrend (above 200-day average)'],
  [/strong trend|adx/i, () => c('adx_14', '>', 25), 'strong trend (ADX above 25)'],
  [/gap(?:s|ped)?\s+up(?:\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%)?/i, m => c('gap_pct', '>', m[1] ? num(m[1]) : 2), 'gap up'],
  [/up\s+(\d+(?:\.\d+)?)\s*%\s+(?:today|in a day)/i, m => c('ret_1', '>', num(m[1])), 'up today'],
  [/up\s+(\d+(?:\.\d+)?)\s*%\s+(?:this|in a|over a|in 1)?\s*week/i, m => c('ret_5', '>', num(m[1])), 'up over a week'],
  [/up\s+(\d+(?:\.\d+)?)\s*%\s+(?:this|in a|over a|in 1)?\s*month/i, m => c('ret_20', '>', num(m[1])), 'up over a month'],
  [/green candle|closes? (?:green|strong)|bullish candle/i, () => c('is_green', 'is_true'), 'green candle'],
  [/inside bar|inside day/i, () => c('is_inside_bar', 'is_true'), 'inside bar'],
  [/bollinger|upper band/i, () => c('close', 'crosses_above', 'bb_upper'), 'Bollinger breakout'],
  [/pull ?back|dip/i, () => c('rsi_14', 'between', [35, 45]), 'pullback (RSI 35 to 45)'],
  [/rs leader|relative strength leader|relative strength/i, () => c('sig_rs_leader', 'is_true'), 'RS leader breakout'],
  [/stage[\s-]?2|base breakout/i, () => c('sig_stage2_base', 'is_true'), 'Stage-2 base breakout'],
  [/high tight flag|htf|bull flag|tight flag/i, () => c('sig_high_tight_flag', 'is_true'), 'high tight flag'],
  [/power gap|earnings gap/i, () => c('sig_power_gap', 'is_true'), 'power gap'],
  [/apex|triangle|tightening base|vcp/i, () => c('sig_apex_base', 'is_true'), 'apex base'],
];
/** Returns { tf, mode, conds, understood: [labels], leftover: text it could not use }. */
export function readIdea(text) {
  let t = ' ' + String(text || '').replace(/\s+/g, ' ') + ' ';
  const conds = [], understood = [];
  const tf = /\bweekly\b|weekly chart|\bweek(?:ly)? candles?/i.test(t) ? '1W' : '1D';
  const mode = /\b(any|either)\b|\bor\b/i.test(t) && !/\band\b/i.test(t) ? 'any' : 'all';
  for (const [re, make, lab] of PATTERNS) {
    const m = t.match(re); if (!m) continue;
    const x = make(m); if (!x) continue;
    const key = JSON.stringify(x);
    if (!conds.some(y => JSON.stringify(y) === key)) { conds.push(x); understood.push(lab); }
    t = t.replace(m[0], ' ');
  }
  const leftover = t.replace(/\b(stocks?|shares?|that|which|are|is|the|a|an|with|and|or|on|in|of|to|find|show|me|when|where|its|it|their|daily|weekly|chart|price|any|either|all|today|nse)\b/gi, ' ').replace(/[^\w%.-]+/g, ' ').trim();
  return { tf, mode, conds, understood, leftover };
}

/* ---------------------------------------------------------------- ideas: open rulebooks people can test themselves */
export const EXIT = { stop: 6, target: 12, time: 20 };
export const IDEAS = [
  { id: 'momentum-breakouts', name: 'Momentum breakouts', by: 'QuantSync rulebook', icon: 'bolt', color: '#5B6CFF', tf: '1D', mode: 'any', art: 'break',
    conds: [c('sig_rs_leader', 'is_true'), c('sig_stage2_base', 'is_true'), c('sig_power_gap', 'is_true')],
    tagline: 'Strong stocks breaking out of a quiet period.',
    what: ['A relative-strength leader closes above its 20-day high on about twice its usual volume, with a firm close near the day’s top.', 'Or a stock leaves a 3-month base while its 30-week average starts turning up (a “stage 2” move).', 'Or a stock gaps up sharply on very heavy volume and holds most of the gap.'],
    why: 'Breakouts on heavy volume show demand meeting a price level that held before. Many momentum traders study these moments.',
    watch: 'Breakouts often fail and fall back. In a weak market most of them do. Test it with a loss limit and see how often that happened in the past.' },
  { id: 'chart-structure', name: 'Chart-structure breakouts', by: 'QuantSync rulebook', icon: 'candle', color: '#7B55F0', tf: '1D', mode: 'any', art: 'flag',
    conds: [c('sig_apex_base', 'is_true'), c('sig_high_tight_flag', 'is_true')],
    tagline: 'Tight bases and flags that resolve upward.',
    what: ['An apex base: the price swings get smaller and smaller, then the stock closes above the top of the range.', 'Or a high tight flag: a very sharp rise, then a short, tight pause of a few weeks, then a close above the pause.'],
    why: 'Shrinking ranges mean sellers are drying up. When the range breaks, moves can be fast.',
    watch: 'Rare setups mean few past examples, so test results swing a lot. Look at the number of trades before trusting any percentage.' },
  { id: '52w-high', name: '52-week high on volume', by: 'Classic idea', icon: 'trend', color: '#0E9F8A', tf: '1D', mode: 'all', art: 'high',
    conds: [c('close', '>', 'hh_52'), c('vol_ratio', '>', 1.5)],
    tagline: 'New one-year highs with real buying behind them.', what: ['The close is above the highest price of the past 52 weeks.', 'Volume is at least 1.5× its 20-day average.'],
    why: 'A new high means everyone who bought in the past year is in profit, so there is little selling from people waiting to get out.', watch: 'New highs can be the end of a run, not the start. Try adding an RSI ceiling and compare.' },
  { id: 'golden-cross', name: 'Golden cross', by: 'Classic idea', icon: 'wave', color: '#E0A030', tf: '1D', mode: 'all', art: 'cross',
    conds: [c('sma_50', 'crosses_above', 'sma_200')], tagline: 'The 50-day average crosses above the 200-day.',
    what: ['The 50-day simple average moves from below to above the 200-day simple average today.'], why: 'One of the oldest trend signals: the recent average price overtakes the long-run one.',
    watch: 'It reacts late, often after much of the move. Compare it with a faster crossover like EMA 9 and 21.' },
  { id: 'pullback', name: 'Pullback in an uptrend', by: 'Classic idea', icon: 'target', color: '#0A8AC8', tf: '1D', mode: 'all', art: 'dip',
    conds: [c('close', '>', 'sma_200'), c('rsi_14', 'between', [35, 45])], tagline: 'A long-term uptrend that has cooled off for a while.',
    what: ['The price is above its 200-day average (long-term uptrend).', 'RSI (14) has cooled to between 35 and 45.'], why: 'Some traders prefer to study strong stocks while they rest, not while they run.',
    watch: 'A pullback can turn into a real decline. Test a tighter loss limit and see what changes.' },
  { id: 'ema-cross', name: 'EMA 9 / 21 crossover', by: 'Classic idea', icon: 'wave', color: '#D8457F', tf: '1D', mode: 'all', art: 'cross',
    conds: [c('ema_9', 'crosses_above', 'ema_21')], tagline: 'A fast average crosses above a slower one.', what: ['The 9-day exponential average crosses above the 21-day one today.'],
    why: 'A quick way to spot a short-term change of direction.', watch: 'Fast signals whipsaw in sideways markets. Try adding “above the 200-day average”.' },
  { id: 'macd', name: 'MACD crossover', by: 'Classic idea', icon: 'bars', color: '#5B6CFF', tf: '1D', mode: 'all', art: 'cross',
    conds: [c('macd', 'crosses_above', 'macd_signal')], tagline: 'Momentum turning up.', what: ['The MACD line crosses above its signal line today.'],
    why: 'MACD measures the gap between two averages; the crossover marks momentum turning.', watch: 'Very common signal, so it fires a lot. Filters usually matter more than the signal.' },
  { id: 'volume-surge', name: 'Volume surge', by: 'Classic idea', icon: 'bars', color: '#0E9F8A', tf: '1D', mode: 'all', art: 'vol',
    conds: [c('vol_ratio', '>', 2), c('ret_1', '>', 2)], tagline: 'Unusual buying in a single day.', what: ['Volume is at least twice its 20-day average.', 'The price closed up 2% or more.'],
    why: 'Sudden volume often means news or large buyers.', watch: 'One-day spikes often fade. Look at what happened over the following weeks in the test.' },
  { id: 'oversold', name: 'Oversold bounce', by: 'Classic idea', icon: 'shield', color: '#E0A030', tf: '1D', mode: 'all', art: 'dip',
    conds: [c('rsi_14', '<', 35), c('is_green', 'is_true')], tagline: 'A sharp fall that closes higher today.', what: ['RSI (14) is below 35.', 'Today’s candle closed higher than it opened.'],
    why: 'Mean-reversion traders study stretched moves that start to turn.', watch: 'Falling stocks can keep falling. This idea usually needs a firm loss limit.' },
  { id: 'weekly-trend', name: 'Weekly trend start', by: 'Classic idea', icon: 'trend', color: '#7B55F0', tf: '1W', mode: 'all', art: 'cross',
    conds: [c('ema_10', 'crosses_above', 'ema_20')], tagline: 'Slower signals on the weekly chart.', what: ['On the weekly chart, the 10-week exponential average crosses above the 20-week one.'],
    why: 'Weekly charts filter out daily noise.', watch: 'Fewer signals and longer holds. Test with a longer time limit.' },
];
export const ideaById = id => IDEAS.find(x => x.id === id);
export const SUGGEST = ['52-week high on heavy volume', 'Above 200 DMA and RSI below 40', 'Golden cross', 'EMA 9 crosses EMA 21 in an uptrend', 'Gap up 3% with 2x volume', 'High tight flag'];

/** A small picture for an idea card. Drawn, not real data. */
export function art(kind, color) {
  const P = {
    break: 'M2 40 14 36 24 39 34 34 44 37 54 33 64 35 74 32 84 22 94 14 104 8 118 4', flag: 'M2 44 14 40 24 26 34 12 44 15 54 13 64 16 74 14 84 15 94 8 104 5 118 2',
    high: 'M2 30 14 34 24 26 34 30 44 22 54 25 64 18 74 21 84 14 94 16 104 9 118 4', cross: 'M2 34 18 36 34 33 50 30 66 25 82 20 98 15 118 10', dip: 'M2 36 14 30 26 22 38 16 50 12 62 18 74 24 86 20 98 14 108 10 118 6', vol: 'M2 30 20 31 38 29 56 30 74 28 92 16 118 12',
  };
  const lvl = { break: 30, flag: 14, high: 20, dip: null, cross: null, vol: null }[kind];
  const sub = kind === 'cross' ? `<path d="M2 26 18 28 34 28 50 28 66 27 82 25 98 23 118 20" fill="none" stroke="${color}" stroke-opacity=".45" stroke-width="1.6" stroke-dasharray="3 3"/>` : '';
  const bars = kind === 'vol' ? [4, 5, 4, 6, 5, 4, 5, 14, 11].map((h, i) => `<rect x="${8 + i * 12}" y="${48 - h}" width="7" height="${h}" rx="1.5" fill="${color}" fill-opacity="${i > 6 ? .8 : .25}"/>`).join('') : '';
  return `<svg viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden="true">${lvl != null ? `<path d="M2 ${lvl}H118" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="3 4"/>` : ''}${bars}${sub}<path d="${P[kind] || P.break}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
