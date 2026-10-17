/* QuantSync Lab: app core. Router, shell, icons, charts, sheets. Data comes through window.QD (data.js). */
const W = window, d = document, QD = W.QD;
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const BASE = '/app';
export const { fmt, n, ok, lab, api, auth, intel } = QD;
export const esc = fmt.esc;

/* ---------------------------------------------------------------- icons */
const P = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  ideas: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  build: '<path d="M12 5v14M5 12h14"/>',
  learn: '<path d="M3 7.5 12 3l9 4.5-9 4.5z"/><path d="M7 9.8V15c0 1.4 2.2 3 5 3s5-1.6 5-3V9.8"/><path d="M21 7.5V13"/>',
  me: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  xray: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/><path d="M8 11h1.5l1-2 1.5 4 1-2H14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  spark: '<path d="M12 3c.6 3.9 2.1 5.4 6 6-3.9.6-5.4 2.1-6 6-.6-3.9-2.1-5.4-6-6 3.9-.6 5.4-2.1 6-6z" fill="currentColor" stroke="none"/><path d="M19 15c.3 1.7.9 2.3 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.2 2.2-.8 2.5-2.5z" fill="currentColor" stroke="none"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  back: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  chev: '<path d="m9.5 6 6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  bolt: '<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z"/>',
  wave: '<path d="M3 15c2.5 0 3-6 5.5-6s3 8 5.5 8 3-11 7-11"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  shield: '<path d="M12 3.5 5 6.5v5.5c0 4.2 2.9 7.3 7 8.5 4.1-1.2 7-4.3 7-8.5V6.5z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
  save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3 3.1-4.6 6-4.6s5.1 1.6 6 4.6"/><path d="M16 5.5a3 3 0 0 1 0 6M18 14.5c1.6.6 2.6 2.1 3 4"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5s1.1-5.9 3.6-8.5z"/>',
  swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  candle: '<path d="M7 3v4M7 15v6M17 3v6M17 17v4"/><rect x="5" y="7" width="4" height="8" rx="1"/><rect x="15" y="9" width="4" height="8" rx="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  flask: '<path d="M9.5 3.5h5M10 3.5v6L4.8 18.2A1.5 1.5 0 0 0 6.1 20.5h11.8a1.5 1.5 0 0 0 1.3-2.3L14 9.5v-6"/><path d="M7.5 14.5h9"/>',
  news: '<path d="M5 4h11a1 1 0 0 1 1 1v14a1 1 0 0 0 2 0V8h1a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M8 8h6M8 12h6M8 16h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
};
export const icon = (k, s = 20, cls = '') => `<svg class="${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;
export const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5263FF"/><stop offset="1" stop-color="#7A4FF0"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#lg)"/><path d="M7 21.5 12.5 15l4 3.5L25 9.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="9.5" r="2.6" fill="#FFD58A"/></svg>';
const hue = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };
export const mono = s => `<span class="mono" style="--h:${hue(s)}" aria-hidden="true">${esc(String(s).replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase())}</span>`;
/** Headline words rise in one by one. Pass HTML; tags are kept, words wrapped. */
export const words = html => { let i = 0; return html.replace(/(<[^>]+>)|([^<\s]+)/g, (m, tag, w) => tag || `<span class="w" style="--i:${i++}">${w}</span>`); };

/* ---------------------------------------------------------------- theme */
export const isDark = () => (d.documentElement.dataset.theme ? d.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
export function setTheme(t) { d.documentElement.dataset.theme = t; try { localStorage.setItem('qs-theme', t); } catch { /* blocked */ } d.querySelectorAll('[data-theme-btn]').forEach(b => b.setAttribute('aria-checked', t === 'dark')); }
const themeSwitch = () => `<button class="tsw" type="button" role="switch" data-theme-btn aria-checked="${isDark()}" aria-label="Night mode"><span class="k">${icon('sun', 14)}${icon('moon', 14)}</span></button>`;

/* ---------------------------------------------------------------- toast, sheet */
let tEl, tT;
export function toast(m) { if (!tEl) { tEl = d.createElement('div'); tEl.className = 'toast'; tEl.setAttribute('role', 'status'); d.body.append(tEl); } tEl.textContent = m; tEl.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => tEl.classList.remove('on'), 2600); }
export function sheet(html) {
  const scr = d.createElement('div'); scr.className = 'scrim';
  const s = d.createElement('div'); s.className = 'sheet'; s.setAttribute('role', 'dialog'); s.innerHTML = `<div class="grab"></div>${html}`;
  d.body.append(scr, s);
  const close = () => { scr.classList.remove('on'); s.classList.remove('on'); setTimeout(() => { scr.remove(); s.remove(); }, 400); };
  scr.onclick = close; s.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  requestAnimationFrame(() => requestAnimationFrame(() => { scr.classList.add('on'); s.classList.add('on'); }));
  return { el: s, close };
}
/** Ask to sign in before an action that needs an account. Resolves to the user or null. */
export async function needUser(why) {
  const u = await auth.whenReady(); if (u) return u;
  return new Promise(res => {
    const sh = sheet(`<h3>Sign in to continue</h3><p class="small" style="margin-bottom:16px">${esc(why || 'A free account keeps your strategies and test results.')}</p>
      <button class="btn pri block" data-in>Continue with Google</button><button class="btn quiet block" data-close style="margin-top:8px">Not now</button>`);
    sh.el.querySelector('[data-in]').onclick = async () => { try { await auth.signIn(); sh.close(); res(auth.user); } catch (e) { toast(e.message || 'Sign-in did not finish.'); } };
    sh.el.addEventListener('click', e => { if (e.target.closest('[data-close]')) res(null); });
  });
}

/* ---------------------------------------------------------------- states */
export const skel = (h = 64, k = 3) => Array.from({ length: k }, () => `<div class="sk" style="height:${h}px;margin-bottom:10px"></div>`).join('');
export const errBox = (m, retry = true) => `<div class="err" role="alert"><span>${esc(m || 'This did not load.')}</span><span style="display:flex;gap:6px;flex:none">${/Settings|busy|reach/.test(m || '') ? `<a class="btn sm quiet" href="${BASE}/config" data-nav>Settings</a>` : ''}${retry ? '<button class="btn sm quiet" data-retry>Try again</button>' : ''}</span></div>`;
export const empty = (ic, h, p, cta = '') => `<div class="card empty"><span class="ic">${icon(ic, 24)}</span><b class="h3">${esc(h)}</b><p class="small" style="max-width:36ch">${esc(p)}</p>${cta}</div>`;
const rio = 'IntersectionObserver' in W ? new IntersectionObserver(es => { let i = 0; es.forEach(e => { if (!e.isIntersecting) return; rio.unobserve(e.target); e.target.style.setProperty('--d', Math.min(i++ * 50, 300) + 'ms'); requestAnimationFrame(() => e.target.classList.add('in')); }); }, { rootMargin: '0px 0px -6% 0px' }) : null;
export function reveal(root) { if (RM || !rio) return; const l = [...root.querySelectorAll('[data-rv]')]; l.forEach(e => { e.classList.add('rv'); rio.observe(e); }); setTimeout(() => l.forEach(e => e.classList.add('in')), 1200); }

/* ---------------------------------------------------------------- charts */
/** Line chart with optional area, dashed second series and a scrub tooltip. series: [{data, color, area, dash}] */
export function line(el, series, o = {}) {
  const Wd = o.w || Math.max(300, el.clientWidth || 640), H = o.h || 220, pl = o.bare ? 2 : 48, pr = 8, pt = 10, pb = o.bare ? 4 : 24;
  const all = series.flatMap(s => s.data).filter(Number.isFinite); if (all.length < 2) { el.innerHTML = ''; return; }
  let lo = Math.min(...all), hi = Math.max(...all); const m = (hi - lo) * .08 || 1; lo -= m; hi += m;
  const N = Math.max(...series.map(s => s.data.length));
  const X = i => pl + (Wd - pl - pr) * i / Math.max(1, N - 1), Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  let g = '', defs = '';
  if (!o.bare) for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = Y(v); g += `<line class="gl" x1="${pl}" x2="${Wd - pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl - 8}" y="${y + 4}" text-anchor="end">${o.yfmt ? o.yfmt(v) : Math.round(v)}</text>`; }
  if (o.dates && !o.bare) { const k = Wd < 520 ? 3 : 6; for (let j = 0; j < k; j++) { const i = Math.round((N - 1) * j / (k - 1)), dt = o.dates[i]; if (dt) g += `<text class="ax" x="${X(i)}" y="${H - 6}" text-anchor="${j === 0 ? 'start' : j === k - 1 ? 'end' : 'middle'}">${new Date(dt + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</text>`; } }
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  series.forEach((s, k) => {
    const pts = s.data.map((v, i) => [X(i), Y(v)]).filter(p => Number.isFinite(p[1])); if (pts.length < 2) return;
    const dd = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    if (s.area) { defs += `<linearGradient id="${id}${k}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:${s.color};stop-opacity:.22"/><stop offset="1" style="stop-color:${s.color};stop-opacity:0"/></linearGradient>`; g += `<path d="${dd}L${pts.at(-1)[0]} ${H - pb}L${pts[0][0]} ${H - pb}Z" fill="url(#${id}${k})"/>`; }
    g += `<path class="${RM || o.bare ? '' : 'draw'}" d="${dd}" fill="none" style="stroke:${s.color}" stroke-width="${s.w || 2.2}" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="5 5"' : ''}/>`;
  });
  el.classList.add('chart');
  el.innerHTML = `<svg viewBox="0 0 ${Wd} ${H}" ${o.bare ? 'preserveAspectRatio="none" style="height:100%"' : ''} role="img" aria-label="${esc(o.label || 'Chart')}"><defs>${defs}</defs>${g}<line class="hair" x1="0" x2="0" y1="${pt}" y2="${H - pb}" style="stroke:var(--ink-3)" opacity="0"/></svg>${o.tip ? '<div class="tip"></div>' : ''}`;
  el.querySelectorAll('.draw').forEach(p => p.style.setProperty('--len', p.getTotalLength()));
  if (o.tip) {
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), hair = el.querySelector('.hair');
    const mv = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * Wd, i = Math.max(0, Math.min(N - 1, Math.round((x - pl) / (Wd - pl - pr) * (N - 1)))); hair.setAttribute('x1', X(i)); hair.setAttribute('x2', X(i)); hair.setAttribute('opacity', .5); tip.innerHTML = o.tip(i); tip.style.left = (X(i) / Wd * 100) + '%'; tip.style.top = (Y(series[series.length - 1].data[i]) / H * r.height) + 'px'; el.classList.add('scrub'); };
    svg.addEventListener('pointermove', mv); svg.addEventListener('pointerdown', mv);
    svg.addEventListener('pointerleave', () => { el.classList.remove('scrub'); hair.setAttribute('opacity', 0); });
  }
}
export const spark = (el, data, color) => line(el, [{ data, color, w: 1.8 }], { w: 120, h: 34, bare: true });

/* ---------------------------------------------------------------- router */
const TABS = [['xray', '', 'X-Ray', 'xray'], ['screens', 'screens', 'Screens', 'layers'], ['build', 'build', 'Build', 'build'], ['strat', 'strategies', 'Strategies', 'flask'], ['news', 'news', 'News', 'news']];
const ROUTES = [
  [/^$/, 'xray', 'xray'], [/^xray$/, 'xray', 'xray'], [/^xray\/([^/]+)$/, 'xray', 'xray'],
  [/^(?:screens|ideas)$/, 'screens', 'screens'], [/^screens\/([\w-]+)$/, 'screens', 'screens'], [/^ideas\/([\w-]+)$/, 'idea', 'screens'],
  [/^build$/, 'build', 'build'],
  [/^(?:strategies|learn)$/, 'strategies', 'strat'], [/^strategies\/([\w-]+)$/, 'strategies', 'strat'], [/^learn\/([\w-]+)$/, 'lesson', 'strat'],
  [/^news$/, 'news', 'news'], [/^(?:activity|alerts|notifications)$/, 'activity', 'act'], [/^me$/, 'me', 'strat'], [/^(account|profile)$/, 'account', 'acct'], [/^s\/([\w-]+)$/, 'strategy', 'strat'], [/^(config|settings)$/, 'config', 'cfg'],
];
export function parse(loc = location) {
  let p = loc.pathname.replace(/\/+$/, ''); if (p.startsWith(BASE)) p = p.slice(BASE.length); p = p.replace(/^\/+/, '').replace(/\.html$/, '').replace(/^index$/, '');
  for (const [re, view, tab] of ROUTES) { const m = p.match(re); if (m) return { view, tab, arg: m[1] ? decodeURIComponent(m[1]) : '', q: new URLSearchParams(loc.search), path: p }; }
  return { view: 'xray', tab: 'xray', arg: '', q: new URLSearchParams(), path: '' };
}
let cleanup = null, seq = 0, M = null;
async function render(r) {
  const my = ++seq;
  d.querySelectorAll('[data-tab]').forEach(a => a.setAttribute('aria-current', a.dataset.tab === r.tab ? 'page' : 'false'));
  const bl = d.getElementById('bell'); if (bl) bl.setAttribute('aria-current', r.tab === 'act' ? 'page' : 'false');
  const view = d.getElementById('view');
  try { cleanup && cleanup(); } catch { /* ignore */ } cleanup = null;
  M && M.loading(true);
  const mod = await import(`./views/${r.view}.js`);
  M && M.loading(false);
  if (my !== seq) return;
  view.innerHTML = ''; view.className = 'wrap view-in'; void view.offsetWidth;
  try { cleanup = (await mod.default(view, r)) || null; } catch (e) { console.error(e); view.innerHTML = `<div class="head">${errBox('This page failed to load. ' + e.message, false)}</div>`; }
  view.insertAdjacentHTML('beforeend', footer());
  reveal(view);
}
export function go(path, { replace = false } = {}) {
  const url = BASE + '/' + String(path).replace(/^\/+/, '');
  if (url !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState']({ i: replace ? (history.state && history.state.i) | 0 : ((history.state && history.state.i) | 0) + 1 }, '', url);
  W.scrollTo({ top: 0, behavior: 'instant' in W ? 'instant' : 'auto' });
  render(parse());
}
export const link = (path, inner, cls = '', attrs = '') => `<a href="${BASE}/${path}" data-nav class="${cls}" ${attrs}>${inner}</a>`;
const footer = () => `<footer class="foot"><div class="links">${link('', 'X-Ray')}${link('screens', 'Screens')}${link('build', 'Build')}${link('strategies', 'Strategies')}${link('news', 'News')}${link('me', 'My strategies')}${link('learn/rules', 'Learn')}${link('account', 'Account')}${link('config', 'Settings')}</div>
  <p>QuantSync Lab is a tool for building and testing your own rule-based ideas, and for learning how markets work. It does not give investment advice or recommendations, and QuantSync is not a SEBI-registered investment adviser or research analyst. Stocks shown are the ones that meet rules you chose. Test results are hypothetical and based on past prices; they do not predict future results.</p></footer>`;

/* ---------------------------------------------------------------- shell */
export function boot() {
  try { const t = localStorage.getItem('qs-theme'); if (t) d.documentElement.dataset.theme = t; } catch { /* blocked */ }
  const top = d.getElementById('top'), tabs = d.getElementById('tabs');
  top.innerHTML = `<div class="top-in"><a class="brand" href="${BASE}/" data-nav aria-label="QuantSync Lab home">${LOGO}<span>QuantSync <em>Lab</em></span></a>
    <nav class="nav" aria-label="Main">${[['', 'X-Ray', 'xray'], ['screens', 'Screens', 'screens'], ['build', 'Build', 'build'], ['strategies', 'Strategies', 'strat'], ['news', 'News', 'news']].map(([p, l, t]) => link(p, l, '', `data-tab="${t}"`)).join('')}</nav>
    <span class="grow"></span>${link('activity', `${icon('bell', 19)}<i class="bdg" id="bdg" hidden></i>`, 'gearbtn bell', 'id="bell" aria-label="Activity: news and alerts"')}${themeSwitch()}<span id="acct"></span></div>`;
  tabs.innerHTML = TABS.map(([k, p, l, ic]) => k === 'build'
    ? link(p, `<span class="c">${icon(ic, 22)}</span><span class="l">${l}</span>`, 'go', `data-tab="${k}" aria-label="Build a strategy"`)
    : link(p, `${icon(ic, 23)}<span>${l}</span>`, '', `data-tab="${k}"`)).join('');
  d.addEventListener('click', e => {
    if (e.target.closest('[data-theme-btn]')) { setTheme(isDark() ? 'light' : 'dark'); return; }
    const a = e.target.closest('a[data-nav]'); if (!a || e.metaKey || e.ctrlKey || a.target === '_blank') return;
    e.preventDefault(); go(a.getAttribute('href').slice(BASE.length + 1));
  });
  addEventListener('scroll', () => top.classList.toggle('on', scrollY > 6), { passive: true });
  addEventListener('popstate', () => render(parse()));
  const acct = d.getElementById('acct');
  auth.onChange(u => {
    if (!u) { acct.innerHTML = link('account', icon('me', 19), 'gearbtn acctbtn', 'aria-label="Account, theme and alerts"'); return; }
    const nm = u.displayName || u.email || 'You', ini = nm.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
    acct.innerHTML = link('account', u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(ini), 'avbtn', 'aria-label="Account, theme and alerts"');
  });
  auth.init();
  import('./motion.js').then(m => { M = m; m.initMotion(); }).finally(() => render(parse()));
  /* bell: the badge counts new high-impact items; the Activity page lists them. Every tap gets a haptic tick. */
  import('./feel.js').then(F => {
    F.wireHaptics();
    let items = [];
    const bdg = d.getElementById('bdg'), paintB = () => { const k = F.unread(items); bdg.hidden = !k; bdg.textContent = k > 9 ? '9+' : k; };
    F.watchFeed(intel, L => { if (L.length) { items = L; paintB(); } });
    addEventListener('qs-seen', paintB);
  });
}
