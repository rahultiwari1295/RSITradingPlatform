import { reveal, chrome, fill, fmt, icon, link, loadTerminal, allSignals, segmented, tone, toDate, tradeStats, yearTrades } from '../core.js';
import { settle } from '../charts.js';
import { closedRow, footNote, signalList, isFreshSignal } from './parts.js';

export default async function calls(el, r) {
  const body = chrome(el, { title: 'AI Calls', page: 'AI Calls', top: { ey: `${icon('ai', 16)}AI Buy &amp; Sell Calls`, h: 'Know when to buy, | and when to sell.', hl: ['buy', 'sell'], lede: 'Two AI engines scan every NSE stock after the close. Each call comes with a buy price, a stop loss and a target, so you always know your risk.' } });
  body.innerHTML = `<div id="c-sum"></div><div id="c-seg" style="margin-top:16px"></div><div id="c-list" style="margin-top:6px"></div>${footNote('Calls are generated after the market closes and checked again before the open.')}`;
  const sum = body.querySelector('#c-sum'), list = body.querySelector('#c-list');
  let tab = r.query.get('v') === 'closed' ? 'closed' : 'signals';

  fill(sum, () => loadTerminal(), t => {
    const sigs = allSignals(t), y = yearTrades(t.closed), st = tradeStats(y.list);
    sum.innerHTML = st.n ? link('record', `<div class="yr-h"><span class="yr-y">${y.label}</span><span class="yr-t"><span><b>${fmt.int(st.n)}</b> calls</span><i></i><span><b class="up">${fmt.int(st.wins)}</b> win</span><i></i><span><b class="dn">${fmt.int(st.losses)}</b> loss</span></span>${icon('chev', 16, 'chev')}</div>
      <div class="yr-bar"><i style="width:${st.winRate}%"></i></div>
      <div class="yr-s"><div><span>Win rate</span><b>${fmt.pct(st.winRate, 0)}</b></div><div><span>Avg win</span><b class="up">${fmt.sp(st.avgWin)}</b></div><div><span>Avg loss</span><b class="dn">${fmt.sp(st.avgLoss)}</b></div></div>`, 'yr', 'aria-label="Backtest report"') : '';
    segmented(body.querySelector('#c-seg'), [['signals', 'Active trades', sigs.length], ['closed', 'Past trades', t.closed.length]], tab, v => { tab = v; draw(t); history.replaceState(history.state, '', location.pathname + '?v=' + v); });
    draw(t);
  }, '<div class="sk" style="height:104px;border-radius:18px"></div>');

  function draw(t) {
    if (tab === 'closed') { closed(t); reveal(list); return; }
    list.innerHTML = `<p class="tab-note"><b>Active trades</b> are calls that are still open. Buy only the fresh ones; the older ones have already moved.</p>${signalList(allSignals(t))}`;
    settle(list); reveal(list);
  }

  function closed(t) {
    let filt = 'all', shown = 40;
    const render = () => {
      const pick = t.closed.filter(c => filt === 'all' || (filt === 'win' && c.win) || (filt === 'loss' && !c.win) || (filt === 'live' && String(c.origin).toUpperCase() === 'LIVE'));
      const months = new Map();
      pick.slice(0, shown).forEach(c => { const k = (c.exitDate || '').slice(0, 7); if (!months.has(k)) months.set(k, []); months.get(k).push(c); });
      const wins = pick.filter(c => c.win).length, avg = pick.length ? pick.reduce((a, c) => a + c.roi, 0) / pick.length : NaN;
      list.innerHTML = `<p class="tab-note"><b>Past trades</b> are calls that have closed, at the target, the stop or the time limit, with the result of each.</p><div class="hs" style="margin-top:10px" role="group" aria-label="Filter closed trades">${[['all', 'All', t.closed.length], ['win', 'Wins', t.closed.filter(c => c.win).length], ['loss', 'Losses', t.closed.filter(c => !c.win).length], ['live', 'Live only', t.closed.filter(c => String(c.origin).toUpperCase() === 'LIVE').length]].map(([k, l, c]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filt}">${l} <span class="n">${c}</span></button>`).join('')}</div>
        <p class="small" style="margin:8px 2px 12px">${pick.length ? `${fmt.int(pick.length)} trades, ${fmt.pct(wins / pick.length * 100, 0)} won, <b class="${tone(avg)}">${fmt.sp(avg)}</b> average result.` : 'No trades match this filter.'}</p>
        ${[...months].map(([m, l]) => `<div class="month">${m ? toDate(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Earlier'}</div><div class="group">${l.map(closedRow).join('')}</div>`).join('')}
        ${pick.length > shown ? `<button class="btn quiet block" data-more style="margin-top:14px">Show more</button>` : ''}`;
      list.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; shown = 40; render(); });
      const m = list.querySelector('[data-more]'); if (m) m.onclick = () => { shown += 60; render(); };
    };
    render();
  }
}
