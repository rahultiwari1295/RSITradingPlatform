import { icon, esc, fmt, n, ok, api, go, words, skel, errBox, line, link } from '../app.js';

/* Stock X-Ray: facts about a company the person chose, in plain words. No score, no verdict, no advice. */
const ADV = /\b(buy|sell|target|stop[- ]?loss|accumulate|entry|exit|avoid|book profit|undervalued|overvalued|multibagger)\b/i;
const clean = s => String(s || '').replace(/&#x27;/g, "'").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
const PIL = [['trend', 'Trend', 'trend', '#5B6CFF', 'Is the price going up or down over months?'], ['momentum', 'Momentum', 'bolt', '#E0A030', 'How strong the recent moves have been.'], ['volume', 'Buying activity', 'bars', '#0E9F8A', 'Are more shares changing hands on up days or down days?'], ['quality', 'Business', 'shield', '#7B55F0', 'Profits, debt and returns on capital.']];

export default async function xray(el, r) {
  const sym = (r.arg || '').toUpperCase();
  el.innerHTML = `
  <div class="head"><span class="ey">${icon('xray', 16)}Stock X-Ray</span>
    ${sym ? '' : `<h1 class="h1">${words('Understand any company <em>in a minute.</em>')}</h1><p class="lede">Search an NSE stock. You get its trend, momentum, buying activity and business facts in plain words. Facts, not a verdict.</p>`}
    <form class="xsearch" id="xf" style="margin-top:6px">${icon('search', 20)}<input id="xi" placeholder="Company or symbol" value="${esc(sym)}" aria-label="Search a company" autocomplete="off"><button class="btn pri sm">X-Ray</button></form>
    <div id="sug"></div></div>
  <div id="rep"></div>`;
  const inp = el.querySelector('#xi'), sug = el.querySelector('#sug');
  el.querySelector('#xf').onsubmit = e => { e.preventDefault(); const v = inp.value.trim().toUpperCase().replace(/\s+/g, ''); if (v) go('xray/' + encodeURIComponent(v)); };
  let t = 0;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const v = inp.value.trim(); if (v.length < 2) { sug.innerHTML = ''; return; }
    const L = await api.search(v).catch(() => []); const list = (Array.isArray(L) ? L : L.results || []).slice(0, 6);
    sug.innerHTML = list.length ? `<div class="list" style="margin-top:8px">${list.map(s => link(`xray/${encodeURIComponent(s.symbol)}`, `<span class="mono" style="--h:220">${esc(String(s.symbol).slice(0, 2))}</span><span style="min-width:0"><span class="t" style="display:block">${esc(s.symbol)}</span><span class="s" style="display:block">${esc(clean(s.name))}</span></span>${icon('chev', 18)}`, 'li')).join('')}</div>` : '';
  }, 200); };
  if (!sym) return;

  const rep = el.querySelector('#rep'); rep.innerHTML = `<div style="margin-top:18px">${skel(120, 1)}${skel(80, 3)}</div>`;
  let d; try { d = await api.report(sym); } catch (e) { rep.innerHTML = `<div style="margin-top:18px">${errBox(e.status === 404 ? `No X-Ray for ${sym} yet. Check the NSE symbol.` : e.message, false)}</div>`; return; }
  if (!d || d.error) { rep.innerHTML = `<div style="margin-top:18px">${errBox(`No X-Ray for ${sym} yet.`, false)}</div>`; return; }
  const u = d.ui_report || {}, m = d.current_metrics || {}, f = d.fundamentals || {}, kr = f.key_ratios || {}, pill = (u.score_breakdown || {}).pillars || {};
  const cand = (d.chart_candles || []).map(c => ({ t: String(c.time).slice(0, 10), c: n(c.close) })).filter(c => Number.isFinite(c.c)).slice(-250);
  const last = cand.at(-1), prev = cand.at(-2), chg = last && prev ? (last.c / prev.c - 1) * 100 : NaN, px = ok(m.price) ? n(m.price) : last && last.c;
  const name = d.company_name && d.company_name !== sym ? d.company_name : sym;
  const pros = (f.pros || []).map(clean).filter(s => s && !ADV.test(s)).slice(0, 6), cons = (f.cons || []).map(clean).filter(s => s && !ADV.test(s)).slice(0, 6);
  const facts = [['Market value', fmt.cr(f.market_cap_cr), ''], ['Price to earnings', ok(kr.stock_pe) ? n(kr.stock_pe).toFixed(1) + '×' : '—', 'years of profit in the price'], ['Return on equity', ok(kr.roe_pct) ? n(kr.roe_pct).toFixed(1) + '%' : '—', 'profit on shareholders’ money'], ['Return on capital', ok(kr.roce_pct) ? n(kr.roce_pct).toFixed(1) + '%' : '—', 'profit on all money used'],
    ['52-week range', ok(m.w52_low) && ok(m.w52_high) ? `${fmt.inr(m.w52_low)}–${fmt.inr(m.w52_high)}` : '—', ''], ['200-day average', ok(m.ema200) ? fmt.inr(m.ema200) : '—', ok(m.ema200) && ok(px) ? (px > m.ema200 ? 'price is above it' : 'price is below it') : ''], ['Dividend yield', ok(kr.dividend_yield_pct) ? n(kr.dividend_yield_pct).toFixed(2) + '%' : '—', 'cash paid out a year'], ['Book value', ok(kr.book_value) ? fmt.inr(kr.book_value) : '—', 'per share']].filter(x => x[1] !== '—');
  rep.innerHTML = `
  <section class="card pad" style="margin-top:16px;display:grid;gap:12px">
    <div style="display:flex;align-items:center;gap:12px"><span class="mono" style="--h:220;width:48px;height:48px;border-radius:14px">${esc(sym.slice(0, 2))}</span><div style="min-width:0"><b style="font-size:20px;letter-spacing:-.02em;display:block">${esc(clean(name))}</b><span class="tiny">NSE: ${esc(sym)}${d.sector ? ' · ' + esc(clean(d.sector)) : ''}</span></div></div>
    <div style="display:flex;align-items:baseline;gap:10px"><b style="font-size:32px;letter-spacing:-.04em" class="tnum">${fmt.inr(px)}</b><span class="${fmt.tone(chg)}" style="font-weight:700">${fmt.pct(chg)}</span><span class="tiny">last close</span></div>
    <div id="pc" style="height:170px"></div><p class="tiny">Price over the last year. Data can be delayed.</p>
  </section>
  <section class="sec"><div class="sech"><h2 class="h2">Four <em>checks</em></h2></div>
    <div class="chk">${PIL.map(([k, l, ic, c, q]) => { const p = pill[k] || {}; return `<div><span class="ic" style="--c:${c}">${icon(ic, 20)}</span><div><b>${l}</b><p>${esc(clean(p.summary) || q)}</p></div></div>`; }).join('')}</div></section>
  ${facts.length ? `<section class="sec"><div class="sech"><h2 class="h2">Key <em>facts</em></h2></div><div class="facts">${facts.map(([l, v, h]) => `<div><small>${l}</small><b class="tnum">${v}</b>${h ? `<span>${h}</span>` : ''}</div>`).join('')}</div></section>` : ''}
  ${pros.length || cons.length ? `<section class="sec" style="display:grid;gap:12px">${pros.length ? `<div class="card pad"><b class="h3">Strengths in the numbers</b><ul class="pts" style="margin-top:10px">${pros.map(x => `<li><span class="up">${icon('check', 18)}</span><span>${esc(x)}</span></li>`).join('')}</ul></div>` : ''}${cons.length ? `<div class="card pad"><b class="h3">Things to look into</b><ul class="pts" style="margin-top:10px">${cons.map(x => `<li><span style="color:var(--gold)">${icon('warn', 18)}</span><span>${esc(x)}</span></li>`).join('')}</ul></div>` : ''}</section>` : ''}
  <section class="sec"><div class="card pad" style="display:grid;gap:10px"><b class="h3">Test an idea on ${esc(sym)}’s market</b><p class="small">Build rules and see which stocks, including this one, meet them after each close.</p>${link('build', 'Open the builder', 'btn pri block')}</div>
    <p class="tiny" style="margin-top:12px">Facts and figures from public data, explained in plain words. Not a rating, research report or recommendation.</p></section>`;
  if (cand.length > 5) line(rep.querySelector('#pc'), [{ data: cand.map(c => c.c), color: 'var(--brand)', area: true }], { h: 170, dates: cand.map(c => c.t), yfmt: v => fmt.inr(v), label: sym + ' price', tip: i => `${fmt.date(cand[i].t)} · ${fmt.inr(cand[i].c)}` });
}
