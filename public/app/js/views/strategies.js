import { icon, esc, words, link, go, mono, fmt, line, auth, lab } from '../app.js';
import { STRATEGIES, strategyDetail } from '../sample.js';

/* Strategies: a scanner + exit rules, tested on past prices. List = name, one plain line, win rate on the right.
   Detail = how it did (win rate explained), the rules, stocks in it now, and past trades. */
const STEPS = `<div class="steps3"><div><span>1</span><b>Write a scanner</b><small>Rules that pick stocks</small></div><i></i><div><span>2</span><b>Make it a strategy</b><small>Add when to exit</small></div><i></i><div><span>3</span><b>See how it did</b><small>Years of past prices</small></div></div>`;
const SAMPLE = `<div class="samp">${icon('info', 15)}<span><b>Sample results.</b> Win rates and trades are placeholders until the test server is connected.</span></div>`;
const wtone = w => (w >= 55 ? 'up' : w < 45 ? 'dn' : '');
const exitTxt = e => [e.stop ? `falls ${e.stop}%` : '', e.target ? `rises ${e.target}%` : '', e.time ? `after ${e.time} days` : ''].filter(Boolean).join(', or ');

export default async function strategies(el, r) {
  if (r.arg) return detail(el, r.arg);
  let sort = 'win';
  el.innerHTML = `
  <div class="head"><span class="ey">${icon('flask', 16)}Strategies</span><h1 class="h1">${words('Tested on <em>past prices</em>')}</h1>
    <p class="lede">Each strategy is a scanner plus exit rules. Win rate is how often a past match ended higher.</p></div>
  ${STEPS}
  <div style="display:flex;gap:8px;margin:18px 0 6px">${link('build', `${icon('plus', 17)}Create your own`, 'btn pri sm')}${link('screens', 'Start from a screen', 'btn quiet sm')}</div>
  <div id="mine"></div>
  <section class="sec" style="margin-top:22px"><div class="sech"><div><h2 class="h2">QuantSync <em>library</em></h2></div>
    <div class="seg" id="srt" style="width:220px"><button data-v="win">Win rate</button><button data-v="trades">Trades</button><button data-v="avg">Avg</button></div></div>
    ${SAMPLE}<div class="grp" id="lst"></div>
    <p class="tiny" style="margin:12px 2px 0">Hypothetical tests on past NSE prices with 0.10% costs each way. Past results do not predict future results.</p></section>`;
  const lst = el.querySelector('#lst'), srt = el.querySelector('#srt');
  const draw = () => {
    srt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === sort));
    lst.innerHTML = STRATEGIES.slice().sort((a, b) => b[sort] - a[sort]).map(s => link(`strategies/${s.id}`, `<span class="m"><b>${esc(s.name)}</b><span>${esc(s.about)}</span><small>${s.tf === '1W' ? 'Weekly' : 'Daily'} · ${fmt.int(s.trades)} trades · ${s.open} open now</small></span>
      <span class="wr"><small>Win rate</small><b class="tnum ${wtone(s.win)}">${s.win.toFixed(0)}%</b><span class="tnum ${fmt.tone(s.avg)}">avg ${fmt.pct(s.avg, 2)}</span></span>${icon('chev', 16)}`, 'sr')).join('');
  };
  srt.onclick = e => { const b = e.target.closest('button'); if (b) { sort = b.dataset.v; draw(); } };
  draw();
  /* the person's own saved strategies, if signed in and the server answers */
  try {
    const u = await Promise.race([auth.whenReady(), new Promise(z => setTimeout(() => z(null), 2500))]); if (!u) return;
    const L = await lab.strategies('mine'); if (!L.length || !el.isConnected) return;
    el.querySelector('#mine').innerHTML = `<section class="sec" style="margin-top:22px"><div class="sech"><h2 class="h2">Yours</h2>${link('me', 'Manage')}</div><div class="grp">${L.map(s => link(`s/${s.id}`, `<span class="m"><b>${esc(s.name)}</b><span>${s.tf === '1W' ? 'Weekly' : 'Daily'} · ${fmt.int((s.stats || {}).open || 0)} stocks in it now${s.enhanced ? ' · AI coach on' : ''}</span></span><span class="wr"><small>Win rate</small><b class="tnum">${s.stats && s.stats.win_rate != null ? fmt.plain(s.stats.win_rate) : '—'}</b></span>${icon('chev', 16)}`, 'sr')).join('')}</div></section>`;
  } catch { /* offline: library only */ }
}

function detail(el, id) {
  const s = STRATEGIES.find(x => x.id === id); if (!s) { go('strategies', { replace: true }); return; }
  const D = strategyDetail(s); let tab = 'now';
  const wins = Math.round(s.trades * s.win / 100);
  el.innerHTML = `
  <div class="head">${link('strategies', `${icon('back', 16)}Strategies`, 'ey')}<h1 class="h1" style="font-size:clamp(28px,7vw,42px)">${words(esc(s.name))}</h1><p class="lede">${esc(s.about)}</p></div>
  ${STEPS}
  ${SAMPLE}
  <div class="kpis">
    <div class="big"><small>Win rate</small><b class="tnum ${wtone(s.win)}">${s.win.toFixed(0)}%</b><span>${fmt.int(wins)} of ${fmt.int(s.trades)} past matches ended higher</span></div>
    <div><small>Average per trade</small><b class="tnum ${fmt.tone(s.avg)}">${fmt.pct(s.avg, 2)}</b><span>after costs</span></div>
    <div><small>Typical hold</small><b class="tnum">${s.hold} days</b><span>before an exit rule hit</span></div>
    <div><small>Deepest dip</small><b class="tnum dn">${fmt.pct(s.maxdd)}</b><span>from a peak</span></div>
    <div><small>Best / worst</small><b class="tnum"><span class="up">${fmt.pct(s.best, 0)}</span> / <span class="dn">${fmt.pct(s.worst, 0)}</span></b><span>single trade</span></div>
  </div>
  <div class="card pad" style="margin-top:16px"><div class="legend"><span><i style="--c:var(--brand)"></i>₹1,00,000 following every match</span></div><div id="eq"></div></div>
  <div class="yrs" style="margin-top:14px">${s.y.map(y => `<div><small>${y.y}</small><b class="${wtone(y.win)}">${y.win}%</b><div class="tiny">${y.n} trades</div></div>`).join('')}</div>

  <section class="sec"><div class="rulebox"><div class="edh"><b class="h3">The rules</b><span class="pill">${s.tf === '1W' ? 'Weekly' : 'Daily'} chart</span></div>
    <div class="tiny" style="font-weight:650">Step 1 · Scanner (when a stock enters)</div><pre class="qcode">${esc(s.query)}</pre>
    <div class="tiny" style="font-weight:650">Step 2 · Exit (when it leaves)</div><p class="small">Leaves when it ${esc(exitTxt(s.exit))}.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${link(`build?query=${encodeURIComponent(s.query)}&tf=${s.tf}&name=${encodeURIComponent(s.name)}`, `${icon('edit', 16)}Copy and change it`, 'btn pri sm')}</div></div></section>

  <section class="sec"><div class="seg" id="tb" style="max-width:420px"><button data-v="now">In it now (${D.active.length})</button><button data-v="past">Past trades</button></div><div id="pane" style="margin-top:14px"></div></section>
  <p class="tiny" style="margin-top:14px">Hypothetical test on past prices. Stocks listed met the rules; this is not a recommendation.</p>`;
  line(el.querySelector('#eq'), [{ data: D.eq.map(p => p.v), color: 'var(--brand)', area: true }], { h: 210, dates: D.eq.map(p => p.d), yfmt: v => '₹' + (v / 100000).toFixed(1) + 'L', label: 'Test result', tip: i => `${fmt.date(D.eq[i].d)} · ${fmt.inr(D.eq[i].v)}` });
  const pane = el.querySelector('#pane'), tb = el.querySelector('#tb');
  const paint = () => {
    tb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tab));
    pane.innerHTML = tab === 'now'
      ? `<div class="tb"><div class="th"><span>Stock</span><span>Entered</span><span>At</span><span>Since</span></div>${D.active.sort((a, b) => a.sym.localeCompare(b.sym)).map(x => link(`xray/${encodeURIComponent(x.sym)}`, `<span class="nm">${mono(x.sym)}<span><b>${esc(x.sym)}</b><small>${esc(x.name)}</small></span></span><span>${fmt.date(x.date)}</span><span class="tnum">${fmt.inr(x.entry)}</span><span class="tnum ${fmt.tone(x.ret)}">${fmt.pct(x.ret)}</span>`, 'tr')).join('')}</div>`
      : `<div class="tb t5"><div class="th"><span>Stock</span><span>Entered</span><span>Days</span><span>Exit</span><span>Result</span></div>${D.past.map(x => `<div class="tr"><span class="nm">${mono(x.sym)}<span><b>${esc(x.sym)}</b><small>${fmt.inr(x.entry)} → ${fmt.inr(x.exit)}</small></span></span><span>${fmt.dateY(x.date)}</span><span class="tnum">${x.days}</span><span>${x.why}</span><span class="tnum ${fmt.tone(x.ret)}">${fmt.pct(x.ret)}</span></div>`).join('')}</div>`;
  };
  tb.onclick = e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.v; paint(); } };
  paint();
}
