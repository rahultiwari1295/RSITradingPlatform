import { icon, esc, link, go, mono, fmt, lab } from '../app.js';
import { SCREEN_GROUPS, SCREENS, screenRows, colName, colFmt } from '../sample.js';
import { catalog } from '../rules.js';
import { parse } from '../query.js';
import { mountStrip } from '../strip.js';

/* Screens: ready-made scans (Chartink / Screener.in style), run live on the Lab.
   Counts load as tiles scroll into view (3 at a time, cached 5 min), so opening the page never fires 60 scans.
   If the Lab can't be reached, the page switches to labelled sample rows instead of going blank. */
const KEY = 'qs-screens-view';
const getV = () => { try { return localStorage.getItem(KEY) || 'list'; } catch { return 'list'; } };
const setV = v => { try { localStorage.setItem(KEY, v); } catch { /* blocked */ } };
const buildUrl = s => `build?query=${encodeURIComponent(s.query)}&tf=${s.tf}&name=${encodeURIComponent(s.name)}`;
const GI = { breakout: ['trend', '#6C5CE7'], momentum: ['bolt', '#E08A1E'], volume: ['bars', '#0E9F8A'], pullback: ['target', '#2F80ED'], events: ['doc', '#C2410C'],
  weak: ['warn', '#E5484D'], business: ['shield', '#8E5BD9'], owners: ['users', '#1E9E6A'] };
const gIcon = (s, g) => { const [ic, c] = GI[g || s.group] || ['layers', '#6C5CE7']; return `<span class="sic" style="--c:${c}">${icon(ic, 18)}</span>`; };

/* ---------------------------------------------------------------- results
   The server works every screen out ahead of time (after the close, and every 15 minutes while the market is open) and
   hands them over in ONE small answer: the board. A saved copy of it is kept in this browser, so the page paints
   instantly and updates a moment later. Only if the server has no board do we fall back to running each scan live,
   two at a time, each with a time limit. */
const RES = new Map();      // id -> { t, p }
let OFFLINE = false, OFFBOARD = false, BOARD = null, bpend = null, ctl = new AbortController();
const BK = 'qs-board', subs = new Set();
const keptBoard = () => { try { return JSON.parse(localStorage.getItem(BK) || 'null'); } catch { return null; } };
function loadBoard() {
  if (!BOARD) { const k = keptBoard(); if (k && k.v && k.v.screens) BOARD = { t: k.t, v: k.v, saved: true }; }
  if (OFFBOARD) return Promise.resolve(null);
  const fresh = BOARD && Date.now() - BOARD.t < 3 * 60e3;
  if (fresh) return Promise.resolve(BOARD.v);
  if (!bpend) bpend = lab.board(ctl.signal).then(v => { if (!v || !v.screens) return null; BOARD = { t: Date.now(), v }; try { localStorage.setItem(BK, JSON.stringify({ t: BOARD.t, v })); } catch { /* full */ } return v; })
    .catch(e => { if (e.status === 404 || e.status === 405) OFFBOARD = true; return null; }).finally(() => { bpend = null; });
  /* stale-while-revalidate: use the saved copy now, repaint when the fresh one lands */
  if (BOARD) { bpend.then(v => { if (v) subs.forEach(f => f()); }); return Promise.resolve(BOARD.v); }
  return bpend;
}
const mapRow = s => x => ({ sym: x.symbol, name: '', sec: '', price: x.close, chg: x.ret_1, v: x.v, vf: colFmt(s.col, x.v) });
const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
function run(s) {
  const hit = RES.get(s.id);
  if (hit && Date.now() - hit.t < 5 * 60e3) return hit.p;
  const p = (async () => {
    const b = await loadBoard(), e = b && b.screens && b.screens[s.id];
    if (e) return { rows: (e.rows || []).map(mapRow(s)), count: e.count, asOf: b.as_of, live: true, pre: true };
    if (OFFLINE) throw new Error('offline');
    const cat = await catalog();
    const q = parse(s.query, cat);
    if (q.errors.length || !q.conds.length) throw new Error(q.errors[0] ? q.errors[0].error : 'Empty rule');
    const r = await lab.scan(s.tf, { v: 1, [q.mode]: q.conds }, ctl.signal);
    const rows = (r.rows || []).map(x => ({ sym: x.symbol, name: '', sec: '', price: x.close, chg: x.ret_1, v: x[s.col], vf: colFmt(s.col, x[s.col]) }))
      .sort((a, b) => (Number.isFinite(+b.v) ? Math.abs(+b.v) : -1) - (Number.isFinite(+a.v) ? Math.abs(+a.v) : -1));
    return { rows, count: r.count ?? rows.length, asOf: r.as_of, live: true };
  })().catch(e => {
    if (e && e.status === -1) { RES.delete(s.id); throw e; }                       // cancelled: page was left
    if (e && ((e.status === 0 && !e.timeout) || /reach|fetch|offline/i.test(e.message))) OFFLINE = true;   // a slow answer is not "offline"
    if (OFFLINE) { const rows = screenRows(s); return { rows, count: rows.length, live: false }; }
    RES.delete(s.id); throw e;
  });
  RES.set(s.id, { t: Date.now(), p });
  return p;
}
/** The whole result list for one screen (its own page). Pre-computed on the server; live scan if the server has none. */
async function fullList(s) {
  if (!OFFBOARD) {
    try { const r = await lab.screenFull(s.id, ctl.signal); return { rows: (r.rows || []).map(mapRow(s)), count: r.count, asOf: r.as_of, live: true }; }
    catch (e) { if (e.status === 404 || e.status === 405) OFFBOARD = true; else throw e; }
  }
  return run(s);
}
/* at most 2 live scans in flight */
const queue = [], active = { n: 0 };
function enqueue(s, done) {
  queue.push([s, done]); pump();
}
function pump() {
  while (active.n < 2 && queue.length) {
    const [s, done] = queue.shift(); active.n++;
    run(s).then(r => done(null, r), e => done(e)).finally(() => { active.n--; pump(); });
  }
}

const table = (s, rows, max = 99) => `<table class="dt"><thead><tr><th>Stock</th><th>Price</th><th>Today</th><th>${esc(colName(s.col))}</th></tr></thead><tbody>${rows.slice(0, max).map(x => `<tr data-href="xray/${encodeURIComponent(x.sym)}"><td><span class="nm">${mono(x.sym)}<span><b>${esc(x.sym)}</b>${x.sec ? `<small>${esc(x.sec)}</small>` : ''}</span></span></td><td class="tnum">${fmt.inr(x.price)}</td><td class="tnum ${fmt.tone(x.chg)}">${fmt.pct(x.chg)}</td><td class="tnum hl">${esc(x.vf)}</td></tr>`).join('')}</tbody></table>`;
const cntHTML = (r, id) => !r ? '<span class="cnt ld"><i></i></span>' : r.err ? `<span class="cnt soon" role="button" tabindex="0" data-rs="${id}" title="Could not load. Tap to retry" aria-label="Could not load, tap to retry">↻</span>` : `<span class="cnt${r.count ? '' : ' zero'}"><b>${r.count}</b><small>${r.count === 1 ? 'stock' : 'stocks'}</small></span>`;

const retryBtn = id => `<button class="lnk" data-rs="${id}">Tap to retry</button>`;
const bcHTML = (s, err, res) => err ? `<p class="note">Couldn’t load. ${retryBtn(s.id)}</p>`
  : res.count ? `<table class="mini"><tbody>${res.rows.slice(0, 5).map(x => `<tr data-href="xray/${encodeURIComponent(x.sym)}"><td>${esc(x.sym)}</td><td class="tnum ${fmt.tone(x.chg)}">${fmt.pct(x.chg)}</td><td class="tnum hl">${esc(x.vf)}</td></tr>`).join('')}</tbody></table>${res.count > 5 ? link(`screens/${s.id}`, `+${res.count - 5} more`, 'more-l') : ''}`
  : '<p class="note">No matches today.</p>';

export default async function screens(el, r) {
  if (r.arg) return one(el, r.arg);
  ctl = new AbortController();
  let cat = r.q.get('g') || 'all', view = getV(), sel = null, q = '';
  el.innerHTML = `
  <div class="page-h"><div class="ph-row"><div><h1 class="h1">Screens</h1><p class="lede">${SCREENS.length} ready-made scans across price, company numbers, owners and filings. Pick one to see today’s matches.</p></div><span class="tag-s" id="src">Live</span></div>
    <div id="mkstrip"></div>
    <div class="toolbar"><label class="search sm">${icon('search', 17)}<input id="sq" placeholder="Find a scan" autocomplete="off"></label><div class="seg" id="vw"><button data-v="list">List</button><button data-v="board">Board</button></div></div>
    <div class="chips only-m" id="catm"></div></div>
  <div id="body"></div>`;
  const $ = s => el.querySelector(s), body = $('#body');
  mountStrip($('#mkstrip'));
  const groups = () => SCREEN_GROUPS.filter(g => cat === 'all' || g.id === cat).map(g => ({ ...g, items: g.items.filter(s => !q || (s.name + ' ' + s.about + ' ' + s.query).toLowerCase().includes(q)) })).filter(g => g.items.length);
  const cats = () => [['all', 'All scans', SCREENS.length], ...SCREEN_GROUPS.map(g => [g.id, g.name, g.items.length])];
  const known = new Map();   // id -> result for drawing counts instantly on redraw
  const setSrc = () => {
    const s = $('#src'); if (!s) return;
    const at = BOARD && BOARD.v && BOARD.v.generated_at ? new Date(String(BOARD.v.generated_at).replace(' ', 'T')).getTime() || BOARD.t : BOARD ? BOARD.t : 0;
    const old = at && Date.now() - at > 45 * 60e3;
    s.textContent = OFFLINE ? 'Sample data' : BOARD ? (old ? 'Saved ' : 'Updated ') + ago(at) : 'Live';
    s.classList.toggle('live', !OFFLINE && !old);
  };
  const paintCnt = id => body.querySelectorAll(`[data-cnt="${id}"]`).forEach(c => { c.innerHTML = cntHTML(known.get(id), id); });

  const rowH = (s, g) => `<div class="stile"><button class="srow ${s.id === sel ? 'on' : ''}" data-s="${s.id}">${gIcon(s, g)}<span class="m"><b>${esc(s.name)}</b><span>${esc(s.about)}</span></span><span data-cnt="${s.id}">${cntHTML(known.get(s.id), s.id)}</span></button><div class="sx" data-x="${s.id}" hidden></div></div>`;
  const previewShell = s => `<div class="pv-h"><span class="lbl">${esc(s.groupName)}</span><h2>${esc(s.name)}</h2><p>${esc(s.about)}</p></div>
      <div class="qline"><span>Rule</span><code>${esc(s.query).replace(/\n/g, '<br>')}</code></div>
      <div class="pv-b" data-pv="${s.id}"><div class="sk" style="height:180px"></div></div>
      <div class="row-b">${link(`screens/${s.id}`, 'Open full list', 'btn sm quiet')}${link(buildUrl(s), `${icon('edit', 15)}Edit in Build`, 'btn sm pri')}</div>`;
  const fillPreview = (s, box) => run(s).then(res => {
    if (!box.isConnected) return;
    known.set(s.id, res); setSrc(); paintCnt(s.id);
    box.innerHTML = res.count ? `<div class="pv-c"><b class="tnum">${res.count}</b> ${res.count === 1 ? 'stock matches' : 'stocks match'} ${res.live ? (res.asOf ? 'on ' + fmt.date(res.asOf) : 'today') : '(sample)'}</div>${table(s, res.rows, 8)}`
      : `<div class="info-b">${icon('info', 16)}<span>No stock matches this today${s.needs ? '. It uses ' + ({ events: 'filings and insider data', business: 'company numbers', owners: 'shareholding data', delivery: 'delivery data' }[s.needs]) + ', which fills in as the server collects it' : ''}.</span></div>`;
  }, e => { if (e.status !== -1 && box.isConnected) box.innerHTML = `<div class="info-b">${icon('warn', 16)}<span>${esc(e.message)} ${retryBtn(s.id)}</span></div>`; });

  /* list view: a tile's count loads when it scrolls into view */
  let io = null, io2 = null;
  const loadCount = id => { const s = SCREENS.find(x => x.id === id); if (!s) return; enqueue(s, (err, res) => { if (err && err.status === -1) return; known.set(id, err ? { err: true } : res); setSrc(); paintCnt(id); }); };
  function watchCounts() {
    io && io.disconnect();
    io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; io.unobserve(en.target);
      const id = en.target.dataset.cnt; if (!known.has(id)) loadCount(id);
    }), { rootMargin: '200px 0px' });
    body.querySelectorAll('[data-cnt]').forEach(c => { if (!known.has(c.dataset.cnt)) io.observe(c); });
  }
  /* board view: a card's rows load when the card scrolls into view */
  const fillCard = (box, s) => enqueue(s, (err, res) => { if (!box.isConnected || (err && err.status === -1)) return; known.set(s.id, err ? { err: true } : res); setSrc(); box.innerHTML = bcHTML(s, err, res); paintCnt(s.id); });
  function watchCards() {
    io2 && io2.disconnect();
    io2 = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; io2.unobserve(en.target); fillCard(en.target, SCREENS.find(x => x.id === en.target.dataset.bc)); }), { rootMargin: '300px 0px' });
    body.querySelectorAll('[data-bc]').forEach(b => io2.observe(b));
  }

  function draw() {
    $('#vw').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === view));
    $('#catm').innerHTML = cats().map(([id, l]) => `<button class="chip" data-g="${id}" aria-pressed="${id === cat}">${esc(id === 'all' ? 'All' : l)}</button>`).join('');
    const G = groups();
    const rail = `<nav class="rail">${cats().map(([id, l, c]) => `<button data-g="${id}" aria-current="${id === cat}"><span>${esc(l)}</span><small>${c}</small></button>`).join('')}</nav>`;
    if (!G.length) { body.innerHTML = `<div class="sc3">${rail}<p class="empty-s">No scan matches “${esc(q)}”.</p></div>`; return; }
    if (view === 'board') {
      body.innerHTML = `<div class="sc2">${rail}<div>${G.map(g => `<section class="bd"><header class="bd-h"><h2>${esc(g.name)}</h2><p>${esc(g.about)}</p></header>
        <div class="bcols">${g.items.map(s => `<article class="bc"><header>${link(`screens/${s.id}`, `<b>${esc(s.name)}</b>`)}<span data-cnt="${s.id}">${cntHTML(known.get(s.id), s.id)}</span></header><p>${esc(s.about)}</p><div data-bc="${s.id}">${known.get(s.id) && !known.get(s.id).err ? bcHTML(s, null, known.get(s.id)) : '<div class="sk" style="height:96px"></div>'}</div></article>`).join('')}</div></section>`).join('')}</div></div>`;
      watchCards();
      return;
    }
    if (!sel || !G.some(g => g.items.some(s => s.id === sel))) sel = G[0].items[0].id;
    body.innerHTML = `<div class="sc3">${rail}<div class="slist">${G.map(g => `<section class="sg"><header><h2>${esc(g.name)}</h2><p>${esc(g.about)}</p></header><div class="stiles">${g.items.map(s => rowH(s, g.id)).join('')}</div></section>`).join('')}</div>
      <aside class="pv" id="pv"></aside></div>`;
    if (wide()) { const s = SCREENS.find(x => x.id === sel); $('#pv').innerHTML = previewShell(s); fillPreview(s, $('#pv [data-pv]')); }
    watchCounts();
  }
  const wide = () => matchMedia('(min-width:1100px)').matches;
  body.addEventListener('click', e => {
    const rs = e.target.closest('[data-rs]');
    if (rs) { e.stopPropagation(); const id = rs.dataset.rs, s = SCREENS.find(x => x.id === id); known.delete(id); RES.delete(id); paintCnt(id);
      const bc = body.querySelector(`[data-bc="${id}"]`); if (bc) { bc.innerHTML = '<div class="sk" style="height:96px"></div>'; fillCard(bc, s); } else loadCount(id);
      const pv = body.querySelector(`[data-pv="${id}"]`); if (pv) { pv.innerHTML = '<div class="sk" style="height:180px"></div>'; fillPreview(s, pv); }
      return; }
    const tr = e.target.closest('tr[data-href]'); if (tr) { go(tr.dataset.href); return; }
    const g = e.target.closest('[data-g]'); if (g) { cat = g.dataset.g; sel = null; draw(); return; }
    const b = e.target.closest('[data-s]'); if (!b) return;
    const s = SCREENS.find(x => x.id === b.dataset.s); sel = s.id;
    body.querySelectorAll('.srow').forEach(x => x.classList.toggle('on', x === b));
    if (wide()) { $('#pv').innerHTML = previewShell(s); fillPreview(s, $('#pv [data-pv]')); return; }
    const x = body.querySelector(`[data-x="${s.id}"]`), open = !x.hidden;
    body.querySelectorAll('.sx').forEach(y => { y.hidden = true; y.innerHTML = ''; });
    if (!open) { x.hidden = false; x.innerHTML = previewShell(s); fillPreview(s, x.querySelector('[data-pv]')); } else b.classList.remove('on');
  });
  $('#catm').onclick = e => { const b = e.target.closest('[data-g]'); if (b) { cat = b.dataset.g; sel = null; draw(); } };
  $('#vw').onclick = e => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; setV(view); draw(); };
  let qt = 0;
  $('#sq').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim().toLowerCase(); draw(); }, 120); };
  /* a fresher board arrived while the saved copy was showing: swap the numbers in place, no page jump */
  const refresh = () => {
    RES.clear(); known.clear(); setSrc();
    body.querySelectorAll('[data-cnt]').forEach(c => loadCount(c.dataset.cnt));
    body.querySelectorAll('[data-bc]').forEach(b => { if (!b.querySelector('.sk')) fillCard(b, SCREENS.find(x => x.id === b.dataset.bc)); });
    const pv = body.querySelector('[data-pv]'); if (pv) fillPreview(SCREENS.find(x => x.id === pv.dataset.pv), pv);
  };
  subs.add(refresh);
  draw();
  loadBoard().then(setSrc);
  return () => { subs.delete(refresh); io && io.disconnect(); io2 && io2.disconnect(); queue.length = 0; ctl.abort(); };
}

async function one(el, id) {
  const s = SCREENS.find(x => x.id === id);
  if (!s) { go('screens', { replace: true }); return; }
  el.innerHTML = `
  <div class="page-h">${link('screens', `${icon('back', 16)}Screens`, 'back')}<div class="ph-row"><div><span class="lbl">${esc(s.groupName)}</span><h1 class="h1">${esc(s.name)}</h1><p class="lede">${esc(s.about)}</p></div><span class="tag-s" id="src">Live</span></div></div>
  <div class="card pad"><div class="qline"><span>Rule · ${s.tf === '1W' ? 'weekly' : 'daily'} chart</span><code>${esc(s.query).replace(/\n/g, '<br>')}</code></div>
    <div class="row-b" style="margin-top:14px">${link(buildUrl(s), `${icon('edit', 16)}Edit in Build`, 'btn pri sm')}${link(buildUrl(s) + '&test=1', `${icon('play', 14)}Test it on past prices`, 'btn quiet sm')}</div></div>
  <section class="sec" id="res"><div class="sk" style="height:320px"></div></section>
  <p class="disc">What the scan found, not a recommendation. Tap a stock for its X-Ray.</p>`;
  el.addEventListener('click', e => { const tr = e.target.closest('tr[data-href]'); if (tr) go(tr.dataset.href); });
  const box = el.querySelector('#res');
  const load = async () => {
    box.innerHTML = '<div class="sk" style="height:320px"></div>';
    try {
      const res = await fullList(s); if (!box.isConnected) return;
      el.querySelector('#src').textContent = res.live ? 'Live' : 'Sample data';
      box.innerHTML = res.count ? `<div class="pv-c" style="margin:0 2px 12px"><b class="tnum">${res.count}</b> ${res.count === 1 ? 'stock matches' : 'stocks match'} ${res.asOf ? 'on ' + fmt.date(res.asOf) : ''}</div><div class="card flush">${table(s, res.rows)}</div>`
        : `<div class="info-b">${icon('info', 16)}<span>No stock matches this today.</span></div>`;
    } catch (e) { if (e.status !== -1 && box.isConnected) { box.innerHTML = `<div class="info-b">${icon('warn', 16)}<span>${esc(e.message)} ${retryBtn('x')}</span></div>`; box.querySelector('[data-rs]').onclick = load; } }
  };
  ctl = new AbortController();
  load();
  return () => ctl.abort();
}
