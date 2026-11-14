/* /rahul/edge — the research lists that paid services charge for, built from data the server already collects:
   market gauge, results reaction, promoter / institution moves, proven bulk-deal buyers, sector strength,
   delivery-based accumulation, and each engine's live track record. Every list says how far it has been tested. */
import { chrome, fmt, esc, icon, n, link, tone, isOwner, auth, skel, errBox, empty } from '../core.js';
import { sec, footNote } from './parts.js';
import { edgeBlob, GAUGE, gaugeFacts, evidenceLine, rsPill, srow, cr, day, note } from './edgedata.js';
import { titleCase } from './today.js';

const VIEWS = [['market', 'Market'], ['results', 'Results'], ['owners', 'Owners'], ['smart', 'Smart money'], ['sectors', 'Sectors'], ['delivery', 'Delivery'], ['score', 'Scorecard']];
const UNTESTED = 'Not yet lab-tested on your data. Use it to find stocks to look at, not as a buy signal.';

export default async function edge(el, r) {
  const body = chrome(el, { title: 'Edge', page: 'Edge', top: { ey: `${icon('bolt', 16)}Research edge`, h: 'What the big money | is doing.', hl: ['big money'], lede: 'Results, owners, proven buyers, sector strength and the engines\' real record.' } });
  await auth.whenReady();
  if (!isOwner()) { body.innerHTML = errBox('Sign in as the owner to see this page.', false); return; }
  let view = VIEWS.some(v => v[0] === r.query.get('v')) ? r.query.get('v') : 'market';
  body.innerHTML = `<div class="hs eg-tabs" role="group" aria-label="Edge lists">${VIEWS.map(([k, l]) => `<button class="chip" data-v="${k}" aria-pressed="${k === view}">${l}</button>`).join('')}</div><div id="eg"></div>
    ${link('patterns', `${icon('pattern', 20)}<div class="main"><div class="t">Chart patterns</div><div class="s">Breakouts and bases found by the scanner</div></div>${icon('chev', 18, 'chev')}`, 'row group eg-link')}${footNote('Private page. Built each evening from exchange filings and prices.')}`;
  const root = body.querySelector('#eg');
  body.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; body.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', x === b)); history.replaceState(history.state, '', location.pathname + '?v=' + view); show(); });
  show();

  async function show() {
    root.innerHTML = skel(84, 5, 16);
    const key = { market: 'regime', results: 'earnings', owners: 'owners', smart: 'smart', sectors: 'sectors', delivery: 'accum', score: 'scorecard' }[view], v = view;
    try { const d = await edgeBlob(key); if (v !== view) return; root.innerHTML = DRAW[v](d) || empty('chart', 'Nothing here yet', 'This list is built each evening.'); if (v === 'market') chart(d); }
    catch (e) { root.innerHTML = errBox(e.message); root.querySelector('[data-retry]')?.addEventListener('click', show); }
  }

  function chart(R) {
    const box = root.querySelector('#eg-b'); if (!box || !(R.series || []).length) return;
    const S = R.series.slice(-180), W = 640, H = 150, x = i => (i / (S.length - 1)) * W, y = v => H - (v / 100) * H;
    const col = { full: 'var(--up-solid)', half: 'var(--ai-solid)', none: 'var(--dn-solid)' };
    const bands = S.map((s, i) => `<rect x="${x(i) - W / S.length / 2}" y="${H + 4}" width="${W / S.length + .6}" height="6" fill="${col[s.g]}"/>`).join('');
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H + 12}" preserveAspectRatio="none" role="img" aria-label="Share of stocks above their 50-day average, last ${S.length} sessions">
      <line x1="0" x2="${W}" y1="${y(55)}" y2="${y(55)}" stroke="var(--up-solid)" stroke-dasharray="3 4" opacity=".5"/><line x1="0" x2="${W}" y1="${y(30)}" y2="${y(30)}" stroke="var(--dn-solid)" stroke-dasharray="3 4" opacity=".5"/>
      <path d="${S.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(n(s.b50) || 0).toFixed(1)}`).join('')}" fill="none" stroke="var(--brand)" stroke-width="2" vector-effect="non-scaling-stroke"/>${bands}</svg>
      <div class="eg-ax"><span>${day(S[0].d)}</span><span>55% and 30% lines · strip below shows the reading each day</span><span>${day(S[S.length - 1].d)}</span></div>`;
  }
}

const DRAW = {
  market(R) {
    const G = GAUGE[R.gauge]; if (!G) return '';
    const e = R.evidence || {};
    return `<div class="td-gauge ${G.cls}"><div class="td-gh"><span class="k">Market gauge · ${day(R.as_of)}</span><b>${G.t}</b></div><p>${G.line}</p><p class="small">${gaugeFacts(R)}</p></div>
      ${sec('Stocks above their 50-day average', `<div class="panel pad"><div id="eg-b" class="eg-chart"></div></div>`, { p: `Counted across ${fmt.int(R.universe)} liquid stocks. Above 55% with the index rising reads Full size. Below 30% reads No new buys.` })}
      <div class="stats" style="margin-top:14px">
        <div class="stat"><div class="k">Above 200-day avg</div><div class="v">${fmt.x(R.b200, 0)}%</div><div class="d">long-term health</div></div>
        <div class="stat"><div class="k">New highs / lows</div><div class="v"><span class="up">${fmt.int(R.highs)}</span> / <span class="dn">${fmt.int(R.lows)}</span></div><div class="d">52-week, today</div></div>
        <div class="stat"><div class="k">NIFTY 500, 1 month</div><div class="v ${tone(R.index.r21)}">${fmt.sp(R.index.r21)}</div><div class="d">${fmt.sp(R.index.r5)} this week</div></div>
      </div>
      ${sec('Did the gauge matter for past AI calls?', `<div class="stats">${['full', 'half', 'none'].map(k => `<div class="stat"><div class="k">${GAUGE[k].t}</div><div class="v ${tone(e[k]?.avg)}">${e[k] ? fmt.sp(e[k].avg) : '—'}</div><div class="d">${e[k] ? `${e[k].n} calls · ${fmt.x(e[k].win, 0)}% won` : 'no calls'}</div></div>`).join('')}</div>`,
    { p: 'Average result per closed V2 and V3 call, after costs, grouped by the reading on the day before entry. The rule was set first and then checked; it was not tuned to fit.' })}
      ${sec('Who is buying', `<div class="group">${(R.flows || []).slice(0, 8).map(f => `<div class="row plain"><div class="main"><div class="t">${f.who === 'FII' ? 'Foreign investors' : 'Indian funds'}</div><div class="s">${day(f.day)}</div></div><div class="end"><div class="v tnum ${tone(f.net_cr)}">${n(f.net_cr) >= 0 ? '+' : '−'}${cr(Math.abs(f.net_cr))}</div></div></div>`).join('')}</div>`)}`;
  },
  results(E) {
    const row = x => srow(x.symbol, `Sales ${fmt.sp(x.sales_yoy, 0)} · profit ${x.turnaround ? 'turned positive' : n(x.profit_yoy) || x.profit_yoy === 0 ? fmt.sp(x.profit_yoy, 0) : 'loss'} · margin ${fmt.sp(x.opm_chg, 1)} pts`,
      `<div class="v tnum">${fmt.int(x.score)}</div><div class="d faint">${day(x.result_date)}</div>`,
      `<div class="eg-sub"><span class="${tone(x.react)}">${fmt.sp(x.react)} on the result</span><span>${fmt.x(x.vol_x, 1)}× volume</span><span class="${tone(x.since)}">${fmt.sp(x.since)} since</span>${rsPill(x.rs)}</div>`);
    return `${note(`<b>${fmt.int(E.reported)}</b> liquid companies have reported ${esc(E.quarter)} results. The score (0 to 100) mixes sales growth, profit growth, margin change and how the price reacted. ${UNTESTED}`)}
      ${sec('Strong results the market liked', `<div class="group">${(E.strong || []).map(row).join('')}</div>`, { p: 'Growth was strong and the price rose on heavy volume. Stocks like this often keep drifting up for weeks.' })}
      ${sec('Weak results', `<div class="group">${(E.weak || []).map(row).join('')}</div>`, { p: 'Worth checking if you hold any of these.' })}`;
  },
  owners(O) {
    const own = (x, k, l) => `${l} ${fmt.x(x[k], 1)}% (<span class="${tone(x[k + '_chg'])}">${fmt.sp(x[k + '_chg'], 2)}</span>)`;
    const grp = (list, sub, end) => `<div class="group">${list.slice(0, 20).map(x => srow(x.symbol, sub(x), end(x), `<div class="eg-sub">${rsPill(x.rs)}<span class="${tone(x.r21)}">${fmt.sp(x.r21)} in a month</span></div>`)).join('')}</div>`;
    const big = v => `<div class="v tnum ${tone(v)}">${fmt.sp(v, 2)}</div><div class="d faint">points</div>`;
    return `${note(`Changes are for the latest reported quarter against the one before. ${UNTESTED}`)}
      ${(O.promoter_up || []).length ? sec('Promoters raised their stake', grp(O.promoter_up, x => own(x, 'promoter', 'Promoters'), x => big(x.promoter_chg)), { p: 'Owners buying more of their own company is one of the few signals with long-run evidence behind it.' }) : ''}
      ${(O.inst_up || []).length ? sec('Foreign and Indian funds both bought', grp(O.inst_up, x => `${own(x, 'fii', 'Foreign')} · ${own(x, 'dii', 'Indian')}`, x => big(n(x.fii_chg) + n(x.dii_chg)))) : ''}
      ${(O.promoter_down || []).length ? sec('Promoters cut their stake', grp(O.promoter_down, x => own(x, 'promoter', 'Promoters'), x => big(x.promoter_chg)), { p: 'A warning if you hold the stock. Check the reason before acting.' }) : ''}
      ${(O.pledge_high || []).length ? sec('High promoter pledge', grp(O.pledge_high, x => `${fmt.x(x.pledge, 0)}% of promoter shares are pledged for loans`, x => `<div class="v tnum dn">${fmt.x(x.pledge, 0)}%</div><div class="d faint">pledged</div>`), { p: 'If the price falls, lenders can sell pledged shares and push it lower.' }) : ''}
      ${(O.disclosures || []).length ? sec('Large holders buying and selling', `<div class="group">${O.disclosures.slice(0, 25).map(x => srow(x.symbol, `${esc(titleCase(x.who))} ${x.side === 'buy' ? 'bought' : 'sold'}${n(x.pct_after) ? `, now holds ${fmt.x(x.pct_after, 2)}%` : ''}`, `<div class="v ${x.side === 'buy' ? 'up' : 'dn'}">${x.side === 'buy' ? 'Buy' : 'Sell'}</div><div class="d faint">${day(x.d)}</div>`)).join('')}</div>`, { p: 'From takeover-rule disclosures in the last 45 days.' }) : ''}`;
  },
  smart(S) {
    const p = x => `<div class="row plain"><div class="main"><div class="t">${esc(titleCase(x.party))}</div><div class="s">${fmt.int(x.scored)} buys scored · ${fmt.x(x.win, 0)}% beat the market · last ${day(x.last)}</div></div><div class="end"><div class="v tnum ${tone(x.avg60)}">${fmt.sp(x.avg60)}</div><div class="d faint">avg, 60 days</div></div></div>`;
    return `${note(`Every bulk and block deal on NSE since ${day(S.from)} ${String(S.from).slice(0, 4)}: <b>${fmt.int(S.deals)}</b> deals. A buy is scored by how the stock did against NIFTY 500 over the next 60 sessions, entering the day <b>after</b> the deal became public. Same-day buy-and-sell churn is ignored.`)}
      <div class="stats two"><div class="stat"><div class="k">All bulk buys, on average</div><div class="v ${tone(S.all_avg60)}">${fmt.sp(S.all_avg60)}</div><div class="d">vs the market over 60 days · ${fmt.int(S.buys_scored)} buys</div></div>
        <div class="stat"><div class="k">Buyers worth following</div><div class="v">${fmt.int(S.followable)}</div><div class="d">8+ buys, over half beat the market</div></div></div>
      ${note('Following every bulk buy is not an edge. The value is in the few buyers with a record. A past record can also be luck: the list is in-sample and has not been blind-tested yet.')}
      ${(S.now || []).length ? sec('Their buys in the last month', `<div class="group">${S.now.map(x => srow(x.symbol, `${esc(titleCase(x.party))} bought ${cr(x.cr)}`, `<div class="v tnum ${tone(x.since)}">${fmt.sp(x.since)}</div><div class="d faint">since ${day(x.d)}</div>`, `<div class="eg-sub"><span>record ${fmt.sp(x.skill)} · ${fmt.x(x.win, 0)}% wins of ${x.scored}</span>${rsPill(x.rs)}</div>`)).join('')}</div>`) : ''}
      ${sec('Buyers with the best record', `<div class="group">${(S.top || []).slice(0, 25).map(p).join('')}</div>`)}
      ${(S.bottom || []).length ? sec('Buyers with the worst record', `<div class="group">${S.bottom.slice(0, 10).map(p).join('')}</div>`, { p: 'Their buying has been a bad sign so far.' }) : ''}`;
  },
  sectors(S) {
    const bar = v => `<div class="eg-bar"><i style="width:${Math.max(3, Math.min(100, n(v) || 0))}%"></i></div>`;
    const g = x => `<div class="eg-sec"><div class="eg-sh"><b>${esc(x.name)}</b><span class="small">${fmt.int(x.n)} stocks · ${fmt.x(x.above50, 0)}% above 50-day avg</span><span class="tnum ${tone(x.r21)}">${fmt.sp(x.r21)}</span></div>${bar(x.rs)}
      <div class="eg-top">${x.top.slice(0, 5).map(t => link(`stock/${encodeURIComponent(t.symbol)}`, `${esc(t.symbol)} <i>${fmt.int(t.rs)}</i>`, 'chip sm')).join('')}</div></div>`;
    return `${note('Strength rank (RS) runs from 1 to 99. It compares each stock\'s 3, 6, 9 and 12-month returns with every other liquid stock; 99 is the strongest. The bar is the average rank of the group and the percent is the median 1-month move.')}
      ${sec('Sectors, strongest first', `<div class="panel pad">${(S.sectors || []).map(g).join('')}</div>`)}
      ${sec('Strongest industries', `<div class="panel pad">${(S.industries_top || []).map(g).join('')}</div>`)}
      ${sec('Weakest industries', `<div class="panel pad">${(S.industries_bottom || []).map(g).join('')}</div>`)}
      ${sec('Market leaders', `<div class="group">${(S.leaders || []).slice(0, 30).map(x => srow(x.symbol, `${esc(x.sector || '')} · ${fmt.sp(x.r63, 0)} in 3 months`, `<div class="v tnum">${fmt.int(x.rs)}</div><div class="d ${tone(x.r21)}">${fmt.sp(x.r21)}</div>`)).join('')}</div>`, { p: 'The 30 strongest liquid stocks by rank.' })}`;
  },
  delivery(A) {
    return `${note(`Shares that were actually taken home (delivery), last 5 days against the 30 days before. A jump in delivery while the price stays quiet can mean someone is collecting the stock. ${UNTESTED}`)}
      ${(A.list || []).length ? `<div class="group">${A.list.map(x => srow(x.symbol, `Delivery ${fmt.x(x.deliv5, 0)}% of volume, was ${fmt.x(x.deliv30, 0)}%`, `<div class="v tnum">${fmt.x(x.qty_x, 1)}×</div><div class="d faint">shares delivered</div>`, `<div class="eg-sub"><span class="${tone(x.r10)}">${fmt.sp(x.r10)} in 10 days</span>${rsPill(x.rs)}</div>`)).join('')}</div>` : empty('chart', 'No clear accumulation today', 'No liquid stock passes the test right now.')}`;
  },
  score(S) {
    const NAME = { v2: 'V2', v3: 'V3' }, E = S.engines || {};
    const cell = (k, s) => `<div class="stat"><div class="k">${k}</div><div class="v ${tone(s?.avg)}">${s && s.n ? fmt.sp(s.avg, 2) : '—'}</div><div class="d">${s && s.n ? `${s.n} calls · ${fmt.x(s.win, 0)}% won` : 'no closed calls'}</div></div>`;
    const eng = k => { const e = E[k]; if (!e || !e.all) return ''; const mx = Math.max(1, ...e.months.map(m => Math.abs(n(m.total) || 0)));
      return sec(`${NAME[k] || k.toUpperCase()} engine`, `<div class="stats">${cell('All time', e.all)}${cell('Last 90 days', e.d90)}${cell('Last 30 days', e.d30)}</div>
        <div class="panel pad" style="margin-top:10px"><div class="small" style="margin-bottom:8px">Sum of call results by month (percent)</div><div class="eg-months">${e.months.map(m => `<div title="${m.m}: ${fmt.sp(m.total)} from ${m.n} calls"><i class="${tone(m.total)}" style="height:${Math.max(3, Math.abs(n(m.total)) / mx * 56)}px"></i><span>${m.m.slice(5)}</span></div>`).join('')}</div>
          <p class="small" style="margin:10px 0 0">Average win <b class="up">${fmt.sp(e.all.avg_win)}</b>, average loss <b class="dn">${fmt.sp(e.all.avg_loss)}</b>, held about ${fmt.int(e.all.hold)} days. ${e.open ? `Open now: <b>${e.open.n}</b> calls, averaging <b class="${tone(e.open.avg)}">${fmt.sp(e.open.avg)}</b>.` : ''}</p></div>
        <div class="group" style="margin-top:10px">${e.recent.map(x => srow(x.symbol, `${esc(String(x.why || '').replace(/_/g, ' ').toLowerCase())}`, `<div class="v tnum ${tone(x.pct)}">${fmt.sp(x.pct)}</div><div class="d faint">${day(x.exit)}</div>`)).join('')}</div>`, { p: `Closed calls from ${day(e.first)} ${String(e.first).slice(0, 4)} to ${day(e.last)}.` }); };
    const P = S.paper || {}, v10 = P.v10, vx = P.v2exit;
    return `${note(`Every closed call, counted the same way: exit price against entry price, minus ${S.cost_pct}% for costs. This is the live record on the server, not a backtest.`)}
      ${eng('v2')}${eng('v3')}
      ${v10 || vx ? sec('Paper tests', `<div class="group">${v10 ? `<div class="row plain"><div class="main"><div class="t">V10 momentum rotation</div><div class="s" style="white-space:normal">${esc(paperLine(v10))}</div></div></div>` : ''}${vx ? `<div class="row plain"><div class="main"><div class="t">AI exit for V2</div><div class="s" style="white-space:normal">${esc(`${vx.paper_exits_so_far ?? 0} paper exits so far, ${vx.compared ?? 0} compared${vx.compared ? `: paper ${fmt.sp(vx.avg_paper_pct)} vs live ${fmt.sp(vx.avg_live_pct)}` : ''}. Data to ${vx.data_to || ''}.`)}</div></div></div>` : ''}</div>`, { p: 'Paper only. No orders and no Telegram messages.' }) : ''}`;
  },
};
function paperLine(v) {
  const bits = [];
  for (const [k, l] of [['since', 'Since'], ['start', 'Started'], ['data_to', 'Data to'], ['asof', 'As of']]) if (v[k]) bits.push(`${l} ${v[k]}`);
  for (const [k, l] of [['total_return_pct', 'return'], ['return_pct', 'return'], ['nav', 'value'], ['holdings', 'holdings'], ['n_holdings', 'holdings']]) if (v[k] != null && typeof v[k] !== 'object') bits.push(`${l} ${v[k]}`);
  return bits.join(' · ') || 'Running. No summary numbers yet.';
}
