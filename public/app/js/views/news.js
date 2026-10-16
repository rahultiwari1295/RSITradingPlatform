import { icon, esc, words, link, fmt } from '../app.js';
import { NEWS } from '../sample.js';

/* News: Indian market, global, and bulk / block deals. Sample items until the feed is connected. */
const rel = iso => { const m = Math.round((Date.now() - new Date(iso)) / 6e4); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : fmt.date(iso); };
const qty = v => v >= 1e7 ? (v / 1e7).toFixed(2) + ' cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + ' L' : fmt.int(v);

export default async function news(el, r) {
  let tab = ['india', 'global', 'deals'].includes(r.q.get('t')) ? r.q.get('t') : 'india';
  el.innerHTML = `
  <div class="head"><span class="ey">${icon('news', 16)}News</span><h1 class="h1">${words('What moved <em>today</em>')}</h1><p class="lede">Indian markets, the world, and large trades by big investors.</p></div>
  <div class="seg" id="nt" style="max-width:460px"><button data-v="india">Indian</button><button data-v="global">Global</button><button data-v="deals">Bulk deals</button></div>
  <div class="samp" style="margin-top:14px">${icon('info', 15)}<span><b>Sample items.</b> Headlines and deals are placeholders until the news feed is connected.</span></div>
  <div id="nb" style="margin-top:12px"></div>`;
  const nb = el.querySelector('#nb'), nt = el.querySelector('#nt');
  const paint = () => {
    nt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tab));
    history.replaceState({}, '', '/app/news' + (tab === 'india' ? '' : '?t=' + tab));
    if (tab === 'deals') {
      const D = NEWS.deals, buy = D.filter(x => x.side === 'Buy').reduce((a, x) => a + x.qty * x.px, 0), sell = D.filter(x => x.side === 'Sell').reduce((a, x) => a + x.qty * x.px, 0);
      nb.innerHTML = `<div class="kpis k2"><div><small>Bought in large deals</small><b class="tnum up">${fmt.cr(buy / 1e7)}</b><span>${D.filter(x => x.side === 'Buy').length} deals</span></div><div><small>Sold in large deals</small><b class="tnum dn">${fmt.cr(sell / 1e7)}</b><span>${D.filter(x => x.side === 'Sell').length} deals</span></div></div>
        <p class="small" style="margin:14px 2px 10px">A <b>bulk deal</b> is one investor trading more than 0.5% of a company’s shares in a day. A <b>block deal</b> is a single large trade of at least ₹10 crore in a special window.</p>
        <div class="tb t5"><div class="th"><span>Stock</span><span>Investor</span><span>Side</span><span>Shares</span><span>Price</span></div>${D.map(x => link(`xray/${encodeURIComponent(x.sym)}`, `<span class="nm"><span><b>${esc(x.sym)}</b><small>${x.kind} · ${fmt.date(x.date)}</small></span></span><span class="who">${esc(x.who)}</span><span class="${x.side === 'Buy' ? 'up' : 'dn'}" style="font-weight:700">${x.side === 'Buy' ? 'Bought' : 'Sold'}</span><span class="tnum">${qty(x.qty)}</span><span class="tnum">${fmt.inr(x.px)}</span>`, 'tr')).join('')}</div>`;
      return;
    }
    const L = NEWS[tab];
    nb.innerHTML = `<div class="grp">${L.map(x => `<article class="ni"><div class="nh"><span class="pill">${esc(x.tag)}</span><span class="tiny">${esc(x.src)} · ${rel(x.at)}</span></div><b>${esc(x.t)}</b>${(x.syms || []).length ? `<div class="ns">${x.syms.map(s => link(`xray/${encodeURIComponent(s)}`, esc(s), 'tag')).join('')}</div>` : ''}</article>`).join('')}</div>`;
  };
  nt.onclick = e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.v; paint(); } };
  paint();
}
