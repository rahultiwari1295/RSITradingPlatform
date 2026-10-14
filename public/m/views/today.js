import { reveal, api, chrome, fill, fmt, esc, icon, n, ok, clean, sentence, link, mono, delta, tone, marketStatus, loadTerminal, loadPatterns, sheet, q, count, toDate, auth, logo } from '../core.js';
import { spark, settle, areaChart } from '../charts.js';
import { patternCard, sparks, sec, labLink, footNote, statCell, signalList, scanRule, scanLogo, bindSignals, isFreshSignal } from './parts.js';

export default async function today(el) {
  const ms = marketStatus();
  const body = chrome(el, {
    title: 'Today',
    hero: { art: 'home', icon: icon('target', 16), ey: 'Today', h: 'QuantSync Scanner', hl: ['Scanner'], lede: 'What QuantSync found tonight, what the market did, and what it means for you.', extra: `<div class="when" style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2)"><span class="live-dot ${ms.open ? 'on' : ''}"></span><span id="t-when">${ms.text}</span></div>` },
    actions: `<a class="ib" href="/m/xray" data-nav aria-label="Search stocks">${icon('search', 21)}</a>`,
  });
  el.querySelector('.bar').insertAdjacentHTML('afterbegin', `<span class="bar-logo" style="padding-left:8px;display:flex">${logo(26)}</span>`);
  el.querySelector('.bar .sp')?.remove();

  body.innerHTML = `
    <div id="t-calls"></div>
    <section class="sec"><div class="sec-h"><h2>The market today</h2></div><div id="t-brief"></div></section>
    <div id="t-idx" class="tickers two" style="margin-top:10px"></div>
    <div id="t-record"></div>
    <div id="t-pat"></div>
    <div id="t-map"></div>
    <div class="wide-2"><div id="t-movers"></div><div id="t-news"></div></div>
    <section class="sec">${labLink()}</section>
    ${footNote('Market data is from the NSE close and the engines’ nightly run.')}`;

  /* the hero: Nifty today, in one card */
  const pulse = api('/intel/pulse', 5);
  const stopHero = [];
  fill(body.querySelector('#t-brief'), () => pulse, (d, slot) => {
    const p = d.nifty_profile || {};
    const px = n(p.price ?? d.nifty_price), ch = n(p.change_pct ?? d.nifty_chg_pct);
    const stance = sentence(clean(p.stance || d.sentiment || '').toLowerCase());
    const k = /bull/i.test(stance) ? 'up' : /bear/i.test(stance) ? 'dn' : 'warn';
    const adv = n(d.advances), dec = n(d.declines), tot = adv + dec;
    const pos = [ok(p.ema20) && (px > n(p.ema20) ? 'above' : 'below'), ok(p.ema200) && (px > n(p.ema200) ? 'above' : 'below')];
    const verb = !isFinite(ch) ? 'closed' : ch <= -1 ? 'fell' : ch < 0 ? 'slipped' : ch >= 1 ? 'jumped' : ch > 0 ? 'rose' : 'was flat';
    let where = '';
    if (pos[0] && pos[1]) where = pos[0] === pos[1] ? ` and is ${pos[0]} both its 20-day and 200-day averages` : ` and is ${pos[0]} its 20-day but ${pos[1]} its 200-day average`;
    const head = `Nifty ${verb}${isFinite(ch) && ch !== 0 ? ' ' + fmt.pct(Math.abs(ch), 1) : ''}${where}.`;
    const closes = (p.spark_closes || (d.indices || [])[0]?.spark || []).map(n).filter(isFinite);
    slot.innerHTML = `<div class="hero" style="--glow:${ch >= 0 ? "rgba(43,191,133,.22)" : "rgba(242,85,90,.2)"}">
      <div class="hero-top"><div><div class="hk">Nifty 50</div><div class="hv tnum">${count(px, 'idx')}</div><div class="hd ${tone(ch)}">${fmt.sp(ch, 2)} ${ok(p.change) ? `<span>(${n(p.change) > 0 ? '+' : '−'}${fmt.idx(Math.abs(n(p.change)))})</span>` : ''}</div></div>
        <span class="pill ${k}">${esc(stance || 'Market mood')}</span></div>
      <div class="hero-chart" id="t-hc"></div>
      <h2>${esc(head)}</h2>
      ${p.summary ? `<p>${esc(sentence(p.summary))}</p>` : ''}
      ${tot > 0 ? `<div class="breadth"><div class="track" role="img" aria-label="${fmt.int(adv)} stocks rose, ${fmt.int(dec)} fell"><i style="width:${adv / tot * 100}%;background:var(--up-solid)"></i><i style="width:${dec / tot * 100}%;background:var(--dn-solid)"></i></div>
        <div class="lg"><span><b class="up tnum">${fmt.int(adv)}</b> rose</span><span>Breadth${q('breadth')}</span><span><b class="dn tnum">${fmt.int(dec)}</b> fell</span></div></div>` : ''}
      ${ok(d.fii_net_cr) || ok(d.dii_net_cr) ? `<div class="flows">
        <div class="flow"><div class="k">Foreign funds${q('fii')}</div><div class="v ${tone(d.fii_net_cr)} tnum">${crore(d.fii_net_cr)}</div></div>
        <div class="flow"><div class="k">Indian funds</div><div class="v ${tone(d.dii_net_cr)} tnum">${crore(d.dii_net_cr)}</div></div></div>` : ''}
      <button class="hero-more" data-idx>Levels for the next session ${icon('chev', 16)}</button>
    </div>`;
    if (closes.length > 3) {
      const days = closes.map((v, i) => ({ t: String(i), v }));
      stopHero.push(areaChart(slot.querySelector('#t-hc'), days, { height: 120, fmt: fmt.idx, axis: v => fmt.idx(v), label: 'Nifty, last ' + closes.length + ' sessions', bench: ok(p.ema20) ? days.map(x => ({ t: x.t, v: n(p.ema20) })) : null, noDates: true, tone: ch >= 0 ? 'var(--up-solid)' : 'var(--dn-solid)' }));
    }
    slot.querySelector('[data-idx]').onclick = () => indexSheet({ n: 'Nifty 50', v: px, p: ch }, p);
  }, '<div class="sk" style="height:420px;border-radius:24px"></div>');

  fill(body.querySelector('#t-idx'), () => pulse, (d, slot) => {
    const prof = { 'Nifty 50': d.nifty_profile, 'Bank Nifty': d.banknifty_profile };
    const list = (d.indices && d.indices.length ? d.indices : [{ n: 'Sensex', v: d.sensex_price, p: d.sensex_chg_pct }, { n: 'Bank Nifty', v: d.banknifty_price, p: d.banknifty_chg_pct }]).filter(x => !/nifty 50/i.test(x.n));
    slot.innerHTML = list.map((x, i) => `<button class="tk" data-i="${i}"><div class="n">${esc(x.n)}</div><div class="p tnum">${count(x.v, 'idx')}</div><div class="c">${delta(x.p, 2)}</div>${spark(x.spark || prof[x.n]?.spark_closes || [], { w: 150, h: 30 })}</button>`).join('');
    slot.querySelectorAll('.tk').forEach(b => b.onclick = () => { const x = list[+b.dataset.i]; indexSheet(x, prof[x.n]); });
    const when = d.updated_at || d.date;
    if (when) document.getElementById('t-when').textContent = `${ms.text}. Data from ${fmt.date(when, { day: 'numeric', month: 'short' })}${String(when).length > 10 ? ', ' + toDate(when).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''}`;
  }, `<div class="sk" style="height:96px"></div><div class="sk" style="height:96px"></div>`);

  /* QuantSync Scanner: only the last three days of signals */
  const term = loadTerminal();
  const drawScan = (t, slot) => {
    const recent = [...t.toBuy, ...t.active.filter(c => !t.toBuy.some(x => x.sym === c.sym))].filter(c => c.isNew || (isFinite(c.days) && c.days <= 3));
    const fresh = recent.filter(isFreshSignal).length, old = recent.length - fresh;
    slot.innerHTML = `<section class="sec" style="margin-top:4px">
      <p class="scan-sub"><span class="live-dot on"></span>${t.at ? 'Scanned ' + fmt.date(String(t.at).slice(0, 10)) + '. ' : ''}Last 3 days only: ${fresh} fresh, ${old} old.</p>
      ${signalList(recent)}
      <div style="margin-top:14px">${link('calls', `${icon('ai', 18)}All calls from every strategy`, 'btn quiet block')}</div>
    </section>`;
    bindSignals(slot, recent, () => drawScan(t, slot));
    settle(slot); reveal(slot);
  };
  fill(body.querySelector('#t-calls'), () => term, drawScan, `<section class="sec" style="margin-top:4px"><div class="sk" style="height:300px;border-radius:22px"></div></section>`);

  /* honest record */
  fill(body.querySelector('#t-record'), () => api('/track-record', 15), (r, slot) => {
    const L = r.live || {}, C = r.combined || {};
    if (!ok(C.trades)) { slot.innerHTML = ''; return; }
    slot.innerHTML = sec('How the AI calls have done', `
      <div class="stats">${statCell('Win rate', count(C.winRate, 'pct', 0), `${fmt.int(C.trades)} trades`, 'winrate')}${statCell('Profit factor', count(C.profitFactor, 'x'), C.profitFactor >= 1 ? 'Made money' : 'Lost money', 'pf')}${statCell('Per trade', `<span class="${tone(C.expectancyPct)}">${fmt.sp(C.expectancyPct, 2)}</span>`, 'average', 'expectancy')}</div>
      ${ok(L.trades) && L.trades > 0 ? `<p class="small" style="margin:10px 2px 0">Live since ${fmt.date(r.liveSince, { day: 'numeric', month: 'long' })}: <b class="${tone(L.expectancyPct)}">${fmt.int(L.trades)} trades, ${fmt.pct(L.winRate, 0)} won</b>, profit factor ${fmt.x(L.profitFactor)}. ${n(L.profitFactor) < 1 ? 'The live period is short and has been weaker than the long-run test.' : 'The live period is tracking the long-run test.'} ${q('live')}</p>` : ''}`,
      { more: link('record', 'Full record', 'more') });
  }, '', { quiet: true });

  /* patterns */
  fill(body.querySelector('#t-pat'), () => loadPatterns(), (d, slot) => {
    const top = d.rows.filter(p => p.stage === 'Breakout' || p.stage === 'Retest').slice(0, 3);
    if (!top.length) { slot.innerHTML = ''; return; }
    slot.innerHTML = sec(`<span style="display:inline-flex;vertical-align:-3px;margin-right:6px;color:var(--up)">${icon('pattern', 20)}</span>Fresh breakouts`, `<div class="stack">${top.map(p => patternCard(p)).join('')}</div>`,
      { more: link('patterns', `${d.counts.Breakout + d.counts.Retest} in total`, 'more'), p: 'Chart patterns that broke out in the last session, with how often the same setup has worked since 2020.' });
    sparks(slot, api);
  }, '', { quiet: true });

  /* market map */
  fill(body.querySelector('#t-map'), () => api('/app/market', 30), (m, slot) => {
    if (!m || !m.sectors || !m.sectors.length) { slot.innerHTML = ''; return; }
    const secs = [...m.sectors].sort((a, b) => n(b.above200_pct) - n(a.above200_pct)).slice(0, 6);
    slot.innerHTML = sec('Market health', `
      <div class="stats two" style="margin-bottom:10px">${statCell('Above 200-day average', count(m.above200_pct, 'pct', 0), `of ${fmt.int(m.stocks)} stocks`, 'above200')}${statCell('Average X-Ray score', count(m.avg_score, 'int'), m.avg_score >= 55 ? 'Healthy' : m.avg_score >= 45 ? 'Mixed' : 'Weak', 'xray')}</div>
      <div class="mapgrid">${secs.map(s => tile(s)).join('')}</div>`, { more: link('market', 'All sectors', 'more'), p: 'Sectors ranked by how many of their stocks are in an uptrend.' });
  }, '', { quiet: true });

  /* movers and news */
  fill(body.querySelector('#t-movers'), () => api('/intel/movers', 10), (d, slot) => {
    const mv = (d.movers || []).slice(0, 6);
    if (!mv.length) { slot.innerHTML = ''; return; }
    slot.innerHTML = sec('Biggest moves', `<div class="group">${mv.map(m => link(`xray/${encodeURIComponent(m.symbol || m.sym)}`, `${mono(m.symbol || m.sym)}<div class="main"><div class="t">${esc(m.symbol || m.sym)}</div><div class="s">${esc(sentence(m.label || m.desc || ''))}</div></div><div class="end"><div class="v tnum">${fmt.px(m.price)}</div><div class="d">${delta(m.pct ?? m.change_pct)}</div></div>`, 'row')).join('')}</div>`);
  }, '', { quiet: true });
  fill(body.querySelector('#t-news'), () => api('/intel/news?limit=8', 10), (d, slot) => {
    const fresh = x => { const ts = n(x.published_ts); return !isFinite(ts) || Date.now() / 1000 - ts < 4 * 86400; };
    const items = (d.news || []).filter(x => x.title && fresh(x)).slice(0, 6);
    if (!items.length) { slot.innerHTML = ''; return; }
    slot.innerHTML = sec('Market news', `<div class="group">${items.map(x => `<a class="row plain" href="${esc(x.url || '#')}" target="_blank" rel="noopener"><div class="main"><div class="t" style="white-space:normal;font-size:15px;line-height:1.35">${esc(clean(x.title))}</div><div class="s">${esc(x.source || '')}${x.published_ts ? ', ' + fmt.ago(x.published_ts) : x.time ? ', ' + esc(x.time) : ''}</div></div>${x.impact === 'positive' ? '<span class="pill up">Positive</span>' : x.impact === 'negative' ? '<span class="pill dn">Negative</span>' : ''}</a>`).join('')}</div>`);
  }, '', { quiet: true });
  return () => stopHero.forEach(f => f && f());
}

const crore = v => (n(v) >= 0 ? '+' : '−') + '₹' + fmt.int(Math.abs(n(v))) + ' Cr';

export function tile(s) {
  const a = n(s.above200_pct);
  const col = a >= 55 ? 'var(--up-solid)' : a >= 35 ? 'var(--ai-solid)' : 'var(--dn-solid)';
  return link(`market?s=${encodeURIComponent(s.name)}`, `<span class="n">${esc(s.name)}</span><span><span class="v">${fmt.pct(a, 0)}</span><span class="s" style="display:block">in uptrends, of ${fmt.int(s.n)} stocks</span></span>`, 'tile', `style="--tint:${col};--a:${Math.min(.32, .08 + Math.abs(a - 45) / 160)}"`);
}

function indexSheet(x, p) {
  const lv = p ? [['Resistance 2', p.r2], ['Resistance 1', p.r1], ['Pivot', p.pivot], ['Support 1', p.s1], ['Support 2', p.s2]].filter(r => ok(r[1])) : [];
  sheet(`<h3>${esc(x.n)}</h3>
    <div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:30px;font-weight:700;letter-spacing:-.035em" class="tnum">${fmt.idx(x.v)}</span>${delta(x.p, 2)}</div>
    ${p ? `<p style="margin-top:10px">${esc(sentence(p.summary))}</p>
    <div class="kv" style="margin:14px 0">${[['20-day average', p.ema20], ['50-day average', p.ema50], ['200-day average', p.ema200], ['RSI', p.rsi], ['52-week high', p.w52_high], ['52-week low', p.w52_low]].map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${k === 'RSI' ? fmt.x(v, 1) : fmt.idx(v)}</div></div>`).join('')}</div>
    ${lv.length ? `<div class="group" style="box-shadow:none;background:var(--surface-2)">${lv.map(([k, v]) => `<div class="row plain" style="min-height:44px"><div class="main"><div class="t" style="font-weight:500;font-size:14.5px">${k}</div></div><div class="end tnum" style="font-weight:600">${fmt.idx(v)}</div></div>`).join('')}</div><p class="tiny" style="margin-top:8px">Levels for the next session, from the last day's high, low and close.</p>` : ''}` : ''}
    <button class="btn quiet block" data-close style="margin-top:12px">Close</button>`, { label: x.n });
}
