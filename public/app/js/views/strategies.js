import { icon, esc, link, go, mono, fmt, line, auth, lab } from '../app.js';
import { STRATEGIES, strategyDetail } from '../sample.js';

/* Strategies: a scanner + exit rules, tested on past prices.
   List: name, one plain line, win rate (number + bar) on the right. Detail: result first, then rules, then stocks. */
const STEPS = `<ol class="flow"><li><b>1</b><span><strong>Write a scanner</strong><small>Rules that pick stocks</small></span></li><li><b>2</b><span><strong>Add exit rules</strong><small>When a trade ends</small></span></li><li><b>3</b><span><strong>See how it did</strong><small>Years of past prices</small></span></li></ol>`;
const wc = w => (w >= 55 ? 'good' : w < 45 ? 'weak' : 'fair');
const exitTxt = e => [e.stop ? `falls ${e.stop}%` : '', e.target ? `rises ${e.target}%` : '', e.time ? `${e.time} days pass` : ''].filter(Boolean).join(', or ');
const ring = w => `<span class="wring ${wc(w)}" style="--p:${w}"><b class="tnum">${Math.round(w)}<small>%</small></b></span>`;
const wbar = w => `<span class="wbar"><i class="${wc(w)}" style="width:${w}%"></i><em></em></span>`;

const FAM = ['All', 'Breakout', 'Pattern', 'Trend', 'Pullback', 'Volume', 'Events', 'Owners', 'Business'];
const tileLive = s => {
  const rec = s.record || {};
  const ai = s.ai || {};
  let variant = 'ai';
  if (ai.verdict === 'improved') {
    try {
      const saved = localStorage.getItem('qs-strat-var-' + s.id);
      if (saved === 'plain' || saved === 'ai') variant = saved;
    } catch { /* blocked */ }
  } else {
    variant = 'plain';
  }

  const stat = (ai.verdict === 'improved' && variant === 'ai' && ai.enhanced && ai.enhanced.win_rate != null)
    ? ai.enhanced
    : ((ai.verdict === 'improved' && variant === 'plain' && ai.plain && ai.plain.win_rate != null) ? ai.plain : rec);

  const w = stat.win_rate != null ? stat.win_rate : rec.win_rate;
  const n = stat.trades != null ? stat.trades : (rec.trades || 0);
  const avg = stat.avg_ret != null ? stat.avg_ret : rec.avg_ret;

  const ringH = w == null ? `<span class="wring none"><b>${s.record ? '—' : '<i class="spin"></i>'}</b></span>` : ring(w);
  return link(`s/${s.id}`, `<span class="m"><span class="tt"><b>${esc(s.name)}</b><span class="pill">${s.tf === '1W' ? 'Weekly' : 'Daily'}</span>${s.family ? `<span class="pill ghost">${esc(s.family)}</span>` : ''}
    ${ai.verdict === 'improved' ? `<span class="seg sm" data-var-switch="${s.id}" style="margin-left:auto;z-index:2"><button type="button" data-var="plain" aria-pressed="${variant === 'plain'}">Plain</button><button type="button" data-var="ai" aria-pressed="${variant === 'ai'}">AI</button></span>` : ''}
    ${ai.verdict === 'no_edge' ? `<span class="pill ghost" style="color:var(--ink-2);margin-left:auto">AI tested · no gain</span>` : ''}
  </span><span class="ab">${esc(s.about || '')}</span>
    <span class="sm3"><span><small>Avg / trade</small><b class="tnum ${fmt.tone(avg)}">${avg == null ? '—' : fmt.pct(avg, 2)}</b></span><span><small>Past trades</small><b class="tnum">${s.record || stat.trades != null ? fmt.int(n) : '…'}</b></span><span><small>Worst dip</small><b class="tnum dn">${rec.max_dd == null ? '—' : fmt.pct(rec.max_dd)}</b></span></span>
    ${s.record && !n ? '<span class="note">No past trades yet: this uses data the server is still collecting.</span>' : ''}</span>
    <span class="wr2">${ringH}<small>${s.record || stat.win_rate != null ? 'Win rate' : 'Testing'}</small></span>`, 'stile2');
};

export default async function strategies(el, r) {
  if (r.arg) return detail(el, r.arg);
  let sort = 'win', fam = 'All', LIVE = null;
  el.innerHTML = `
  <div class="page-h"><div class="ph-row"><div><h1 class="h1">Strategies</h1><p class="lede">A strategy is a scanner plus exit rules, tested on years of real NSE prices. <b>Win rate</b> = how often a past trade ended higher.</p></div><span class="tag-s" id="src">Loading</span></div>
    ${STEPS}
    <div class="row-b">${link('build', `${icon('plus', 16)}Create your own`, 'btn pri sm')}${link('screens', 'Start from a screen', 'btn quiet sm')}</div></div>
  <div id="mine"></div>
  <section class="sec"><div class="sec-h"><h2 class="h2">Library</h2><div class="seg sm" id="srt"><button data-v="win">Win rate</button><button data-v="avg">Avg return</button><button data-v="trades">Trades</button></div></div>
    <div class="chips" id="fam" style="margin-bottom:12px"></div>
    <div class="stl" id="lst">${'<div class="sk" style="height:132px;margin-bottom:12px"></div>'.repeat(4)}</div>
    <p class="disc" id="disc">Tests on past NSE prices with 0.10% costs each way, entering at the next day’s open. Past results do not predict future results.</p></section>`;
  const lst = el.querySelector('#lst'), srt = el.querySelector('#srt'), famBox = el.querySelector('#fam'), src = el.querySelector('#src');
  const getStat = s => {
    const ai = s.ai || {};
    let variant = 'ai';
    if (ai.verdict === 'improved') {
      try {
        const saved = localStorage.getItem('qs-strat-var-' + s.id);
        if (saved === 'plain' || saved === 'ai') variant = saved;
      } catch { /* blocked */ }
    } else {
      variant = 'plain';
    }
    return (ai.verdict === 'improved' && variant === 'ai' && ai.enhanced && ai.enhanced.win_rate != null)
      ? ai.enhanced
      : ((ai.verdict === 'improved' && variant === 'plain' && ai.plain && ai.plain.win_rate != null) ? ai.plain : (s.record || {}));
  };
  const key = { win: s => getStat(s).win_rate ?? -1, avg: s => getStat(s).avg_ret ?? -99, trades: s => getStat(s).trades ?? -1 };
  const keyS = { win: s => s.win, avg: s => s.avg, trades: s => s.trades };
  const draw = () => {
    srt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === sort));
    famBox.innerHTML = LIVE ? FAM.map(f => `<button class="chip" data-f="${f}" aria-pressed="${f === fam}">${f}</button>`).join('') : '';
    if (LIVE) {
      const L = LIVE.filter(s => fam === 'All' || s.family === fam).sort((a, b) => key[sort](b) - key[sort](a));
      lst.innerHTML = L.length ? L.map(tileLive).join('') : '<p class="empty-s">No strategy in this group.</p>';
      return;
    }
    lst.innerHTML = STRATEGIES.slice().sort((a, b) => keyS[sort](b) - keyS[sort](a)).map(s => link(`strategies/${s.id}`, `<span class="m"><span class="tt"><b>${esc(s.name)}</b><span class="pill">${s.tf === '1W' ? 'Weekly' : 'Daily'}</span></span><span class="ab">${esc(s.about)}</span>
      <span class="sm3"><span><small>Avg / trade</small><b class="tnum ${fmt.tone(s.avg)}">${fmt.pct(s.avg, 2)}</b></span><span><small>Trades</small><b class="tnum">${fmt.int(s.trades)}</b></span><span><small>In it now</small><b class="tnum">${s.open}</b></span></span></span>
      <span class="wr2">${ring(s.win)}<small>Win rate</small></span>`, 'stile2')).join('');
  };
  srt.onclick = e => { const b = e.target.closest('button'); if (b) { sort = b.dataset.v; draw(); } };
  famBox.onclick = e => { const b = e.target.closest('[data-f]'); if (b) { fam = b.dataset.f; draw(); } };
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-var]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const seg = btn.closest('[data-var-switch]');
    if (!seg) return;
    const sid = seg.dataset.varSwitch;
    const v = btn.dataset.var;
    try { localStorage.setItem('qs-strat-var-' + sid, v); } catch { /* blocked */ }
    draw();
  });
  try {
    const L = await lab.strategies('library');
    if (!Array.isArray(L) || !L.length) throw new Error('empty');
    LIVE = L; src.textContent = 'Live'; src.classList.add('live');
    const asof = L.map(s => s.live_from).filter(Boolean).sort().pop();
    if (asof) el.querySelector('#disc').insertAdjacentText('afterbegin', `Data up to ${fmt.dateY(asof)}. `);
  } catch { LIVE = null; src.textContent = 'Sample data'; }
  if (!el.isConnected) return;
  draw();
  // tiles still testing: poll a few times so win rates fill in without a reload
  if (LIVE && LIVE.some(s => !s.record)) {
    let tries = 0; const t = setInterval(async () => {
      if (!el.isConnected || ++tries > 20) { clearInterval(t); return; }
      QD.bust('lab:strats:library'); try { LIVE = await lab.strategies('library'); draw(); if (!LIVE.some(s => !s.record)) clearInterval(t); } catch { /* keep */ }
    }, 6000);
  }
  try {
    const u = await Promise.race([auth.whenReady(), new Promise(z => setTimeout(() => z(null), 2500))]); if (!u) return;
    const M = await lab.strategies('mine'); if (!M.length || !el.isConnected) return;
    el.querySelector('#mine').innerHTML = `<section class="sec"><div class="sec-h"><h2 class="h2">Yours</h2>${link('me', 'Manage', 'a-l')}</div><div class="grp">${M.map(s => link(`s/${s.id}`, `<span class="m"><b>${esc(s.name)}</b><span>${s.tf === '1W' ? 'Weekly' : 'Daily'} · ${fmt.int((s.stats || {}).open || 0)} stocks in it now</span></span><span class="wr"><small>Win rate</small><b class="tnum">${s.record && s.record.win_rate != null ? fmt.plain(s.record.win_rate) : s.stats && s.stats.win_rate != null ? fmt.plain(s.stats.win_rate) : '—'}</b></span>`, 'strow')).join('')}</div></section>`;
  } catch { /* offline: library only */ }
}

function detail(el, id) {
  const s = STRATEGIES.find(x => x.id === id); if (!s) { go('strategies', { replace: true }); return; }
  const D = strategyDetail(s); let tab = 'now';
  const wins = Math.round(s.trades * s.win / 100);
  el.innerHTML = `
  <div class="page-h">${link('strategies', `${icon('back', 16)}Strategies`, 'back')}<div class="ph-row"><div><h1 class="h1">${esc(s.name)}</h1><p class="lede">${esc(s.about)}</p></div><span class="tag-s">Sample data</span></div></div>

  <section class="result">
    <div class="r-main"><span class="lbl">Win rate</span><b class="tnum ${wc(s.win)}">${s.win.toFixed(0)}%</b>${wbar(s.win)}<p><b>${fmt.int(wins)}</b> of <b>${fmt.int(s.trades)}</b> past trades ended higher.</p></div>
    <div class="r-kpis">
      <div><span>Average per trade</span><b class="tnum ${fmt.tone(s.avg)}">${fmt.pct(s.avg, 2)}</b><small>after costs</small></div>
      <div><span>Typical hold</span><b class="tnum">${s.hold} days</b><small>until an exit rule</small></div>
      <div><span>Deepest dip</span><b class="tnum dn">${fmt.pct(s.maxdd)}</b><small>peak to bottom</small></div>
      <div><span>Best / worst trade</span><b class="tnum"><span class="up">${fmt.pct(s.best, 0)}</span> / <span class="dn">${fmt.pct(s.worst, 0)}</span></b><small>single trade</small></div>
    </div>
  </section>

  <section class="card pad sec"><div class="sec-h" style="margin:0 0 6px"><h3 class="h3">₹1,00,000 split across up to 10 trades at a time</h3><span class="tiny">${s.since} to now</span></div><div id="eq"></div>
    ${(s.portfolio && (s.portfolio.cagr != null || s.portfolio.taken != null)) ? `<div class="tiny" style="margin:6px 0;display:flex;justify-content:space-between;color:var(--ink-2)"><span>${s.portfolio.cagr != null ? `CAGR ${fmt.pct(s.portfolio.cagr, 1)}` : ''}</span><span>${s.portfolio.taken != null ? `Taken ${fmt.int(s.portfolio.taken)} of ${fmt.int(s.trades)} matches` : ''}</span></div>` : ''}
    <div class="yrow">${s.y.map(y => `<div><small>${y.y}</small><b class="${wc(y.win)}">${y.win}%</b><span>${y.n} trades</span></div>`).join('')}</div></section>

  <section class="card pad sec"><h3 class="h3">The rules</h3>
    <div class="rules2"><div><span class="step-n">1</span><div><b>Enter when</b><code>${esc(s.query).replace(/\n/g, '<br>')}</code><small>${s.tf === '1W' ? 'Weekly' : 'Daily'} chart, checked after each close</small></div></div>
      <div><span class="step-n">2</span><div><b>Exit when</b><p>It ${esc(exitTxt(s.exit))}.</p></div></div></div>
    <div class="row-b">${link(`build?query=${encodeURIComponent(s.query)}&tf=${s.tf}&name=${encodeURIComponent(s.name)}`, `${icon('edit', 16)}Copy and change it`, 'btn pri sm')}</div></section>

  <section class="sec"><div class="seg" id="tb" style="max-width:380px"><button data-v="now">In it now · ${D.active.length}</button><button data-v="past">Past trades</button></div><div class="card flush" id="pane" style="margin-top:12px"></div>
    <p class="disc">Hypothetical test on past prices. Stocks listed met the rules; this is not a recommendation.</p></section>`;
  line(el.querySelector('#eq'), [{ data: D.eq.map(p => p.v), color: 'var(--brand)', area: true }], { h: 220, dates: D.eq.map(p => p.d), yfmt: v => '₹' + (v / 100000).toFixed(1) + 'L', label: 'Test result', tip: i => `${fmt.date(D.eq[i].d)} · ${fmt.inr(D.eq[i].v)}` });
  const pane = el.querySelector('#pane'), tb = el.querySelector('#tb');
  pane.addEventListener('click', e => { const t = e.target.closest('tr[data-href]'); if (t) go(t.dataset.href); });
  const paint = () => {
    tb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tab));
    pane.innerHTML = tab === 'now'
      ? `<table class="dt"><thead><tr><th>Stock</th><th>Entered</th><th>Entry price</th><th>Since entry</th></tr></thead><tbody>${D.active.sort((a, b) => a.sym.localeCompare(b.sym)).map(x => `<tr data-href="xray/${encodeURIComponent(x.sym)}"><td><span class="nm">${mono(x.sym)}<span><b>${esc(x.sym)}</b><small>${esc(x.name)}</small></span></span></td><td>${fmt.date(x.date)}</td><td class="tnum">${fmt.inr(x.entry)}</td><td class="tnum ${fmt.tone(x.ret)}">${fmt.pct(x.ret)}</td></tr>`).join('')}</tbody></table>`
      : `<table class="dt"><thead><tr><th>Stock</th><th>Entered</th><th>Days</th><th>Exit by</th><th>Result</th></tr></thead><tbody>${D.past.map(x => `<tr><td><span class="nm"><span><b>${esc(x.sym)}</b><small>${fmt.inr(x.entry)} → ${fmt.inr(x.exit)}</small></span></span></td><td>${fmt.dateY(x.date)}</td><td class="tnum">${x.days}</td><td><span class="st ${x.why === 'Target' ? 'good' : x.why === 'Stop' ? 'weak' : 'info'}">${x.why === 'Target' ? 'Rise' : x.why === 'Stop' ? 'Fall' : 'Time'}</span></td><td class="tnum ${fmt.tone(x.ret)}">${fmt.pct(x.ret)}</td></tr>`).join('')}</tbody></table>`;
  };
  tb.onclick = e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.v; paint(); } };
  paint();
}
