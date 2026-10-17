import { esc, fmt, intel, sheet, line } from './app.js';

/* Market strip (Screens page): India, World, Commodities & FX as one row of small tiles.
   Colour = how much it moved (green up, red down, stronger = bigger). One look gives the mood of the world.
   Tap a tile for the day's chart, range and the headlines behind a big move. Data: /api/intel2/markets (precomputed on the server). */
const GROUPS = [['India', 'India'], ['World', 'World'], ['Commodities & FX', 'Commodities & FX']];
const REGION = { India: 'India', US: 'World', Europe: 'World', Asia: 'World', Commodities: 'Commodities & FX', 'FX & rates': 'Commodities & FX' };
const SHORT = { 'S&P 500': 'S&P 500', 'Nasdaq': 'Nasdaq', 'Dow Jones': 'Dow', 'FTSE 100': 'FTSE', 'Nikkei 225': 'Nikkei', 'Hang Seng': 'Hang Seng', 'Shanghai': 'Shanghai',
  'Nifty 50': 'Nifty 50', 'Bank Nifty': 'Bank Nifty', 'India VIX': 'India VIX', 'Brent crude': 'Brent', 'Dollar index': 'Dollar', 'USD / INR': 'USD/INR', 'US 10-year yield': 'US 10Y', 'Nifty Midcap': 'Midcap', 'Nifty Smallcap': 'Smallcap' };
/* which stock exchange session a tile belongs to (for the closed/open state) */
const SESSION = { India: 'in', US: 'us', Europe: 'eu', Asia: 'as' };
const SESS = { in: ['India', 'Asia/Kolkata', [[555, 930]]], as: ['Asia', 'Asia/Tokyo', [[540, 690], [750, 900]]], eu: ['Europe', 'Europe/London', [[480, 990]]], us: ['US', 'America/New_York', [[570, 960]]] };
const dp = v => (Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 1 : 2);

function isOpen(k, at = new Date()) {
  const [, tz, win] = SESS[k];
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at).map(x => [x.type, x.value]));
  if (p.weekday === 'Sat' || p.weekday === 'Sun') return false;
  const m = (+p.hour % 24) * 60 + +p.minute;
  return win.some(([a, b]) => m >= a && m < b);
}
/** "Live now: India · Closed: US opens in 4h". */
export function sessionLine(at = new Date()) {
  const open = Object.keys(SESS).filter(k => isOpen(k, at));
  const shut = Object.keys(SESS).filter(k => !open.includes(k));
  let next = null;
  for (let m = 5; m <= 4320 && !next; m += 5) { const t = new Date(at.getTime() + m * 6e4); const k = shut.find(x => isOpen(x, t)); if (k) next = [k, m]; }
  const when = m => m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d';
  return { open, text: (open.length ? 'Live: ' + open.map(k => SESS[k][0]).join(', ') : 'All markets closed') + (next ? ` · ${SESS[next[0]][0]} opens in ${when(next[1])}` : '') };
}

const tint = c => {
  if (c == null || Math.abs(c) < 0.05) return 'flat';
  return c > 0 ? 'up' : 'dn';
};
const mix = c => Math.min(34, 8 + Math.abs(c) * 11);   // % of colour in the tile background: 0.5% move = 13%, 2%+ = 30%+

function tileHTML(m) {
  const c = m.chg_pct, t = tint(c), sess = SESSION[m.region], shut = sess && !isOpen(sess);
  const vix = /vix/i.test(m.name);   // for the fear gauge a rise is bad news, so it is coloured the other way round
  const cls = vix && t !== 'flat' ? (t === 'up' ? 'dn' : 'up') : t;
  return `<button class="mkt-t ${cls} ${shut ? 'shut' : ''}" data-k="${esc(m.key)}" style="--m:${c == null ? 0 : mix(c)}%" aria-label="${esc(m.name)} ${c == null ? '' : fmt.pct(c, 2)}">
    <span class="n">${esc(SHORT[m.name] || m.name)}</span><b class="tnum">${m.last == null ? '—' : fmt.num(m.last, dp(m.last))}</b><em class="tnum">${c == null ? '—' : fmt.pct(c, 2)}</em></button>`;
}
function build(items) {
  const rows = items.filter(m => m.last != null && REGION[m.region]).map(m => ({ ...m, grp: m.grp || REGION[m.region] }));
  const order = { India: ['Nifty 50', 'Bank Nifty', 'Sensex', 'Nifty Midcap', 'Nifty Smallcap', 'India VIX'], World: ['S&P 500', 'Nasdaq', 'Dow Jones', 'Hang Seng', 'Nikkei 225', 'FTSE 100', 'DAX', 'Shanghai'],
    'Commodities & FX': ['Dollar index', 'USD / INR', 'Gold', 'Silver', 'Brent crude', 'Copper', 'US 10-year yield'] };
  return GROUPS.map(([g, label]) => {
    const list = rows.filter(m => m.grp === g).sort((a, b) => { const o = order[g] || [], i = o.indexOf(a.name), j = o.indexOf(b.name); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    return list.length ? { g: label, list } : null;
  }).filter(Boolean);
}

/** Sheet with the day's chart, range and the news behind a big move. */
async function detail(m) {
  const c = m.chg_pct, up = c > 0, prev = m.prev != null ? m.prev : (c != null && m.last ? m.last / (1 + c / 100) : null);
  const sp = Array.isArray(m.spark) ? m.spark.filter(Number.isFinite) : [];
  const sh = sheet(`<div class="mks-h"><div><small>${esc(m.grp)}</small><h3>${esc(m.name)}</h3></div><div class="mks-px"><b class="tnum">${fmt.num(m.last, dp(m.last))}</b><em class="tnum ${fmt.tone(c)}">${c == null ? '' : fmt.pct(c, 2)}</em></div></div>
    ${sp.length > 3 ? '<div id="mks-c" class="mks-c"></div>' : ''}
    <div class="mks-k">${prev != null ? `<span><small>Previous close</small><b class="tnum">${fmt.num(prev, dp(prev))}</b></span>` : ''}${m.lo != null ? `<span><small>Day low</small><b class="tnum">${fmt.num(m.lo, dp(m.lo))}</b></span>` : ''}${m.hi != null ? `<span><small>Day high</small><b class="tnum">${fmt.num(m.hi, dp(m.hi))}</b></span>` : ''}</div>
    <div id="mks-n"></div><button class="btn quiet block" data-close style="margin-top:10px">Close</button>`);
  if (sp.length > 3) line(sh.el.querySelector('#mks-c'), [{ data: sp, color: up ? 'var(--up)' : 'var(--dn)', area: true }], { h: 120, bare: true, label: m.name + ' today' });
  /* why it moved: headlines from the server's link (m.why) or, for a move over 1.5%, the latest market-moving headlines */
  const box = sh.el.querySelector('#mks-n');
  try {
    let L = Array.isArray(m.why) ? m.why : null, big = Math.abs(c || 0) >= 1.5;
    if (!L && big) { const d = await intel.events({ days: 2, category: m.region === 'India' ? 'news,filing' : 'global,macro', min_impact: 40, limit: 3 }); L = d.items || []; }
    if (L && L.length && box.isConnected) box.innerHTML = `<h4 class="fg" style="margin-top:14px">${m.why ? 'Why it moved' : 'Headlines around this move'}</h4>${L.slice(0, 3).map(x => `<a class="mks-w" href="${esc(x.url || '#')}" target="_blank" rel="noopener"><i class="dot ${x.sentiment === 'positive' ? 'pos' : x.sentiment === 'negative' ? 'neg' : ''}"></i><span><b>${esc(x.headline || x.summary || '')}</b><small>${esc(x.source || '')}</small></span></a>`).join('')}`;
  } catch { /* the rest of the sheet still works */ }
}

export function mountStrip(box) {
  let items = [], timer = 0;
  const paint = () => {
    const G = build(items);
    if (!G.length) { box.innerHTML = ''; return; }
    const ss = sessionLine();
    box.innerHTML = `<section class="mkt-s" aria-label="Markets"><div class="mkt-h"><span class="lbl">Markets</span><span class="tiny ${ss.open.length ? 'live' : ''}">${ss.open.length ? '<i class="pulse"></i>' : ''}${esc(ss.text)}</span></div>
      <div class="mkt-row" role="list">${G.map(({ g, list }) => `<div class="mkt-g" role="group" aria-label="${esc(g)}"><small>${esc(g)}</small><div class="mkt-ts">${list.map(tileHTML).join('')}</div></div>`).join('')}</div></section>`;
  };
  const load = async first => {
    try {
      const d = await intel.markets(), next = d.items || [];
      const old = new Map(items.map(m => [m.key, m.last]));
      items = next; paint();
      if (!first) next.forEach(m => { const o = old.get(m.key); if (o != null && m.last != null && o !== m.last) { const t = box.querySelector(`[data-k="${CSS.escape(m.key)}"]`); if (t) { t.classList.add(m.last > o ? 'fl-up' : 'fl-dn'); setTimeout(() => t.classList.remove('fl-up', 'fl-dn'), 1100); } } });
    } catch { if (!items.length) box.innerHTML = ''; }
  };
  box.addEventListener('click', e => { const t = e.target.closest('[data-k]'); if (!t) return; const m = items.find(x => x.key === t.dataset.k); if (m) detail({ ...m, grp: m.grp || REGION[m.region] }); });
  box.innerHTML = '<div class="mkt-s"><div class="mkt-row"><div class="sk" style="height:66px;width:100%"></div></div></div>';
  load(true);
  timer = setInterval(() => { if (!document.hidden && box.isConnected) load(false); else if (!box.isConnected) clearInterval(timer); }, 60e3);
}
