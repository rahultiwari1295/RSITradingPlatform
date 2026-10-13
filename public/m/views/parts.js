/* Building blocks shared by several screens. */
import { fmt, esc, mono, link, icon, delta, tone, scoreTone, n, q, CFG } from '../core.js';
import { ruler, spark } from '../charts.js';

export function callCard(c, { compact = false } = {}) {
  const fresh = c.days === 0;
  const pill = c.action.includes('EXIT') || c.action.includes('SELL') ? '<span class="pill dn">Sell</span>' : fresh ? '<span class="pill ai">New buy</span>' : `<span class="pill">Day ${fmt.int(c.days)}</span>`;
  return link(`calls/${encodeURIComponent(c.sym)}`, `
    <div class="top">${mono(c.sym)}<div class="nm"><div class="t">${esc(c.sym)}</div><div class="s">${esc(c.strategy)}</div></div>
      <div class="px"><div class="v tnum">${fmt.px(c.now)}</div>${fresh && Math.abs(c.roi) < .05 ? '<span class="small">at entry</span>' : delta(c.roi)}</div></div>
    ${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now })}
    ${!compact && c.why ? `<p class="why">${esc(c.why)}</p>` : ''}
    <div class="foot">${pill}<span>${fresh ? 'Called today' : 'Since ' + fmt.date(c.entryDate)}</span><span class="tnum">${isFinite(c.target / c.entry) ? 'Target ' + fmt.sp((c.target / c.entry - 1) * 100, 0) : ''}</span></div>`, 'callcard', `aria-label="${esc(c.sym)} AI call, ${fmt.px(c.now)}"`);
}

export function closedRow(c) {
  return link(`calls/closed/${encodeURIComponent(c.id)}`, `${mono(c.sym)}
    <div class="main"><div class="t">${esc(c.sym)}</div><div class="s">${esc(c.reason)}, ${fmt.days(c.days)}</div></div>
    <div class="end"><div class="v ${tone(c.roi)} tnum">${fmt.sp(c.roi)}</div><div class="d faint">${fmt.date(c.exitDate)}</div></div>`, 'row');
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
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><span class="pill" style="background:color-mix(in srgb, ${st.c} 14%, transparent);color:${st.c === 'var(--ink-3)' ? 'var(--ink-2)' : st.c}"><i class="stage-ic" style="background:${st.c}"></i>${st.t}</span><span class="pill">${tfWord(p.tf)}</span>${p.grade ? `<span class="pill">Grade ${esc(p.grade)}</span>` : ''}${isFinite(p.xray) ? `<span class="pill ${scoreTone(p.xray).k}">X-Ray ${fmt.int(p.xray)}</span>` : ''}</div>
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

/** Fill mini price lines for pattern cards: one batched request per screen through the chart endpoint. */
export async function sparks(root, api) {
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
