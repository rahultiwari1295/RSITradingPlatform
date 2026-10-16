import { icon, esc, words, link, go, mono, fmt } from '../app.js';
import { SCREEN_GROUPS, SCREENS, screenRows, colName } from '../sample.js';

/* Screens: a catalogue of ready-made scans (Chartink / Screener.in style), compact rows, many visible at once.
   List view: one row per screen (title, one line, match count); desktop shows the selected screen's matches beside it.
   Board view: several screens' matches side by side. Each screen opens in full and can be edited in Build. */
const KEY = 'qs-screens-view';
const getV = () => { try { return localStorage.getItem(KEY) || 'list'; } catch { return 'list'; } };
const setV = v => { try { localStorage.setItem(KEY, v); } catch { /* blocked */ } };
const buildUrl = s => `build?query=${encodeURIComponent(s.query)}&tf=${s.tf}&name=${encodeURIComponent(s.name)}`;
const SAMPLE = `<div class="samp">${icon('info', 15)}<span><b>Sample results.</b> Stocks and numbers are placeholders until the scan server is connected.</span></div>`;
const tbl = (s, rows, max = 99) => `<div class="tb"><div class="th"><span>Stock</span><span>Price</span><span>Today</span><span>${esc(colName(s.col))}</span></div>${rows.slice(0, max).map(x => link(`xray/${encodeURIComponent(x.sym)}`, `<span class="nm">${mono(x.sym)}<span><b>${esc(x.sym)}</b><small>${esc(x.sec)}</small></span></span><span class="tnum">${fmt.inr(x.price)}</span><span class="tnum ${fmt.tone(x.chg)}">${fmt.pct(x.chg)}</span><span class="tnum hl">${esc(x.vf)}</span>`, 'tr')).join('')}</div>`;

export default async function screens(el, r) {
  if (r.arg) return one(el, r.arg);
  let cat = r.q.get('g') || 'all', view = getV(), sel = SCREENS[0].id, q = '';
  el.innerHTML = `
  <div class="head"><span class="ey">${icon('layers', 16)}Screens</span><h1 class="h1">${words('Ready-made <em>scans</em>')}</h1>
    <p class="lede">${SCREENS.length} scans in plain words. Tap one to see what matches today, or open it in Build to change it.</p></div>
  <div class="scbar">
    <label class="find">${icon('search', 18)}<input id="sq" placeholder="Find a scan" autocomplete="off"></label>
    <div class="seg" id="vw" style="width:170px;flex:none"><button data-v="list">List</button><button data-v="board">Board</button></div>
  </div>
  <div class="chips" id="cats"><button class="chip" data-g="all">All</button>${SCREEN_GROUPS.map(g => `<button class="chip" data-g="${g.id}">${esc(g.name)}</button>`).join('')}</div>
  ${SAMPLE}
  <div id="body"></div>`;
  const $ = s => el.querySelector(s), body = $('#body');
  const groups = () => SCREEN_GROUPS.filter(g => cat === 'all' || g.id === cat).map(g => ({ ...g, items: g.items.filter(s => !q || (s.name + ' ' + s.about).toLowerCase().includes(q)) })).filter(g => g.items.length);
  const count = s => (s.live ? screenRows(s).length : null);
  const rowH = s => { const c = count(s); return `<button class="sr ${s.id === sel ? 'on' : ''}" data-s="${s.id}"><span class="m"><b>${esc(s.name)}</b><span>${esc(s.about)}</span></span><span class="c">${c == null ? '<span class="pill">Soon</span>' : `<b class="tnum">${c}</b><small>stocks</small>`}</span>${icon('chev', 16)}</button><div class="sx" data-x="${s.id}" hidden></div>`; };

  function preview(s) {
    const rows = s.live ? screenRows(s) : [];
    return `<div class="pvh"><div><span class="tiny">${esc(SCREENS.find(x => x.id === s.id).groupName)}</span><h2 class="h2">${esc(s.name)}</h2><p class="small">${esc(s.about)}</p></div></div>
      <pre class="qcode">${esc(s.query)}</pre>
      ${s.live ? `<div class="count" style="margin:4px 0 10px"><b>${rows.length}</b><span>stocks match today</span></div>${tbl(s, rows, 10)}` : `<div class="honest">${icon('info', 18)}<span>This scan uses company numbers (results, ownership). It will run once the fundamentals feed is connected.</span></div>`}
      <div class="pva">${link(`screens/${s.id}`, 'Open full list', 'btn sm quiet')}${link(buildUrl(s), `${icon('edit', 15)}Edit in Build`, 'btn sm pri')}</div>`;
  }
  function draw() {
    $('#vw').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === view));
    $('#cats').querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-pressed', b.dataset.g === cat));
    const G = groups();
    if (!G.length) { body.innerHTML = `<p class="small" style="padding:20px 4px">No scan matches “${esc(q)}”.</p>`; return; }
    if (view === 'board') {
      body.innerHTML = G.map(g => `<section class="bd"><div class="sech" style="margin-bottom:10px"><div><h2 class="h3">${esc(g.name)}</h2><p class="tiny">${esc(g.about)}</p></div></div>
        <div class="bcols">${g.items.map(s => { const rows = s.live ? screenRows(s) : []; return `<div class="bc"><div class="bch">${link(`screens/${s.id}`, `<b>${esc(s.name)}</b>`)}<span class="tnum">${s.live ? rows.length : 'Soon'}</span></div><p class="tiny">${esc(s.about)}</p>
          <div class="bl">${s.live ? rows.slice(0, 6).map(x => link(`xray/${encodeURIComponent(x.sym)}`, `<span>${esc(x.sym)}</span><span class="tnum ${fmt.tone(x.chg)}">${fmt.pct(x.chg)}</span><span class="tnum hl">${esc(x.vf)}</span>`)).join('') : '<p class="tiny" style="padding:8px 0">Needs the fundamentals feed.</p>'}</div>
          ${s.live && rows.length > 6 ? link(`screens/${s.id}`, `+${rows.length - 6} more`, 'bm') : ''}</div>`; }).join('')}</div></section>`).join('');
      return;
    }
    body.innerHTML = `<div class="split"><div class="lcol">${G.map(g => `<section class="sg"><div class="sgh"><h2>${esc(g.name)}</h2><span class="tiny">${esc(g.about)}</span></div><div class="grp">${g.items.map(rowH).join('')}</div></section>`).join('')}</div>
      <aside class="pv" id="pv">${preview(SCREENS.find(s => s.id === sel))}</aside></div>`;
  }
  const wide = () => matchMedia('(min-width:980px)').matches;
  body.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const s = SCREENS.find(x => x.id === b.dataset.s); sel = s.id;
    body.querySelectorAll('.sr').forEach(x => x.classList.toggle('on', x === b));
    if (wide()) { $('#pv').innerHTML = preview(s); return; }
    const x = body.querySelector(`[data-x="${s.id}"]`), open = !x.hidden;
    body.querySelectorAll('.sx').forEach(y => { y.hidden = true; y.innerHTML = ''; });
    if (!open) { x.hidden = false; x.innerHTML = preview(s); b.classList.add('on'); } else b.classList.remove('on');
  });
  $('#vw').onclick = e => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; setV(view); draw(); };
  $('#cats').onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; cat = b.dataset.g; draw(); };
  $('#sq').oninput = e => { q = e.target.value.trim().toLowerCase(); draw(); };
  draw();
}

function one(el, id) {
  const s = SCREENS.find(x => x.id === id);
  if (!s) { go('screens', { replace: true }); return; }
  const rows = s.live ? screenRows(s) : [];
  el.innerHTML = `
  <div class="head">${link('screens', `${icon('back', 16)}Screens · ${esc(s.groupName)}`, 'ey')}<h1 class="h1" style="font-size:clamp(28px,7vw,42px)">${words(esc(s.name))}</h1><p class="lede">${esc(s.about)}</p></div>
  <div class="rulebox" style="margin-top:8px"><div class="edh"><b class="h3">The query</b><span class="pill">${s.tf === '1W' ? 'Weekly' : 'Daily'} chart</span></div><pre class="qcode">${esc(s.query)}</pre>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${link(buildUrl(s), `${icon('edit', 16)}Edit in Build`, 'btn pri sm')}${link(buildUrl(s) + '&test=1', `${icon('play', 14)}Test it as a strategy`, 'btn quiet sm')}</div></div>
  <section class="sec">${SAMPLE}${s.live ? `<div class="count" style="margin:4px 2px 12px"><b>${rows.length}</b><span>stocks match today</span></div>${tbl(s, rows)}` : `<div class="honest">${icon('info', 18)}<span>This scan uses company numbers. It runs once the fundamentals feed is connected.</span></div>`}
    <p class="tiny" style="margin:12px 2px 0">What the scan found, not a recommendation. Tap a stock for its X-Ray.</p></section>`;
}
