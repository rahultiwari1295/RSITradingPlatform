import { icon, esc, link, fmt, go } from '../app.js';
import { NEWS } from '../sample.js';

/* News: Indian market, global, and bulk / block deals. Sample items until the feed is connected. */
const rel = iso => { const m = Math.round((Date.now() - new Date(iso)) / 6e4); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : fmt.date(iso); };
const qty = v => v >= 1e7 ? (v / 1e7).toFixed(2) + ' cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + ' L' : fmt.int(v);

export default async function news(el, r) {
  let tab = ['india', 'global', 'deals'].includes(r.q.get('t')) ? r.q.get('t') : 'india';
  el.innerHTML = `
  <div class="page-h"><div class="ph-row"><div><h1 class="h1">News</h1><p class="lede">Indian markets, the world, and large trades by big investors.</p></div><span class="tag-s">Sample data</span></div>
    <div class="seg" id="nt" style="max-width:420px"><button data-v="india">Indian</button><button data-v="global">Global</button><button data-v="deals">Bulk deals</button></div></div>
  <div id="nb"></div>`;
  const nb = el.querySelector('#nb'), nt = el.querySelector('#nt');
  nb.addEventListener('click', e => { const t = e.target.closest('tr[data-href]'); if (t) go(t.dataset.href); });
  const paint = () => {
    nt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tab));
    history.replaceState({}, '', '/app/news' + (tab === 'india' ? '' : '?t=' + tab));
    if (tab === 'deals') {
      const D = NEWS.deals, B = D.filter(x => x.side === 'Buy'), Sl = D.filter(x => x.side === 'Sell'), val = L => L.reduce((a, x) => a + x.qty * x.px, 0) / 1e7;
      nb.innerHTML = `<div class="kp2"><div><span>Bought in large deals</span><b class="tnum up">${fmt.cr(val(B))}</b><small>${B.length} deals today</small></div><div><span>Sold in large deals</span><b class="tnum dn">${fmt.cr(val(Sl))}</b><small>${Sl.length} deals today</small></div></div>
        <div class="info-b">${icon('info', 16)}<span><b>Bulk deal</b>: one investor trades more than 0.5% of a company’s shares in a day. <b>Block deal</b>: one trade of ₹10 crore or more in a special window.</span></div>
        <div class="deals">${D.map(x => link(`xray/${encodeURIComponent(x.sym)}`, `<span class="dh">${'<span class="mono" style="--h:' + (x.sym.length * 47 % 360) + '">' + esc(x.sym.slice(0, 2)) + '</span>'}<span class="dn2"><b>${esc(x.sym)}</b><small>${x.kind} deal · ${fmt.date(x.date)}</small></span><span class="st ${x.side === 'Buy' ? 'good' : 'weak'}">${x.side === 'Buy' ? 'Bought' : 'Sold'}</span></span>
          <span class="who2">${esc(x.who)}</span>
          <span class="d3"><span><small>Shares</small><b class="tnum">${qty(x.qty)}</b></span><span><small>Price</small><b class="tnum">${fmt.inr(x.px)}</b></span><span><small>Value</small><b class="tnum">${fmt.cr(x.qty * x.px / 1e7)}</b></span></span>`, 'deal')).join('')}</div>`;
      return;
    }
    nb.innerHTML = `<div class="grp">${NEWS[tab].map(x => `<article class="ni"><div class="nh"><span class="ntag">${esc(x.tag)}</span><span>${esc(x.src)} · ${rel(x.at)}</span></div><h3>${esc(x.t)}</h3>${(x.syms || []).length ? `<div class="ns">${x.syms.map(s => link(`xray/${encodeURIComponent(s)}`, esc(s), 'sym')).join('')}</div>` : ''}</article>`).join('')}</div>`;
  };
  nt.onclick = e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.v; paint(); } };
  paint();
}
