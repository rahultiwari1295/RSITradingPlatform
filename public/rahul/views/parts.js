/* Building blocks shared by several screens. */
import { fmt, esc, mono, link, icon, delta, tone, scoreTone, n, q, CFG, paper, sheet, toast, go, toDate, engineBadge, engineName, callPath } from '../core.js';
import { ruler, spark } from '../charts.js';

export function callCard(c, { compact = false } = {}) {
  const fresh = c.isNew || c.days === 0;
  const pill = c.action.includes('EXIT') || c.action.includes('SELL') ? '<span class="pill dn">Sell</span>' : fresh ? '<span class="pill ai">New buy</span>' : `<span class="pill">Day ${fmt.int(c.days)}</span>`;
  return link(callPath(c), `
    <div class="top">${mono(c.sym)}<div class="nm"><div class="t">${esc(c.sym)}</div><div class="s">${engineBadge(c)}</div></div>
      <div class="px"><div class="v tnum">${fmt.px(c.now)}</div>${fresh && Math.abs(c.roi) < .05 ? '<span class="small">at entry</span>' : delta(c.roi)}</div></div>
    ${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now })}
    ${!compact && c.why ? `<p class="why">${esc(c.why)}</p>` : ''}
    <div class="foot">${pill}<span>${c.days === 0 ? 'Called today' : fresh ? 'Called ' + fmt.date(c.entryDate) : 'Since ' + fmt.date(c.entryDate)}</span><span class="tnum">${isFinite(c.target / c.entry) ? 'Target ' + fmt.sp((c.target / c.entry - 1) * 100, 0) : ''}</span></div>`, 'callcard', `aria-label="${esc(c.sym)} AI call, ${fmt.px(c.now)}"`);
}

export function closedRow(c) {
  return link(`calls/closed/${encodeURIComponent(c.id)}`, `${mono(c.sym)}
    <div class="main"><div class="t">${esc(c.sym)}</div><div class="s">${engineBadge(c, 'sm')}<span>${esc(c.reason)}, ${fmt.days(c.days)}</span></div></div>
    <div class="end"><div class="v ${tone(c.roi)} tnum">${fmt.sp(c.roi)}</div><div class="d faint">${fmt.date(c.exitDate)}</div></div>`, 'row');
}

/* ---------------------------------------------------------------- QuantSync Scanner signals */
/** New: from the latest scan or entered within the last session. Old: two or more sessions ago, so the entry has passed. */
export const isFreshSignal = c => !!(c.isNew || c.days <= 1);
/** "Today", "1 day ago", "2 days ago": how long ago the call was made. */
export const ago = c => {
  const d = toDate(c.entryDate);
  let k = isFinite(c.days) ? Math.round(c.days) : NaN;
  if (d) { const t = new Date(); k = Math.max(0, Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5)); }
  return !isFinite(k) ? '' : k === 0 ? 'Today' : k === 1 ? '1 day ago' : k + ' days ago';
};
/** 'new' | 'near' | 'ran' | 'below': where the price stands against the call's entry. */
export function entryZone(c) {
  if (isFreshSignal(c)) return 'new';
  const g = (c.now / c.entry - 1) * 100;
  if (!isFinite(g)) return 'near';
  return g > 2 ? 'ran' : g < -1 ? 'below' : 'near';
}
const zoneTag = c => {
  const z = entryZone(c), g = (c.now / c.entry - 1) * 100;
  return z === 'ran' ? `<span class="tag">Already up ${fmt.sp(g, 1)}</span>` : z === 'below' ? `<span class="tag dn">Below entry ${fmt.sp(g, 1)}</span>` : '';
};
/** Thin stop → entry → target track with a dot for the current price. Stop price on the left, target on the right. */
export function miniRange({ stop, entry, target, now }) {
  if (![stop, entry, target].every(isFinite) || !(target > stop)) return '';
  const lo = Math.min(stop, isFinite(now) ? now : stop), hi = Math.max(target, isFinite(now) ? now : target), sp = hi - lo || 1;
  const P = v => Math.max(0, Math.min(100, (v - lo) / sp * 100));
  return `<div class="mr" role="img" aria-label="Stop ${fmt.px(stop)}, entry ${fmt.px(entry)}, target ${fmt.px(target)}${isFinite(now) ? `, now ${fmt.px(now)}` : ''}"><span class="dn tnum">${fmt.px(stop)}</span><div class="mr-t"><i class="l" style="left:${P(stop)}%;width:${P(entry) - P(stop)}%"></i><i class="w" style="left:${P(entry)}%;width:${P(target) - P(entry)}%"></i><u style="left:${P(entry)}%"></u>${isFinite(now) ? `<b style="left:${P(now)}%"></b>` : ''}</div><span class="up tnum">${fmt.px(target)}</span></div>`;
}
/** One open call as a dense row: name, engine and age, price against entry, the stop-to-target track, and a Buy button for the owner. */
export function signalCard(c, o = {}) {
  const fresh = isFreshSignal(c), traded = paper.has(c.sym), owned = !!(o.owned && o.owned.has(String(c.sym).toUpperCase()));
  const pct = Math.abs(c.roi) < .05 ? '<span class="d0">at entry</span>' : delta(c.roi);
  const main = link(callPath(c), `<div class="cr-top"><div class="cr-id"><div class="t">${esc(c.sym)}${owned ? '<span class="tag bought">Held</span>' : ''}${traded ? '<span class="tag paper">Paper</span>' : ''}</div><div class="s">${engineBadge(c, 'sm')}<span class="ago">${ago(c)}</span>${zoneTag(c)}</div></div><div class="cr-px"><b class="tnum">${fmt.px(c.now)}</b>${pct}</div></div>${miniRange(c)}`,
    'cr-main', `aria-label="${esc(c.sym)}, ${engineName(c)}, ${fresh ? 'new' : 'open'} call${owned ? ', held' : ''}"`);
  return `<div class="cr${owned ? ' owned' : ''}${fresh ? ' fresh' : ''}">${main}${o.buy ? `<button class="btn sm${owned ? ' quiet' : ''}" data-buy="${esc(c.sym)}">${owned ? 'Add' : 'Buy'}</button>` : ''}</div>`;
}
/** Kept for callers that still wire paper-trade buttons (the call detail page). */
export function bindSignals(root, list, onChange) {
  root.querySelectorAll('[data-paper]').forEach(b => b.onclick = e => { e.preventDefault(); const c = list.find(x => x.sym === b.dataset.paper); if (c) paperSheet(c, onChange); });
  root.querySelectorAll('[data-open-paper]').forEach(b => b.onclick = e => { e.preventDefault(); go('portfolio'); });
}
const head = (t, sub, n, cls = '', extra = '') => `<div class="sig-sec ${cls}"><div class="h"><h3>${t}</h3><span class="n tnum">${n}</span>${extra}</div>${sub ? `<p>${sub}</p>` : ''}</div>`;
/** Every open call appears once: new today, still open to buy (near or above entry), or below its entry. Nothing is hidden. */
export function signalList(list, o = {}) {
  const by = (a, b) => (b.score || 0) - (a.score || 0);
  const g1 = list.filter(c => entryZone(c) === 'new').sort(by);
  const g2 = list.filter(c => ['near', 'ran'].includes(entryZone(c))).sort((a, b) => (entryZone(a) === 'near' ? 0 : 1) - (entryZone(b) === 'near' ? 0 : 1) || (a.days || 0) - (b.days || 0));
  const g3 = list.filter(c => entryZone(c) === 'below').sort((a, b) => (a.days || 0) - (b.days || 0));
  const rows = (l, oo = o) => `<div class="group cr-list">${l.map(c => signalCard(c, oo)).join('')}</div>`;
  const free = g1.filter(c => !(o.owned && o.owned.has(String(c.sym).toUpperCase())));
  const all = o.buy && free.length >= 2 ? `<button class="btn sm" data-basket style="margin-left:auto">Buy all ${Math.min(free.length, 5)}</button>` : '';
  return `${head('Buy today', '', g1.length, 'fresh', all)}
    ${g1.length ? rows(g1) : '<div class="group cr-empty">No new call in the last scan. Calls come at about 3:15 PM on market days.</div>'}
    ${g2.length ? `${head('Still open to buy', 'At or above the entry price.', g2.length, 'old')}${rows(g2)}` : ''}
    ${g3.length ? `${head('Below entry', 'Calls bought below their entry won about 3 in 10. Wait for the price to get back above it.', g3.length, 'old')}${rows(g3, { ...o, buy: false })}` : ''}`;
}
/** The engine's reasons as a short list. The text arrives as one comma-joined line. */
export const whyList = t => { const xs = String(t || '').split(/\s*[,;]\s*(?=[A-Z])/).map(x => x.trim()).filter(Boolean); return xs.length > 1 ? `<ul class="why-l">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="why-1">${esc(t)}</p>`; };
export const scanRule = () => '';
export const scanLogo = () => `<span class="scan-mark" aria-hidden="true">${icon('target', 17)}</span>`;
export function paperSheet(c, done) {
  const s = sheet(`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${mono(c.sym, 'lg')}<div><h3 style="margin:0">Paper trade ${esc(c.sym)}</h3><div class="small">${engineName(c)} signal. Practice money, nothing is bought.</div></div></div>
    <div class="field"><label for="pp-a">How much to put in (₹)</label><input id="pp-a" inputmode="numeric" value="10000"></div>
    <div class="kv" style="margin:4px 0 14px"><div><div class="k">Shares at ${fmt.px(c.now)}</div><div class="v" id="pp-q">—</div></div><div><div class="k">Most you can lose</div><div class="v dn" id="pp-r">—</div></div><div><div class="k">Stop loss</div><div class="v">${fmt.px(c.stop)}</div></div><div><div class="k">Target</div><div class="v up">${fmt.px(c.target)}</div></div></div>
    <button class="btn block" data-go>${icon('bolt', 18)}Start paper trade</button>
    <p class="tiny" style="margin:10px 0 0;text-align:center">We track it in your portfolio until it reaches the stop or the target.</p>`, { label: 'Paper trade' });
  const a = s.el.querySelector('#pp-a'), qEl = s.el.querySelector('#pp-q'), rEl = s.el.querySelector('#pp-r');
  const calc = () => { const amt = n(a.value), qty = Math.floor(amt / c.now); qEl.textContent = qty > 0 ? fmt.int(qty) : '—'; rEl.textContent = qty > 0 && c.stop < c.now ? fmt.inr(qty * (c.now - c.stop)) : '—'; return qty; };
  a.oninput = calc; calc();
  s.el.querySelector('[data-go]').onclick = () => {
    const qty = calc(); if (!(qty > 0)) { a.focus(); return; }
    paper.add({ sym: c.sym, name: c.name, strategy: engineName(c), engine: c.engine, qty, entry: c.now, stop: c.stop, target: c.target, signalEntry: c.entry, signalDate: c.entryDate });
    s.close(); toast(`Paper trade started: ${qty} ${c.sym}`); done && done();
  };
}

export const STAGE = {
  Breakout: { t: 'Breakout', c: 'var(--up-solid)', g: 'breakout', what: 'Closed above the ceiling. Buy zone.' },
  Retest: { t: 'Retest', c: 'var(--brand)', g: 'retest', what: 'Back at the old ceiling. Buy if it holds.' },
  Near: { t: 'Near', c: 'var(--ai-solid)', g: 'near', what: 'Just under the ceiling. Set an alert.' },
  Forming: { t: 'Forming', c: 'var(--ink-3)', g: 'forming', what: 'Base still building. Watch only.' },
};
export const tfWord = tf => ({ D: 'Daily', W: 'Weekly', M: 'Monthly' }[tf] || 'Daily');

export function patternCard(p, closes) {
  const st = STAGE[p.stage] || STAGE.Forming;
  const dist = (p.price / p.level - 1) * 100;
  const c = p.conf && isFinite(p.conf.hit) ? p.conf : null;
  return link(`patterns/${encodeURIComponent(p.sym)}?tf=${p.tf}`, `
    <div class="in"><div class="top" style="display:flex;align-items:center;gap:12px">${mono(p.sym)}
      <div style="flex:1;min-width:0"><div class="t" style="font-weight:650;font-size:17px;letter-spacing:-.02em">${esc(p.sym)}</div><div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.pattern)}</div></div>
      <div style="text-align:right"><div class="tnum" style="font-weight:650;font-size:17px">${fmt.px(p.price)}</div><div class="small tnum">${dist >= 0 ? fmt.sp(dist) + ' above' : fmt.sp(dist).replace('−', '') + ' below'} level</div></div></div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><span class="pill" style="background:color-mix(in srgb, ${st.c} 14%, transparent);color:${st.c === 'var(--ink-3)' ? 'var(--ink-2)' : st.c}"><i class="stage-ic" style="background:${st.c}"></i>${st.t}</span><span class="pill">${tfWord(p.tf)}</span>${p.grade ? `<span class="pill">Grade ${esc(p.grade)}</span>` : ''}<span class="pill" data-xr="${esc(p.sym)}" hidden></span></div>
    </div>
    <div class="plot" data-spark="${esc(p.sym)}" data-level="${p.level}">${closes ? spark(closes, { w: 360, h: 104, level: p.level, tone: st.c }) : ''}</div>
    <div class="odds">
      <div><div class="k">Reached target</div><div class="v">${c ? fmt.pct(c.hit, 0) : '—'}</div></div>
      <div><div class="k">Profitable</div><div class="v">${c ? fmt.pct(c.win, 0) : '—'}</div></div>
      <div><div class="k">Past setups</div><div class="v">${c ? fmt.int(c.n) : '—'}</div></div>
    </div>`, 'pcard', `aria-label="${esc(p.sym)} ${st.t}"`);
}

export function patternRow(p) {
  const st = STAGE[p.stage] || STAGE.Forming;
  return link(`patterns/${encodeURIComponent(p.sym)}?tf=${p.tf}`, `${mono(p.sym)}
    <div class="main"><div class="t">${esc(p.sym)}</div><div class="s">${esc(p.pattern)}</div></div>
    <div class="end"><div class="v tnum">${fmt.px(p.price)}</div><div class="d" style="color:${st.c === 'var(--ink-3)' ? 'var(--ink-2)' : st.c};font-weight:600">${st.t}${p.grade ? ' ' + esc(p.grade) : ''}</div></div>`, 'row');
}

export function stockRow(s, right = '') {
  return link(`xray/${encodeURIComponent(s.symbol)}`, `${mono(s.symbol)}
    <div class="main"><div class="t">${esc(s.symbol)}</div><div class="s">${esc(s.name || s.sector || '')}</div></div>
    ${right || (isFinite(n(s.score)) ? `<div class="end"><div class="v tnum">${fmt.int(s.score)}</div><div class="d ${scoreTone(s.score).k}" style="font-weight:600">${scoreTone(s.score).t}</div></div>` : '')}`, 'row');
}

/** Fill mini price lines and X-Ray scores for pattern cards. */
export async function sparks(root, api) {
  const xs = [...new Set([...root.querySelectorAll('[data-xr][hidden]')].map(e => e.dataset.xr))].slice(0, 60);
  if (xs.length) api(`/app/xray-batch?symbols=${xs.map(encodeURIComponent).join(',')}`, 30).then(d => {
    root.querySelectorAll('[data-xr][hidden]').forEach(e => { const x = (d.items || {})[e.dataset.xr]; if (x && isFinite(n(x.score))) { e.textContent = 'X-Ray ' + fmt.int(x.score); e.className = 'pill ' + scoreTone(x.score).k; e.hidden = false; } });
  }).catch(() => {});
  const els = [...root.querySelectorAll('[data-spark]')].filter(e => !e.firstElementChild);
  await Promise.all(els.map(async e => {
    try {
      const d = await api(`/chart/${encodeURIComponent(e.dataset.spark)}?limit=60`, 30);
      const cl = (d.candles || []).map(c => n(c.close)).filter(isFinite);
      if (e.isConnected && cl.length > 2) e.innerHTML = spark(cl, { w: 360, h: 104, level: n(e.dataset.level), tone: e.closest('.pcard')?.querySelector('.stage-ic')?.style.background });
    } catch { /* leave blank */ }
  }));
}

export const sec = (title, inner, { more = '', p = '', id = '' } = {}) => `<section class="sec"${id ? ` id="${id}"` : ''}><div class="sec-h"><h2>${title}</h2>${more}</div>${p ? `<p class="sec-p">${p}</p>` : ''}${inner}</section>`;
export const labLink = () => `<a class="lab-promo" href="/app/scanner.html"><span class="ic">${icon('flask', 22)}</span><span style="flex:1"><span class="t" style="display:block">Build your own scanner</span><span class="s" style="display:block">Pick the rules, test them on years of NSE prices, and let AI filter the weak trades.</span></span>${icon('chev', 18)}</a>`;
export const footNote = (extra = '') => `<p class="foot-note">${extra ? extra + ' ' : ''}QuantSync is research and education, not investment advice. Prices can be delayed. Past results do not guarantee future returns.</p>`;
export const statCell = (k, v, d = '', gloss = '') => `<div class="stat"><div class="k">${k}${gloss ? q(gloss) : ''}</div><div class="v">${v}</div>${d ? `<div class="d">${d}</div>` : ''}</div>`;
export { CFG };
