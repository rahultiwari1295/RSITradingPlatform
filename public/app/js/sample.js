/* SAMPLE DATA. Stand-in values so every page can be designed and tested before its backend exists.
   Shapes match the real APIs (DNA report, Lab scan rows, strategy stats), so swapping in live data
   is a change in one place: the loader in each view tries the API first and falls back to these.
   Nothing here is real market data. Pages that show it carry a "Sample data" badge. */

/* deterministic random numbers, so the same stock always shows the same sample */
const seedOf = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export function rng(seed) { let a = typeof seed === 'number' ? seed : seedOf(seed); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const rd = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/* ---------------------------------------------------------------- universe */
export const UNIVERSE = [
  ['RELIANCE', 'Reliance Industries', 'Oil, gas & retail', 2945], ['TCS', 'Tata Consultancy Services', 'IT services', 4120], ['HDFCBANK', 'HDFC Bank', 'Private bank', 1712],
  ['INFY', 'Infosys', 'IT services', 1890], ['ICICIBANK', 'ICICI Bank', 'Private bank', 1268], ['BHARTIARTL', 'Bharti Airtel', 'Telecom', 1745], ['ITC', 'ITC', 'FMCG', 482],
  ['SBIN', 'State Bank of India', 'PSU bank', 812], ['LT', 'Larsen & Toubro', 'Engineering', 3650], ['BAJFINANCE', 'Bajaj Finance', 'NBFC', 7420], ['HCLTECH', 'HCL Technologies', 'IT services', 1835],
  ['KOTAKBANK', 'Kotak Mahindra Bank', 'Private bank', 1790], ['AXISBANK', 'Axis Bank', 'Private bank', 1180], ['MARUTI', 'Maruti Suzuki', 'Autos', 12650], ['SUNPHARMA', 'Sun Pharma', 'Pharma', 1915],
  ['TITAN', 'Titan Company', 'Consumer', 3480], ['ULTRACEMCO', 'UltraTech Cement', 'Cement', 11800], ['TATAMOTORS', 'Tata Motors', 'Autos', 965], ['M&M', 'Mahindra & Mahindra', 'Autos', 3120],
  ['NTPC', 'NTPC', 'Power', 412], ['POWERGRID', 'Power Grid', 'Power', 335], ['ONGC', 'ONGC', 'Oil & gas', 285], ['WIPRO', 'Wipro', 'IT services', 545], ['ASIANPAINT', 'Asian Paints', 'Consumer', 3050],
  ['NESTLEIND', 'Nestle India', 'FMCG', 2510], ['TRENT', 'Trent', 'Retail', 7200], ['DIXON', 'Dixon Technologies', 'Electronics', 15400], ['PERSISTENT', 'Persistent Systems', 'IT services', 5600],
  ['POLYCAB', 'Polycab India', 'Cables', 7100], ['HAL', 'Hindustan Aeronautics', 'Defence', 4650], ['BEL', 'Bharat Electronics', 'Defence', 305], ['IRFC', 'Indian Railway Finance', 'NBFC', 158],
  ['ZOMATO', 'Zomato', 'Internet', 268], ['TATAPOWER', 'Tata Power', 'Power', 448], ['COALINDIA', 'Coal India', 'Mining', 495], ['DLF', 'DLF', 'Real estate', 845], ['CDSL', 'CDSL', 'Capital markets', 1650],
  ['ANGELONE', 'Angel One', 'Capital markets', 2800], ['KPITTECH', 'KPIT Technologies', 'IT services', 1780], ['CUMMINSIND', 'Cummins India', 'Engineering', 3720], ['PIDILITIND', 'Pidilite', 'Chemicals', 3150],
  ['DMART', 'Avenue Supermarts', 'Retail', 4380], ['HINDUNILVR', 'Hindustan Unilever', 'FMCG', 2620], ['JSWSTEEL', 'JSW Steel', 'Metals', 985], ['TATASTEEL', 'Tata Steel', 'Metals', 158], ['VEDL', 'Vedanta', 'Metals', 472],
].map(([s, n, sec, p]) => ({ s, n, sec, p }));
const U = Object.fromEntries(UNIVERSE.map(x => [x.s, x]));
export const stock = s => U[s] || { s, n: s, sec: 'Listed company', p: 200 + (seedOf(s) % 3000) };
export const searchSample = q => { q = q.toUpperCase(); return UNIVERSE.filter(x => x.s.includes(q) || x.n.toUpperCase().includes(q)).slice(0, 6).map(x => ({ symbol: x.s, name: x.n })); };

/** daily closes for a year, ending at the stock's price */
export function candles(sym, days = 260) {
  const r = rng(sym + ':c'), st = stock(sym), drift = (r() - .4) * .0018, vol = .011 + r() * .012;
  const out = []; let v = 1;
  for (let i = 0; i < days; i++) { v *= 1 + drift + (r() - .5) * 2 * vol; out.push(v); }
  const k = st.p / out.at(-1), d = new Date(); d.setHours(0, 0, 0, 0);
  const dates = []; while (dates.length < days) { if (d.getDay() % 6) dates.unshift(d.toISOString().slice(0, 10)); d.setDate(d.getDate() - 1); }
  return out.map((x, i) => ({ time: dates[i], close: rd(x * k), volume: Math.round(5e5 + r() * 4e6) }));
}

/* ---------------------------------------------------------------- X-Ray report (same shape as /dna/report) */
export function report(sym) {
  sym = String(sym).toUpperCase();
  const r = rng(sym), st = stock(sym), cs = candles(sym), cl = cs.map(c => c.close), px = cl.at(-1);
  const avg = n => cl.slice(-n).reduce((a, b) => a + b, 0) / Math.min(n, cl.length);
  const hi = Math.max(...cl), lo = Math.min(...cl), e200 = avg(200), e50 = avg(50), e20 = avg(20);
  const rsi = rd(30 + r() * 45, 1), adx = rd(12 + r() * 30, 1), volr = rd(.6 + r() * 1.9);
  const mcap = Math.round(st.p * (20 + r() * 400)), pe = rd(12 + r() * 55, 1), roe = rd(8 + r() * 24, 1), roce = rd(roe + r() * 8 - 2, 1);
  const sales0 = Math.round(mcap / (2 + r() * 6)), g = .06 + r() * .18;
  const years = ['Mar 2017', 'Mar 2018', 'Mar 2019', 'Mar 2020', 'Mar 2021', 'Mar 2022', 'Mar 2023', 'Mar 2024', 'Mar 2025', 'TTM'];
  const sales = years.map((_, i) => Math.round(sales0 / (1 + g) ** (9 - i) * (0.94 + r() * .1)));
  const margin = .07 + r() * .16, prof = sales.map(x => Math.round(x * margin * (0.85 + r() * .3)));
  const qtr = ['Jun 2024', 'Sep 2024', 'Dec 2024', 'Mar 2025', 'Jun 2025', 'Sep 2025', 'Dec 2025', 'Mar 2026'].map((q, i) => { const s = Math.round(sales[9] / 4 * (0.9 + i * .02 + r() * .08)); return { quarter: q, sales_cr: s, net_profit_cr: Math.round(s * margin * (0.8 + r() * .4)) }; });
  const prom = rd(35 + r() * 40, 2), fii = rd(8 + r() * 22, 2), dii = rd(6 + r() * 18, 2), pub = rd(Math.max(1, 100 - prom - fii - dii), 2);
  const sh = (v, c) => ({ holding_pct: v, qoq_change: rd(c, 2), quarter: 'Sep 2026' });
  const de = rd(r() * 1.4, 2), score = Math.round(35 + r() * 55);
  const pil = (k, mx) => ({ score: Math.round(mx * (.3 + r() * .7)), max: mx });
  const dist = (a, b) => rd((a / b - 1) * 100, 1);
  const peers = UNIVERSE.filter(x => x.sec === st.sec && x.s !== sym).slice(0, 4).map(x => ({ symbol: x.s, pe: rd(10 + rng(x.s)() * 50, 1), roce: rd(8 + rng(x.s + 'r')() * 25, 1) + '%', score: Math.round(35 + rng(x.s + 's')() * 55) }));
  const up20 = rd(.42 + r() * .22, 2);
  return {
    sample: true, symbol: sym, company_name: st.n, sector: st.sec,
    chart_candles: cs,
    current_metrics: { price: px, prev_close: cl.at(-2), w52_high: rd(hi), w52_low: rd(lo), ema20: rd(e20), ema50: rd(e50), ema200: rd(e200), rsi, adx, vol_ratio: volr,
      atr_pct: rd(1.1 + r() * 2.4, 2), dist_200: dist(px, e200), dist_52h: dist(px, hi), ret_1m: dist(px, cl.at(-22)), ret_3m: dist(px, cl.at(-64)), ret_1y: dist(px, cl[0]),
      delivery_pct: rd(28 + r() * 45, 1), avg_volume: Math.round(cs.slice(-20).reduce((a, c) => a + c.volume, 0) / 20),
      base_rate: { p_positive_20d: up20, samples: Math.round(400 + r() * 3000), median_ret_20d: rd((up20 - .5) * 8, 2), state_text: px > e200 ? 'above its 200-day average with RSI near ' + Math.round(rsi) : 'below its 200-day average with RSI near ' + Math.round(rsi) } },
    ui_report: {
      dna_health_score: score, dna_archetype: pick(r, ['Steady compounder', 'Cyclical', 'High-growth', 'Value', 'Turnaround', 'Defensive']),
      beginner_summary: `${st.n} is in ${st.sec.toLowerCase()}. The price is ${px > e200 ? 'above' : 'below'} its long-term average, sales grew about ${Math.round(g * 100)}% a year, and debt is ${de < .3 ? 'low' : de < .8 ? 'moderate' : 'high'}.`,
      score_breakdown: { total: score, pillars: { trend: { ...pil('t', 25), summary: px > e200 ? 'Price is above the 200-day average, so the long-term direction is up.' : 'Price is below the 200-day average, so the long-term direction is down.' }, momentum: { ...pil('m', 25), summary: rsi > 60 ? 'Recent moves have been strong (RSI above 60).' : rsi < 40 ? 'Recent moves have been weak (RSI below 40).' : 'Recent moves are middling (RSI between 40 and 60).' }, volume: { ...pil('v', 25), summary: volr > 1.3 ? 'More shares than usual are trading.' : 'Trading activity is around normal.' }, quality: { ...pil('q', 25), summary: roce > 15 ? 'Returns on capital are healthy.' : 'Returns on capital are modest.' } } },
      multi_timeframe: [{ tf: 'Short term (days)', ma: '20-day average ' + Math.round(e20), bias: px > e20 ? 'Above' : 'Below', dot: px > e20 ? 'green' : 'red' }, { tf: 'Medium term (weeks)', ma: '50-day average ' + Math.round(e50), bias: px > e50 ? 'Above' : 'Below', dot: px > e50 ? 'green' : 'red' }, { tf: 'Long term (months)', ma: '200-day average ' + Math.round(e200), bias: px > e200 ? 'Above' : 'Below', dot: px > e200 ? 'green' : 'red' }],
    },
    fundamentals: {
      market_cap_cr: mcap, key_ratios: { stock_pe: pe, roe_pct: roe, roce_pct: roce, dividend_yield_pct: rd(r() * 2.8, 2), book_value: rd(px / (2 + r() * 8)), debt_to_equity: de, eps: rd(px / pe), opm_pct: rd(margin * 100 + 4, 1), face_value: pick(r, [1, 2, 5, 10]) },
      compounded_growth: { sales_growth: [{ period: '10 Years', value: Math.round(g * 100) + '%' }, { period: '5 Years', value: Math.round(g * 100 + 2) + '%' }, { period: '3 Years', value: Math.round(g * 100 - 1) + '%' }], profit_growth: [{ period: '10 Years', value: Math.round(g * 110) + '%' }, { period: '5 Years', value: Math.round(g * 120) + '%' }, { period: '3 Years', value: Math.round(g * 90) + '%' }], price_cagr: [{ period: '10 Years', value: Math.round(8 + r() * 18) + '%' }, { period: '5 Years', value: Math.round(6 + r() * 26) + '%' }, { period: '3 Years', value: Math.round(-4 + r() * 34) + '%' }] },
      annual_income_statement: { years, rows: [{ metric: 'Sales', values: sales }, { metric: 'Net Profit', values: prof }] },
      quarterly_performance: qtr,
      shareholding_pattern: { Promoters: sh(prom, (r() - .6) * .8), FIIs: sh(fii, (r() - .5) * 1.6), DIIs: sh(dii, (r() - .4) * 1.2), Public: sh(pub, (r() - .5) * .9), 'No. of Shareholders': { holding_pct: Math.round(1e5 + r() * 4e6) } },
      pros: ['Company has a good return on equity track record', 'Sales have grown steadily over five years'].slice(0, 1 + (r() > .5)), cons: ['Stock is trading at a high multiple of its book value', 'Promoter holding has come down over the last 3 years'].slice(0, 1 + (r() > .5)),
    },
    solvency: { score: Math.round(40 + r() * 55), grade: de < .3 ? 'Low debt' : de < .8 ? 'Manageable debt' : 'High debt', summary: de < .3 ? 'Borrowings are small compared with what shareholders own.' : 'Borrowings are a sizeable part of the money in the business.', de: de + '' },
    peers: [{ symbol: sym, pe, roce: roce + '%', score, isCurrent: true }, ...peers],
    catalysts: { checklist: [{ item: 'Profit grew in the last quarter', pass: qtr[7].net_profit_cr > qtr[6].net_profit_cr }, { item: 'Debt is below shareholders’ money', pass: de < 1 }, { item: 'Founders did not pledge shares', pass: r() > .2 }, { item: 'Cash from operations is positive', pass: r() > .15 }] },
  };
}

/* ---------------------------------------------------------------- screens
   Every query is real scanner language; Screens runs it on the Lab. The sample rows below are only shown when the
   Lab cannot be reached (and are labelled as sample). `col` = the field shown next to each match. */
const S = (id, name, about, query, col, tf = '1D', needs = '') => ({ id, name, about, query, col, tf, needs, live: true });
export const SCREEN_GROUPS = [
  { id: 'breakout', name: 'Breakouts', about: 'Prices leaving a range or a level that held before.', items: [
    S('52wh', '52-week high', 'Closed at a new one-year high today.', 'close > high(52w)', 'dist_hh52_pct'),
    S('52wh-vol', '52-week high on volume', 'New one-year high with 1.5× normal volume.', 'close > high(52w)\nand rvol > 1.5', 'vol_ratio'),
    S('ath', 'Near all-time high', 'Within 3% of the highest price ever, in an uptrend.', 'from_ath > -3\nand close > sma(50)', 'dist_ath_pct'),
    S('near52', 'Near 52-week high', 'Within 5% of the one-year high.', 'from_52w_high > -5\nand close > sma(50)', 'dist_hh52_pct'),
    S('20dbo', '20-day breakout', 'Closed above the highest price of the last 20 days.', 'close > high(20)\nand close > sma(200)', 'ret_1'),
    S('bb-bo', 'Bollinger breakout', 'Closed above the upper Bollinger band.', 'close crosses above bb_upper', 'vol_ratio'),
    S('squeeze', 'Squeeze breakout', 'Bands were tight yesterday; today price breaks the upper band.', 'bb_width[1] < 10\nand close > bb_upper', 'bb_width_pct'),
    S('nr7', 'NR7 in an uptrend', 'Quietest day of the week in a rising stock: a coiled spring.', 'nr7\nand close > sma(50)\nand sma_50_slope > 0', 'range_pct'),
    S('stage2', 'Stage-2 base breakout', 'Left a long base as the 30-week average turns up.', 'stage2', 'vol_ratio') ] },
  { id: 'momentum', name: 'Momentum', about: 'Stocks already moving, and how strongly.', items: [
    S('rsi60', 'RSI crossing 60', 'Momentum turning strong.', 'rsi(14) crosses above 60', 'rsi_14'),
    S('golden', 'Golden cross', '50-day average crossed above the 200-day.', 'sma(50) crosses above sma(200)', 'ret_20'),
    S('ema921', 'EMA 9 / 21 crossover', 'Fast average crossed above the slower one, in an uptrend.', 'ema(9) crosses above ema(21)\nand close > sma(200)', 'ret_5'),
    S('macd', 'MACD bullish cross', 'MACD line crossed above its signal line.', 'macd crosses above signal', 'rsi_14'),
    S('adx', 'Strong trend', 'ADX above 25 and price above the 50-day average.', 'adx(14) > 25\nand close > sma(50)', 'adx_14'),
    S('lead60', '3-month leaders', 'Up 30%+ in 60 days and still above the 50-day average.', 'change(60) > 30\nand close > sma(50)', 'ret_60'),
    S('streak', 'Five green days', 'Closed higher five sessions in a row.', 'up_streak >= 5', 'up_streak'),
    S('rs', 'Relative-strength leaders', 'Leaders breaking out on heavy volume.', 'rs_leader', 'ret_20') ] },
  { id: 'volume', name: 'Volume & delivery', about: 'Unusual activity, and whether buyers took delivery.', items: [
    S('vshock', 'Volume shockers', 'Trading at least 3× the 20-day average.', 'rvol > 3', 'vol_ratio'),
    S('vup', 'Up on heavy volume', 'Up 2% or more on twice normal volume.', 'change(1) > 2\nand rvol > 2', 'ret_1'),
    S('deliv', 'High delivery', 'More than 60% of traded shares taken for delivery, volume up.', 'delivery > 60\nand rvol > 1.5', 'delivery_pct', '1D', 'delivery'),
    S('delivbo', 'Delivery-backed breakout', 'New 20-day high with delivery 1.5× its usual level.', 'close > high(20)\nand delivery_ratio > 1.5', 'delivery_ratio', '1D', 'delivery'),
    S('gapup', 'Gap up', 'Opened 2% or more above yesterday’s close.', 'gap > 2', 'gap_pct'),
    S('pgap', 'Power gap', 'Big gap up on very heavy volume that held.', 'power_gap', 'vol_ratio'),
    S('dry', 'Volume dry-up', 'Quiet day in an uptrend: volume half of normal.', 'rvol < 0.5\nand close > sma(50)', 'vol_ratio') ] },
  { id: 'pullback', name: 'Pullbacks & reversals', about: 'Strong stocks resting, or weak ones turning.', items: [
    S('pb50', 'Pullback in an uptrend', 'Above the 200-day average, RSI cooled to 38–48.', 'close > sma(200)\nand rsi(14) between 38 and 48', 'rsi_14'),
    S('ema20', 'Bounce off EMA 20', 'Touched the 20-day EMA and closed green in an uptrend.', 'from_ema20 between -1.5 and 1\nand green\nand ema(20) > ema(50)', 'dist_ema_20_pct'),
    S('3red', 'Three red days, trend up', 'A short dip in a strong trend.', 'down_streak >= 3\nand close > sma(100)', 'down_streak'),
    S('oversold', 'Oversold bounce', 'RSI below 30 and a green candle today.', 'rsi(14) < 30\nand green', 'rsi_14'),
    S('inside', 'Inside bar in uptrend', 'Today’s range sits inside yesterday’s.', 'inside_bar\nand close > sma(50)', 'ret_1'),
    S('apex', 'Tightening base (VCP)', 'Swings getting smaller, then a break up.', 'apex_base', 'vol_ratio'),
    S('htf', 'High tight flag', 'Sharp rise, short tight pause, then a break.', 'high_tight_flag', 'ret_20') ] },
  { id: 'events', name: 'Filings & insiders', about: 'What companies and insiders just did, from exchange filings.', items: [
    S('insider', 'Insiders buying', 'Insiders bought over ₹50 lakh in the last 30 days.', 'insider_buy_cr_30d > 0.5', 'insider_buy_cr_30d', '1D', 'events'),
    S('prombuy', 'Promoters buying in the market', 'Promoter open-market buying in the last 90 days.', 'promoter_buy_cr_90d > 0', 'promoter_buy_cr_90d', '1D', 'events'),
    S('bulkbuy', 'Bulk or block buying', 'A large investor bought in a bulk/block deal in 10 days.', 'bulk_buy_count_10d >= 1', 'bulk_buy_count_10d', '1D', 'events'),
    S('orders', 'Fresh order wins', 'Announced an order or contract in the last 7 days.', 'days_since_order_win <= 7', 'days_since_order_win', '1D', 'events'),
    S('resweek', 'Results this week', 'Board meeting for results within 7 days.', 'days_to_results <= 7', 'days_to_results', '1D', 'events'),
    S('postres', 'Post-results breakout', 'Results in the last 5 days and a 20-day high on volume.', 'days_since_results <= 5\nand close > high(20)\nand rvol > 1.5', 'days_since_results', '1D', 'events'),
    S('upgrade', 'Credit rating upgrades', 'Upgraded by a rating agency in the last 6 months.', 'rating_upgrades_180d >= 1', 'rating_upgrades_180d', '1D', 'events'),
    S('hot', 'High-impact news', 'Something scored 70+ in impact in the last 7 days.', 'impact_max_7d >= 70', 'impact_max_7d', '1D', 'events') ] },
  { id: 'business', name: 'Business quality', about: 'Company numbers, not the chart. Like Screener.in.', items: [
    S('qual', 'Quality at fair price', 'Return on capital above 20% and P/E below 30.', 'roce > 20\nand pe < 30\nand pe > 0', 'roce', '1D', 'business'),
    S('debtfree', 'Debt-free growers', 'Almost no borrowings, profits growing 10%+ a year.', 'debt_to_equity < 0.1\nand profit_growth_3y > 10', 'debt_to_equity', '1D', 'business'),
    S('growth', 'Consistent growers', 'Sales and profit up 15%+ a year for 5 years.', 'sales_growth_5y > 15\nand profit_growth_5y > 15', 'sales_growth_5y', '1D', 'business'),
    S('qtrgrowth', 'Strong latest quarter', 'Profit up 25%+ and sales up 15%+ vs a year ago.', 'profit_growth_yoy > 25\nand sales_growth_yoy > 15', 'profit_growth_yoy', '1D', 'business'),
    S('div', 'High dividend', 'Dividend yield above 3%.', 'dividend_yield > 3', 'dividend_yield', '1D', 'business'),
    S('coffee', 'Coffee-can', '10 years of 10%+ sales growth and 15%+ ROCE.', 'sales_growth_10y > 10\nand roce > 15', 'roce', '1D', 'business'),
    S('magic', 'Magic formula (simple)', 'High return on capital and high earnings yield.', 'roce > 25\nand earnings_yield > 6', 'earnings_yield', '1D', 'business'),
    S('cheap', 'Cheap and profitable', 'P/E under 12, ROE above 15%, market cap over ₹1,000 cr.', 'pe < 12\nand pe > 0\nand roe > 15\nand market_cap > 1000', 'pe', '1D', 'business') ] },
  { id: 'owners', name: 'Who is buying', about: 'Changes in ownership each quarter.', items: [
    S('fii', 'Foreign funds adding', 'FII holding up 1 point or more this quarter.', 'fii_change_qoq > 1', 'fii_change_qoq', '1D', 'owners'),
    S('dii', 'Mutual funds adding', 'DII holding up 1 point or more this quarter.', 'dii_change_qoq > 1', 'dii_change_qoq', '1D', 'owners'),
    S('prom', 'Founders adding', 'Promoter holding went up this quarter.', 'promoter_change_qoq > 0', 'promoter_change_qoq', '1D', 'owners'),
    S('unpledge', 'Pledge coming down', 'Promoters released 1 point or more of pledged shares.', 'pledge_change_qoq < -1', 'pledge_change_qoq', '1D', 'owners'),
    S('clean', 'High promoter, zero pledge', 'Promoters own 60%+ and have pledged nothing.', 'promoter > 60\nand pledge = 0', 'promoter_pct', '1D', 'owners') ] },
  { id: 'weak', name: 'Warning signs', about: 'Useful to know what to steer clear of studying.', items: [
    S('52wl', '52-week low', 'Closed at a new one-year low.', 'close < low(52w)', 'ret_20'),
    S('death', 'Death cross', '50-day average crossed below the 200-day.', 'sma(50) crosses below sma(200)', 'ret_20'),
    S('b200', 'Broke the 200-day', 'Closed below the 200-day average today.', 'close crosses below sma(200)', 'ret_1'),
    S('vdown', 'Down on heavy volume', 'Down 3% or more on twice normal volume.', 'change(1) < -3\nand rvol > 2', 'ret_1'),
    S('pledgeup', 'Pledge rising', 'Promoters pledged 2 points more shares this quarter.', 'pledge_change_qoq > 2', 'pledge_change_qoq', '1D', 'owners'),
    S('insell', 'Insiders selling', 'Insiders sold over ₹1 crore in 30 days.', 'insider_sell_cr_30d > 1', 'insider_sell_cr_30d', '1D', 'events'),
    S('redflags', 'Repeated bad news', 'Two or more negative filings or news items in 30 days.', 'negative_events_30d >= 2', 'negative_events_30d', '1D', 'events') ] },
];
export const SCREENS = SCREEN_GROUPS.flatMap(g => g.items.map(x => ({ ...x, group: g.id, groupName: g.name })));
const P1 = v => (v > 0 ? '+' : '') + v.toFixed(1) + '%';
const COLFMT = { vol_ratio: v => v.toFixed(1) + '×', delivery_ratio: v => v.toFixed(1) + '×', rsi_14: v => v.toFixed(0), adx_14: v => v.toFixed(0),
  dist_hh52_pct: v => v.toFixed(1) + '%', dist_ath_pct: v => v.toFixed(1) + '%', dist_ema_20_pct: P1, gap_pct: P1, ret_1: P1, ret_5: P1, ret_20: P1, ret_60: P1,
  roce: v => v.toFixed(0) + '%', roe: v => v.toFixed(0) + '%', pe: v => v.toFixed(1), debt_to_equity: v => v.toFixed(2), sales_growth_5y: v => v.toFixed(0) + '%',
  profit_growth_yoy: P1, dividend_yield: v => v.toFixed(1) + '%', earnings_yield: v => v.toFixed(1) + '%', fii_change_qoq: v => (v > 0 ? '+' : '') + v.toFixed(2),
  dii_change_qoq: v => (v > 0 ? '+' : '') + v.toFixed(2), promoter_change_qoq: v => (v > 0 ? '+' : '') + v.toFixed(2), pledge_change_qoq: v => (v > 0 ? '+' : '') + v.toFixed(2),
  promoter_pct: v => v.toFixed(1) + '%', delivery_pct: v => v.toFixed(0) + '%', insider_buy_cr_30d: v => '₹' + v.toFixed(2) + ' cr', insider_sell_cr_30d: v => '₹' + v.toFixed(2) + ' cr',
  promoter_buy_cr_90d: v => '₹' + v.toFixed(2) + ' cr', days_since_order_win: v => v.toFixed(0) + 'd ago', days_since_results: v => v.toFixed(0) + 'd ago',
  days_to_results: v => 'in ' + v.toFixed(0) + 'd', bb_width_pct: v => v.toFixed(1) + '%', range_pct: v => v.toFixed(1) + '%', up_streak: v => v.toFixed(0) + ' days', down_streak: v => v.toFixed(0) + ' days' };
const COLNAME = { vol_ratio: 'Volume ×', delivery_ratio: 'Delivery ×', rsi_14: 'RSI', adx_14: 'ADX', dist_hh52_pct: 'From high', dist_ath_pct: 'From ATH', dist_ema_20_pct: 'From EMA 20',
  gap_pct: 'Gap', ret_1: 'Today', ret_5: '5 days', ret_20: '20 days', ret_60: '60 days', roce: 'ROCE', roe: 'ROE', pe: 'P/E', debt_to_equity: 'Debt/Eq', sales_growth_5y: 'Sales 5y',
  profit_growth_yoy: 'Profit YoY', dividend_yield: 'Yield', earnings_yield: 'Earn. yield', fii_change_qoq: 'FII Δ pts', dii_change_qoq: 'DII Δ pts', promoter_change_qoq: 'Promoter Δ',
  pledge_change_qoq: 'Pledge Δ', promoter_pct: 'Promoter', delivery_pct: 'Delivery', insider_buy_cr_30d: 'Insider buys', insider_sell_cr_30d: 'Insider sells', promoter_buy_cr_90d: 'Promoter buys',
  days_since_order_win: 'Order', days_since_results: 'Results', days_to_results: 'Results', bb_width_pct: 'Band width', range_pct: 'Range', up_streak: 'Streak', down_streak: 'Streak',
  bulk_buy_count_10d: 'Deals', rating_upgrades_180d: 'Upgrades', impact_max_7d: 'Impact', negative_events_30d: 'Bad news' };
const COLRANGE = { vol_ratio: [1.5, 5], rsi_14: [30, 72], adx_14: [25, 48], dist_hh52_pct: [-5, 0], ret_1: [1, 7], ret_5: [2, 12], ret_20: [4, 30], ret_60: [30, 80], roce: [18, 45], pe: [8, 30] };
export const colName = c => COLNAME[c] || c.replace(/_/g, ' ');
export const colFmt = (c, v) => (v == null || !Number.isFinite(+v) ? '—' : (COLFMT[c] || (z => (+z).toFixed(1)))(+v));
/** Sample matches, only for when the Lab is unreachable: [{ sym, name, price, chg, v, vf }] */
export function screenRows(sc) {
  const r = rng('scan:' + sc.id), n = sc.id.length % 3 === 0 ? 3 + Math.floor(r() * 6) : 6 + Math.floor(r() * 22);
  const pool = UNIVERSE.slice().sort(() => r() - .5).slice(0, n), [a, b] = COLRANGE[sc.col] || [0, 10], weak = sc.group === 'weak';
  return pool.map(x => { const v = a + r() * (b - a), chg = weak ? -(r() * 5) : sc.col === 'ret_1' ? v : (r() - .3) * 5; return { sym: x.s, name: x.n, sec: x.sec, price: rd(x.p * (1 + chg / 100)), chg: rd(chg), v, vf: colFmt(sc.col, v) }; }).sort((p, q) => Math.abs(q.v) - Math.abs(p.v));
}

/* ---------------------------------------------------------------- strategies */
const T = (id, name, about, query, exit, extra = {}) => ({ id, name, about, query, exit, tf: '1D', ...extra });
export const STRATEGIES = [
  T('qs-52wv', '52-week high on volume', 'Buy-side study of new one-year highs with real volume behind them.', 'close > high(52w)\nand rvol > 1.5', { stop: 7, target: 15, time: 30 }),
  T('qs-pb200', 'Pullback in an uptrend', 'Strong stocks that cooled off, studied from the dip.', 'close > sma(200)\nand rsi(14) between 38 and 48', { stop: 6, target: 12, time: 20 }),
  T('qs-golden', 'Golden cross', 'The classic long-term trend signal on daily charts.', 'sma(50) crosses above sma(200)', { stop: 8, target: 20, time: 60 }),
  T('qs-ema', 'EMA 9 / 21 in an uptrend', 'Short-term turn up while the long trend is up.', 'ema(9) crosses above ema(21)\nand close > sma(200)', { stop: 5, target: 10, time: 15 }),
  T('qs-vshock', 'Volume shock, up day', 'Unusual buying in one session: 3× volume, up 2%+.', 'rvol > 3\nand change(1) > 2', { stop: 6, target: 12, time: 20 }),
  T('qs-oversold', 'Oversold bounce', 'Sharp fall that closes green. Mean-reversion idea.', 'rsi(14) < 30\nand green', { stop: 5, target: 8, time: 10 }),
  T('qs-rs', 'RS leader breakouts', 'Market leaders breaking out of a quiet range.', 'rs_leader', { stop: 7, target: 18, time: 40 }),
  T('qs-vcp', 'Tightening base (VCP)', 'Shrinking swings that break upward.', 'apex_base', { stop: 6, target: 15, time: 30 }),
  T('qs-htf', 'High tight flag', 'Rare, fast pattern. Few trades, big swings.', 'high_tight_flag', { stop: 8, target: 25, time: 30 }),
  T('qs-macd', 'MACD cross above zero trend', 'Momentum turning up inside an uptrend.', 'macd crosses above signal\nand close > sma(200)', { stop: 5, target: 10, time: 20 }),
  T('qs-gap', 'Gap up and hold', 'Opens 2%+ higher on heavy volume and holds.', 'gap > 2\nand rvol > 2\nand green', { stop: 5, target: 10, time: 10 }),
  T('qs-weekly', 'Weekly trend start', 'Slow signal on the weekly chart: EMA 10 over 20.', 'ema(10) crosses above ema(20)', { stop: 10, target: 25, time: 26 }, { tf: '1W' }),
].map(s => {
  const r = rng(s.id), trades = Math.round(60 + r() * 900), win = rd(38 + r() * 28, 1), avg = rd((win - 45) / 6 + r() * .8, 2);
  return { ...s, trades, win, avg, maxdd: rd(-(8 + r() * 30), 1), hold: Math.round(s.exit.time * (.4 + r() * .4)), since: '2018', open: Math.round(2 + r() * 14), best: rd(18 + r() * 40, 1), worst: rd(-(s.exit.stop + r() * 3), 1), y: [2021, 2022, 2023, 2024, 2025, 2026].map(y => ({ y, win: rd(win + (r() - .5) * 18, 0), n: Math.round(trades / 7 * (.6 + r() * .8)) })) };
});
export function strategyDetail(s) {
  const r = rng(s.id + ':d');
  const active = UNIVERSE.slice().sort(() => r() - .5).slice(0, s.open).map(x => { const ret = rd((r() - .35) * 14); const d = new Date(); d.setDate(d.getDate() - Math.floor(r() * s.exit.time)); return { sym: x.s, name: x.n, date: d.toISOString().slice(0, 10), entry: rd(x.p / (1 + ret / 100)), now: x.p, ret }; });
  const past = Array.from({ length: 18 }, (_, i) => { const x = pick(r, UNIVERSE), win = r() * 100 < s.win, ret = win ? rd(1 + r() * s.exit.target) : rd(-(r() * s.exit.stop)); const d = new Date(); d.setDate(d.getDate() - 20 - i * 9 - Math.floor(r() * 6)); const entry = rd(x.p * (0.8 + r() * .3)); return { sym: x.s, date: d.toISOString().slice(0, 10), days: Math.max(1, Math.round(r() * s.exit.time)), entry, exit: rd(entry * (1 + ret / 100)), ret, why: ret >= s.exit.target - .5 ? 'Target' : ret <= -s.exit.stop + .5 ? 'Stop' : 'Time' }; });
  let v = 100000; const eq = []; const d0 = new Date(); d0.setFullYear(d0.getFullYear() - 6);
  for (let i = 0; i < 72; i++) { v *= 1 + (s.avg / 100) * 1.6 + (r() - .5) * .06; const d = new Date(d0); d.setMonth(d.getMonth() + i); eq.push({ d: d.toISOString().slice(0, 10), v: Math.round(v) }); }
  return { active, past, eq };
}

/* ---------------------------------------------------------------- news (sample headlines, not real events) */
const ago = h => { const d = new Date(Date.now() - h * 36e5); return d.toISOString(); };
export const NEWS = {
  india: [
    { t: 'Sample: IT services index leads the market as large deal wins are announced', src: 'Sample wire', at: ago(1), tag: 'Sector', syms: ['TCS', 'INFY', 'HCLTECH'] },
    { t: 'Sample: Private banks report steady loan growth in quarterly business update', src: 'Sample wire', at: ago(2), tag: 'Results', syms: ['HDFCBANK', 'ICICIBANK'] },
    { t: 'Sample: Auto makers post monthly sales numbers; SUV demand stays firm', src: 'Sample wire', at: ago(4), tag: 'Data', syms: ['MARUTI', 'M&M', 'TATAMOTORS'] },
    { t: 'Sample: Defence order book update lifts PSU defence names', src: 'Sample wire', at: ago(5), tag: 'Orders', syms: ['HAL', 'BEL'] },
    { t: 'Sample: Power demand hits a seasonal high, utilities in focus', src: 'Sample wire', at: ago(7), tag: 'Sector', syms: ['NTPC', 'POWERGRID', 'TATAPOWER'] },
    { t: 'Sample: Cement makers announce price changes across regions', src: 'Sample wire', at: ago(9), tag: 'Prices', syms: ['ULTRACEMCO'] },
    { t: 'Sample: Board meeting scheduled to consider quarterly results', src: 'Sample filing', at: ago(12), tag: 'Filing', syms: ['DIXON'] },
    { t: 'Sample: Metal stocks track global commodity prices', src: 'Sample wire', at: ago(15), tag: 'Commodities', syms: ['TATASTEEL', 'JSWSTEEL', 'VEDL'] },
  ],
  global: [
    { t: 'Sample: US markets close mixed ahead of central bank minutes', src: 'Sample global wire', at: ago(3), tag: 'US' },
    { t: 'Sample: Crude oil moves on supply outlook; Brent near recent range', src: 'Sample global wire', at: ago(4), tag: 'Oil' },
    { t: 'Sample: Asian markets open higher, led by technology shares', src: 'Sample global wire', at: ago(6), tag: 'Asia' },
    { t: 'Sample: Dollar index steady; emerging market currencies range-bound', src: 'Sample global wire', at: ago(8), tag: 'FX' },
    { t: 'Sample: European indices edge up after inflation data', src: 'Sample global wire', at: ago(10), tag: 'Europe' },
    { t: 'Sample: Gold holds near highs as bond yields ease', src: 'Sample global wire', at: ago(13), tag: 'Gold' },
    { t: 'Sample: Chip makers rally on demand outlook for data centres', src: 'Sample global wire', at: ago(16), tag: 'Tech' },
  ],
  deals: [
    ['CDSL', 'Sample Growth Fund', 'Buy', 1250000, 1648.5], ['ANGELONE', 'Sample Capital LLP', 'Sell', 420000, 2794.0], ['KPITTECH', 'Sample Global Fund', 'Buy', 880000, 1776.2],
    ['IRFC', 'Sample Securities', 'Sell', 9600000, 157.9], ['DIXON', 'Sample Mutual Fund', 'Buy', 61000, 15388.0], ['ZOMATO', 'Sample Foreign Fund', 'Buy', 15400000, 267.4],
    ['BEL', 'Sample Investments', 'Sell', 7200000, 304.6], ['POLYCAB', 'Sample Opportunities Fund', 'Buy', 150000, 7092.5], ['TATAPOWER', 'Sample Trading Co', 'Sell', 5100000, 447.2],
    ['HAL', 'Sample Pension Fund', 'Buy', 210000, 4641.0],
  ].map(([sym, who, side, qty, px], i) => ({ sym, who, side, qty, px, kind: i % 3 === 0 ? 'Block' : 'Bulk', date: new Date(Date.now() - (i > 5 ? 864e5 : 0)).toISOString().slice(0, 10) })),
};
