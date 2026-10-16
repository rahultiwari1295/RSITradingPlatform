import { icon, esc, fmt, lab, go, toast, needUser, skel, errBox, words, link } from '../app.js';
import { catalog, readIdea, say, toRule, EXIT, ideaById, exitSay } from '../rules.js';
import { parse, format, highlight, vocab, SNIPPETS } from '../query.js';
import { sheet } from '../app.js';
import { stockRow, renderTest, runJob } from '../parts.js';

const KEY = 'qs-lab-draft';
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } };
const keep = s => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* blocked */ } };

/* Build: describe it, read the rules, see today's matches, test it on the past, save it. */
export default async function build(el, r) {
  let S = load() || { tf: '1D', mode: 'all', conds: [], exit: { ...EXIT }, name: '', from: '' };
  const qtext = r.q.get('q'), ideaId = r.q.get('idea'), qq = r.q.get('query');
  let read = null;
  if (ideaId && ideaById(ideaId)) { const x = ideaById(ideaId); S = { tf: x.tf, mode: x.mode, conds: JSON.parse(JSON.stringify(x.conds)), exit: { ...EXIT }, name: x.name, from: x.name }; }
  else if (qtext) { read = readIdea(qtext); S = { tf: read.tf, mode: read.mode, conds: read.conds, exit: { ...EXIT }, name: '', from: qtext }; }
  if (qq) S = { tf: r.q.get('tf') === '1W' ? '1W' : '1D', mode: 'all', conds: [], exit: { ...EXIT }, name: r.q.get('name') || '', from: r.q.get('name') || '' };
  if (ideaId || qtext || qq) history.replaceState({}, '', '/app/build');
  keep(S);

  el.innerHTML = `
  <div class="head"><span class="ey">${icon('search', 16)}Scanner</span><h1 class="h1">${words('Write it. <em>Scan it.</em> Test it.')}</h1>
    <p class="lede">Type conditions one per line, like a screener query. Every line is checked as you type and shown in plain words below.</p></div>
  <div class="stepper" aria-hidden="true"><span class="on" id="s1"></span><span id="s2"></span><span id="s3"></span></div>

  <div id="mine"></div>
  <section class="rulebox" id="editor">
    <div class="edh"><b class="h3">Query</b><div class="seg" id="emode" style="width:200px"><button data-v="query">Query</button><button data-v="words">Plain words</button></div></div>
    <div id="qpane">
      <div class="qed"><pre class="qhl" id="qhl" aria-hidden="true"></pre><textarea id="qt" rows="5" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off" aria-label="Scanner query" placeholder="close > sma(200)&#10;and rsi(14) < 40&#10;and rvol > 2"></textarea></div>
      <div class="qsug" id="qsug" aria-label="Suggestions"></div>
      <div id="qdiag" aria-live="polite"></div>
      <div class="qsnip" id="qsnip"><span class="tiny">Insert</span>${SNIPPETS.map(([l, q]) => `<button type="button" data-snip="${esc(q)}">${esc(l)}</button>`).join('')}</div>
      <div class="qbar"><button class="btn sm quiet" id="qhelp">${icon('info', 16)}Syntax</button><button class="btn sm quiet" id="qsave">${icon('save', 16)}Save scanner</button><span class="grow"></span><span class="tiny kbd">Ctrl + Enter to scan</span></div>
    </div>
    <div id="wpane" hidden>
      <div style="display:flex;gap:8px"><input class="inp" id="dq" placeholder="e.g. above 200 DMA and RSI below 40" value="${esc(qtext || '')}" autocomplete="off"><button class="btn sm pri" id="dgo" style="height:46px">Read</button></div>
      <div id="und" style="margin-top:10px"></div>
    </div>
  </section>

  <section class="sec" style="margin-top:18px">
    <div class="rulebox">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b class="h3">Rules in plain words</b>
        <div class="seg" id="tf" style="width:180px"><button data-v="1D">Daily</button><button data-v="1W">Weekly</button></div></div>
      <div class="seg" id="mode"><button data-v="all">Match all rules</button><button data-v="any">Match any rule</button></div>
      <div id="rules" style="display:grid;gap:10px"></div>
      <div id="addwrap"></div>
      <button class="btn pri block" id="scan">${icon('search', 18)}Run scan on today's close</button>
    </div>
  </section>

  <section class="sec" id="res" hidden></section>

  <section class="sec" id="test" hidden>
    <div class="sech"><h2 class="h2">How would it have <em>done?</em></h2></div>
    <div class="rulebox">
      <p class="small">Choose when each past match leaves the test. These are test settings, not advice.</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        <label class="tiny" style="display:grid;gap:5px">Falls by (%)<input class="inp" id="xs" inputmode="decimal" value="${S.exit.stop}"></label>
        <label class="tiny" style="display:grid;gap:5px">Rises by (%)<input class="inp" id="xt" inputmode="decimal" value="${S.exit.target}"></label>
        <label class="tiny" style="display:grid;gap:5px">Or after (days)<input class="inp" id="xd" inputmode="numeric" value="${S.exit.time}"></label>
      </div>
      <button class="btn pri block" id="run">${icon('play', 16)}Run the test on past prices</button>
      <div id="tbox"></div>
    </div>
    <div id="tres" style="margin-top:14px"></div>
    <div id="save" hidden style="margin-top:14px"></div>
  </section>`;

  const cat = await catalog().catch(() => null);
  const $ = s => el.querySelector(s);
  const seg = (box, v, on) => { box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); box.onclick = e => { const b = e.target.closest('button'); if (!b) return; on(b.dataset.v); seg(box, b.dataset.v, on); }; };
  const step = k => ['#s1', '#s2', '#s3'].forEach((s, i) => $(s).classList.toggle('on', i < k));

  function showRead(x) {
    if (!x) { $('#und').innerHTML = ''; return; }
    $('#und').innerHTML = x.conds.length
      ? `<div class="understood">${x.understood.map(u => `<span>${icon('check', 13)}${esc(u)}</span>`).join('')}${x.leftover ? `<span class="no">${esc(x.leftover.slice(0, 40))}</span>` : ''}</div>${x.leftover ? '<p class="tiny" style="margin-top:6px">Crossed-out words were not turned into a rule. Add them below if you need them.</p>' : ''}`
      : `<p class="small">I could not turn that into rules yet. Try words like “52-week high”, “RSI below 30”, “above 200 DMA”, “golden cross” or “2x volume”, or add a rule below.</p>`;
  }
  let fromEditor = false;
  function draw() {
    keep(S);
    if (!fromEditor) setText(format(S.mode, S.conds));
    seg($('#tf'), S.tf, v => { S.tf = v; keep(S); hideResults(); });
    seg($('#mode'), S.mode, v => { S.mode = v; draw(); hideResults(); });
    $('#rules').innerHTML = S.conds.length ? S.conds.map((x, i) => `${i ? `<div class="join">${S.mode === 'all' ? 'AND' : 'OR'}</div>` : ''}<div class="rule" style="--i:${i}"><span class="n">${i + 1}</span><span class="t">${say(cat, x)}</span><button data-del="${i}" aria-label="Remove rule">${icon('x', 18)}</button></div>`).join('')
      : `<p class="small" style="text-align:center;padding:10px">No rules yet. Describe your idea above, pick one from ${link('ideas', '<b style="color:var(--brand)">Ideas</b>')}, or add a rule.</p>`;
    $('#scan').disabled = !S.conds.length;
    $('#addwrap').innerHTML = `<button class="btn quiet block" id="addb">${icon('plus', 18)}Add a rule</button>`;
    $('#addb').onclick = addForm;
  }
  $('#rules').onclick = e => { const b = e.target.closest('[data-del]'); if (!b) return; S.conds.splice(+b.dataset.del, 1); draw(); hideResults(); };
  const hideResults = () => { $('#res').hidden = true; $('#test').hidden = true; step(1); };

  function addForm() {
    if (!cat) { toast('Rule list is not available right now.'); return; }
    const groups = [...new Set(cat.features.map(f => f.group))];
    const fsel = (id, numOpt) => `<select class="inp" id="${id}">${numOpt ? '<option value="#">A number</option>' : ''}${groups.map(g => `<optgroup label="${esc(g)}">${cat.features.filter(f => f.group === g && (!numOpt || f.kind !== 'bool')).map(f => `<option value="${f.key}">${esc(f.label)}</option>`).join('')}</optgroup>`).join('')}</select>`;
    const ops = cat.operators.filter(o => !['in', 'is_true', '==', '!='].includes(o.op));
    $('#addwrap').innerHTML = `<div class="addf"><div class="r3">${fsel('af')}<select class="inp" id="ao">${ops.map(o => `<option value="${o.op}">${esc(o.label || o.op)}</option>`).join('')}</select><span id="avw"></span></div>
      <div style="display:flex;gap:8px"><button class="btn sm pri" id="aok" style="flex:1">Add</button><button class="btn sm quiet" id="ax">Cancel</button></div></div>`;
    const af = $('#af'), ao = $('#ao');
    const paint = () => {
      const f = cat.features.find(x => x.key === af.value);
      ao.parentElement.style.display = f.kind === 'bool' ? 'none' : '';
      $('#avw').innerHTML = f.kind === 'bool' ? '' : ao.value === 'between' ? `<div style="display:flex;gap:6px"><input class="inp" id="av0" inputmode="decimal" value="30"><input class="inp" id="av1" inputmode="decimal" value="50"></div>` : ao.value.startsWith('crosses') ? fsel('avf', true).replace('<select class="inp" id="avf">', '<select class="inp" id="avf">') : `<input class="inp" id="avc" inputmode="decimal" value="50" aria-label="Value">`;
    };
    af.onchange = paint; ao.onchange = paint; paint();
    $('#ax').onclick = draw;
    $('#aok').onclick = () => {
      const f = cat.features.find(x => x.key === af.value); let x;
      if (f.kind === 'bool') x = { l: { f: f.key }, op: 'is_true' };
      else if (ao.value === 'between') x = { l: { f: f.key }, op: 'between', r: { list: [parseFloat($('#av0').value), parseFloat($('#av1').value)] } };
      else if ($('#avf')) x = { l: { f: f.key }, op: ao.value, r: $('#avf').value === '#' ? { c: 50 } : { f: $('#avf').value } };
      else x = { l: { f: f.key }, op: ao.value, r: { c: parseFloat($('#avc').value) } };
      if (x.r && x.r.list && !x.r.list.every(Number.isFinite) || x.r && 'c' in x.r && !Number.isFinite(x.r.c)) { toast('Enter a number.'); return; }
      S.conds.push(x); draw(); hideResults();
    };
  }

  $('#dgo').onclick = () => { const v = $('#dq').value.trim(); if (!v) return; read = readIdea(v); showRead(read); if (read.conds.length) { S = { ...S, tf: read.tf, mode: read.mode, conds: read.conds, from: v }; draw(); hideResults(); } };
  $('#dq').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#dgo').click(); } });

  /* step 2: today's matches */
  $('#scan').onclick = async () => {
    const box = $('#res'); box.hidden = false; box.innerHTML = skel(60, 5); step(2);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      const res = await lab.scan(S.tf, toRule(S.mode, S.conds));
      const rows = (res.rows || []).slice().sort((a, b) => a.symbol.localeCompare(b.symbol));
      const shown = 30;
      box.innerHTML = `<div class="count"><b>${fmt.int(res.count ?? rows.length)}</b><span>${(res.count ?? rows.length) === 1 ? 'stock meets' : 'stocks meet'} your rules${res.as_of ? ' after the ' + fmt.date(res.as_of) + ' close' : ''}</span></div>
        <p class="tiny" style="margin:6px 2px 12px">Listed A to Z. This is what your rules found, not a recommendation. Tap a stock to understand it.</p>
        ${rows.length ? `<div class="list" id="rl">${rows.slice(0, shown).map(stockRow).join('')}${rows.length > shown ? `<button class="more" id="rm">Show all ${rows.length}</button>` : ''}</div>` : `<div class="card pad"><b class="h3">No stock meets these rules today</b><p class="small" style="margin-top:4px">That is common for strict rules. You can still test how they did in the past.</p></div>`}`;
      const m = box.querySelector('#rm'); if (m) m.onclick = () => { box.querySelector('#rl').innerHTML = rows.map(stockRow).join(''); };
      $('#test').hidden = false; step(3);
    } catch (e) { box.innerHTML = errBox(e.message); const b = box.querySelector('[data-retry]'); if (b) b.onclick = () => $('#scan').click(); }
  };

  /* step 3: test on past prices, then save */
  $('#run').onclick = async () => {
    const u = await needUser('A free account runs tests on years of past prices and keeps your strategies.'); if (!u) return;
    S.exit = { stop: parseFloat($('#xs').value) || null, target: parseFloat($('#xt').value) || null, time: parseInt($('#xd').value, 10) || null }; keep(S);
    const ex = window.QD.buildExit(S.exit.stop ?? '', S.exit.target ?? '', S.exit.time ?? '');
    $('#run').disabled = true; $('#tres').innerHTML = '';
    try {
      const j = await runJob(() => lab.backtest(S.tf, toRule(S.mode, S.conds), ex), $('#tbox'), 'Testing your rules on past prices');
      $('#tbox').innerHTML = '';
      await renderTest($('#tres'), j.result);
      const sv = $('#save'); sv.hidden = false;
      sv.innerHTML = `<div class="coach"><span class="ey">${icon('spark', 15)}Next: the AI coach</span><h3>Save it and let AI study it</h3><p>The coach learns from every past match of your rules and suggests a filter that kept the stronger ones. You decide whether to use it.</p>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><input class="inp" id="nm" maxlength="60" placeholder="Name your strategy" value="${esc(S.name || '')}" style="flex:1;min-width:180px;background:rgba(255,255,255,.95);color:#0B1128"><button class="btn pri" id="svb">${icon('save', 17)}Save</button></div>
        <p class="tiny" style="color:rgba(228,234,248,.55);margin-top:10px">Exit settings: leave when it ${exitSay(S.exit).join(', or ')}.</p></div>`;
      sv.querySelector('#svb').onclick = async () => {
        let nm = sv.querySelector('#nm').value.trim(); if (nm.length < 2) nm = 'My strategy ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        sv.querySelector('#svb').disabled = true;
        try { const s = await lab.createStrategy({ name: nm, tf: S.tf, entry: toRule(S.mode, S.conds), exit: ex }); toast('Saved. Opening the AI coach.'); go('s/' + s.id + '?tab=coach'); }
        catch (e) { toast(e.message); sv.querySelector('#svb').disabled = false; }
      };
    } catch (e) { $('#tbox').innerHTML = errBox(e.message, false); }
    finally { $('#run').disabled = false; }
  };


  /* ---------------------------------------------------------------- query editor */
  const qt = $('#qt'), qhl = $('#qhl'), V = vocab(cat);
  const grow = () => { qt.style.height = 'auto'; qt.style.height = Math.max(132, qt.scrollHeight) + 'px'; };
  const paintHl = () => { qhl.innerHTML = highlight(qt.value, cat); grow(); };
  function setText(t) { if (qt.value !== t) { qt.value = t; paintHl(); check(false); } }
  function check(apply = true) {
    const v = qt.value.trim(), d = $('#qdiag');
    if (!v) { d.innerHTML = ''; return null; }
    const r = parse(qt.value, cat);
    d.innerHTML = r.errors.length
      ? `<div class="qerr">${r.errors.map(e => `<div>${icon('warn', 15)}<span>${e.n ? `<b>Line ${e.n}</b> · ` : ''}${esc(e.error)}</span></div>`).join('')}</div>`
      : `<div class="qok">${icon('check', 15)}<span>${r.conds.length} ${r.conds.length === 1 ? 'condition' : 'conditions'}, ${r.mode === 'any' ? 'any can match' : 'all must match'}</span></div>`;
    if (apply && !r.errors.length && r.conds.length) { S.conds = r.conds; S.mode = r.mode; fromEditor = true; draw(); fromEditor = false; hideResults(); }
    return r;
  }
  let ct = 0;
  qt.addEventListener('input', () => { paintHl(); suggest(); clearTimeout(ct); ct = setTimeout(check, 250); });
  qt.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); const r = check(); if (r && !r.errors.length && r.conds.length) $('#scan').click(); return; }
    if (e.key === 'Tab' && !e.shiftKey) { const b = $('#qsug button'); if (b) { e.preventDefault(); b.click(); } }
    if (e.key === 'Escape') $('#qsug').innerHTML = '';
  });
  qt.addEventListener('click', suggest); qt.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== qt) $('#qsug').innerHTML = ''; }, 150));
  function word() { const pre = qt.value.slice(0, qt.selectionStart), m = pre.match(/[A-Za-z_][A-Za-z0-9_(]*$/); return m ? m[0] : ''; }
  function suggest() {
    const w = word().toLowerCase(), box = $('#qsug');
    if (!w) { box.innerHTML = ''; return; }
    const hits = V.filter(([t]) => t.toLowerCase().startsWith(w) && t.toLowerCase() !== w).slice(0, 8);
    box.innerHTML = hits.map(([t, h], i) => `<button type="button" data-t="${esc(t)}" ${i ? '' : 'class="on"'}><b>${esc(t)}</b>${h ? `<span>${esc(h)}</span>` : ''}</button>`).join('');
  }
  function insert(txt, replaceWord) {
    const a = qt.selectionStart, b = qt.selectionEnd, w = replaceWord ? word().length : 0;
    const before = qt.value.slice(0, a - w), after = qt.value.slice(b);
    const pad = !replaceWord && before && !/\n\s*$/.test(before) ? '\nand ' : '';
    const ins = pad + txt + (replaceWord && !/^\s/.test(after) ? ' ' : '');
    qt.value = before + ins + after; const c = (before + ins).length;
    qt.focus(); qt.setSelectionRange(c, c); paintHl(); $('#qsug').innerHTML = ''; check();
  }
  $('#qsug').addEventListener('mousedown', e => e.preventDefault());
  $('#qsug').onclick = e => { const b = e.target.closest('[data-t]'); if (b) insert(b.dataset.t, true); };
  $('#qsnip').onclick = e => { const b = e.target.closest('[data-snip]'); if (!b) return; qt.selectionStart = qt.selectionEnd = qt.value.length; insert(b.dataset.snip, false); };
  $('#emode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'query'));
  $('#emode').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#emode').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#qpane').hidden = b.dataset.v !== 'query'; $('#wpane').hidden = b.dataset.v === 'query'; (b.dataset.v === 'query' ? qt : $('#dq')).focus(); };
  $('#qhelp').onclick = () => sheet(`<h3>Query syntax</h3><p class="small" style="margin-bottom:12px">One condition per line. Start lines with <b>and</b> (all must match) or <b>or</b> (any can match). <b>#</b> starts a comment.</p>
    <div class="qref">${[
      ['Compare', 'close > sma(200)', 'rsi(14) <= 30'], ['Cross', 'sma(50) crosses above sma(200)', 'macd crosses below signal'], ['Range', 'rsi(14) between 40 and 60', ''],
      ['Averages', 'sma(10|20|50|100|150|200)', 'ema(9|10|20|21|50|100|200)'], ['Highs, lows', 'high(20)  high(52w)', 'low(20)  low(52w)'], ['Change %', 'change(1) > 3', 'change(5)  change(20)  gap > 2'],
      ['Volume', 'rvol > 2  (× 20-day avg)', 'volume > avg_volume'], ['Indicators', 'adx(14)  atr(14)  cci(20)', 'macd  signal  bb_upper  bb_lower'], ['Yes / no', 'green  inside_bar', 'rs_leader  stage2  power_gap  apex_base  high_tight_flag'],
    ].map(([h, a, b]) => `<div><small>${h}</small><code>${esc(a)}</code>${b ? `<code>${esc(b)}</code>` : ''}</div>`).join('')}</div>
    <button class="btn quiet block" data-close style="margin-top:16px">Close</button>`);

  /* saved scanners: kept in this browser */
  const SK = 'qs-scanners';
  const mine = () => { try { return JSON.parse(localStorage.getItem(SK) || '[]'); } catch { return []; } };
  const putMine = L => { try { localStorage.setItem(SK, JSON.stringify(L.slice(0, 40))); } catch { toast('This browser blocked saving.'); } };
  function drawMine() {
    const L = mine(), box = $('#mine');
    box.innerHTML = L.length ? `<div class="sech" style="margin:0 2px 10px"><b class="h3">My scanners</b><span class="tiny">${L.length} saved in this browser</span></div>
      <div class="chips" style="margin-bottom:14px">${L.map((x, i) => `<span class="chip sv"><button type="button" data-load="${i}">${esc(x.name)}<small>${x.tf === '1W' ? 'W' : 'D'}</small></button><button type="button" data-rm="${i}" aria-label="Delete ${esc(x.name)}">${icon('x', 14)}</button></span>`).join('')}</div>` : '';
  }
  $('#mine').onclick = e => {
    const L = mine(), ld = e.target.closest('[data-load]'), rm = e.target.closest('[data-rm]');
    if (ld) { const x = L[+ld.dataset.load]; S.tf = x.tf || '1D'; S.name = x.name; qt.value = x.q; paintHl(); check(); draw(); toast(`Loaded “${x.name}”`); }
    if (rm) { const x = L.splice(+rm.dataset.rm, 1)[0]; putMine(L); drawMine(); toast(`Deleted “${x.name}”`); }
  };
  $('#qsave').onclick = () => {
    const r = check(); if (!r || r.errors.length || !r.conds.length) { toast('Fix the query first.'); return; }
    const sh = sheet(`<h3>Save scanner</h3><p class="small" style="margin-bottom:12px">Kept in this browser. Save it as a strategy after a test to track it on the server.</p>
      <input class="inp" id="snm" maxlength="40" placeholder="Name" value="${esc(S.name || '')}"><div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" id="sok" style="flex:1">Save</button><button class="btn quiet" data-close>Cancel</button></div>`);
    const nm = sh.el.querySelector('#snm'); setTimeout(() => nm.focus(), 350);
    const doSave = () => { const n = nm.value.trim() || 'Scanner ' + (mine().length + 1); const L = mine().filter(x => x.name !== n); L.unshift({ name: n, q: qt.value.trim(), tf: S.tf, at: Date.now() }); putMine(L); S.name = n; keep(S); drawMine(); sh.close(); toast(`Saved “${n}”`); };
    sh.el.querySelector('#sok').onclick = doSave; nm.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
  };
  drawMine();

  draw(); showRead(read);
  if (qq) { qt.value = qq; paintHl(); check(); if (r.q.get('test')) setTimeout(() => $('#scan').click(), 300); }
  if (read && read.conds.length) { $('#emode [data-v="words"]').click(); }
}
