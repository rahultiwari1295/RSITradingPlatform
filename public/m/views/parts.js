/* Building blocks shared by several screens. */
import { fmt, esc, mono, link, icon, delta, tone, scoreTone, n, q, CFG, paper, sheet, toast, go, toDate } from '../core.js';
import { ruler, spark } from '../charts.js';

export function callCard(c, { compact = false } = {}) {
  const fresh = c.isNew || c.days === 0;
  const pill = c.action.includes('EXIT') || c.action.includes('SELL') ? '<span class="pill dn">Sell</span>' : fresh ? '<span class="pill ai">New buy</span>' : `<span class="pill">Day ${fmt.int(c.days)}</span>`;
  return link(`calls/${encodeURIComponent(c.sym)}`, `
    <div class="top">${mono(c.sym)}<div class="nm"><div class="t">${esc(c.sym)}</div><div class="s">${esc(c.strategy)}</div></div>
      <div class="px"><div class="v tnum">${fmt.px(c.now)}</div>${fresh && Math.abs(c.roi) < .05 ? '<span class="small">at entry</span>' : delta(c.roi)}</div></div>
    ${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now })}
    ${!compact && c.why ? `<p class="why">${esc(c.why)}</p>` : ''}
    <div class="foot">${pill}<span>${c.days === 0 ? 'Called today' : fresh ? 'Called ' + fmt.date(c.entryDate) : 'Since ' + fmt.date(c.entryDate)}</span><span class="tnum">${isFinite(c.target / c.entry) ? 'Target ' + fmt.sp((c.target / c.entry - 1) * 100, 0) : ''}</span></div>`, 'callcard', `aria-label="${esc(c.sym)} AI call, ${fmt.px(c.now)}"`);
}

export function closedRow(c) {
  return link(`calls/closed/${encodeURIComponent(c.id)}`, `${mono(c.sym)}
    <div class="main"><div class="t">${esc(c.sym)}</div><div class="s">${esc(c.reason)}, ${fmt.days(c.days)}</div></div>
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
export function signalCard(c) {
  const fresh = isFreshSignal(c), traded = paper.has(c.sym);
  const run = (c.now / c.entry - 1) * 100;
  const pct = Math.abs(c.roi) < .05 ? '<span class="d0">0.0%</span>' : delta(c.roi);
  const body = `<div class="top">${mono(c.sym)}<div class="nm"><div class="t">${esc(c.sym)}${traded ? '<span class="tag paper">Paper traded</span>' : ''}</div><div class="s"><span class="st">${esc(c.strategy)}</span><span class="dot">·</span><b>${ago(c)}</b></div></div><div class="px"><div class="v">${fmt.px(c.now)}</div>${pct}</div></div>`;
  if (!fresh) {
    return link(`calls/${encodeURIComponent(c.sym)}`, `${body}${isFinite(run) && run > 1 ? `<p class="note">Already <b>${fmt.sp(run)}</b> above the entry. The best entry has passed.</p>` : ''}`, 'sig old compact', `aria-label="${esc(c.sym)}, old signal, skip"`);
  }
  return link(`calls/${encodeURIComponent(c.sym)}`, `${body}${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now }, { short: true })}`, 'sig new', `data-sig="${esc(c.sym)}" aria-label="${esc(c.sym)}, new signal"`);
}
/** Kept for callers that still wire paper-trade buttons (the call detail page). */
export function bindSignals(root, list, onChange) {
  root.querySelectorAll('[data-paper]').forEach(b => b.onclick = e => { e.preventDefault(); const c = list.find(x => x.sym === b.dataset.paper); if (c) paperSheet(c, onChange); });
  root.querySelectorAll('[data-open-paper]').forEach(b => b.onclick = e => { e.preventDefault(); go('portfolio'); });
}
const head = (t, sub, n, cls = '') => `<div class="sig-sec ${cls}"><div class="h"><h3>${t}</h3><span class="n tnum">${n}</span></div><p>${sub}</p></div>`;
/** Fresh signals first, then old ones under a "skip" heading. Age is on every card, so no per-card badge. */
export function signalList(list) {
  const fresh = list.filter(isFreshSignal).sort((a, b) => (b.score || 0) - (a.score || 0));
  const old = list.filter(c => !isFreshSignal(c)).sort((a, b) => (a.days || 0) - (b.days || 0));
  return `${head('Fresh signals', 'Paper trade these.', fresh.length, 'fresh')}
    <div class="sig-stack">${fresh.length ? fresh.map(signalCard).join('') : `<div class="empty"><div class="ic">${icon('clock', 24)}</div><h3>No fresh signal in the last scan</h3><p>The scanner runs after every close. New setups appear here first.</p></div>`}</div>
    ${old.length ? `${head('Old signals', 'Skip these. The best entry has passed.', old.length, 'old')}<div class="sig-stack">${old.map(signalCard).join('')}</div>` : ''}`;
}
export const scanRule = () => '';
export const scanLogo = () => `<span class="scan-mark" aria-hidden="true">${icon('target', 17)}</span>`;
export function paperSheet(c, done) {
  const s = sheet(`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${mono(c.sym, 'lg')}<div><h3 style="margin:0">Paper trade ${esc(c.sym)}</h3><div class="small">${esc(c.strategy)}. Practice money, nothing is bought.</div></div></div>
    <div class="field"><label for="pp-a">How much to put in (₹)</label><input id="pp-a" inputmode="numeric" value="10000"></div>
    <div class="kv" style="margin:4px 0 14px"><div><div class="k">Shares at ${fmt.px(c.now)}</div><div class="v" id="pp-q">—</div></div><div><div class="k">Most you can lose</div><div class="v dn" id="pp-r">—</div></div><div><div class="k">Stop loss</div><div class="v">${fmt.px(c.stop)}</div></div><div><div class="k">Target</div><div class="v up">${fmt.px(c.target)}</div></div></div>
    <button class="btn block" data-go>${icon('bolt', 18)}Start paper trade</button>
    <p class="tiny" style="margin:10px 0 0;text-align:center">We track it in your portfolio until it reaches the stop or the target.</p>`, { label: 'Paper trade' });
  const a = s.el.querySelector('#pp-a'), qEl = s.el.querySelector('#pp-q'), rEl = s.el.querySelector('#pp-r');
  const calc = () => { const amt = n(a.value), qty = Math.floor(amt / c.now); qEl.textContent = qty > 0 ? fmt.int(qty) : '—'; rEl.textContent = qty > 0 && c.stop < c.now ? fmt.inr(qty * (c.now - c.stop)) : '—'; return qty; };
  a.oninput = calc; calc();
  s.el.querySelector('[data-go]').onclick = () => {
    const qty = calc(); if (!(qty > 0)) { a.focus(); return; }
    paper.add({ sym: c.sym, name: c.name, strategy: c.strategy, qty, entry: c.now, stop: c.stop, target: c.target, signalEntry: c.entry, signalDate: c.entryDate });
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
