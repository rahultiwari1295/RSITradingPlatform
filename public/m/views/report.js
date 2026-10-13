import { api, chrome, fill, fmt, esc, icon, n, ok, link, mono, delta, tone, share, scoreTone, scoreColor, clean, sentence, recent, q, loadTerminal, loadPatterns, holdings, toast, sheet, empty } from '../core.js';
import { priceChart, toCandles, withEmas, dial, barChart } from '../charts.js';
import { sec, statCell, footNote, STAGE } from './parts.js';

const QUESTIONS = { q1: 'Should I buy it now?', q2: 'Where is it heading in the next few weeks?', q3: 'Is the business strong?', q4: 'Does it carry too much debt?', q5: 'Are big investors buying?', q6: 'Is it cheap or expensive?', q7: 'Any red flags?' };
const PILLARS = [['trend', 'Trend'], ['momentum', 'Momentum'], ['volume', 'Volume'], ['quality', 'Quality']];

export default async function report(el, r) {
  const sym = r.arg.toUpperCase().replace(/[^A-Z0-9&_-]/g, '');
  const body = chrome(el, { title: sym, back: 'X-Ray', actions: `<button class="ib" data-share aria-label="Share this report">${icon('share', 20)}</button>` });
  el.querySelector('.head').remove();
  el.querySelector('[data-share]').onclick = () => share(`${sym} X-Ray`, `QuantSync X-Ray of ${sym}`);
  const stops = [];
  fill(body, () => api(`/dna/report/${encodeURIComponent(sym)}`, 15), rep => {
    if (!rep || rep.error || !rep.ui_report) { body.innerHTML = `<div style="margin-top:12px">${empty('xray', `No X-Ray for ${sym} yet`, 'We could not find a report for this symbol. Check the spelling, or search by company name.', link('xray', 'Search stocks', 'btn ghost sm'))}</div>`; return; }
    recent.add(sym, clean(rep.company_name || ''));
    draw(rep);
  }, `<div class="sk" style="height:360px;border-radius:22px;margin-top:8px"></div><div class="sk" style="height:200px;border-radius:16px;margin-top:12px"></div>`);

  function draw(rep) {
    const u = rep.ui_report || {}, m = rep.current_metrics || {}, f = rep.fundamentals || {}, qs = rep.questions || {};
    const score = n(u.dna_health_score ?? u.score_breakdown?.total), st = scoreTone(score), pil = u.score_breakdown?.pillars || {};
    const name = clean(rep.company_name || sym), sector = clean(rep.sector || '');
    const tcard = u.trade_execution_card || {}, q1 = qs.q1 || {};
    const stance = String(rep.stance || u.stance || '').toUpperCase();
    const sk = stance === 'BULLISH' ? 'up' : stance === 'BEARISH' ? 'dn' : 'warn';
    const bs = u.beginner_summary || {};
    el.querySelector('.bar .bt').textContent = sym;
    body.innerHTML = `
      <div class="xhero" style="margin-top:6px">
        <div class="id">${mono(sym, 'lg')}<div style="min-width:0"><div class="t">${esc(name)}</div><div class="s">${esc(sym)}${sector && sector !== 'NSE Equities' ? ', ' + esc(sector) : ''}</div></div></div>
        <div class="pr"><span class="v tnum" id="x-px">${fmt.px(m.price)}</span><span id="x-ch"></span><span class="small" id="x-when">at the last close</span></div>
        <div class="dialbox">
          <div class="dial">${dial(pil, score)}<div class="c"><div><b style="color:${scoreColor(score)}">${fmt.int(score)}</b><span>${st.t}${q('xray')}</span></div></div></div>
          <div class="pillars">${PILLARS.filter(([k]) => pil[k]).map(([k, l]) => `<div class="pl"><div class="k"><span>${l}</span><span>${fmt.int(pil[k].score)} of ${fmt.int(pil[k].max)}</span></div><div class="bar"><i style="width:${Math.max(2, n(pil[k].score) / n(pil[k].max) * 100)}%;background:${scoreColor(n(pil[k].score) / n(pil[k].max) * 100)}"></i></div></div>`).join('')}</div>
        </div>
        <div class="verdict"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="pill ${sk}">${stance === 'BULLISH' ? 'Positive' : stance === 'BEARISH' ? 'Negative' : 'Neutral'}</span>${u.dna_archetype ? `<span class="small">${esc(clean(u.dna_archetype).split('·')[0])}</span>` : ''}</div>
          <div class="h" style="margin-top:8px">${esc(clean(rep.action_title || u.action_title || q1.pill || ''))}</div>${q1.answer ? `<p>${esc(sentence(q1.answer))}</p>` : ''}</div>
        <button class="btn ghost block" data-add style="margin-top:14px">${icon('plus', 18)}Add to portfolio</button>
      </div>
      <div id="x-engines"></div>
      ${bs.what_is_happening ? sec('In plain words', `<div class="story">${[['eye', 'var(--brand)', 'What is happening', bs.what_is_happening], ['target', 'var(--up)', 'The opportunity', bs.the_opportunity], ['alert', 'var(--dn)', 'The danger', bs.the_danger]].filter(x => x[3]).map(([ic, c, h, p]) => `<div><span class="ic" style="background:color-mix(in srgb, ${c} 14%, transparent);color:${c}">${icon(ic, 17)}</span><div><div class="h">${h}</div><p>${esc(sentence(p))}</p></div></div>`).join('')}</div>`) : ''}
      ${levels(q1, tcard)}
      ${sec('Chart', `<div class="panel pad"><div class="chart-head"><div><div class="v" id="r-v"></div><div class="w" id="r-w"></div></div><div class="d" id="r-d"></div></div><div id="r-chart"></div>
        <div class="legend"><span><i style="background:var(--brand)"></i>20-day avg</span><span><i style="background:var(--ai-solid)"></i>50-day avg</span><span style="color:var(--ink-3)"><i class="dash"></i>200-day avg</span></div></div>`)}
      ${Object.keys(QUESTIONS).some(k => qs[k]) ? sec('Seven questions, answered', `<div class="qa">${Object.entries(QUESTIONS).filter(([k]) => qs[k]).map(([k, t], i) => {
        const x = qs[k], tk = x.type === 'bullish' ? 'up' : x.type === 'bearish' ? 'dn' : 'warn';
        return `<details${i === 0 ? ' open' : ''}><summary><span class="q">${t}</span><span class="a">${esc(clean(x.pill))}</span><span class="dot"><span class="pill ${tk}" style="height:22px;padding:0 8px">${tk === 'up' ? 'Good' : tk === 'dn' ? 'Bad' : 'Okay'}</span></span></summary>
          <div class="body">${esc(sentence(x.answer || ''))}${x.compass && clean(x.compass) !== clean(x.answer) ? `<p style="margin:8px 0 0">${esc(sentence(x.compass))}</p>` : ''}${x.metric ? `<span class="metric">${esc(clean(x.metric))}</span>` : ''}</div></details>`;
      }).join('')}</div>`) : ''}
      ${reasons(u)}
      ${baseRate(m)}
      ${timeframes(u.multi_timeframe)}
      ${fundamentals(f)}
      ${holders(f.shareholding_pattern)}
      ${solvency(rep.solvency)}
      ${peers(rep.peers)}
      ${catalysts(rep.catalysts)}
      ${footNote(`Report from ${fmt.date(rep.report_date || rep.cache_updated_at, { day: 'numeric', month: 'long', year: 'numeric' })}. Financials from company filings.`)}`;

    const cs = withEmas(toCandles(rep.chart_candles));
    const chEl = body.querySelector('#r-chart');
    if (cs.length > 5) {
      const lv = [];
      if (ok(tcard.stop_loss)) lv.push({ v: n(tcard.stop_loss), label: 'Stop', tone: 'dn' });
      if (ok(tcard.target_1)) lv.push({ v: n(tcard.target_1), label: 'Target', tone: 'up' });
      ((rep.chart_directives || {}).horizontal_levels || []).filter(h => !/current/i.test(h.label || '')).slice(0, 2).forEach(h => { if (ok(h.price) && !lv.some(x => Math.abs(x.v / n(h.price) - 1) < .01)) lv.push({ v: n(h.price), label: levelName(h.label), tone: 'mute' }); });
      stops.push(priceChart(chEl, cs, { levels: lv, range: 128, height: 270, head: { v: body.querySelector('#r-v'), d: body.querySelector('#r-d'), w: body.querySelector('#r-w') } }));
    } else chEl.innerHTML = '<p class="small">No price history for this stock yet.</p>';

    /* annual bars */
    const inc = (f.annual_income_statement || {});
    const row = k => (inc.rows || []).find(x => new RegExp(k, 'i').test(x.metric || ''));
    const yrs = inc.years || [], sales = row('^sales|revenue'), prof = row('net profit');
    const fin = body.querySelector('#f-sales');
    if (fin && sales) {
      const items = yrs.map((y, i) => ({ label: y === 'TTM' ? 'TTM' : "'" + String(y).slice(-2), full: y, v: n(sales.values[i]), color: 'var(--brand)', sub: prof ? 'profit ' + fmt.cr(prof.values[i]) : '' })).filter(x => isFinite(x.v)).slice(-10);
      stops.push(barChart(fin, items, { fmt: v => fmt.cr(v), height: 150, label: 'Yearly sales' }));
    }
    const qp = (f.quarterly_performance || []).slice(-8), qEl = body.querySelector('#f-q');
    if (qEl && qp.length) stops.push(barChart(qEl, qp.map(x => ({ label: String(x.quarter).replace(/^(\w{3}) 20(\d\d)$/, "$1 '$2").split(' ')[0], full: x.quarter, v: n(x.net_profit_cr), color: n(x.net_profit_cr) >= 0 ? 'var(--up-solid)' : 'var(--dn-solid)', sub: `sales ${fmt.cr(x.sales_cr)}` })), { fmt: v => fmt.cr(v), height: 130, label: 'Quarterly profit' }));

    /* live quote */
    api(`/stock/quote/${encodeURIComponent(sym)}`, 2).then(qd => {
      if (!ok(qd.price) || !body.isConnected) return;
      body.querySelector('#x-px').textContent = fmt.px(qd.price);
      const ch = ok(qd.prev_close) ? (n(qd.price) / n(qd.prev_close) - 1) * 100 : n(qd.change_pct);
      body.querySelector('#x-ch').innerHTML = delta(ch, 2);
      body.querySelector('#x-when').textContent = qd.live ? 'today' : 'at the last close';
    }).catch(() => {});

    /* what our engines say */
    Promise.all([loadTerminal().catch(() => null), loadPatterns().catch(() => null)]).then(([t, p]) => {
      const c = t && (t.toBuy.find(x => x.sym === sym) || t.active.find(x => x.sym === sym));
      const pt = p && p.rows.find(x => x.sym === sym);
      const rows = [];
      if (c) rows.push(link(`calls/${encodeURIComponent(sym)}`, `<span class="mono" style="background:var(--ai-soft);color:var(--ai);box-shadow:none">${icon('ai', 18)}</span><div class="main"><div class="t">${c.days === 0 ? 'New AI buy call today' : `Open AI call, day ${fmt.int(c.days)}`}</div><div class="s">${esc(c.strategy)}, ${fmt.sp(c.roi)} since entry</div></div>${icon('chev', 18, 'chev')}`, 'row'));
      if (pt) rows.push(link(`patterns/${encodeURIComponent(sym)}?tf=${pt.tf}`, `<span class="mono" style="background:var(--up-soft);color:var(--up);box-shadow:none">${icon('pattern', 18)}</span><div class="main"><div class="t">${STAGE[pt.stage].t}: ${esc(pt.pattern)}</div><div class="s">Level ${fmt.px(pt.level)}${pt.grade ? ', grade ' + esc(pt.grade) : ''}</div></div>${icon('chev', 18, 'chev')}`, 'row'));
      if (rows.length && body.isConnected) body.querySelector('#x-engines').innerHTML = sec('Our engines on this stock', `<div class="group">${rows.join('')}</div>`);
    });

    body.querySelector('[data-add]').onclick = () => addSheet(sym, n(m.price));
  }
  return () => stops.forEach(f => f && f());
}

const levelName = l => { const s = clean(l || '').toLowerCase(); return /breakout|trigger/.test(s) ? 'Breakout' : /neck/.test(s) ? 'Neckline' : /support|floor/.test(s) ? 'Support' : /resist|roof/.test(s) ? 'Resistance' : /200/.test(s) ? '200-day' : /fib|0\.6/.test(s) ? 'Fib' : 'Level'; };
function levels(q1, t) {
  const z = [];
  if (q1.dip_price) z.push(['br', 'Buy on a dip', q1.dip_price, q1.dip_sub]);
  if (q1.breakout_price) z.push(['up', 'Or above', String(q1.breakout_price).replace(/^Above\s*/i, ''), q1.breakout_sub]);
  if (q1.stop_price || ok(t.stop_loss)) z.push(['dn', 'Stop loss', q1.stop_price || fmt.px(t.stop_loss), q1.stop_sub]);
  const tg = [t.target_1, t.target_2].filter(ok);
  if (!z.length && !tg.length) return '';
  return sec('Price levels to watch', `${z.length ? `<div class="zones" style="margin-top:0">${z.map(([k, h, v, s]) => `<div class="zone ${k}"><div class="k">${esc(h)}</div><div class="v">${esc(clean(v))}</div>${s ? `<div class="tiny" style="color:var(--ink-2)">${esc(sentence(s))}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${tg.length || t.risk_to_reward_ratio ? `<div class="stats" style="margin-top:10px">${statCell('First target', fmt.px(t.target_1))}${statCell('Second target', fmt.px(t.target_2))}${statCell('Risk to reward', esc(clean(t.risk_to_reward_ratio || '—')), '', 'rr')}</div>` : ''}`,
    { p: 'From the X-Ray model, not an AI call. Use them to plan an entry and an exit.' });
}
function reasons(u) {
  const b = (u.why_buy_reasons || []).map(clean).filter(Boolean), a = (u.why_avoid_reasons || []).map(clean).filter(Boolean);
  if (!b.length && !a.length) return '';
  const li = (l, ic, c) => l.map(x => { const m = x.match(/^([^:]{3,40}):\s*(.+)$/); return `<li><span style="color:${c}">${icon(ic, 18)}</span><span>${m ? `<b style="font-weight:600">${esc(sentence(m[1]))}.</b> ${esc(sentence(m[2]))}` : esc(sentence(x))}</span></li>`; }).join('');
  return `<div class="wide-2">${b.length ? sec('Reasons to like it', `<div class="panel pad"><ul class="list-check">${li(b, 'check', 'var(--up)')}</ul></div>`) : ''}${a.length ? sec('Reasons to be careful', `<div class="panel pad"><ul class="list-check">${li(a, 'alert', 'var(--dn)')}</ul></div>`) : ''}</div>`;
}
function baseRate(m) {
  const b = m.base_rate; if (!b || !ok(b.p_positive_20d)) return '';
  const up = n(b.p_positive_20d) * 100;
  return sec(`The odds from history${q('baserate')}`, `<div class="panel pad"><div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:34px;font-weight:700;letter-spacing:-.04em" class="tnum ${up >= 55 ? 'up' : up < 45 ? 'dn' : ''}">${fmt.pct(up, 0)}</span><span class="small">rose over the next 20 sessions</span></div>
    <p class="prose" style="margin:6px 0 0">We found <b>${fmt.int(b.samples)}</b> past moments when a stock was ${esc(clean(b.state_text || 'in the same position'))}. In ${fmt.pct(up, 0)} of them the price was higher four weeks later${ok(b.median_ret_20d) ? `, with a typical move of ${fmt.sp(n(b.median_ret_20d) * (Math.abs(n(b.median_ret_20d)) < 1 ? 100 : 1))}` : ''}.</p></div>`);
}
function timeframes(mt) {
  if (!Array.isArray(mt) || !mt.length) return '';
  const col = d => ({ green: 'var(--up-solid)', red: 'var(--dn-solid)', amber: 'var(--ai-solid)', yellow: 'var(--ai-solid)' }[String(d).toLowerCase()] || 'var(--ink-3)');
  return sec('Short, medium and long term', `<div class="panel pad"><div class="mtf">${mt.map(x => `<div class="r"><span class="o" style="background:${col(x.dot)}"></span><div><div style="font-weight:600;font-size:15px">${esc(clean(x.tf))}</div><div class="small">${esc(clean(x.ma || ''))}</div></div><div style="text-align:right;font-size:13.5px;font-weight:600;max-width:46%">${esc(clean(x.bias || ''))}</div></div>`).join('')}</div></div>`);
}
function fundamentals(f) {
  const k = f.key_ratios || {};
  if (!Object.keys(k).length && !f.annual_income_statement) return '';
  const cg = f.compounded_growth || {};
  const growth = ['sales_growth', 'profit_growth', 'price_cagr'].filter(x => Array.isArray(cg[x]) && cg[x].length);
  const periods = growth.length ? cg[growth[0]].map(p => p.period).filter(p => /year/i.test(p)).slice(0, 3) : [];
  return sec('The business', `<div class="kv">${[['Market value', fmt.cr(f.market_cap_cr)], ['Price to earnings', ok(k.stock_pe) ? fmt.x(k.stock_pe, 1) : '—'], ['Return on capital', ok(k.roce_pct) ? fmt.pct(k.roce_pct) : '—'], ['Return on equity', ok(k.roe_pct) ? fmt.pct(k.roe_pct) : '—'], ['Dividend yield', ok(k.dividend_yield_pct) ? fmt.pct(k.dividend_yield_pct, 2) : '—'], ['Book value', ok(k.book_value) ? fmt.px(k.book_value) : '—']].map(([a, b]) => `<div><div class="k">${a}</div><div class="v">${b}</div></div>`).join('')}</div>
    ${f.annual_income_statement ? `<div class="panel pad" style="margin-top:12px"><div class="h3">Sales each year</div><p class="tiny" style="margin:2px 0 10px">Crore rupees. Hold a bar to see profit too.</p><div id="f-sales"></div></div>` : ''}
    ${(f.quarterly_performance || []).length ? `<div class="panel pad" style="margin-top:12px"><div class="h3">Profit each quarter</div><p class="tiny" style="margin:2px 0 10px">Last ${Math.min(8, f.quarterly_performance.length)} quarters, crore rupees.</p><div id="f-q"></div></div>` : ''}
    ${periods.length ? `<div class="group" style="margin-top:12px"><div class="row plain" style="min-height:44px;font-size:12.5px;color:var(--ink-2);font-weight:600"><div class="main">Growth per year</div>${periods.map(p => `<div style="width:62px;text-align:right">${esc(p.replace(/ years?/i, 'y'))}</div>`).join('')}</div>
      ${growth.map(g => `<div class="row plain" style="min-height:46px"><div class="main" style="font-weight:600">${{ sales_growth: 'Sales', profit_growth: 'Profit', price_cagr: 'Share price' }[g]}</div>${periods.map(p => { const v = (cg[g].find(x => x.period === p) || {}).value; return `<div style="width:62px;text-align:right;font-weight:600" class="tnum ${tone(v)}">${esc(v || '—')}</div>`; }).join('')}</div>`).join('')}</div>` : ''}
    ${(f.pros || []).length || (f.cons || []).length ? `<div class="panel pad" style="margin-top:12px"><ul class="list-check">${(f.pros || []).map(x => `<li><span class="up">${icon('check', 18)}</span><span>${esc(sentence(x))}</span></li>`).join('')}${(f.cons || []).map(x => `<li><span class="dn">${icon('x', 18)}</span><span>${esc(sentence(x))}</span></li>`).join('')}</ul></div>` : ''}`);
}
function holders(sp) {
  if (!sp) return '';
  const list = ['Promoters', 'FIIs', 'DIIs', 'Public'].filter(k => sp[k] && ok(sp[k].holding_pct));
  if (!list.length) return '';
  const lab = { Promoters: 'Founders', FIIs: 'Foreign funds', DIIs: 'Indian funds', Public: 'Public' };
  const col = { Promoters: 'var(--brand)', FIIs: 'var(--ai-solid)', DIIs: 'var(--up-solid)', Public: 'var(--ink-3)' };
  const qtr = sp.Promoters?.quarter || '';
  return sec('Who owns it', `<div class="panel pad"><div class="hold">${list.map(k => { const x = sp[k], c = n(x.qoq_change); return `<div class="r"><span style="font-weight:600">${lab[k]}</span><span class="b"><i style="width:${n(x.holding_pct)}%;background:${col[k]}"></i></span><span class="p">${fmt.pct(x.holding_pct)}<span class="q ${tone(c)}">${isFinite(c) && c !== 0 ? fmt.sp(c, 2) : 'no change'}</span></span></div>`; }).join('')}</div>
    <p class="tiny" style="margin:12px 0 0">${qtr ? `As of ${esc(qtr)}. ` : ''}The small number is the change from the previous quarter.${sp['No. of Shareholders'] ? ` ${fmt.int(sp['No. of Shareholders'].holding_pct)} shareholders.` : ''}</p></div>`);
}
function solvency(s) {
  if (!s || !ok(s.score)) return '';
  return sec('Debt check', `<div class="panel pad" style="display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center"><div style="width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:${n(s.score) >= 70 ? 'var(--up-soft)' : n(s.score) >= 45 ? 'var(--warn-soft)' : 'var(--dn-soft)'};color:${n(s.score) >= 70 ? 'var(--up)' : n(s.score) >= 45 ? 'var(--warn)' : 'var(--dn)'};font-size:24px;font-weight:700" class="tnum">${fmt.int(s.score)}</div>
    <div><div class="h3">${esc(clean(s.grade || ''))}</div><p class="small" style="margin:2px 0 0">${esc(sentence(s.summary || ''))}</p></div>
    <div style="grid-column:1/-1" class="stats" >${statCell('Borrowings', esc(s.borrowings || s.debtLabel || '—'))}${statCell('Reserves', esc(s.reserves || '—'))}${statCell('Debt to equity', esc(s.de || '—'))}</div></div>`);
}
function peers(p) {
  if (!Array.isArray(p) || p.length < 2) return '';
  return sec('Compared with peers', `<div class="group">${p.slice(0, 6).map(x => link(`xray/${encodeURIComponent(x.symbol)}`, `${mono(x.symbol)}<div class="main"><div class="t">${esc(x.symbol)}${x.isCurrent ? ' <span class="pill" style="height:20px;font-size:11px;vertical-align:2px">This stock</span>' : ''}</div><div class="s">P/E ${esc(x.pe || '—')}, return on capital ${esc(x.roce || '—')}</div></div><div class="end"><div class="v tnum" style="color:${scoreColor(x.score)}">${fmt.int(x.score)}</div><div class="d faint">X-Ray</div></div>`, 'row')).join('')}</div>`);
}
function catalysts(c) {
  if (!c) return '';
  const news = (c.news || []).filter(x => x.title).slice(0, 5), chk = (c.checklist || []).slice(0, 6);
  return `${chk.length ? sec('Health checks', `<div class="group">${chk.map(x => `<div class="flag"><span class="ic" style="background:${x.pass ? 'var(--up-soft)' : 'var(--dn-soft)'};color:${x.pass ? 'var(--up)' : 'var(--dn)'}">${icon(x.pass ? 'check' : 'alert', 16)}</span><div><div class="t">${esc(sentence(x.item))}</div><div class="s">${esc(sentence(x.status || ''))}</div></div></div>`).join('')}</div>`) : ''}
    ${news.length ? sec('Recent news', `<div class="group">${news.map(x => `<div class="row plain"><div class="main"><div class="t" style="white-space:normal;font-size:15px;line-height:1.35">${esc(clean(x.title))}</div><div class="s">${esc(clean(x.source || ''))}${x.time ? ', ' + esc(String(x.time).split(',')[0]) : ''}</div></div>${x.tag ? `<span class="pill">${esc(clean(x.tag))}</span>` : ''}</div>`).join('')}</div>`) : ''}`;
}

export function addSheet(sym, price, onDone) {
  sheet(`<h3>Add ${esc(sym)} to your portfolio</h3><p>We will check it every day: its X-Ray score, its trend, and any AI or pattern call on it.</p>
    <form data-f><div class="field"><label for="h-q">Shares</label><input id="h-q" inputmode="decimal" placeholder="e.g. 50" required></div>
    <div class="field"><label for="h-p">Average buy price (₹)</label><input id="h-p" inputmode="decimal" placeholder="${isFinite(price) ? fmt.x(price, 2).replace(/,/g, '') : 'e.g. 1250'}" value="${isFinite(price) ? (+price).toFixed(2) : ''}"></div>
    <button class="btn block" type="submit">Add to portfolio</button></form>`, {
    label: 'Add to portfolio',
    onOpen: (s, close) => {
      s.querySelector('[data-f]').onsubmit = async e => {
        e.preventDefault();
        const qty = n(s.querySelector('#h-q').value), avg = n(s.querySelector('#h-p').value);
        if (!(qty > 0)) { s.querySelector('#h-q').focus(); return; }
        try {
          const cur = await holdings.get();
          const items = cur.items.filter(h => h.symbol !== sym).concat([{ symbol: sym, qty, avg_price: isFinite(avg) && avg > 0 ? avg : null }]);
          await holdings.set(items);
          close(); toast(`${sym} added to your portfolio`); onDone && onDone();
        } catch (er) { toast(er.message || 'Could not save. Try again.'); }
      };
    },
  });
}
