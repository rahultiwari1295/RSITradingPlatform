import { reveal, chrome, fill, fmt, esc, icon, link, loadTerminal, allSignals, segmented, tone, toDate, tradeStats, yearTrades, auth, isOwner, ownedSymbols, skel, ownerApi } from '../core.js';
import { settle } from '../charts.js';
import { closedRow, footNote, signalList, sec, entryZone } from './parts.js';
import { loadBook, STATUS } from './pfdata.js';
import { orderSheet, basketSheet } from './trade.js';
import { edgeHome, GAUGE, srow, day } from './edgedata.js';

export default async function calls(el, r) {
  const body = chrome(el, { title: 'Calls', page: 'Calls', compact: true });
  body.innerHTML = `<div id="c-own"></div><div id="c-sum"></div><div id="c-seg" style="margin-top:16px"></div><div id="c-list" style="margin-top:6px"></div>${footNote('Calls are generated after the market closes and checked again before the open.')}`;
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

  /* Owner sections: market gauge, what to sell, what needs attention, cash. Information only; none of it hides a call. */
  const own = async () => {
    const box = body.querySelector('#c-own');
    box.innerHTML = skel(44, 1, 14);
    const book = await loadBook(true);
    const rows = book.rows, syms = rows.map(x => String(x.symbol).toUpperCase());
    let E = { regime: {}, stocks: {} };
    try { E = await edgeHome(syms); } catch { /* the Edge build may not have run yet */ }
    const R = E.regime || {}, G = GAUGE[R.gauge] || null, S = E.stocks || {};
    const act = rows.filter(x => ['exit', 'stop', 'target'].includes(x.status)).sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank);
    const why = x => (x.status === 'exit' ? `AI exited on ${fmt.date(x.exitCall.exitDate)} at ${fmt.px(x.exitCall.exit)}` : x.status === 'stop' ? `Price ${fmt.px(x.ltp)} is at the stop ${fmt.px(x.call.stop)}` : `Price ${fmt.px(x.ltp)} reached the target ${fmt.px(x.call.target)}`);
    const cut = Date.now() - 7 * 864e5;
    const warns = rows.flatMap(x => ((S[String(x.symbol).toUpperCase()] || {}).warnings || []).map(w => ({ ...w, sym: x.symbol })));
    const att = warns.filter(w => (w.level === 'bad' && w.d && new Date(w.d).getTime() >= cut) || (w.kind === 'results' && w.d && new Date(w.d).getTime() - Date.now() <= 3 * 864e5 && new Date(w.d).getTime() >= Date.now() - 864e5));
    const W = await ownerApi('/owner/weekly').catch(() => ({}));
    const ist = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000), dow = ist.getDay(), hr = ist.getHours();
    const weekOn = dow === 0 || (dow === 6 && hr >= 18) || (dow === 1 && hr < 9);
    box.innerHTML = `${weekOn && W.text ? `<section class="panel pad wk"><b>Your week</b><div class="small" style="white-space:pre-line;margin-top:6px;color:var(--ink)">${esc(W.text)}</div></section>` : ''}${G ? link('edge?v=market', `<span class="cg-dot ${G.cls}"></span><span class="cg-t">Market: <b>${G.t}</b> <i>·</i> ${fmt.x(R.b50, 0)}% of stocks above their 50-day average</span>${icon('chev', 16, 'chev')}`, 'cg-line') : ''}
      ${sec('Sell', act.length ? `<div class="group">${act.map(x => `<div class="row td-act"><a href="${esc('/rahul/stock/' + encodeURIComponent(x.symbol))}" data-nav class="main"><div class="t">${esc(x.symbol)} <span class="pill ${STATUS[x.status].cls}">${STATUS[x.status].t}</span></div><div class="s">${why(x)} · you hold ${fmt.x(x.qty, 0)} (${fmt.inr(x.value)})</div></a>
          ${Object.keys(x.parts || {}).some(k => k !== 'Manual') ? `<button class="btn sm ${x.status === 'target' ? 'quiet' : 'sell'}" data-sell="${esc(x.symbol)}">Sell</button>` : ''}</div>`).join('')}</div>` : '<div class="panel pad small">Nothing to sell. No AI exit, stop or target on the stocks you hold.</div>')}
      ${att.length ? sec('Needs attention', `<div class="group">${att.slice(0, 8).map(w => srow(w.sym, esc(w.text), `<div class="d faint">${day(w.d)}</div>`)).join('')}</div>`) : ''}
      <div id="c-cash" class="small" style="margin:6px 2px 14px"></div>`;
    box.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const x = rows.find(y => y.symbol === b.dataset.sell); orderSheet({ sym: x.symbol, side: 'SELL', call: x.call, broker: Object.keys(x.parts || {}).find(k => k !== 'Manual'), onDone: okd => okd && own() }); });
    ownerApi('/owner/funds').then(f => {
      const parts = Object.entries(f.funds || {}).map(([k, b]) => `${k} ${b.status === 'ok' ? fmt.inr(b.cash) : b.status === 'closed' ? 'market closed' : b.status === 'login_needed' ? 'not connected' : '—'}`);
      const el2 = box.querySelector('#c-cash'); if (el2) el2.innerHTML = `Free cash: ${parts.join(' · ')}.`;
    }).catch(() => {});
  };
  auth.whenReady().then(() => { if (isOwner()) own(); });

  function draw(t) {
    if (tab === 'closed') { closed(t); reveal(list); return; }
    const paint = (o = {}) => { const calls = allSignals(t); list.innerHTML = `<p class="tab-note"><b>Active trades</b> are calls that are still open. Buy the new ones, and the older ones that are still at or above their entry.</p>${o.expand ? `<p class="tab-note own">${o.owned.size ? `<b>Green border</b> = you already hold it (Angel or your trade log).` : 'Your holdings are loading…'} <a href="/rahul/portfolio" data-nav>My portfolio</a></p>` : ''}${signalList(allSignals(t), o)}`; settle(list); reveal(list);
      list.querySelector('[data-basket]')?.addEventListener('click', e => { e.preventDefault(); const free = calls.filter(c => entryZone(c) === 'new' && !(o.owned && o.owned.has(String(c.sym).toUpperCase()))).sort((a, b) => (b.score || 0) - (a.score || 0)); basketSheet({ calls: free, onDone: okd => okd && ownedSymbols().then(owned => paint({ expand: true, owned, buy: true })) }); });
      list.querySelectorAll('[data-buy]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const c = calls.find(y => y.sym === b.dataset.buy); orderSheet({ sym: b.dataset.buy, side: 'BUY', call: c, onDone: okd => okd && ownedSymbols().then(owned => paint({ expand: true, owned, buy: true })) }); }); };
    paint();
    auth.whenReady().then(() => { if (!isOwner() || tab !== 'signals') return; paint({ expand: true, owned: new Set(), buy: true }); ownedSymbols().then(owned => { if (tab === 'signals') paint({ expand: true, owned, buy: true }); }); });
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
