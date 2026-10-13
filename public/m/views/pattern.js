import { api, chrome, fill, fmt, esc, icon, n, ok, link, mono, delta, loadPatterns, toPattern, share, scoreTone, clean, q, empty } from '../core.js';
import { priceChart, toCandles, withEmas, ruler, settle } from '../charts.js';
import { sec, statCell, STAGE, tfWord, footNote } from './parts.js';

export default async function pattern(el, r) {
  const sym = r.arg.toUpperCase(), tf = (r.query.get('tf') || '').toUpperCase().slice(0, 1);
  const body = chrome(el, { title: sym, back: 'Patterns', actions: `<button class="ib" data-share aria-label="Share">${icon('share', 20)}</button>` });
  el.querySelector('.head').remove();
  el.querySelector('[data-share]').onclick = () => share(`${sym} pattern call`, `QuantSync pattern call on ${sym}`);
  const stops = [];
  fill(body, async () => {
    const d = await loadPatterns();
    let p = d.rows.find(x => x.sym === sym && (!tf || x.tf === tf)) || d.rows.find(x => x.sym === sym);
    if (!p) { const s = await api(`/screener?search=${encodeURIComponent(sym)}&limit=10`, 10).catch(() => ({ rows: [] })); const rows = (s.rows || []).filter(x => x.symbol === sym).map(x => toPattern(x)); p = rows.find(x => !tf || x.tf === tf) || rows[0]; }
    return p;
  }, p => {
    if (!p) { body.innerHTML = `<div style="margin-top:12px">${empty('pattern', `No pattern on ${sym} right now`, 'The scanner has nothing open on this stock. Its X-Ray still explains where it stands.', link(`xray/${encodeURIComponent(sym)}`, 'Open the X-Ray', 'btn ghost sm'))}</div>`; return; }
    draw(p);
  }, `<div class="sk" style="height:260px;border-radius:22px;margin-top:8px"></div>`);

  function draw(p) {
    const st = STAGE[p.stage] || STAGE.Forming;
    const risk = isFinite(p.riskPct) ? p.riskPct : (1 - p.stop / p.price) * 100;
    const todo = p.stage === 'Breakout'
      ? (p.action === 'BUY' ? `Buy at the next open, near <b>${fmt.px(p.price)}</b>. Put the stop loss at <b>${fmt.px(p.stop)}</b>, ${fmt.pct(risk)} below. The plan takes profit at <b>${fmt.px(p.target)}</b>.${isFinite(p.size) ? ` To risk only 1% of your capital, put about <b>${fmt.pct(p.size, 0)}</b> of it in this trade.` : ''}` : `It broke out, but the engine rates it <b>${esc(p.action.toLowerCase())}</b> rather than buy. Wait for a cleaner entry.`)
      : p.stage === 'Retest' ? `The price is back at the old ceiling of <b>${fmt.px(p.level)}</b>. Buy only if it holds above that level and turns up. A close below <b>${fmt.px(p.stop)}</b> means the breakout failed.`
        : p.stage === 'Near' ? `Nothing to buy yet. Wait for a ${tfWord(p.tf).toLowerCase()} close above <b>${fmt.px(p.level)}</b>, ${fmt.pct((p.level / p.price - 1) * 100)} away.`
          : `The base is still building. Keep it on a watch list; the trigger is a close above <b>${fmt.px(p.level)}</b>.`;
    const c = p.conf;
    body.innerHTML = `
      <div class="xhero" style="margin-top:6px">
        <div class="id">${mono(p.sym, 'lg')}<div style="min-width:0"><div class="t">${esc(p.sym)}</div><div class="s">${esc(p.name)}${p.sector ? ', ' + esc(p.sector) : ''}</div></div></div>
        <div class="pr"><span class="v tnum">${fmt.px(p.price)}</span><span class="small">${(p.price >= p.level ? fmt.sp((p.price / p.level - 1) * 100) + ' above' : fmt.pct((1 - p.price / p.level) * 100) + ' below')} the level</span></div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><span class="pill" style="background:color-mix(in srgb, ${st.c} 14%, transparent);color:${st.c === 'var(--ink-3)' ? 'var(--ink-2)' : st.c}"><i class="stage-ic" style="background:${st.c}"></i>${st.t}${q(st.g)}</span>${p.grade ? `<span class="pill">Grade ${esc(p.grade)}${q('grade')}</span>` : ''}<span class="pill brand">${tfWord(p.tf)} chart</span></div>
        <div class="h3" style="margin-top:14px">${esc(p.pattern)}</div>
        ${isFinite(p.stop) && isFinite(p.target) ? ruler({ stop: p.stop, entry: p.level, target: p.target, now: p.price }, { labels: ['Stop', 'Level', 'Target'] }) : ''}
      </div>
      <div class="verdict" style="background:var(--brand-soft);margin-top:12px"><div class="h" style="display:flex;gap:8px;align-items:center;color:var(--brand-ink)">${icon('target', 18)}What to do</div><p style="color:var(--ink)">${todo}</p>
        ${p.notes.length ? `<ul class="list-check" style="margin-top:6px">${p.notes.map(x => `<li>${icon('info', 16)}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}</div>
      ${c ? sec(`The odds${q('odds')}`, `${isFinite(c.hit) ? `<div class="stats">${statCell('Reached target', fmt.pct(c.hit, 0), 'before the stop')}${statCell('Profitable', fmt.pct(c.win, 0), 'at the exit')}${statCell('Per trade', `<span class="${c.avg >= 0 ? 'up' : 'dn'}">${fmt.sp(c.avg)}</span>`, 'after costs')}</div>` : ''}
        <div class="panel pad" style="margin-top:10px"><div class="h3">${esc(c.label || 'How similar setups did')}</div><p class="prose" style="margin:4px 0 0">${esc(c.text)}</p></div>`) : ''}
      ${sec('Chart', `<div class="panel pad"><div class="chart-head"><div><div class="v" id="q-v"></div><div class="w" id="q-w"></div></div><div class="d" id="q-d"></div></div><div id="q-chart"></div>
        <div class="legend"><span><i style="background:var(--brand)"></i>20-day avg</span><span><i style="background:var(--ai-solid)"></i>50-day avg</span><span style="color:var(--ink-3)"><i class="dash"></i>200-day avg</span></div></div>`)}
      ${sec('Setup check', `<div class="group">${checks(p)}</div>`, { p: 'What the scanner looked at before grading this setup.' })}
      ${isFinite(p.size) || isFinite(p.horizon) ? sec('Position size', `<div class="stats">${statCell('Risk', fmt.pct(risk), 'entry to stop')}${statCell('Size for 1% risk', isFinite(p.size) ? fmt.pct(p.size, 0) : '—', 'of your capital')}${statCell('Time limit', isFinite(p.horizon) ? `${fmt.int(p.horizon)} ${p.tf === 'W' ? 'weeks' : 'days'}` : '—', 'then exit')}</div>`) : ''}
      <div id="q-xray"></div>
      ${footNote()}`;
    settle(body);
    const ch = body.querySelector('#q-chart');
    fill(ch, () => api(`/chart/${encodeURIComponent(p.sym)}?limit=260`, 15), d => {
      const cs = withEmas(toCandles(d.candles));
      stops.push(priceChart(ch, cs, { levels: [{ v: p.level, label: 'Level', tone: 'brand', force: true }, { v: p.stop, label: 'Stop', tone: 'dn' }, { v: p.target, label: 'Target', tone: 'up' }], range: p.tf === 'W' ? 250 : 128, height: 270, head: { v: body.querySelector('#q-v'), d: body.querySelector('#q-d'), w: body.querySelector('#q-w') } }));
    }, '<div class="sk" style="height:300px"></div>');
    fill(body.querySelector('#q-xray'), () => api(`/app/xray-batch?symbols=${encodeURIComponent(p.sym)}`, 30), d => {
      const x = (d.items || {})[p.sym]; if (!x || !ok(x.score)) return;
      const t = scoreTone(x.score), col = t.k === 'warn' ? 'ai' : t.k;
      body.querySelector('#q-xray').innerHTML = sec('The company behind the chart', link(`xray/${encodeURIComponent(p.sym)}`, `<span class="mono" style="background:color-mix(in srgb, var(--${col}-solid) 16%, transparent);color:var(--${col});box-shadow:none;font-size:15px">${fmt.int(x.score)}</span><div class="main"><div class="t">X-Ray score ${fmt.int(x.score)}, ${t.t.toLowerCase()}</div><div class="s">${esc(clean(x.title || x.archetype || ''))}</div></div>${icon('chev', 18, 'chev')}`, 'row group'));
    }, '', { quiet: true });
  }
  return () => stops.forEach(f => f && f());
}

function checks(p) {
  const row = (pass, t, s) => `<div class="flag"><span class="ic" style="background:${pass === null ? 'var(--sunk)' : pass ? 'var(--up-soft)' : 'var(--dn-soft)'};color:${pass === null ? 'var(--ink-2)' : pass ? 'var(--up)' : 'var(--dn)'}">${icon(pass === null ? 'info' : pass ? 'check' : 'x', 16)}</span><div><div class="t">${t}</div><div class="s">${s}</div></div></div>`;
  const out = [];
  if (p.aboveTrend != null) out.push(row(!!p.aboveTrend, p.aboveTrend ? 'In a long-term uptrend' : 'Below its long-term trend', p.aboveTrend ? 'Price is above its 200-day average, so the breakout goes with the bigger trend.' : 'Breakouts against the bigger trend fail more often.'));
  if (isFinite(p.vol)) out.push(row(p.vol >= 1.5, `Volume ${fmt.x(p.vol, 1)}× normal`, p.vol >= 1.5 ? 'Heavy buying on the move, a sign that big investors are involved.' : 'Light volume. Breakouts on thin volume often fall back.'));
  if (isFinite(p.headroom)) out.push(row(p.headroom >= 1, p.headroom >= 1 ? 'Room to run' : 'Little room overhead', `The nearest old high is about ${fmt.x(p.headroom, 1)} average daily moves away.`));
  if (isFinite(p.rsi)) out.push(row(p.rsi >= 50 && p.rsi <= 75 ? true : p.rsi > 75 ? false : null, `RSI ${fmt.x(p.rsi, 0)}`, p.rsi > 75 ? 'Stretched. Buying after a sharp run raises the chance of a pullback.' : p.rsi >= 50 ? 'Healthy momentum, not overheated.' : 'Momentum is still soft.'));
  if (p.stage2) out.push(row(/stage 2/i.test(p.stage2) ? true : null, esc(p.stage2), /stage 2/i.test(p.stage2) ? 'The stock is in the advancing phase of its cycle.' : 'Not yet in a confirmed advance.'));
  if (isFinite(p.age) && p.stage === 'Breakout') out.push(row(p.age <= 3, p.age <= 1 ? 'Fresh breakout' : `Broke out ${fmt.int(p.age)} ${p.tf === 'W' ? 'weeks' : 'sessions'} ago`, p.age <= 3 ? 'Still close to the level, so the stop is near.' : 'Further from the level, so the stop is further away too.'));
  return out.join('') || row(null, 'No checks available', 'The scanner did not record its checks for this setup.');
}
