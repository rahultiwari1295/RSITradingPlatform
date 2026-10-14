import { api, chrome, fill, fmt, esc, icon, n, ok, link, mono, recent, scoreTone, clean, go, q, loadTerminal, loadPatterns } from '../core.js';
import { stockRow, sec, footNote } from './parts.js';


export default async function xray(el) {
  const body = chrome(el, { title: 'Stock X-Ray', page: 'X-Ray', top: { ey: `${icon('xray', 16)}Stock X-Ray`, h: 'Is it a good company? | Find out in seconds.', hl: ['good'], lede: 'Search any NSE stock. X-Ray checks its trend, momentum, buying activity and business quality, then gives one health score from 0 to 100.', extra: `<form class="search" role="search" autocomplete="off">${icon('search', 20)}<input type="search" placeholder="Company or symbol, e.g. Trent" aria-label="Search stocks" enterkeyhint="search"><button type="button" class="clr" aria-label="Clear">${icon('x', 18)}</button></form>` } });
  body.innerHTML = `
    <div class="results" aria-live="polite"></div>
    <div id="x-recent"></div><div id="x-disc"></div><div id="x-lead"></div><div id="x-how"></div>${footNote('X-Ray reports refresh every evening after the close.')}`;
  const form = el.querySelector('form'), inp = form.querySelector('input'), res = body.querySelector('.results');
  { /* typing hints in the search box */
    const hints = ['Search a company', 'Try TRENT', 'Try Reliance', 'Try “bank”', 'Try Infosys']; let hi = 0, ci = 0, del = false, tm;
    const tick = () => {
      if (!inp.isConnected) return;
      if (document.activeElement === inp || inp.value) { inp.placeholder = 'Search a company'; tm = setTimeout(tick, 900); return; }
      const w = hints[hi];
      if (!del) { ci++; if (ci >= w.length) { del = true; inp.placeholder = w; tm = setTimeout(tick, 1600); return; } }
      else { ci--; if (ci <= 0) { del = false; hi = (hi + 1) % hints.length; } }
      inp.placeholder = w.slice(0, ci) + (ci < w.length ? '▏' : ''); tm = setTimeout(tick, del ? 28 : 62);
    };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tm = setTimeout(tick, 1600);
  }
  let t = 0, seq = 0, first = null;
  const run = async v => {
    const my = ++seq;
    form.classList.toggle('has', !!v);
    if (v.length < 2) { res.innerHTML = ''; first = null; return; }
    try {
      const l = await api(`/dna/search?q=${encodeURIComponent(v)}`, 10);
      if (my !== seq) return;
      const list = (Array.isArray(l) ? l : l.results || []).slice(0, 8);
      first = list[0]?.symbol || null;
      res.innerHTML = list.length ? `<div class="group">${list.map(s => link(`xray/${encodeURIComponent(s.symbol)}`, `${mono(s.symbol)}<div class="main"><div class="t">${esc(s.symbol)}</div><div class="s">${esc(clean(s.name || ''))}</div></div>${icon('chev', 18, 'chev')}`, 'row', `data-n="${esc(clean(s.name || ''))}" data-s="${esc(s.symbol)}"`)).join('')}</div>`
        : `<p class="small" style="padding:8px 4px">No NSE stock matches "${esc(v)}". Try the symbol, like TRENT or HDFCBANK.</p>`;
    } catch { if (my === seq) res.innerHTML = `<p class="small" style="padding:8px 4px">Search is unavailable right now.</p>`; }
  };
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => run(inp.value.trim()), 180); });
  form.onsubmit = e => { e.preventDefault(); const v = inp.value.trim().toUpperCase(); if (first) go(`xray/${encodeURIComponent(first)}`); else if (v) go(`xray/${encodeURIComponent(v.replace(/\s+/g, ''))}`); };
  form.querySelector('.clr').onclick = () => { inp.value = ''; run(''); inp.focus(); };
  res.addEventListener('click', e => { const a = e.target.closest('[data-s]'); if (a) recent.add(a.dataset.s, a.dataset.n); });

  const rc = recent.get();
  if (rc.length) body.querySelector('#x-recent').innerHTML = sec('Recently viewed', `<div class="hs">${rc.map(r => link(`xray/${encodeURIComponent(r.s)}`, `${mono(r.s, 'xs')}${esc(r.s)}`, 'chip', 'style="padding-left:6px"')).join('')}</div>`);

  fill(body.querySelector('#x-lead'), () => api('/app/market', 30), m => {
    const L = (m.leaders || []).slice(0, 6);
    if (!L.length) return;
    body.querySelector('#x-lead').innerHTML = sec('Highest scores today', `<div class="group">${L.map(s => stockRow(s)).join('')}</div>`, { p: `Out of ${fmt.int(m.stocks)} stocks checked last night.` });
  }, '', { quiet: true });

  /* stocks the engines are acting on, with their real X-Ray scores */
  fill(body.querySelector('#x-disc'), async () => {
    const [t, p] = await Promise.all([loadTerminal().catch(() => null), loadPatterns().catch(() => null)]);
    const why = new Map();
    (t ? [...t.toBuy, ...t.active] : []).forEach(c => why.set(c.sym, c.isNew ? 'New AI buy call' : 'Open AI call'));
    (p ? p.rows.filter(r => r.stage === 'Breakout' || r.stage === 'Retest') : []).forEach(r => { if (!why.has(r.sym)) why.set(r.sym, `${r.stage === 'Breakout' ? 'Breakout' : 'Retest'}: ${r.pattern}`); });
    const syms = [...why.keys()].slice(0, 40);
    if (!syms.length) return [];
    const d = await api(`/app/xray-batch?symbols=${syms.map(encodeURIComponent).join(',')}`, 30);
    return syms.map(s => ({ ...(d.items || {})[s], symbol: s, why: why.get(s) })).filter(x => ok(x.score)).sort((a, b) => b.score - a.score);
  }, list => {
    if (!list.length) return;
    body.querySelector('#x-disc').innerHTML = sec('On our engines\u2019 radar', `<div class="group">${list.slice(0, 8).map(s => stockRow({ symbol: s.symbol, name: s.why, score: s.score })).join('')}</div>`, { p: 'Stocks with an AI call or a fresh breakout, ranked by their X-Ray score.' });
  }, sec('On our engines\u2019 radar', '<div class="sk" style="height:240px;border-radius:16px"></div>'), { quiet: true });

  body.querySelector('#x-how').innerHTML = sec(`How the score works${q('xray')}`, `<div class="story">${[
    ['pattern', 'var(--brand)', 'Trend, up to 30', 'Is the price above its 20, 50 and 200-day averages, and are those averages rising?'],
    ['bolt', 'var(--ai)', 'Momentum, up to 25', 'How strongly the price is moving, and how it compares with the Nifty over three months.'],
    ['layers', 'var(--up)', 'Volume, up to 25', 'Are large investors buying? Measured from heavy up-days, delivery share and selling days.'],
    ['shield', 'var(--ink-2)', 'Quality, up to 20', 'Is the business sound? Debt, return on capital and profit growth.'],
  ].map(([ic, c, h, p]) => `<div><span class="ic" style="background:color-mix(in srgb, ${c} 14%, transparent);color:${c}">${icon(ic, 17)}</span><div><div class="h" style="color:var(--ink);font-size:15px">${h}</div><p style="font-size:14px;color:var(--ink-2)">${p}</p></div></div>`).join('')}</div>`);
}
