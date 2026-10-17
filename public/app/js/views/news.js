import { icon, esc, link, fmt, go, intel, mono } from '../app.js';
import { NEWS } from '../sample.js';

/* News: the intelligence feed. Brief (07:00 / 17:00), every filing scored, bulk/block deals, insider trades,
   the results calendar and world markets. Live from /api/intel2; labelled sample rows only if that is unreachable. */
const TABS = [['brief', 'Brief'], ['filings', 'Filings'], ['deals', 'Deals'], ['insiders', 'Insiders'], ['calendar', 'Calendar'], ['world', 'World']];
const rel = iso => { if (!iso) return ''; const t = new Date(String(iso).replace(' ', 'T')); const m = Math.round((Date.now() - t) / 6e4); return isNaN(m) ? '' : m < 1 ? 'now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : fmt.date(iso); };
const qty = v => v >= 1e7 ? (v / 1e7).toFixed(2) + ' cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + ' L' : fmt.int(v);
const imp = v => `<span class="imp ${v >= 70 ? 'hi' : v >= 45 ? 'md' : 'lo'}" style="--p:${v}" title="Impact ${v} of 100"><b>${v}</b></span>`;
const ahead = d => { const t = new Date(d + 'T00:00:00'), n = new Date(); n.setHours(0, 0, 0, 0); const k = Math.round((t - n) / 864e5); return k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : t.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); };
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
    <div class="ev-t"><span class="st ${SENT[e.sentiment] || 'info'}">${esc(e.label || String(e.type || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()))}</span><span class="tiny">${esc(e.source || '')} · ${rel(e.ts)}</span>${e.ai_status === 'done' ? '<span class="ai-b">AI read</span>' : ''}</div>
    <p class="ev-l1">${esc(lines[0] || '')}</p>${lines[1] ? `<p class="ev-l2">${esc(lines[1])}</p>` : ''}
    ${facts ? `<div class="ev-n">${facts}</div>` : ''}
    ${e.ai && e.ai.what_changed && !/nothing new/i.test(e.ai.what_changed) ? `<p class="ev-w">${icon('swap', 14)}<span>${esc(e.ai.what_changed)}</span></p>` : ''}
    ${e.url ? `<a class="ev-src" href="${esc(e.url)}" target="_blank" rel="noopener">${icon('doc', 14)}Source</a>` : ''}
  </article>`;
}

export default async function news(el, r) {
  let tab = TABS.some(t => t[0] === r.q.get('t')) ? r.q.get('t') : 'brief';
  let filt = { min: 0, cat: '', q: '' };
  el.innerHTML = `
  <div class="page-h"><div class="ph-row"><div><h1 class="h1">News</h1><p class="lede">Every filing, deal and insider trade, scored for impact and explained in two lines.</p></div><span class="tag-s" id="src">Live</span></div>
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
    history.replaceState({}, '', '/app/news' + (tab === 'brief' ? '' : '?t=' + tab));
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
    const f = nb.querySelector('#ff'); if (!f) return;
    f.onclick = e => { const b = e.target.closest('[data-min],[data-cat]'); if (!b) return; if (b.dataset.min) filt.min = +b.dataset.min; if (b.dataset.cat !== undefined) filt.cat = b.dataset.cat; paint(); };
    const s = nb.querySelector('#fq'); if (s) { let t = 0; s.oninput = () => { clearTimeout(t); t = setTimeout(() => { filt.q = s.value.trim(); paint(); }, 300); }; }
    const more = nb.querySelector('#more'); if (more) more.onclick = async () => { more.disabled = true; const d = await intel.events({ days: 30, min_impact: filt.min, category: filt.cat, q: filt.q, before: more.dataset.before, limit: 40 }); more.insertAdjacentHTML('beforebegin', d.items.map(x => evCard(x)).join('')); if (d.next) { more.dataset.before = d.next; more.disabled = false; } else more.remove(); };
  }

  const VIEW = {
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
      const B = D.filter(x => x.side === 'Buy'), Sl = D.filter(x => x.side === 'Sell'), val = L => L.reduce((a, x) => a + (+x.value_cr || 0), 0);
      return `<div class="kp2"><div><span>Bought in large deals</span><b class="tnum up">${fmt.cr(val(B))}</b><small>${B.length} deals, 7 days</small></div><div><span>Sold in large deals</span><b class="tnum dn">${fmt.cr(val(Sl))}</b><small>${Sl.length} deals, 7 days</small></div></div>
        <div class="info-b">${icon('info', 16)}<span><b>Bulk deal</b>: one investor trades more than 0.5% of a company’s shares in a day. <b>Block deal</b>: one trade of ₹10 crore or more in a special window.</span></div>
        <div class="deals">${D.map(x => link(`xray/${encodeURIComponent(x.symbol)}`, `<span class="dh">${mono(x.symbol)}<span class="dn2"><b>${esc(x.symbol)}</b><small>${esc(x.kind)} deal · ${fmt.date(x.deal_date)}</small></span><span class="st ${x.side === 'Buy' ? 'good' : 'weak'}">${x.side === 'Buy' ? 'Bought' : 'Sold'}</span></span>
          <span class="who2">${esc(x.party)}</span>
          <span class="d3"><span><small>Shares</small><b class="tnum">${qty(x.qty)}</b></span><span><small>Price</small><b class="tnum">${fmt.inr(x.price)}</b></span><span><small>Value</small><b class="tnum">${fmt.cr(x.value_cr)}</b></span></span>`, 'deal')).join('')}</div>`;
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
    brief: () => `<div class="info-b">${icon('info', 16)}<span>The server is not reachable, so this is sample news.</span></div>${sampleNews(NEWS.india)}`,
    filings: () => sampleNews(NEWS.india), world: () => sampleNews(NEWS.global),
    deals: () => `<div class="deals">${NEWS.deals.map(x => link(`xray/${encodeURIComponent(x.sym)}`, `<span class="dh">${mono(x.sym)}<span class="dn2"><b>${esc(x.sym)}</b><small>${x.kind} deal · ${fmt.date(x.date)}</small></span><span class="st ${x.side === 'Buy' ? 'good' : 'weak'}">${x.side === 'Buy' ? 'Bought' : 'Sold'}</span></span><span class="who2">${esc(x.who)}</span><span class="d3"><span><small>Shares</small><b class="tnum">${qty(x.qty)}</b></span><span><small>Price</small><b class="tnum">${fmt.inr(x.px)}</b></span><span><small>Value</small><b class="tnum">${fmt.cr(x.qty * x.px / 1e7)}</b></span></span>`, 'deal')).join('')}</div>`,
  };
  nt.onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.v !== tab) { tab = b.dataset.v; paint(); } };
  paint();
}
