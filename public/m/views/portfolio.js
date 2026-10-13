import { api, chrome, fmt, esc, icon, n, ok, link, mono, delta, tone, holdings, auth, sheet, toast, go, scoreTone, scoreColor, clean, loadTerminal, loadPatterns, empty, errBox, skel, hue } from '../core.js';
import { sec, footNote } from './parts.js';
import { addSheet } from './report.js';

export default async function portfolio(el) {
  const body = chrome(el, { title: 'Portfolio', sub: 'Your stocks, checked against our engines every evening.', actions: `<button class="ib" data-add aria-label="Add a stock">${icon('plus', 22)}</button>` });
  body.innerHTML = `<div id="pf-acct"></div><div id="pf-main"></div>${footNote('Prices are from the exchange and can be delayed. Your holdings stay private.')}`;
  el.querySelector('[data-add]').onclick = () => pick(load);
  const off = auth.onChange(() => { acct(); load(); });
  auth.init();

  function acct() {
    const a = body.querySelector('#pf-acct'), u = auth.user;
    a.innerHTML = `<div class="panel" style="display:flex;align-items:center;gap:12px;padding:12px 14px">
      <span class="mono" style="--h:220;border-radius:50%">${u ? esc((u.displayName || u.email || '?').slice(0, 1).toUpperCase()) : icon('user', 18)}</span>
      <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14.5px">${u ? esc(u.displayName || u.email) : 'Saved on this phone'}</div><div class="small">${u ? 'Synced to your account' : 'Sign in to keep it on every device'}</div></div>
      <button class="btn ${u ? 'quiet' : ''} sm" data-auth>${u ? 'Sign out' : 'Sign in'}</button></div>`;
    a.querySelector('[data-auth]').onclick = async () => { try { u ? await auth.signOut() : await auth.signIn(); } catch (e) { toast(e.message || 'Sign-in failed.'); } };
  }

  async function load() {
    const main = body.querySelector('#pf-main');
    main.innerHTML = `<div style="margin-top:14px">${skel(190, 1, 22)}${skel(64, 3)}</div>`;
    let h;
    try { h = await holdings.get(); } catch (e) { main.innerHTML = errBox(e.message); return; }
    const items = (h.items || []).filter(x => x.symbol && n(x.qty) > 0);
    if (!items.length) {
      main.innerHTML = `<div style="margin-top:14px">${empty('pf', 'Add the stocks you own', 'We will show what they are worth, your profit or loss, and flag any stock whose trend or X-Ray score turns weak.', '<button class="btn" data-pick>Add a stock</button>')}</div>`;
      main.querySelector('[data-pick]').onclick = () => pick(load);
      return;
    }
    const syms = items.map(x => x.symbol);
    const [xr, quotes, term, pats] = await Promise.all([
      api(`/app/xray-batch?symbols=${syms.join(',')}`, 15).then(d => d.items || {}).catch(() => ({})),
      Promise.all(syms.map(s => api(`/stock/quote/${encodeURIComponent(s)}`, 2).catch(() => null))),
      loadTerminal().catch(() => null), loadPatterns().catch(() => null),
    ]);
    const rows = items.map((x, i) => {
      const q = quotes[i] || {}, info = xr[x.symbol] || {};
      const px = ok(q.price) ? n(q.price) : n(info.price), prev = ok(q.prev_close) ? n(q.prev_close) : NaN;
      const qty = n(x.qty), avg = n(x.avg_price);
      return { ...x, info, px, qty, avg, value: px * qty, cost: isFinite(avg) ? avg * qty : NaN, day: isFinite(prev) ? (px - prev) * qty : NaN, dayPct: isFinite(prev) ? (px / prev - 1) * 100 : NaN, pnlPct: isFinite(avg) ? (px / avg - 1) * 100 : NaN,
        call: term && (term.toBuy.find(c => c.sym === x.symbol) || term.active.find(c => c.sym === x.symbol)), pat: pats && pats.rows.find(p => p.sym === x.symbol) };
    });
    const val = rows.reduce((a, r) => a + (isFinite(r.value) ? r.value : 0), 0);
    const costRows = rows.filter(r => isFinite(r.cost) && isFinite(r.value));
    const cost = costRows.reduce((a, r) => a + r.cost, 0), pnl = costRows.reduce((a, r) => a + r.value - r.cost, 0);
    const day = rows.reduce((a, r) => a + (isFinite(r.day) ? r.day : 0), 0), dayBase = val - day;
    const scored = rows.filter(r => ok(r.info.score)), avgScore = scored.length ? scored.reduce((a, r) => a + r.info.score * (r.value || 0), 0) / Math.max(1, scored.reduce((a, r) => a + (r.value || 0), 0)) : NaN;
    const flags = [];
    rows.forEach(r => {
      const s = n(r.info.score), e200 = n(r.info.ema200);
      if (isFinite(s) && s < 45) flags.push(['dn', 'alert', `${r.symbol}: X-Ray score ${fmt.int(s)}`, `Weak on ${s < 30 ? 'most' : 'several'} checks. Read the report before adding more.`, r.symbol]);
      if (isFinite(e200) && r.px < e200) flags.push(['warn', 'arrowDn', `${r.symbol} is below its 200-day average`, `${fmt.pct((1 - r.px / e200) * 100)} under ${fmt.px(e200)}. Long-term trend is down.`, r.symbol]);
      if (isFinite(r.pnlPct) && r.pnlPct <= -12) flags.push(['dn', 'alert', `${r.symbol} is ${fmt.pct(-r.pnlPct, 0)} below your price`, 'Decide where you would sell if it keeps falling.', r.symbol]);
      if (r.call) flags.push(['ai', 'ai', `The AI is holding ${r.symbol} too`, `${r.call.strategy}, stop at ${fmt.px(r.call.stop)}.`, r.symbol, `calls/${encodeURIComponent(r.symbol)}`]);
      if (r.pat && (r.pat.stage === 'Breakout' || r.pat.stage === 'Retest')) flags.push(['up', 'pattern', `${r.symbol}: ${r.pat.stage.toLowerCase()} on the ${r.pat.tf === 'W' ? 'weekly' : 'daily'} chart`, `${r.pat.pattern} above ${fmt.px(r.pat.level)}.`, r.symbol, `patterns/${encodeURIComponent(r.symbol)}?tf=${r.pat.tf}`]);
    });
    const order = { dn: 0, warn: 1, ai: 2, up: 3 };
    flags.sort((a, b) => order[a[0]] - order[b[0]]);
    const bySector = {};
    rows.forEach(r => { const s = clean(r.info.sector || 'Other'); const k = s === 'NSE Equities' ? 'Other' : s; bySector[k] = (bySector[k] || 0) + (r.value || 0); });
    const secs = Object.entries(bySector).sort((a, b) => b[1] - a[1]);

    main.innerHTML = `
      <div class="pfhero" style="margin-top:14px">
        <div class="k">Current value</div><div class="v">${fmt.lakh(val)}</div>
        ${isFinite(day) && dayBase > 0 ? `<div class="d ${tone(day)}">${fmt.sinr(day)} (${fmt.sp(day / dayBase * 100, 2)}) today</div>` : ''}
        <div class="row3">
          <div><div class="kk">Total profit</div><div class="vv ${tone(pnl)}">${cost ? fmt.sinr(pnl) : '—'}</div></div>
          <div><div class="kk">Return</div><div class="vv ${tone(pnl)}">${cost ? fmt.sp(pnl / cost * 100) : '—'}</div></div>
          <div><div class="kk">Avg X-Ray</div><div class="vv">${isFinite(avgScore) ? fmt.int(avgScore) : '—'}</div></div>
        </div>
      </div>
      ${flags.length ? sec('Worth a look', `<div class="group">${flags.slice(0, 8).map(([k, ic, t, s, sym, to]) => link(to || `xray/${encodeURIComponent(sym)}`, `<span class="ic" style="background:var(--${k === 'warn' ? 'warn' : k}-soft);color:var(--${k === 'warn' ? 'warn' : k})">${icon(ic, 16)}</span><div style="flex:1;min-width:0"><div class="t">${esc(t)}</div><div class="s">${esc(s)}</div></div>`, 'flag')).join('')}</div>`, { p: 'Flags from last night’s X-Ray and engine runs.' }) : sec('Worth a look', `<div class="panel pad small">Nothing needs attention. Every stock is above its long-term trend with a fair X-Ray score.</div>`)}
      ${sec(`Holdings <span class="faint" style="font-weight:500">${rows.length}</span>`, `<div class="group">${rows.sort((a, b) => (b.value || 0) - (a.value || 0)).map(r => `<button class="row" data-sym="${esc(r.symbol)}">${mono(r.symbol)}
        <div class="main"><div class="t">${esc(r.symbol)} ${ok(r.info.score) ? `<span class="tnum" style="font-size:12px;font-weight:650;color:${scoreColor(r.info.score)}">${fmt.int(r.info.score)}</span>` : ''}</div><div class="s tnum">${fmt.x(r.qty, r.qty % 1 ? 2 : 0)} × ${isFinite(r.avg) ? fmt.px(r.avg) : 'no price set'}</div></div>
        <div class="end"><div class="v tnum">${fmt.lakh(r.value)}</div><div class="d">${isFinite(r.pnlPct) ? delta(r.pnlPct) : isFinite(r.dayPct) ? delta(r.dayPct) + ' <span class="faint">today</span>' : ''}</div></div></button>`).join('')}</div>`, { more: '<button class="more" data-pick2>Add</button>' })}
      ${secs.length > 1 ? sec('Spread by sector', `<div class="panel pad"><div class="breadth"><div class="track" style="height:14px;border-radius:7px">${secs.map(([k, v]) => `<i style="width:${v / val * 100}%;background:hsl(${hue(k)} 55% 55%)"></i>`).join('')}</div></div>
        <div style="display:grid;gap:8px;margin-top:14px">${secs.map(([k, v]) => `<div style="display:flex;align-items:center;gap:8px;font-size:14px"><i style="width:10px;height:10px;border-radius:3px;background:hsl(${hue(k)} 55% 55%)"></i><span style="flex:1">${esc(k)}</span><b class="tnum">${fmt.pct(v / val * 100, 0)}</b></div>`).join('')}</div>
        ${secs[0][1] / val > .4 ? `<p class="small" style="margin:12px 0 0">Over 40% sits in ${esc(secs[0][0])}. One bad week for that sector would hit the whole portfolio.</p>` : ''}</div>`) : ''}`;
    main.querySelectorAll('[data-sym]').forEach(b => b.onclick = () => manage(rows.find(r => r.symbol === b.dataset.sym), items));
    main.querySelector('[data-pick2]').onclick = () => pick(load);
    if (h.error) toast(h.error);
  }

  function manage(r, items) {
    const s = sheet(`<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">${mono(r.symbol, 'lg')}<div><h3 style="margin:0">${esc(r.symbol)}</h3><div class="small">${esc(clean(r.info.name || ''))}</div></div></div>
      <div class="kv" style="margin-bottom:14px"><div><div class="k">Value</div><div class="v">${fmt.lakh(r.value)}</div></div><div><div class="k">Profit</div><div class="v ${tone(r.pnlPct)}">${isFinite(r.cost) ? fmt.sinr(r.value - r.cost) : '—'}</div></div></div>
      <div style="display:grid;gap:8px"><button class="btn block" data-x>${icon('xray', 18)}Open the X-Ray</button><button class="btn ghost block" data-e>${icon('edit', 18)}Change shares or price</button><button class="btn quiet block" data-r style="color:var(--dn)">${icon('trash', 18)}Remove from portfolio</button></div>`, { label: r.symbol });
    s.el.querySelector('[data-x]').onclick = () => { s.close(); go(`xray/${encodeURIComponent(r.symbol)}`); };
    s.el.querySelector('[data-e]').onclick = () => { s.close(); setTimeout(() => addSheet(r.symbol, r.avg, load), 300); };
    s.el.querySelector('[data-r]').onclick = async () => { try { await holdings.set(items.filter(x => x.symbol !== r.symbol)); s.close(); toast(`${r.symbol} removed`); load(); } catch (e) { toast(e.message); } };
  }
  return () => off();
}

/** Search sheet: pick a stock, then enter shares and price. */
function pick(done) {
  const s = sheet(`<h3>Add a stock</h3><form class="search" style="margin-top:6px" autocomplete="off">${icon('search', 20)}<input type="search" placeholder="Company or symbol" aria-label="Search stocks"></form><div class="results" style="min-height:120px"></div>`, { label: 'Add a stock' });
  const inp = s.el.querySelector('input'), res = s.el.querySelector('.results');
  let t = 0, seq = 0;
  setTimeout(() => inp.focus(), 380);
  s.el.querySelector('form').onsubmit = e => { e.preventDefault(); res.querySelector('[data-s]')?.click(); };
  inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const v = inp.value.trim(), my = ++seq; if (v.length < 2) { res.innerHTML = ''; return; }
    const l = await api(`/dna/search?q=${encodeURIComponent(v)}`, 10).catch(() => []);
    if (my !== seq) return;
    res.innerHTML = `<div class="group" style="box-shadow:none;background:var(--surface-2)">${(Array.isArray(l) ? l : []).slice(0, 6).map(x => `<button class="row" data-s="${esc(x.symbol)}">${mono(x.symbol)}<div class="main"><div class="t">${esc(x.symbol)}</div><div class="s">${esc(clean(x.name || ''))}</div></div>${icon('plus', 18)}</button>`).join('') || '<p class="small" style="padding:14px">No match.</p>'}</div>`;
    res.querySelectorAll('[data-s]').forEach(b => b.onclick = async () => {
      s.close();
      const px = await api(`/stock/quote/${encodeURIComponent(b.dataset.s)}`, 2).then(q => n(q.price)).catch(() => NaN);
      setTimeout(() => addSheet(b.dataset.s, px, done), 250);
    });
  }, 180); };
}
