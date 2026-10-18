/* QuantSync app: data layer. Every number on every page comes through here from the live APIs.
   Main API  : /api/...        (server.py on the VPS)
   Lab API   : /lab/v1/...     (quantsync-lab, served on the same domain by nginx)
   On Vercel the Lab is reached through the rewrite /lab/api/:path* -> VPS /lab/:path*. */
(function () {
'use strict';
const W = window;
const onVercel = !/duckdns\.org$/.test(location.hostname) && location.port !== '8443' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';

/* ---------------- server settings (Settings page, /app/config) ----------------
   Profiles say where the Lab API lives. "phone" is the default: the phone server's public
   tunnel URL (Cloudflare Tunnel). Until a phone URL is saved, the phone profile falls back to
   this site's proxy (/lab/api/v1), which Vercel forwards to the server in vercel.json.
   Everything is stored in this browser only (localStorage "qs-cfg"). */
const EP = W.QS_ENDPOINTS || {};  /* set once, from /config.js (Vercel variables QS_SERVER / QS_LAB_URL) */
const PHONE_URL = EP.lab || '';  // blank = this site's proxy, which forwards to QS_SERVER
const SITE_LAB = onVercel ? '/lab/api/v1' : '/lab/v1';
const DEFAULTS = { profile: 'phone', phone: PHONE_URL, local: 'http://localhost:8100', custom: '', api: '/api', signin: 'google', devUid: 'local' };
const PROFILES = {
  phone: { name: 'Phone server', note: 'Your phone running the Lab, through its tunnel URL. Default.' },
  local: { name: 'This computer', note: 'A Lab running on your laptop (python -m lab.api style, port 8100).' },
  site: { name: 'Site proxy', note: 'This website forwards to the server set in Vercel (QS_SERVER).' },
  custom: { name: 'Custom URL', note: 'Any other address that serves /lab/v1.' },
};
function readCfg() { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('qs-cfg') || '{}')); } catch { return { ...DEFAULTS }; } }
/** Turn what someone typed into the Lab API base: adds https:// and /lab/v1 when missing. */
function labBase(u) {
  u = String(u || '').trim().replace(/\/+$/, ''); if (!u) return '';
  if (u.startsWith('/')) return u;
  if (!/^https?:\/\//i.test(u)) u = (/^(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(u) ? 'http://' : 'https://') + u;
  return /\/lab\/(api\/)?v1$/.test(u) ? u : u + '/lab/v1';
}
function resolveLab(s) {
  const p = s.profile;
  const raw = p === 'phone' ? s.phone : p === 'local' ? s.local : p === 'custom' ? s.custom : '';
  return labBase(raw) || SITE_LAB;
}
const saved = readCfg();
const CFG = Object.assign({
  api: saved.api || '/api',
  lab: resolveLab(saved),
  firebase: { apiKey: 'AIzaSyDE7DrgzliyLF6SFbJi7lKqOsAvK3rtrIU', authDomain: 'scantoknow-a1593.firebaseapp.com', projectId: 'scantoknow-a1593', appId: '1:220667916508:web:f105873ba57909e18f0419' },
  firebaseVersion: '10.12.2',
}, saved.signin === 'dev' ? { devUid: saved.devUid || 'local', devName: 'Local user' } : {}, W.QS_CONFIG || {});
const settings = {
  get: readCfg, PROFILES, DEFAULTS, labBase, resolveLab, SITE_LAB,
  active: () => ({ profile: saved.profile, lab: CFG.lab, api: CFG.api, fallback: CFG.lab === SITE_LAB && saved.profile !== 'site' }),
  save(next) { try { localStorage.setItem('qs-cfg', JSON.stringify(Object.assign(readCfg(), next))); } catch { throw new Error('This browser blocked saving settings.'); } },
  reset() { try { localStorage.removeItem('qs-cfg'); } catch { /* blocked */ } },
  /** Check a Lab base URL: reachable, version, data date, sign-in mode, round-trip time. */
  async probe(base) {
    const t0 = performance.now(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(base + '/health', { headers: { Accept: 'application/json' }, signal: ctl.signal });
      const ms = Math.round(performance.now() - t0);
      if (!r.ok) return { ok: false, ms, error: `Server answered ${r.status}` };
      const j = await r.json(); const d = (j.data || {})['1D'] || {};
      return { ok: !!j.ok, ms, version: j.version, asOf: d.as_of, symbols: d.symbols, auth: (j.auth || {}).mode };
    } catch (e) {
      return { ok: false, ms: Math.round(performance.now() - t0), error: e.name === 'AbortError' ? 'No answer in 8 seconds' : 'Could not connect (server off, wrong URL, or blocked by CORS)' };
    } finally { clearTimeout(tm); }
  },
};

/* ---------------- auth (Firebase Google sign-in) ---------------- */
const auth = { user: null, ready: false, _subs: new Set(), _fb: null };
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Could not load ' + src)); document.head.append(s); }); }
let fbReady = null;
function fb() {
  if (CFG.devUid) return Promise.resolve(null);
  if (!fbReady) fbReady = (async () => {
    const v = CFG.firebaseVersion;
    await loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-auth-compat.js`);
    if (!W.firebase.apps.length) W.firebase.initializeApp(CFG.firebase);
    const a = W.firebase.auth();
    await new Promise(res => { const off = a.onAuthStateChanged(u => { auth.user = u; auth.ready = true; auth._subs.forEach(f => f(u)); res(); }); auth._off = off; });
    auth._fb = a;
    return a;
  })().catch(e => { console.warn('[auth]', e); auth.ready = true; auth._subs.forEach(f => f(null)); return null; });
  return fbReady;
}
auth.init = fb;
if (CFG.devUid) { // local testing only: the Lab in auth_mode=dev reads X-Dev-Uid instead of a Firebase token
  auth.user = { uid: CFG.devUid, displayName: CFG.devName || 'Dev user', email: '' }; auth.ready = true;
  fbReady = Promise.resolve(null);
  auth.signIn = async () => {}; auth.signOut = async () => {};
}
auth.onChange = f => { auth._subs.add(f); if (auth.ready) f(auth.user); return () => auth._subs.delete(f); };
auth.signIn = async () => {
  const a = await fb(); if (!a) throw new Error('Sign-in is not available right now.');
  const p = new W.firebase.auth.GoogleAuthProvider();
  try { await a.signInWithPopup(p); } catch (e) { if (String(e.code).includes('popup')) await a.signInWithRedirect(p); else throw e; }
};
auth.signOut = async () => { const a = await fb(); if (a) await a.signOut(); };
auth.token = async () => {
  if (!auth.user) return null;
  try { return await Promise.race([auth.user.getIdToken(), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000))]); } catch { return null; }
};
auth.whenReady = () => auth.ready ? Promise.resolve(auth.user) : new Promise(res => { const off = auth.onChange(u => { off(); res(u); }); fb(); });

/* ---------------- http ---------------- */
class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
async function http(method, url, body, { authed = true, timeout, signal } = {}) {
  const h = { Accept: 'application/json' };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (authed && CFG.devUid) h['X-Dev-Uid'] = CFG.devUid;
  else if (authed) { const t = await auth.token(); if (t) h.Authorization = 'Bearer ' + t; }
  /* every request has a time limit (a slow server must not hang a page) and can be cancelled by the caller */
  const limit = timeout || (method === 'GET' ? 15000 : 30000);
  const send = hh => {
    const ctl = new AbortController(), tm = setTimeout(() => { ctl.timedOut = true; ctl.abort(); }, limit);
    if (signal) { if (signal.aborted) ctl.abort(); else signal.addEventListener('abort', () => ctl.abort(), { once: true }); }
    return fetch(url, { method, headers: hh, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal })
      .catch(e => { e.timedOut = !!ctl.timedOut; throw e; }).finally(() => clearTimeout(tm));
  };
  let r;
  const down = e => { const x = new ApiError(0, e && e.timedOut ? 'The server is slow right now. Try again in a moment.' : `Can't reach the Lab server (${CFG.lab}). Check it is running, or change it in Settings.`); x.timeout = !!(e && e.timedOut); return x; };
  const cancelled = () => !!(signal && signal.aborted);
  try { r = await send(h); } catch (e) {
    if (cancelled()) throw new ApiError(-1, 'cancelled');
    if (method !== 'GET') throw down(e);
    await sleep(800); try { r = await send(h); } catch (e2) { if (cancelled()) throw new ApiError(-1, 'cancelled'); throw down(e2); }
  }
  if (method === 'GET' && r.status >= 502 && r.status <= 504) { await sleep(900); r = await send(h); }
  if (r.status === 401 && h.Authorization && method === 'GET') { delete h.Authorization; r = await send(h); }
  if (!r.ok) {
    let msg = r.status >= 502 && r.status <= 504 ? 'The server is busy or restarting. Try again in a moment.' : r.status === 401 ? 'Sign in to continue.' : `Something went wrong (${r.status}). Please try again.`;
    try { const j = await r.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* keep */ }
    throw new ApiError(r.status, msg);
  }
  return r.json();
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cache = new Map();
function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.p;
  const p = fn().catch(e => { cache.delete(key); throw e; });
  cache.set(key, { t: Date.now(), p });
  return p;
}
const bust = prefix => { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); };
const q = o => '?' + Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const L = (m, p, b, o) => http(m, CFG.lab + p, b, o);
const A = (p, o) => http('GET', CFG.api + p, undefined, { authed: false, ...o });
const MIN = 60000;

/* ---------------- Lab API ---------------- */
const lab = {
  health: () => cached('lab:health', 5 * MIN, () => L('GET', '/health', undefined, { authed: false })),
  catalog: () => cached('lab:catalog', 60 * MIN, () => L('GET', '/catalog', undefined, { authed: false })),
  today: () => cached('lab:today:' + uidKey(), 2 * MIN, () => L('GET', '/today')),
  /** Entered/left events for the strategies switched on, built on the server in one request. */
  changes: (days = 30) => cached('lab:changes:' + uidKey() + ':' + days, MIN, () => L('GET', '/changes?days=' + days)),
  matches: () => cached('lab:matches:' + uidKey(), MIN, () => L('GET', '/matches').then(m => { const rows = mergeQ(m.rows || []), nl = rows.filter(r => r.latest).length; return { ...m, rows, counts: { latest: nl, older: rows.length - nl } }; })),
  alerts: () => cached('lab:alerts:' + uidKey(), MIN, () => L('GET', '/alerts')),
  scan: (tf, entry, signal) => L('POST', '/scan', { tf, entry }, { authed: false, timeout: 20000, signal }),
  /** Ready-made screens, worked out ahead of time on the server: one small answer for every card. */
  board: (signal) => L('GET', '/screens/board', undefined, { authed: false, timeout: 12000, signal }),
  screenFull: (id, signal) => cached('lab:screen:' + id, 2 * MIN, () => L('GET', '/screens/' + encodeURIComponent(id), undefined, { authed: false, timeout: 12000, signal })),
  backtest: (tf, entry, exit) => L('POST', '/backtest', { tf, entry, exit }),
  job: id => L('GET', '/jobs/' + id),
  strategies: scope => cached(`lab:strats:${scope}:${uidKey()}`, 2 * MIN, () => L('GET', '/strategies' + q({ scope }), undefined, { authed: scope === 'mine' || scope === 'people' })),
  strategy: id => L('GET', '/strategies/' + id),
  strategyBacktest: (id, variant) => L('GET', `/strategies/${id}/backtest` + (variant ? `?variant=${encodeURIComponent(variant)}` : '')),
  createStrategy: b => L('POST', '/strategies', b).then(x => { bust('lab:'); return x; }),
  copyStrategy: id => L('POST', `/strategies/${id}/copy`).then(x => { bust('lab:'); return x; }),
  trades: (id, status) => L('GET', `/strategies/${id}/trades` + q({ status })),
  follow: (id, on, alerts) => L('POST', `/strategies/${id}/follow` + q({ on, alerts })).then(x => { bust('lab:'); return x; }),
  setVisibility: (id, pub) => L('POST', `/strategies/${id}/visibility` + q({ public: pub })).then(x => { bust('lab:'); return x; }),
  enhance: id => L('POST', `/strategies/${id}/enhance`),
  enhancement: id => L('GET', `/strategies/${id}/enhancement`),
  setGate: (id, gate) => L('POST', `/strategies/${id}/ai-gate`, { gate }).then(x => { bust('lab:'); return x; }),
  enhanceExit: (id, gate) => L('POST', `/strategies/${id}/enhance-exit`, { gate }),
  setExitChoice: (id, choice) => L('POST', `/strategies/${id}/exit-choice`, { choice }).then(x => { bust('lab:'); return x; }),
  portfolio: status => cached(`lab:pf:${status}:${uidKey()}`, MIN, () => L('GET', '/me/portfolio' + q({ status }))),
  chart: (sym, tf = '1D', n = 180) => cached(`lab:chart:${sym}:${tf}:${n}`, 10 * MIN, () => L('GET', `/chart/${encodeURIComponent(sym)}` + q({ tf, n }), undefined, { authed: false })),
  chartBatch: (syms, n = 60, tf = '1D') => {
    const list = [...new Set(syms.filter(Boolean))].slice(0, 40);
    if (!list.length) return Promise.resolve({ bars: {} });
    return cached(`lab:cb:${tf}:${n}:${list.join(',')}`, 10 * MIN, () => L('GET', '/chart-batch' + q({ symbols: list.join(','), n, tf }), undefined, { authed: false }));
  },
  benchmark: (start, tf = '1D') => cached(`lab:bench:${tf}:${start || ''}`, 30 * MIN, () => L('GET', '/benchmark' + q({ tf, start }), undefined, { authed: false }).catch(() => ({ points: [] }))),
  symbolStrategies: sym => cached('lab:symstrat:' + sym + uidKey(), 2 * MIN, () => L('GET', `/symbol/${encodeURIComponent(sym)}/strategies`).then(r => ({ ...r, rows: mergeQ(r.rows || []) }))),
  holdings: () => L('GET', '/me/holdings'),
  saveHoldings: items => L('PUT', '/me/holdings', { items }),
};
/** QuantSync's house strategies are shown as one: QuantSync AI. Same stock found by both counts once, from its first match. */
function mergeQ(rows) {
  const out = [], seen = new Map();
  rows.forEach(r => {
    if (r.cat !== 'q') { out.push(r); return; }
    const x = { ...r, strategy: 'QuantSync AI', sid: 'qsai' }, p = seen.get(r.symbol);
    if (!p) { seen.set(r.symbol, x); out.push(x); } else if (String(x.date || '') < String(p.date || '')) Object.assign(p, x);
  });
  return out;
}
function uidKey() { return auth.user ? auth.user.uid : 'anon'; }
async function waitJob(id, onTick, signal) {
  for (;;) {
    const j = await lab.job(id);
    onTick && onTick(j);
    if (j.status === 'done') return j;
    if (j.status === 'failed') throw new ApiError(500, j.error || 'The job failed.');
    if (signal && signal.aborted) throw new Error('aborted');
    await sleep(1500);
  }
}

/* ---------------- Main API ---------------- */
const api = {
  summary: () => cached('api:summary', 30 * MIN, () => A('/app/summary').catch(() => ({}))),
  xray: syms => {
    const list = [...new Set(syms.filter(Boolean).map(s => String(s).toUpperCase()))].slice(0, 60);
    if (!list.length) return Promise.resolve({});
    return cached('api:xb:' + list.join(','), 15 * MIN, () => A('/app/xray-batch' + q({ symbols: list.join(',') })).then(r => r.items || {}).catch(() => ({})));
  },
  report: sym => cached('api:dna:' + sym, 15 * MIN, () => A(`/dna/report/${encodeURIComponent(sym)}`)),
  search: s => cached('api:search:' + s.toLowerCase(), 10 * MIN, () => A('/dna/search' + q({ q: s }))),
  discovery: () => cached('api:disc', 30 * MIN, () => A('/dna/discovery')),
  peers: sym => cached('api:peers:' + sym, 30 * MIN, () => A(`/sector-peers/${encodeURIComponent(sym)}`).catch(() => [])),
  news: (sym, limit = 6) => cached(`api:news:${sym || ''}:${limit}`, 15 * MIN, () => A('/intel/news' + q({ limit, stock: sym })).catch(() => ({ news: [] }))),
  pulse: () => cached('api:pulse', 5 * MIN, () => A('/intel/pulse').catch(() => null)),
  sectors: (period = 'day') => cached('api:sectors:' + period, 10 * MIN, () => A('/intel/sectors' + q({ period })).catch(() => null)),
  breakouts: () => cached('api:brk', 10 * MIN, () => A('/screener/breakouts').catch(() => ({}))),
  screener: o => cached('api:scr:' + JSON.stringify(o), 10 * MIN, () => A('/screener' + q(o)).catch(() => ({ rows: [] }))),
};

/* ---------------- Intel API: filings, deals, insiders, briefs (VPS /api/intel2) ----------------
   Memory + sessionStorage cache: a revisit paints instantly from the last answer, and if the server is
   unreachable the last good answer is shown (marked stale) instead of an empty page. */
const I = p => http('GET', CFG.api + '/intel2' + p, undefined, { authed: false });
function keep(key, ttl, fn) {
  const sk = 'qs-c:' + key;
  return cached(key, ttl, async () => {
    let old = null;
    try { old = JSON.parse(sessionStorage.getItem(sk) || 'null'); } catch { /* blocked */ }
    if (old && Date.now() - old.t < ttl) return old.v;
    try {
      const v = await fn();
      try { sessionStorage.setItem(sk, JSON.stringify({ t: Date.now(), v })); } catch { /* full or blocked */ }
      return v;
    } catch (e) { if (old) return Object.assign(old.v, { _stale: true }); throw e; }
  });
}
const intel = {
  events: (o = {}) => keep('in:ev:' + JSON.stringify(o), 30e3, () => I('/events' + q(o))),
  event: id => keep('in:e:' + id, 5 * MIN, () => I('/events/' + encodeURIComponent(id))),
  top: (hours = 24, limit = 20) => keep(`in:top:${hours}:${limit}`, MIN, () => I('/top' + q({ hours, limit }))),
  stock: sym => keep('in:stk:' + sym, MIN, () => I('/stock/' + encodeURIComponent(sym))),
  brief: (kind = 'auto') => keep('in:brief:' + kind, 2 * MIN, () => I('/brief' + q({ kind }))),
  deals: (days = 5) => keep('in:deals:' + days, 5 * MIN, () => I('/deals' + q({ days }))),
  insiders: (days = 30) => keep('in:ins:' + days, 5 * MIN, () => I('/insiders' + q({ days }))),
  calendar: (days = 14) => keep('in:cal:' + days, 10 * MIN, () => I('/calendar' + q({ days }))),
  markets: () => keep('in:mk', 60e3, () => I('/markets')),
  home: () => keep('in:home', 2 * MIN, () => I('/home')),
  status: () => I('/status'),
};

/* ---------------- formatting ---------------- */
const n = v => (v == null || v === '' ? NaN : typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₹%]/g, '')));
const ok = v => Number.isFinite(n(v));
const fmt = {
  inr: (v, dp) => ok(v) ? '₹' + n(v).toLocaleString('en-IN', { maximumFractionDigits: dp ?? (Math.abs(n(v)) < 100 ? 2 : 0), minimumFractionDigits: dp ?? 0 }) : '—',
  pct: (v, dp = 1) => ok(v) ? (n(v) > 0 ? '+' : n(v) < 0 ? '−' : '') + Math.abs(n(v)).toFixed(dp) + '%' : '—',
  plain: (v, dp = 0) => ok(v) ? n(v).toFixed(dp) + '%' : '—',
  int: v => ok(v) ? Math.round(n(v)).toLocaleString('en-IN') : '—',
  num: (v, dp = 2) => ok(v) ? n(v).toLocaleString('en-IN', { maximumFractionDigits: dp }) : '—',
  cr: v => { if (!ok(v)) return '—'; const x = n(v); return x >= 1e5 ? '₹' + (x / 1e5).toFixed(2) + ' lakh cr' : '₹' + Math.round(x).toLocaleString('en-IN') + ' cr'; },
  date: d => { if (!d) return '—'; const t = new Date(String(d).slice(0, 10) + 'T00:00:00'); return isNaN(t) ? String(d) : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); },
  dateY: d => { if (!d) return '—'; const t = new Date(String(d).slice(0, 10) + 'T00:00:00'); return isNaN(t) ? String(d) : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); },
  rel: d => { if (!d) return ''; const t = new Date(String(d).slice(0, 10) + 'T00:00:00'), now = new Date(); now.setHours(0, 0, 0, 0); const k = Math.round((now - t) / 864e5); return k <= 0 ? 'Today' : k === 1 ? 'Yesterday' : k < 7 ? t.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : fmt.dateY(d); },
  tone: v => ok(v) ? (n(v) > 0 ? 'up' : n(v) < 0 ? 'dn' : '') : '',
  esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
};
const scoreTone = s => !ok(s) ? { k: '', t: 'No score', c: 'var(--ink3)' } : s >= 70 ? { k: 'up', t: 'Healthy', c: 'var(--up)' } : s >= 45 ? { k: 'warn', t: 'Mixed', c: 'var(--warn)' } : { k: 'dn', t: 'Weak', c: 'var(--dn)' };
function marketStatus() {
  const now = new Date(), ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  const d = ist.getDay(), m = ist.getHours() * 60 + ist.getMinutes();
  const open = d >= 1 && d <= 5 && m >= 555 && m <= 930;
  return { open, text: (open ? 'Market open · ' : 'Market closed · ') + ist.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) };
}
const param = k => new URLSearchParams(location.search).get(k);

/* ---------------- rules: presets and plain-English ---------------- */
const c = (l, op, r) => ({ l: { f: l }, op, ...(r === undefined ? {} : { r: typeof r === 'string' ? { f: r } : Array.isArray(r) ? { list: r } : { c: r } }) });
const PRESETS = [
  ['sig-alpha', 'QuantSync momentum signals', 'Any of our three momentum breakouts: RS leader, Stage-2 base breakout, or power gap.', 'QuantSync', '1D', 'any', [c('sig_rs_leader', 'is_true'), c('sig_stage2_base', 'is_true'), c('sig_power_gap', 'is_true')]],
  ['sig-pattern', 'QuantSync chart-pattern signals', 'An apex base breakout or a high tight flag, our two chart-structure setups.', 'QuantSync', '1D', 'any', [c('sig_apex_base', 'is_true'), c('sig_high_tight_flag', 'is_true')]],
  ['sig-rs', 'RS leader breakout', 'A strong stock breaks its 20-bar high on 2× volume with a firm close.', 'QuantSync', '1D', 'all', [c('sig_rs_leader', 'is_true')]],
  ['sig-s2', 'Stage-2 base breakout', 'A 3-month base breaks out while the 30-week average turns up.', 'QuantSync', '1D', 'all', [c('sig_stage2_base', 'is_true')]],
  ['ema-cross', 'EMA crossover', 'The fast average (EMA 9) moves above the slower one (EMA 21) today.', 'Trend', '1D', 'all', [c('ema_9', 'crosses_above', 'ema_21')]],
  ['macd-cross', 'MACD crossover', 'The MACD line crosses above its signal line today.', 'Momentum', '1D', 'all', [c('macd', 'crosses_above', 'macd_signal')]],
  ['rsi-turn', 'RSI turning up', 'RSI (14) crosses above its own 10-bar EMA while still below 60.', 'Momentum', '1D', 'all', [c('rsi_14', 'crosses_above', 'rsi_ema_10'), c('rsi_14', '<', 60)]],
  ['golden', 'Golden cross', 'The 50-day average crosses above the 200-day average.', 'Trend', '1D', 'all', [c('sma_50', 'crosses_above', 'sma_200')]],
  ['hh52', '52-week high breakout', 'Closes above the prior 52-week high on strong volume.', 'Breakout', '1D', 'all', [c('close', '>', 'hh_52'), c('vol_ratio', '>', 1.5)]],
  ['vol-surge', 'Volume surge', 'Traded at least 2× its 20-day average volume and closed up 2% or more.', 'Volume', '1D', 'all', [c('vol_ratio', '>', 2), c('ret_1', '>', 2)]],
  ['strong-trend', 'Strong uptrend', 'ADX above 25, with price above both its 50 and 200-day averages.', 'Trend', '1D', 'all', [c('adx_14', '>', 25), c('close', '>', 'sma_50'), c('close', '>', 'sma_200')]],
  ['oversold', 'Oversold bounce', 'RSI below 35 and today finished as a green candle.', 'Reversal', '1D', 'all', [c('rsi_14', '<', 35), c('is_green', 'is_true')]],
  ['bb-break', 'Bollinger breakout', 'Price closes above the upper Bollinger band.', 'Breakout', '1D', 'all', [c('close', 'crosses_above', 'bb_upper')]],
  ['pullback', 'Pullback in uptrend', 'Above the 200-day average, RSI cooled to 35–45.', 'Reversal', '1D', 'all', [c('close', '>', 'sma_200'), c('rsi_14', 'between', [35, 45])]],
  ['either', 'EMA or MACD crossover', 'Either signal fires: the EMA 9/21 crossover or the MACD crossover.', 'Momentum', '1D', 'any', [c('ema_9', 'crosses_above', 'ema_21'), c('macd', 'crosses_above', 'macd_signal')]],
  ['weekly-trend', 'Weekly trend start', 'On the weekly chart, EMA 10 moves above EMA 20.', 'Trend', '1W', 'all', [c('ema_10', 'crosses_above', 'ema_20')]],
].map(([id, name, blurb, tag, tf, mode, conds]) => ({ id, name, blurb, tag, tf, mode, conds }));
const toRule = (mode, conds) => ({ v: 1, [mode]: conds });
function fromRule(r) {
  const mode = r && r.any ? 'any' : 'all';
  const items = (r && r[mode]) || [];
  const flat = items.every(x => x && x.l);
  return { mode, conds: flat ? items : null, nested: !flat };
}
const label = (cat, key) => (cat && cat.features.find(f => f.key === key) || {}).label || key || '';
const opLabel = (cat, op) => (cat && cat.operators.find(o => o.op === op) || {}).label || op;
function operand(cat, o) { if (!o) return ''; if (o.f) return label(cat, o.f); if (o.list) return o.list.join(' and '); return String(o.c); }
function describeCond(cat, x) { return `${operand(cat, x.l)} ${opLabel(cat, x.op)}${x.op === 'is_true' ? '' : ' ' + operand(cat, x.r)}`; }
function describeRule(cat, r) {
  const walk = (g, d) => { const mode = g.any ? 'any' : 'all'; return (g[mode] || []).flatMap(x => x.l ? [{ d, t: describeCond(cat, x) }] : [{ d, t: (x.any ? 'Any of:' : 'All of:') }, ...walk(x, d + 1)]); };
  return { head: r && r.any ? 'Any one of these is enough' : 'All of these must be true', lines: r ? walk(r, 0) : [] };
}
function describeExit(cat, e) {
  if (!e || !e.any || !e.any.length) return ['Held until the safety time limit (60 daily or 26 weekly bars)'];
  return e.any.map(i => { const t = (cat && cat.exits.find(x => x.type === i.type)) || {}; return i.type === 'rule' ? 'When the exit rule is true' : `${t.label || i.type}: ${i.v}${t.unit === '%' ? '%' : ' ' + (t.unit || '')}`; });
}
function buildExit(stop, target, time) {
  const any = []; const v = s => (String(s).trim() === '' ? null : Number(s));
  if (v(stop)) any.push({ type: 'stop_pct', v: v(stop) });
  if (v(target)) any.push({ type: 'target_pct', v: v(target) });
  if (v(time)) any.push({ type: 'time', v: Math.round(v(time)) });
  return { v: 1, any };
}
const validCond = x => !!(x && x.l && x.l.f) && (x.op === 'is_true' || (x.op === 'between' ? x.r && x.r.list && x.r.list.length === 2 && x.r.list.every(Number.isFinite) : x.r && (x.r.f != null || Number.isFinite(x.r.c))));

/* ---------------- AI options (same rules as the Lab UI: the AI chooses, the user applies) ---------------- */
const MIN_RESULTS = 30;
const nn = v => (v == null ? -Infinity : v);
function pickOptions(r) {
  if (!r || !r.edge_found || (r.leak && r.leak.passed === false)) return [];
  const plain = r.plain;
  const el = Object.entries(r.gates || {}).map(([g, x]) => ({ gate: Number(g), s: x.All })).filter(({ s }) => s && s.trades >= MIN_RESULTS && nn(s.win_rate) >= nn(plain.win_rate) + 1 && nn(s.avg_ret) > nn(plain.avg_ret));
  if (!el.length) return [];
  const quality = [...el].sort((a, b) => nn(b.s.win_rate) - nn(a.s.win_rate) || b.s.trades - a.s.trades)[0];
  const volume = el.filter(e => e.gate !== quality.gate && e.s.trades >= quality.s.trades * 1.5).sort((a, b) => b.s.trades - a.s.trades)[0];
  if (!volume) return [{ gate: quality.gate, kind: 'winner', title: 'Keep the stronger matches', blurb: 'The AI keeps the matches that tended to work and leaves out the weaker ones.' }];
  return [
    { gate: quality.gate, kind: 'quality', title: 'Fewer matches, higher win rate', blurb: 'The pickiest version. Fewer stocks match, and more of them worked out.' },
    { gate: volume.gate, kind: 'volume', title: 'More matches, still better', blurb: 'A relaxed version. More stocks match, and it still beats your original.' },
  ];
}
const gateStat = (r, gate, year) => { const g = (r.gates || {})[String(gate)] || {}; return (year === 'All' ? g.All : g[year]) || { trades: 0, win_rate: null, avg_ret: null }; };
const plainStat = (r, year) => year === 'All' ? r.plain : ((r.plain_by_year || {})[year] || r.plain);
const exitGate = (inUse, options) => inUse != null ? inUse : (options[0] ? options[0].gate : null);

/* ---------------- patterns (screener feed; same mapping as the current app) ---------------- */
function stageOf(r, origin) {
  const st = String((r.trade_call && r.trade_call.state) || r.trade_state || '').toUpperCase();
  if (st && st !== 'NA') {
    if (st === 'BREAKOUT' || st === 'WEAK_BREAKOUT') return 'Breakout';
    if (st === 'NEAR' || st === 'ATTEMPT') return 'Near';
    if (st === 'RETEST_HOLD' || st === 'RETEST_WATCH') return 'Retest';
    if (st === 'BUILDING' || st === 'FORMING') return 'Forming';
    return 'Other';
  }
  const bs = String(r.breakout_status || '').toUpperCase(), ps = String(r.pattern_stage || '').toUpperCase(), ex = String(r.execution_state || '').toUpperCase();
  if (bs === 'TARGET_ACHIEVED' || ex.includes('TARGET')) return 'Other';
  if (origin === 'retest') return 'Retest';
  if (origin === 'near' || ex === 'NEAR' || ps === 'NEAR_BREAKOUT') return 'Near';
  if (bs === 'SUCCESS' || bs === 'POST_BREAKOUT') { const g = n(r.curr_price) / n(r.breakout_level) - 1; return Number.isFinite(g) && g >= -0.02 && g <= 0.06 ? 'Breakout' : 'Other'; }
  if (ps === 'FORMING' || bs === 'PENDING') return 'Forming';
  return 'Other';
}
function toPattern(r, origin) {
  const tc = r.trade_call || {}, cf = tc.confidence;
  return {
    sym: r.symbol, name: r.company_name || r.symbol, sector: r.sector || '', tf: String(r.timeframe || tc.tf || 'DAILY').toUpperCase(),
    stage: stageOf(r, origin), action: String(tc.action || r.trade_action || 'NONE').toUpperCase(), grade: tc.grade || '',
    price: n(r.curr_price != null ? r.curr_price : tc.price), level: n(tc.level != null ? tc.level : r.breakout_level), stop: n(r.stop_loss), target: n(r.target_1),
    pattern: String(r.pattern_type || '').split('·')[0].trim(), notes: Array.isArray(tc.notes) ? tc.notes : [],
    conf: cf && cf.n != null ? { label: cf.label, text: cf.text, win: n(cf.win_rate) * 100, hit: n(cf.p_target) * 100, avgPct: n(cf.expectancy_pct), n: n(cf.n) } : cf ? { label: cf.label, text: cf.text } : null,
    xray: n(r.dna_score),
  };
}
async function loadPatterns() {
  return cached('api:patterns', 10 * MIN, async () => {
    const [br, rows] = await Promise.all([api.breakouts(), api.screener({ limit: 200 })]);
    const seen = new Map();
    const add = (l, o) => (l || []).forEach(r => { const k = `${r && r.symbol}|${(r && r.timeframe) || ''}`; if (r && r.symbol && !seen.has(k)) seen.set(k, toPattern(r, o)); });
    add(br.success, 'success'); add(br.retest, 'retest'); add(br.near_breakout, 'near'); add(rows.rows, '');
    const list = [...seen.values()].filter(p => p.stage !== 'Other' && Number.isFinite(p.price) && p.level > 0);
    const order = { Breakout: 0, Retest: 1, Near: 2, Forming: 3 };
    list.sort((a, b) => order[a.stage] - order[b.stage] || (b.action === 'BUY') - (a.action === 'BUY') || Math.abs(a.price / a.level - 1) - Math.abs(b.price / b.level - 1));
    const counts = { Breakout: 0, Near: 0, Retest: 0, Forming: 0 };
    list.forEach(p => counts[p.stage]++);
    return { rows: list, counts, scanDate: br.scan_date || rows.scan_date || '' };
  });
}

/* ---------------- holdings (account when signed in, this browser otherwise) ---------------- */
const HK = 'qs-holdings';
const local = { get() { try { const v = JSON.parse(localStorage.getItem(HK) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }, set(v) { try { localStorage.setItem(HK, JSON.stringify(v)); } catch { /* blocked */ } } };
const holdings = {
  async get() {
    await auth.whenReady();
    if (!auth.user) return { items: local.get(), where: 'device' };
    try {
      const r = await lab.holdings();
      let items = (r.items || []).map(h => ({ symbol: h.symbol, qty: h.qty, avg_price: h.avg_price }));
      const lc = local.get();
      if (!items.length && lc.length) { await lab.saveHoldings(lc); items = lc; local.set([]); }
      return { items, where: 'account' };
    } catch (e) { return { items: local.get(), where: 'device', error: e.message }; }
  },
  async set(items) { if (auth.user) await lab.saveHoldings(items); else local.set(items); },
};

/* ---------------- watchlist: what is fresh, and what joined or left each list ---------------- */
const FRESH_DAYS = 4, FRESH_MOVE = 4;
/** Fresh: matched in the last 4 days, or still less than 4% above the price when it matched. */
const isFresh = r => (r.age_days != null && r.age_days <= FRESH_DAYS) || !(n(r.chg) >= FRESH_MOVE);
const CAT_ORDER = { q: 0, y: 1, f: 2 };
const EXIT_WHY = { stop: 'loss limit in its rules', target: 'gain limit in its rules', trail: 'trailing exit in its rules', time: 'time limit in its rules', rule: 'its exit rule' };
/** Added events come from open matches, left events from closed trades of every strategy switched on. Newest first. */
async function changes(rows, days = 30) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const age = d => Math.round((today - new Date(String(d).slice(0, 10) + 'T00:00:00')) / 864e5);
  const ev = (rows || []).map(r => ({ kind: 'add', sym: r.symbol, sid: r.sid, name: r.strategy, cat: r.cat, date: r.date, age: age(r.date), price: r.price, chg: r.chg }));
  let subs = []; try { subs = ((await lab.alerts()).items || []).filter(i => i.on); } catch { /* signed out */ }
  const closed = await Promise.all(subs.map(s => cached(`lab:closed:${s.id}`, 5 * MIN, () => lab.trades(s.id, 'closed')).then(l => l.map(t => ({ ...t, sid: s.cat === 'q' ? 'qsai' : s.id, name: s.cat === 'q' ? 'QuantSync AI' : s.name, cat: s.cat }))).catch(() => [])));
  closed.flat().forEach(t => {
    if (!t.exit_date) return; const a = age(t.exit_date); if (a > days) return;
    const held = ok(t.bars) ? n(t.bars) : Math.max(1, Math.round((new Date(t.exit_date) - new Date(t.entry_date)) / 864e5));
    ev.push({ kind: 'out', sym: t.symbol, sid: t.sid, name: t.name, cat: t.cat, date: t.exit_date, age: a, ret: t.ret_pct, held, why: EXIT_WHY[t.exit_reason] || 'its exit rule' });
  });
  const seen = new Set();
  return ev.filter(e => { const k = `${e.kind}|${e.sym}|${String(e.date).slice(0, 10)}|${e.sid}`; if (e.age > days || seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => String(b.date).slice(0, 10).localeCompare(String(a.date).slice(0, 10)) || CAT_ORDER[a.cat] - CAT_ORDER[b.cat] || (a.kind === 'add' ? 0 : 1) - (b.kind === 'add' ? 0 : 1));
}

/* ---------------- QuantSync AI: the two house engines shown as one list, one feed and one record ---------------- */
const QS_NAME = 'QuantSync AI';
const dkey = s => String(s || '').slice(0, 10);
const qsai = {
  name: QS_NAME,
  /** The flagship strategy ids (AI Alpha, AI Pattern, ...) and the data date. */
  base: () => cached('qs:base', 5 * MIN, async () => {
    const t = await L('GET', '/today', undefined, { authed: false });
    const ids = (t.flagship || []).map(s => s.id);
    return { ids, flags: t.flagship || [], asof: dkey(t.data && t.data['1D'] && t.data['1D'].as_of), liveFrom: (t.flagship || []).map(s => s.live_from).filter(Boolean).sort()[0] || null };
  }),
  /** Stocks on the list now. A stock found by both engines appears once, from the day it first matched. */
  list: () => cached('qs:list', 3 * MIN, async () => {
    const b = await qsai.base();
    const all = (await Promise.all(b.ids.map(id => L('GET', `/strategies/${id}/trades?status=active`, undefined, { authed: false }).catch(() => [])))).flat();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const m = new Map();
    all.forEach(r => {
      const sym = String(r.symbol || '').toUpperCase(); if (!sym) return;
      const date = dkey(r.entry_date || r.signal_date), x = { symbol: sym, date, price: n(r.entry_price), now: n(r.exit_price), chg: n(r.ret_pct) };
      x.age_days = date ? Math.max(0, Math.round((today - new Date(date + 'T00:00:00')) / 864e5)) : null;
      const prev = m.get(sym); if (!prev || (date && date < prev.date)) m.set(sym, x);
    });
    const rows = [...m.values()].sort((a, b) => b.date.localeCompare(a.date) || a.symbol.localeCompare(b.symbol));
    const last = rows.length ? rows[0].date : '';
    rows.forEach(r => { r.fresh = isFresh(r); r.isNew = !!last && r.date === last && (!b.asof || r.date >= b.asof || r.age_days <= 1); });
    return { rows, asof: b.asof, latest: last };
  }),
  /** Every closed trade from both engines, once each (same stock and entry day counted once). */
  closed: () => cached('qs:closed', 10 * MIN, async () => {
    const b = await qsai.base();
    const res = await Promise.all(b.ids.map(id => L('GET', `/strategies/${id}/backtest`, undefined, { authed: false }).then(x => (x && x.result && x.result.trades) || []).catch(() => [])));
    const m = new Map();
    res.flat().forEach(t => { if (!t.exit_date || !ok(t.ret_pct)) return; const k = `${t.symbol}|${dkey(t.entry_date || t.signal_date)}`; if (!m.has(k)) m.set(k, { symbol: t.symbol, entry: dkey(t.entry_date || t.signal_date), exit: dkey(t.exit_date), ret: n(t.ret_pct), days: ok(t.bars) ? n(t.bars) : null, why: t.exit_reason, live: String(t.origin || '').toLowerCase() === 'live', price: n(t.entry_price), out: n(t.exit_price) }); });
    return [...m.values()].sort((a, b) => b.exit.localeCompare(a.exit));
  }),
  /** Headline numbers plus an equal-weight growth curve (trades closing the same day averaged, then compounded). */
  record(closed) {
    const c = closed.filter(t => Number.isFinite(t.ret)), N = c.length;
    if (!N) return { trades: 0 };
    const w = c.filter(t => t.ret > 0), l = c.filter(t => t.ret <= 0), sum = a => a.reduce((s, t) => s + t.ret, 0);
    const byDay = new Map(); c.forEach(t => { const a = byDay.get(t.exit) || []; a.push(t.ret); byDay.set(t.exit, a); });
    /* ₹1 lakh account, ₹10,000 into every call: a plain, believable way to add results up (no compounding) */
    let v = 100000, peak = 100000, dd = 0; const eq = [{ d: c.reduce((m, t) => (t.entry < m ? t.entry : m), c[0].entry), v }];
    [...byDay.keys()].sort().forEach(d => { byDay.get(d).forEach(r => { v += 10000 * r / 100; }); peak = Math.max(peak, v); dd = Math.min(dd, (v / peak - 1) * 100); eq.push({ d, v: Math.round(v) }); });
    const months = new Map(); c.forEach(t => { const k = t.exit.slice(0, 7); const x = months.get(k) || { k, n: 0, w: 0, s: 0 }; x.n++; if (t.ret > 0) x.w++; x.s += t.ret; months.set(k, x); });
    const years = new Map(); c.forEach(t => { const k = t.exit.slice(0, 4); const x = years.get(k) || { k, n: 0, w: 0, s: 0 }; x.n++; if (t.ret > 0) x.w++; x.s += t.ret; years.set(k, x); });
    return { trades: N, wins: w.length, losses: l.length, win_rate: w.length / N * 100, avg_ret: sum(c) / N, avg_win: w.length ? sum(w) / w.length : null, avg_loss: l.length ? sum(l) / l.length : null,
      profit_factor: sum(l) < 0 ? sum(w) / -sum(l) : null, growth: (v / 100000 - 1) * 100, final: v, max_dd: dd, equity: eq, first: eq[0].d,
      months: [...months.values()].sort((a, b) => a.k.localeCompare(b.k)), years: [...years.values()].sort((a, b) => a.k.localeCompare(b.k)), live: c.filter(t => t.live).length };
  },
  /** Joined (from the list) and left (from closed trades) in the last `days` days, newest first. */
  async changes(days = 30) {
    const [lst, closed] = await Promise.all([qsai.list(), qsai.closed()]);
    const today = new Date(); today.setHours(0, 0, 0, 0); const age = d => Math.round((today - new Date(d + 'T00:00:00')) / 864e5);
    const ev = lst.rows.map(r => ({ kind: 'add', sym: r.symbol, date: r.date, age: age(r.date), price: r.price, chg: r.chg }));
    closed.forEach(t => { const a = age(t.exit); if (a <= days) ev.push({ kind: 'out', sym: t.symbol, date: t.exit, age: a, ret: t.ret, held: t.days || Math.max(1, Math.round((new Date(t.exit) - new Date(t.entry)) / 864e5)), why: EXIT_WHY[t.why] || 'its exit rule' }); });
    return ev.filter(e => e.age <= days).sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'add' ? 0 : 1) - (b.kind === 'add' ? 0 : 1) || a.sym.localeCompare(b.sym));
  },
};

W.QD = { settings, qsai, QS_NAME,  isFresh, changes, CAT_ORDER, FRESH_DAYS, FRESH_MOVE,  CFG, auth, http, lab, api, intel, waitJob, fmt, n, ok, scoreTone, marketStatus, param, PRESETS, toRule, fromRule, describeRule, describeCond, describeExit, buildExit, validCond, label, pickOptions, gateStat, plainStat, exitGate, loadPatterns, holdings, bust, ApiError };
})();
