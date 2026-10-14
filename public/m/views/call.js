import { api, chrome, fill, fmt, esc, icon, n, ok, link, mono, delta, tone, loadTerminal, share, scoreTone, sentence, clean, q, empty, engineOf, engineBadge, ENGINES } from '../core.js';
import { priceChart, toCandles, withEmas, ruler, settle } from '../charts.js';
import { sec, statCell, closedRow, footNote, paperSheet } from './parts.js';
import { paper, go } from '../core.js';

export default async function call(el, r) {
  const sym = r.arg.toUpperCase();
  const body = chrome(el, { title: sym, back: 'AI Calls', actions: `<button class="ib" data-share aria-label="Share this call">${icon('share', 20)}</button>` });
  el.querySelector('.head').remove();
  const want = r.query.get('e') === 'v3' ? 'v3' : 'v2';
  el.querySelector('[data-share]').onclick = () => share(`${sym} AI call`, `QuantSync AI call on ${sym}`);
  fill(body, () => loadTerminal(), t => {
    const pickOne = l => l.find(x => x.sym === sym && engineOf(x) === want) || l.find(x => x.sym === sym);
    const c = pickOne(t.toBuy) || pickOne(t.active);
    if (!c) {
      const last = t.closed.find(x => x.sym === sym);
      body.innerHTML = `<div style="margin-top:12px">${empty('ai', `No open call on ${sym}`, last ? `The last call closed on ${fmt.date(last.exitDate)} with ${fmt.sp(last.roi)}.` : 'The AI engines are not holding this stock right now.', `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${last ? link(`calls/closed/${encodeURIComponent(last.id)}`, 'See the closed trade', 'btn ghost sm') : ''}${link(`xray/${encodeURIComponent(sym)}`, 'Open the X-Ray', 'btn quiet sm')}</div>`)}</div>`;
      return;
    }
    draw(c, t);
  }, `<div class="sk" style="height:260px;border-radius:22px;margin-top:8px"></div><div class="sk" style="height:300px;border-radius:16px;margin-top:12px"></div>`);

  function draw(c, t) {
    const fresh = c.isNew || c.days === 0, riskPct = (1 - c.stop / c.entry) * 100, gainPct = (c.target / c.entry - 1) * 100, rr = gainPct / riskPct;
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
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">${fresh ? `<span class="pill ai">New buy call${c.days === 0 ? ' today' : ''}</span>` : `<span class="pill">Day ${fmt.int(c.days)} of the trade</span>`}${engineBadge(c, 'lg')}${ok(c.score) ? `<span class="pill">AI confidence ${fmt.int(c.score)}</span>` : ''}</div>
        <div style="margin-top:6px">${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now })}</div>
      </div>
      ${fresh ? `<button class="btn block" data-paper style="margin-top:12px">${icon('bolt', 18)}${paper.has(c.sym) ? 'Paper trade started' : 'Paper trade this signal'}</button>` : ''}
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
    const pb = body.querySelector('[data-paper]'); if (pb) pb.onclick = () => (paper.has(c.sym) ? go('portfolio') : paperSheet(c, () => { pb.lastChild.textContent = 'Paper trade started'; }));

    const chartEl = body.querySelector('#k-chart');
    fill(chartEl, () => api(`/chart/${encodeURIComponent(c.sym)}?limit=260`, 15), d => {
      const cs = withEmas(toCandles(d.candles));
      const levels = [{ v: c.target, label: 'Target', tone: 'up', force: true }, { v: c.entry, label: 'Entry', tone: 'ink', dash: '2 3', force: true }, { v: c.stop, label: 'Stop', tone: 'dn', force: true }];
      const t2 = c.fib.find(f => f[0].startsWith('1.6'));
      if (t2 && t2[1] > c.target * 1.02) levels.push({ v: t2[1], label: 'Stretch', tone: 'mute' });
      const stop = priceChart(chartEl, cs, { levels, mark: c.entryDate ? { t: c.entryDate, label: 'Entry' } : null, range: 66, height: 270, head: { v: body.querySelector('#k-v'), d: body.querySelector('#k-d'), w: body.querySelector('#k-w') } });
      el._stops = (el._stops || []).concat(stop);
    }, '<div class="sk" style="height:300px"></div>');

    { const E = ENGINES[engineOf(c)];
      body.querySelector('#k-strat').innerHTML = sec(`About ${E.name}`, `<div class="panel pad eng-about"><div class="eng-row">${engineBadge(c, 'lg')}</div><p class="prose" style="margin:10px 0 0">${esc(E.what)}</p></div>`); }

    fill(body.querySelector('#k-xray'), () => api(`/app/xray-batch?symbols=${encodeURIComponent(c.sym)}`, 30), d => {
      const x = (d.items || {})[c.sym];
      if (!x || !ok(x.score)) return;
      const st = scoreTone(x.score);
      body.querySelector('#k-xray').innerHTML = sec('The company behind the trade', link(`xray/${encodeURIComponent(c.sym)}`, `<span class="mono" style="--h:220;background:color-mix(in srgb, var(--${st.k === 'warn' ? 'ai' : st.k}-solid) 16%, transparent);color:var(--${st.k === 'warn' ? 'ai' : st.k});box-shadow:none;font-size:15px">${fmt.int(x.score)}</span>
        <div class="main"><div class="t">X-Ray score ${fmt.int(x.score)}, ${st.t.toLowerCase()}</div><div class="s">${esc(clean(x.title || x.archetype || ''))}</div></div>${icon('chev', 18, 'chev')}`, 'row group'));
    }, '', { quiet: true });

    const hist = t.closed.filter(x => engineOf(x) === engineOf(c)).slice(0, 5);
    if (hist.length) body.querySelector('#k-hist').innerHTML = sec(`Recent ${ENGINES[engineOf(c)].name} trades`, `<div class="group">${hist.map(closedRow).join('')}</div>`);
  }
  return () => (el._stops || []).forEach(f => f && f());
}
