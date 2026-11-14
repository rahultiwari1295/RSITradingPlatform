import { icon, esc, link, fmt, go, intel, mono } from '../app.js';
import { alertPrefs, seenAt } from '../feel.js';
import { NEWS } from '../sample.js';
import { stories, byTone, dealDigest } from './newsbrief.js';

/* News: the intelligence feed. Brief (07:00 / 17:00), every filing scored, bulk/block deals, insider trades,
   the results calendar and world markets. Live from /api/intel2; labelled sample rows only if that is unreachable. */
const TABS = [['today', 'Today'], ['brief', 'Brief'], ['filings', 'Filings'], ['deals', 'Deals'], ['insiders', 'Insiders'], ['calendar', 'Calendar'], ['world', 'World']];
const rel = iso => { if (!iso) return ''; const t = new Date(String(iso).replace(' ', 'T')); const m = Math.round((Date.now() - t) / 6e4); return isNaN(m) ? '' : m < 1 ? 'now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : fmt.date(iso); };
const qty = v => v >= 1e7 ? (v / 1e7).toFixed(2) + ' cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + ' L' : fmt.int(v);
const imp = v => `<span class="imp ${v >= 70 ? 'hi' : v >= 45 ? 'md' : 'lo'}" style="--p:${v}" title="Impact ${v} of 100"><b>${v}</b></span>`;
const ahead = d => { const t = new Date(d + 'T00:00:00'), n = new Date(); n.setHours(0, 0, 0, 0); const k = Math.round((t - n) / 864e5); return k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : t.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); };
/* dot: green = good news, red = bad news, blue = mixed or unclear */
export const DOT = { positive: 'pos', negative: 'neg' };
const SENT = { positive: 'good', negative: 'weak', neutral: 'info' };
const sym = s => s ? link(`xray/${encodeURIComponent(s)}`, esc(s), 'sym') : '';

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


/* ---------------------------------------------------------------- Today (home)
   Mood line, the biggest stories, then one short paragraph and dotted bullets each for Indian stocks, India economy
   and policy, and Global. Dot: green = good news, red = bad news, blue = mixed or unclear, ring = a stock on your watchlist.
   The server writes it every 15 minutes (/api/intel2/home). If that is not there yet, the same page is built here from the feeds. */
const evT = e => new Date(String(e.ts || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(e.ts)) ? '' : '+05:30')).getTime() || 0;
const tone = s => (s === 'positive' ? 'pos' : s === 'negative' ? 'neg' : '');
const K60 = 'qs-60';
const get60 = () => { try { return localStorage.getItem(K60) === '1'; } catch { return false; } };
const set60 = v => { try { localStorage.setItem(K60, v ? '1' : '0'); } catch { /* blocked */ } };
const bullet = (x, W) => {
  const inner = `<i class="dot ${tone(x.sentiment)} ${x.symbol && W.has(x.symbol) ? 'ring' : ''}"></i><span><b>${esc(x.headline || String(x.summary || '').split('\n')[0])}</b><small>${x.symbol ? esc(x.symbol) + ' · ' : ''}${esc(x.source || '')}${x.ts ? ' · ' + rel(x.ts) : ''}</small></span>`;
  return x.symbol ? link(`xray/${encodeURIComponent(x.symbol)}?tab=filings`, inner, 'hm-b') : `<a class="hm-b" href="${esc(x.url || '#')}" ${x.url ? 'target="_blank" rel="noopener"' : ''}>${inner}</a>`;
};
async function buildHome() {
  const [m, top, a, b, c] = await Promise.all([intel.markets().catch(() => ({ items: [], flows: [] })), intel.top(24, 12),
    intel.events({ days: 1, category: 'filing,insider,deal,meeting,news', min_impact: 40, limit: 8 }).catch(() => ({ items: [] })),
    intel.events({ days: 2, category: 'macro', limit: 6 }).catch(() => ({ items: [] })), intel.events({ days: 2, category: 'global', limit: 6 }).catch(() => ({ items: [] }))]);
  const mk = (m.items || []), idx = mk.filter(x => /^(Nifty 50|Bank Nifty)$/.test(x.name) && x.chg_pct != null), avg = idx.length ? idx.reduce((s, x) => s + x.chg_pct, 0) / idx.length : 0;
  const fii = (m.flows || []).find(f => /fii|fpi/i.test(f.who || '')), brent = mk.find(x => /brent/i.test(x.name)), spx = mk.find(x => /s&p/i.test(x.name));
  const t = avg > 0.15 ? 'pos' : avg < -0.15 ? 'neg' : '', label = avg > 0.6 ? 'Positive' : avg > 0.15 ? 'Mildly positive' : avg < -0.6 ? 'Negative' : avg < -0.15 ? 'Mildly negative' : 'Mixed';
  const parts = [idx[0] && `Nifty ${fmt.pct(idx[0].chg_pct, 2)}`, fii && `FII net ${fii.net_cr > 0 ? 'buying' : 'selling'} ${fmt.cr(Math.abs(fii.net_cr))}`, brent && brent.chg_pct != null && `Brent ${fmt.pct(brent.chg_pct, 1)}`, spx && spx.chg_pct != null && `S&P 500 ${fmt.pct(spx.chg_pct, 1)}`].filter(Boolean);
  const para = (L, what) => { const n = L.length, p = L.filter(x => x.sentiment === 'positive').length, q = L.filter(x => x.sentiment === 'negative').length; return n ? `${n} notable ${what} items. ${p} look positive and ${q} negative. Biggest: ${(L[0].headline || '').replace(/\.$/, '')}.` : ''; };
  return { mood: { label, tone: t, line: parts.join(' · ') || 'Waiting for market data.' }, top: (Array.isArray(top) ? top : []).slice(0, 3),
    sections: [{ id: 'stocks', title: 'Indian stocks', paragraph: para(a.items || [], 'stock'), items: a.items || [] }, { id: 'economy', title: 'India economy and policy', paragraph: para(b.items || [], 'policy'), items: b.items || [] }, { id: 'global', title: 'Global', paragraph: para(c.items || [], 'global'), items: c.items || [] }] };
}
async function getHome() { try { const h = await intel.home(); if (h && h.mood) return h; } catch { /* not on the server yet */ } return buildHome(); }
/* One story row: what happened, one line on why it matters, who it is about, how many reports it stands for. */
const story = (x, W) => {
  const why = x.why && !x.why.toLowerCase().startsWith(x.title.toLowerCase().slice(0, 40)) ? x.why : '';
  const meta = [x.n > 1 ? `${x.n} reports` : '', x.sources.slice(0, 2).join(', '), x.ts ? rel(x.ts) : ''].filter(Boolean).join(' · ');
  const inner = `<span class="br-i ${tone(x.sentiment)}"><b>${x.impact || 0}</b></span>
    <span class="br-t">${x.symbol ? `<span class="br-s ${W.has(x.symbol) ? 'ring' : ''}">${esc(x.symbol)}</span>` : ''}<b>${esc(x.title)}</b>${why ? `<span class="br-w">${esc(why)}</span>` : ''}<small>${esc(meta)}</small></span>`;
  return x.symbol ? link(`xray/${encodeURIComponent(x.symbol)}?tab=filings`, inner, 'br-r') : `<a class="br-r" href="${esc(x.url || '#')}" ${x.url ? 'target="_blank" rel="noopener"' : ''}>${inner}</a>`;
};
const dealLine = g => {
  const who = L => L.slice(0, 2).map(p => `${esc(p.name.replace(/\b(PRIVATE|PVT|LIMITED|LTD|LLP)\b\.?/gi, '').trim())} <b>${fmt.cr(Math.abs(p.net))}</b>`).join(', ') + (L.length > 2 ? ` +${L.length - 2} more` : '');
  const net = g.buy_cr - g.sell_cr, real = g.buy_cr + g.sell_cr > 0;
  const verdict = !real ? ['', 'Round trips only'] : g.buy_cr > 0 && g.sell_cr > 0 && Math.abs(net) / (g.buy_cr + g.sell_cr) < 0.2 ? ['', 'Changed hands'] : net > 0 ? ['good', 'Net buying'] : ['weak', 'Net selling'];
  return link(`xray/${encodeURIComponent(g.symbol)}`, `<span class="dh">${mono(g.symbol)}<span class="dn2"><b>${esc(g.symbol)}</b><small>${g.deals} ${g.deals === 1 ? 'deal' : 'deals'} · ${fmt.cr(g.gross_cr)} traded · ${fmt.date(g.last)}</small></span><span class="st ${verdict[0] || 'info'}">${verdict[1]}</span></span>
    ${g.buyers.length ? `<span class="dg-l"><i class="dot pos"></i><span>Bought: ${who(g.buyers)}</span></span>` : ''}
    ${g.sellers.length ? `<span class="dg-l"><i class="dot neg"></i><span>Sold: ${who(g.sellers)}</span></span>` : ''}
    ${!real ? `<span class="dg-l"><i class="dot"></i><span>The same parties bought and sold the same shares on the day. No lasting change in ownership.</span></span>` : g.churn > 0.5 ? `<span class="dg-l mute"><i class="dot"></i><span>${Math.round(g.churn * 100)}% of the volume was same-day round trips, left out here.</span></span>` : ''}`, 'deal dg');
};
async function todayView() {
  const [H, dl] = await Promise.all([getHome(), intel.deals(3).catch(() => ({ items: [] }))]);
  const W = new Set(alertPrefs().watch), s0 = seenAt(), sixty = get60();
  const raw = (H.top || []).concat(...H.sections.map(s => s.items));
  const S = stories(raw), T = byTone(S), cap = sixty ? 3 : 8;
  const fresh = S.filter(x => evT(x) > s0).length;
  const mine = S.filter(x => x.symbol && W.has(x.symbol));
  const D = dealDigest(dl.items || []), Dreal = D.filter(g => g.buy_cr + g.sell_cr > 0), Dchurn = D.length - Dreal.length;
  const col = (title, cls, L, emptyMsg) => `<section class="br-c ${cls}"><div class="br-ch"><i class="dot big ${cls}"></i><h3 class="h3">${title}</h3><span class="br-n">${L.length}</span></div>
    ${L.length ? `<div class="grp">${L.slice(0, cap).map(x => story(x, W)).join('')}</div>${L.length > cap ? `<p class="tiny br-more">+${L.length - cap} more in the Filings tab</p>` : ''}` : `<p class="empty-s">${emptyMsg}</p>`}</section>`;
  const gist = `${T.good.length} good and ${T.bad.length} bad ${S.length === 1 ? 'story' : 'stories'} today${raw.length > S.length ? `, from ${raw.length} reports (repeats merged)` : ''}.`;
  return `<div class="hm-mood ${H.mood.tone || ''}"><i class="dot big ${H.mood.tone || ''}"></i><div><small>Market mood${H.as_of ? ' · ' + rel(H.as_of) : ''}</small><b>${esc(H.mood.label)}</b><p>${esc(H.mood.line || '')}</p><p class="br-g">${gist}</p></div></div>
    <div class="hm-bar"><span>${fresh ? `<b>${fresh} new</b> since you last opened` : 'Nothing new since you last opened'}${mine.length ? ` · <b>${mine.length}</b> about your watchlist` : ''}</span><div class="seg sm" id="hm60"><button data-v="0" aria-pressed="${!sixty}">Full</button><button data-v="1" aria-pressed="${sixty}">60 sec</button></div></div>
    ${mine.length ? `<section class="br-c mine"><div class="br-ch"><i class="dot big ring"></i><h3 class="h3">Your watchlist</h3><span class="br-n">${mine.length}</span></div><div class="grp">${mine.map(x => story(x, W)).join('')}</div></section>` : ''}
    <div class="br-2">${col('Good news', 'pos', T.good, 'No clearly good news yet today.')}${col('Bad news', 'neg', T.bad, 'No clearly bad news yet today.')}</div>
    ${T.other.length && !sixty ? col('Worth knowing', '', T.other, '') : ''}
    ${Dreal.length ? `<section class="br-c"><div class="br-ch"><i class="dot big"></i><h3 class="h3">Big money moves</h3><span class="tiny">large deals, last 3 days, one line per stock</span></div>
      <div class="deals">${Dreal.slice(0, sixty ? 3 : 6).map(dealLine).join('')}</div>${Dchurn || Dreal.length > 6 ? `<p class="tiny br-more">${Dreal.length > 6 ? `+${Dreal.length - 6} more stocks in the Deals tab. ` : ''}${Dchurn ? `${Dchurn} ${Dchurn === 1 ? 'stock' : 'stocks'} with round-trip trading only left out.` : ''}</p>` : ''}</section>` : ''}
    <p class="hm-key"><span><i class="dot pos"></i>Good for the stock</span><span><i class="dot neg"></i>Bad for the stock</span><span><i class="dot"></i>Mixed or unclear</span><span>Number = impact, 0 to 100</span></p>
    <p class="disc">Facts from exchange filings and news, summarised automatically and scored 0 to 100. Repeated reports of one story are merged. Not investment advice.</p>`;
}

export default async function news(el, r) {
  let tab = TABS.some(t => t[0] === r.q.get('t')) ? r.q.get('t') : 'today';
  let filt = { min: 0, cat: '', q: '' };
  el.innerHTML = `
  <div class="page-h"><div class="ph-row"><div><h1 class="h1">News</h1><p class="lede">What matters today, then every filing, deal and insider trade scored for impact.</p></div><span class="tag-s" id="src">Live</span></div>
    <div class="tabs-x" id="nt" role="tablist">${TABS.map(([v, l]) => `<button role="tab" data-v="${v}">${l}</button>`).join('')}</div></div>
  <div id="nb"></div>`;
  const nb = el.querySelector('#nb'), nt = el.querySelector('#nt'), src = el.querySelector('#src');
  const live = ok => { src.textContent = ok ? 'Live' : 'Sample data'; src.classList.toggle('live', ok); };
  nb.addEventListener('click', e => { const t = e.target.closest('tr[data-href]'); if (t) go(t.dataset.href); });
  const sk = n => '<div class="sk" style="height:118px;margin-bottom:12px"></div>'.repeat(n);
  let token = 0;

  async function paint() {
    const my = ++token;
    nt.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === tab));
    history.replaceState(history.state, '', '/app/news' + (tab === 'today' ? '' : '?t=' + tab));
    nb.innerHTML = sk(4);
    try {
      const html = await VIEW[tab]();
      if (my === token && nb.isConnected) { nb.innerHTML = html; live(true); wire(); }
    } catch (e) {
      if (my !== token || !nb.isConnected) return;
      live(false);
      nb.innerHTML = (FALLBACK[tab] || (() => `<div class="info-b">${icon('info', 16)}<span>This needs the server, which is not reachable right now.</span></div>`))();
    }
  }
  function wire() {
    const h6 = nb.querySelector('#hm60'); if (h6) h6.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { set60(b.dataset.v === '1'); paint(); } };
    const f = nb.querySelector('#ff'); if (!f) return;
    f.onclick = e => { const b = e.target.closest('[data-min],[data-cat]'); if (!b) return; if (b.dataset.min) filt.min = +b.dataset.min; if (b.dataset.cat !== undefined) filt.cat = b.dataset.cat; paint(); };
    const s = nb.querySelector('#fq'); if (s) { let t = 0; s.oninput = () => { clearTimeout(t); t = setTimeout(() => { filt.q = s.value.trim(); paint(); }, 300); }; }
    const more = nb.querySelector('#more'); if (more) more.onclick = async () => { more.disabled = true; const d = await intel.events({ days: 30, min_impact: filt.min, category: filt.cat, q: filt.q, before: more.dataset.before, limit: 40 }); more.insertAdjacentHTML('beforebegin', d.items.map(x => evCard(x)).join('')); if (d.next) { more.dataset.before = d.next; more.disabled = false; } else more.remove(); };
  }

  const VIEW = {
    today: todayView,
    async brief() {
      const b = await intel.brief('auto');
      if (b.empty) return `<div class="info-b">${icon('clock', 16)}<span>The first brief is made at 07:00 or 17:00. Until then, the Filings tab has everything collected so far.</span></div>`;
      const mk = (b.markets || []).filter(m => m.chg_pct != null);
      const regions = [...new Set(mk.map(m => m.region))];
      const fl = (b.flows || []).slice(0, 2);
      return `<div class="brief-h"><span class="lbl">${b.kind === 'evening' ? 'Evening brief' : 'Morning brief'}</span><h2 class="h2">${fmt.dateY(b.day)}</h2><p class="tiny">Made ${esc(b.made_at || '')} · ${fmt.int((b.stats || {}).n)} items scanned, ${fmt.int((b.stats || {}).hi)} high-impact${b._stale ? ' · showing the last saved copy' : ''}</p></div>
        <div class="brief-g"><aside class="b-side">
        ${mk.length ? `<section class="sec"><h3 class="h3">Markets</h3><div class="mkt">${regions.map(rg => `<div class="mk-g"><small>${esc(rg)}</small>${mk.filter(m => m.region === rg).map(m => `<div class="mk"><span>${esc(m.name)}</span><b class="tnum">${fmt.num(m.last, m.last > 1000 ? 0 : 2)}</b><em class="tnum ${fmt.tone(m.chg_pct)}">${fmt.pct(m.chg_pct, 2)}</em></div>`).join('')}</div>`).join('')}</div></section>` : ''}
        ${fl.length ? `<div class="kp2">${fl.map(f => `<div><span>${esc(f.who)} cash · ${fmt.date(f.day)}</span><b class="tnum ${fmt.tone(f.net_cr)}">${f.net_cr > 0 ? '+' : ''}${fmt.cr(Math.abs(f.net_cr)).replace('₹', f.net_cr < 0 ? '−₹' : '₹')}</b><small>bought ${fmt.cr(f.buy_cr)} · sold ${fmt.cr(f.sell_cr)}</small></div>`).join('')}</div>` : ''}
        ${(b.calendar || []).length ? `<section class="sec"><h3 class="h3">Coming up</h3><div class="cal">${b.calendar.slice(0, 18).map(c => `<a class="cal-i" href="/app/xray/${encodeURIComponent(c.symbol)}" data-nav><b>${esc(c.symbol)}</b><span>${fmt.date(c.meeting_date)}</span><small>${c.is_results ? 'Results' : esc((c.purpose || '').slice(0, 30))}</small></a>`).join('')}</div></section>` : ''}
        </aside><div class="b-main">
        <section class="sec"><div class="sec-h"><h3 class="h3">What matters</h3><span class="tiny">ranked by impact</span></div>${(b.top || []).map(x => evCard(x)).join('') || '<p class="empty-s">Quiet so far.</p>'}</section>
        ${(b.red_flags || []).length ? `<section class="sec"><h3 class="h3">Red flags</h3>${b.red_flags.map(x => evCard(x)).join('')}</section>` : ''}
        ${(b.insiders || []).length ? `<section class="sec"><h3 class="h3">Insiders</h3><div class="card flush"><table class="dt"><thead><tr><th>Stock</th><th>Who</th><th>Side</th><th>Value</th></tr></thead><tbody>${b.insiders.map(i => `<tr data-href="xray/${encodeURIComponent(i.symbol)}"><td><b>${esc(i.symbol)}</b></td><td>${esc((i.person || '').slice(0, 28))}<small class="tiny" style="display:block">${esc(i.category || '')}</small></td><td><span class="st ${i.side === 'Buy' ? 'good' : 'weak'}">${i.side === 'Buy' ? 'Bought' : 'Sold'}</span></td><td class="tnum">₹${(+i.value_cr || 0).toFixed(2)} cr</td></tr>`).join('')}</tbody></table></div></section>` : ''}
        ${(b.world || []).length ? `<section class="sec"><h3 class="h3">World and policy</h3><div class="grp">${b.world.map(x => `<a class="ni" href="${esc(x.url || '#')}" target="_blank" rel="noopener"><div class="nh"><span class="ntag">${esc(x.category)}</span><span>${esc(x.source)} · ${rel(x.ts)}</span></div><h3>${esc(x.headline)}</h3></a>`).join('')}</div></section>` : ''}
        </div></div>
        <p class="disc">Facts from exchange filings and news, scored automatically. Not investment advice.</p>`;
    },
    async filings() {
      const d = await intel.events({ days: 7, min_impact: filt.min, category: filt.cat, q: filt.q, limit: 40 });
      const chip = (k, v, l, on) => `<button class="chip" data-${k}="${v}" aria-pressed="${on}">${l}</button>`;
      return `<div class="feed-f" id="ff"><label class="search sm">${icon('search', 16)}<input id="fq" placeholder="Stock or word" value="${esc(filt.q)}"></label>
          <div class="chips">${chip('min', 0, 'All', filt.min === 0)}${chip('min', 45, 'Impact 45+', filt.min === 45)}${chip('min', 70, 'Impact 70+', filt.min === 70)}</div>
          <div class="chips">${chip('cat', '', 'Everything', !filt.cat)}${chip('cat', 'filing', 'Filings', filt.cat === 'filing')}${chip('cat', 'insider', 'Insiders', filt.cat === 'insider')}${chip('cat', 'deal', 'Deals', filt.cat === 'deal')}${chip('cat', 'meeting', 'Meetings', filt.cat === 'meeting')}${chip('cat', 'news', 'News', filt.cat === 'news')}</div></div>
        <div class="evs">${d.items.map(x => evCard(x)).join('') || '<p class="empty-s">Nothing yet for these filters.</p>'}${d.next ? `<button class="btn quiet block" id="more" data-before="${esc(d.next)}">Load more</button>` : ''}</div>`;
    },
    async deals() {
      const d = await intel.deals(7); const D = d.items || [];
      if (!D.length) throw new Error('none');
      const G = dealDigest(D), real = G.filter(g => g.buy_cr + g.sell_cr > 0), churn = G.filter(g => g.buy_cr + g.sell_cr <= 0);
      const nb = real.filter(g => g.buy_cr > g.sell_cr * 1.25), ns = real.filter(g => g.sell_cr > g.buy_cr * 1.25);
      return `<div class="kp2"><div><span>Stocks with net buying</span><b class="tnum up">${nb.length}</b><small>${fmt.cr(nb.reduce((a, g) => a + g.buy_cr - g.sell_cr, 0))} net, 7 days</small></div><div><span>Stocks with net selling</span><b class="tnum dn">${ns.length}</b><small>${fmt.cr(ns.reduce((a, g) => a + g.sell_cr - g.buy_cr, 0))} net, 7 days</small></div></div>
        <div class="info-b">${icon('info', 16)}<span>${fmt.int(D.length)} deals in ${G.length} stocks, shown as <b>one card per stock</b>. A party that buys and sells the same shares on the same day cancels out, so only real changes in ownership are listed. <b>Bulk deal</b>: more than 0.5% of a company in a day. <b>Block deal</b>: one trade of ₹10 crore or more.</span></div>
        <div class="deals">${real.map(dealLine).join('')}</div>
        ${churn.length ? `<details class="dg-x"><summary>${churn.length} ${churn.length === 1 ? 'stock' : 'stocks'} with round-trip trading only</summary><div class="deals">${churn.map(dealLine).join('')}</div></details>` : ''}`;
    },
    async insiders() {
      const d = await intel.insiders(30); const L = d.items || [];
      if (!L.length) throw new Error('none');
      const buy = L.filter(x => x.side === 'Buy'), prom = buy.filter(x => /promoter/i.test(x.category || '') && /market/i.test(x.mode || ''));
      return `<div class="kp2"><div><span>Insider buying, 30 days</span><b class="tnum up">${fmt.cr(buy.reduce((a, x) => a + (+x.value_cr || 0), 0))}</b><small>${buy.length} ${buy.length === 1 ? 'trade' : 'trades'}</small></div><div><span>Promoters buying in the market</span><b class="tnum">${prom.length}</b><small>trades, the strongest signal of the lot</small></div></div>
        <div class="deals">${L.map(i => link(`xray/${encodeURIComponent(i.symbol)}?tab=filings`, `<span class="dh">${mono(i.symbol)}<span class="dn2"><b>${esc(i.symbol)}</b><small>${esc(i.category || 'Insider')} · filed ${fmt.date(i.known_at)}</small></span><span class="st ${i.side === 'Buy' ? 'good' : 'weak'}">${i.side === 'Buy' ? 'Bought' : 'Sold'}</span></span>
          <span class="who2">${esc(i.person || '')}</span>
          <span class="d3"><span><small>Value</small><b class="tnum">₹${(+i.value_cr || 0).toFixed(2)} cr</b></span><span><small>Holding after</small><b class="tnum">${i.pct_after != null ? (+i.pct_after).toFixed(2) + '%' : '—'}</b></span><span><small>How</small><b>${esc((i.mode || '—').replace(/purchase|sale/i, '').trim() || i.mode || '—')}</b></span></span>`, 'deal')).join('')}</div>
        <p class="disc">From SEBI insider-trading disclosures filed on NSE. Gifts, ESOPs and off-market transfers are marked by their mode.</p>`;
    },
    async calendar() {
      const d = await intel.calendar(21); const L = d.items || [];
      if (!L.length) return `<p class="empty-s">No board meetings announced for the next 3 weeks yet.</p>`;
      const days = [...new Set(L.map(x => x.meeting_date))];
      return days.map(dd => `<section class="sec"><div class="sec-h"><h3 class="h3">${ahead(dd)}</h3><span class="tiny">${(k => `${k} ${k === 1 ? 'meeting' : 'meetings'}`)(L.filter(x => x.meeting_date === dd).length)}</span></div><div class="cal">${L.filter(x => x.meeting_date === dd).map(c => `<a class="cal-i ${c.is_results ? 'res' : ''}" href="/app/xray/${encodeURIComponent(c.symbol)}" data-nav><b>${esc(c.symbol)}</b><small>${c.is_results ? 'Results' : esc((c.purpose || 'Board meeting').slice(0, 34))}</small></a>`).join('')}</div></section>`).join('');
    },
    async world() {
      const [m, w] = await Promise.all([intel.markets(), intel.events({ days: 2, category: 'global,macro', limit: 40 })]);
      const mk = (m.items || []).filter(x => x.chg_pct != null), regions = [...new Set(mk.map(x => x.region))];
      return `${mk.length ? `<div class="mkt">${regions.map(rg => `<div class="mk-g"><small>${esc(rg)}</small>${mk.filter(x => x.region === rg).map(x => `<div class="mk"><span>${esc(x.name)}</span><b class="tnum">${fmt.num(x.last, x.last > 1000 ? 0 : 2)}</b><em class="tnum ${fmt.tone(x.chg_pct)}">${fmt.pct(x.chg_pct, 2)}</em></div>`).join('')}</div>`).join('')}</div>` : ''}
        <section class="sec"><h3 class="h3">Headlines</h3><div class="grp">${(w.items || []).map(x => `<a class="ni" href="${esc(x.url || '#')}" target="_blank" rel="noopener"><div class="nh"><span class="ntag">${esc(x.category === 'macro' ? 'Policy' : 'Global')}</span><span>${esc(x.source)} · ${rel(x.ts)}</span></div><h3>${esc(x.headline)}</h3></a>`).join('') || '<p class="empty-s">No headlines yet.</p>'}</div></section>`;
    },
  };

  /* labelled samples, only when the server is unreachable */
  const sampleNews = L => `<div class="grp">${L.map(x => `<article class="ni"><div class="nh"><span class="ntag">${esc(x.tag)}</span><span>${esc(x.src)} · ${rel(x.at)}</span></div><h3>${esc(x.t)}</h3>${(x.syms || []).length ? `<div class="ns">${x.syms.map(sym).join('')}</div>` : ''}</article>`).join('')}</div>`;
  const FALLBACK = {
    today: () => `<div class="info-b">${icon('info', 16)}<span>The server is not reachable, so this is sample news.</span></div>${sampleNews(NEWS.india)}`,
    brief: () => `<div class="info-b">${icon('info', 16)}<span>The server is not reachable, so this is sample news.</span></div>${sampleNews(NEWS.india)}`,
    filings: () => sampleNews(NEWS.india), world: () => sampleNews(NEWS.global),
    deals: () => `<div class="deals">${NEWS.deals.map(x => link(`xray/${encodeURIComponent(x.sym)}`, `<span class="dh">${mono(x.sym)}<span class="dn2"><b>${esc(x.sym)}</b><small>${x.kind} deal · ${fmt.date(x.date)}</small></span><span class="st ${x.side === 'Buy' ? 'good' : 'weak'}">${x.side === 'Buy' ? 'Bought' : 'Sold'}</span></span><span class="who2">${esc(x.who)}</span><span class="d3"><span><small>Shares</small><b class="tnum">${qty(x.qty)}</b></span><span><small>Price</small><b class="tnum">${fmt.inr(x.px)}</b></span><span><small>Value</small><b class="tnum">${fmt.cr(x.qty * x.px / 1e7)}</b></span></span>`, 'deal')).join('')}</div>`,
  };
  nt.onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.v !== tab) { tab = b.dataset.v; paint(); } };
  paint();
}
