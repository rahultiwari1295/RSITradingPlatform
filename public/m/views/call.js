import { api, chrome, fill, fmt, esc, icon, n, ok, link, mono, delta, tone, loadTerminal, share, scoreTone, sentence, clean, STRAT_WHAT, q, empty } from '../core.js';
import { priceChart, toCandles, withEmas, ruler, settle } from '../charts.js';
import { sec, statCell, closedRow, footNote } from './parts.js';

export default async function call(el, r) {
  const sym = r.arg.toUpperCase();
  const body = chrome(el, { title: sym, back: 'AI Calls', actions: `<button class="ib" data-share aria-label="Share this call">${icon('share', 20)}</button>` });
  el.querySelector('.head').remove();
  el.querySelector('[data-share]').onclick = () => share(`${sym} AI call`, `QuantSync AI call on ${sym}`);
  fill(body, () => loadTerminal(), t => {
    const c = t.toBuy.find(x => x.sym === sym) || t.active.find(x => x.sym === sym);
    if (!c) {
      const last = t.closed.find(x => x.sym === sym);
      body.innerHTML = `<div style="margin-top:12px">${empty('ai', `No open call on ${sym}`, last ? `The last call closed on ${fmt.date(last.exitDate)} with ${fmt.sp(last.roi)}.` : 'The AI engines are not holding this stock right now.', `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${last ? link(`calls/closed/${encodeURIComponent(last.id)}`, 'See the closed trade', 'btn ghost sm') : ''}${link(`xray/${encodeURIComponent(sym)}`, 'Open the X-Ray', 'btn quiet sm')}</div>`)}</div>`;
      return;
    }
    draw(c, t);
  }, `<div class="sk" style="height:260px;border-radius:22px;margin-top:8px"></div><div class="sk" style="height:300px;border-radius:16px;margin-top:12px"></div>`);

  function draw(c, t) {
    const fresh = c.days === 0, riskPct = (1 - c.stop / c.entry) * 100, gainPct = (c.target / c.entry - 1) * 100, rr = gainPct / riskPct;
    const chase = c.entry * 1.03;
    const above = c.now > c.entry * 1.03, belowEntry = c.now < c.entry;
    const todo = fresh
      ? (above ? `It has already run ${fmt.sp((c.now / c.entry - 1) * 100)} past the entry. Buying here raises your risk, because the stop stays at <b>${fmt.px(c.stop)}</b>. Wait for a dip towards <b>${fmt.px(c.entry)}</b>.`
        : `Buy near <b>${fmt.px(c.entry)}</b>, and avoid paying more than <b>${fmt.px(chase)}</b>. Place a stop loss at <b>${fmt.px(c.stop)}</b>. The engine plans to take profit at <b>${fmt.px(c.target)}</b>.`)
      : (belowEntry ? `The trade is slightly under water but still valid. It only fails on a close below <b>${fmt.px(c.stop)}</b>, about ${fmt.pct((1 - c.stop / c.now) * 100)} away.`
        : `Holding with a gain. Keep the stop at <b>${fmt.px(c.stop)}</b>. The target of <b>${fmt.px(c.target)}</b> is ${fmt.pct((c.target / c.now - 1) * 100)} away.`);
    body.innerHTML = `
      <div class="xhero" style="margin-top:6px">
        <div class="id">${mono(c.sym, 'lg')}<div style="min-width:0"><div class="t">${esc(c.sym)}</div><div class="s">${esc(c.name)}${c.sector ? ', ' + esc(c.sector) : ''}</div></div></div>
        <div class="pr"><span class="v tnum">${fmt.px(c.now)}</span>${delta(c.roi, 2)}<span class="small">since entry</span></div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">${fresh ? '<span class="pill ai">New buy call today</span>' : `<span class="pill">Day ${fmt.int(c.days)} of the trade</span>`}<span class="pill brand">${esc(c.strategy)}</span>${ok(c.score) ? `<span class="pill">AI confidence ${fmt.int(c.score)}</span>` : ''}</div>
        <div style="margin-top:6px">${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now })}</div>
      </div>
      <div class="verdict" style="background:var(--ai-soft);margin-top:12px"><div class="h" style="display:flex;gap:8px;align-items:center"><span class="ai">${icon('ai', 18)}</span>What to do</div><p style="color:var(--ink)">${todo}</p></div>
      ${sec('The plan', `<div class="stats four">
        ${statCell('Entry', fmt.px(c.entry), fresh ? 'buy price' : 'bought ' + fmt.date(c.entryDate), 'entry')}
        ${statCell('Stop loss', `<span class="dn">${fmt.px(c.stop)}</span>`, `${fmt.sp(-riskPct)} from entry`, 'stop')}
        ${statCell('Target', `<span class="up">${fmt.px(c.target)}</span>`, `${fmt.sp(gainPct)} from entry`, 'target')}
        ${statCell('Reward to risk', isFinite(rr) ? fmt.x(rr, 1) + '×' : '—', 'gain vs loss', 'rr')}
      </div>`)}
      ${c.why ? sec('Why the engine bought', `<div class="panel pad"><p class="lede" style="margin:0">${esc(c.why)}</p></div>`) : ''}
      ${sec('Chart', `<div class="panel pad"><div class="chart-head"><div><div class="v" id="k-v"></div><div class="w" id="k-w"></div></div><div class="d" id="k-d"></div></div><div id="k-chart"></div>
        <div class="legend"><span><i style="background:var(--brand)"></i>20-day avg</span><span><i style="background:var(--ai-solid)"></i>50-day avg</span><span style="color:var(--ink-3)"><i class="dash"></i>200-day avg</span></div></div>`, { p: 'Hold and drag across the chart to read any day.' })}
      <div id="k-strat"></div>
      <div id="k-xray"></div>
      <div id="k-hist"></div>
      ${footNote()}`;
    settle(body);

    const chartEl = body.querySelector('#k-chart');
    fill(chartEl, () => api(`/chart/${encodeURIComponent(c.sym)}?limit=260`, 15), d => {
      const cs = withEmas(toCandles(d.candles));
      const levels = [{ v: c.target, label: 'Target', tone: 'up', force: true }, { v: c.entry, label: 'Entry', tone: 'ink', dash: '2 3', force: true }, { v: c.stop, label: 'Stop', tone: 'dn', force: true }];
      const t2 = c.fib.find(f => f[0].startsWith('1.6'));
      if (t2 && t2[1] > c.target * 1.02) levels.push({ v: t2[1], label: 'Stretch', tone: 'mute' });
      const stop = priceChart(chartEl, cs, { levels, mark: c.entryDate ? { t: c.entryDate, label: 'Entry' } : null, range: 66, height: 270, head: { v: body.querySelector('#k-v'), d: body.querySelector('#k-d'), w: body.querySelector('#k-w') } });
      el._stops = (el._stops || []).concat(stop);
    }, '<div class="sk" style="height:300px"></div>');

    fill(body.querySelector('#k-strat'), () => api('/track-record', 15), rec => {
      const s = (rec.byStrategy || {})[c.stratId];
      const what = STRAT_WHAT[c.stratId];
      if (!s && !what) return;
      body.querySelector('#k-strat').innerHTML = sec(`About the ${esc(c.strategy.toLowerCase())} strategy`, `${what ? `<p class="prose" style="margin:-2px 2px 12px">${esc(what)}</p>` : ''}
        ${s ? `<div class="stats">${statCell('Win rate', fmt.pct(s.winRate, 0), `${fmt.int(s.trades)} trades`, 'winrate')}${statCell('Avg win', `<span class="up">${fmt.sp(s.avgWinPct)}</span>`, `avg loss ${fmt.sp(s.avgLossPct)}`)}${statCell('Typical hold', fmt.days(s.medianHoldDays), `worst run ${fmt.int(s.maxConsecutiveLosses)} losses`)}</div>
        <p class="small" style="margin:10px 2px 0">Profit factor ${fmt.x(s.profitFactor)}${q('pf')}. Includes simulated trades before live tracking began.</p>` : ''}`);
    }, '');

    fill(body.querySelector('#k-xray'), () => api(`/app/xray-batch?symbols=${encodeURIComponent(c.sym)}`, 30), d => {
      const x = (d.items || {})[c.sym];
      if (!x || !ok(x.score)) return;
      const st = scoreTone(x.score);
      body.querySelector('#k-xray').innerHTML = sec('The company behind the trade', link(`xray/${encodeURIComponent(c.sym)}`, `<span class="mono" style="--h:220;background:color-mix(in srgb, var(--${st.k === 'warn' ? 'ai' : st.k}-solid) 16%, transparent);color:var(--${st.k === 'warn' ? 'ai' : st.k});box-shadow:none;font-size:15px">${fmt.int(x.score)}</span>
        <div class="main"><div class="t">X-Ray score ${fmt.int(x.score)}, ${st.t.toLowerCase()}</div><div class="s">${esc(clean(x.title || x.archetype || ''))}</div></div>${icon('chev', 18, 'chev')}`, 'row group'));
    }, '');

    const hist = t.closed.filter(x => x.stratId === c.stratId).slice(0, 5);
    if (hist.length) body.querySelector('#k-hist').innerHTML = sec('Recent trades from this strategy', `<div class="group">${hist.map(closedRow).join('')}</div>`);
  }
  return () => (el._stops || []).forEach(f => f && f());
}
