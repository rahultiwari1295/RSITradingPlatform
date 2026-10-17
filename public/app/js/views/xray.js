import { icon, esc, fmt, n, ok, api, go, skel, line, link, mono, intel } from '../app.js';
import { evCard } from './news.js';
import { report as sampleReport, searchSample, NEWS, SCREENS } from '../sample.js';
const SCREENS_N = SCREENS.length;

/* Stock X-Ray (home).
   Reading order: who it is and the price -> six "at a glance" answers -> tabs with the detail.
   Every number has a status word (Strong / Fair / Weak…) and one plain sentence. Facts only, no buy/sell.

   Field map (DNA report -> place)
   current_metrics : price, prev_close, w52_high/low, ema50/200, rsi, adx, vol_ratio, atr_pct, delivery_pct, ret_1m/3m/1y, base_rate
   ui_report       : dna_health_score, score_breakdown.pillars, dna_archetype, beginner_summary, multi_timeframe
   fundamentals    : market_cap_cr, key_ratios, compounded_growth, annual_income_statement, quarterly_performance, shareholding_pattern, pros, cons
   solvency, peers, catalysts.checklist, chart_candles
   Never shown: why_buy/why_avoid, stance, action_title, trade_execution_card. */
const ADV = /\b(buy|sell|target|stop[- ]?loss|accumulate|entry|exit|avoid|book profit|undervalued|overvalued|multibagger)\b/i;
const txt = s => (s && typeof s === 'object' ? (Array.isArray(s) ? s.map(txt).join(' ') : ['text', 'summary', 'headline', 'body', 'line', 'what', 'one_liner'].map(k => s[k]).filter(v => typeof v === 'string').join(' ') || Object.values(s).filter(v => typeof v === 'string').join(' ')) : s);
const clean = s => String(txt(s) || '').replace(/&#x27;/g, "'").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'HAL', 'DIXON', 'ZOMATO', 'TRENT', 'BEL'];
const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%';
const tone = v => (v > 0 ? 'up' : v < 0 ? 'dn' : '');
const TABS = [['overview', 'Overview'], ['filings', 'Filings'], ['price', 'Price'], ['business', 'Business'], ['owners', 'Owners'], ['peers', 'Peers']];

/* status word + colour for a value */
const st = (c, w) => `<span class="st ${c}">${w}</span>`;
const S = {
  rsi: v => v < 30 ? ['weak', 'Very weak'] : v < 45 ? ['weak', 'Weak'] : v <= 55 ? ['info', 'Neutral'] : v <= 70 ? ['good', 'Strong'] : ['fair', 'Very strong'],
  adx: v => v < 20 ? ['info', 'No trend'] : v < 25 ? ['fair', 'Forming'] : ['good', 'Trending'],
  vol: v => v >= 2 ? ['good', 'Very high'] : v >= 1.3 ? ['good', 'High'] : v >= .7 ? ['info', 'Normal'] : ['info', 'Low'],
  del: v => v >= 60 ? ['good', 'High'] : v >= 40 ? ['info', 'Medium'] : ['fair', 'Low'],
  atr: v => v < 1.5 ? ['good', 'Calm'] : v < 3 ? ['info', 'Normal'] : ['fair', 'Jumpy'],
  hi: v => v > -3 ? ['good', 'At high'] : v > -15 ? ['info', 'Near high'] : v > -35 ? ['fair', 'Below high'] : ['weak', 'Far below'],
  trend: v => v > 0 ? ['good', 'Up'] : ['weak', 'Down'],
  pe: v => v < 15 ? ['good', 'Low'] : v < 30 ? ['info', 'Fair'] : v < 60 ? ['fair', 'High'] : ['weak', 'Very high'],
  ret: v => v >= 20 ? ['good', 'Strong'] : v >= 12 ? ['info', 'Fair'] : ['weak', 'Low'],
  de: v => v < .1 ? ['good', 'Debt-free'] : v < .5 ? ['good', 'Low'] : v < 1 ? ['fair', 'Moderate'] : ['weak', 'High'],
  dy: v => v >= 3 ? ['good', 'High'] : v >= 1 ? ['info', 'Modest'] : ['info', 'Low'],
  opm: v => v >= 20 ? ['good', 'High'] : v >= 10 ? ['info', 'Normal'] : ['fair', 'Thin'],
  pb: v => v < 1.5 ? ['good', 'Low'] : v < 5 ? ['info', 'Fair'] : ['fair', 'High'],
  size: v => v >= 1e5 ? ['info', 'Very large'] : v >= 2e4 ? ['info', 'Large'] : v >= 5e3 ? ['info', 'Mid-size'] : ['fair', 'Small'],
  score: v => v >= 70 ? ['good', 'Healthy'] : v >= 45 ? ['fair', 'Mixed'] : ['weak', 'Weak'],
};
const row = (label, sTuple, say, value, sub = '', cls = '') => `<div class="mr"><div class="ml"><div class="mt"><b>${label}</b>${sTuple ? st(...sTuple) : ''}</div><p>${say}</p></div><div class="v"><b class="tnum ${cls}">${value}</b>${sub ? `<span>${sub}</span>` : ''}</div></div>`;
const block = (title, sub, body) => `<section class="blk"><header><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</header>${body}</section>`;
const meter = (v, lo, hi, zones = []) => { const p = Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); return `<div class="meter">${zones.map(([a, b, c]) => `<i class="z ${c}" style="left:${(a - lo) / (hi - lo) * 100}%;width:${(b - a) / (hi - lo) * 100}%"></i>`).join('')}<i class="k" style="left:${p}%"></i></div>`; };
function bars(items, f) {
  const max = Math.max(...items.map(x => Math.abs(x.v)), 1);
  return `<div class="bars">${items.map(x => `<div><span class="bv">${f(x.v)}</span><i style="height:${Math.max(3, Math.abs(x.v) / max * 100)}%" class="${x.v < 0 ? 'neg' : x.k || ''}"></i><small>${esc(x.l)}</small></div>`).join('')}</div>`;
}

/* ---------------------------------------------------------------- landing (home) */
function landing(el) {
  el.innerHTML = `
  <section class="land">
    <span class="land-badge">${icon('xray', 15)}Stock X-Ray</span>
    <h1 class="land-h">Understand any stock<br><em>in one minute.</em></h1>
    <p class="land-p">Type a company name. See its trend, momentum, business numbers and who owns it, each explained in one simple line. Facts, not tips.</p>
    <form class="search land-s" id="xf">${icon('search', 21)}<input id="xi" placeholder="Search a company, e.g. Tata Motors" aria-label="Search a company" autocomplete="off" enterkeyhint="search"><button class="btn pri">X-Ray</button></form>
    <div id="sug" class="sugbox land-sug"></div>
    <div class="land-pop"><span>Popular</span>${POPULAR.slice(0, 8).map(s => link(`xray/${s}`, esc(s), 'chip')).join('')}</div>
  </section>

  <section class="promo">
    ${link('build', `<span class="pr-ic">${icon('search', 22)}</span>
      <span class="pr-t"><small>Step 1</small><b>Build your own scanner</b><span>Write simple rules like <code>close &gt; sma(200)</code>. See which NSE stocks match after every close.</span></span>
      <span class="pr-demo"><code><i class="q-id">close</i> <i class="q-op">&gt;</i> <i class="q-fn">sma(200)</i><br><i class="q-join">and</i> <i class="q-fn">rsi(14)</i> <i class="q-op">&lt;</i> <i class="q-num">40</i></code><em>${icon('check', 13)}14 stocks match</em></span>
      <span class="pr-cta">Open Build ${icon('chev', 16)}</span>`, 'pr pr-a')}
    ${link('strategies', `<span class="pr-ic">${icon('flask', 22)}</span>
      <span class="pr-t"><small>Step 2</small><b>Make it a strategy and backtest it</b><span>Add exit rules and test them on years of past prices. See the win rate before you trust an idea.</span></span>
      <span class="pr-demo pr-ring"><span class="wring good" style="--p:63"><b class="tnum">63<small>%</small></b></span><em>win rate · 657 past trades</em></span>
      <span class="pr-cta">See strategies ${icon('chev', 16)}</span>`, 'pr pr-b')}
  </section>

  <section class="how3">
    <div><b>${icon('xray', 18)}</b><span><strong>X-Ray</strong>Every number with a plain meaning</span></div>
    <div><b>${icon('layers', 18)}</b><span><strong>${SCREENS_N} screens</strong>Ready-made scans, one tap</span></div>
    <div><b>${icon('bell', 18)}</b><span><strong>Alerts</strong>Know when a stock enters</span></div>
  </section>
  <p class="disc" style="text-align:center">A learning and research tool. Not investment advice.</p>`;
  const inp = el.querySelector('#xi'), sug = el.querySelector('#sug');
  el.querySelector('#xf').onsubmit = e => { e.preventDefault(); const v = inp.value.trim().toUpperCase().replace(/\s+/g, ''); if (v) go('xray/' + encodeURIComponent(v)); };
  let t = 0;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const v = inp.value.trim(); if (v.length < 2) { sug.innerHTML = ''; return; }
    let L = await api.search(v).catch(() => null); L = L && (Array.isArray(L) ? L : L.results || []); if (!L || !L.length) L = searchSample(v);
    sug.innerHTML = L.length ? `<div class="grp">${L.slice(0, 6).map(s => link(`xray/${encodeURIComponent(s.symbol)}`, `${mono(s.symbol)}<span class="m"><b>${esc(s.symbol)}</b><span>${esc(clean(s.name))}</span></span>${icon('chev', 16)}`, 'gi')).join('')}</div>` : '';
  }, 180); };
}

export default async function xray(el, r) {
  if (!r.arg) return landing(el);
  const sym = r.arg.toUpperCase(), isHome = false;
  el.innerHTML = `
  <div class="page-h">
    ${isHome ? `<h1 class="h1">Stock X-Ray</h1><p class="lede">Search any NSE stock. Every number comes with a one-line meaning.</p>` : ''}
    <form class="search" id="xf">${icon('search', 19)}<input id="xi" placeholder="Search company or symbol, e.g. TCS" value="${isHome ? '' : esc(sym)}" aria-label="Search a company" autocomplete="off"><button class="btn pri sm">Open</button></form>
    <div id="sug" class="sugbox"></div>
    <div class="chips">${POPULAR.map(s => link(`xray/${s}`, esc(s), 'chip', s === sym ? 'aria-pressed="true"' : '')).join('')}</div>
  </div>
  <div id="rep">${skel(260, 1)}${skel(120, 2)}</div>`;
  const inp = el.querySelector('#xi'), sug = el.querySelector('#sug');
  el.querySelector('#xf').onsubmit = e => { e.preventDefault(); const v = inp.value.trim().toUpperCase().replace(/\s+/g, ''); if (v) go('xray/' + encodeURIComponent(v)); };
  let t = 0;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(async () => {
    const v = inp.value.trim(); if (v.length < 2) { sug.innerHTML = ''; return; }
    let L = await api.search(v).catch(() => null); L = L && (Array.isArray(L) ? L : L.results || []); if (!L || !L.length) L = searchSample(v);
    sug.innerHTML = L.length ? `<div class="grp">${L.slice(0, 6).map(s => link(`xray/${encodeURIComponent(s.symbol)}`, `${mono(s.symbol)}<span class="m"><b>${esc(s.symbol)}</b><span>${esc(clean(s.name))}</span></span>${icon('chev', 16)}`, 'gi')).join('')}</div>` : '';
  }, 180); };

  const repEl = el.querySelector('#rep');
  let d = null;
  try { d = await Promise.race([api.report(sym), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 6000))]); if (!d || d.error || !d.current_metrics) d = null; } catch { d = null; }
  const sample = !d; if (!d) d = sampleReport(sym);
  if (!repEl.isConnected) return;  // the person moved to another page while this loaded
  draw(repEl, d, sym, sample, r.q.get('tab'));
}

function draw(rep, d, sym, sample, tab0) {
  const u = d.ui_report || {}, m = d.current_metrics || {}, f = d.fundamentals || {}, k = f.key_ratios || {}, pil = (u.score_breakdown || {}).pillars || {};
  const cand = (d.chart_candles || []).map(c => ({ t: String(c.time).slice(0, 10), c: n(c.close) })).filter(c => Number.isFinite(c.c));
  const px = ok(m.price) ? n(m.price) : cand.at(-1)?.c, prev = ok(m.prev_close) ? n(m.prev_close) : cand.at(-2)?.c, chg = px && prev ? (px / prev - 1) * 100 : NaN;
  const ret = days => cand.length > days ? (px / cand.at(-1 - days).c - 1) * 100 : NaN;
  const r1m = ok(m.ret_1m) ? n(m.ret_1m) : ret(21), r3m = ok(m.ret_3m) ? n(m.ret_3m) : ret(63), r1y = ok(m.ret_1y) ? n(m.ret_1y) : ret(cand.length - 1);
  const name = clean(d.company_name && d.company_name !== sym ? d.company_name : sym), score = n(u.dna_health_score ?? (u.score_breakdown || {}).total);
  const hi = n(m.w52_high), lo = n(m.w52_low), e200 = n(m.ema200), e50 = n(m.ema50), rsi = n(m.rsi), adx = n(m.adx), vr = n(m.vol_ratio), del = n(m.delivery_pct), atr = n(m.atr_pct);
  const fromHi = ok(hi) ? (px / hi - 1) * 100 : NaN, d200 = ok(e200) ? (px / e200 - 1) * 100 : NaN;
  const pe = n(k.stock_pe), roe = n(k.roe_pct), roce = n(k.roce_pct), dy = n(k.dividend_yield_pct), bv = n(k.book_value), de = n(k.debt_to_equity), opm = n(k.opm_pct), eps = n(k.eps), mc = n(f.market_cap_cr);
  const pb = ok(bv) && bv > 0 ? px / bv : NaN;

  /* ---------- at a glance: six questions a newcomer asks ---------- */
  const glance = [
    ok(d200) && ['Long-term trend', S.trend(d200), sgn(d200), `vs the 200-day average (${fmt.inr(e200)}). ${d200 > 0 ? 'Above it means up.' : 'Below it means down.'}`],
    ok(rsi) && ['Momentum', S.rsi(rsi), `RSI ${rsi.toFixed(0)}`, rsi < 45 ? 'Recent moves have been weak.' : rsi <= 55 ? 'Neither strong nor weak.' : 'Recent moves have been strong.'],
    ok(fromHi) && ['From 1-year high', S.hi(fromHi), sgn(fromHi), `High ${fmt.inr(hi)}, low ${fmt.inr(lo)}.`],
    ok(pe) && ['Valuation (P/E)', S.pe(pe), pe.toFixed(1) + '×', `Price = ${pe.toFixed(0)} years of current profit.`],
    ok(roce) && ['Profitability', S.ret(roce), roce.toFixed(1) + '%', 'Return on all money used (ROCE).'],
    ok(de) && ['Debt', S.de(de), de.toFixed(2), 'Debt ÷ shareholders’ money.'],
  ].filter(Boolean);

  /* ---------- tab bodies ---------- */
  const PIL = [['trend', 'Trend'], ['momentum', 'Momentum'], ['volume', 'Activity'], ['quality', 'Business']];
  const mt = Array.isArray(u.multi_timeframe) ? u.multi_timeframe : [];
  const inc = f.annual_income_statement || {}, rw = k2 => (inc.rows || []).find(x => new RegExp(k2, 'i').test(x.metric || ''));
  const sales = rw('^sales|revenue'), yrs = inc.years || [];
  const qp = (f.quarterly_performance || []).slice(-8), cg = f.compounded_growth || {};
  const G = ['sales_growth', 'profit_growth', 'price_cagr'].filter(x => Array.isArray(cg[x]) && cg[x].length), periods = G.length ? cg[G[0]].map(p => p.period).slice(0, 3) : [];
  const sp = f.shareholding_pattern || {}, holders = ['Promoters', 'FIIs', 'DIIs', 'Public'].filter(x => sp[x] && ok(sp[x].holding_pct));
  const HN = { Promoters: ['Founders', 'The family or group that started the company.', 'h1'], FIIs: ['Foreign funds', 'Overseas investors and funds.', 'h2'], DIIs: ['Indian funds', 'Mutual funds, insurers and banks.', 'h3'], Public: ['Public', 'Individual investors.', 'h4'] };
  const pros = (f.pros || []).map(clean).filter(x => x && !ADV.test(x)), cons = (f.cons || []).map(clean).filter(x => x && !ADV.test(x));
  const chk = ((d.catalysts || {}).checklist || []).slice(0, 6), sol = d.solvency, br = m.base_rate;
  const peers = Array.isArray(d.peers) ? d.peers.slice(0, 6) : [];
  const news = NEWS.india.filter(x => (x.syms || []).includes(sym)).slice(0, 4);

  const T = {};
  T.overview = `
    ${clean(u.beginner_summary) ? `<div class="summary">${icon('spark', 18)}<p>${esc(clean(u.beginner_summary))}</p></div>` : ''}
    <div class="two">
    ${ok(score) ? block('X-Ray score', 'Four checks rolled into one number from 0 to 100. A description, not a signal.', `
      <div class="score"><div class="ring" style="--p:${score}"><b class="tnum">${Math.round(score)}</b></div><div>${st(...S.score(score))}<p>${score >= 70 ? 'Most checks look healthy.' : score >= 45 ? 'Some checks look good, some do not.' : 'Several checks look weak.'}</p></div></div>
      <div class="pils">${PIL.filter(([x]) => pil[x]).map(([x, l]) => { const p = pil[x], pc = n(p.score) / n(p.max) * 100; return `<div class="pil"><div><b>${l}</b><span class="tnum">${fmt.int(p.score)}/${fmt.int(p.max)}</span></div><div class="pbar"><i class="${pc >= 60 ? 'good' : pc >= 40 ? 'fair' : 'weak'}" style="width:${Math.max(3, pc)}%"></i></div><p>${esc(clean(p.summary))}</p></div>`; }).join('')}</div>`) : ''}
    ${br && ok(br.p_positive_20d) ? block('What happened before', 'Same setup in the past, 20 trading days later.', `
      <div class="odds"><div class="big tnum ${n(br.p_positive_20d) >= .55 ? 'up' : n(br.p_positive_20d) < .45 ? 'dn' : ''}">${Math.round(n(br.p_positive_20d) * 100)}%</div><p>of <b>${fmt.int(br.samples)}</b> past cases were higher 4 weeks later${ok(br.median_ret_20d) ? `; the typical move was <b>${sgn(n(br.median_ret_20d))}</b>` : ''}. Setup: ${esc(clean(br.state_text || 'same position'))}.</p></div>
      <div class="split50"><i style="width:${n(br.p_positive_20d) * 100}%"></i></div><div class="mm"><span>Higher</span><span>Lower</span></div>
      <p class="note">History, not a forecast. 50% is a coin toss.</p>`) : ''}
    </div>
    ${chk.length || pros.length || cons.length ? block('Quick checks', 'Yes / no facts from the latest results.', `<div class="cks">
      ${chk.map(x => `<div class="ck ${x.pass ? 'good' : 'weak'}">${icon(x.pass ? 'check' : 'x', 15)}<span>${esc(clean(x.item))}</span></div>`).join('')}
      ${pros.map(x => `<div class="ck good">${icon('check', 15)}<span>${esc(x)}</span></div>`).join('')}
      ${cons.map(x => `<div class="ck fair">${icon('warn', 15)}<span>${esc(x)}</span></div>`).join('')}</div>`) : ''}`;

  T.price = `<div class="two">
    ${block('Trend', 'Which way the price has been heading.', `
      ${ok(hi) && ok(lo) ? `<div class="mr"><div class="ml"><div class="mt"><b>1-year range</b>${st(...S.hi(fromHi))}</div><p>Where today’s price sits between the year’s low and high.</p>${meter(px, lo, hi)}<div class="mm"><span>${fmt.inr(lo)}</span><span>${fmt.inr(hi)}</span></div></div><div class="v"><b class="tnum">${sgn(fromHi)}</b><span>from high</span></div></div>` : ''}
      ${ok(d200) ? row('200-day average', S.trend(d200), d200 > 0 ? 'Above it: the long-term direction is up.' : 'Below it: the long-term direction is down.', fmt.inr(e200), sgn(d200) + ' away', '') : ''}
      ${ok(e50) ? row('50-day average', S.trend(px - e50), px > e50 ? 'Above it: the last few months lean up.' : 'Below it: the last few months lean down.', fmt.inr(e50)) : ''}
      ${mt.length ? `<div class="mr"><div class="ml"><div class="mt"><b>Short · medium · long</b></div><p>Is the price above each average? Green means yes.</p></div><div class="v"><span class="tfs">${mt.map(x => `<i class="${/green/i.test(x.dot) ? 'g' : /red/i.test(x.dot) ? 'r' : ''}" title="${esc(clean(x.tf))}"></i>`).join('')}</span></div></div>` : ''}
      <div class="rets">${[['1 month', r1m], ['3 months', r3m], ['1 year', r1y]].map(([l, v]) => `<div><small>${l}</small><b class="tnum ${tone(v)}">${ok(v) ? sgn(v) : '—'}</b></div>`).join('')}</div>`)}
    ${block('Momentum and activity', 'How hard it is moving and how much it trades.', `
      ${ok(rsi) ? `<div class="mr"><div class="ml"><div class="mt"><b>RSI (14 days)</b>${st(...S.rsi(rsi))}</div><p>0–100 gauge of recent moves. Below 30 = fell fast, above 70 = rose fast.</p>${meter(rsi, 0, 100, [[0, 30, 'weak'], [70, 100, 'good']])}<div class="mm"><span>0</span><span>30</span><span>70</span><span>100</span></div></div><div class="v"><b class="tnum">${rsi.toFixed(0)}</b></div></div>` : ''}
      ${ok(adx) ? row('Trend strength (ADX)', S.adx(adx), 'Above 25 means a clear trend; below 20 means sideways.', adx.toFixed(0)) : ''}
      ${ok(vr) ? row('Volume vs normal', S.vol(vr), 'Today’s trading compared with the 20-day average.', vr.toFixed(1) + '×') : ''}
      ${ok(del) ? row('Delivery', S.del(del), 'Share of traded stock taken home, not day-traded.', del.toFixed(0) + '%') : ''}
      ${ok(atr) ? row('Daily swing', S.atr(atr), 'How much the price moves on a normal day.', atr.toFixed(1) + '%') : ''}`)}
    </div>`;

  T.business = `<div class="two">
    ${block('Valuation', 'What the market pays for the company.', `
      ${ok(mc) ? row('Market value', S.size(mc), 'Total value of all shares.', fmt.cr(mc)) : ''}
      ${ok(pe) ? row('P/E', S.pe(pe), `Price = ${pe.toFixed(0)} years of current profit. Higher means more growth expected.`, pe.toFixed(1) + '×') : ''}
      ${ok(pb) ? row('Price to book', S.pb(pb), 'Price compared with what the company owns on paper.', pb.toFixed(1) + '×') : ''}
      ${ok(dy) ? row('Dividend yield', S.dy(dy), 'Cash paid out each year as % of the price.', dy.toFixed(2) + '%') : ''}`)}
    ${block('Profitability and debt', 'How well it earns and how much it owes.', `
      ${ok(roe) ? row('Return on equity', S.ret(roe), 'Profit on shareholders’ money.', roe.toFixed(1) + '%') : ''}
      ${ok(roce) ? row('Return on capital', S.ret(roce), 'Profit on all money used, loans included.', roce.toFixed(1) + '%') : ''}
      ${ok(opm) ? row('Operating margin', S.opm(opm), 'Of every ₹100 of sales, what is left as operating profit.', opm.toFixed(1) + '%') : ''}
      ${ok(eps) ? row('Earnings per share', null, 'Profit for each share over the last year.', fmt.inr(eps)) : ''}
      ${ok(de) ? row('Debt to equity', S.de(de), 'Borrowings ÷ shareholders’ money. Below 0.5 is low.', de.toFixed(2)) : ''}
      ${sol && ok(sol.score) ? row('Debt check', [n(sol.score) >= 70 ? 'good' : n(sol.score) >= 45 ? 'fair' : 'weak', esc(clean(sol.grade || ''))], esc(clean(sol.summary || '')), fmt.int(sol.score), 'of 100') : ''}`)}
    </div>
    ${sales || qp.length || G.length ? block('Growth', 'Is the business getting bigger?', `<div class="two in">
      ${sales ? `<div class="chartbox"><b>Sales each year</b><span>₹ crore${(() => { const v = sales.values.map(n).filter(Number.isFinite); return v.length > 2 ? ` · up ${Math.round((v.at(-1) / v[0] - 1) * 100)}% in ${v.length - 1} years` : ''; })()}</span>${bars(yrs.map((y, i) => ({ l: y === 'TTM' ? 'TTM' : "'" + String(y).slice(-2), v: n(sales.values[i]) })).filter(x => Number.isFinite(x.v)).slice(-10), v => v >= 1e5 ? (v / 1e5).toFixed(1) + 'L' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : Math.round(v))}</div>` : ''}
      ${qp.length ? `<div class="chartbox"><b>Profit each quarter</b><span>₹ crore · last ${qp.length} quarters</span>${bars(qp.map(x => ({ l: String(x.quarter).split(' ')[0], v: n(x.net_profit_cr), k: 'alt' })), v => v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : Math.round(v))}</div>` : ''}
      </div>
      ${G.length ? `<table class="gt"><thead><tr><th>Growth per year</th>${periods.map(p => `<th>${esc(p.replace(/ years?/i, 'y'))}</th>`).join('')}</tr></thead><tbody>${G.map(g => `<tr><td>${{ sales_growth: 'Sales', profit_growth: 'Profit', price_cagr: 'Share price' }[g]}</td>${periods.map(p => { const v = (cg[g].find(x => x.period === p) || {}).value; return `<td class="tnum ${tone(n(v))}">${esc(v || '—')}</td>`; }).join('')}</tr>`).join('')}</tbody></table>` : ''}`) : ''}`;

  T.owners = holders.length ? block('Who owns it', `Shareholding${sp.Promoters?.quarter ? ' as of ' + esc(sp.Promoters.quarter) : ''}. Change is versus last quarter.`, `
    <div class="stack">${holders.map(x => `<i class="${HN[x][2]}" style="width:${n(sp[x].holding_pct)}%" title="${HN[x][0]}"></i>`).join('')}</div>
    ${holders.map(x => { const h = sp[x], c = n(h.qoq_change); return `<div class="mr"><div class="ml"><div class="mt"><i class="sw ${HN[x][2]}"></i><b>${HN[x][0]}</b>${ok(c) && c !== 0 ? st(c > 0 ? 'good' : 'fair', c > 0 ? 'Added' : 'Reduced') : st('info', 'No change')}</div><p>${HN[x][1]}</p></div><div class="v"><b class="tnum">${n(h.holding_pct).toFixed(1)}%</b><span class="${tone(c)}">${ok(c) && c !== 0 ? sgn(c, 2) : '—'}</span></div></div>`; }).join('')}
    ${sp['No. of Shareholders'] ? `<p class="note">${fmt.int(sp['No. of Shareholders'].holding_pct)} shareholders in total.</p>` : ''}`) : `<p class="empty-s">Ownership data is not available for this stock.</p>`;

  T.peers = `${peers.length > 1 ? block('Compared with peers', 'Same industry, side by side.', `<table class="dt"><thead><tr><th>Company</th><th>P/E</th><th>ROCE</th><th>Score</th></tr></thead><tbody>${peers.map(x => `<tr class="${x.isCurrent ? 'on' : ''}" data-href="xray/${encodeURIComponent(x.symbol)}"><td><b>${esc(x.symbol)}</b>${x.isCurrent ? ' <em>this</em>' : ''}</td><td class="tnum">${esc(String(x.pe ?? '—'))}</td><td class="tnum">${esc(String(x.roce ?? '—'))}</td><td class="tnum">${ok(x.score) ? fmt.int(x.score) : '—'}</td></tr>`).join('')}</tbody></table>`) : '<p class="empty-s">No peer list for this stock yet.</p>'}
    ${news.length ? block('In the news', '', news.map(x => link('news', `<b>${esc(x.t)}</b><span>${esc(x.src)} · ${esc(x.tag)}</span>`, 'nw')).join('')) : ''}`;

  let tab = TABS.some(([k2]) => k2 === tab0) ? tab0 : 'overview';
  rep.innerHTML = `
  <section class="hero-x">
    <div class="hx-l">
      <div class="xtop">${mono(sym)}<div><h2>${esc(name)}</h2><span>NSE: ${esc(sym)}${d.sector ? ' · ' + esc(clean(d.sector)) : ''}</span></div></div>
      <div class="xpx"><b class="tnum">${fmt.inr(px)}</b><span class="chg ${tone(chg)}">${ok(chg) ? sgn(chg, 2) : ''}</span></div>
      <div class="xmeta">${sample ? '<span class="tag-s">Sample data</span>' : '<span class="tiny">Last close</span>'}${u.dna_archetype ? `<span class="tag-a">${esc(clean(u.dna_archetype).split('·')[0])}</span>` : ''}</div>
    </div>
    <div class="hx-c"><div class="seg sm" id="rng"><button data-v="21">1M</button><button data-v="63">3M</button><button data-v="126">6M</button><button data-v="999">1Y</button></div><div id="pc"></div></div>
  </section>

  ${glance.length ? `<section class="glance"><h3 class="lbl">At a glance</h3><div class="gl">${glance.map(([l, s, v, say]) => `<div class="gt-${s[0]}"><span class="gl-l">${l}</span><b class="tnum">${v}</b>${st(...s)}<p>${say}</p></div>`).join('')}</div></section>` : ''}

  <nav class="tabs-x" id="xt" role="tablist">${TABS.map(([k2, l]) => `<button role="tab" data-t="${k2}">${l}</button>`).join('')}</nav>
  <div id="tb" class="tabbody"></div>

  <div class="cta"><div><b>Find stocks like this</b><p>Run a ready-made screen or write your own rules.</p></div><div class="row-b">${link('screens', 'Screens', 'btn sm quiet')}${link('build', `${icon('plus', 16)}Build`, 'btn sm pri')}</div></div>
  <p class="disc">Facts and figures from public data, explained in plain words. Not a rating, research report or recommendation.${sample ? ' Sample numbers shown because the X-Ray server is not connected.' : ''}</p>`;

  const tb = rep.querySelector('#tb'), xt = rep.querySelector('#xt');
  /* After a tab switch, land at the top of the new tab, just under the sticky tab bar. */
  const toTop = () => { const hdr = (document.getElementById('top') || {}).offsetHeight || 58, y = tb.getBoundingClientRect().top + scrollY - hdr - xt.offsetHeight - 6; if (scrollY > y) scrollTo({ top: Math.max(0, y), behavior: 'instant' in window ? 'instant' : 'auto' }); };
  const show = (k2, user) => { if (user && k2 === tab && tb.innerHTML) { toTop(); return; } tab = k2; xt.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === k2)); tb.innerHTML = k2 === 'filings' ? skel(110, 3) : T[k2]; if (k2 === 'filings') filings(sym, tb); if (user) toTop(); try { history.replaceState(history.state, '', location.pathname + (k2 === 'overview' ? '' : '?tab=' + k2)); } catch { /* ignore */ } };
  xt.onclick = e => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t, true); };
  tb.addEventListener('click', e => { const t2 = e.target.closest('tr[data-href]'); if (t2) go(t2.dataset.href); });
  show(tab);

  const draw1 = days => { const c = cand.slice(-Math.min(days, cand.length)); if (c.length > 5) line(rep.querySelector('#pc'), [{ data: c.map(x => x.c), color: c.at(-1).c >= c[0].c ? 'var(--up)' : 'var(--dn)', area: true }], { h: 200, dates: c.map(x => x.t), yfmt: v => fmt.inr(v), label: sym + ' price', tip: i => `${fmt.date(c[i].t)} · ${fmt.inr(c[i].c)}` }); };
  const rg = rep.querySelector('#rng'), setR = v => { rg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); draw1(+v); };
  rg.onclick = e => { const b = e.target.closest('button'); if (b) setR(b.dataset.v); };
  setR('999');
}

/* Filings tab: everything the company and its insiders filed, scored, newest first. */
async function filings(sym, box) {
  try {
    const d = await intel.stock(sym);
    if (!box.isConnected) return;
    const tl = d.timeline || [], ins = d.insiders || [], dl = d.deals || [], mt = d.meetings || [], ow = d.owners || [], pl = d.pledge || [];
    const next = mt.filter(m => m.meeting_date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))[0];
    const hi = tl.filter(e => e.impact >= 60).slice(0, 3);
    box.innerHTML = `${next ? `<div class="info-b">${icon('cal', 16)}<span><b>Board meeting ${fmt.date(next.meeting_date)}</b> · ${esc(next.purpose || '')}</span></div>` : ''}
      ${hi.length ? `<section class="fsec"><h3 class="h3">Biggest recent items</h3>${hi.map(e => evCard(e, { showSym: false })).join('')}</section>` : ''}
      ${ins.length ? `<section class="fsec"><h3 class="h3">Insider trades</h3><div class="card flush"><table class="dt"><thead><tr><th>Who</th><th>Side</th><th>Value</th></tr></thead><tbody>${ins.slice(0, 12).map(i => `<tr><td>${esc((i.person || '').slice(0, 30))}<small class="tiny" style="display:block">${esc(i.category || '')} · ${fmt.date(i.known_at)}${i.pct_after != null ? ' · now ' + (+i.pct_after).toFixed(2) + '%' : ''}</small></td><td><span class="st ${i.side === 'Buy' ? 'good' : 'weak'}">${i.side === 'Buy' ? 'Bought' : 'Sold'}</span></td><td class="tnum">₹${(+i.value_cr || 0).toFixed(2)} cr</td></tr>`).join('')}</tbody></table></div></section>` : ''}
      ${dl.length ? `<section class="fsec"><h3 class="h3">Bulk and block deals</h3><div class="card flush"><table class="dt"><thead><tr><th>Party</th><th>Side</th><th>Value</th></tr></thead><tbody>${dl.slice(0, 12).map(x => `<tr><td>${esc((x.party || '').slice(0, 32))}<small class="tiny" style="display:block">${fmt.int(x.qty)} @ ${fmt.inr(x.price)} · ${fmt.date(x.deal_date)}</small></td><td><span class="st ${x.side === 'Buy' ? 'good' : 'weak'}">${x.side === 'Buy' ? 'Bought' : 'Sold'}</span></td><td class="tnum">${fmt.cr(x.value_cr)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
      ${ow.length ? `<section class="fsec"><h3 class="h3">Who owns it, by quarter</h3><div class="card flush"><table class="dt"><thead><tr><th>Quarter</th><th>Promoter</th><th>Pledged</th><th>FII</th><th>DII</th></tr></thead><tbody>${ow.map(o => `<tr><td>${fmt.dateY(o.quarter_end)}</td><td class="tnum">${o.promoter_pct != null ? (+o.promoter_pct).toFixed(2) + '%' : '—'}${o.promoter_change_qoq ? `<small class="${o.promoter_change_qoq > 0 ? 'up' : 'dn'}"> ${o.promoter_change_qoq > 0 ? '+' : ''}${(+o.promoter_change_qoq).toFixed(2)}</small>` : ''}</td><td class="tnum">${o.pledged_pct != null ? (+o.pledged_pct).toFixed(2) + '%' : '—'}</td><td class="tnum">${o.fii_pct != null ? (+o.fii_pct).toFixed(2) + '%' : '—'}</td><td class="tnum">${o.dii_pct != null ? (+o.dii_pct).toFixed(2) + '%' : '—'}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
      ${pl.length > 1 ? `<p class="tiny">Promoter pledge: ${pl.slice(0, 4).map(p => `${(+p.pledged_pct || 0).toFixed(2)}% (${fmt.date(p.known_at)})`).join(' ← ')}</p>` : ''}
      <section class="fsec"><div class="sec-h" style="margin:0 0 8px"><h3 class="h3">Timeline</h3><span class="tiny">${tl.length} items</span></div>${tl.length ? tl.slice(0, 40).map(e => evCard(e, { showSym: false })).join('') : '<p class="empty-s">No filings collected for this company yet.</p>'}</section>
      <p class="disc">From NSE and BSE filings, SEBI insider disclosures and news. Impact is an automatic 0–100 score of how much an item usually matters.</p>`;
  } catch (e) {
    if (box.isConnected) box.innerHTML = `<div class="info-b">${icon('info', 16)}<span>Filings need the server, which is not reachable right now.</span></div>`;
  }
}
