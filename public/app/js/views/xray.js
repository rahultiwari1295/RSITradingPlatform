import { icon, esc, fmt, n, ok, api, go, words, skel, line, link, mono } from '../app.js';
import { report as sampleReport, searchSample, UNIVERSE, NEWS } from '../sample.js';

/* Stock X-Ray (home). Every number comes with one plain sentence saying what it means for this stock.
   Facts only: no buy/sell, no targets, no stop-loss. Live /dna/report first, sample data if the API is not reachable.

   Field map (DNA report -> section)
   current_metrics : price, prev_close, w52_high/low, ema20/50/200, rsi, adx, vol_ratio, atr_pct, delivery_pct, ret_1m/3m/1y, base_rate
   ui_report       : dna_health_score, score_breakdown.pillars{trend,momentum,volume,quality}, dna_archetype, beginner_summary, multi_timeframe
   fundamentals    : market_cap_cr, key_ratios{stock_pe,eps,roe_pct,roce_pct,opm_pct,dividend_yield_pct,book_value,debt_to_equity},
                     compounded_growth, annual_income_statement, quarterly_performance, shareholding_pattern, pros, cons
   solvency, peers, catalysts.checklist, chart_candles
   Not shown on purpose: why_buy/why_avoid, stance, action_title, trade_execution_card (targets / stop-loss). */
const ADV = /\b(buy|sell|target|stop[- ]?loss|accumulate|entry|exit|avoid|book profit|undervalued|overvalued|multibagger)\b/i;
const clean = s => String(s || '').replace(/&#x27;/g, "'").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'HAL', 'DIXON', 'ZOMATO', 'TRENT', 'BEL'];
const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%';
const tone = v => (v > 0 ? 'up' : v < 0 ? 'dn' : '');

/* one metric: what it is + what it says here, number on the right */
const row = (label, say, value, sub = '', cls = '') => `<div class="mr"><div><b>${label}</b><p>${say}</p></div><div class="v"><b class="tnum ${cls}">${value}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>`;
const group = (title, sub, body, id = '') => `<section class="xs" ${id ? `id="${id}"` : ''}><div class="xsh"><h2 class="h3">${title}</h2>${sub ? `<p class="tiny">${sub}</p>` : ''}</div>${body}</section>`;
const meter = (v, lo, hi, zones = []) => { const p = Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); return `<div class="meter">${zones.map(([a, b, c]) => `<i class="z" style="left:${(a - lo) / (hi - lo) * 100}%;width:${(b - a) / (hi - lo) * 100}%;background:${c}"></i>`).join('')}<i class="k" style="left:${p}%"></i></div>`; };
function bars(items, f) {
  const max = Math.max(...items.map(x => Math.abs(x.v)), 1), W = 100 / items.length;
  return `<div class="bars" role="img">${items.map(x => `<div style="width:${W}%"><span class="bv">${f(x.v)}</span><i style="height:${Math.max(3, Math.abs(x.v) / max * 100)}%;background:${x.v < 0 ? 'var(--dn)' : x.c || 'var(--brand)'}"></i><small>${esc(x.l)}</small></div>`).join('')}</div>`;
}

export default async function xray(el, r) {
  const sym = (r.arg || '').toUpperCase() || 'RELIANCE', isHome = !r.arg;
  el.innerHTML = `
  <div class="head xhead">
    ${isHome ? `<span class="ey">${icon('xray', 16)}Stock X-Ray</span><h1 class="h1">${words('Any stock, <em>explained.</em>')}</h1><p class="lede">Every number with one line on what it means. Facts, not tips.</p>` : ''}
    <form class="xsearch" id="xf">${icon('search', 20)}<input id="xi" placeholder="Search company or symbol" value="${isHome ? '' : esc(sym)}" aria-label="Search a company" autocomplete="off"><button class="btn pri sm">X-Ray</button></form>
    <div id="sug"></div>
    <div class="chips" style="margin-top:-4px">${POPULAR.map(s => link(`xray/${s}`, esc(s), 'chip', s === sym ? 'aria-pressed="true"' : '')).join('')}</div>
  </div>
  <div id="rep">${skel(220, 1)}${skel(90, 3)}</div>`;
  const inp = el.querySelector('#xi'), sug = el.querySelector('#sug');
  el.querySelector('#xf').onsubmit = e => { e.preventDefault(); const v = inp.value.trim().toUpperCase().replace(/\s+/g, ''); if (v) go('xray/' + encodeURIComponent(v)); };
  let t = 0;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const v = inp.value.trim(); if (v.length < 2) { sug.innerHTML = ''; return; }
    let L = await api.search(v).catch(() => null); L = L && (Array.isArray(L) ? L : L.results || []); if (!L || !L.length) L = searchSample(v);
    sug.innerHTML = L.length ? `<div class="grp" style="margin-top:6px">${L.slice(0, 6).map(s => link(`xray/${encodeURIComponent(s.symbol)}`, `${mono(s.symbol)}<span class="m"><b>${esc(s.symbol)}</b><span>${esc(clean(s.name))}</span></span>${icon('chev', 16)}`, 'gi')).join('')}</div>` : '';
  }, 180); };

  let d = null;
  try { d = await Promise.race([api.report(sym), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 6000))]); if (!d || d.error || !d.current_metrics) d = null; } catch { d = null; }
  const sample = !d; if (!d) d = sampleReport(sym);
  draw(el.querySelector('#rep'), d, sym, sample);
}

function draw(rep, d, sym, sample) {
  const u = d.ui_report || {}, m = d.current_metrics || {}, f = d.fundamentals || {}, k = f.key_ratios || {}, pil = (u.score_breakdown || {}).pillars || {};
  const cand = (d.chart_candles || []).map(c => ({ t: String(c.time).slice(0, 10), c: n(c.close) })).filter(c => Number.isFinite(c.c));
  const px = ok(m.price) ? n(m.price) : cand.at(-1)?.c, prev = ok(m.prev_close) ? n(m.prev_close) : cand.at(-2)?.c, chg = px && prev ? (px / prev - 1) * 100 : NaN;
  const ret = days => cand.length > days ? (px / cand.at(-1 - days).c - 1) * 100 : NaN;
  const r1m = ok(m.ret_1m) ? n(m.ret_1m) : ret(21), r3m = ok(m.ret_3m) ? n(m.ret_3m) : ret(63), r1y = ok(m.ret_1y) ? n(m.ret_1y) : ret(cand.length - 1);
  const name = clean(d.company_name && d.company_name !== sym ? d.company_name : sym), score = n(u.dna_health_score ?? (u.score_breakdown || {}).total);
  const hi = n(m.w52_high), lo = n(m.w52_low), e200 = n(m.ema200), e50 = n(m.ema50), rsi = n(m.rsi), adx = n(m.adx), vr = n(m.vol_ratio), del = n(m.delivery_pct), atr = n(m.atr_pct);
  const fromHi = ok(hi) ? (px / hi - 1) * 100 : NaN, d200 = ok(e200) ? (px / e200 - 1) * 100 : NaN;
  const pe = n(k.stock_pe), roe = n(k.roe_pct), roce = n(k.roce_pct), dy = n(k.dividend_yield_pct), bv = n(k.book_value), de = n(k.debt_to_equity), opm = n(k.opm_pct), eps = n(k.eps);
  const pb = ok(bv) && bv > 0 ? px / bv : NaN;

  /* ----- plain sentences ----- */
  const sRsi = rsi < 30 ? 'It has fallen hard and fast lately.' : rsi < 45 ? 'Recent moves have been on the weak side.' : rsi <= 55 ? 'Neither strong nor weak right now.' : rsi <= 70 ? 'Recent moves have been strong.' : 'It has risen very fast lately; moves this sharp often cool off.';
  const sAdx = adx < 20 ? 'No clear trend: the price is moving sideways.' : adx < 25 ? 'A trend is just starting to form.' : adx < 40 ? 'A clear trend is in place.' : 'A very strong trend.';
  const sVol = vr >= 2 ? 'Twice the usual trading or more. Something is drawing attention.' : vr >= 1.3 ? 'Busier than a normal day.' : vr >= .7 ? 'A normal amount of trading.' : 'Quieter than usual.';
  const sDel = del >= 60 ? 'Most buyers took the shares home: longer-term holding.' : del >= 40 ? 'A mix of traders and holders.' : 'Mostly same-day trading.';
  const sAtr = atr < 1.5 ? 'A calm stock: small daily swings.' : atr < 3 ? 'Moves a fair amount on a normal day.' : 'A jumpy stock: big daily swings.';
  const s200 = d200 > 0 ? `The price is ${Math.abs(d200).toFixed(1)}% above its 200-day average, so the long-term direction is up.` : `The price is ${Math.abs(d200).toFixed(1)}% below its 200-day average, so the long-term direction is down.`;
  const sHi = fromHi > -3 ? 'Trading right at its one-year high.' : fromHi > -15 ? 'A little below its one-year high.' : fromHi > -35 ? 'Well below its one-year high.' : 'Far below its one-year high.';
  const sPe = !ok(pe) ? '' : pe < 15 ? `The price equals about ${pe.toFixed(0)} years of current profit: low for most companies.` : pe < 30 ? `The price equals about ${pe.toFixed(0)} years of current profit: a middle range.` : `The price equals about ${pe.toFixed(0)} years of current profit: investors expect strong growth.`;
  const sRoe = roe >= 20 ? 'Earns a lot on shareholders’ money.' : roe >= 12 ? 'Earns a fair return on shareholders’ money.' : 'Earns a low return on shareholders’ money.';
  const sRoce = roce >= 20 ? 'Earns a lot on all the money in the business, including loans.' : roce >= 12 ? 'A fair return on all the money it uses.' : 'A low return on all the money it uses.';
  const sDe = de < .1 ? 'Almost no debt.' : de < .5 ? 'Some debt, small next to what owners put in.' : de < 1 ? 'Debt is a sizeable part of the business.' : 'Owes more than shareholders own.';
  const sDy = dy >= 3 ? 'Pays out a good share of the price as cash each year.' : dy >= 1 ? 'Pays a modest dividend.' : 'Pays little or no dividend; keeps profit to grow.';
  const sOpm = opm >= 20 ? 'Keeps a large part of each ₹100 of sales as operating profit.' : opm >= 10 ? 'A normal operating margin.' : 'Thin margins: small changes in costs matter.';
  const sPb = !ok(pb) ? '' : pb < 1.5 ? 'Priced close to what the company owns on paper.' : pb < 5 ? 'Priced a few times what it owns on paper.' : 'Priced many times what it owns on paper; the market values its earnings, not its assets.';
  const sScore = score >= 70 ? 'Most of the checks look healthy.' : score >= 45 ? 'A mixed picture across the checks.' : 'Several checks look weak.';

  /* ----- sections ----- */
  const PIL = [['trend', 'Trend', 'Is the price heading up or down over months?'], ['momentum', 'Momentum', 'How strong recent moves have been.'], ['volume', 'Activity', 'Is more trading happening on up days?'], ['quality', 'Business', 'Profits, debt and returns.']];
  const mt = Array.isArray(u.multi_timeframe) ? u.multi_timeframe : [];
  const inc = f.annual_income_statement || {}, rw = k2 => (inc.rows || []).find(x => new RegExp(k2, 'i').test(x.metric || ''));
  const sales = rw('^sales|revenue'), prof = rw('net profit'), yrs = inc.years || [];
  const qp = (f.quarterly_performance || []).slice(-8), cg = f.compounded_growth || {};
  const G = ['sales_growth', 'profit_growth', 'price_cagr'].filter(x => Array.isArray(cg[x]) && cg[x].length), periods = G.length ? cg[G[0]].map(p => p.period).slice(0, 3) : [];
  const sp = f.shareholding_pattern || {}, holders = ['Promoters', 'FIIs', 'DIIs', 'Public'].filter(x => sp[x] && ok(sp[x].holding_pct));
  const HN = { Promoters: ['Founders (promoters)', 'The family or company that started it.'], FIIs: ['Foreign funds', 'Overseas investors and funds.'], DIIs: ['Indian funds', 'Mutual funds, insurers and banks.'], Public: ['Public', 'Individual investors like you.'] };
  const pros = (f.pros || []).map(clean).filter(x => x && !ADV.test(x)), cons = (f.cons || []).map(clean).filter(x => x && !ADV.test(x));
  const chk = ((d.catalysts || {}).checklist || []).slice(0, 6), sol = d.solvency, br = m.base_rate;
  const peers = Array.isArray(d.peers) ? d.peers.slice(0, 6) : [];
  const news = NEWS.india.filter(x => (x.syms || []).includes(sym)).slice(0, 3);

  rep.innerHTML = `
  ${sample ? `<div class="samp">${icon('info', 15)}<span><b>Sample data.</b> The live X-Ray server is not connected, so these numbers are made up to show the layout.</span></div>` : ''}
  <section class="xcard">
    <div class="xtop">${mono(sym)}<div style="min-width:0;flex:1"><h2 class="xname">${esc(name)}</h2><span class="tiny">NSE: ${esc(sym)}${d.sector ? ' · ' + esc(clean(d.sector)) : ''}</span></div>${u.dna_archetype ? `<span class="pill ai">${esc(clean(u.dna_archetype).split('·')[0])}</span>` : ''}</div>
    <div class="xpx"><b class="tnum">${fmt.inr(px)}</b><span class="${tone(chg)}">${ok(chg) ? sgn(chg, 2) : ''}</span><span class="tiny">last close</span></div>
    <div class="seg xr" id="rng"><button data-v="21">1M</button><button data-v="63">3M</button><button data-v="126">6M</button><button data-v="999">1Y</button></div>
    <div id="pc" style="height:190px"></div>
    ${u.beginner_summary ? `<p class="xsum">${icon('spark', 16)}<span>${esc(clean(u.beginner_summary))}</span></p>` : ''}
  </section>

  <div class="xgrid">
  ${ok(score) ? group('X-Ray score', 'A 0–100 summary of four checks. It is a description, not a buy or sell signal.', `
    <div class="score"><div class="ring" style="--p:${score}"><b class="tnum">${Math.round(score)}</b><small>of 100</small></div><p>${sScore}</p></div>
    ${PIL.filter(([x]) => pil[x]).map(([x, l, q]) => { const p = pil[x], pc = n(p.score) / n(p.max) * 100; return `<div class="mr pl"><div><b>${l}</b><p>${esc(clean(p.summary) || q)}</p><div class="pbar"><i style="width:${Math.max(3, pc)}%"></i></div></div><div class="v"><b class="tnum">${fmt.int(p.score)}<small>/${fmt.int(p.max)}</small></b></div></div>`; }).join('')}`) : ''}

  ${group('Price and trend', 'Where the price is and which way it has been heading.', `
    ${ok(hi) && ok(lo) ? `<div class="mr"><div><b>52-week range</b><p>${sHi}</p>${meter(px, lo, hi)}<div class="mm"><span>${fmt.inr(lo)}</span><span>${fmt.inr(hi)}</span></div></div><div class="v"><b class="tnum ${tone(fromHi)}">${sgn(fromHi)}</b><span>from the high</span></div></div>` : ''}
    ${ok(d200) ? row('200-day average', s200, sgn(d200), fmt.inr(e200), tone(d200)) : ''}
    ${ok(e50) ? row('50-day average', px > e50 ? 'Above its 50-day average: the last few months lean up.' : 'Below its 50-day average: the last few months lean down.', fmt.inr(e50), px > e50 ? 'price above' : 'price below') : ''}
    <div class="mr"><div><b>Returns</b><p>How much the price changed over each period.</p></div><div class="v rets">${[['1M', r1m], ['3M', r3m], ['1Y', r1y]].map(([l, v]) => `<span><small>${l}</small><b class="tnum ${tone(v)}">${ok(v) ? sgn(v) : '—'}</b></span>`).join('')}</div></div>
    ${mt.length ? `<div class="mr"><div><b>Short, medium, long term</b><p>Is the price above each average? Green means yes.</p></div><div class="v"><span class="tfs">${mt.map(x => `<i class="${/green/i.test(x.dot) ? 'g' : /red/i.test(x.dot) ? 'r' : ''}" title="${esc(clean(x.tf))}: ${esc(clean(x.bias))}"></i>`).join('')}</span><span>${mt.map(x => esc(clean(x.tf).split(' ')[0])).join(' · ')}</span></div></div>` : ''}`)}

  ${group('Momentum and activity', 'How hard it is moving and how much it is being traded.', `
    ${ok(rsi) ? `<div class="mr"><div><b>RSI (14 days)</b><p>${sRsi}</p>${meter(rsi, 0, 100, [[0, 30, 'color-mix(in srgb,var(--dn) 22%,transparent)'], [70, 100, 'color-mix(in srgb,var(--up) 22%,transparent)']])}<div class="mm"><span>0 weak</span><span>100 strong</span></div></div><div class="v"><b class="tnum">${rsi.toFixed(0)}</b><span>of 100</span></div></div>` : ''}
    ${ok(adx) ? row('Trend strength (ADX)', sAdx, adx.toFixed(0), adx >= 25 ? 'trending' : 'not trending') : ''}
    ${ok(vr) ? row('Volume vs normal', sVol, vr.toFixed(1) + '×', '20-day average', vr >= 1.5 ? 'up' : '') : ''}
    ${ok(del) ? row('Delivery', sDel, del.toFixed(0) + '%', 'of shares traded') : ''}
    ${ok(atr) ? row('Daily swing', sAtr, atr.toFixed(1) + '%', 'average day') : ''}`)}

  ${br && ok(br.p_positive_20d) ? group('What happened before', 'Past moments when stocks were in the same position.', `
    <div class="mr big"><div><b>Higher 4 weeks later</b><p>We found ${fmt.int(br.samples)} past moments when a stock was ${esc(clean(br.state_text || 'in the same position'))}. This is how often the price was higher 20 sessions later.</p></div><div class="v"><b class="tnum ${n(br.p_positive_20d) >= .55 ? 'up' : n(br.p_positive_20d) < .45 ? 'dn' : ''}">${Math.round(n(br.p_positive_20d) * 100)}%</b><span>${ok(br.median_ret_20d) ? 'typical move ' + sgn(n(br.median_ret_20d)) : ''}</span></div></div>
    <p class="tiny">History, not a forecast. Half the time is a coin toss.</p>`) : ''}

  ${group('The business', 'What the company earns, owes and is valued at.', `
    ${ok(f.market_cap_cr) ? row('Market value', f.market_cap_cr >= 1e5 ? 'One of the largest listed companies.' : f.market_cap_cr >= 2e4 ? 'A large company.' : f.market_cap_cr >= 5e3 ? 'A mid-sized company.' : 'A small company; prices can swing more.', fmt.cr(f.market_cap_cr)) : ''}
    ${ok(pe) ? row('Price to earnings (P/E)', sPe, pe.toFixed(1) + '×') : ''}
    ${ok(eps) ? row('Earnings per share', 'Profit for each share over the last year.', fmt.inr(eps)) : ''}
    ${ok(roe) ? row('Return on equity', sRoe, roe.toFixed(1) + '%', '', roe >= 15 ? 'up' : '') : ''}
    ${ok(roce) ? row('Return on capital', sRoce, roce.toFixed(1) + '%', '', roce >= 15 ? 'up' : '') : ''}
    ${ok(opm) ? row('Operating margin', sOpm, opm.toFixed(1) + '%') : ''}
    ${ok(de) ? row('Debt to equity', sDe, de.toFixed(2), '', de < .5 ? 'up' : de > 1 ? 'dn' : '') : ''}
    ${ok(pb) ? row('Price to book', sPb, pb.toFixed(1) + '×', 'book ' + fmt.inr(bv)) : ''}
    ${ok(dy) ? row('Dividend yield', sDy, dy.toFixed(2) + '%') : ''}`)}

  ${sales || qp.length || G.length ? group('Growth', 'Is the business getting bigger?', `
    ${sales ? `<div class="mr col"><div><b>Sales each year</b><p>Crore rupees. ${(() => { const v = sales.values.map(n).filter(Number.isFinite); return v.length > 2 ? `Up ${Math.round((v.at(-1) / v[0] - 1) * 100)}% over ${v.length - 1} years.` : ''; })()}</p></div>${bars(yrs.map((y, i) => ({ l: y === 'TTM' ? 'TTM' : "'" + String(y).slice(-2), v: n(sales.values[i]) })).filter(x => Number.isFinite(x.v)).slice(-10), v => v >= 1e5 ? (v / 1e5).toFixed(1) + 'L' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : Math.round(v))}</div>` : ''}
    ${qp.length ? `<div class="mr col"><div><b>Profit each quarter</b><p>Crore rupees, last ${qp.length} quarters. ${qp.length > 4 ? (n(qp.at(-1).net_profit_cr) > n(qp.at(-5).net_profit_cr) ? 'Higher than the same quarter last year.' : 'Lower than the same quarter last year.') : ''}</p></div>${bars(qp.map(x => ({ l: String(x.quarter).split(' ')[0], v: n(x.net_profit_cr), c: 'var(--up)' })), v => v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : Math.round(v))}</div>` : ''}
    ${G.length ? `<div class="gt"><div class="gh"><span>Growth per year</span>${periods.map(p => `<span>${esc(p.replace(/ years?/i, 'y'))}</span>`).join('')}</div>${G.map(g => `<div><span>${{ sales_growth: 'Sales', profit_growth: 'Profit', price_cagr: 'Share price' }[g]}</span>${periods.map(p => { const v = (cg[g].find(x => x.period === p) || {}).value; return `<b class="tnum ${tone(n(v))}">${esc(v || '—')}</b>`; }).join('')}</div>`).join('')}</div>` : ''}`) : ''}

  ${holders.length ? group('Who owns it', `Shareholding${sp.Promoters?.quarter ? ' as of ' + esc(sp.Promoters.quarter) : ''}. The small number is the change from last quarter.`, holders.map(x => { const h = sp[x], c = n(h.qoq_change); return `<div class="mr"><div><b>${HN[x][0]}</b><p>${HN[x][1]}${ok(c) && c !== 0 ? (c > 0 ? ' They added shares.' : ' They reduced shares.') : ''}</p><div class="pbar"><i style="width:${n(h.holding_pct)}%"></i></div></div><div class="v"><b class="tnum">${n(h.holding_pct).toFixed(1)}%</b><span class="${tone(c)}">${ok(c) && c !== 0 ? sgn(c, 2) : 'no change'}</span></div></div>`; }).join('') + (sp['No. of Shareholders'] ? `<p class="tiny">${fmt.int(sp['No. of Shareholders'].holding_pct)} shareholders.</p>` : '')) : ''}

  ${sol && ok(sol.score) ? group('Debt check', '', row(esc(clean(sol.grade || 'Debt')), esc(clean(sol.summary || '')), fmt.int(sol.score), 'of 100', n(sol.score) >= 70 ? 'up' : n(sol.score) < 45 ? 'dn' : '')) : ''}

  ${chk.length || pros.length || cons.length ? group('Quick checks', 'Yes/no facts from the latest filings.', `
    ${chk.map(x => `<div class="ck"><span class="${x.pass ? 'up' : 'dn'}">${icon(x.pass ? 'check' : 'x', 16)}</span><span>${esc(clean(x.item))}</span></div>`).join('')}
    ${pros.map(x => `<div class="ck"><span class="up">${icon('check', 16)}</span><span>${esc(x)}</span></div>`).join('')}
    ${cons.map(x => `<div class="ck"><span style="color:var(--gold)">${icon('warn', 16)}</span><span>${esc(x)}</span></div>`).join('')}`) : ''}

  ${peers.length > 1 ? group('Compared with peers', 'Same industry, side by side.', `<div class="ptab"><div class="ph"><span>Company</span><span>P/E</span><span>ROCE</span><span>Score</span></div>${peers.map(x => link(`xray/${encodeURIComponent(x.symbol)}`, `<span>${esc(x.symbol)}${x.isCurrent ? ' <em>this</em>' : ''}</span><span class="tnum">${esc(String(x.pe ?? '—'))}</span><span class="tnum">${esc(String(x.roce ?? '—'))}</span><span class="tnum">${ok(x.score) ? fmt.int(x.score) : '—'}</span>`, x.isCurrent ? 'on' : '')).join('')}</div>`) : ''}

  ${news.length ? group('In the news', '', news.map(x => link('news', `<b>${esc(x.t)}</b><span class="tiny">${esc(x.src)} · ${esc(x.tag)}</span>`, 'nw')).join('')) : ''}
  </div>

  <section class="sec"><div class="nextc"><div><b class="h3">Find more stocks like this</b><p class="small">Run a screen or write your own query.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap">${link('screens', 'Screens', 'btn sm quiet')}${link('build', `${icon('plus', 16)}Build`, 'btn sm pri')}</div></div>
    <p class="tiny" style="margin-top:12px">Facts and figures explained in plain words. Not a rating, research report or recommendation.</p></section>`;

  const draw1 = days => { const c = cand.slice(-Math.min(days, cand.length)); if (c.length > 5) line(rep.querySelector('#pc'), [{ data: c.map(x => x.c), color: c.at(-1).c >= c[0].c ? 'var(--up)' : 'var(--dn)', area: true }], { h: 190, dates: c.map(x => x.t), yfmt: v => fmt.inr(v), label: sym + ' price', tip: i => `${fmt.date(c[i].t)} · ${fmt.inr(c[i].c)}` }); };
  const rg = rep.querySelector('#rng'), setR = v => { rg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); draw1(+v); };
  rg.onclick = e => { const b = e.target.closest('button'); if (b) setR(b.dataset.v); };
  setR('999');
}
export { UNIVERSE };
