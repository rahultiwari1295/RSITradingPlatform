/* /rahul — owner control room. Shows a plain 404 to everyone except the signed-in owner; the server re-checks every call. */
const OWNER = 'rahultiwari1295@gmail.com';
const FB_CFG = { apiKey: 'AIzaSyDE7DrgzliyLF6SFbJi7lKqOsAvK3rtrIU', authDomain: 'scantoknow-a1593.firebaseapp.com', projectId: 'scantoknow-a1593', appId: '1:220667916508:web:f105873ba57909e18f0419' };
const FB_VER = '10.12.2';
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const TZ = 'Asia/Kolkata';
const root = document.getElementById('root');
const NF = root.innerHTML;                         // the 404 markup from index.html

/* ───────────── tiny helpers ───────────── */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const fTime = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const fDay = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const fSec = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const tm = ts => ts ? fTime.format(new Date(ts * 1000)) : '–';
const day = ts => ts ? fDay.format(new Date(ts * 1000)) : '–';
const stamp = ts => ts ? `${day(ts)} ${tm(ts)}` : '–';
const dayKey = ts => new Date(ts * 1000).toLocaleDateString('en-CA', { timeZone: TZ });
function span(sec) {
  sec = Math.abs(sec);
  if (sec < 45) return Math.max(1, Math.round(sec)) + 's';
  if (sec < 3600) return Math.round(sec / 60) + 'm';
  if (sec < 86400) { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return m && h < 10 ? `${h}h ${m}m` : `${h}h`; }
  const d = Math.floor(sec / 86400), h = Math.round((sec % 86400) / 3600); return h && d < 10 ? `${d}d ${h}h` : `${d}d`;
}
const ago = ts => !ts ? 'never' : (Date.now() / 1000 - ts < 45 ? 'just now' : span(Date.now() / 1000 - ts) + ' ago');
const inn = ts => !ts ? '–' : (ts - Date.now() / 1000 < 60 ? 'in a moment' : 'in ' + span(ts - Date.now() / 1000));
const mb = v => v == null ? '–' : (v >= 1024 ? (v / 1024).toFixed(v >= 10240 ? 0 : 1) + ' GB' : Math.round(v) + ' MB');
const pct = (v, d = 0) => v == null ? '–' : v.toFixed(d) + '%';
const inr = v => v == null ? '–' : (v < 0 ? '−' : '') + '₹' + Math.abs(Math.round(v)).toLocaleString('en-IN');
const dur = s => s == null ? '' : (s < 1 ? '<1s' : s < 90 ? Math.round(s) + 's' : span(s));
const IC = {
  now: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>', jobs: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  ctl: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>', logs: '<path d="m5 8 4 4-4 4M12 17h7"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  bolt: '<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z"/>', out: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>', moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
};
const ico = (k, c = '') => `<svg class="icon ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[k] || ''}</svg>`;
let toastEl, toastT;
function toast(m) { if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.append(toastEl); } toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3200); }
function sheet({ title, text, ok = 'Confirm', danger = false, cancel = 'Cancel' }) {
  return new Promise(res => {
    const scr = document.createElement('div'); scr.className = 'scrim';
    const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog');
    sh.innerHTML = `<div class="grab"></div><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="acts"><button class="btn ghost" data-v="0">${esc(cancel)}</button><button class="btn ${danger ? 'bad' : ''}" data-v="1">${esc(ok)}</button></div>`;
    document.body.append(scr, sh);
    const done = v => { scr.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => { scr.remove(); sh.remove(); }, 300); res(v); };
    scr.onclick = () => done(false); sh.onclick = e => { const b = e.target.closest('[data-v]'); if (b) done(b.dataset.v === '1'); };
    requestAnimationFrame(() => requestAnimationFrame(() => { scr.classList.add('on'); sh.classList.add('on'); }));
  });
}

/* ───────────── sign-in (same Firebase project and browser session as the main site) ───────────── */
let fbAuth = null, user = null;
const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
async function fb() {
  if (fbAuth) return fbAuth;
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth-compat.js`);
  if (!window.firebase.apps.length) window.firebase.initializeApp(FB_CFG);
  return (fbAuth = window.firebase.auth());
}
async function signIn() {
  const a = await fb(); const p = new window.firebase.auth.GoogleAuthProvider();
  try { await a.signInWithPopup(p); } catch (e) { if (String(e.code).includes('popup')) await a.signInWithRedirect(p); }
}
function show404() {
  stopPolling(); S.ready = false; document.title = '404: This page could not be found'; root.innerHTML = NF;
  const h = $('#n404'); let t;                                           // a long press on the number is the only way in
  const down = () => { t = setTimeout(() => signIn().catch(() => {}), 900); }, up = () => clearTimeout(t);
  h.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => h.addEventListener(e, up));
  h.addEventListener('contextmenu', e => e.preventDefault());
}

/* ───────────── data layer ───────────── */
const S = { ready: false, tab: 'now', range: '6h', ov: null, live: null, met: null, sched: null, dat: null, trd: null, err: null, lastOk: 0, filter: 'All', jq: '',
  logs: { list: null, file: 'scheduler.log', q: '', n: 200, auto: true, lines: [], at: 0, wrap: true }, busy: {} };
async function api(path, { method = 'GET', body } = {}) {
  const tok = await user.getIdToken();
  let r;
  try { r = await fetch('/api/admin/sys' + path, { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw { net: true }; }
  if (r.status === 404 || r.status === 401 || r.status === 403) throw { gone: true, status: r.status };
  if (r.status >= 500) throw { net: true, status: r.status };
  if (!r.ok) { let m = 'Error ' + r.status; try { m = (await r.json()).detail || m; } catch { /* keep */ } throw { msg: m, status: r.status }; }
  return r.json();
}
async function load(key, path, then) {
  if (S.busy[key]) return; S.busy[key] = true;
  try { S[key] = await api(path); S.err = null; S.lastOk = Date.now(); then && then(); }
  catch (e) { if (e.gone && S.ready) show404(); else if (e.net) S.err = 'Server not reachable. Showing the last data.'; }
  finally { S.busy[key] = false; paint(); }
}
const L = {
  ov: () => load('ov', '/overview'), live: () => load('live', '/live'),
  met: () => load('met', '/metrics?range=' + S.range), sched: () => load('sched', '/schedule'), dat: (f) => load('dat', '/data' + (f ? '?refresh=true' : '')),
  trd: () => load('trd', '/trading'),
  logsList: () => load('logsIdx', '/logs', () => { S.logs.list = S.logsIdx; if (S.tab === 'logs') { $('#view').innerHTML = vLogsShell(); paintLogs(); } }),
  async logs() {
    const l = S.logs; if (!l.file || S.busy.logs) return; S.busy.logs = true;
    try { const j = await api(`/logs/read?name=${encodeURIComponent(l.file)}&lines=${l.n}&q=${encodeURIComponent(l.q)}`); l.lines = j.lines; l.at = j.at || 0; S.err = null; paintLogs(); }
    catch (e) { if (e.gone && S.ready) show404(); else l.lines = [e.msg || 'Could not read this log.']; paintLogs(); }
    finally { S.busy.logs = false; }
  },
};
let timers = [], n5 = 0;
function startPolling() {
  stopPolling();
  const tick = () => {
    if (document.hidden) return; n5++;
    L.live();
    if (n5 % 4 === 0) L.ov();
    if (S.tab === 'now' && n5 % 6 === 0) { L.met(); L.trd(); L.dat(); }
    if (S.tab === 'jobs' && n5 % 4 === 0) L.sched();
    if (S.tab === 'data' && n5 % 6 === 0) L.dat();
    if (S.tab === 'control' && n5 % 4 === 0) L.sched();
    if (S.tab === 'logs' && S.logs.auto) L.logs();
    if (n5 % 3 === 0) paint();
  };
  timers.push(setInterval(tick, 5000), setInterval(clock, 1000));
  document.addEventListener('visibilitychange', onVis);
}
const onVis = () => { if (!document.hidden && S.ready) { refreshAll(); } };
function stopPolling() { timers.forEach(clearInterval); timers = []; document.removeEventListener('visibilitychange', onVis); }
function refreshAll() { L.live(); L.ov(); if (S.tab === 'now') { L.met(); L.trd(); L.dat(); } if (S.tab === 'jobs' || S.tab === 'control') L.sched(); if (S.tab === 'data') L.dat(); if (S.tab === 'logs') L.logs(); }

/* ───────────── shared pieces ───────────── */
const machine = () => (S.live && S.live.machine) || (S.ov && S.ov.machine) || null;
const services = () => (S.live && S.live.services) || (S.ov && S.ov.services) || [];
const sevOf = a => a.some(x => x.level === 'bad') ? 'bad' : a.length ? 'warn' : 'ok';
const stTone = st => st === 'ok' ? 'ok' : st === 'stale' ? 'warn' : '';
function skeleton() { return `<div class="grid"><div class="card"><div class="skel" style="width:40%"></div><div class="skel" style="height:110px;margin-top:14px"></div></div><div class="card"><div class="skel" style="width:60%"></div><div class="skel" style="margin-top:10px"></div><div class="skel" style="margin-top:10px;width:80%"></div></div></div>`; }

/* ───────────── charts: hand-drawn SVG, touch to read a value ───────────── */
function chart(host, { pts, key, key2, max, color, fmt, line88 }) {
  if (!host) return;
  const W = Math.max(260, host.clientWidth || 340), H = 132, pl = 30, pr = 6, pt = 8, pb = 18, iw = W - pl - pr, ih = H - pt - pb;
  const data = pts.filter(p => p[key] != null);
  if (data.length < 2) { host.innerHTML = '<div class="empty sm">Collecting data. Samples are taken every 30 seconds.</div>'; return; }
  const t0 = data[0].t, t1 = data[data.length - 1].t, X = t => pl + (t1 === t0 ? 0 : (t - t0) / (t1 - t0) * iw), Y = v => pt + ih - Math.min(1, Math.max(0, v / max)) * ih;
  const path = k => data.filter(p => p[k] != null).map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p[k]).toFixed(1)).join('');
  const line = path(key), area = line + `L${X(t1).toFixed(1)} ${pt + ih}L${X(t0).toFixed(1)} ${pt + ih}Z`;
  const gid = 'g' + key + Math.random().toString(36).slice(2, 6);
  const gl = [0, .25, .5, .75, 1].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + ih - f * ih).toFixed(1)}" y2="${(pt + ih - f * ih).toFixed(1)}"/><text x="${pl - 5}" y="${(pt + ih - f * ih + 3).toFixed(1)}" text-anchor="end">${fmt.axis(max * f)}</text>`).join('');
  const lab = ts => (t1 - t0 > 90000 ? day(ts) : tm(ts));
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(key)} over time"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <g class="grid">${gl}</g>${line88 ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(line88)}" y2="${Y(line88)}" stroke="var(--bad)" stroke-dasharray="3 4" stroke-width="1" opacity=".6"/>` : ''}
    <path d="${area}" fill="url(#${gid})"/>${key2 ? `<path class="ln" d="${path(key2)}" stroke="${color}" opacity=".28" stroke-width="1.2"/>` : ''}<path class="ln" d="${line}" stroke="${color}"/>
    <g class="xl"><text x="${pl}" y="${H - 3}">${lab(t0)}</text><text x="${pl + iw / 2}" y="${H - 3}" text-anchor="middle">${lab((t0 + t1) / 2)}</text><text x="${W - pr}" y="${H - 3}" text-anchor="end">${lab(t1)}</text></g>
    <line id="cv" y1="${pt}" y2="${pt + ih}" stroke="var(--mut)" stroke-width="1" opacity="0"/><circle id="cd" r="4" fill="${color}" stroke="var(--card)" stroke-width="2" opacity="0"/></svg><div class="tt"></div>`;
  const svg = host.firstElementChild, tt = host.querySelector('.tt'), cv = svg.querySelector('#cv'), cd = svg.querySelector('#cd');
  const move = e => {
    const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
    let best = data[0], bd = 1e12; for (const p of data) { const d = Math.abs(X(p.t) - x); if (d < bd) { bd = d; best = p; } }
    cv.setAttribute('x1', X(best.t)); cv.setAttribute('x2', X(best.t)); cv.setAttribute('opacity', 1); cd.setAttribute('cx', X(best.t)); cd.setAttribute('cy', Y(best[key])); cd.setAttribute('opacity', 1);
    tt.textContent = `${(t1 - t0 > 90000 ? stamp(best.t) : tm(best.t))} · ${fmt.tip(best)}`;
  };
  const off = () => { cv.setAttribute('opacity', 0); cd.setAttribute('opacity', 0); tt.textContent = ''; };
  svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', e => { S.scrub = true; move(e); }); svg.addEventListener('pointerleave', () => { S.scrub = false; off(); }); svg.addEventListener('pointerup', () => { S.scrub = false; }); svg.addEventListener('pointercancel', () => { S.scrub = false; off(); });
}
function drawCharts() {
  const m = S.met, mach = machine(); if (!m || !S.ov) return;
  const total = (mach && mach.mem_total_mb) || 2048;
  chart($('#ch-cpu'), { pts: m.points, key: 'cpu', key2: 'cpu_max', max: 100, color: 'var(--cpu)', fmt: { axis: v => Math.round(v) + '', tip: p => `CPU ${p.cpu.toFixed(0)}% avg · ${(p.cpu_max ?? p.cpu).toFixed(0)}% peak` } });
  chart($('#ch-mem'), { pts: m.points, key: 'mem_mb', max: total, color: 'var(--mem)', line88: total * .88, fmt: { axis: v => (v >= 1024 ? (v / 1024).toFixed(1) + 'G' : Math.round(v) + ''), tip: p => `RAM ${mb(p.mem_mb)} peak of ${mb(total)}` } });
}

/* ───────────── NOW ───────────── */
function vNow() {
  const o = S.ov, m = machine(); if (!o || !m) return skeleton();
  const al = o.alerts, sev = sevOf(al), svc = services();
  const memTone = m.mem >= 94 ? 'bad' : m.mem >= 85 ? 'warn' : '', diskTone = m.disk >= 90 ? 'bad' : m.disk >= 80 ? 'warn' : '';
  const alerts = al.length ? al.map(a => `<button class="alert ${a.level}" data-act="go" data-tab="${a.tab}"><span class="dot ${a.level}"></span><span>${esc(a.text)}</span></button>`).join('')
    : `<div class="allgood"><span class="dot ok"></span><div><div class="big">All good</div><div class="sm mut">${svc.filter(s => s.state === 'active').length} services running · ${o.dataSummary.ok} of ${o.dataSummary.total} data sources fresh</div></div></div>`;
  const mk = o.marketOpen ? '<span class="pill">Market open</span>' : `<span class="pill mutep">${o.tradingDay ? 'Market closed' : 'Holiday / weekend'}</span>`;
  const rng = ['1h', '6h', '24h', '7d'].map(r => `<button class="chip" data-act="range" data-v="${r}" aria-pressed="${S.range === r}">${r}</button>`).join('');
  const pk = S.met ? `Peak in ${S.range}: <b>${mb(S.met.peakMemMb)}</b> RAM · <b>${pct(S.met.peakCpu)}</b> CPU` : '';
  const upc = o.upcoming.map(j => `<div class="li"><span class="dot ${j.critical ? 'warn' : ''}"></span><div class="tx"><div class="t1">${esc(j.label)}</div><div class="t2">${esc(j.schedule)}</div></div><div class="r"><b style="color:var(--ink)">${inn(j.next)}</b><br>${tm(j.next)}</div></div>`).join('') || '<div class="empty sm">Nothing scheduled</div>';
  const rec = o.recent.map(j => { const t = j.lastEnd || j.lastStart || j.lastOutput, ok = j.ok; return `<div class="li"><span class="dot ${ok === false ? 'bad' : ok === true ? 'ok' : ''}"></span><div class="tx"><div class="t1">${esc(j.label)}</div><div class="t2">${ok === false ? esc((j.note || 'failed').slice(0, 70)) : j.durationS != null ? 'took ' + dur(j.durationS) : j.lastOutput && !j.lastStart ? 'log updated' : 'ran'}</div></div><div class="r">${ago(t)}</div></div>`; }).join('') || '<div class="empty sm">No runs recorded yet</div>';
  const trd = S.trd, pos = (trd && trd.open || []).slice(0, 8).map(p => {
    const ch = p.current_ltp && p.entry_price ? (p.current_ltp / p.entry_price - 1) * 100 : null, up = (p.unrealized_pnl || 0) >= 0;
    return `<div class="li"><div class="tx"><div class="t1">${esc(p.symbol)}</div><div class="t2">${esc(p.strategy_id || '')} · since ${esc(p.entry_date)}</div></div><div class="r"><b style="color:${up ? 'var(--ok)' : 'var(--bad)'}">${inr(p.unrealized_pnl)}</b><br>${ch == null ? '' : (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%'} · stop ${p.current_stop ? (+p.current_stop).toFixed(0) : '–'}</div></div>`;
  }).join('');
  const nav = o.trading && o.trading.nav, cnt = o.trading && o.trading.counts;
  const stale = o.dataSummary.stale ? `<span class="tag warn">${o.dataSummary.stale} stale</span>` : '', cert = o.cert && o.cert.daysLeft != null ? `${o.cert.daysLeft} days` : '–';
  return `<div class="grid cols"><div class="grid">
    <section class="card"><h2>${sev === 'ok' ? 'Status' : 'Needs a look'}</h2>${alerts}</section>
    <div class="tiles">
      <div class="tile"><div class="k">RAM</div><div class="v">${mb(m.mem_mb)} <small>/ ${mb(m.mem_total_mb)}</small></div><div class="bar ${memTone}"><i style="width:${Math.min(100, m.mem || 0)}%"></i></div><div class="s">${mb(m.mem_free_mb)} free · swap ${mb(m.swap_mb)}</div></div>
      <div class="tile"><div class="k">CPU</div><div class="v">${pct(m.cpu)}</div><div class="bar"><i style="width:${Math.min(100, m.cpu || 0)}%"></i></div><div class="s">load ${m.load1 == null ? '–' : m.load1.toFixed(2)} · ${m.cores || '?'} cores</div></div>
      <div class="tile"><div class="k">Disk</div><div class="v">${pct(m.disk)}</div><div class="bar ${diskTone}"><i style="width:${Math.min(100, m.disk || 0)}%"></i></div><div class="s">${m.disk_used_gb ? m.disk_used_gb.toFixed(1) + ' of ' + m.disk_total_gb.toFixed(0) + ' GB' : ''}</div></div>
      <div class="tile"><div class="k">Up for</div><div class="v">${m.uptime_s ? span(m.uptime_s) : '–'}</div><div class="s">since last reboot</div><div class="s">cert ${cert}</div></div>
    </div>
    <section class="card"><h2>Machine <span class="sp"></span></h2><div class="chips" style="margin:-4px 0 10px">${rng}</div>
      <div class="chead"><b>CPU</b><span>${pct(m.cpu)} now</span></div><div class="chart" id="ch-cpu"></div>
      <div class="chead" style="margin-top:14px"><b>Memory</b><span>${mb(m.mem_mb)} used of ${mb(m.mem_total_mb)}</span></div><div class="chart" id="ch-mem"></div>
      <div class="sm mut" style="margin-top:8px">${pk}</div></section>
    <section class="card"><h2>Services <span class="sp"></span><button class="more" data-act="go" data-tab="control">Manage</button></h2><div class="rows">${svc.map(s => `<div class="li"><span class="dot ${s.state === 'active' ? 'ok' : s.expect ? 'bad' : ''}"></span><div class="tx"><div class="t1">${esc(s.label)}</div><div class="t2">${s.state === 'active' ? 'up ' + span(s.uptime_s || 0) : esc(s.state)}${s.restarts ? ' · ' + s.restarts + ' restarts' : ''}</div></div><div class="r">${s.mem_mb ? mb(s.mem_mb) : ''}</div></div>`).join('')}</div></section>
  </div><div class="grid">
    <section class="card"><h2>Trading ${mk}</h2>${nav ? `<div class="row" style="margin-bottom:6px"><div><div class="k xs mut">NAV</div><div class="big">${inr(nav.total_nav)}</div></div><div class="sp"></div><div style="text-align:right"><div class="xs mut">Drawdown</div><b style="color:${nav.drawdown_pct < -5 ? 'var(--bad)' : 'var(--ink)'}">${nav.drawdown_pct == null ? '–' : nav.drawdown_pct.toFixed(1) + '%'}</b><div class="xs mut">${esc(nav.date)}</div></div></div>` : ''}
      <div class="sm mut" style="margin-bottom:4px">${cnt ? cnt.open + ' open · ' + cnt.closed + ' closed' : ''}</div><div class="rows">${pos || '<div class="empty sm">No open positions</div>'}</div></section>
    <section class="card"><h2>Up next <span class="sp"></span><button class="more" data-act="go" data-tab="jobs">All jobs</button></h2><div class="rows">${upc}</div></section>
    <section class="card"><h2>Just ran</h2><div class="rows">${rec}</div></section>
    <section class="card"><h2>Data health ${stale}<span class="sp"></span><button class="more" data-act="go" data-tab="data">Details</button></h2>
      <div class="rows">${(S.dat ? S.dat.items : []).filter(i => i.status !== 'ok').slice(0, 4).map(i => `<div class="li"><span class="dot ${stTone(i.status)}"></span><div class="tx"><div class="t1">${esc(i.label)}</div><div class="t2 wrap">${esc(i.detail)}</div></div><div class="r">${i.at ? ago(i.at) : esc(i.on || '')}</div></div>`).join('') || `<div class="sm mut" style="padding:6px 0">${o.dataSummary.ok} of ${o.dataSummary.total} sources up to date for ${esc(o.expectedSession)}.</div>`}</div>
      <div class="li"><span class="dot ${o.ollama.up ? 'ok' : 'bad'}"></span><div class="tx"><div class="t1">Phone AI (Ollama)</div><div class="t2">${o.ollama.up ? esc((o.ollama.models || []).slice(0, 2).join(', ')) + ' · ' + o.ollama.ms + ' ms' : 'not reachable'}</div></div></div></section>
  </div></div>`;
}

/* ───────────── JOBS ───────────── */
const GROUPS = ['Trading', 'Data', 'Xray', 'News', 'Lab', 'AI', 'Infra', 'Other'];
function jobBadge(j) {
  if (j.paused) return '<span class="tag">Paused</span>';
  if (j.ok === false) return '<span class="tag bad">Failed</span>';
  if (j.ok === true) return '<span class="tag ok">OK</span>';
  if (j.lastStart && j.ok == null) return '<span class="tag acc">Running</span>';
  if (j.lastOutput) return '<span class="tag ok">Ran</span>';
  return '<span class="tag">No record</span>';
}
function jobCard(j) {
  const last = j.lastEnd || j.lastStart || j.lastOutput;
  const can = j.run && S.sched && S.sched.runnable[j.run], run = S.sched && S.sched.running.some(r => r.job === j.run);
  return `<div class="jc"><div class="h">${j.critical ? ico('lock').replace('class="icon ', 'style="width:15px;height:15px;color:var(--mut)" class="icon ') : ''}<div class="t1">${esc(j.label)}</div>${jobBadge(j)}</div>
    <div class="m"><span>When</span><b>${esc(j.schedule)}</b>
    <span>Last</span><b>${last ? `${ago(last)} <span class="mut" style="font-weight:500">· ${stamp(last)}${j.durationS != null ? ' · took ' + dur(j.durationS) : ''}${!j.lastStart && j.lastOutput ? ' · log activity' : ''}</span>` : '<span class="mut" style="font-weight:500">no record yet</span>'}</b>
    ${j.runsToday ? `<span>Today</span><b>${j.runsToday}× ${j.failedToday ? `<span style="color:var(--bad)">(${j.failedToday} failed)</span>` : ''}</b>` : ''}
    ${j.note && j.ok !== true ? `<span>Result</span><b class="wrap" style="font-weight:500;word-break:break-word">${esc(j.note.slice(0, 160))}</b>` : j.note ? `<span>Result</span><b style="font-weight:500" class="mut">${esc(j.note.slice(0, 90))}</b>` : ''}
    <span>Next</span><b>${j.next ? `${inn(j.next)} <span class="mut" style="font-weight:500">· ${day(j.next)} ${tm(j.next)}</span>` : '<span class="mut" style="font-weight:500">–</span>'}</b></div>
    ${can ? `<div style="margin-top:9px">${run ? '<span class="tag acc">Running now…</span>' : `<button class="btn ghost sm" data-act="run" data-key="${esc(j.run)}" data-label="${esc(j.label)}">${ico('play')} Run now</button>`}${S.sched.runnable[j.run].heavy ? ' <span class="tag warn">heavy</span>' : ''}</div>` : j.critical ? '<div class="xs mut" style="margin-top:8px">Trading job: view only. It runs by itself on the scheduler.</div>' : ''}</div>`;
}
function vJobsShell() {
  return `<div class="chips" id="jfilters"></div><div style="margin:10px 0"><input class="search" id="jq" placeholder="Search jobs" value="${esc(S.jq)}" autocomplete="off"></div><div id="jbody">${skeleton()}</div>`;
}
function paintJobs() {
  const host = $('#jbody'); if (!host) return;
  const s = S.sched; if (!s) { host.innerHTML = skeleton(); return; }
  const q = S.jq.trim().toLowerCase();
  let jobs = s.jobs.filter(j => !q || (j.label + ' ' + j.schedule + ' ' + j.group).toLowerCase().includes(q));
  const failed = s.jobs.filter(j => j.ok === false).length;
  const fl = $('#jfilters');
  if (fl) fl.innerHTML = ['All', ...(failed ? ['Failed'] : []), ...GROUPS.filter(g => s.jobs.some(j => j.group === g))].map(g => `<button class="chip" data-act="filter" data-v="${g}" aria-pressed="${S.filter === g}">${g}${g === 'Failed' ? ' ' + failed : ''}</button>`).join('');
  if (S.filter === 'Failed') jobs = jobs.filter(j => j.ok === false); else if (S.filter !== 'All') jobs = jobs.filter(j => j.group === S.filter);
  const running = s.running.length ? `<section class="card" style="margin-bottom:12px"><h2>Running now</h2>${s.running.map(r => `<div class="li"><span class="dot ok pulse"></span><div class="tx"><div class="t1">${esc((s.runnable[r.job] || {}).label || r.job)}</div><div class="t2">started ${ago(r.started)}</div></div><button class="btn ghost sm" data-act="openlog" data-file="ops_manual_${esc(r.job)}.log">Log</button></div>`).join('')}</section>` : '';
  const by = {}; jobs.forEach(j => (by[j.group] = by[j.group] || []).push(j));
  const body = GROUPS.filter(g => by[g]).map(g => `<div class="gh">${g}</div><section class="card rows" style="padding-top:2px;padding-bottom:2px">${by[g].sort((a, b) => (a.paused - b.paused) || ((a.next || 9e12) - (b.next || 9e12))).map(jobCard).join('')}</section>`).join('') || '<div class="empty">No jobs match.</div>';
  const hist = s.runs.slice(0, 12).map(r => `<div class="li"><span class="dot ${r.ok === false ? 'bad' : r.ok ? 'ok' : 'pulse'}"></span><div class="tx"><div class="t1">${esc(((s.runnable[r.job] || {}).label) || r.job.replace(/^job_/, '').replace(/_/g, ' '))}</div><div class="t2 wrap">${r.source === 'manual' ? 'you ran it' : 'scheduler'}${r.ok === false ? ' · ' + esc((r.note || '').slice(0, 80)) : ''}</div></div><div class="r">${ago(r.start)}<br>${r.end ? dur(r.end - r.start) : 'running'}</div></div>`).join('');
  host.innerHTML = running + `<div class="grid ${S.filter === 'All' && !q ? 'cols' : ''}"><div>${body}</div>${S.filter === 'All' && !q ? `<section class="card" style="margin-top:30px"><h2>Recent runs</h2><div class="rows">${hist || '<div class="empty sm">Nothing recorded yet. The scheduler records every run from now on.</div>'}</div></section>` : ''}</div>`;
}

/* ───────────── DATA ───────────── */
function vData() {
  const d = S.dat; if (!d) return skeleton();
  const items = d.items, c = st => items.filter(i => i.status === st).length;
  const groups = [...new Set(items.map(i => i.group))];
  const rank = { stale: 0, unknown: 1, ok: 2 };
  const card = i => `<div class="jc"><div class="h"><span class="dot ${stTone(i.status)}"></span><div class="t1">${esc(i.label)}</div><span class="tag ${i.status === 'ok' ? 'ok' : i.status === 'stale' ? 'warn' : ''}">${i.status === 'ok' ? 'Fresh' : i.status === 'stale' ? 'Stale' : 'Unknown'}</span></div>
    <div style="margin:6px 0 2px 16px"><div class="freshbig">${i.at ? ago(i.at) : i.on ? esc(i.on) : '–'}</div><div class="sm mut">${i.at ? stamp(i.at) : ''}${i.at && i.on ? ' · ' : ''}${i.on ? 'data for ' + esc(i.on) : ''}</div>
    <div class="sm wrap" style="margin-top:4px">${esc(i.detail)}</div>${i.expect ? `<div class="xs mut" style="margin-top:2px">Expected: ${esc(i.expect)}</div>` : ''}</div></div>`;
  const files = d.files.map(f => `<div class="li"><div class="tx"><div class="t1 mono" style="font-size:13px">${esc(f.name)}</div><div class="t2">${f.at ? 'written ' + ago(f.at) : 'not found'}</div></div><div class="r">${f.mb == null ? '' : f.mb >= 1024 ? (f.mb / 1024).toFixed(1) + ' GB' : f.mb.toFixed(1) + ' MB'}</div></div>`).join('');
  return `<div class="row" style="margin-bottom:10px"><div class="chips"><span class="tag ok">${c('ok')} fresh</span><span class="tag warn">${c('stale')} stale</span><span class="tag">${c('unknown')} unknown</span></div><div class="sp"></div><button class="ibtn" data-act="datarefresh" aria-label="Recheck now">${ico('refresh', S.busy.dat ? 'spin' : '')}</button></div>
  <div class="sm mut" style="margin:0 2px 8px">Checked against the last completed market day: <b>${esc(d.expectedSession)}</b></div>
  <div class="grid c2">${groups.map(g => `<div><div class="gh">${esc(g)}</div><section class="card rows" style="padding-top:2px;padding-bottom:2px">${items.filter(i => i.group === g).sort((a, b) => rank[a.status] - rank[b.status]).map(card).join('')}</section></div>`).join('')}</div>
  <div class="gh">Database files</div><section class="card rows">${files}</section>`;
}

/* ───────────── CONTROL ───────────── */
function vControl() {
  const sv = services(), s = S.sched;
  const svc = sv.map(x => `<div class="jc"><div class="h"><span class="dot ${x.state === 'active' ? 'ok' : x.expect ? 'bad' : ''}"></span><div class="t1">${esc(x.label)}</div><span class="tag ${x.state === 'active' ? 'ok' : x.expect ? 'bad' : ''}">${esc(x.state === 'active' ? 'running' : x.state)}</span></div>
    <div class="sm mut" style="margin:4px 0 0 16px">${esc(x.about)}</div><div class="m" style="margin-left:16px"><span>Up</span><b>${x.state === 'active' ? span(x.uptime_s || 0) : '–'}</b><span>Memory</span><b>${x.mem_mb ? mb(x.mem_mb) : '–'}</b>${x.restarts != null ? `<span>Restarts</span><b>${x.restarts}</b>` : ''}</div>
    <div style="margin:10px 0 0 16px;display:flex;gap:8px;flex-wrap:wrap">${x.actions.map(a => `<button class="btn ${a === 'stop' ? 'ghost' : a === 'restart' ? '' : 'ghost'} sm" data-act="svc" data-key="${x.key}" data-action="${a}" ${x.state !== 'active' && a === 'stop' ? 'disabled' : ''}>${a[0].toUpperCase() + a.slice(1)}</button>`).join('') || '<span class="xs mut">Not controlled from here</span>'}</div></div>`).join('');
  const rn = s ? Object.entries(s.runnable).map(([k, v]) => ({ k, ...v })) : [];
  const running = new Set((s ? s.running : []).map(r => r.job));
  const grp = k => k.startsWith('lab-') ? 'Lab' : k.startsWith('intel-') ? 'News' : k.startsWith('sched-') || k === 'watchdog' || k === 'corp-actions' || k === 'trendlyne' ? 'Data & end of day' : 'Other';
  const by = {}; rn.forEach(r => (by[grp(r.k)] = by[grp(r.k)] || []).push(r));
  const runs = Object.entries(by).map(([g, l]) => `<div class="gh">${g}</div><section class="card rows" style="padding-top:2px;padding-bottom:2px">${l.map(r => `<div class="li"><div class="tx"><div class="t1">${esc(r.label)}</div><div class="t2">${r.heavy ? 'heavy · needs 900 MB free, after market' : 'light'}</div></div>${running.has(r.k) ? '<span class="tag acc">running</span>' : `<button class="btn ghost sm" data-act="run" data-key="${esc(r.k)}" data-label="${esc(r.label)}">${ico('play')} Run</button>`}</div>`).join('')}</section>`).join('');
  const o = S.ov;
  return `<div class="grid cols"><div><div class="gh" style="margin-top:0">Services</div><section class="card rows" style="padding-top:2px;padding-bottom:2px">${svc || skeleton()}</section>
    <div class="sm mut" style="margin:10px 2px">Trading jobs (price sync, 15:15 decisions, settlement) are never started from this page. Restarting the scheduler during market hours asks twice.</div></div>
    <div><div class="gh" style="margin-top:0">Run a job now</div>${runs || skeleton()}
    <div class="gh">Phone AI</div><section class="card"><div class="li" style="padding:0"><span class="dot ${o && o.ollama.up ? 'ok' : 'bad'}"></span><div class="tx"><div class="t1">Ollama on the phone</div><div class="t2">${o && o.ollama.up ? esc((o.ollama.models || []).join(', ')) + ' · ' + o.ollama.ms + ' ms' : 'not reachable: phone asleep, offline or tunnel down'}</div></div></div></section>
    <div class="gh">This page</div><section class="card"><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="theme">${ico('moon')} Dark / light</button><button class="btn ghost sm" data-act="signout">${ico('out')} Sign out</button></div><div class="xs mut" style="margin-top:10px">${esc(user.email)} · times shown in IST</div></section></div></div>`;
}

/* ───────────── LOGS ───────────── */
function vLogsShell() {
  const l = S.logs, ix = l.list;
  const opts = ix ? `<optgroup label="Log files">${ix.files.map(f => `<option value="${esc(f.name)}" ${f.name === l.file ? 'selected' : ''}>${esc(f.name)} · ${ago(f.at)}</option>`).join('')}</optgroup><optgroup label="Services (journal)">${ix.journals.map(j => `<option value="${esc(j.name)}" ${j.name === l.file ? 'selected' : ''}>${esc(j.label)}</option>`).join('')}</optgroup>` : `<option>${esc(l.file)}</option>`;
  return `<div class="logbar"><select id="lf" style="flex:1;min-width:0">${opts}</select><select id="ln"><option ${l.n === 100 ? 'selected' : ''}>100</option><option ${l.n === 200 ? 'selected' : ''}>200</option><option ${l.n === 400 ? 'selected' : ''}>400</option></select><button class="ibtn" data-act="logrefresh" aria-label="Refresh log">${ico('refresh')}</button></div>
  <div class="logbar"><input class="search" id="lq" placeholder="Filter lines (e.g. ERROR)" value="${esc(l.q)}" autocomplete="off" style="flex:1"><button class="chip" data-act="logauto" aria-pressed="${l.auto}">Live</button><button class="chip" data-act="logwrap" aria-pressed="${l.wrap}">Wrap</button></div>
  <div class="logbox ${l.wrap ? '' : 'nowrap'}" id="logbox" tabindex="0"></div><div class="xs mut" id="logmeta" style="margin:8px 2px"></div>`;
}
function paintLogs() {
  const b = $('#logbox'); if (!b) return;
  const l = S.logs, stick = b.scrollTop + b.clientHeight >= b.scrollHeight - 40 || !b.childElementCount;
  b.innerHTML = l.lines.length ? l.lines.map(x => `<div class="l ${/\b(ERROR|CRITICAL|Traceback|Exception|FAILED)\b/.test(x) ? 'e' : /\bWARN(ING)?\b/.test(x) ? 'w' : /\bINFO\b/.test(x) ? 'i' : ''}">${esc(x)}</div>`).join('') : '<div class="l i">No lines.</div>';
  if (stick) b.scrollTop = b.scrollHeight;
  const m = $('#logmeta'); if (m) m.textContent = `${l.lines.length} lines · file updated ${l.at ? ago(l.at) : '–'} · ${l.auto ? 'refreshing every 5 s' : 'paused'}`;
}

/* ───────────── shell + painting ───────────── */
const TABS = [['now', 'Now', 'now'], ['jobs', 'Jobs', 'jobs'], ['data', 'Data', 'data'], ['control', 'Control', 'ctl'], ['logs', 'Logs', 'logs']];
function shell() {
  document.title = 'Control · QuantSync';
  root.innerHTML = `<div class="app"><header class="top"><div class="logo"><svg viewBox="0 0 32 32"><path d="M7 21.5 12.5 15l4 3.5L25 9.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ttl">QuantSync<small id="clock"></small></div><div class="sp"></div><span id="pill"></span><button class="ibtn" data-act="refresh" aria-label="Refresh">${ico('refresh')}</button></header>
  <div id="banner"></div><main class="view" id="view"></main><nav class="tabs" aria-label="Sections">${TABS.map(([k, n, i]) => `<button class="tab" data-act="go" data-tab="${k}" aria-current="${S.tab === k ? 'page' : 'false'}">${ico(i)}${n}<span class="badge" id="b-${k}" hidden></span></button>`).join('')}</nav></div>`;
  enter(S.tab, false);
}
function enter(tab, scroll = true) {
  S.tab = tab; history.replaceState(null, '', '#' + tab);
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.tab === tab ? 'page' : 'false'));
  const v = $('#view'); v.innerHTML = tab === 'jobs' ? vJobsShell() : tab === 'logs' ? vLogsShell() : '';
  if (scroll) window.scrollTo(0, 0);
  if (tab === 'now') { L.met(); L.trd(); L.dat(); } else if (tab === 'jobs' || tab === 'control') L.sched(); else if (tab === 'data') L.dat(); else if (tab === 'logs') { L.logsList(); L.logs(); }
  paint();
}
function clock() { const ck = $('#clock'); if (ck) ck.textContent = `${fSec.format(new Date())} IST${S.lastOk ? ' · ' + Math.max(0, Math.round((Date.now() - S.lastOk) / 1000)) + 's ago' : ''}`; }
function paint() {
  if (!S.ready) return;
  const o = S.ov, al = o ? o.alerts : [], sev = sevOf(al);
  const pill = $('#pill'); if (pill) pill.innerHTML = o ? `<span class="pill ${sev === 'ok' ? '' : sev}"><span class="dot ${sev}"></span>${sev === 'ok' ? 'All good' : al.length + (al.length === 1 ? ' to check' : ' to check')}</span>` : '';
  clock();
  const bn = $('#banner'); if (bn) bn.innerHTML = S.err ? `<div class="banner">${ico('bolt')} ${esc(S.err)}</div>` : '';
  const byTab = {}; al.forEach(a => byTab[a.tab] = (byTab[a.tab] || 0) + 1);
  TABS.forEach(([k]) => { const b = $('#b-' + k); if (b) { const n = byTab[k] || 0; b.hidden = !n; b.textContent = n; } });
  const v = $('#view'); if (!v) return;
  if (S.tab === 'now') { if (S.scrub) return; v.innerHTML = vNow(); drawCharts(); }
  else if (S.tab === 'data') v.innerHTML = vData();
  else if (S.tab === 'control') v.innerHTML = vControl();
  else if (S.tab === 'jobs') paintJobs();
  else if (S.tab === 'logs') { /* controls stay put; lines paint themselves */ }
}
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S.ready && h !== S.tab && TABS.some(t => t[0] === h)) enter(h); });
window.addEventListener('resize', () => { if (S.ready && S.tab === 'now') drawCharts(); });

/* ───────────── actions ───────────── */
async function svcAction(key, action) {
  const s = services().find(x => x.key === key); if (!s) return;
  const verb = action[0].toUpperCase() + action.slice(1);
  if (!await sheet({ title: `${verb} ${s.label}?`, text: key === 'api' ? 'The website API drops for about 3 seconds while it restarts. This page reconnects by itself.' : action === 'stop' ? 'It stays off until you start it again.' : s.about, ok: verb, danger: action === 'stop' || key === 'scheduler' })) return;
  try {
    let r = await api(`/service/${key}/${action}`, { method: 'POST' });
    if (r.needsConfirm) { if (!await sheet({ title: 'The market is open', text: r.error, ok: 'Do it anyway', danger: true })) return; r = await api(`/service/${key}/${action}?confirm=true`, { method: 'POST' }); }
    toast(r.ok ? (r.note || `${s.label}: ${action} done`) : 'Failed: ' + (r.error || 'unknown error'));
  } catch (e) { toast(e.msg || 'Could not reach the server'); }
  setTimeout(() => { L.live(); L.ov(); }, 1500);
}
async function runJob(key, label) {
  const heavy = S.sched && S.sched.runnable[key] && S.sched.runnable[key].heavy;
  if (!await sheet({ title: `Run ${label} now?`, text: heavy ? 'This one is heavy. It needs about 900 MB of free RAM and should not run while the market is open.' : 'It runs in the background. You can watch it under Logs.', ok: 'Run now' })) return;
  try {
    let r = await api(`/run/${key}`, { method: 'POST' });
    if (!r.ok && /RAM|Market/i.test(r.error || '')) { if (!await sheet({ title: 'Not a good time', text: r.error + ' Run it anyway?', ok: 'Run anyway', danger: true })) return; r = await api(`/run/${key}?force=true`, { method: 'POST' }); }
    if (r.ok) { toast('Started. Opening its log.'); S.logs.file = r.log; S.logs.q = ''; L.sched(); enter('logs'); } else toast(r.error || 'Could not start');
  } catch (e) { toast(e.msg || 'Could not reach the server'); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || !S.ready) return; const a = b.dataset.act;
  if (a === 'go') enter(b.dataset.tab);
  else if (a === 'refresh') { b.firstElementChild.classList.add('spin'); refreshAll(); setTimeout(() => b.firstElementChild.classList.remove('spin'), 900); }
  else if (a === 'range') { S.range = b.dataset.v; S.met = null; L.met(); paint(); }
  else if (a === 'filter') { S.filter = b.dataset.v; paintJobs(); }
  else if (a === 'svc') svcAction(b.dataset.key, b.dataset.action);
  else if (a === 'run') runJob(b.dataset.key, b.dataset.label);
  else if (a === 'datarefresh') L.dat(true);
  else if (a === 'openlog') { S.logs.file = b.dataset.file; enter('logs'); }
  else if (a === 'logrefresh') L.logs();
  else if (a === 'logauto') { S.logs.auto = !S.logs.auto; b.setAttribute('aria-pressed', S.logs.auto); paintLogs(); }
  else if (a === 'logwrap') { S.logs.wrap = !S.logs.wrap; b.setAttribute('aria-pressed', S.logs.wrap); $('#logbox').classList.toggle('nowrap', !S.logs.wrap); }
  else if (a === 'theme') { const d = document.documentElement, cur = d.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'); d.dataset.theme = cur === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('rahul-theme', d.dataset.theme); } catch { /* private mode */ } }
  else if (a === 'signout') (async () => { const f = await fb(); await f.signOut(); })();
});
document.addEventListener('input', e => {
  if (e.target.id === 'jq') { S.jq = e.target.value; paintJobs(); }
  if (e.target.id === 'lq') { S.logs.q = e.target.value; clearTimeout(S._lq); S._lq = setTimeout(() => L.logs(), 350); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'lf') { S.logs.file = e.target.value; L.logs(); }
  if (e.target.id === 'ln') { S.logs.n = +e.target.value; L.logs(); }
});

/* ───────────── boot ───────────── */
async function start(u) {
  user = u;
  if ((u.email || '').toLowerCase() !== OWNER) return show404();        // not you: stay a 404 and make no calls
  let me;
  try { me = await api('/me'); }
  catch (e) {
    if (e.gone) {                                                       // only the owner ever sees this diagnostic
      root.innerHTML = `<main class="nf"><h1>404</h1><p class="nf1">This page could not be found.</p><p class="nf2">Owner note: the server answered 404. The control API is not deployed on the VPS yet, or your token was refused.<br><a href="">Try again</a></p></main>`; return;
    }
    root.innerHTML = `<main class="nf"><h1>…</h1><p class="nf1">The server is not reachable.</p><p class="nf2"><a href="">Try again</a></p></main>`; return;
  }
  try { const t = localStorage.getItem('rahul-theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* ignore */ }
  const h = location.hash.slice(1); if (TABS.some(t => t[0] === h)) S.tab = h;
  S.ready = true; shell(); L.live(); L.ov(); startPolling();
}
(async function boot() {
  try { const t = localStorage.getItem('rahul-theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* ignore */ }
  if (LOCAL && window.__RAHUL_TEST__) { return start({ email: OWNER, getIdToken: async () => 'test-token' }); }   // local preview only
  try {
    const a = await fb();
    a.onAuthStateChanged(u => { if (u) start(u); else show404(); });
  } catch { show404(); }
})();
