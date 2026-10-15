/* Scanner query language. One condition per line, joined by "and" / "or", like Chartink but shorter.

     close > sma(200)
     and rsi(14) < 40
     and rvol > 2
     and sma(50) crosses above sma(200)
     and rsi(14) between 40 and 60
     and green

   parse(text, cat)   -> { mode, conds, lines: [{ n, text, ok, error }], errors }
   format(mode, conds) -> text (the reverse, so ideas and plain words land in the editor too)
   The rule JSON it produces is the same the Lab API already validates. */

const MA_OK = new Set(['sma_10', 'sma_20', 'sma_50', 'sma_100', 'sma_150', 'sma_200', 'ema_9', 'ema_10', 'ema_20', 'ema_21', 'ema_50', 'ema_100', 'ema_200']);
const ALIAS = {
  price: 'close', ltp: 'close', c: 'close', o: 'open', h: 'high', l: 'low', v: 'volume', vol: 'volume',
  rvol: 'vol_ratio', relative_volume: 'vol_ratio', volume_ratio: 'vol_ratio', vol_surge: 'vol_surge', avg_volume: 'vol_sma_20', avg_vol: 'vol_sma_20',
  gap: 'gap_pct', body: 'body_pct', wick: 'upper_wick_pct', range: 'range_pct', atr_pct: 'atr_pct', bb_width: 'bb_width_pct', bbw: 'bb_width_pct', bb_pct: 'bb_pct', percent_b: 'bb_pct',
  upper_bb: 'bb_upper', bb_upper: 'bb_upper', upper_band: 'bb_upper', lower_bb: 'bb_lower', bb_lower: 'bb_lower', lower_band: 'bb_lower',
  signal: 'macd_signal', macd_signal: 'macd_signal', hist: 'macd_hist', macd_hist: 'macd_hist', histogram: 'macd_hist',
  high52: 'hh_52', high_52w: 'hh_52', '52w_high': 'hh_52', yearly_high: 'hh_52', low52: 'll_52', low_52w: 'll_52', '52w_low': 'll_52',
  high20: 'hh_20', low20: 'll_20', from_52w_high: 'dist_hh52_pct', dist_52w_high: 'dist_hh52_pct', from_20d_high: 'dist_hh20_pct',
  from_sma50: 'dist_sma_50_pct', from_sma200: 'dist_sma_200_pct', stoch: 'stoch_k', di_plus: 'pdi_14', di_minus: 'ndi_14', '+di': 'pdi_14', '-di': 'ndi_14',
  close_location: 'close_loc', turnover: 'turnover',
  green: 'is_green', inside_bar: 'is_inside_bar', inside: 'is_inside_bar', rs_leader: 'sig_rs_leader', stage2: 'sig_stage2_base', stage_2: 'sig_stage2_base',
  power_gap: 'sig_power_gap', apex: 'sig_apex_base', apex_base: 'sig_apex_base', vcp: 'sig_apex_base', htf: 'sig_high_tight_flag', high_tight_flag: 'sig_high_tight_flag',
};
const OPS = { '>': '>', '>=': '>=', '<': '<', '<=': '<=', '=': '==', '==': '==', '!=': '!=', above: '>', below: '<', over: '>', under: '<' };
export const KEYWORDS = ['and', 'or', 'between', 'crosses', 'cross', 'above', 'below', 'is', 'not'];

/* ---------------------------------------------------------------- terms -> feature keys */
function fn(name, args, keys) {
  const a = args[0], N = a == null ? null : String(a).toLowerCase();
  const need = (k, msg) => { if (keys.has(k)) return { f: k }; return { error: msg || `${name}(${args.join(',')}) is not available` }; };
  switch (name) {
    case 'sma': case 'ma': case 'dma': { const k = 'sma_' + (N || 50); return MA_OK.has(k) ? { f: k } : { error: `sma(${N}) not available. Use 10, 20, 50, 100, 150 or 200` }; }
    case 'ema': { const k = 'ema_' + (N || 20); return MA_OK.has(k) ? { f: k } : { error: `ema(${N}) not available. Use 9, 10, 20, 21, 50, 100 or 200` }; }
    case 'rsi': return N && N !== '14' ? { error: 'Only rsi(14) is available' } : need('rsi_14');
    case 'adx': return N && N !== '14' ? { error: 'Only adx(14) is available' } : need('adx_14');
    case 'atr': return N && N !== '14' ? { error: 'Only atr(14) is available' } : need('atr_14');
    case 'cci': return N && N !== '20' ? { error: 'Only cci(20) is available' } : need('cci_20');
    case 'high': case 'hh': case 'highest': if (!N) return { f: 'high' }; return /^(52w?|252|1y)$/.test(N) ? { f: 'hh_52' } : N === '20' ? { f: 'hh_20' } : { error: 'Use high(20) or high(52w)' };
    case 'low': case 'll': case 'lowest': if (!N) return { f: 'low' }; return /^(52w?|252|1y)$/.test(N) ? { f: 'll_52' } : N === '20' ? { f: 'll_20' } : { error: 'Use low(20) or low(52w)' };
    case 'change': case 'ret': case 'return': case 'chg': { const k = 'ret_' + (N || 1); return keys.has(k) ? { f: k } : { error: 'Use change(1), change(5) or change(20)' }; }
    case 'volume': case 'vol': return N === '20' ? { f: 'vol_sma_20' } : { error: 'Use volume, avg_volume or rvol' };
    case 'macd': return { f: 'macd' };
    default: return { error: `Unknown function "${name}"` };
  }
}
function term(t, keys) {
  if (t.kind === 'num') return { c: t.v };
  const name = t.v.toLowerCase();
  if (t.args) return fn(name, t.args, keys);
  if (keys.has(name)) return { f: name };
  if (ALIAS[name] && keys.has(ALIAS[name])) return { f: ALIAS[name] };
  if (/^(sma|ema|dma|ma)_?(\d+)$/.test(name)) { const m = name.match(/^(sma|ema|dma|ma)_?(\d+)$/); return fn(m[1], [m[2]], keys); }
  if (name === 'rsi' || name === 'adx' || name === 'atr' || name === 'cci') return fn(name, [], keys);
  return { error: `Unknown field "${t.v}"` };
}

/* ---------------------------------------------------------------- tokenizer */
const TOK = /\s*(?:(-?\d+(?:\.\d+)?)(?![\d.A-Za-wyz_]|x[A-Za-z0-9_])\s*(%|x\b)?|([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([^)]*)\)|(>=|<=|==|!=|>|<|=)|(\+di|-di|[0-9]*[A-Za-z_][A-Za-z0-9_]*)|(\S))/y;
export function tokens(src) {
  const out = []; TOK.lastIndex = 0; let m;
  while (TOK.lastIndex < src.length && (m = TOK.exec(src))) {
    const at = m.index + (m[0].length - m[0].trimStart().length);
    if (m[1] !== undefined) out.push({ kind: 'num', v: parseFloat(m[1]), at, raw: m[0].trim() });
    else if (m[3] !== undefined) out.push({ kind: 'id', v: m[3], args: m[4].split(',').map(s => s.trim()).filter(Boolean), at, raw: m[0].trim() });
    else if (m[5] !== undefined) out.push({ kind: 'op', v: m[5], at, raw: m[5] });
    else if (m[6] !== undefined) { const w = m[6].toLowerCase(); out.push({ kind: KEYWORDS.includes(w) ? 'kw' : 'id', v: KEYWORDS.includes(w) ? w : m[6], at, raw: m[6] }); }
    else if (m[7] !== undefined) out.push({ kind: 'bad', v: m[7], at, raw: m[7] });
  }
  return out;
}

/* ---------------------------------------------------------------- one condition */
function cond(ts, keys) {
  ts = ts.filter(t => !(t.kind === 'kw' && t.v === 'is'));
  if (!ts.length) return { error: 'Empty condition' };
  const bad = ts.find(t => t.kind === 'bad'); if (bad) return { error: `Unexpected "${bad.v}"` };
  const L = term(ts[0], keys); if (L.error) return L;
  if (ts.length === 1) {
    if (L.c !== undefined) return { error: 'A number alone is not a condition' };
    if (!/^(is_|sig_)/.test(L.f)) return { error: `"${ts[0].raw}" needs a comparison, e.g. ${ts[0].raw} > 50` };
    return { x: { l: { f: L.f }, op: 'is_true' } };
  }
  let i = 1, op;
  const t1 = ts[1], t2 = ts[2];
  if (t1.kind === 'kw' && (t1.v === 'crosses' || t1.v === 'cross')) {
    if (!t2 || t2.kind !== 'kw' || !['above', 'below'].includes(t2.v)) return { error: 'Write "crosses above" or "crosses below"' };
    op = 'crosses_' + t2.v; i = 3;
  } else if (t1.kind === 'kw' && t1.v === 'between') {
    const a = ts[2], and = ts[3], b = ts[4];
    if (!a || a.kind !== 'num' || !and || and.v !== 'and' || !b || b.kind !== 'num' || ts.length > 5) return { error: 'Write it as: field between 40 and 60' };
    if (L.f === undefined) return { error: 'The left side of "between" must be a field' };
    return { x: { l: { f: L.f }, op: 'between', r: { list: [Math.min(a.v, b.v), Math.max(a.v, b.v)] } } };
  } else if ((t1.kind === 'op' || t1.kind === 'kw') && OPS[t1.v]) { op = OPS[t1.v]; i = 2; }
  else return { error: `Expected a comparison after "${ts[0].raw}" (>, <, crosses above, between…)` };
  const rt = ts[i]; if (!rt) return { error: 'Missing the right side' };
  if (ts.length > i + 1) return { error: `Unexpected "${ts[i + 1].raw}". Put each condition on its own line with and / or` };
  const R = term(rt, keys); if (R.error) return R;
  if (L.c !== undefined && R.c !== undefined) return { error: 'Compare a field, not two numbers' };
  if (L.c !== undefined) { const flip = { '>': '<', '<': '>', '>=': '<=', '<=': '>=', '==': '==', '!=': '!=' }[op]; if (!flip) return { error: 'Put the field on the left of "crosses"' }; return { x: { l: { f: R.f }, op: flip, r: { c: L.c } } }; }
  if (/^(is_|sig_)/.test(L.f)) return { error: `"${ts[0].raw}" is yes/no; write it alone` };
  return { x: { l: { f: L.f }, op, r: R.c !== undefined ? { c: R.c } : { f: R.f } } };
}

/* ---------------------------------------------------------------- whole query */
export function parse(src, cat) {
  const keys = new Set(((cat && cat.features) || []).map(f => f.key));
  if (!keys.size) Object.values(ALIAS).concat(['close', 'open', 'high', 'low', 'volume', 'rsi_14', 'macd']).forEach(k => keys.add(k));
  const text = String(src || '');
  const lines = [], conds = []; const joins = new Set();
  let cur = [], curLine = 1;
  const flush = () => {
    if (!cur.length) return;
    const raw = text.slice(cur[0].at, cur.at(-1).at + cur.at(-1).raw.length);
    const r = cond(cur, keys);
    lines.push({ n: curLine, text: raw, ok: !r.error, error: r.error, at: cur[0].at });
    if (r.x) conds.push(r.x); cur = [];
  };
  // newline-aware: tokenise per physical line so errors point at a line
  text.split('\n').forEach((ln, li) => {
    const off = text.split('\n').slice(0, li).reduce((s, x) => s + x.length + 1, 0);
    const ts = tokens(ln.replace(/(#|\/\/).*$/, '')).map(t => ({ ...t, at: t.at + off }));
    ts.forEach((t, k) => {
      const prevBetween = cur.length >= 2 && cur.at(-2).kind === 'kw' && cur.at(-2).v === 'between';
      if (t.kind === 'kw' && (t.v === 'and' || t.v === 'or') && !(t.v === 'and' && prevBetween)) { flush(); joins.add(t.v); return; }
      if (!cur.length) curLine = li + 1;
      cur.push(t);
    });
    // a new physical line starts a new condition unless the line ended with "between x" or a dangling operator
    const last = cur.at(-1);
    const midBetween = cur.length >= 2 && cur.at(-2).kind === 'kw' && cur.at(-2).v === 'between';
    if (last && !midBetween && !(last.kind === 'kw' && ['between', 'crosses', 'cross', 'and'].includes(last.v)) && last.kind !== 'op') flush();
  });
  flush();
  const errors = lines.filter(l => !l.ok);
  if (joins.size > 1) errors.push({ n: 0, error: 'Use only "and" or only "or" in one scanner' });
  return { mode: joins.has('or') && !joins.has('and') ? 'any' : 'all', conds, lines, errors };
}

/* ---------------------------------------------------------------- rules -> text */
const BACK = { vol_ratio: 'rvol', gap_pct: 'gap', is_green: 'green', is_inside_bar: 'inside_bar', sig_rs_leader: 'rs_leader', sig_stage2_base: 'stage2', sig_power_gap: 'power_gap', sig_apex_base: 'apex_base', sig_high_tight_flag: 'high_tight_flag', hh_52: 'high(52w)', hh_20: 'high(20)', ll_52: 'low(52w)', ll_20: 'low(20)', vol_sma_20: 'avg_volume', macd_signal: 'signal', macd_hist: 'macd_hist', dist_hh52_pct: 'from_52w_high' };
export function tokenOf(k) {
  if (BACK[k]) return BACK[k];
  let m;
  if ((m = k.match(/^(sma|ema)_(\d+)$/))) return `${m[1]}(${m[2]})`;
  if ((m = k.match(/^(rsi|adx|atr|cci)_(\d+)$/))) return `${m[1]}(${m[2]})`;
  if ((m = k.match(/^ret_(\d+)$/))) return `change(${m[1]})`;
  return k;
}
const OPTXT = { '>': '>', '>=': '>=', '<': '<', '<=': '<=', '==': '=', '!=': '!=', crosses_above: 'crosses above', crosses_below: 'crosses below' };
export function format(mode, conds) {
  return (conds || []).map((x, i) => {
    const L = tokenOf(x.l.f); let s;
    if (x.op === 'is_true') s = L;
    else if (x.op === 'between') s = `${L} between ${x.r.list[0]} and ${x.r.list[1]}`;
    else s = `${L} ${OPTXT[x.op] || x.op} ${x.r.f ? tokenOf(x.r.f) : x.r.c}`;
    return (i ? (mode === 'any' ? 'or ' : 'and ') : '') + s;
  }).join('\n');
}

/* ---------------------------------------------------------------- editor helpers */
export const SNIPPETS = [
  ['Above 200 SMA', 'close > sma(200)'], ['RSI below 40', 'rsi(14) < 40'], ['RSI 40–60', 'rsi(14) between 40 and 60'], ['Golden cross', 'sma(50) crosses above sma(200)'],
  ['EMA 9 × 21', 'ema(9) crosses above ema(21)'], ['2× volume', 'rvol > 2'], ['52-week high', 'close > high(52w)'], ['20-day breakout', 'close > high(20)'],
  ['Up 3% today', 'change(1) > 3'], ['Gap up 2%', 'gap > 2'], ['Strong trend', 'adx(14) > 25'], ['MACD cross', 'macd crosses above signal'], ['Green candle', 'green'], ['Near 52w high', 'from_52w_high > -5'],
];
/** Every word the editor can complete, with a short hint. */
export function vocab(cat) {
  const v = [['sma(200)', 'simple average'], ['sma(50)', 'simple average'], ['ema(21)', 'exponential average'], ['ema(9)', 'exponential average'], ['rsi(14)', 'RSI'], ['adx(14)', 'trend strength'], ['atr(14)', 'average range'],
    ['high(52w)', '52-week high'], ['high(20)', '20-day high'], ['low(52w)', '52-week low'], ['low(20)', '20-day low'], ['change(1)', '% today'], ['change(5)', '% 5 days'], ['change(20)', '% 20 days'],
    ['rvol', 'volume ÷ 20-day avg'], ['gap', 'gap %'], ['macd', 'MACD line'], ['signal', 'MACD signal'], ['green', 'closed above open'], ['inside_bar', 'inside bar'],
    ['close', 'price'], ['open', ''], ['volume', ''], ['avg_volume', '20-day avg'], ['from_52w_high', '% from 52w high'], ['bb_upper', 'Bollinger'], ['bb_lower', 'Bollinger'],
    ['crosses above', ''], ['crosses below', ''], ['between', 'a and b'], ['and', ''], ['or', ''],
    ['rs_leader', 'pattern'], ['stage2', 'pattern'], ['power_gap', 'pattern'], ['apex_base', 'pattern'], ['high_tight_flag', 'pattern']];
  const seen = new Set(v.map(x => x[0]));
  ((cat && cat.features) || []).forEach(f => { const t = tokenOf(f.key); if (!seen.has(t)) { seen.add(t); v.push([t, f.label || '']); } });
  return v;
}
/** HTML for the colour layer behind the textarea. Unknown words get a red underline. */
export function highlight(src, cat) {
  const keys = new Set(((cat && cat.features) || []).map(f => f.key));
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return src.split('\n').map(ln => {
    const cm = ln.match(/(#|\/\/).*$/); const body = cm ? ln.slice(0, cm.index) : ln;
    let out = '', last = 0;
    tokens(body).forEach(t => {
      out += esc(body.slice(last, t.at)); last = t.at + t.raw.length;
      const raw = esc(body.slice(t.at, last));
      let c = 'q-id';
      if (t.kind === 'num') c = 'q-num'; else if (t.kind === 'op') c = 'q-op'; else if (t.kind === 'kw') c = /^(and|or)$/.test(t.v) ? 'q-join' : 'q-kw'; else if (t.kind === 'bad') c = 'q-bad';
      else if (keys.size && term(t, keys).error) c = 'q-bad'; else if (t.args) c = 'q-fn';
      out += `<span class="${c}">${raw}</span>`;
    });
    out += esc(body.slice(last)) + (cm ? `<span class="q-cm">${esc(cm[0])}</span>` : '');
    return out;
  }).join('\n') + '\n';
}
