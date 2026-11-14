/* Portfolio review: where the risk sits, and how my own trading compares with the AI calls I followed.
   Pure HTML builder. rows = enriched holdings (pfdata.enrich), act = /owner/activity, term = terminal data,
   S = { SYMBOL: edge row } from /owner/edge/stocks. */
import { fmt, esc, n, tone, toDate } from '../core.js';
import { sec } from './parts.js';
import { srow, rsPill, warnChips, note, day } from './edgedata.js';

const DOWN = { down: 'Strong downtrend', 'down-weak': 'Downtrend' };

export function reviewView(rows, act, term, S) {
  const total = rows.reduce((a, x) => a + x.value, 0) || 1;
  const E = x => S[String(x.symbol).toUpperCase()] || {};
  const ai = rows.filter(x => x.call), non = rows.filter(x => !x.call);
  const atRisk = ai.reduce((a, x) => a + Math.max(0, x.qty * (x.ltp - x.call.stop)), 0);
  const aiVal = ai.reduce((a, x) => a + x.value, 0);
  const big = [...rows].sort((a, b) => b.value - a.value);
  const top5 = big.slice(0, 5).reduce((a, x) => a + x.value, 0);
  const sect = {};
  rows.forEach(x => { const k = E(x).sector || 'Funds and others'; sect[k] = (sect[k] || 0) + x.value; });
  const sectors = Object.entries(sect).sort((a, b) => b[1] - a[1]);
  const weak = non.filter(x => DOWN[E(x).trend]).sort((a, b) => b.value - a.value);
  const weakVal = weak.reduce((a, x) => a + x.value, 0);
  const flagged = rows.map(x => ({ x, w: (E(x).warnings || []).filter(w => w.level === 'bad') })).filter(o => o.w.length);
  const lowRs = rows.filter(x => n(E(x).rs) > 0 && E(x).rs < 25 && !DOWN[E(x).trend]).sort((a, b) => E(a).rs - E(b).rs);

  // journal: my entry against the call entry, and what happened after I sold
  const paid = ai.filter(x => isFinite(x.vsCall));
  const avgPaid = paid.length ? paid.reduce((a, x) => a + x.vsCall, 0) / paid.length : NaN;
  const late = paid.filter(x => x.vsCall > 2).sort((a, b) => b.vsCall - a.vsCall);
  const overdue = rows.filter(x => x.status === 'exit');
  const closed = term ? term.closed || [] : [];
  const sold = (act.moves || []).filter(m => m.kind === 'sold' || m.kind === 'reduced');
  const realised = sold.reduce((a, m) => a + (n(m.pnl) || 0), 0);
  const cmp = sold.map(m => { const c = closed.filter(c => String(c.sym).toUpperCase() === String(m.symbol).toUpperCase()).sort((a, b) => Math.abs(toDate(a.exitDate) - new Date(m.ts)) - Math.abs(toDate(b.exitDate) - new Date(m.ts)))[0];
    if (!c || Math.abs(toDate(c.exitDate) - new Date(m.ts)) > 20 * 864e5) return null;
    return { m, c, lag: Math.round((new Date(String(m.ts).slice(0, 10)) - toDate(c.exitDate)) / 864e5), diff: (n(m.price) / c.exit - 1) * 100 }; }).filter(Boolean);

  const stat = (k, v, d, cls = '') => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}">${v}</div><div class="d">${d}</div></div>`;
  const pct = v => fmt.x(v / total * 100, 0) + '%';
  return `
    <div class="stats four">
      ${stat('If every AI stop is hit', `<span class="dn">−${fmt.inr(atRisk).replace('₹', '₹')}</span>`, `${fmt.x(atRisk / total * 100, 1)}% of the portfolio · ${ai.length} AI positions`)}
      ${stat('Covered by an AI call', pct(aiVal), `${fmt.lakh(aiVal)} of ${fmt.lakh(total)}`)}
      ${stat('Top 5 holdings', pct(top5), `largest: ${esc(big[0]?.symbol || '—')} ${big[0] ? pct(big[0].value) : ''}`)}
      ${stat('Non-AI in a downtrend', `<span class="${weak.length ? 'dn' : ''}">${fmt.int(weak.length)}</span>`, weak.length ? `${fmt.lakh(weakVal)} with no stop on it` : 'none')}
    </div>
    ${note(`${non.length} of your ${rows.length} holdings have no AI call, so nothing is watching a stop on them. The lists below are the ones to look at first.`)}

    ${flagged.length ? sec('Red flags', `<div class="group">${flagged.map(o => srow(o.x.symbol, esc(o.w[0].text), `<div class="v tnum">${fmt.lakh(o.x.value)}</div>`, o.w.length > 1 ? `<div class="eg-sub">${warnChips(o.w.slice(1))}</div>` : '')).join('')}</div>`) : ''}

    ${weak.length ? sec('Non-AI holdings in a downtrend', `<div class="group">${weak.map(x => srow(x.symbol, `${DOWN[E(x).trend]} · ${fmt.sp(E(x).r63, 0)} in 3 months`, `<div class="v tnum">${fmt.lakh(x.value)}</div><div class="d ${tone(x.pnl_pct)}">${fmt.sp(x.pnl_pct)}</div>`, `<div class="eg-sub">${rsPill(E(x).rs)}</div>`)).join('')}</div>`,
    { p: 'Price is below its 50-day and 200-day averages and there is no AI plan for these. Each one needs your own decision: a stop, or a reason to keep it.' }) : ''}

    ${lowRs.length ? sec('Weak against the market', `<div class="group">${lowRs.slice(0, 10).map(x => srow(x.symbol, `Weaker than ${100 - E(x).rs}% of liquid stocks over the past year`, `<div class="v tnum">${fmt.lakh(x.value)}</div><div class="d ${tone(x.pnl_pct)}">${fmt.sp(x.pnl_pct)}</div>`, `<div class="eg-sub">${rsPill(E(x).rs)}</div>`)).join('')}</div>`) : ''}

    ${sec('Where the money sits', `<div class="panel pad">${sectors.map(([k, v]) => `<div class="eg-sec"><div class="eg-sh"><b>${esc(k)}</b><span class="small">${fmt.lakh(v)}</span><span class="tnum">${pct(v)}</span></div><div class="eg-bar"><i style="width:${Math.max(2, v / sectors[0][1] * 100)}%"></i></div></div>`).join('')}</div>`,
    { p: sectors[0] && sectors[0][1] / total > 0.35 ? `${esc(sectors[0][0])} is ${pct(sectors[0][1])} of the portfolio. One bad month for that sector hits most of your money.` : '' })}

    ${sec('You against the AI calls', `<div class="stats four">
        ${stat('Paid vs call entry', `<span class="${tone(-avgPaid)}">${isFinite(avgPaid) ? fmt.sp(avgPaid, 2) : '—'}</span>`, `average on ${paid.length} open AI positions`)}
        ${stat('Bought 2%+ above the call', fmt.int(late.length), late.length ? esc(late.slice(0, 3).map(x => x.symbol).join(', ')) : 'none')}
        ${stat('Held past an AI exit', `<span class="${overdue.length ? 'dn' : ''}">${fmt.int(overdue.length)}</span>`, overdue.length ? esc(overdue.slice(0, 3).map(x => x.symbol).join(', ')) : 'none')}
        ${stat('Booked on spotted sells', `<span class="${tone(realised)}">${fmt.sinr(realised)}</span>`, `${sold.length} sells seen at refresh`)}
      </div>
      ${cmp.length ? `<div class="group" style="margin-top:10px">${cmp.map(o => srow(o.m.symbol, `You sold ${o.lag === 0 ? 'the same day as' : o.lag > 0 ? `${o.lag} day${o.lag > 1 ? 's' : ''} after` : `${-o.lag} day${o.lag < -1 ? 's' : ''} before`} the AI exit (${day(o.c.exitDate)})`, `<div class="v tnum ${tone(o.diff)}">${fmt.sp(o.diff)}</div><div class="d faint">vs AI exit price</div>`)).join('')}</div>` : ''}`,
    { p: 'Paying more than the call entry moves your risk closer and your reward further away. The call\'s stop and target do not move with you.' })}`;
}
