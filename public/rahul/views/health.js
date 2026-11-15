/* Portfolio -> Health: one verdict per holding that has no AI call (exit / protect / buy-more zone / hold), the stocks
   marked long term, and every GTT left at the brokers, matched against what is held.
   Server: GET /owner/health, POST /owner/marks, GET /owner/gtt, POST /owner/gtt/place, POST /owner/gtt/cancel. */
import { fmt, esc, icon, tone, mono, ownerApi, ownerSend, toast } from '../core.js';
import { orderSheet, gttSheet, gttCancelSheet } from './trade.js';

export const VERDICT = {
  exit: { t: 'Exit', cls: 'dn', rank: 0, head: 'Exit', sub: 'Trend down on the weekly and monthly charts, and weak. Sell, or keep a tight stop.' },
  protect: { t: 'Protect', cls: 'warn', rank: 1, head: 'Protect', sub: 'Weakening. Keep a stop at the broker so a fall is capped.' },
  buy: { t: 'Buy-more zone', cls: 'up', rank: 2, head: 'Buy-more zone', sub: 'Uptrend on the weekly and monthly charts, and price is back at its 50-day average.' },
  hold: { t: 'Hold', cls: '', rank: 3, head: 'Hold', sub: 'Trends are fine. Nothing to do.' },
  long: { t: 'Long term', cls: 'brand', rank: 4, head: 'Long term', sub: 'Marked by you. Never told to sell; only red flags and buy-more zones show.' },
  fund: { t: 'Fund', cls: '', rank: 5, head: 'Funds and ETFs', sub: 'The stock rules do not apply.' },
  unknown: { t: 'No data', cls: '', rank: 6, head: 'Not enough data', sub: 'Too little price history to judge.' },
};
const GSTATE = { orphan: ['dn', 'Not held'], too_big: ['dn', 'More than held'], stale: ['warn', 'Far from price'], ok: ['up', 'Active'], unknown: ['', 'Unchecked'], buy: ['', 'Buy trigger'] };
const broker = x => Object.keys(x.parts || {}).find(k => k !== 'Manual');

let cache = { k: '', t: 0, d: null };
/** { stocks, marks, test } for these symbols; kept for a minute. */
export async function loadHealth(syms, fresh = false) {
  const k = [...syms].sort().join(',');
  if (!fresh && cache.k === k && Date.now() - cache.t < 60000 && cache.d) return cache.d;
  const d = await ownerApi('/owner/health?symbols=' + encodeURIComponent(k));
  cache = { k, t: Date.now(), d };
  return d;
}
export const loadGtt = (fresh = false) => ownerApi('/owner/gtt' + (fresh ? '?fresh=1' : ''));

/** Which group a holding falls in. AI-call holdings are left to the AI (null). */
export function groupOf(x, H) {
  if (x.status !== 'none') return null;
  const s = String(x.symbol).toUpperCase(), h = (H.stocks || {})[s] || { verdict: 'unknown', flags: [] };
  if ((H.marks || {})[s]?.mark === 'long') return 'long';
  if (h.verdict === 'hold' || h.verdict === 'buy') return (h.flags || []).length ? 'protect' : h.verdict;
  return h.verdict in VERDICT ? h.verdict : 'unknown';
}

export function healthView(rows, H, G) {
  const S = H.stocks || {}, marks = H.marks || {}, cov = (G && G.covered) || {};
  const total = rows.reduce((a, x) => a + x.value, 0) || 1;
  const own = rows.filter(x => x.status === 'none'), ai = rows.filter(x => x.status !== 'none');
  const groups = {};
  own.forEach(x => { const g = groupOf(x, H); (groups[g] = groups[g] || []).push(x); });
  Object.values(groups).forEach(l => l.sort((a, b) => b.value - a.value));
  const order = Object.keys(VERDICT).filter(k => groups[k]?.length);
  const val = l => l.reduce((a, x) => a + x.value, 0);
  const noStop = own.filter(x => !(cov[String(x.symbol).toUpperCase()] || {}).stop);
  const probs = ((G && G.items) || []).filter(g => g.state === 'orphan' || g.state === 'too_big');

  const bar = `<div class="hsum-bar" role="img" aria-label="Where the money sits by verdict">${order.map(k => `<i class="v-${k}" style="flex:${val(groups[k]) / total * 100}"></i>`).join('')}${ai.length ? `<i class="v-ai" style="flex:${val(ai) / total * 100}"></i>` : ''}</div>
    <div class="hsum-leg">${order.map(k => `<a href="#hg-${k}" data-jump><i class="v-${k}"></i><span class="l">${VERDICT[k].t}</span><b class="tnum">${groups[k].length}</b><span class="m tnum">${fmt.lakh(val(groups[k]))}</span>${icon('chev', 14)}</a>`).join('')}${ai.length ? `<a href="/rahul/calls" data-nav><i class="v-ai"></i><span class="l">AI calls</span><b class="tnum">${ai.length}</b><span class="m tnum">${fmt.lakh(val(ai))}</span>${icon('chev', 14)}</a>` : ''}</div>`;

  /* one metric cell in the card's well: label over value */
  const cell = (k, v, cls = '') => `<div class="hx-c"><small>${k}</small><b class="tnum ${cls}">${v}</b></div>`;
  const dir = d => (d === 'up' ? '<span class="up">↑</span>' : d === 'down' ? '<span class="dn">↓</span>' : '<span class="faint">→</span>');
  const row = x => {
    const s = String(x.symbol).toUpperCase(), h = S[s] || {}, g = groupOf(x, H), c = cov[s] || {}, isLong = marks[s]?.mark === 'long', b = broker(x);
    const zone = (g === 'buy' || (isLong && h.verdict === 'buy')) && h.zone;
    const cells = [h.weekly ? cell('Trend', `W ${dir(h.weekly)}&nbsp; M ${dir(h.monthly)}`) : '',
      h.support ? cell('3-mo low', fmt.px(h.support), h.broken ? 'dn' : '') : '',
      zone ? cell('Buy zone', `${fmt.px(zone[0])}–${fmt.px(zone[1])}`, 'up') : h.rs != null ? cell('vs market', fmt.sp(h.rs, 0), tone(h.rs)) : ''].filter(Boolean);
    const flags = (h.flags || []).map(f => `<span class="flag">${icon('bolt', 12)}${esc(f.text)}</span>`).join('');
    const prot = c.stop ? `<span class="hx-p ok">${icon('check', 13)}Stop at broker</span>` : `<span class="hx-p no"><i></i>No stop</span>`;
    const acts = [b && !c.stop && g !== 'fund' && g !== 'unknown' ? `<button class="btn sm ${g === 'exit' || g === 'protect' ? 'ghost' : 'quiet'}" data-h-gtt="${esc(x.symbol)}">Set GTT</button>` : '',
      g === 'exit' && b ? `<button class="btn sm sell" data-h-sell="${esc(x.symbol)}">Sell</button>` : '',
      zone ? `<button class="btn sm" data-h-buy="${esc(x.symbol)}">Buy more</button>` : ''].join('');
    const why = !isLong && g === 'protect' && (h.verdict === 'hold' || h.verdict === 'buy') ? 'Trends are fine, but there is a red flag. Keep a stop until it clears.' : isLong && h.why ? (h.verdict === 'buy' ? h.why : (h.flags || []).length ? 'Red flag on a long-term holding.' : 'Long-term holding. ' + (h.weekly === 'down' ? 'Weekly trend is down.' : 'Trend is fine.')) : h.why || '';
    return `<article class="hx v-${g}">
      <a href="/rahul/stock/${encodeURIComponent(x.symbol)}" data-nav class="hx-top">${mono(x.symbol)}
        <span class="hx-id"><b>${esc(x.symbol)}</b><small>${fmt.x(x.value / total * 100, 1)}% of portfolio${h.thin ? ' · thin trading' : ''}</small></span>
        <span class="hx-v"><b class="tnum">${fmt.inr(x.value)}</b><small class="tnum ${tone(x.pnl)}">${fmt.sp(x.pnl_pct)}</small></span></a>
      ${why ? `<p class="hx-why">${esc(why)}</p>` : ''}
      ${flags ? `<div class="hl-flags">${flags}</div>` : ''}
      ${cells.length ? `<div class="hx-well c${cells.length}">${cells.join('')}</div>` : ''}
      <div class="hx-foot">${g === 'fund' || g === 'unknown' ? '<span></span>' : prot}
        <span class="hx-acts"><button class="star${isLong ? ' on' : ''}" data-h-long="${esc(s)}" aria-pressed="${isLong}" aria-label="${isLong ? 'Remove long-term mark' : 'Mark as long term'}">${isLong ? '★' : '☆'}</button>${acts}</span></div></article>`;
  };

  const T = H.test || {}, P = T.periods || [];
  const tr = k => `<tr><td>${VERDICT[k].t}</td>${P.map((_, i) => `<td class="tnum">${fmt.sp(T[k].rel6m[i])}</td><td class="tnum">${fmt.x(T[k].fall20[i], 0)}%</td>`).join('')}</tr>`;
  const proof = T.exit ? `<details class="rv-fold hl-proof"><summary>How sure is this?</summary><div class="panel pad small">
      <p style="margin-top:0">The rules were tested blind on 8 years of NSE prices: every liquid stock, every month, judged with past prices only, then checked 3 and 6 months later.</p>
      <table class="ht"><thead><tr><th></th>${P.map(p => `<th colspan="2">${esc(p)}</th>`).join('')}</tr><tr><th></th>${P.map(() => '<th>6m vs market</th><th>fell 20%+</th>').join('')}</tr></thead>
      <tbody>${['exit', 'protect', 'hold', 'buy'].map(tr).join('')}</tbody></table>
      <p class="tiny" style="margin-top:-4px">"Fell 20%+" is the share that dropped 20% or more at some point in the next 3 months.</p><p>Exit stocks did worse than Hold stocks in both periods and fell hard more often, but the gap is modest: an Exit is a weak stock, not a certain loser. Buy-more zones fell hard less often; their returns were about the same as Hold. Red flags and the long-term mark are not part of the test. ${esc(T.note || '')}</p></div></details>` : '';

  return `${probs.length ? `<div class="gp-alert" role="alert">${icon('bolt', 18)}<span><b>${probs.length} GTT ${probs.length === 1 ? 'order' : 'orders'} could sell shares you do not hold</b><small>${probs.map(g => esc(g.symbol + ' at ' + g.broker)).join(', ')}. If you buy the stock again later, the old trigger sells it. Cancel below.</small></span></div>` : ''}
    <section class="panel hsum"><div class="hsum-h"><div><small class="hsum-k">Without an AI call</small><b class="hsum-n">${own.length} <span>holdings</span></b><span class="hsum-m tnum">${fmt.lakh(val(own))} · ${fmt.x(val(own) / total * 100, 0)}% of portfolio</span></div>
      ${noStop.length ? `<span class="hsum-warn"><b class="tnum">${noStop.length}</b><small>no stop</small></span>` : `<span class="hsum-warn ok">${icon('check', 16)}<small>all stopped</small></span>`}</div>${bar}</section>
    ${order.map(k => `<section class="sec hg" id="hg-${k}"><div class="sec-h"><h2>${VERDICT[k].head} <span class="td-n${k === 'exit' ? ' dn' : ''}">${groups[k].length}</span></h2><span class="small tnum">${fmt.lakh(val(groups[k]))}</span></div><p class="sec-p">${VERDICT[k].sub}</p>
      ${k === 'hold' || k === 'fund' || k === 'unknown' ? `<details class="rv-fold"><summary>Show ${groups[k].length}</summary><div class="group hl-list">${groups[k].map(row).join('')}</div></details>` : `<div class="group hl-list">${groups[k].map(row).join('')}</div>`}</section>`).join('')}
    ${gttSection(G)}
    ${proof}
    <p class="small" style="margin:14px 2px 0">☆ marks a stock long term. Verdicts use the last daily close${Object.values(S)[0]?.as_of ? ` (${fmt.date(Object.values(S)[0].as_of)})` : ''}. Weekly = price against its 30-week average, monthly = against its 10-month average. This is a starting point for your decision, not advice.</p>`;
}

export function gttSection(G) {
  const items = (G && G.items) || [], st = (G && G.status) || {};
  const rank = { orphan: 0, too_big: 1, stale: 2, unknown: 3, ok: 4, buy: 5 };
  const sorted = [...items].sort((a, b) => rank[a.state] - rank[b.state] || a.symbol.localeCompare(b.symbol));
  const line = g => { const [cls, lab] = GSTATE[g.state] || ['', g.state];
    return `<div class="row gt st-${g.state}"><div class="main"><div class="t">${esc(g.symbol)} <span class="pill ${cls}">${lab}</span></div>
      <div class="s tnum">${esc(g.broker)} · ${g.kinds.length ? g.kinds.join(' + ') : esc(g.type)} ${g.triggers.map(t => fmt.px2(t)).join(' / ')} · sells ${fmt.x(g.qty, 0)}${g.state === 'too_big' || g.state === 'orphan' ? ` · you hold ${fmt.x(g.held, 0)}` : ''}</div></div>
      <button class="btn sm ${g.state === 'orphan' || g.state === 'too_big' ? 'sell' : 'quiet'}" data-g-cancel="${esc(g.broker)}|${esc(g.id)}">Cancel</button></div>`; };
  const brokers = Object.entries(st).map(([k, v]) => `${k}: ${v.ok ? esc(v.message) : `<span class="dn">${esc(v.message)}</span>`}`).join(' · ');
  const when = Object.values(st).map(v => v.as_of).sort().pop();
  return `<section class="sec" id="hg-gtt"><div class="sec-h"><h2>Protection <span class="td-n">${items.length}</span></h2><button class="more" data-g-refresh>Check brokers</button></div>
    <p class="sec-p">Every GTT (sell trigger) waiting at your brokers, matched against what you hold there.${when ? ` Checked ${esc(when.slice(5, 16))}.` : ' Not checked yet.'}</p>
    ${sorted.length ? `<div class="group">${sorted.map(line).join('')}</div>` : `<div class="group cr-empty">No GTT found${when ? '' : ' yet. Tap Check brokers'}.</div>`}
    ${brokers ? `<p class="small" style="margin:8px 2px 0">${brokers}</p>` : ''}</section>`;
}

/** Wire the buttons. ctx = { rows, H, G, reload(freshGtt) } */
export function bindHealth(root, ctx) {
  const find = s => ctx.rows.find(y => String(y.symbol).toUpperCase() === String(s).toUpperCase());
  root.querySelectorAll('[data-jump]').forEach(a => a.onclick = e => { e.preventDefault(); root.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  root.querySelectorAll('[data-h-long]').forEach(b => b.onclick = async () => {
    const s = b.dataset.hLong, on = b.getAttribute('aria-pressed') !== 'true';
    b.disabled = true;
    try { await ownerSend('POST', '/owner/marks', { symbol: s, mark: on ? 'long' : '' }); ctx.H.marks = ctx.H.marks || {}; if (on) ctx.H.marks[s] = { mark: 'long' }; else delete ctx.H.marks[s]; toast(on ? `${s} marked long term` : `${s} no longer long term`); ctx.reload(false); }
    catch (e) { toast(e.message); b.disabled = false; }
  });
  root.querySelectorAll('[data-h-sell]').forEach(b => b.onclick = () => { const x = find(b.dataset.hSell); orderSheet({ sym: x.symbol, side: 'SELL', broker: broker(x), call: null, onDone: ok => ok && ctx.reload(true) }); });
  root.querySelectorAll('[data-h-buy]').forEach(b => b.onclick = () => { const x = find(b.dataset.hBuy); orderSheet({ sym: x.symbol, side: 'BUY', broker: broker(x), call: null, onDone: ok => ok && ctx.reload(true) }); });
  root.querySelectorAll('[data-h-gtt]').forEach(b => b.onclick = () => {
    const x = find(b.dataset.hGtt), h = (ctx.H.stocks || {})[String(x.symbol).toUpperCase()] || {}, br = broker(x);
    gttSheet({ sym: x.symbol, broker: br, qty: (x.parts?.[br]?.qty) || x.qty, ltp: x.ltp, stop: h.stop, target: h.target, why: h.why, onDone: ok => ok && ctx.reload(true) });
  });
  root.querySelectorAll('[data-g-cancel]').forEach(b => b.onclick = () => {
    const [br, id] = b.dataset.gCancel.split('|'), g = ((ctx.G && ctx.G.items) || []).find(y => y.broker === br && String(y.id) === id);
    if (g) gttCancelSheet({ g, onDone: ok => ok && ctx.reload(true) });
  });
  root.querySelector('[data-g-refresh]')?.addEventListener('click', e => { e.currentTarget.textContent = 'Checking…'; ctx.reload(true); });
}
