/* /rahul — Today. One screen for the trading decision: the market gauge (how big to buy), what to sell,
   the day's AI calls, cash in each broker, what is coming up on my stocks, and the best of the Edge lists. */
import { chrome, fmt, esc, icon, n, link, tone, ownerApi, isOwner, auth, skel, errBox, todayLine, loadTerminal } from '../core.js';
import { callCard, isFreshSignal, sec, footNote } from './parts.js';
import { loadBook, STATUS } from './pfdata.js';
import { orderSheet } from './trade.js';
import { edgeHome, GAUGE, gaugeFacts, evidenceLine, rsPill, srow, cr, day, note } from './edgedata.js';

export default async function today(el) {
  const body = chrome(el, { title: 'Today', page: 'Today', top: { ey: `${icon('today', 16)}${todayLine()}`, h: 'What to do | today.', hl: ['today'], lede: 'Market size, what to sell, what to buy and how much cash you have.' },
    actions: '<button class="ib" data-refresh aria-label="Refresh" style="font-size:20px">↻</button>' });
  body.innerHTML = `<div id="td">${skel(150, 1, 22)}${skel(90, 3, 16)}</div>`;
  const root = body.querySelector('#td');
  el.querySelector('[data-refresh]').onclick = () => load(true);
  await auth.whenReady();
  if (!isOwner()) { root.innerHTML = errBox('Sign in as the owner to see this page.', false); return; }
  load(false);

  async function load(fresh) {
    const book = await loadBook(fresh);
    const syms = book.rows.map(x => String(x.symbol).toUpperCase());
    let E;
    try { E = await edgeHome(syms); } catch (e) { E = { error: e.message, regime: {}, stocks: {}, earnings: {}, smart: {}, accum: [], alerts: [] }; }
    draw(book, E);
    ownerApi('/owner/funds').then(f => cash(f)).catch(() => cash(null));
  }

  function cash(f) {
    const box = root.querySelector('#td-cash'); if (!box) return;
    if (!f) { box.innerHTML = '<div class="panel pad small">Could not read broker balances right now.</div>'; return; }
    const B = Object.entries(f.funds || {});
    const total = B.reduce((a, [, b]) => a + (b.status === 'ok' ? n(b.cash) || 0 : 0), 0);
    box.innerHTML = `<div class="stats ${B.length === 3 ? '' : 'two'}">${B.map(([k, b]) => `<div class="stat"><div class="k">${k}</div><div class="v" style="font-size:18px">${b.status === 'ok' ? fmt.inr(b.cash) : '—'}</div><div class="d">${b.status === 'ok' ? 'free cash' : b.status === 'login_needed' ? 'not connected today' : b.status === 'not_set_up' ? 'not set up' : 'unavailable'}</div></div>`).join('')}</div>
      <p class="eg-note">${B.some(([, b]) => b.status === 'ok') ? `Total free cash <b>${fmt.inr(total)}</b>, enough for <b>${Math.floor(total / 14000)}</b> buys of ₹14,000. Read at ${esc(f.as_of || '')}.` : 'No broker balance could be read right now. Angel answers only while its systems are up; Kite and Dhan need connecting each day (Portfolio, Brokers).'}</p>`;
  }

  function draw(book, E) {
    const R = E.regime || {}, G = GAUGE[R.gauge] || null, S = E.stocks || {};
    const rows = book.rows, act = rows.filter(x => ['exit', 'stop', 'target'].includes(x.status)).sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank);
    const term = book.term, fresh = term ? term.toBuy.filter(isFreshSignal) : [];
    const held = new Set(rows.map(x => String(x.symbol).toUpperCase()));
    const warns = rows.flatMap(x => ((S[String(x.symbol).toUpperCase()] || {}).warnings || []).map(w => ({ ...w, sym: x.symbol, value: x.value })));
    const bad = warns.filter(w => w.level === 'bad'), soon = warns.filter(w => w.kind === 'results').sort((a, b) => String(a.d).localeCompare(b.d));
    const f5 = R.flow5 || {};
    const smart = Object.values((E.smart.now || []).reduce((a, x) => { const g = a[x.symbol] || (a[x.symbol] = { ...x, cr: 0, n: 0 }); g.cr += n(x.cr) || 0; g.n++; return a; }, {}));
    const side = v => `${n(v) >= 0 ? 'bought' : 'sold'} ${cr(Math.abs(n(v) || 0))}`;
    const flow = `Last 5 days: foreign investors <b class="${tone(f5.FII)}">${side(f5.FII)}</b>, Indian funds <b class="${tone(f5.DII)}">${side(f5.DII)}</b>.`;
    const why = x => (x.status === 'exit' ? `AI exited on ${fmt.date(x.exitCall.exitDate)} at ${fmt.px(x.exitCall.exit)}` : x.status === 'stop' ? `Price ${fmt.px(x.ltp)} is at the stop ${fmt.px(x.call.stop)}` : `Price ${fmt.px(x.ltp)} reached the target ${fmt.px(x.call.target)}`);

    root.innerHTML = `${E.error ? errBox('The Edge data is not available yet: ' + E.error, false) : ''}
      ${G ? `<div class="td-gauge ${G.cls}">
        <div class="td-gh"><span class="k">Market gauge${R.as_of ? ' · ' + day(R.as_of) : ''}</span><b>${G.t}</b></div>
        <p>${G.line}</p>
        <div class="td-bar" aria-hidden="true"><i style="width:${Math.max(2, Math.min(100, n(R.b50) || 0))}%"></i><span style="left:30%"></span><span style="left:55%"></span></div>
        <p class="small">${gaugeFacts(R)} New 52-week highs <b>${fmt.int(R.highs)}</b>, lows <b>${fmt.int(R.lows)}</b>.</p>
        <p class="small">${flow}</p>
      </div>` : ''}

      ${sec(act.length ? `Sell or review <span class="td-n dn">${act.length}</span>` : 'Sell or review', act.length ? `<div class="group">${act.map(x => `<div class="row td-act"><a href="${esc('/rahul/stock/' + encodeURIComponent(x.symbol))}" data-nav class="main"><div class="t">${esc(x.symbol)} <span class="pill ${STATUS[x.status].cls}">${STATUS[x.status].t}</span></div><div class="s">${why(x)} · you hold ${fmt.x(x.qty, 0)} (${fmt.inr(x.value)})</div></a>
          ${Object.keys(x.parts || {}).some(k => k !== 'Manual') ? `<button class="btn sm ${x.status === 'target' ? 'quiet' : 'sell'}" data-sell="${esc(x.symbol)}">Sell</button>` : ''}</div>`).join('')}</div>`
    : '<div class="panel pad small">Nothing to sell. No AI exit, stop or target on the stocks you hold.</div>')}

      ${bad.length ? sec('Red flags on your stocks', `<div class="group">${bad.slice(0, 8).map(w => srow(w.sym, esc(w.text), `<div class="d faint">${w.d ? day(w.d) : ''}</div>`)).join('')}</div>`) : ''}

      ${sec(fresh.length ? `New AI calls <span class="td-n">${fresh.length}</span>` : 'New AI calls', fresh.length ? `<div class="td-calls">${fresh.slice(0, 4).map(c => `<div class="td-call">${callCard(c, { compact: true })}
          <div class="td-cb"><span class="small">${held.has(String(c.sym).toUpperCase()) ? 'You already hold this.' : G ? `Gauge says ${G.t.toLowerCase()}.` : ''}</span><button class="btn sm" data-buy="${esc(c.sym)}">Buy</button></div></div>`).join('')}</div>`
    : '<div class="panel pad small">No new AI call yet today. Calls come at about 3:15 PM on market days.</div>', { more: link('calls', 'All calls', 'more') })}

      ${sec('Cash to buy with', `<div id="td-cash">${skel(74, 1, 16)}</div>`)}

      ${soon.length ? sec('Coming up on your stocks', `<div class="group">${soon.slice(0, 8).map(w => srow(w.sym, esc(w.text), `<div class="d faint">${day(w.d)}</div>`)).join('')}</div>`, { p: 'Results can move a stock sharply either way. Decide before the day, not on it.' }) : ''}

      ${(E.earnings.strong || []).length ? sec('Strong results this season', `<div class="group">${E.earnings.strong.slice(0, 4).map(x => srow(x.symbol, `Sales ${fmt.sp(x.sales_yoy, 0)}, profit ${x.turnaround ? 'turned positive' : fmt.sp(x.profit_yoy, 0)} · price ${fmt.sp(x.react)} on the result`, `<div class="v tnum">${fmt.int(x.score)}</div><div class="d faint">${day(x.result_date)}</div>`)).join('')}</div>`, { more: link('edge?v=results', 'All results', 'more') }) : ''}

      ${smart.length ? sec('Proven buyers, last month', `<div class="group">${smart.slice(0, 4).map(g => srow(g.symbol, g.n > 1 ? `${g.n} proven buyers bought ${cr(g.cr)} (${esc(titleCase(g.party))} and others)` : `${esc(titleCase(g.party))} bought ${cr(g.cr)}`, `<div class="v tnum ${tone(g.since)}">${fmt.sp(g.since)}</div><div class="d faint">${day(g.d)}</div>`)).join('')}</div>`, { more: link('edge?v=smart', 'Smart money', 'more') }) : ''}

      ${(E.alerts || []).length ? sec('Recent alerts', `<div class="group">${E.alerts.slice(0, 6).map(a => `<div class="row plain"><div class="main"><div class="s" style="white-space:normal;color:var(--ink)">${esc(a.text)}</div><div class="small">${esc(String(a.ts).replace('T', ' ').slice(0, 16))}${a.sent ? ' · sent to Telegram' : ''}</div></div></div>`).join('')}</div>`) : ''}
      ${R.evidence ? note(evidenceLine(R) + ' This is a description of the past, not a promise.') : ''}
      ${footNote('Private page.')}`;

    const calls = term ? term.toBuy : [];
    root.querySelectorAll('[data-buy]').forEach(b => b.onclick = e => { e.preventDefault(); const c = calls.find(y => y.sym === b.dataset.buy); orderSheet({ sym: b.dataset.buy, side: 'BUY', call: c, onDone: okd => okd && load(true) }); });
    root.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const x = rows.find(y => y.symbol === b.dataset.sell); orderSheet({ sym: x.symbol, side: 'SELL', call: x.call, broker: Object.keys(x.parts || {}).find(k => k !== 'Manual'), onDone: okd => okd && load(true) }); });
  }
}
export const titleCase = s => String(s || '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\b(Llp|Pte|Ltd|Fpi|Mf|Etf|Bnp|Lic|Sbi|Hdfc|Icici|Uti|Dsp)\b/g, m => m.toUpperCase());
