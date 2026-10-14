import { reveal, api, chrome, fill, fmt, icon, ok, link, loadTerminal, allSignals, segmented, tone, toDate } from '../core.js';
import { settle } from '../charts.js';
import { closedRow, footNote, signalList, isFreshSignal } from './parts.js';

export default async function calls(el, r) {
  const body = chrome(el, { title: 'AI Calls', top: { meta: `<span class="eng-pair">${icon('chip', 14)}AI Pro <i class="sep"></i>${icon('chip', 14)}Chart AI Pro</span>`, h: 'AI Calls', hl: ['AI'], sub: 'Buy, stop and target for every signal, after each close.' } });
  body.innerHTML = `<div id="c-sum"></div><div id="c-seg" style="margin-top:16px"></div><div id="c-list" style="margin-top:6px"></div>${footNote('Calls are generated after the market closes and checked again before the open.')}`;
  const sum = body.querySelector('#c-sum'), list = body.querySelector('#c-list');
  let tab = r.query.get('v') === 'closed' ? 'closed' : 'signals';

  fill(sum, () => Promise.all([loadTerminal(), api('/track-record', 15).catch(() => ({}))]), ([t, rec]) => {
    const C = rec.combined || {}, sigs = allSignals(t), nNew = sigs.filter(isFreshSignal).length;
    if (t.at) el.querySelector('.tb-meta').insertAdjacentHTML('beforeend', `<i class="sep"></i><span>Scanned ${fmt.date(String(t.at).slice(0, 10))}</span>`);
    sum.innerHTML = `<div class="pills hs">
      <span class="pl hot"><i></i><b>${nNew}</b> new</span>
      <span class="pl"><b>${sigs.length}</b> open</span>
      ${ok(C.winRate) ? `<span class="pl"><b>${fmt.pct(C.winRate, 0)}</b> win rate</span>` : ''}
      ${ok(C.profitFactor) ? link('record', `<b>${fmt.x(C.profitFactor, 2)}</b> profit factor ${icon('chev', 14)}`, 'pl') : ''}
    </div>`;
    segmented(body.querySelector('#c-seg'), [['signals', 'Signals', sigs.length], ['closed', 'Closed', t.closed.length]], tab, v => { tab = v; draw(t); history.replaceState(history.state, '', location.pathname + '?v=' + v); });
    draw(t);
  }, '<div class="sk" style="height:38px;border-radius:19px"></div>');

  function draw(t) {
    if (tab === 'closed') { closed(t); reveal(list); return; }
    list.innerHTML = signalList(allSignals(t));
    settle(list); reveal(list);
  }

  function closed(t) {
    let filt = 'all', shown = 40;
    const render = () => {
      const pick = t.closed.filter(c => filt === 'all' || (filt === 'win' && c.win) || (filt === 'loss' && !c.win) || (filt === 'live' && String(c.origin).toUpperCase() === 'LIVE'));
      const months = new Map();
      pick.slice(0, shown).forEach(c => { const k = (c.exitDate || '').slice(0, 7); if (!months.has(k)) months.set(k, []); months.get(k).push(c); });
      const wins = pick.filter(c => c.win).length, avg = pick.length ? pick.reduce((a, c) => a + c.roi, 0) / pick.length : NaN;
      list.innerHTML = `<div class="hs" style="margin-top:12px" role="group" aria-label="Filter closed trades">${[['all', 'All', t.closed.length], ['win', 'Wins', t.closed.filter(c => c.win).length], ['loss', 'Losses', t.closed.filter(c => !c.win).length], ['live', 'Live only', t.closed.filter(c => String(c.origin).toUpperCase() === 'LIVE').length]].map(([k, l, c]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filt}">${l} <span class="n">${c}</span></button>`).join('')}</div>
        <p class="small" style="margin:8px 2px 12px">${pick.length ? `${fmt.int(pick.length)} trades, ${fmt.pct(wins / pick.length * 100, 0)} won, <b class="${tone(avg)}">${fmt.sp(avg)}</b> average result.` : 'No trades match this filter.'}</p>
        ${[...months].map(([m, l]) => `<div class="month">${m ? toDate(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Earlier'}</div><div class="group">${l.map(closedRow).join('')}</div>`).join('')}
        ${pick.length > shown ? `<button class="btn quiet block" data-more style="margin-top:14px">Show more</button>` : ''}`;
      list.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filt = b.dataset.f; shown = 40; render(); });
      const m = list.querySelector('[data-more]'); if (m) m.onclick = () => { shown += 60; render(); };
    };
    render();
  }
}
