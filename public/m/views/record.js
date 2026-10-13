import { api, chrome, fill, fmt, esc, ok, n, tone, q, count, stratName, sentence, toDate } from '../core.js';
import { areaChart, barChart } from '../charts.js';
import { sec, footNote, statCell } from './parts.js';

export default async function record(el) {
  const body = chrome(el, { title: 'Track record', back: 'AI Calls', sub: 'Every AI call the engines have closed, wins and losses, and how the paper account has moved.' });
  body.innerHTML = `<div id="r-duo"></div><div id="r-eq"></div><div id="r-mon"></div><div id="r-str"></div>${footNote()}`;
  const stops = [];

  fill(body.querySelector('#r-duo'), () => api('/track-record', 15), rec => {
    const L = rec.live || {}, S = rec.simulated || {}, C = rec.combined || {};
    const side = (h, s, cls, d) => `<div class="side"><div class="h"><span class="pill ${cls}">${h}</span></div><div class="big ${tone(s.expectancyPct)} tnum">${fmt.sp(s.expectancyPct, 2)}</div><div class="sub">average per trade</div>
      <dl><dt>Trades</dt><dd>${fmt.int(s.trades)}</dd><dt>Won</dt><dd>${fmt.pct(s.winRate, 0)}</dd><dt>Profit factor</dt><dd>${fmt.x(s.profitFactor)}</dd><dt>Avg win</dt><dd class="up">${fmt.sp(s.avgWinPct)}</dd><dt>Avg loss</dt><dd class="dn">${fmt.sp(s.avgLossPct)}</dd><dt>Typical hold</dt><dd>${fmt.days(s.medianHoldDays)}</dd></dl>
      <p class="tiny" style="margin:10px 0 0">${d}</p></div>`;
    body.querySelector('#r-duo').innerHTML = `
      <div class="stats" style="margin-bottom:12px">${statCell('Closed trades', count(C.trades), `${fmt.int(C.wins)} won`)}${statCell('Win rate', count(C.winRate, 'pct', 0), '', 'winrate')}${statCell('Profit factor', count(C.profitFactor, 'x'), '', 'pf')}</div>
      <div class="sec-h" style="margin-top:22px"><h2>Live and simulated${q('live')}</h2></div>
      <div class="duo">${ok(L.trades) ? side('Live', L, 'ai', `Called in real time since ${fmt.date(rec.liveSince, { day: 'numeric', month: 'short', year: 'numeric' })}.`) : ''}${side('Simulated', S, '', 'The same rules run on past prices.')}</div>
      ${ok(L.trades) && n(L.profitFactor) < 1 && n(S.profitFactor) >= 1 ? `<p class="small" style="margin:12px 2px 0">The live record is short and has been weaker than the simulation so far. Judge the engines on the live column as it grows.</p>` : ''}`;

    const months = (rec.byMonth || []).slice(-18).map(m => ({ label: fmt.month(m.month), full: toDate(m.month + '-01')?.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), v: n(m.netPnl), sub: `${fmt.int(m.trades)} trades, ${fmt.pct(m.winRate, 0)} won${m.origin === 'LIVE' ? ', live' : ''}` }));
    if (months.length) {
      body.querySelector('#r-mon').innerHTML = sec('Profit and loss by month', `<div class="panel pad"><div id="r-bars"></div><p class="tiny" style="margin:8px 0 0">Rupees made or lost each month on the paper account. Hold and drag to read a month.</p></div>`);
      stops.push(barChart(body.querySelector('#r-bars'), months, { fmt: v => fmt.lakh(v).replace(/^₹/, '+₹'), height: 170, label: 'Monthly profit and loss' }));
    }
    const strat = Object.entries(rec.byStrategy || {}).map(([k, s]) => ({ k, ...s })).sort((a, b) => n(b.expectancyPct) - n(a.expectancyPct));
    if (strat.length) {
      const mx = Math.max(...strat.map(s => Math.abs(n(s.expectancyPct)) || 0), 1);
      body.querySelector('#r-str').innerHTML = sec('By strategy', `<div class="group">${strat.map(s => `<div class="row plain" style="display:grid;grid-template-columns:1fr auto;gap:4px 12px">
        <div class="main"><div class="t">${esc(stratName(s.k))}</div><div class="s">${fmt.int(s.trades)} trades, ${fmt.pct(s.winRate, 0)} won, profit factor ${fmt.x(s.profitFactor)}</div></div>
        <div class="end"><div class="v ${tone(s.expectancyPct)} tnum">${fmt.sp(s.expectancyPct, 2)}</div><div class="d faint">per trade</div></div>
        <div style="grid-column:1/-1;height:4px;border-radius:2px;background:var(--sunk);overflow:hidden"><i style="display:block;height:100%;width:${Math.abs(n(s.expectancyPct)) / mx * 100}%;background:${n(s.expectancyPct) >= 0 ? 'var(--up-solid)' : 'var(--dn-solid)'};border-radius:2px;animation:grow 1s cubic-bezier(.2,.8,.2,1) both"></i></div></div>`).join('')}</div>
        ${rec.note ? `<p class="tiny" style="margin:10px 2px 0">${esc(sentence(rec.note))}</p>` : ''}`);
    }
  }, '<div class="sk" style="height:380px;border-radius:16px"></div>');

  fill(body.querySelector('#r-eq'), () => api('/equity-curve', 15), eq => {
    const s = (eq.series || []).map(p => ({ t: p.date, v: n(p.nav) })).filter(p => isFinite(p.v));
    if (s.length < 2) return;
    const ch = (s[s.length - 1].v / s[0].v - 1) * 100;
    const dd = Math.max(...(eq.series || []).map(p => n(p.drawdownPct) || 0));
    body.querySelector('#r-eq').innerHTML = sec('Paper account', `<div class="panel pad">
      <div class="chart-head"><div><div class="v" id="e-v">${fmt.lakh(eq.currentNav ?? s[s.length - 1].v)}</div><div class="w" id="e-w">last ${fmt.int(s.length)} sessions</div></div><div class="d ${tone(ch)}" id="e-d">${fmt.sp(ch)}</div></div>
      <div id="e-chart"></div>
      <div class="stats two" style="margin-top:14px;box-shadow:none">${statCell('Highest value', fmt.lakh(eq.peakEquity))}${statCell('Deepest dip', isFinite(dd) ? `<span class="dn">${fmt.sp(-dd)}</span>` : '—', 'from a high', 'drawdown')}</div></div>`,
      { p: 'A model account that takes every AI call with the same position size.' });
    const v = body.querySelector('#e-v'), w = body.querySelector('#e-w'), d = body.querySelector('#e-d');
    stops.push(areaChart(body.querySelector('#e-chart'), s, { height: 200, fmt: fmt.lakh, axis: v => fmt.lakh(v).replace('₹', ''), label: 'Paper account value', onScrub: (p) => {
      if (!p) { v.textContent = fmt.lakh(s[s.length - 1].v); w.textContent = `last ${s.length} sessions`; d.textContent = fmt.sp(ch); d.className = 'd ' + tone(ch); return; }
      const c2 = (p.v / s[0].v - 1) * 100; v.textContent = fmt.lakh(p.v); w.textContent = fmt.date(p.t, { day: 'numeric', month: 'short', year: 'numeric' }); d.textContent = fmt.sp(c2); d.className = 'd ' + tone(c2);
    } }));
  }, '', { quiet: true });
  return () => stops.forEach(f => f && f());
}
