/* Portfolio clean-up: what to do with holdings that have no AI call, and where the risk sits.
   Pure HTML builder. rows = enriched holdings (pfdata.enrich), act = /owner/activity, term = terminal data,
   S = { SYMBOL: edge row } from /owner/edge/stocks. */
import { fmt, esc, n, tone } from '../core.js';
import { sec } from './parts.js';
import { srow, note } from './edgedata.js';
import { cleanupGroup, suggestStop } from './pfdata.js';
import { orderSheet, stopSheet } from './trade.js';

const broker = x => Object.keys(x.parts || {}).find(k => k !== 'Manual');

export function reviewView(rows, act, term, S) {
  const total = rows.reduce((a, x) => a + x.value, 0) || 1;
  const E = x => S[String(x.symbol).toUpperCase()];
  const ai = rows.filter(x => x.call), non = rows.filter(x => x.status === 'none');
  const atRisk = ai.reduce((a, x) => a + Math.max(0, x.qty * (x.ltp - x.call.stop)), 0);
  const aiVal = ai.reduce((a, x) => a + x.value, 0);
  const big = [...rows].sort((a, b) => b.value - a.value);
  const top5 = big.slice(0, 5).reduce((a, x) => a + x.value, 0);
  const sect = {};
  rows.forEach(x => { const k = (E(x) || {}).sector || 'Funds and others'; sect[k] = (sect[k] || 0) + x.value; });
  const sectors = Object.entries(sect).sort((a, b) => b[1] - a[1]);

  const G = { sell: [], stop: [], keep: [], fund: [] };
  non.forEach(x => { const c = cleanupGroup(x, E(x)); G[c.g].push({ x, why: c.why }); });
  Object.values(G).forEach(l => l.sort((a, b) => b.x.value - a.x.value));
  const val = l => l.reduce((a, o) => a + o.x.value, 0);

  const stat = (k, v, d) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  const pct = v => fmt.x(v / total * 100, 0) + '%';
  const right = x => `<div class="v tnum">${fmt.lakh(x.value)}</div><div class="d ${tone(x.pnl_pct)}">${fmt.sp(x.pnl_pct)}</div>`;
  const line = (o, btn) => `<div class="row td-act"><a href="/rahul/stock/${encodeURIComponent(o.x.symbol)}" data-nav class="main"><div class="t">${esc(o.x.symbol)} <span class="small ${tone(o.x.pnl_pct)}">${fmt.sp(o.x.pnl_pct)}</span> <span class="small">${fmt.lakh(o.x.value)}</span></div><div class="s">${esc(o.why)}</div></a>${btn}</div>`;
  const sellBtn = o => (broker(o.x) ? `<button class="btn sm sell" data-rv-sell="${esc(o.x.symbol)}">Sell</button>` : '');
  const stopBtn = o => (broker(o.x) ? `<button class="btn sm quiet" data-rv-stop="${esc(o.x.symbol)}">Set stop</button>` : '');

  return `
    <div class="stats">
      ${stat('If every AI stop is hit', `<span class="dn">−${fmt.inr(atRisk)}</span>`, `${fmt.x(atRisk / total * 100, 1)}% of the portfolio · ${ai.length} AI positions`)}
      ${stat('Covered by an AI call', pct(aiVal), `${fmt.lakh(aiVal)} of ${fmt.lakh(total)}`)}
      ${stat('Top 5 holdings', pct(top5), `largest: ${esc(big[0]?.symbol || '—')} ${big[0] ? pct(big[0].value) : ''}`)}
    </div>
    ${note(`${non.length} of your ${rows.length} holdings have no AI call, so nothing is watching a stop on them. These groups are a starting point for your own decision, not a tested rule.${G.sell.length ? ` Selling everything under "Sell first" frees about <b>${fmt.lakh(val(G.sell))}</b> for new AI calls.` : ''}`)}

    ${sec(`Sell first <span class="td-n dn">${G.sell.length}</span>`, G.sell.length ? `<div class="group">${G.sell.map(o => line(o, sellBtn(o))).join('')}</div>` : '<div class="panel pad small">Nothing here. No holding is both in a downtrend and flagged or down 25%.</div>',
      { p: G.sell.length ? `${fmt.lakh(val(G.sell))} in ${G.sell.length} holdings.` : '' })}

    ${sec(`Set a stop <span class="td-n">${G.stop.length}</span>`, G.stop.length ? `<div class="group">${G.stop.map(o => line(o, stopBtn(o))).join('')}</div>` : '<div class="panel pad small">Nothing here.</div>',
      { p: G.stop.length ? 'The suggested stop is 8% below the price. Change it to a level you trust.' : '' })}

    ${G.keep.length ? `<details class="rv-fold"><summary>Keep <span class="td-n">${G.keep.length}</span> <span class="small">${fmt.lakh(val(G.keep))}</span></summary><div class="group">${G.keep.map(o => srow(o.x.symbol, esc(o.why), right(o.x))).join('')}</div></details>` : ''}
    ${G.fund.length ? `<details class="rv-fold"><summary>Funds and ETFs <span class="td-n">${G.fund.length}</span> <span class="small">${fmt.lakh(val(G.fund))}</span></summary><div class="group">${G.fund.map(o => srow(o.x.symbol, esc(o.why), right(o.x))).join('')}</div></details>` : ''}

    ${sec('Where the money sits', `<div class="panel pad">${sectors.map(([k, v]) => `<div class="eg-sec"><div class="eg-sh"><b>${esc(k)}</b><span class="small">${fmt.lakh(v)}</span><span class="tnum">${pct(v)}</span></div><div class="eg-bar"><i style="width:${Math.max(2, v / sectors[0][1] * 100)}%"></i></div></div>`).join('')}</div>`,
      { p: sectors[0] && sectors[0][1] / total > 0.35 ? `${esc(sectors[0][0])} is ${pct(sectors[0][1])} of the portfolio. One bad month for that sector hits most of your money.` : '' })}`;
}

/** Wire the Sell and Set stop buttons of reviewView. */
export function bindReview(root, rows, onDone) {
  const find = s => rows.find(y => y.symbol === s);
  root.querySelectorAll('[data-rv-sell]').forEach(b => b.onclick = () => { const x = find(b.dataset.rvSell);
    orderSheet({ sym: x.symbol, side: 'SELL', broker: broker(x), call: null, onDone }); });
  root.querySelectorAll('[data-rv-stop]').forEach(b => b.onclick = () => { const x = find(b.dataset.rvStop), br = broker(x);
    stopSheet({ sym: x.symbol, broker: br, qty: x.parts[br].qty, stop: suggestStop(x.ltp), ltp: x.ltp }); });
}
