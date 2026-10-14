import { reveal, api, bust, chrome, fill, fmt, esc, icon, n, ok, link, mono, delta, tone, marketStatus, loadTerminal, loadPatterns, allSignals, sheet, q, count, toDate, logo, live, todayLine, engineOf, tradeStats, yearTrades } from '../core.js';
import { isFreshSignal } from './parts.js';

/* Home: the market in one live card, then three doors: fresh AI signals, confirmed breakouts, near breakout. */
export default async function today(el) {
  const ms = marketStatus();
  const hr = +new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' });
  const part = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
  const body = chrome(el, {
    title: 'Today',
    top: { ey: `<span class="live-dot ${ms.open ? 'on' : ''}"></span><span>${todayLine()}</span><i class="sep"></i><span id="t-st">${ms.text}</span>`, h: `Good ${part}.`, hl: [part], lede: 'The market right now, and what our AI found after the last close.' },
  });

  body.innerHTML = `
    <div id="t-mk"></div>
    <a class="door dr-ai" href="/phone/calls" data-nav aria-label="AI buy and sell calls">
      <div class="dr-h"><span class="dr-ic">${icon('ai', 20)}</span><span class="dr-k">AI Buy &amp; Sell Calls</span><span class="go">${icon('arrowUR', 18)}</span></div>
      <div class="dr-n" id="t-ai-n"><span class="sk sk-n"></span></div><div class="dr-l" id="t-ai-l">fresh from the last scan</div><div class="dr-syms" id="t-ai-s"></div>
    </a>
    ${link('record', `<span class="ri">${icon('chart', 18)}</span><span class="rb-t"><b>Backtest report</b><span id="t-rec">Every closed call, wins and losses</span></span>${icon('chev', 18, 'chev')}`, 'rbtn')}
    <section class="sec"><div class="sec-h"><h2>Chart Patterns</h2>${link('patterns', 'See all', 'more')}</div>
    <div class="bento">
      <a class="door dr-up" href="/phone/patterns?stage=Breakout" data-nav aria-label="Confirmed breakouts">
        <div class="dr-h"><span class="dr-ic">${icon('pattern', 18)}</span><span class="go">${icon('arrowUR', 16)}</span></div>
        <div class="dr-n" id="t-br-n"><span class="sk sk-n"></span></div><div class="dr-l">Breakouts confirmed</div>
        <svg class="dr-art" viewBox="0 0 120 44" aria-hidden="true"><path d="M2 20h116" stroke-dasharray="3 4"/><path class="ln" d="M2 36 18 30l12 4 14-9 14 5 12-7 10 3 12-14 14-10 12-4"/></svg>
      </a>
      <a class="door dr-near" href="/phone/patterns?stage=Near" data-nav aria-label="Near breakout">
        <div class="dr-h"><span class="dr-ic">${icon('target', 18)}</span><span class="go">${icon('arrowUR', 16)}</span></div>
        <div class="dr-n" id="t-nr-n"><span class="sk sk-n"></span></div><div class="dr-l">Near breakout</div>
        <svg class="dr-art" viewBox="0 0 120 44" aria-hidden="true"><path d="M2 14h116" stroke-dasharray="3 4"/><path class="ln" d="M2 38 16 32l14 4 14-10 14 4 14-8 12 3 14-6 12-2 8-1"/></svg>
      </a>
    </div></section>
    <a class="labx" href="/app/scanner.html">
      <svg class="labx-art" viewBox="0 0 160 120" aria-hidden="true"><g class="nd"><circle cx="30" cy="28" r="5"/><circle cx="82" cy="18" r="5"/><circle cx="130" cy="40" r="5"/><circle cx="58" cy="74" r="5"/><circle cx="112" cy="88" r="5"/><circle cx="150" cy="104" r="4"/></g><path class="ed" d="M30 28 82 18 130 40M30 28l28 46 54 14 38 16M82 18l-24 56M130 40l-18 48"/></svg>
      <div class="labx-ey">${icon('flask', 15)}Strategy Lab</div>
      <div class="labx-h">Create your own AI-powered strategies</div>
      <p>Pick the rules, test them on years of NSE prices, and let AI filter out the weak trades.</p>
      <span class="labx-cta">Create a scanner ${icon('chev', 16)}</span>
    </a>
    <p class="foot-note">Research and education, not investment advice. Prices can be delayed.</p>`;

  /* ---------- live Nifty card ---------- */
  const mk = body.querySelector('#t-mk');
  mk.innerHTML = '<div class="sk" style="height:300px;border-radius:26px"></div>';
  const S = { px: NaN, ch: NaN, chg: NaN, prof: {}, closes: [], dataDay: '', others: [], adv: NaN, dec: NaN, liveAt: 0 };
  let drawn = false, lastChart = 0;
  const istDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const say = () => {
    const { px, ch, prof: p } = S;
    if (!isFinite(px)) return '';
    const open = marketStatus().open;
    const dir = !isFinite(ch) || Math.abs(ch) < .05 ? (open ? 'is flat' : 'closed flat') : `${open ? 'is' : 'closed'} ${ch > 0 ? 'up' : 'down'} ${fmt.pct(Math.abs(ch), 2)}`;
    const a = ok(p.ema20) ? (px > n(p.ema20) ? 'above' : 'below') : '', b = ok(p.ema200) ? (px > n(p.ema200) ? 'above' : 'below') : '';
    const where = a && b ? (a === b ? `, ${a} its 20-day and 200-day averages` : `, ${a} its 20-day but ${b} its 200-day average`) : '';
    return `Nifty ${dir} at ${fmt.idx(px)}${where}.`;
  };
  const series = () => {
    const c = S.closes.slice();
    if (!c.length || !isFinite(S.px)) return c;
    if (S.dataDay && S.dataDay < istDay() && S.liveAt) c.push(S.px); else c[c.length - 1] = S.px;
    return c.slice(-40);
  };
  const chartSVG = vals => {
    if (vals.length < 3) return '';
    const W = 340, H = 112, lo0 = Math.min(...vals), hi0 = Math.max(...vals), pad = (hi0 - lo0) * .12 || 1, lo = lo0 - pad, hi = hi0 + pad;
    const X = i => (i / (vals.length - 1)) * (W - 10) + 2, Y = v => (1 - (v - lo) / (hi - lo)) * (H - 8) + 4;
    const d = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const up = isFinite(S.ch) ? S.ch >= 0 : vals[vals.length - 1] >= vals[0], col = up ? 'var(--mk-up)' : 'var(--mk-dn)';
    const e20 = ok(S.prof.ema20) && n(S.prof.ema20) > lo && n(S.prof.ema20) < hi ? Y(n(S.prof.ema20)) : null;
    const lx = X(vals.length - 1), ly = Y(vals[vals.length - 1]);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="mkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col};stop-opacity:.3"/><stop offset="1" style="stop-color:${col};stop-opacity:0"/></linearGradient></defs>
      ${e20 != null ? `<line x1="0" x2="${W}" y1="${e20.toFixed(1)}" y2="${e20.toFixed(1)}" style="stroke:var(--mk-grid)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>` : ''}
      <path d="${d} L${lx} ${H} L2 ${H}Z" fill="url(#mkg)"/><path class="mk-line${lastChart ? '' : ' draw'}" d="${d}" fill="none" style="stroke:${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" pathLength="1"/></svg>
      <i class="mk-dot" style="left:${(lx / W * 100).toFixed(2)}%;top:${(ly / H * 100).toFixed(2)}%;--c:${col}"></i>`;
  };
  const idxCell = x => `<div class="mk-i" data-n="${esc(x.n)}"><div class="k">${esc(x.n)}</div><div class="v tnum">${fmt.idx(x.v)}</div><div class="d ${tone(x.p)}">${fmt.sp(x.p, 2)}</div></div>`;

  function paint() {
    const up = !(S.ch < 0), open = marketStatus().open, tot = S.adv + S.dec;
    if (!drawn) {
      mk.innerHTML = `<div class="mk ${up ? 'is-up' : 'is-dn'}" role="button" tabindex="0" aria-label="Nifty 50 details">
        <div class="mk-top"><div><div class="mk-k">Nifty 50 <span class="mk-live" id="mk-live"></span></div><div class="mk-v tnum" id="mk-v"></div><div class="mk-d tnum" id="mk-d"></div></div>
          <span class="mk-chev">${icon('chev', 18)}</span></div>
        <div class="mk-chart" id="mk-c"></div>
        <p class="mk-say" id="mk-say"></p>
        ${tot > 0 ? `<div class="mk-br"><div class="track"><i style="width:${S.adv / tot * 100}%"></i><i style="width:${S.dec / tot * 100}%"></i></div><div class="lg"><span><b>${fmt.int(S.adv)}</b> rising</span><span><b>${fmt.int(S.dec)}</b> falling</span></div></div>` : ''}
        <div class="mk-row" id="mk-row"></div>
      </div>`;
      mk.querySelector('.mk').onclick = () => indexSheet({ n: 'Nifty 50', v: S.px, p: S.ch }, S.prof);
      drawn = true; reveal(mk);
    }
    const card = mk.querySelector('.mk');
    card.classList.toggle('is-up', up); card.classList.toggle('is-dn', !up);
    mk.querySelector('#mk-v').textContent = fmt.idx(S.px);
    const dEl = mk.querySelector('#mk-d');
    dEl.textContent = `${fmt.sp(S.ch, 2)}${isFinite(S.chg) ? `  ${S.chg >= 0 ? '+' : '−'}${fmt.idx(Math.abs(S.chg))}` : ''}${open ? ' today' : ''}`;
    dEl.className = 'mk-d tnum ' + tone(S.ch);
    mk.querySelector('#mk-live').innerHTML = S.liveAt && open ? '<i></i>Live' : open ? 'Delayed' : 'Closed';
    mk.querySelector('#mk-live').className = 'mk-live' + (S.liveAt && open ? ' on' : '');
    mk.querySelector('#mk-say').textContent = say();
    mk.querySelector('#mk-row').innerHTML = S.others.slice(0, 2).map(idxCell).join('');
    if (Date.now() - lastChart > 2500) { const svg = chartSVG(series()); lastChart = Date.now(); mk.querySelector('#mk-c').innerHTML = svg; }
  }

  const fromPulse = d => {
    const p = d.nifty_profile || {};
    S.prof = p;
    if (!S.liveAt || Date.now() - S.liveAt > 60e3) { S.px = n(p.price ?? d.nifty_price); S.ch = n(p.change_pct ?? d.nifty_chg_pct); S.chg = n(p.change); }
    S.closes = (p.spark_closes || (d.indices || [])[0]?.spark || []).map(n).filter(isFinite);
    S.dataDay = String(d.updated_at || d.date || '').slice(0, 10);
    S.adv = n(d.advances); S.dec = n(d.declines);
    const list = d.indices && d.indices.length ? d.indices : [{ n: 'Sensex', v: d.sensex_price, p: d.sensex_chg_pct }, { n: 'Bank Nifty', v: d.banknifty_price, p: d.banknifty_chg_pct }];
    if (!S.liveAt) S.others = list.filter(x => !/nifty 50/i.test(x.n)).map(x => ({ n: x.n, v: n(x.v), p: n(x.p) }));
  };
  const loadPulse = () => api('/intel/pulse', 1).then(d => { fromPulse(d); paint(); }).catch(e => { if (!drawn) mk.innerHTML = `<div class="err">${esc(e.message || 'Could not load the market.')}<button data-r>Try again</button></div>`; const b = mk.querySelector('[data-r]'); if (b) b.onclick = loadPulse; });
  loadPulse();

  /* live ticks: Nifty, Sensex and Bank Nifty move every second while the market is open */
  const offLive = live.on(t => {
    const nf = t.indices.find(x => /^nifty( 50)?$/i.test(String(x.n).trim()));
    if (nf && isFinite(n(nf.v))) {
      const prev = isFinite(S.px) && isFinite(S.ch) ? S.px / (1 + S.ch / 100) : NaN;
      S.px = n(nf.v); S.ch = n(nf.p); S.chg = isFinite(prev) ? S.px - prev : S.chg; S.liveAt = Date.now();
    }
    const others = t.indices.filter(x => x !== nf && /sensex|bank/i.test(x.n)).map(x => ({ n: /bank/i.test(x.n) ? 'Bank Nifty' : 'Sensex', v: n(x.v), p: n(x.p) })).filter(x => isFinite(x.v));
    if (others.length) S.others = others;
    if (drawn) paint();
  });
  /* if the socket is quiet, refresh from the server every minute while the market is open */
  const poll = setInterval(() => { if (document.hidden || !el.isConnected) return; const m = marketStatus(); document.getElementById('t-st') && (document.getElementById('t-st').textContent = m.text); if (m.open && Date.now() - S.liveAt > 45e3) { bust('/intel/pulse'); loadPulse(); } }, 60e3);

  /* ---------- the three doors ---------- */
  loadTerminal().then(t => {
    { const y = yearTrades(t.closed), st = tradeStats(y.list); if (st.n) body.querySelector('#t-rec').textContent = `${y.label}: ${fmt.int(st.n)} calls, ${fmt.pct(st.winRate, 0)} won`; }
    const sigs = allSignals(t), fresh = sigs.filter(isFreshSignal).sort((a, b) => (b.score || 0) - (a.score || 0));
    const nPro = fresh.filter(c => engineOf(c) === 'v2').length, nChart = fresh.length - nPro;
    body.querySelector('#t-ai-n').innerHTML = count(fresh.length);
    body.querySelector('#t-ai-l').textContent = fresh.length ? `fresh signal${fresh.length > 1 ? 's' : ''} from the last scan` : `no fresh signal, ${sigs.length} still open`;
    body.querySelector('#t-ai-s').innerHTML = fresh.slice(0, 3).map(c => `<span class="bs">${esc(c.sym)}</span>`).join('') + (fresh.length > 3 ? `<span class="bs more">+${fresh.length - 3}</span>` : '') +
      (fresh.length ? `<span class="bs-eng">${[nPro && `${nPro} AI Pro`, nChart && `${nChart} Chart AI Pro`].filter(Boolean).join(' · ')}</span>` : '');
  }).catch(() => { body.querySelector('#t-ai-n').textContent = '—'; });
  loadPatterns().then(d => {
    body.querySelector('#t-br-n').innerHTML = count(d.counts.Breakout || 0);
    body.querySelector('#t-nr-n').innerHTML = count(d.counts.Near || 0);
  }).catch(() => { body.querySelector('#t-br-n').textContent = '—'; body.querySelector('#t-nr-n').textContent = '—'; });
  

  return () => { offLive(); clearInterval(poll); };
}

function indexSheet(x, p) {
  const lv = p ? [['Resistance 2', p.r2], ['Resistance 1', p.r1], ['Pivot', p.pivot], ['Support 1', p.s1], ['Support 2', p.s2]].filter(r => ok(r[1])) : [];
  sheet(`<h3>${esc(x.n)}</h3>
    <div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:30px;font-weight:700;letter-spacing:-.035em" class="tnum">${fmt.idx(x.v)}</span>${delta(x.p, 2)}</div>
    ${p ? `<div class="kv" style="margin:14px 0">${[['20-day average', p.ema20], ['50-day average', p.ema50], ['200-day average', p.ema200], ['RSI', p.rsi], ['52-week high', p.w52_high], ['52-week low', p.w52_low]].map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${k === 'RSI' ? fmt.x(v, 1) : fmt.idx(v)}</div></div>`).join('')}</div>
    ${lv.length ? `<div class="group" style="box-shadow:none;background:var(--surface-2)">${lv.map(([k, v]) => `<div class="row plain" style="min-height:44px"><div class="main"><div class="t" style="font-weight:500;font-size:14.5px">${k}</div></div><div class="end tnum" style="font-weight:600">${fmt.idx(v)}</div></div>`).join('')}</div><p class="tiny" style="margin-top:8px">Levels for the next session, from the last day's high, low and close.</p>` : ''}` : ''}
    <a class="btn ghost block" href="/phone/market" data-nav data-close style="margin-top:12px">${icon('grid', 18)}Market map: every sector</a><button class="btn quiet block" data-close style="margin-top:8px">Close</button>`, { label: x.n });
}

export function tile(s) {
  const a = n(s.above200_pct);
  const col = a >= 55 ? 'var(--up-solid)' : a >= 35 ? 'var(--ai-solid)' : 'var(--dn-solid)';
  return link(`market?s=${encodeURIComponent(s.name)}`, `<span class="n">${esc(s.name)}</span><span><span class="v">${fmt.pct(a, 0)}</span><span class="s" style="display:block">in uptrends, of ${fmt.int(s.n)} stocks</span></span>`, 'tile', `style="--tint:${col};--a:${Math.min(.32, .08 + Math.abs(a - 45) / 160)}"`);
}
