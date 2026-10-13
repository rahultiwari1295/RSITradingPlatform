import { api, chrome, fill, fmt, esc, icon, ok, link, mono, tone, loadTerminal, share, STRAT_WHAT, empty } from '../core.js';
import { priceChart, toCandles, withEmas } from '../charts.js';
import { sec, statCell, closedRow, footNote } from './parts.js';

export default async function closed(el, r) {
  const id = r.arg;
  const body = chrome(el, { title: 'Closed trade', back: 'AI Calls', actions: `<button class="ib" data-share aria-label="Share">${icon('share', 20)}</button>` });
  el.querySelector('.head').remove();
  el.querySelector('[data-share]').onclick = () => share('Closed trade', 'QuantSync closed trade');
  let stops = [];
  fill(body, () => loadTerminal(), t => {
    const c = t.closed.find(x => x.id === id);
    if (!c) { body.innerHTML = `<div style="margin-top:12px">${empty('clock', 'Trade not found', 'It may be older than the history the engine keeps. Browse the closed trades instead.', link('calls?v=closed', 'Closed trades', 'btn ghost sm'))}</div>`; return; }
    el.querySelector('.bar .bt').textContent = c.sym;
    const win = c.win;
    body.innerHTML = `
      <div class="xhero" style="margin-top:6px">
        <div class="id">${mono(c.sym, 'lg')}<div style="min-width:0"><div class="t">${esc(c.sym)}</div><div class="s">${esc(c.strategy)}${c.origin ? `, ${String(c.origin).toUpperCase() === 'LIVE' ? 'live call' : 'simulated on past prices'}` : ''}</div></div></div>
        <div class="pr"><span class="v tnum ${tone(c.roi)}">${fmt.sp(c.roi, 2)}</span><span class="pill ${win ? 'up' : 'dn'}">${win ? 'Profit' : 'Loss'}</span></div>
        <p class="small" style="margin:6px 0 0">${esc(c.reason)} after ${fmt.days(c.days)}.</p>
        <div class="flows" style="margin-top:16px">
          <div class="flow"><div class="k">Bought ${fmt.date(c.entryDate)}</div><div class="v tnum">${fmt.px(c.entry)}</div></div>
          <div class="flow"><div class="k">Sold ${fmt.date(c.exitDate)}</div><div class="v tnum">${fmt.px(c.exit)}</div></div>
        </div>
      </div>
      ${sec('Chart', `<div class="panel pad"><div class="chart-head"><div><div class="v" id="z-v"></div><div class="w" id="z-w"></div></div><div class="d" id="z-d"></div></div><div id="z-chart"></div></div>`, { p: 'The dashed lines are the buy and sell prices. The marker shows the day of entry.' })}
      ${STRAT_WHAT[c.stratId] ? sec('The strategy', `<div class="panel pad"><div class="h3">${esc(c.strategy)}</div><p class="prose" style="margin:4px 0 0">${esc(STRAT_WHAT[c.stratId])}</p></div>`) : ''}
      ${sec('More from this strategy', `<div class="group">${t.closed.filter(x => x.stratId === c.stratId && x.id !== c.id).slice(0, 6).map(closedRow).join('')}</div>`)}
      <section class="sec">${link(`xray/${encodeURIComponent(c.sym)}`, `${icon('xray', 20)}Open the ${esc(c.sym)} X-Ray`, 'btn ghost block')}</section>
      ${footNote()}`;
    const ch = body.querySelector('#z-chart');
    fill(ch, () => api(`/chart/${encodeURIComponent(c.sym)}?limit=260`, 30), d => {
      let cs = withEmas(toCandles(d.candles));
      const i0 = cs.findIndex(x => x.t >= c.entryDate);
      const n = i0 >= 0 ? Math.max(30, cs.length - i0 + 15) : 66;
      stops.push(priceChart(ch, cs, { levels: [{ v: c.entry, label: 'Bought', tone: 'ink', force: true }, { v: c.exit, label: 'Sold', tone: win ? 'up' : 'dn', force: true }], mark: { t: c.entryDate, label: 'Entry' }, range: Math.min(cs.length, n), ranges: [[n <= 66 ? '3M' : 'Trade', Math.min(cs.length, n)], ['6M', 128], ['1Y', 250]], height: 260, head: { v: body.querySelector('#z-v'), d: body.querySelector('#z-d'), w: body.querySelector('#z-w') } }));
    }, '<div class="sk" style="height:280px"></div>');
  }, '<div class="sk" style="height:260px;border-radius:22px;margin-top:8px"></div>');
  return () => stops.forEach(f => f && f());
}
