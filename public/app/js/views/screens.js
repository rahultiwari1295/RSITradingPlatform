import { icon, esc, link, go, mono, fmt } from '../app.js';
import { SCREEN_GROUPS, SCREENS, screenRows, colName } from '../sample.js';

/* Screens: ready-made scans (Chartink / Screener.in style).
   Desktop: categories | scans | today's matches, all on one screen.  Phone: category chips, scans, tap to expand.
   Board view: several scans' matches side by side. */
const KEY = 'qs-screens-view';
const getV = () => { try { return localStorage.getItem(KEY) || 'list'; } catch { return 'list'; } };
const setV = v => { try { localStorage.setItem(KEY, v); } catch { /* blocked */ } };
const buildUrl = s => `build?query=${encodeURIComponent(s.query)}&tf=${s.tf}&name=${encodeURIComponent(s.name)}`;
const count = s => (s.live ? screenRows(s).length : null);
const table = (s, rows, max = 99) => `<table class="dt"><thead><tr><th>Stock</th><th>Price</th><th>Today</th><th>${esc(colName(s.col))}</th></tr></thead><tbody>${rows.slice(0, max).map(x => `<tr data-href="xray/${encodeURIComponent(x.sym)}"><td><span class="nm">${mono(x.sym)}<span><b>${esc(x.sym)}</b><small>${esc(x.sec)}</small></span></span></td><td class="tnum">${fmt.inr(x.price)}</td><td class="tnum ${fmt.tone(x.chg)}">${fmt.pct(x.chg)}</td><td class="tnum hl">${esc(x.vf)}</td></tr>`).join('')}</tbody></table>`;

export default async function screens(el, r) {
  if (r.arg) return one(el, r.arg);
  let cat = r.q.get('g') || 'all', view = getV(), sel = null, q = '';
  el.innerHTML = `
  <div class="page-h"><div class="ph-row"><div><h1 class="h1">Screens</h1><p class="lede">${SCREENS.length} ready-made scans in plain words. Pick one to see today’s matches.</p></div><span class="tag-s">Sample data</span></div>
    <div class="toolbar"><label class="search sm">${icon('search', 17)}<input id="sq" placeholder="Find a scan" autocomplete="off"></label><div class="seg" id="vw"><button data-v="list">List</button><button data-v="board">Board</button></div></div>
    <div class="chips only-m" id="catm"></div></div>
  <div id="body"></div>`;
  const $ = s => el.querySelector(s), body = $('#body');
  const groups = () => SCREEN_GROUPS.filter(g => cat === 'all' || g.id === cat).map(g => ({ ...g, items: g.items.filter(s => !q || (s.name + ' ' + s.about).toLowerCase().includes(q)) })).filter(g => g.items.length);
  const cats = () => [['all', 'All scans', SCREENS.length], ...SCREEN_GROUPS.map(g => [g.id, g.name, g.items.length])];

  const rowH = s => { const c = count(s); return `<button class="srow ${s.id === sel ? 'on' : ''}" data-s="${s.id}"><span class="m"><b>${esc(s.name)}</b><span>${esc(s.about)}</span></span>${c == null ? '<span class="cnt soon">Soon</span>' : `<span class="cnt">${c}</span>`}</button><div class="sx" data-x="${s.id}" hidden></div>`; };
  const preview = s => {
    const rows = s.live ? screenRows(s) : [];
    return `<div class="pv-h"><span class="lbl">${esc(s.groupName)}</span><h2>${esc(s.name)}</h2><p>${esc(s.about)}</p></div>
      <div class="qline"><span>Rule</span><code>${esc(s.query).replace(/\n/g, '<br>')}</code></div>
      ${s.live ? `<div class="pv-c"><b class="tnum">${rows.length}</b> stocks match today</div>${table(s, rows, 8)}` : `<div class="info-b">${icon('info', 16)}<span>Uses company results and ownership data. Runs once that feed is connected.</span></div>`}
      <div class="row-b">${link(`screens/${s.id}`, s.live && rows.length > 8 ? `See all ${rows.length}` : 'Open', 'btn sm quiet')}${link(buildUrl(s), `${icon('edit', 15)}Edit in Build`, 'btn sm pri')}</div>`;
  };
  function draw() {
    $('#vw').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === view));
    $('#catm').innerHTML = cats().map(([id, l]) => `<button class="chip" data-g="${id}" aria-pressed="${id === cat}">${esc(id === 'all' ? 'All' : l)}</button>`).join('');
    const G = groups();
    const rail = `<nav class="rail">${cats().map(([id, l, c]) => `<button data-g="${id}" aria-current="${id === cat}"><span>${esc(l)}</span><small>${c}</small></button>`).join('')}</nav>`;
    if (!G.length) { body.innerHTML = `<div class="sc3">${rail}<p class="empty-s">No scan matches “${esc(q)}”.</p></div>`; return; }
    if (view === 'board') {
      body.innerHTML = `<div class="sc2">${rail}<div>${G.map(g => `<section class="bd"><header class="bd-h"><h2>${esc(g.name)}</h2><p>${esc(g.about)}</p></header>
        <div class="bcols">${g.items.map(s => { const rows = s.live ? screenRows(s) : []; return `<article class="bc"><header>${link(`screens/${s.id}`, `<b>${esc(s.name)}</b>`)}<span class="cnt ${s.live ? '' : 'soon'}">${s.live ? rows.length : 'Soon'}</span></header><p>${esc(s.about)}</p>
          ${s.live ? `<table class="mini"><tbody>${rows.slice(0, 5).map(x => `<tr data-href="xray/${encodeURIComponent(x.sym)}"><td>${esc(x.sym)}</td><td class="tnum ${fmt.tone(x.chg)}">${fmt.pct(x.chg)}</td><td class="tnum hl">${esc(x.vf)}</td></tr>`).join('')}</tbody></table>${rows.length > 5 ? link(`screens/${s.id}`, `+${rows.length - 5} more`, 'more-l') : ''}` : '<p class="note">Needs the fundamentals feed.</p>'}</article>`; }).join('')}</div></section>`).join('')}</div></div>`;
      return;
    }
    if (!sel || !G.some(g => g.items.some(s => s.id === sel))) sel = G[0].items[0].id;
    body.innerHTML = `<div class="sc3">${rail}<div class="slist">${G.map(g => `<section class="sg"><header><h2>${esc(g.name)}</h2><p>${esc(g.about)}</p></header><div class="grp">${g.items.map(rowH).join('')}</div></section>`).join('')}</div>
      <aside class="pv" id="pv">${preview(SCREENS.find(s => s.id === sel))}</aside></div>`;
  }
  const wide = () => matchMedia('(min-width:1100px)').matches;
  body.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-href]'); if (tr) { go(tr.dataset.href); return; }
    const g = e.target.closest('[data-g]'); if (g) { cat = g.dataset.g; sel = null; draw(); return; }
    const b = e.target.closest('[data-s]'); if (!b) return;
    const s = SCREENS.find(x => x.id === b.dataset.s); sel = s.id;
    body.querySelectorAll('.srow').forEach(x => x.classList.toggle('on', x === b));
    if (wide()) { $('#pv').innerHTML = preview(s); return; }
    const x = body.querySelector(`[data-x="${s.id}"]`), open = !x.hidden;
    body.querySelectorAll('.sx').forEach(y => { y.hidden = true; y.innerHTML = ''; });
    if (!open) { x.hidden = false; x.innerHTML = preview(s); } else b.classList.remove('on');
  });
  $('#catm').onclick = e => { const b = e.target.closest('[data-g]'); if (b) { cat = b.dataset.g; sel = null; draw(); } };
  $('#vw').onclick = e => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; setV(view); draw(); };
  $('#sq').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  draw();
}

function one(el, id) {
  const s = SCREENS.find(x => x.id === id);
  if (!s) { go('screens', { replace: true }); return; }
  const rows = s.live ? screenRows(s) : [];
  el.innerHTML = `
  <div class="page-h">${link('screens', `${icon('back', 16)}Screens`, 'back')}<div class="ph-row"><div><span class="lbl">${esc(s.groupName)}</span><h1 class="h1">${esc(s.name)}</h1><p class="lede">${esc(s.about)}</p></div><span class="tag-s">Sample data</span></div></div>
  <div class="card pad"><div class="qline"><span>Rule · ${s.tf === '1W' ? 'weekly' : 'daily'} chart</span><code>${esc(s.query).replace(/\n/g, '<br>')}</code></div>
    <div class="row-b" style="margin-top:14px">${link(buildUrl(s), `${icon('edit', 16)}Edit in Build`, 'btn pri sm')}${link(buildUrl(s) + '&test=1', `${icon('play', 14)}Run it`, 'btn quiet sm')}</div></div>
  <section class="sec">${s.live ? `<div class="pv-c" style="margin:0 2px 12px"><b class="tnum">${rows.length}</b> stocks match today</div><div class="card flush">${table(s, rows)}</div>` : `<div class="info-b">${icon('info', 16)}<span>This scan uses company numbers. It runs once the fundamentals feed is connected.</span></div>`}
    <p class="disc">What the scan found, not a recommendation. Tap a stock for its X-Ray.</p></section>`;
  el.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) go(tr.dataset.href); });
}
