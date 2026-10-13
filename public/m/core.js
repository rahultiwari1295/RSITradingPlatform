/* QuantSync mobile: core. Data access, formatting, icons, router, screens, sheets, account.
   Every number shown anywhere in the app comes through api() from the live VPS endpoints. */

const W = window;
const RM = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const onVercel = !/duckdns\.org$/.test(location.hostname) && location.port !== '8443' && !['localhost', '127.0.0.1'].includes(location.hostname);
export const CFG = Object.assign({
  base: '/m',
  api: '/api',
  direct: 'https://quantsync-api.duckdns.org:8443',
  lab: onVercel ? '/lab/api/v1' : '/lab/v1',
  firebase: { apiKey: 'AIzaSyDE7DrgzliyLF6SFbJi7lKqOsAvK3rtrIU', authDomain: 'scantoknow-a1593.firebaseapp.com', projectId: 'scantoknow-a1593', appId: '1:220667916508:web:f105873ba57909e18f0419' },
  firebaseVersion: '10.12.2',
}, W.QS_CONFIG || {});

/* ---------------------------------------------------------------- http */
const MIN = 60e3;
const cache = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, { headers } = {}) {
  const go = u => fetch(u, { headers: { Accept: 'application/json', ...(headers || {}) } });
  let r;
  try { r = await go(url); } catch { await sleep(700); r = await go(url); }
  if (r.status >= 502 && r.status <= 504) { await sleep(900); r = await go(url); }
  if (!r.ok && onVercel && url.startsWith('/api/')) { // the Vercel proxy can time out on heavy calls: try the VPS directly
    const d = await fetch(CFG.direct + url).catch(() => null);
    if (d && d.ok) return d.json();
  }
  if (!r.ok) {
    const e = new Error(r.status === 404 ? 'Not found.' : r.status >= 500 ? 'The data server is busy. Try again in a moment.' : `Request failed (${r.status}).`);
    e.status = r.status; throw e;
  }
  return r.json();
}
/** Cached GET. ttl in minutes. Concurrent callers share one request. */
export function api(path, ttl = 5) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.t < ttl * MIN) return hit.p;
  const p = getJSON(CFG.api + path).catch(e => { cache.delete(path); throw e; });
  cache.set(path, { t: Date.now(), p });
  return p;
}
export const peek = path => cache.get(path)?.v;
export const bust = prefix => { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); };

/* ---------------------------------------------------------------- formatting */
export const n = v => { if (v == null || v === '') return NaN; if (typeof v === 'number') return v; const x = parseFloat(String(v).replace(/[₹,%\s]|Cr/g, '').replace('−', '-')); return isNaN(x) ? NaN : x; };
export const ok = v => Number.isFinite(n(v));
const nf = (v, d) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt = {
  px(v) { v = n(v); if (!isFinite(v)) return '—'; return '₹' + nf(v, v >= 1000 ? 0 : v >= 100 ? 1 : 2); },
  px2(v) { v = n(v); return isFinite(v) ? '₹' + nf(v, 2) : '—'; },
  idx(v) { v = n(v); return isFinite(v) ? nf(v, v >= 1000 ? 0 : 2) : '—'; },
  pct(v, d = 1) { v = n(v); return isFinite(v) ? nf(v, d) + '%' : '—'; },
  sp(v, d = 1) { v = n(v); if (!isFinite(v)) return '—'; return (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d) + '%'; },
  sinr(v) { v = n(v); if (!isFinite(v)) return '—'; return (v >= 0 ? '+' : '−') + '₹' + nf(Math.abs(v), Math.abs(v) >= 1000 ? 0 : 2); },
  inr(v, d = 0) { v = n(v); return isFinite(v) ? '₹' + nf(v, d) : '—'; },
  cr(v) { v = n(v); if (!isFinite(v)) return '—'; if (v >= 1e5) return '₹' + nf(v / 1e5, 2) + ' L Cr'; return '₹' + nf(v, 0) + ' Cr'; },
  lakh(v) { v = n(v); if (!isFinite(v)) return '—'; const a = Math.abs(v), s = v < 0 ? '−' : ''; if (a >= 1e7) return s + '₹' + nf(a / 1e7, 2) + ' Cr'; if (a >= 1e5) return s + '₹' + nf(a / 1e5, 2) + ' L'; return s + '₹' + nf(a, 0); },
  int(v) { v = n(v); return isFinite(v) ? nf(Math.round(v), 0) : '—'; },
  x(v, d = 2) { v = n(v); return isFinite(v) ? nf(v, d) : '—'; },
  date(s, opts = { day: 'numeric', month: 'short' }) { const d = toDate(s); return d ? d.toLocaleDateString('en-IN', opts) : '—'; },
  dateY(s) { return fmt.date(s, { day: 'numeric', month: 'short', year: 'numeric' }); },
  month(s) { const d = toDate(s.length === 7 ? s + '-01' : s); return d ? d.toLocaleDateString('en-IN', { month: 'short' }) : s; },
  ago(s) {
    const d = toDate(s); if (!d) return '';
    const m = (Date.now() - d.getTime()) / 6e4;
    if (m < 2) return 'just now'; if (m < 60) return Math.round(m) + ' min ago';
    if (m < 60 * 24) return Math.round(m / 60) + ' h ago';
    const days = Math.round(m / 1440); return days === 1 ? 'yesterday' : days + ' days ago';
  },
  days(v) { v = n(v); return !isFinite(v) ? '—' : v === 0 ? 'today' : v === 1 ? '1 day' : nf(v, 0) + ' days'; },
};
export function toDate(s) {
  if (!s) return null;
  if (typeof s === 'number') return new Date(s > 1e12 ? s : s * 1000);
  let t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) t += 'T12:00:00+05:30';
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(t)) t = t.replace(' ', 'T') + (/[+Z]/.test(t.slice(19)) ? '' : '+05:30');
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
export const tone = v => (n(v) > 0 ? 'up' : n(v) < 0 ? 'dn' : '');
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Clean strings that came from the engine: drop emoji and decorative symbols, keep words. */
export const clean = s => String(s ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
export const sentence = s => { s = clean(s); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
export const hue = sym => { let h = 7; for (const c of String(sym)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };
export const mono = (sym, cls = '') => `<span class="mono ${cls}" style="--h:${hue(sym)}" aria-hidden="true">${esc(String(sym).replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase())}</span>`;
export const scoreTone = s => (n(s) >= 70 ? { k: 'up', t: 'Strong' } : n(s) >= 45 ? { k: 'warn', t: 'Mixed' } : { k: 'dn', t: 'Weak' });
export const scoreColor = s => (n(s) >= 70 ? 'var(--up-solid)' : n(s) >= 45 ? 'var(--ai-solid)' : 'var(--dn-solid)');
export function marketStatus() {
  const now = new Date(), ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 6e4);
  const d = ist.getDay(), m = ist.getHours() * 60 + ist.getMinutes();
  const open = d >= 1 && d <= 5 && m >= 555 && m <= 930;
  const pre = d >= 1 && d <= 5 && m < 555;
  return { open, text: open ? 'Market open' : pre ? 'Opens 9:15 am' : 'Market closed' };
}

/* ---------------------------------------------------------------- icons (24px grid, 1.75 stroke) */
const P = {
  today: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  todayF: '<path class="fill" fill="currentColor" stroke="none" d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  ai: '<path d="M11 3.5 12.6 8a3 3 0 0 0 1.9 1.9L19 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L11 19.5l-1.6-4.5a3 3 0 0 0-1.9-1.9L3 11.5l4.5-1.6A3 3 0 0 0 9.4 8z"/><path d="M18.5 3v4M16.5 5h4"/>',
  aiF: '<path class="fill" fill="currentColor" stroke="none" d="M11 3.5 12.6 8a3 3 0 0 0 1.9 1.9L19 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L11 19.5l-1.6-4.5a3 3 0 0 0-1.9-1.9L3 11.5l4.5-1.6A3 3 0 0 0 9.4 8z"/>',
  pattern: '<path d="M3 17.5 8.5 12l3.5 3 8-8.5"/><path d="M15 6.5h5v5"/>',
  patternF: '<path class="fill" fill="currentColor" stroke="none" opacity=".18" d="M3 17.5 8.5 12l3.5 3 8-8.5V20H3z"/>',
  xray: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/><path d="M8 11h1.5l1-2 1.5 4 1-2H14"/>',
  xrayF: '<circle class="fill" cx="11" cy="11" r="6.5" fill="currentColor" stroke="none" opacity=".18"/>',
  pf: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/><path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z"/>',
  pfF: '<path class="fill" fill="currentColor" stroke="none" d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/>',
  back: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  chev: '<path d="m9.5 6 6 6-6 6"/>',
  down: '<path d="m6 9.5 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  share: '<path d="M12 15V4M8 7.5 12 3.5l4 4"/><path d="M6 11v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  shield: '<path d="M12 3.5 5 6.5v5.5c0 4.2 2.9 7.3 7 8.5 4.1-1.2 7-4.3 7-8.5V6.5z"/>',
  bolt: '<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flask: '<path d="M9.5 3.5h5M10 3.5v6L4.8 18.2A1.5 1.5 0 0 0 6.1 20.5h11.8a1.5 1.5 0 0 0 1.3-2.3L14 9.5v-6"/><path d="M7.5 14.5h9"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  news: '<rect x="3.5" y="5" width="13" height="14" rx="2"/><path d="M16.5 9H20v8.5a1.5 1.5 0 0 1-3 0M7 9h6M7 12.5h6M7 16h4"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDn: '<path d="M12 5v14M6 13l6 6 6-6"/>',
};
export const icon = (k, s = 20, cls = '') => `<svg class="${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;
export const tabIcon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k + 'F'] || ''}${P[k]}</svg>`;

/* ---------------------------------------------------------------- glossary: every number can explain itself */
export const GLOSS = {
  winrate: ['Win rate', 'Out of every 100 closed trades, how many made money. Above 50% is good, but it only matters together with how big the wins are compared with the losses.'],
  pf: ['Profit factor', 'Total money made on winning trades divided by total money lost on losing trades. 1.0 means break-even. 1.5 or more is solid. Below 1.0 means the trades lost money overall.'],
  expectancy: ['Average per trade', 'What one trade has returned on average, wins and losses together, after costs. This is the single best number for judging a strategy.'],
  live: ['Live and simulated', 'Live trades were called in real time and tracked from the day they were made. Simulated trades are what the same rules would have done on past prices. Live results are the honest test; simulated results show what the rules can do over a longer period.'],
  stop: ['Stop loss', 'The price where the idea is proven wrong. If the stock closes below it, sell and take the small loss. Every call has one, so you always know the most you can lose.'],
  target: ['Target', 'The price where the engine plans to take profit. Some strategies move the stop up as the price rises and let winners run past the target.'],
  entry: ['Entry', 'The price the engine bought at, or would buy at today. Buying much higher than this makes the trade riskier, because the stop stays where it is.'],
  rr: ['Reward to risk', 'How much the trade can make compared with how much it can lose. 2 means the target is twice as far away as the stop.'],
  xray: ['X-Ray score', 'A 0 to 100 health check made from four parts: trend (is the price going up), momentum (how strongly), volume (are big buyers involved) and quality (is the business sound). 70 and above is strong, below 45 is weak.'],
  breakout: ['Breakout', 'The price has closed above a level that stopped it several times before. Breakouts on heavy volume tend to keep going; weak ones often fall back.'],
  retest: ['Retest', 'After a breakout the price has come back to the old ceiling. If that level now holds as a floor, it is often a lower-risk place to buy.'],
  near: ['Near breakout', 'The price is just under its ceiling. Nothing to buy yet. Set an alert and wait for a close above the level.'],
  forming: ['Forming', 'A base is building but the price is still well inside it. Watch-list only.'],
  odds: ['Measured odds', 'How the same kind of setup worked out across the whole market since 2020: how often it reached the target before the stop, and the average result per trade after costs.'],
  grade: ['Grade', 'A is the cleanest setup: strong volume, room to run and the price above its long-term trend. C setups have at least one weak spot.'],
  above200: ['Above the 200-day average', 'The share of stocks trading above their average price of the last 200 days. Above 60% the broad market is healthy; below 40% most stocks are in downtrends.'],
  breadth: ['Advances and declines', 'How many stocks rose and fell in the last session. It shows whether a move in the index was broad or carried by a few large companies.'],
  fii: ['FII and DII', 'Net buying by foreign institutional investors (FII) and Indian institutions such as mutual funds (DII), in crore rupees, for the last session.'],
  drawdown: ['Drawdown', 'How far the account fell from its highest point before recovering. It tells you how painful the worst stretch was.'],
  baserate: ['Base rate', 'Across all stocks since 2016, how often a stock in this exact situation went on to rise. It is the starting odds before looking at anything else.'],
};
export const q = (k, label = '?') => `<button class="qmark" data-gloss="${k}" aria-label="What is ${esc((GLOSS[k] || [k])[0])}?">${label}</button>`;

/* ---------------------------------------------------------------- toast, sheet */
let toastEl, toastT;
export function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2400);
}
export function sheet(html, { onOpen, label = 'Details' } = {}) {
  const w = document.createElement('div');
  w.className = 'sheet-wrap';
  w.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(w);
  const s = w.querySelector('.sheet');
  const prev = document.activeElement;
  const close = () => { w.classList.remove('on'); setTimeout(() => w.remove(), 420); document.removeEventListener('keydown', key); prev && prev.focus && prev.focus(); };
  const key = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  w.querySelector('.scrim').onclick = close;
  w.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  /* drag down to dismiss */
  let y0 = null, dy = 0;
  s.addEventListener('touchstart', e => { if (s.scrollTop <= 0) { y0 = e.touches[0].clientY; s.style.transition = 'none'; } }, { passive: true });
  s.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); s.style.transform = `translateY(${dy}px)`; }, { passive: true });
  s.addEventListener('touchend', () => { if (y0 == null) return; s.style.transition = ''; s.style.transform = ''; if (dy > 90) close(); y0 = null; dy = 0; });
  requestAnimationFrame(() => requestAnimationFrame(() => { w.classList.add('on'); const f = s.querySelector('input,button:not(.qmark)'); onOpen && onOpen(s, close); if (f && f.tagName === 'INPUT') setTimeout(() => f.focus(), 350); }));
  return { el: s, close };
}
export function explain(k) {
  const g = GLOSS[k]; if (!g) return;
  sheet(`<h3>${esc(g[0])}</h3><p>${esc(g[1])}</p><button class="btn quiet block" data-close style="margin-top:8px">Got it</button>`, { label: g[0] });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-gloss]'); if (b) { e.preventDefault(); e.stopPropagation(); explain(b.dataset.gloss); } }, true);

/* ---------------------------------------------------------------- shared view pieces */
export const skel = (h = 64, n = 1, r = 14) => Array.from({ length: n }, () => `<div class="sk" style="height:${h}px;border-radius:${r}px;margin-bottom:10px"></div>`).join('');
export const errBox = (msg, retry = true) => `<div class="err" role="alert"><span>${esc(msg || 'Could not load this. Check your connection.')}</span>${retry ? '<button data-retry>Try again</button>' : ''}</div>`;
export const empty = (ic, h, p, cta = '') => `<div class="empty"><div class="ic">${icon(ic, 24)}</div><h3>${esc(h)}</h3><p>${esc(p)}</p>${cta}</div>`;
export const delta = (v, d = 1) => `<span class="delta ${tone(v)}">${fmt.sp(v, d)}</span>`;
export const link = (path, inner, cls = '', attrs = '') => `<a href="${CFG.base}/${path}" data-nav class="${cls}" ${attrs}>${inner}</a>`;
/* ---------------------------------------------------------------- staged reveal */
const REVEAL = '.sec, .hero, .xhero, .sig, .callcard, .pcard, .stats, .panel, .group, .tk, .scan-rule, .duo .side, .verdict, .lab-promo, .empty, .flowline, .pfhero, .kv, .story';
const rio = 'IntersectionObserver' in W ? new IntersectionObserver(es => {
  let i = 0;
  es.forEach(e => { if (!e.isIntersecting) return; rio.unobserve(e.target); e.target.style.setProperty('--d', Math.min(i++ * 70, 420) + 'ms'); requestAnimationFrame(() => e.target.classList.add('in')); });
}, { rootMargin: '0px 0px -4% 0px', threshold: .01 }) : null;
/** Let the top-level blocks inside root rise in, in order, the first time they are seen. */
export function reveal(root) {
  if (!root || RM || !rio) return;
  root.querySelectorAll(REVEAL).forEach(el => {
    if (el.dataset.rv || (el.parentElement && el.parentElement.closest(REVEAL) && root.contains(el.parentElement.closest(REVEAL)))) return;
    el.dataset.rv = 1; el.classList.add('rv'); rio.observe(el);
  });
}
/** Load into a slot with skeleton, error and retry handled the same way everywhere. */
export async function fill(el, load, draw, sk = skel(80, 2), { quiet = false } = {}) {
  if (!el) return;
  el.innerHTML = sk;
  try {
    const d = await load();
    if (!el.isConnected) return;
    el.innerHTML = '';
    draw(d, el);
    reveal(el);
  } catch (e) {
    console.warn(e);
    if (!el.isConnected) return;
    if (quiet) { el.innerHTML = ''; return; } // optional sections simply stay out of the way
    el.innerHTML = errBox(e.message);
    const b = el.querySelector('[data-retry]');
    if (b) b.onclick = () => fill(el, load, draw, sk, { quiet });
  }
}
export function segmented(el, options, value, on) {
  el.classList.add('seg');
  el.setAttribute('role', 'group');
  el.innerHTML = '<span class="knob"></span>' + options.map(([v, l, c]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === value}">${esc(l)}${c != null ? `<span class="n">${esc(c)}</span>` : ''}</button>`).join('');
  const knob = el.querySelector('.knob');
  const place = () => { const b = el.querySelector('[aria-pressed="true"]'); if (!b) return; knob.style.width = b.offsetWidth + 'px'; knob.style.transform = `translateX(${b.offsetLeft - 3}px)`; };
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); place(); on(b.dataset.v); };
  requestAnimationFrame(place);
  new ResizeObserver(place).observe(el);
}
/** Count a number up once when it first scrolls into view. */
const io = 'IntersectionObserver' in W ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); runCount(e.target); } }), { threshold: .3 }) : null;
function runCount(el) {
  const to = +el.dataset.count, f = el.dataset.f || 'int', t0 = performance.now();
  const out = v => (f === 'int' ? fmt.int(v) : f === 'pct' ? fmt.pct(v, +(el.dataset.d || 1)) : f === 'sp' ? fmt.sp(v, +(el.dataset.d || 1)) : f === 'x' ? fmt.x(v, +(el.dataset.d || 2)) : f === 'idx' ? fmt.idx(v) : f === 'px' ? fmt.px(v) : fmt.lakh(v));
  if (RM) { el.textContent = out(to); return; }
  setTimeout(() => { el.textContent = out(to); }, 1400); // the final value even if animation frames are paused (background tab)
  const step = t => { const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3); el.textContent = out(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
export const count = (v, f = 'int', d) => { const x = n(v); if (!isFinite(x)) return '—'; const id = 'c' + Math.random().toString(36).slice(2, 8); queueMicrotask(() => { const el = document.getElementById(id); if (el) io ? io.observe(el) : runCount(el); }); const fm = { int: fmt.int, pct: v => fmt.pct(v, d ?? 1), sp: v => fmt.sp(v, d ?? 1), x: v => fmt.x(v, d ?? 2), idx: fmt.idx, px: fmt.px, lakh: fmt.lakh }[f]; return `<span id="${id}" class="tnum" data-count="${x}" data-f="${f}" ${d != null ? `data-d="${d}"` : ''}>${fm(x)}</span>`; };

/* ---------------------------------------------------------------- account: Google sign-in (Firebase), holdings */
export const auth = { user: null, ready: false, subs: new Set() };
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
let fbP = null;
function fb() {
  if (fbP) return fbP;
  const giveUp = setTimeout(() => { if (!auth.ready) { auth.ready = true; auth.subs.forEach(f => f(null)); } }, 6000); // never leave the portfolio waiting on a slow sign-in script
  fbP = (async () => {
    const v = CFG.firebaseVersion;
    await loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-auth-compat.js`);
    if (!W.firebase.apps.length) W.firebase.initializeApp(CFG.firebase);
    const a = W.firebase.auth();
    await new Promise(res => a.onAuthStateChanged(u => { const was = auth.ready && auth.user === u; auth.user = u; auth.ready = true; clearTimeout(giveUp); if (!was) auth.subs.forEach(f => f(u)); res(); }));
    return a;
  })().catch(e => { console.warn('[auth]', e); auth.ready = true; auth.subs.forEach(f => f(null)); return null; });
  return fbP;
}
auth.init = fb;
auth.onChange = f => { auth.subs.add(f); if (auth.ready) f(auth.user); return () => auth.subs.delete(f); };
auth.whenReady = () => (auth.ready ? Promise.resolve(auth.user) : Promise.race([fb(), new Promise(r => setTimeout(r, 6000))]).then(() => auth.user));
auth.signIn = async () => { const a = await fb(); if (!a) throw new Error('Sign-in is unavailable right now.'); const p = new W.firebase.auth.GoogleAuthProvider(); try { await a.signInWithPopup(p); } catch (e) { if (/popup/i.test(e.code || '')) await a.signInWithRedirect(p); else throw e; } };
auth.signOut = async () => { const a = await fb(); if (a) await a.signOut(); };
auth.token = async () => { if (!auth.user) return null; try { return await auth.user.getIdToken(); } catch { return null; } };
async function lab(method, path, body) {
  const h = { Accept: 'application/json' };
  if (body) h['Content-Type'] = 'application/json';
  const t = await auth.token(); if (t) h.Authorization = 'Bearer ' + t;
  const r = await fetch(CFG.lab + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(r.status === 401 ? 'Sign in again to sync your portfolio.' : 'Could not reach your account right now.');
  return r.json();
}
const HK = 'qs-holdings'; // shared with the scanner app at /app, so both show the same portfolio
const local = { get() { try { const v = JSON.parse(localStorage.getItem(HK) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }, set(v) { try { localStorage.setItem(HK, JSON.stringify(v)); } catch { /* storage blocked */ } } };
export const holdings = {
  async get() {
    await auth.whenReady();
    if (!auth.user) return { items: local.get(), where: 'device' };
    try {
      const r = await lab('GET', '/me/holdings');
      let items = (r.items || []).map(h => ({ symbol: h.symbol, qty: h.qty, avg_price: h.avg_price }));
      const lc = local.get();
      if (!items.length && lc.length) { await lab('PUT', '/me/holdings', { items: lc }); items = lc; local.set([]); }
      return { items, where: 'account' };
    } catch (e) { return { items: local.get(), where: 'device', error: e.message }; }
  },
  async set(items) { if (auth.user) await lab('PUT', '/me/holdings', { items }); else local.set(items); },
};
/** Paper trades: practice positions taken from new signals. Kept on this device only. */
const PK = 'qs-paper';
export const paper = {
  get() { try { const v = JSON.parse(localStorage.getItem(PK) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } },
  set(v) { try { localStorage.setItem(PK, JSON.stringify(v)); } catch { /* storage blocked */ } },
  has(sym) { return paper.get().some(p => p.sym === sym); },
  add(t) { paper.set(paper.get().filter(p => p.sym !== t.sym).concat([{ ...t, at: new Date().toISOString() }])); },
  remove(sym) { paper.set(paper.get().filter(p => p.sym !== sym)); },
};
export const recent = {
  get() { try { return JSON.parse(localStorage.getItem('qs-m-recent') || '[]'); } catch { return []; } },
  add(sym, name) { try { const l = recent.get().filter(x => x.s !== sym); l.unshift({ s: sym, n: name }); localStorage.setItem('qs-m-recent', JSON.stringify(l.slice(0, 8))); } catch { /* ignore */ } },
};

/* ---------------------------------------------------------------- shared data shaping */
const reasonText = r => {
  const s = String(r || '').toUpperCase();
  if (s.includes('TARGET') || s === 'T1' || s === 'T2') return 'Reached target';
  if (s.includes('TRAIL')) return 'Trailing stop, locked profit';
  if (s.includes('BE') && s.includes('LOCK')) return 'Exited at break-even';
  if (s.includes('STOP') || s === 'SL') return 'Stop loss hit';
  if (s.includes('TIME')) return 'Time limit reached';
  if (s.includes('DIST') || s.includes('GUARD')) return 'Heavy selling, exited early';
  return s ? sentence(s.replace(/_/g, ' ').toLowerCase()) : 'Closed';
};
export const STRAT_NAMES = { '52W_HIGH': '52-week high breakout', HTF: 'High tight flag', DARVAS: 'Darvas box', BASE: 'Base breakout', Apex: 'Apex momentum', Leader: 'Market leader', Breakout: 'Breakout', Flag: 'Bull flag', Gap: 'Gap and go' };
export const STRAT_WHAT = {
  '52W_HIGH': 'Buys stocks that close at a new 52-week high on strong volume, when there is no overhead supply left.',
  HTF: 'Buys a stock that has run up sharply, then rests in a tight range for a few weeks, as it breaks out of that range.',
  DARVAS: 'Draws a box around a stock\'s recent range and buys when price closes above the top of the box.',
  BASE: 'Buys stocks breaking out of a long, flat base where sellers have been worn out.',
  Apex: 'Short holds in the strongest stocks of the day, with tight stops. Many small wins.',
  Leader: 'Buys the strongest stocks in the strongest sectors on a pullback, and holds while the trend lasts.',
  Breakout: 'Buys when price closes above a level that stopped it several times before, on heavy volume.',
  Flag: 'Buys a short pause after a sharp rise, when price breaks out of the pause.',
  Gap: 'Buys stocks that open sharply higher on news and hold the gap through the day.',
};
export const stratName = (id, name) => STRAT_NAMES[id] || clean(name || id || 'Strategy');
export function toCall(a) {
  const sym = String(a.symbol || a.sym || '');
  const fib = a.fibLevels ? Object.entries(a.fibLevels).map(([k, v]) => [k, n(v)]).filter(([, v]) => isFinite(v)) : [];
  return {
    sym, name: clean(a.companyName || a.name || sym), sector: clean(a.sector || ''), action: String(a.action || 'BUY_NOW').toUpperCase(),
    stratId: a.strategyId || '', strategy: stratName(a.strategyId, a.strategyName || a.stage),
    entry: n(a.entryPrice ?? a.entry), stop: n(a.stopLoss ?? a.stop), target: n(a.targetPrice ?? a.target), now: n(a.currentPrice ?? a.now ?? a.price ?? a.entryPrice),
    roi: n(a.currentROI ?? a.roiPct ?? a.pnlPct ?? a.chg ?? 0), days: n(a.holdingDays ?? a.days ?? 0), entryDate: a.entryDate || '', why: sentence(a.why || ''),
    score: n(a.compositeScore ?? a.comp ?? a.ml), pivot: n(a.pivot), floor: n(a.floor), fib, spark: (a.sparkline || a.miniChart?.sparkline || []).map(n).filter(isFinite),
    engine: a.engine || '', tradeId: a.tradeId || '', lock: n(a.beLockPrice), raw: a,
  };
}
export function toClosed(c) {
  const roi = n(c.roiPct ?? c.pnlPct ?? c.returnPct);
  return {
    id: String(c.tradeId || `${c.symbol || c.sym}_${c.entryDate || ''}`), sym: c.symbol || c.sym, name: clean(c.name || c.symbol), stratId: c.strategyId || '',
    strategy: stratName(c.strategyId, c.strategyName), entry: n(c.entryPrice ?? c.entry), exit: n(c.exitPrice ?? c.exit), roi, pnl: n(c.realizedPnl ?? c.pnl),
    win: c.isWin != null ? !!c.isWin : roi > 0, reason: reasonText(c.exitReason || c.reason), rawReason: String(c.exitReason || c.reason || ''),
    entryDate: c.entryDate || '', exitDate: c.exitDate || '', days: n(c.holdingDays ?? c.days ?? 0), origin: c.origin || '',
    spark: (c.sparkline || c.miniChart?.sparkline || []).map(n).filter(isFinite), r: n(c.r),
  };
}
export async function loadTerminal() {
  const d = await api('/terminal-data?version=v2', 3);
  const active = (d.active || d.inTradeTrades || []).map(toCall);
  const toBuy = (d.toBuySignals || []).map(a => ({ ...toCall(a), isNew: true })).sort((a, b) => (b.score || 0) - (a.score || 0));
  const closed = (d.closedTrades || d.closed || []).map(toClosed).filter(c => isFinite(c.roi));
  closed.sort((a, b) => (b.exitDate || '').localeCompare(a.exitDate || ''));
  return { active, toBuy, closed, kpis: d.kpis || {}, at: d.generatedAt || '' };
}

/* pattern calls (Radar engine) */
export function stageOf(r, origin = '') {
  const st = String(r?.trade_call?.state || r?.trade_state || '').toUpperCase();
  if (st && st !== 'NA') {
    if (st === 'BREAKOUT' || st === 'WEAK_BREAKOUT') return 'Breakout';
    if (st === 'NEAR' || st === 'ATTEMPT') return 'Near';
    if (st === 'RETEST_HOLD' || st === 'RETEST_WATCH') return 'Retest';
    if (st === 'BUILDING' || st === 'FORMING') return 'Forming';
    return 'Other';
  }
  const bs = String(r?.breakout_status || '').toUpperCase(), ps = String(r?.pattern_stage || '').toUpperCase(), ex = String(r?.execution_state || '').toUpperCase();
  if (bs === 'TARGET_ACHIEVED' || ex.includes('TARGET')) return 'Other';
  if (origin === 'retest') return 'Retest';
  if (origin === 'near' || ex === 'NEAR' || ps === 'NEAR_BREAKOUT') return 'Near';
  if (bs === 'SUCCESS' || bs === 'POST_BREAKOUT') { const g = n(r?.curr_price) / n(r?.breakout_level) - 1; return isFinite(g) && g >= -0.02 && g <= 0.06 ? 'Breakout' : 'Other'; }
  if (ps === 'FORMING' || bs === 'PENDING') return 'Forming';
  return 'Other';
}
export const patternName = s => clean(String(s || '').split('·')[0]) || 'Chart pattern';
export function toPattern(r, origin = '') {
  const tc = r.trade_call || {}, c = tc.confidence, plan = tc.plan || {};
  const tf = String(r.timeframe || tc.tf || 'DAILY').toUpperCase();
  return {
    sym: r.symbol, name: clean(r.company_name || r.symbol), sector: clean(r.sector || ''), tf: tf.startsWith('W') ? 'W' : tf.startsWith('M') ? 'M' : 'D',
    stage: stageOf(r, origin), action: String(tc.action || r.trade_action || 'NONE').toUpperCase(), grade: tc.grade || r.trade_grade || '',
    price: n(r.curr_price ?? tc.price), level: n(tc.level ?? r.breakout_level), stop: n(plan.stop ?? r.stop_loss), target: n(plan.target ?? r.target_1),
    riskPct: n(plan.risk_pct), rr: n(plan.reward_risk ?? r.risk_reward_ratio), size: n(plan.size_pct_for_1pct_risk), horizon: n(plan.horizon_bars),
    pattern: patternName(r.pattern_type), patternFull: clean(r.pattern_type || ''), notes: (Array.isArray(tc.notes) ? tc.notes : []).map(sentence),
    conf: c ? { label: clean(c.label), text: clean(c.text), win: n(c.win_rate) * 100, hit: n(c.p_target) * 100, avg: n(c.expectancy_pct), n: n(c.n), ci: c.ci95 } : null,
    xray: n(r.dna_score), rsi: n(r.rsi), vol: n(tc.volume_ratio ?? r.volume_ratio_20d), adx: n(r.adx14), stage2: clean(r.minervini_stage || ''), align: r.ema_alignment || '',
    age: n(tc.event_age ?? r.days_since_breakout), headroom: n(tc.headroom_atr), aboveTrend: tc.above_trend, resolution: tc.resolution || null, raw: r,
  };
}
export async function loadPatterns() {
  const [br, rows] = await Promise.all([
    api('/screener/breakouts', 10).catch(() => ({ success: [], near_breakout: [], retest: [], scan_date: '' })),
    api('/screener?limit=200', 10).catch(() => ({ rows: [], scan_date: '' })),
  ]);
  const seen = new Map();
  const add = (l, origin) => (l || []).forEach(r => { const k = `${r?.symbol}|${String(r?.timeframe || '')[0] || 'D'}`; if (r?.symbol && !seen.has(k)) seen.set(k, toPattern(r, origin)); });
  add(br.success, 'success'); add(br.retest, 'retest'); add(br.near_breakout, 'near'); add(rows.rows, '');
  const list = [...seen.values()].filter(p => p.stage !== 'Other' && isFinite(p.price) && p.level > 0);
  const order = { Breakout: 0, Retest: 1, Near: 2, Forming: 3 };
  const g = { A: 0, B: 1, C: 2 };
  list.sort((a, b) => order[a.stage] - order[b.stage] || (g[a.grade] ?? 3) - (g[b.grade] ?? 3) || Math.abs(a.price / a.level - 1) - Math.abs(b.price / b.level - 1));
  const counts = { Breakout: 0, Retest: 0, Near: 0, Forming: 0 };
  list.forEach(p => counts[p.stage]++);
  return { rows: list, counts, scanDate: br.scan_date || rows.scan_date || '' };
}

/* ---------------------------------------------------------------- router and screens */
const TABS = [
  ['today', '', 'Today', 'today'],
  ['calls', 'calls', 'AI Calls', 'ai'],
  ['patterns', 'patterns', 'Patterns', 'pattern'],
  ['xray', 'xray', 'X-Ray', 'xray'],
  ['portfolio', 'portfolio', 'Portfolio', 'pf'],
];
const ROUTES = [
  [/^$/, 'today', 'today'],
  [/^calls$/, 'calls', 'calls'],
  [/^calls\/closed\/([^/]+)$/, 'closed', 'calls'],
  [/^calls\/([^/]+)$/, 'call', 'calls'],
  [/^record$/, 'record', 'calls'],
  [/^patterns$/, 'patterns', 'patterns'],
  [/^patterns\/([^/]+)$/, 'pattern', 'patterns'],
  [/^xray$/, 'xray', 'xray'],
  [/^xray\/([^/]+)$/, 'report', 'xray'],
  [/^market$/, 'market', 'today'],
  [/^portfolio$/, 'portfolio', 'portfolio'],
];
export function parse(loc = location) {
  let p = loc.pathname.replace(/\/+$/, '');
  if (p.startsWith(CFG.base)) p = p.slice(CFG.base.length);
  p = p.replace(/^\/+/, '');
  for (const [re, view, tab] of ROUTES) {
    const m = p.match(re);
    if (m) return { view, tab, arg: m[1] ? decodeURIComponent(m[1]) : '', path: p, query: new URLSearchParams(loc.search), root: view === tab };
  }
  return { view: 'today', tab: 'today', arg: '', path: '', query: new URLSearchParams(), root: true };
}
const stage = () => document.getElementById('stage');
const roots = {};
let stack = []; // detail screens above the current tab: [{el, key, cleanup}]
let curTab = null;
const keyOf = r => r.path + (r.query.toString() ? '?' + r.query : '');

function newScreen(cls) { const el = document.createElement('section'); el.className = 'screen ' + cls; stage().appendChild(el); return el; }
async function draw(el, r) {
  const mod = await import(`./views/${r.view}.js`);
  el.innerHTML = '';
  el.dataset.view = r.view;
  try { const cl = (await mod.default(el, r)) || null; reveal(el); return cl; } catch (e) { console.error(e); el.innerHTML = `<div class="wrap" style="padding-top:80px">${errBox('This page failed to load. ' + e.message, false)}</div>`; }
}
function setTabs(tab) {
  if (curTab && curTab !== tab && navigator.vibrate) { try { navigator.vibrate(6); } catch { /* not allowed */ } }
  curTab = tab;
  document.querySelectorAll('[data-tab]').forEach(a => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
  const i = TABS.findIndex(t => t[0] === tab), ind = document.querySelector('#tabs .ind');
  if (ind && i >= 0) ind.style.transform = `translateX(${i * 100}%)`;
}
function title(r) {
  const t = { today: 'Today', calls: 'AI Calls', patterns: 'Pattern Calls', xray: 'Stock X-Ray', portfolio: 'Portfolio', record: 'Track record', market: 'Market map' }[r.view] || r.arg;
  document.title = (t ? t + ' · ' : '') + 'QuantSync';
}
const anim = (el, kf, o) => (RM || !el.animate ? Promise.resolve() : el.animate(kf, { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both', ...o }).finished.catch(() => {}));

async function showRoot(tab, r, fresh) {
  let el = roots[tab];
  if (!el) { el = roots[tab] = newScreen('root'); el._cleanup = await draw(el, r); el._t = Date.now(); }
  else if (fresh || Date.now() - (el._t || 0) > 5 * MIN) { const st = el.scrollTop; el._cleanup && el._cleanup(); el._cleanup = await draw(el, r); el._t = Date.now(); el.scrollTop = st; }
  Object.entries(roots).forEach(([k, s]) => { s.hidden = k !== tab; });
  return el;
}
function clearStack() { stack.forEach(s => { s.cleanup && s.cleanup(); s.el.remove(); }); stack = []; }

async function render(r, how) {
  title(r);
  const prevTab = curTab;
  setTabs(r.tab);
  if (r.root) {
    if (how === 'pop' && stack.length === 1 && prevTab === r.tab) { await popTop(); return; }
    clearStack();
    const el = await showRoot(r.tab, r);
    if (how === 'tab' && prevTab === r.tab) el.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    else if (how === 'tab') anim(el, [{ opacity: .4 }, { opacity: 1 }], { duration: 180 });
    return;
  }
  const key = keyOf(r);
  if (how === 'pop' && stack.length >= 2 && stack[stack.length - 2].key === key) { await popTop(); return; }
  if (how === 'pop' || how === 'load' || prevTab !== r.tab) {
    clearStack();
    const base = await showRoot(r.tab, { ...parse({ pathname: CFG.base + '/' + TABS.find(t => t[0] === r.tab)[1], search: '' }) });
    base.hidden = false;
  }
  const el = newScreen('detail');
  const below = stack.length ? stack[stack.length - 1].el : roots[r.tab];
  const entry = { el, key, cleanup: null };
  stack.push(entry);
  const p = draw(el, r).then(c => { entry.cleanup = c; });
  if (how === 'push') {
    anim(el, [{ transform: 'translateX(100%)' }, { transform: 'none' }]);
    if (below) anim(below, [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'translateX(-24%)', filter: 'brightness(.94)' }]).then(() => { if (below.isConnected) { below.hidden = true; below.getAnimations().forEach(a => a.cancel()); } });
  } else if (below) below.hidden = true;
  edgeSwipe(el);
  await p;
}
async function popTop() {
  const top = stack.pop(); if (!top) return;
  const below = stack.length ? stack[stack.length - 1].el : roots[curTab];
  if (below) { below.hidden = false; anim(below, [{ transform: 'translateX(-24%)', filter: 'brightness(.94)' }, { transform: 'none', filter: 'brightness(1)' }], { duration: 320 }).then(() => below.getAnimations().forEach(a => a.cancel())); }
  await anim(top.el, [{ transform: top.el.style.transform || 'none' }, { transform: 'translateX(100%)' }], { duration: 320 });
  top.cleanup && top.cleanup(); top.el.remove();
}
function edgeSwipe(el) {
  let x0 = null, y0 = 0, dx = 0, t0 = 0, locked = false;
  const below = () => (stack.length >= 2 ? stack[stack.length - 2].el : roots[curTab]);
  el.addEventListener('touchstart', e => { const t = e.touches[0]; if (t.clientX > 28) return; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); locked = false; dx = 0; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (x0 == null) return; const t = e.touches[0];
    if (!locked) { if (Math.abs(t.clientY - y0) > Math.abs(t.clientX - x0)) { x0 = null; return; } locked = true; const b = below(); if (b) b.hidden = false; }
    dx = Math.max(0, t.clientX - x0); el.style.transform = `translateX(${dx}px)`;
    const b = below(); if (b) b.style.transform = `translateX(${-24 + (dx / el.offsetWidth) * 24}%)`;
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (x0 == null) return; x0 = null; const b = below();
    const v = dx / Math.max(1, Date.now() - t0);
    if (dx > el.offsetWidth * .35 || v > .6) { if (b) b.style.transform = ''; history.back(); }
    else { anim(el, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 250 }).then(() => { el.style.transform = ''; el.getAnimations().forEach(a => a.cancel()); }); if (b) { b.style.transform = ''; b.hidden = true; } }
  });
}
export function go(path, { replace = false } = {}) {
  const url = CFG.base + '/' + String(path).replace(/^\/+/, '');
  if (url === location.pathname + location.search) return;
  const r = parse(new URL(url, location.origin));
  const isTab = r.root;
  history[replace ? 'replaceState' : 'pushState']({ d: (history.state?.d || 0) + (isTab || replace ? 0 : 1) }, '', url);
  render(r, isTab ? 'tab' : 'push');
}
export function back(fallback) { if (stack.length && history.state && history.state.d > 0) history.back(); else go(fallback || '', { replace: true }); }

/** Shared chrome for every screen: a compact bar that becomes solid on scroll, plus a large title. */
export function chrome(el, { title, sub = '', back: backTo, actions = '', when = '' }) {
  el.innerHTML = `<div class="aurora" aria-hidden="true"></div><header class="bar">${backTo != null ? `<button class="ib back" data-back aria-label="Back">${icon('back', 22)}<span>${esc(backTo)}</span></button>` : '<span class="sp"></span>'}<div class="bt">${esc(title)}</div>${actions || '<span class="sp"></span>'}</header>
  <div class="head"><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}${when ? `<div class="when">${when}</div>` : ''}</div><div class="wrap body"></div>`;
  const bar = el.querySelector('.bar'), head = el.querySelector('.head h1');
  const on = () => bar.classList.toggle('solid', el.scrollTop > (head ? head.offsetTop + head.offsetHeight - 52 : 40));
  el.addEventListener('scroll', on, { passive: true });
  const b = el.querySelector('[data-back]'); if (b) b.onclick = () => back(TABS.find(t => t[0] === parse().tab)?.[1]);
  return el.querySelector('.body');
}
export async function share(title, text) {
  const url = location.href;
  try { if (navigator.share) { await navigator.share({ title, text, url }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
}

export function boot() {
  const theme = (() => { try { return localStorage.getItem('qs-theme'); } catch { return null; } })();
  if (theme) document.documentElement.dataset.theme = theme;
  const tabs = document.getElementById('tabs'), rail = document.getElementById('rail');
  tabs.innerHTML = '<span class="ind" aria-hidden="true"></span>' + TABS.map(([k, p, l, ic]) => `<a class="tab" href="${CFG.base}/${p}" data-nav data-tab="${k}" aria-label="${l}">${tabIcon(ic)}<span>${l}</span></a>`).join('');
  rail.innerHTML = `<div class="brand">${logo(28)}QuantSync</div>` + TABS.map(([k, p, l, ic]) => `<a href="${CFG.base}/${p}" data-nav data-tab="${k}">${tabIcon(ic)}<span>${l}</span></a>`).join('') +
    `<a href="/app/" style="margin-top:14px">${icon('flask', 22)}<span>Strategy Lab</span></a><div class="rail-foot">Research and education. Not investment advice. Prices can be delayed.</div>`;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-nav]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    e.preventDefault();
    go(a.getAttribute('href').slice(CFG.base.length + 1));
  });
  W.addEventListener('popstate', () => render(parse(), 'pop'));
  history.replaceState({ d: parse().root ? 0 : 1 }, '', location.href);
  render(parse(), 'load');
}
export const logo = (s = 28) => `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--brand)"/><path d="M7 21.5 12.5 15l4 3.5L25 9.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="9.5" r="2.6" fill="var(--ai-solid)"/></svg>`;
