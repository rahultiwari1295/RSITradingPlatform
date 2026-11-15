import { icon, esc, link, fmt, intel, mono } from '../app.js';
import { alertPrefs, seenAt } from '../feel.js';
import { NEWS } from '../sample.js';
import { stories, byTone, dealDigest } from './newsbrief.js';

/* News: the intelligence feed. Brief (07:00 / 17:00), every filing scored, bulk/block deals, insider trades,
   the results calendar and world markets. Live from /api/intel2; labelled sample rows only if that is unreachable. */
const rel = iso => { if (!iso) return ''; const t = new Date(String(iso).replace(' ', 'T')); const m = Math.round((Date.now() - t) / 6e4); return isNaN(m) ? '' : m < 1 ? 'now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : fmt.date(iso); };
const imp = v => `<span class="imp ${v >= 70 ? 'hi' : v >= 45 ? 'md' : 'lo'}" style="--p:${v}" title="Impact ${v} of 100"><b>${v}</b></span>`;
const ahead = d => { const t = new Date(d + 'T00:00:00'), n = new Date(); n.setHours(0, 0, 0, 0); const k = Math.round((t - n) / 864e5); return k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : t.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); };
/* dot: green = good news, red = bad news, blue = mixed or unclear */
export const DOT = { positive: 'pos', negative: 'neg' };
const SENT = { positive: 'good', negative: 'weak', neutral: 'info' };

/* one event card: company, type, impact dial, two lines, key numbers, source */
export function evCard(e, { showSym = true } = {}) {
  const nums = (e.ai && e.ai.key_numbers) || [];
  const n = e.numbers || {};
  const facts = nums.length ? nums.map(k => `<span><small>${esc(k.label)}</small><b>${esc(k.value)}</b></span>`).join('')
    : [n.value_cr != null ? `<span><small>Value</small><b>₹${(+n.value_cr).toFixed(2)} cr</b></span>` : '', n.qty_fmt ? `<span><small>Shares</small><b>${esc(n.qty_fmt)}</b></span>` : '',
      n.price ? `<span><small>Price</small><b>${fmt.inr(n.price)}</b></span>` : '', n.meeting_date ? `<span><small>Meeting</small><b>${esc(n.meeting_date)}</b></span>` : ''].join('');
  const lines = String(e.summary || e.headline || '').split('\n').filter(Boolean);
  return `<article class="ev" data-ev="${esc(e.id)}">
    <div class="ev-h">${showSym && e.symbol ? `${mono(e.symbol)}<span class="ev-s"><b>${esc(e.symbol)}</b><small>${esc(e.company || '')}</small></span>` : `<span class="ev-s"><b>${esc(e.company || e.source || '')}</b><small>${esc(e.source || '')}</small></span>`}${imp(e.impact || 0)}</div>
    <div class="ev-t"><i class="dot ${DOT[e.sentiment] || ''}" title="${esc(e.sentiment || 'unclear')}"></i><span class="st ${SENT[e.sentiment] || 'info'}">${esc(e.label || String(e.type || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()))}</span><span class="tiny">${esc(e.source || '')} · ${rel(e.ts)}</span>${e.ai_status === 'done' ? '<span class="ai-b">AI read</span>' : ''}</div>
    <p class="ev-l1">${esc(lines[0] || '')}</p>${lines[1] ? `<p class="ev-l2">${esc(lines[1])}</p>` : ''}
    ${facts ? `<div class="ev-n">${facts}</div>` : ''}
    ${e.ai && e.ai.what_changed && !/nothing new/i.test(e.ai.what_changed) ? `<p class="ev-w">${icon('swap', 14)}<span>${esc(e.ai.what_changed)}</span></p>` : ''}
    ${e.url ? `<a class="ev-src" href="${esc(e.url)}" target="_blank" rel="noopener">${icon('doc', 14)}Source</a>` : ''}
  </article>`;
}


/* ---------------------------------------------------------------- shared bits */
const evT = e => new Date(String(e.ts || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(e.ts)) ? '' : '+05:30')).getTime() || 0;
const tone = s => (s === 'positive' ? 'pos' : s === 'negative' ? 'neg' : '');
const isToday = d => String(d || '').slice(0, 10) === new Date().toLocaleDateString('en-CA');
/* the ticker: India first, then the world. Every price on the page lives here and only here. */
const ORDER = ['Nifty 50', 'Sensex', 'Bank Nifty', 'Nifty Midcap', 'Nifty Smallcap', 'India VIX', 'USD / INR', 'S&P 500', 'Nasdaq', 'Dow Jones', 'Nikkei 225', 'Hang Seng', 'Shanghai', 'DAX', 'FTSE 100', 'Brent crude', 'Gold', 'Silver', 'Copper', 'US 10-year yield', 'Dollar index', 'Bitcoin'];
const SHORT = { 'Nifty Midcap': 'Midcap', 'Nifty Smallcap': 'Smallcap', 'Brent crude': 'Brent', 'US 10-year yield': 'US 10Y', 'Dollar index': 'Dollar', 'Nikkei 225': 'Nikkei' };
function ticker(m) {
  const mk = (m.items || []).filter(x => x.chg_pct != null).sort((a, b) => (ORDER.indexOf(a.name) + 1 || 99) - (ORDER.indexOf(b.name) + 1 || 99));
  const flows = (m.flows || []).slice(0, 2);
  if (!mk.length && !flows.length) return '';
  const card = x => `<div class="tk-c"><small>${esc(SHORT[x.name] || x.name)}</small><b class="tnum">${fmt.num(x.last, x.last > 1000 ? 0 : 2)}</b><em class="tnum ${fmt.tone(x.chg_pct)}">${fmt.pct(x.chg_pct, 2)}</em></div>`;
  const flow = f => `<div class="tk-c fl"><small>${esc(f.who)} · ${fmt.date(f.day)}</small><b class="tnum ${fmt.tone(f.net_cr)}">${f.net_cr < 0 ? '−' : '+'}${fmt.cr(Math.abs(f.net_cr))}</b><em>${f.net_cr < 0 ? 'net sold' : 'net bought'}</em></div>`;
  return `<div class="tk-row" aria-label="Markets">${mk.slice(0, 3).map(card).join('')}${flows.map(flow).join('')}${mk.slice(3).map(card).join('')}</div>`;
}
/* one story card: impact, company, what happened, why it matters */
const story = (x, W) => {
  const w0 = String(x.why || '').replace(/^[^:]{2,70}:\s*/, ''), tl = x.title.toLowerCase().replace(/^[^:]{2,70}:\s*/, '').slice(0, 30);
  const why = w0 && !w0.toLowerCase().includes(tl) && !/has submitted to the exchange|has informed the exchange/i.test(w0) ? w0 : '';
  const meta = [x.n > 1 ? `${x.n} reports` : '', x.sources.slice(0, 2).join(', '), x.ts ? rel(x.ts) : ''].filter(Boolean).join(' · ');
  const t = tone(x.sentiment), mine = x.symbol && W.has(x.symbol);
  const inner = `<div class="sc-h">${x.symbol ? `${mono(x.symbol)}<span class="sc-s"><b>${esc(x.symbol)}</b>${mine ? '<i>On your list</i>' : ''}</span>` : `<span class="sc-s"><b>${esc(x.category === 'macro' ? 'India policy' : x.category === 'global' ? 'World' : (x.sources[0] || 'News'))}</b></span>`}
      <span class="sc-i ${t}" title="Impact ${x.impact || 0} of 100"><b>${x.impact || 0}</b><small>impact</small></span></div>
    <p class="sc-t">${esc(x.title)}</p>${why ? `<p class="sc-w">${esc(why)}</p>` : ''}<small class="sc-m">${t ? `<span class="sc-tone ${t}">${t === 'pos' ? 'Good' : 'Bad'}</span>` : ''}${esc(meta)}</small>`;
  return x.symbol ? link(`xray/${encodeURIComponent(x.symbol)}?tab=filings`, inner, `sc ${t}${mine ? ' mine' : ''}`) : `<a class="sc ${t}" href="${esc(x.url || '#')}" ${x.url ? 'target="_blank" rel="noopener"' : ''}>${inner}</a>`;
};
const cleanName = s => esc(String(s).replace(/\b(PRIVATE|PVT|LIMITED|LTD|LLP)\b\.?/gi, '').replace(/\s+/g, ' ').trim());
/* one deal card per stock: who really bought or sold, after same-day round trips cancel out */
const dealCard = g => {
  const net = g.buy_cr - g.sell_cr, real = g.buy_cr + g.sell_cr > 0;
  const v = !real ? ['', 'Round trips'] : g.buy_cr > 0 && g.sell_cr > 0 && Math.abs(net) / (g.buy_cr + g.sell_cr) < 0.2 ? ['', 'Changed hands'] : net > 0 ? ['pos', 'Net buying'] : ['neg', 'Net selling'];
  const top = (g.buyers[0] && net >= 0 ? g.buyers[0] : g.sellers[0]) || g.buyers[0];
  return link(`xray/${encodeURIComponent(g.symbol)}`, `<div class="dc-h">${mono(g.symbol)}<b>${esc(g.symbol)}</b><span class="pl ${v[0]}">${v[1]}</span></div>
    <div class="dc-v"><b class="tnum ${v[0]}">${real ? (net < 0 ? '−' : '+') + fmt.cr(Math.abs(net)) : fmt.cr(g.gross_cr)}</b><small>${real ? 'net' : 'traded'} · ${g.deals} ${g.deals === 1 ? 'deal' : 'deals'} · ${fmt.date(g.last)}</small></div>
    ${top ? `<p class="dc-w">${top.net > 0 ? 'Bought' : 'Sold'} by ${cleanName(top.name)}${(g.buyers.length + g.sellers.length) > 1 ? ` +${g.buyers.length + g.sellers.length - 1}` : ''}</p>` : '<p class="dc-w">Same parties bought and sold on the day.</p>'}`, `dc ${v[0]}`);
};
/* calendar: one entry per company per day, all purposes merged */
function calDays(L) {
  const by = new Map();
  for (const c of L) {
    const k = c.meeting_date + '|' + c.symbol;
    const e = by.get(k) || by.set(k, { symbol: c.symbol, day: c.meeting_date, res: false, what: [] }).get(k);
    e.res = e.res || !!c.is_results;
    const p = String(c.purpose || '').trim();
    if (p && !/^board meeting intimation$|^other business matters$/i.test(p) && !e.what.includes(p)) e.what.push(p);
  }
  const days = new Map();
  for (const e of by.values()) (days.get(e.day) || days.set(e.day, []).get(e.day)).push(e);
  for (const l of days.values()) l.sort((a, b) => b.res - a.res || a.symbol.localeCompare(b.symbol));
  return [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
const calWhat = e => e.res ? 'Quarterly results' : e.what.length ? e.what.join(' · ').slice(0, 60) : 'Board meeting';
const sec = (title, body, more = '') => `<section class="nw-sec"><div class="nw-sh"><h2>${title}</h2>${more}</div>${body}</section>`;

/* ---------------------------------------------------------------- Today */
async function getHome() { try { const h = await intel.home(); if (h && h.mood) return h; } catch { /* not on the server yet */ } return { mood: { label: 'Waiting', tone: '', line: '' }, top: [], sections: [] }; }
async function todayView(st) {
  const [H, m, br, dl, cal] = await Promise.all([getHome(), intel.markets().catch(() => ({})), intel.brief('auto').catch(() => ({})), intel.deals(3).catch(() => ({ items: [] })), intel.calendar(4).catch(() => ({ items: [] }))]);
  const W = new Set(alertPrefs().watch), s0 = seenAt();
  const raw = (H.top || []).concat(...(H.sections || []).map(s => s.items || []), br.top || [], br.red_flags || [], br.world || []);
  const S = stories(raw), T = byTone(S);
  const fresh = S.filter(x => evT(x) > s0).length, mine = S.filter(x => x.symbol && W.has(x.symbol));
  const D = dealDigest(dl.items || []).filter(g => g.buy_cr + g.sell_cr > 0);
  const CD = calDays(cal.items || []).map(([d, l]) => [d, l.filter(e => e.res)]).filter(([, l]) => l.length).slice(0, 3);
  const pick = { all: S, good: T.good, bad: T.bad }[st.f] || S, cap = st.more ? 60 : 6;
  const chip = (v, l, n) => `<button class="nw-chip ${v}" data-f="${v}" aria-pressed="${st.f === v}">${l}<span>${n}</span></button>`;
  const brief = br.made_at && isToday(br.day) ? `<p class="md-b">${icon('clock', 14)}<span>${br.kind === 'evening' ? 'Evening' : 'Morning'} brief at ${esc(String(br.made_at).slice(11, 16))} · ${fmt.int((br.stats || {}).n)} items scanned${(br.stats || {}).hi ? `, ${br.stats.hi} high-impact` : ''}</span></p>` : '';
  return `${ticker(m)}
    <div class="md ${H.mood.tone || ''}"><div class="md-k"><i class="md-dot"></i>Market mood${H.as_of ? ' · ' + rel(H.as_of) : ''}</div><b class="md-l">${esc(H.mood.label)}</b>
      <div class="md-n"><span class="pos"><b>${T.good.length}</b> good</span><span class="neg"><b>${T.bad.length}</b> bad</span><span><b>${T.other.length}</b> other</span>${fresh ? `<span class="nw-new"><b>${fresh}</b> new for you</span>` : ''}</div>${brief}</div>
    ${mine.length ? sec(`Your stocks <span class="nw-n">${mine.length}</span>`, `<div class="sc-l">${mine.map(x => story(x, W)).join('')}</div>`) : ''}
    ${sec('Top stories', `<div class="nw-chips" id="nwf">${chip('all', 'All', S.length)}${chip('good', 'Good', T.good.length)}${chip('bad', 'Bad', T.bad.length)}</div>
      ${pick.length ? `<div class="sc-l">${pick.slice(0, cap).map(x => story(x, W)).join('')}</div>${pick.length > cap ? `<button class="nw-more" id="nwm">Show ${pick.length - cap} more</button>` : ''}` : `<p class="nw-empty">No ${st.f === 'good' ? 'clearly good' : st.f === 'bad' ? 'clearly bad' : ''} news yet today.</p>`}`)}
    ${D.length ? sec('Big money', `<div class="dc-row">${D.slice(0, 10).map(dealCard).join('')}</div>`, '<button class="nw-link" data-go="flow">All deals</button>') : ''}
    ${CD.length ? sec('Results coming up', CD.map(([d, l]) => `<div class="cu"><small>${ahead(d)}</small><div class="cu-l">${l.slice(0, 12).map(e => link(`xray/${encodeURIComponent(e.symbol)}`, esc(e.symbol), `cu-c${W.has(e.symbol) ? ' mine' : ''}`)).join('')}${l.length > 12 ? `<span class="cu-c more">+${l.length - 12}</span>` : ''}</div></div>`).join(''), '<button class="nw-link" data-go="cal">Calendar</button>') : ''}
    <p class="disc">Facts from exchange filings and news, scored 0 to 100 for impact. Repeated reports of one story are merged. Not investment advice.</p>`;
}

/* ---------------------------------------------------------------- Filings & deals */
async function flowView(st) {
  const [ins, dl] = await Promise.all([intel.insiders(30).catch(() => ({ items: [] })), st.k === 'deals' ? intel.deals(7).catch(() => ({ items: [] })) : null]);
  const hasIns = (ins.items || []).length > 0;
  if (st.k === 'insiders' && !hasIns) st.k = 'filings';
  const seg = `<div class="nw-chips" id="nwk">${[['filings', 'Filings'], ['deals', 'Big deals'], ...(hasIns ? [['insiders', 'Insiders']] : [])].map(([v, l]) => `<button class="nw-chip" data-k="${v}" aria-pressed="${st.k === v}">${l}</button>`).join('')}</div>`;
  if (st.k === 'deals') {
    const G = dealDigest((dl || {}).items || []), real = G.filter(g => g.buy_cr + g.sell_cr > 0), churn = G.length - real.length;
    return `${seg}<p class="nw-note">Large deals in the last 7 days, one card per stock. A party that buys and sells the same shares on the same day cancels out${churn ? `; ${churn} ${churn === 1 ? 'stock' : 'stocks'} with only round trips are left out` : ''}.</p>
      ${real.length ? `<div class="dc-grid">${real.map(dealCard).join('')}</div>` : '<p class="nw-empty">No large deals in the last 7 days.</p>'}`;
  }
  if (st.k === 'insiders') {
    return `${seg}<div class="sc-l">${ins.items.map(i => link(`xray/${encodeURIComponent(i.symbol)}?tab=filings`, `<div class="sc-h">${mono(i.symbol)}<span class="sc-s"><b>${esc(i.symbol)}</b><i>${esc(i.category || 'Insider')}</i></span><span class="pl ${i.side === 'Buy' ? 'pos' : 'neg'}">${i.side === 'Buy' ? 'Bought' : 'Sold'}</span></div>
      <p class="sc-t">${esc(i.person || '')} · ₹${(+i.value_cr || 0).toFixed(2)} cr</p><small class="sc-m">${i.pct_after != null ? `holds ${(+i.pct_after).toFixed(2)}% after · ` : ''}filed ${fmt.date(i.known_at)}</small>`, `sc ${i.side === 'Buy' ? 'pos' : 'neg'}`)).join('')}</div>`;
  }
  const d = await intel.events({ days: 7, min_impact: st.min, category: 'filing,insider,meeting', q: st.q, limit: 40 }), W = new Set(alertPrefs().watch);
  return `${seg}<div class="nw-tools"><label class="nw-q">${icon('search', 16)}<input id="fq" placeholder="Search a stock or word" value="${esc(st.q)}"></label>
      <div class="nw-chips sm" id="nwi">${[[0, 'Any impact'], [45, '45+'], [70, '70+']].map(([v, l]) => `<button class="nw-chip" data-min="${v}" aria-pressed="${st.min === v}">${l}</button>`).join('')}</div></div>
    <div class="sc-l">${stories(d.items || []).map(x => story(x, W)).join('') || '<p class="nw-empty">Nothing for this search.</p>'}${d.next ? `<button class="nw-more" id="more" data-before="${esc(d.next)}">Load more</button>` : ''}</div>`;
}

/* ---------------------------------------------------------------- Calendar */
async function calView() {
  const d = await intel.calendar(21); const days = calDays(d.items || []);
  if (!days.length) return '<p class="nw-empty">No board meetings announced for the next 3 weeks yet.</p>';
  const W = new Set(alertPrefs().watch);
  return days.map(([dd, l]) => `<section class="cal-d"><div class="cal-h"><b>${ahead(dd)}</b><span>${(k => k ? `${k} ${k === 1 ? 'result' : 'results'} · ` : '')(l.filter(e => e.res).length)}${l.length} ${l.length === 1 ? 'company' : 'companies'}</span></div>
    <div class="cal-l">${l.map(e => link(`xray/${encodeURIComponent(e.symbol)}`, `${mono(e.symbol)}<span class="cal-t"><b>${esc(e.symbol)}</b><small>${esc(calWhat(e))}</small></span>${e.res ? '<span class="pl brand">Results</span>' : ''}`, `cal-r${W.has(e.symbol) ? ' mine' : ''}`)).join('')}</div></section>`).join('');
}

/* ---------------------------------------------------------------- page */
const TABS = [['today', 'Today'], ['flow', 'Filings & deals'], ['cal', 'Calendar']];
const OLD = { brief: 'today', world: 'today', filings: 'flow', deals: 'flow', insiders: 'flow', calendar: 'cal' };
export default async function news(el, r) {
  const q0 = r.q.get('t'); let tab = TABS.some(t => t[0] === q0) ? q0 : OLD[q0] || 'today';
  const st = { f: 'all', more: false, k: q0 === 'deals' ? 'deals' : q0 === 'insiders' ? 'insiders' : 'filings', min: 0, q: '' };
  el.innerHTML = `<header class="nw-hd"><div class="nw-top"><div><small class="nw-date">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>News</h1></div><span class="nw-live" id="src">Live</span></div>
    <div class="nw-seg" id="nt" role="tablist">${TABS.map(([v, l]) => `<button role="tab" data-v="${v}">${l}</button>`).join('')}<i class="nw-ind"></i></div></header>
  <div id="nb" class="nw-b"></div>`;
  const nb = el.querySelector('#nb'), nt = el.querySelector('#nt'), src = el.querySelector('#src'), hd = el.querySelector('.nw-hd');
  const live = ok => { src.textContent = ok ? 'Live' : 'Sample'; src.classList.toggle('off', !ok); };
  const sk = n => '<div class="sk" style="height:96px;margin-bottom:10px;border-radius:20px"></div>'.repeat(n);
  const setH = () => el.style.setProperty('--nw-hd', hd.offsetHeight + 'px');
  let token = 0;
  async function paint(keep) {
    const my = ++token;
    const i = TABS.findIndex(t => t[0] === tab);
    nt.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === tab));
    nt.style.setProperty('--i', i);
    { const u = new URLSearchParams(location.search); if (tab === 'today') u.delete('t'); else u.set('t', tab); const qs = u.toString(); history.replaceState(history.state, '', '/app/news' + (qs ? '?' + qs : '')); }
    if (!keep) { nb.innerHTML = sk(4); window.scrollTo({ top: 0 }); }
    try {
      const html = await VIEW[tab](st);
      if (my === token && nb.isConnected) { nb.innerHTML = html; live(true); wire(); setH(); }
    } catch {
      if (my !== token || !nb.isConnected) return;
      live(false);
      nb.innerHTML = (FALLBACK[tab] || (() => `<div class="info-b">${icon('info', 16)}<span>This needs the server, which is not reachable right now.</span></div>`))();
    }
  }
  function wire() {
    nb.onclick = e => {
      const f = e.target.closest('[data-f]'); if (f) { st.f = f.dataset.f; st.more = false; return paint(true); }
      if (e.target.closest('#nwm')) { st.more = true; return paint(true); }
      const k = e.target.closest('[data-k]'); if (k) { st.k = k.dataset.k; return paint(true); }
      const m = e.target.closest('[data-min]'); if (m) { st.min = +m.dataset.min; return paint(true); }
      const g = e.target.closest('[data-go]'); if (g) { tab = g.dataset.go; if (tab === 'flow') st.k = 'deals'; return paint(); }
      const more = e.target.closest('#more');
      if (more) { more.disabled = true; intel.events({ days: 30, min_impact: st.min, category: 'filing,insider,meeting', q: st.q, before: more.dataset.before, limit: 40 }).then(d => { const W = new Set(alertPrefs().watch); more.insertAdjacentHTML('beforebegin', stories(d.items || []).map(x => story(x, W)).join('')); if (d.next) { more.dataset.before = d.next; more.disabled = false; } else more.remove(); }); }
    };
    const s = nb.querySelector('#fq'); if (s) { let t = 0; s.oninput = () => { clearTimeout(t); t = setTimeout(() => { st.q = s.value.trim(); paint(true).then(() => { const n2 = nb.querySelector('#fq'); if (n2) { n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); } }); }, 350); }; }
  }
  const VIEW = { today: todayView, flow: flowView, cal: calView };
  /* labelled samples, only when the server is unreachable */
  const sampleNews = L => `<div class="sc-l">${L.map(x => `<article class="sc"><div class="sc-h"><span class="sc-s"><b>${esc(x.tag)}</b></span></div><p class="sc-t">${esc(x.t)}</p><small class="sc-m">${esc(x.src)} · ${rel(x.at)}</small></article>`).join('')}</div>`;
  const FALLBACK = { today: () => `<div class="info-b">${icon('info', 16)}<span>The server is not reachable, so this is sample news.</span></div>${sampleNews(NEWS.india)}`, flow: () => sampleNews(NEWS.india) };
  nt.onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.v !== tab) { tab = b.dataset.v; paint(); } };
  setH(); paint();
}
