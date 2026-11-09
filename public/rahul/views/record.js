import { chrome, fill, fmt, esc, icon, n, tone, count, toDate, loadTerminal, tradeStats, engineOf, ENGINES, link } from '../core.js';
import { areaChart, barChart } from '../charts.js';
import { sec, footNote, statCell, closedRow } from './parts.js';

/* Backtest report: every number is worked out here from the closed trades, so it moves as trades open and close. */
export default async function record(el, r) {
  const body = chrome(el, { title: 'Backtest report', back: 'Back', top: { ey: `${icon('chart', 16)}Backtest report`, h: 'Every trade, | wins and losses.', hl: ['wins'], lede: 'Every AI call that has closed, counted the same way. The numbers update on their own as new trades close.' } });
  const stops = [];
  let year = r.query.get('y') || 'all';

  fill(body, () => loadTerminal(), t => {
    const years = [...new Set(t.closed.map(c => String(c.exitDate).slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort().reverse();
    const draw = () => {
      stops.splice(0).forEach(f => f && f());
      const list = t.closed.filter(c => year === 'all' || String(c.exitDate).startsWith(year));
      const s = tradeStats(list);
      const chron = list.slice().sort((a, b) => String(a.exitDate).localeCompare(String(b.exitDate)));
      body.innerHTML = `
        <div class="hs" role="group" aria-label="Period">${[['all', 'All time'], ...years.map(y => [y, y])].map(([k, l]) => `<button class="chip" data-y="${k}" aria-pressed="${k === year}">${l}</button>`).join('')}</div>
        ${!s.n ? '<div class="empty" style="margin-top:12px"><h3>No closed trades in this period</h3></div>' : `
        <div class="rec-top">
          <div class="rec-big"><div class="k">Closed calls</div><div class="v">${count(s.n)}</div><div class="wl"><b class="up">${fmt.int(s.wins)}</b> win · <b class="dn">${fmt.int(s.losses)}</b> loss</div>
            <div class="yr-bar"><i style="width:${s.winRate}%"></i></div></div>
        </div>
        <div class="stats" style="margin-top:12px">${statCell('Win rate', count(s.winRate, 'pct', 0), '', 'winrate')}${statCell('Avg win', `<span class="up">${fmt.sp(s.avgWin)}</span>`)}${statCell('Avg loss', `<span class="dn">${fmt.sp(s.avgLoss)}</span>`)}</div>
        <div class="stats" style="margin-top:10px">${statCell('Profit factor', isFinite(s.pf) ? fmt.x(s.pf) : '—', '', 'pf')}${statCell('Per trade', `<span class="${tone(s.avg)}">${fmt.sp(s.avg, 2)}</span>`, 'average', 'expectancy')}${statCell('Typical hold', fmt.days(s.hold))}</div>
        ${sec('Growth of ₹1 lakh', `<div class="panel pad"><div class="chart-head"><div><div class="v" id="e-v"></div><div class="w" id="e-w"></div></div><div class="d" id="e-d"></div></div><div id="e-chart"></div></div>`, { p: '₹10,000 put into every call, in the order they closed.' })}
        <div id="r-mon"></div>
        ${sec('By engine', `<div class="group">${['v2', 'v3'].map(k => { const e = tradeStats(list.filter(c => engineOf(c) === k)); return e.n ? `<div class="row plain"><span class="eng e-${k}">${icon('chip', 13)}${ENGINES[k].name}</span><div class="main" style="margin-left:4px"><div class="s" style="margin:0">${fmt.int(e.n)} calls, ${fmt.pct(e.winRate, 0)} won</div></div><div class="end"><div class="v ${tone(e.avg)} tnum">${fmt.sp(e.avg, 2)}</div><div class="d faint">per trade</div></div></div>` : ''; }).join('')}</div>`)}
        ${sec('Latest closed', `<div class="group">${t.closed.filter(c => year === 'all' || String(c.exitDate).startsWith(year)).slice(0, 8).map(closedRow).join('')}</div>`, { more: link('calls?v=closed', 'All', 'more') })}`}
        ${footNote('Results are worked out from each call’s entry and exit price, before brokerage and taxes.')}`;
      body.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { year = b.dataset.y; draw(); history.replaceState(history.state, '', location.pathname + (year === 'all' ? '' : '?y=' + year)); });
      if (!s.n) return;

      /* equity: ₹1 lakh, ₹10,000 per call */
      let nav = 100000;
      const pts = chron.map(c => { nav += 10000 * c.roi / 100; return { t: String(c.exitDate).slice(0, 10), v: nav }; });
      const pv = [{ t: chron[0].entryDate || chron[0].exitDate, v: 100000 }].concat(pts);
      const last = pv[pv.length - 1].v, ch = (last / 100000 - 1) * 100;
      const v = body.querySelector('#e-v'), w = body.querySelector('#e-w'), d = body.querySelector('#e-d');
      const reset = () => { v.textContent = fmt.lakh(last); w.textContent = `after ${fmt.int(s.n)} calls`; d.textContent = fmt.sp(ch); d.className = 'd ' + tone(ch); };
      reset();
      stops.push(areaChart(body.querySelector('#e-chart'), pv, { height: 190, fmt: fmt.lakh, axis: x => fmt.lakh(x).replace('₹', ''), label: 'Growth of one lakh', onScrub: p => {
        if (!p) return reset();
        const c2 = (p.v / 100000 - 1) * 100; v.textContent = fmt.lakh(p.v); w.textContent = fmt.date(p.t, { day: 'numeric', month: 'short', year: 'numeric' }); d.textContent = fmt.sp(c2); d.className = 'd ' + tone(c2);
      } }));

      /* month by month */
      const m = new Map();
      chron.forEach(c => { const k = String(c.exitDate).slice(0, 7); if (!/^\d{4}-\d{2}$/.test(k)) return; const x = m.get(k) || { k, pnl: 0, n: 0, w: 0 }; x.pnl += 10000 * c.roi / 100; x.n++; if (c.win) x.w++; m.set(k, x); });
      const months = [...m.values()].slice(-18).map(x => ({ label: fmt.month(x.k), full: toDate(x.k + '-01')?.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), v: x.pnl, sub: `${x.n} calls, ${fmt.pct(x.w / x.n * 100, 0)} won` }));
      if (months.length > 1) {
        body.querySelector('#r-mon').innerHTML = sec('Month by month', `<div class="panel pad"><div id="r-bars"></div><p class="tiny" style="margin:8px 0 0">Profit or loss each month with ₹10,000 in each call. Hold and drag to read a month.</p></div>`);
        stops.push(barChart(body.querySelector('#r-bars'), months, { fmt: x => (x >= 0 ? '+' : '') + fmt.lakh(x), height: 160, label: 'Monthly profit and loss' }));
      }
    };
    draw();
  }, '<div class="sk" style="height:380px;border-radius:16px"></div>');
  return () => stops.forEach(f => f && f());
}
