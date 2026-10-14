import { icon, esc, fmt, lab, go, toast, needUser, skel, errBox, words, link } from '../app.js';
import { catalog, readIdea, say, toRule, EXIT, ideaById, exitSay } from '../rules.js';
import { stockRow, renderTest, runJob } from '../parts.js';

const KEY = 'qs-lab-draft';
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } };
const keep = s => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* blocked */ } };

/* Build: describe it, read the rules, see today's matches, test it on the past, save it. */
export default async function build(el, r) {
  let S = load() || { tf: '1D', mode: 'all', conds: [], exit: { ...EXIT }, name: '', from: '' };
  const qtext = r.q.get('q'), ideaId = r.q.get('idea');
  let read = null;
  if (ideaId && ideaById(ideaId)) { const x = ideaById(ideaId); S = { tf: x.tf, mode: x.mode, conds: JSON.parse(JSON.stringify(x.conds)), exit: { ...EXIT }, name: x.name, from: x.name }; }
  else if (qtext) { read = readIdea(qtext); S = { tf: read.tf, mode: read.mode, conds: read.conds, exit: { ...EXIT }, name: '', from: qtext }; }
  if (ideaId || qtext) history.replaceState({}, '', '/app/build');
  keep(S);

  el.innerHTML = `
  <div class="head"><span class="ey">${icon('build', 16)}Build</span><h1 class="h1">${words('Your strategy in <em>plain rules.</em>')}</h1>
    <p class="lede">Every rule is shown in words. Change anything, then see which stocks meet it today and how it did in the past.</p></div>
  <div class="stepper" aria-hidden="true"><span class="on" id="s1"></span><span id="s2"></span><span id="s3"></span></div>

  <section class="rulebox" id="describe">
    <label class="h3" for="dq">Describe it</label>
    <div style="display:flex;gap:8px"><input class="inp" id="dq" placeholder="e.g. above 200 DMA and RSI below 40" value="${esc(qtext || '')}" autocomplete="off"><button class="btn sm pri" id="dgo" style="height:46px">Read</button></div>
    <div id="und"></div>
  </section>

  <section class="sec" style="margin-top:18px">
    <div class="rulebox">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><b class="h3">Rules</b>
        <div class="seg" id="tf" style="width:180px"><button data-v="1D">Daily</button><button data-v="1W">Weekly</button></div></div>
      <div class="seg" id="mode"><button data-v="all">Match all rules</button><button data-v="any">Match any rule</button></div>
      <div id="rules" style="display:grid;gap:10px"></div>
      <div id="addwrap"></div>
      <button class="btn pri block" id="scan">${icon('search', 18)}See which stocks match today</button>
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
  function draw() {
    keep(S);
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

  draw(); showRead(read);
}
