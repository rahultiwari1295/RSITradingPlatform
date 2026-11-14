/* /rahul/stock/SYM — everything about one stock on one page, for the owner:
   what to do (plain words), my position, the AI call (open or just closed), the chart with my entry / call entry /
   stop / target drawn on it, a technical read-out, recent news, and buy / sell. */
import { api, chrome, fill, fmt, esc, icon, ok, link, mono, delta, tone, engineBadge, engineName, callPath, scoreTone, clean, empty, skel, toDate } from '../core.js';
import { priceChart, toCandles, withEmas, ruler, settle } from '../charts.js';
import { sec, statCell, footNote } from './parts.js';
import { loadBook, enrich, technicals, TREND, STATUS, EXIT_DAYS } from './pfdata.js';
import { orderSheet, stopSheet } from './trade.js';
import { edgeStock, rsPill, cr, day } from './edgedata.js';
import { ownerSend } from '../core.js';
import { titleCase } from './today.js';

const SRC = ['Angel', 'Kite', 'Dhan', 'Manual'];
const rel = iso => { const t = toDate(iso); if (!t) return ''; const d = Math.round((Date.now() - t) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? d + ' days ago' : fmt.date(iso); };

export default async function stock(el, r) {
  const sym = r.arg.toUpperCase();
  const body = chrome(el, { title: sym, back: 'Portfolio', actions: '<button class="ib" data-refresh aria-label="Refresh" style="font-size:20px">↻</button>' });
  body.innerHTML = `<div id="sk">${skel(150, 1, 22)}${skel(110, 2, 16)}${skel(300, 1, 16)}</div>`;
  const root = body.querySelector('#sk');
  el.querySelector('[data-refresh]').onclick = () => load(true);
  load(false);

  async function load(fresh) {
    const [book, ch] = await Promise.all([loadBook(fresh), api(`/chart/${encodeURIComponent(sym)}?limit=420`, fresh ? 0 : 10).catch(() => null)]);
    const cs = ch ? withEmas(toCandles(ch.candles)) : [];
    const last = cs[cs.length - 1];
    let x = book.rows.find(y => String(y.symbol).toUpperCase() === sym);
    const held = !!x;
    if (!x) x = enrich([{ symbol: sym, qty: 0, avg: NaN, ltp: last ? last.c : NaN, parts: {}, value: 0, invested: 0, pnl: 0, pnl_pct: NaN, day_pct: last && cs.length > 1 ? (last.c / cs[cs.length - 2].c - 1) * 100 : NaN }], book.term)[0];
    draw(x, held, cs, technicals(cs));
  }

  function verdict(x, held, T) {
    const c = x.call, e = x.exitCall, tr = T ? TREND[T.trend] : null;
    if (x.status === 'exit') return ['dn', held ? 'Sell: the AI has exited' : 'The AI call is closed',
      `The AI closed this call on <b>${fmt.date(e.exitDate)}</b> at ${fmt.px(e.exit)} (${esc(e.reason.toLowerCase())}, ${fmt.sp(e.roi)} on the call).${held ? ` You still hold <b>${fmt.int(x.qty)}</b> shares. The reason for holding it under the AI plan is gone.` : ''}`];
    if (x.status === 'stop') return ['dn', 'At the stop', `Price ${fmt.px(x.ltp)} is at or below the stop of <b>${fmt.px(c.stop)}</b>. The AI call fails on a close below the stop.`];
    if (x.status === 'target') return ['up', 'Target reached', `Price ${fmt.px(x.ltp)} has reached the target of <b>${fmt.px(c.target)}</b>. The AI plans to take profit here.`];
    if (x.status === 'ai') { const toStop = (1 - c.stop / x.ltp) * 100, toTgt = (c.target / x.ltp - 1) * 100;
      return ['ai', held ? 'Hold: the AI call is open' : 'Open AI call', `Day ${fmt.int(c.days)} of the call. The stop is <b>${fmt.px(c.stop)}</b>, ${fmt.pct(toStop)} below the price, and the target is <b>${fmt.px(c.target)}</b>, ${fmt.pct(toTgt)} above.${held && isFinite(x.vsCall) && Math.abs(x.vsCall) >= 0.3 ? ` You paid ${fmt.sp(x.vsCall)} ${x.vsCall > 0 ? 'more' : 'less'} than the call entry, so your own risk to the stop is ${fmt.pct((1 - c.stop / x.avg) * 100)}.` : ''}`]; }
    return [tr ? tr[1] : '', tr ? `No AI call. ${tr[0]}` : 'No AI call', `${held ? 'This holding is not covered by an AI call, so there is no AI stop or target for it. ' : ''}${tr ? tr[2] : ''}`];
  }

  function draw(x, held, cs, T) {
    const c = x.call, e = x.exitCall, st = STATUS[x.status];
    const [vt, vh, vp] = verdict(x, held, T);
    const canTrade = true, sellable = Object.keys(x.parts || {}).some(k => k !== 'Manual');
    const parts = SRC.filter(k => x.parts && x.parts[k]);
    const stt = (k, v, d = '') => statCell(k, v, d);
    const lvl = (k, cls) => `<span class="${cls}">${k}</span>`;
    root.innerHTML = `
      <div class="xhero" style="margin-top:6px">
        <div class="id">${mono(sym, 'lg')}<div style="min-width:0"><div class="t">${esc(sym)}</div><div class="s">${c ? esc(c.name) + (c.sector ? ', ' + esc(c.sector) : '') : e ? esc(e.name) : held ? parts.join(' + ') : 'Not in your portfolio'}</div></div></div>
        <div class="pr"><span class="v tnum">${fmt.px(x.ltp)}</span>${delta(x.day_pct, 2)}<span class="small">today</span></div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><span class="pill ${st.cls}">${st.t}${c ? ` · day ${fmt.int(c.days)}` : ''}</span>${c ? engineBadge(c, 'lg') : ''}${held ? `<span class="pill">You hold ${fmt.x(x.qty, x.qty % 1 ? 2 : 0)}</span>` : ''}${T ? `<span class="pill ${TREND[T.trend][1]}">${TREND[T.trend][0]}</span>` : ''}</div>
        ${c ? `<div style="margin-top:6px">${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: x.ltp })}</div>` : ''}
      </div>
      <div class="verdict sk-v ${vt}" style="margin-top:12px"><div class="h">${esc(vh)}</div><p style="color:var(--ink)">${vp}</p></div>
      <div class="sk-act">${canTrade ? `<button class="btn block" data-buy>${held ? 'Buy more' : 'Buy'}</button>` : ''}${sellable ? `<button class="btn block ${x.status === 'exit' || x.status === 'stop' ? 'sell' : 'quiet'}" data-sell>Sell</button>` : ''}${held && c && sellable && x.status === 'ai' ? `<button class="btn block quiet" data-stop>Set stop</button>` : ''}</div>
      <div id="k-warn"></div>

      ${held ? sec('Your position', `<div class="stats four">
          ${stt('Your entry', fmt.px(x.avg), `${fmt.x(x.qty, x.qty % 1 ? 2 : 0)} shares`)}
          ${stt('Value now', fmt.inr(x.value), `invested ${fmt.inr(x.invested)}`)}
          ${stt('Your P&amp;L', `<span class="${tone(x.pnl)}">${fmt.sinr(x.pnl)}</span>`, fmt.sp(x.pnl_pct))}
          ${stt('Today', `<span class="${tone(x.day_pct)}">${fmt.sp(x.day_pct)}</span>`, isFinite(x.day_pct) && x.day_pct !== null ? fmt.sinr(x.value - x.value / (1 + x.day_pct / 100)) : '')}
        </div>${parts.length > 1 || parts[0] ? `<div class="sk-brk">${parts.map(k => `<span><i class="${k.toLowerCase()}">${k}</i> ${fmt.x(x.parts[k].qty, x.parts[k].qty % 1 ? 2 : 0)} at ${fmt.px(x.parts[k].avg)}</span>`).join('')}</div>` : ''}`) : ''}

      ${c ? sec('The AI call', `<div class="stats four">
          ${stt('Call entry', fmt.px(c.entry), `${fmt.date(c.entryDate)}${held && isFinite(x.vsCall) ? ` · you paid ${fmt.sp(x.vsCall)}` : ''}`)}
          ${stt('Stop loss', `<span class="dn">${fmt.px(c.stop)}</span>`, `${fmt.sp((c.stop / x.ltp - 1) * 100)} from here`)}
          ${stt('Target', `<span class="up">${fmt.px(c.target)}</span>`, `${fmt.sp((c.target / x.ltp - 1) * 100)} from here`)}
          ${stt('Call so far', `<span class="${tone(c.roi)}">${fmt.sp(c.roi)}</span>`, `day ${fmt.int(c.days)}`)}
        </div>${c.why ? `<div class="panel pad" style="margin-top:10px"><p class="lede" style="margin:0">${esc(c.why)}</p></div>` : ''}`, { more: link(callPath(c), 'Full call', 'more') })
      : e ? sec('The AI call (closed)', `<div class="stats four">
          ${stt('Call entry', fmt.px(e.entry), fmt.date(e.entryDate))}
          ${stt('AI exit', fmt.px(e.exit), `${fmt.date(e.exitDate)} · ${rel(e.exitDate)}`)}
          ${stt('Call result', `<span class="${tone(e.roi)}">${fmt.sp(e.roi)}</span>`, esc(e.reason))}
          ${stt('Since the exit', held || isFinite(x.ltp) ? `<span class="${tone(x.ltp / e.exit - 1)}">${fmt.sp((x.ltp / e.exit - 1) * 100)}</span>` : '—', 'price move after the AI sold')}
        </div>`, { more: link(`calls/closed/${encodeURIComponent(e.id)}`, 'Closed trade', 'more') }) : ''}

      ${sec('Chart', `<div class="panel pad"><div class="chart-head"><div><div class="v" id="k-v"></div><div class="w" id="k-w"></div></div><div class="d" id="k-d"></div></div><div id="k-chart"></div>
        <div class="legend"><span><i style="background:var(--brand)"></i>20-day avg</span><span><i style="background:var(--ai-solid)"></i>50-day avg</span><span style="color:var(--ink-3)"><i class="dash"></i>200-day avg</span></div></div>`, { p: 'Lines show your entry and the call levels. Hold and drag to read any day.' })}

      ${T ? sec('Trend and technicals', `<div class="sk-tech">
          <div class="sk-tr ${TREND[T.trend][1]}"><b>${TREND[T.trend][0]}</b><span>${TREND[T.trend][2]}${T.rising20 != null ? ` The 20-day average is ${T.rising20 ? 'rising' : 'falling'}.` : ''}</span></div>
          <div class="sk-grid">
            ${[['vs 20-day avg', T.d20], ['vs 50-day avg', T.d50], ['vs 200-day avg', T.d200]].map(([k, v]) => `<div><span>${k}</span><b class="tnum ${tone(v)}">${fmt.sp(v)}</b></div>`).join('')}
            <div><span>RSI (14)</span><b class="tnum ${T.rsi >= 70 ? 'warn' : T.rsi <= 30 ? 'dn' : ''}">${fmt.x(T.rsi, 0)}</b><small>${T.rsi >= 70 ? 'overbought' : T.rsi <= 30 ? 'oversold' : 'normal'}</small></div>
            <div><span>Volume today</span><b class="tnum">${isFinite(T.vol) ? fmt.x(T.vol, 1) + '×' : '—'}</b><small>of its 20-day average</small></div>
            <div><span>Daily swing (ATR)</span><b class="tnum">${fmt.pct(T.atrPct)}</b><small>typical day's range</small></div>
            ${[['1 week', T.r5], ['1 month', T.r21], ['3 months', T.r63], ['1 year', T.r250]].map(([k, v]) => `<div><span>${k}</span><b class="tnum ${tone(v)}">${fmt.sp(v)}</b></div>`).join('')}
          </div>
          <div class="sk-52"><div class="sk-52h"><span>52-week low ${fmt.px(T.lo)}</span><span>${fmt.sp(T.offHigh)} from the high</span><span>52-week high ${fmt.px(T.hi)}</span></div><div class="sk-52b"><i style="left:${Math.max(0, Math.min(100, T.pos52))}%"></i></div></div>
        </div>`) : ''}
      <div id="k-edge"></div>
      <div id="k-ask"></div>
      <div id="k-xray"></div>
      <div id="k-news"></div>
      ${footNote(`Private page. "Exit call" means the AI closed its call in the last ${EXIT_DAYS} days.`)}`;
    settle(body);

    const call = c || null;
    root.querySelector('[data-buy]')?.addEventListener('click', () => orderSheet({ sym, side: 'BUY', call, onDone: okd => okd && load(true) }));
    root.querySelector('[data-sell]')?.addEventListener('click', () => orderSheet({ sym, side: 'SELL', call, broker: Object.keys(x.parts || {}).find(k => k !== 'Manual'), onDone: okd => okd && load(true) }));

    root.querySelector('[data-stop]')?.addEventListener('click', () => { const b = Object.keys(x.parts || {}).find(k => k !== 'Manual'); stopSheet({ sym, broker: b, qty: x.parts[b].qty, stop: c.stop, ltp: x.ltp }); });
    edgeBox(x, held, c);
    askBox(x, held, c);

    const chartEl = root.querySelector('#k-chart');
    if (cs.length > 20) {
      const levels = [];
      if (c) levels.push({ v: c.target, label: 'Target', tone: 'up', force: true }, { v: c.entry, label: 'Call entry', tone: 'ink', dash: '2 3', force: true }, { v: c.stop, label: 'Stop', tone: 'dn', force: true });
      else if (e) levels.push({ v: e.entry, label: 'Call entry', tone: 'mute', dash: '2 3' }, { v: e.exit, label: 'AI exit', tone: 'dn', force: true });
      if (held && isFinite(x.avg)) levels.push({ v: x.avg, label: 'Your entry', tone: 'brand', force: true });
      const stop = priceChart(chartEl, cs, { levels, mark: c && c.entryDate ? { t: c.entryDate, label: 'Call' } : e && e.exitDate ? { t: e.exitDate, label: 'AI exit' } : null, range: 128, height: 290,
        head: { v: root.querySelector('#k-v'), d: root.querySelector('#k-d'), w: root.querySelector('#k-w') } });
      el._stops = (el._stops || []).concat(stop);
    } else chartEl.innerHTML = empty('chart', 'No price history', 'The chart for this stock is not available right now.');

    fill(root.querySelector('#k-xray'), () => api(`/app/xray-batch?symbols=${encodeURIComponent(sym)}`, 30), d => {
      const xr = (d.items || {})[sym];
      if (!xr || !ok(xr.score)) return;
      const s2 = scoreTone(xr.score);
      root.querySelector('#k-xray').innerHTML = sec('The company', link(`xray/${encodeURIComponent(sym)}`, `<span class="mono" style="--h:220;background:color-mix(in srgb, var(--${s2.k === 'warn' ? 'ai' : s2.k}-solid) 16%, transparent);color:var(--${s2.k === 'warn' ? 'ai' : s2.k});box-shadow:none;font-size:15px">${fmt.int(xr.score)}</span>
        <div class="main"><div class="t">X-Ray score ${fmt.int(xr.score)}, ${s2.t.toLowerCase()}</div><div class="s">${esc(clean(xr.title || xr.archetype || ''))}</div></div>${icon('chev', 18, 'chev')}`, 'row group'));
    }, '', { quiet: true });

    fill(root.querySelector('#k-news'), () => api(`/intel2/stock/${encodeURIComponent(sym)}`, 15), d => {
      const seen = new Set(), L = (d.timeline || []).filter(n => { const k = String(n.type) + '|' + String(n.headline || '').toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
      if (!L.length) return;
      const dot = s => (s === 'positive' ? 'up' : s === 'negative' ? 'dn' : '');
      root.querySelector('#k-news').innerHTML = sec('Recent news and filings', `<div class="group">${L.map(n => { const line = String(n.summary || n.headline || '').split('\n').filter(Boolean)[0] || '';
        const inner = `<span class="sk-nd ${dot(n.sentiment)}"></span><div class="main"><div class="t">${esc(clean(n.label || String(n.type || '').replace(/_/g, ' ')))}</div><div class="s">${esc(line)}</div><div class="small">${esc(n.source || '')} · ${rel(n.ts)}</div></div>`;
        return n.url ? `<a class="row sk-n" href="${esc(n.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="row sk-n">${inner}</div>`; }).join('')}</div>`, { more: link(`xray/${encodeURIComponent(sym)}`, 'All filings', 'more') });
    }, '', { quiet: true });
  }

  function edgeBox(x, held, c) {
    fill(root.querySelector('#k-edge'), () => edgeStock(sym), d => {
      const box = root.querySelector('#k-edge'), W = root.querySelector('#k-warn');
      if (!d || !d.symbol) return;
      if (W && (d.warnings || []).length) W.innerHTML = `<div class="sk-warn">${d.warnings.map(w => `<div class="${w.level === 'bad' ? 'dn' : 'warn'}">${icon(w.level === 'bad' ? 'alert' : 'clock', 15)}<span>${esc(w.text)}${w.d ? ` <i>${day(w.d)}</i>` : ''}</span></div>`).join('')}</div>`;
      const e = d.earnings, o = d.owners, dl = d.delivery, cell = (k, v, sm = '') => `<div><span>${k}</span><b class="tnum">${v}</b>${sm ? `<small>${sm}</small>` : ''}</div>`;
      const chg = v => (v == null ? '' : `<span class="${tone(v)}">${fmt.sp(v, 2)}</span> last quarter`);
      box.innerHTML = sec('Edge read', `<div class="sk-tech"><div class="sk-grid">
          ${cell('Strength rank', d.rs ? fmt.int(d.rs) + ' / 99' : '—', d.rs ? (d.rs >= 80 ? 'a market leader' : d.rs >= 50 ? 'better than most' : d.rs >= 30 ? 'weaker than most' : 'among the weakest') : 'not liquid enough')}
          ${cell('Sector', d.sector_rank ? `#${d.sector_rank} of ${d.sectors}` : '—', esc(d.sector || ''))}
          ${e ? cell(`Results (${esc(e.quarter)})`, `<span class="${e.score >= 65 ? 'up' : e.score <= 35 ? 'dn' : ''}">${fmt.int(e.score)} / 100</span>`, e.fresh ? 'latest quarter' : 'older quarter, new one not in yet') : ''}
          ${e ? cell('Sales, yearly', `<span class="${tone(e.sales_yoy)}">${fmt.sp(e.sales_yoy, 0)}</span>`, `₹${fmt.int(e.sales_cr)} cr`) : ''}
          ${e ? cell('Profit, yearly', e.turnaround ? '<span class="up">Turned positive</span>' : e.profit_yoy == null ? '—' : `<span class="${tone(e.profit_yoy)}">${fmt.sp(e.profit_yoy, 0)}</span>`, `₹${fmt.int(e.profit_cr)} cr`) : ''}
          ${e && e.result_date ? cell('Price on the result', `<span class="${tone(e.react)}">${fmt.sp(e.react)}</span>`, `${day(e.result_date)} · ${fmt.sp(e.since)} since`) : ''}
          ${o && o.promoter != null ? cell('Promoters', fmt.x(o.promoter, 1) + '%', chg(o.promoter_chg)) : ''}
          ${o && o.fii != null ? cell('Foreign funds', fmt.x(o.fii, 1) + '%', chg(o.fii_chg)) : ''}
          ${o && o.dii != null ? cell('Indian funds', fmt.x(o.dii, 1) + '%', chg(o.dii_chg)) : ''}
          ${o && o.pledge != null ? cell('Promoter pledge', `<span class="${o.pledge >= 20 ? 'dn' : ''}">${fmt.x(o.pledge, 0)}%</span>`, 'of promoter shares') : ''}
          ${dl ? cell('Delivery, 5 days', fmt.x(dl.deliv5, 0) + '%', `was ${fmt.x(dl.deliv30, 0)}% · ${fmt.x(dl.qty_x, 1)}× shares`) : ''}
        </div>
        ${(d.smart || []).length ? `<div class="sk-smart">${d.smart.map(b => `<div><b>${esc(titleCase(b.party))}</b> bought ${cr(b.cr)} on ${day(b.d)}. Their past buys beat the market ${fmt.x(b.win, 0)}% of the time (${b.scored} buys).</div>`).join('')}</div>` : ''}
        ${(o && o.insider || []).length ? `<div class="sk-smart">${o.insider.slice(0, 3).map(i => `<div>${day(i.d)}: ${esc(i.text)}</div>`).join('')}</div>` : ''}</div>`, { p: `Built ${day(d.as_of)} from prices and filings.`, more: link('edge', 'Edge lists', 'more') });
    }, '', { quiet: true });
  }

  function askBox(x, held, c) {
    const box = root.querySelector('#k-ask');
    const QS = held ? ['Should I be worried about anything here?', 'What changed in the last results?', 'What are the main risks?'] : ['What does this company do and how is it doing?', 'What changed in the last results?', 'What are the main risks?'];
    box.innerHTML = sec('Ask about this stock', `<div class="panel pad sk-ask">
        <div class="hs" style="margin-bottom:8px">${QS.map(q => `<button class="chip sm" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <div class="sk-askrow"><input id="k-q" placeholder="Type a question about ${esc(sym)}" maxlength="300"><button class="btn sm" data-ask>Ask</button></div>
        <button class="btn sm quiet block" data-read style="margin-top:8px">Read the latest results filing for me</button>
        <div id="k-ans"></div></div>`, { p: 'Answers come from your own data on this stock: prices, results, ownership and filings.' });
    const ans = box.querySelector('#k-ans'), inp = box.querySelector('#k-q');
    const pos = held ? { qty: x.qty, avg_price: x.avg, value: x.value, pnl_pct: x.pnl_pct } : null;
    const call = c ? { entry: c.entry, stop: c.stop, target: c.target, days: c.days, entry_date: c.entryDate } : x.exitCall ? { closed_on: x.exitCall.exitDate, exit: x.exitCall.exit, reason: x.exitCall.reason } : null;
    const run = async (path, bodyJ, title) => {
      ans.innerHTML = `<div class="sk" style="height:90px;border-radius:12px;margin-top:10px"></div>`;
      try { const d = await ownerSend('POST', path, bodyJ); const text = d.answer || d.summary || '';
        ans.innerHTML = `<div class="sk-ans"><div class="small">${esc(title)}${d.headline ? ' · ' + esc(d.headline) + ' (' + day(d.date) + ')' : ''}</div>${text.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^#+\s*(.+)$/gm, '<b>$1</b>').replace(/\n/g, '<br>')}</p>`).join('')}</div>`; }
      catch (e) { ans.innerHTML = `<p class="ot-warn" style="margin-top:10px">${esc(e.message)}</p>`; }
    };
    const ask = q => { q = String(q || '').trim(); if (q.length < 3) return; inp.value = q; run('/owner/ask', { symbol: sym, question: q, position: pos, call }, q); };
    box.querySelector('[data-ask]').onclick = () => ask(inp.value);
    inp.onkeydown = e => { if (e.key === 'Enter') ask(inp.value); };
    box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => ask(b.dataset.q));
    box.querySelector('[data-read]').onclick = () => run('/owner/read', { symbol: sym }, 'Latest results filing');
  }
  return () => (el._stops || []).forEach(f => f && f());
}
