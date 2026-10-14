import { reveal, api, chrome, fill, fmt, esc, icon, n, ok, link, loadTerminal, segmented, count, tone, toDate, empty } from '../core.js';
import { settle } from '../charts.js';
import { closedRow, sec, footNote, statCell, signalList, scanRule, bindSignals, isFreshSignal } from './parts.js';

export default async function calls(el, r) {
  const body = chrome(el, { title: 'AI Calls', sub: 'Every call from every strategy. Each one has a price to buy at, a stop loss and a target.' });
  body.innerHTML = `<div id="c-sum"></div><div id="c-seg" style="margin-top:18px"></div><div id="c-list" style="margin-top:14px"></div><div id="c-how"></div>${footNote('Calls are generated after the market closes and checked again before the open.')}`;
  const sum = body.querySelector('#c-sum'), list = body.querySelector('#c-list');
  let tab = r.query.get('v') || null;

  fill(sum, () => Promise.all([loadTerminal(), api('/track-record', 15).catch(() => ({}))]), ([t, rec]) => {
    const C = rec.combined || {}, openRoi = t.active.length ? t.active.reduce((a, c) => a + (isFinite(c.roi) ? c.roi : 0), 0) / t.active.length : NaN;
    sum.innerHTML = `<div class="stats four mini">
      ${statCell('New signals', count(all(t).filter(isFreshSignal).length), 'paper trade these')}
      ${statCell('Open calls', count(all(t).length), isFinite(openRoi) ? `<span class="${tone(openRoi)}">${fmt.sp(openRoi)} on average</span>` : '')}
      ${statCell('Win rate', ok(C.winRate) ? count(C.winRate, 'pct', 0) : '—', ok(C.trades) ? `${fmt.int(C.trades)} closed trades` : '', 'winrate')}
      ${statCell('Profit factor', ok(C.profitFactor) ? count(C.profitFactor, 'x') : '—', link('record', 'See the record', 'link'), 'pf')}
    </div>`;
    if (!tab || tab === 'buy' || tab === 'open') tab = tab === 'closed' ? 'closed' : 'signals';
    segmented(body.querySelector('#c-seg'), [['signals', 'Signals', all(t).length], ['closed', 'Closed', t.closed.length]], tab, v => { tab = v; draw(t); history.replaceState(history.state, '', location.pathname + '?v=' + v); });
    draw(t);
  }, '<div class="sk" style="height:150px;border-radius:16px"></div>');

  const all = t => [...t.toBuy, ...t.active.filter(c => !t.toBuy.some(x => x.sym === c.sym))];
  let strat = 'all';
  function draw(t) {
    if (tab === 'closed') { closed(t); reveal(list); return; }
    const sigs = all(t);
    const names = [...new Set(sigs.map(c => c.strategy))];
    const pick = sigs.filter(c => strat === 'all' || c.strategy === strat);
    list.innerHTML = `${scanRule()}
      ${names.length > 1 ? `<div class="hs" style="margin-top:12px" role="group" aria-label="Filter by strategy"><button class="chip" data-st="all" aria-pressed="${strat === 'all'}">All strategies <span class="n">${sigs.length}</span></button>${names.map(nm => `<button class="chip" data-st="${esc(nm)}" aria-pressed="${strat === nm}">${esc(nm)} <span class="n">${sigs.filter(c => c.strategy === nm).length}</span></button>`).join('')}</div>` : ''}
      <div style="margin-top:12px">${signalList(pick, { oldLabel: 'Older signals, still open. Skip as new buys' })}</div>`;
    list.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { strat = b.dataset.st; draw(t); });
    bindSignals(list, pick, () => draw(t));
    settle(list); reveal(list);
  }

  function closed(t) {
    let filt = 'all', shown = 40;
    const render = () => {
      const pick = t.closed.filter(c => filt === 'all' || (filt === 'win' && c.win) || (filt === 'loss' && !c.win) || (filt === 'live' && String(c.origin).toUpperCase() === 'LIVE'));
      const months = new Map();
      pick.slice(0, shown).forEach(c => { const k = (c.exitDate || '').slice(0, 7); if (!months.has(k)) months.set(k, []); months.get(k).push(c); });
      const wins = pick.filter(c => c.win).length, avg = pick.length ? pick.reduce((a, c) => a + c.roi, 0) / pick.length : NaN;
      list.innerHTML = `<div class="hs" role="group" aria-label="Filter closed trades">${[['all', 'All', t.closed.length], ['win', 'Wins', t.closed.filter(c => c.win).length], ['loss', 'Losses', t.closed.filter(c => !c.win).length], ['live', 'Live only', t.closed.filter(c => String(c.origin).toUpperCase() === 'LIVE').length]].map(([k, l, c]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filt}">${l} <span class="n">${c}</span></button>`).join('')}</div>
        <p class="small" style="margin:8px 2px 12px">${pick.length ? `${fmt.int(pick.length)} trades, ${fmt.pct(wins / pick.length * 100, 0)} won, <b class="${tone(avg)}">${fmt.sp(avg)}</b> average result.` : 'No trades match this filter.'}</p>
        ${[...months].map(([m, l]) => `<div class="tiny" style="margin:16px 4px 8px;font-weight:600;color:var(--ink-2)">${m ? toDate(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Earlier'}</div><div class="group">${l.map(closedRow).join('')}</div>`).join('')}
        ${pick.length > shown ? `<button class="btn quiet block" data-more style="margin-top:14px">Show more</button>` : ''}`;
      list.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; shown = 40; render(); });
      const m = list.querySelector('[data-more]'); if (m) m.onclick = () => { shown += 60; render(); };
    };
    render();
  }

}
