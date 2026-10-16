import { icon, esc, link, go, mono, fmt, line, auth, lab } from '../app.js';
import { STRATEGIES, strategyDetail } from '../sample.js';

/* Strategies: a scanner + exit rules, tested on past prices.
   List: name, one plain line, win rate (number + bar) on the right. Detail: result first, then rules, then stocks. */
const STEPS = `<ol class="flow"><li><b>1</b><span><strong>Write a scanner</strong><small>Rules that pick stocks</small></span></li><li><b>2</b><span><strong>Add exit rules</strong><small>When a trade ends</small></span></li><li><b>3</b><span><strong>See how it did</strong><small>Years of past prices</small></span></li></ol>`;
const wc = w => (w >= 55 ? 'good' : w < 45 ? 'weak' : 'fair');
const exitTxt = e => [e.stop ? `falls ${e.stop}%` : '', e.target ? `rises ${e.target}%` : '', e.time ? `${e.time} days pass` : ''].filter(Boolean).join(', or ');
const ring = w => `<span class="wring ${wc(w)}" style="--p:${w}"><b class="tnum">${Math.round(w)}<small>%</small></b></span>`;
const wbar = w => `<span class="wbar"><i class="${wc(w)}" style="width:${w}%"></i><em></em></span>`;

export default async function strategies(el, r) {
  if (r.arg) return detail(el, r.arg);
  let sort = 'win';
  el.innerHTML = `
  <div class="page-h"><div class="ph-row"><div><h1 class="h1">Strategies</h1><p class="lede">A strategy is a scanner plus exit rules, tested on past prices. <b>Win rate</b> = how often a past trade ended higher.</p></div><span class="tag-s">Sample data</span></div>
    ${STEPS}
    <div class="row-b">${link('build', `${icon('plus', 16)}Create your own`, 'btn pri sm')}${link('screens', 'Start from a screen', 'btn quiet sm')}</div></div>
  <div id="mine"></div>
  <section class="sec"><div class="sec-h"><h2 class="h2">Library</h2><div class="seg sm" id="srt"><button data-v="win">Win rate</button><button data-v="avg">Avg return</button><button data-v="trades">Trades</button></div></div>
    <div class="stl" id="lst"></div>
    <p class="disc">Hypothetical tests on past NSE prices with 0.10% costs each way. Past results do not predict future results. The dotted line on each bar marks 50%.</p></section>`;
  const lst = el.querySelector('#lst'), srt = el.querySelector('#srt');
  const draw = () => {
    srt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === sort));
    lst.innerHTML = STRATEGIES.slice().sort((a, b) => b[sort] - a[sort]).map(s => link(`strategies/${s.id}`, `<span class="m"><span class="tt"><b>${esc(s.name)}</b><span class="pill">${s.tf === '1W' ? 'Weekly' : 'Daily'}</span></span><span class="ab">${esc(s.about)}</span>
      <span class="sm3"><span><small>Avg / trade</small><b class="tnum ${fmt.tone(s.avg)}">${fmt.pct(s.avg, 2)}</b></span><span><small>Trades</small><b class="tnum">${fmt.int(s.trades)}</b></span><span><small>In it now</small><b class="tnum">${s.open}</b></span></span></span>
      <span class="wr2">${ring(s.win)}<small>Win rate</small></span>`, 'stile2')).join('');
  };
  srt.onclick = e => { const b = e.target.closest('button'); if (b) { sort = b.dataset.v; draw(); } };
  draw();
  try {
    const u = await Promise.race([auth.whenReady(), new Promise(z => setTimeout(() => z(null), 2500))]); if (!u) return;
    const L = await lab.strategies('mine'); if (!L.length || !el.isConnected) return;
    el.querySelector('#mine').innerHTML = `<section class="sec"><div class="sec-h"><h2 class="h2">Yours</h2>${link('me', 'Manage', 'a-l')}</div><div class="grp">${L.map(s => link(`s/${s.id}`, `<span class="m"><b>${esc(s.name)}</b><span>${s.tf === '1W' ? 'Weekly' : 'Daily'} · ${fmt.int((s.stats || {}).open || 0)} stocks in it now</span></span><span class="wr"><small>Win rate</small><b class="tnum">${s.stats && s.stats.win_rate != null ? fmt.plain(s.stats.win_rate) : '—'}</b></span>`, 'strow')).join('')}</div></section>`;
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

  <section class="card pad sec"><div class="sec-h" style="margin:0 0 6px"><h3 class="h3">₹1,00,000 following every trade</h3><span class="tiny">${s.since} to now</span></div><div id="eq"></div>
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
