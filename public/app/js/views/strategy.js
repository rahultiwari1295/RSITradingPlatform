import { icon, esc, fmt, link, words, lab, go, toast, skel, errBox, empty, mono, ok } from '../app.js';
import { catalog, say } from '../rules.js';
import { renderTest, runJob, HONEST } from '../parts.js';

/* A saved strategy: its rules, its past test, the AI coach, and the stocks that meet it now. */
export default async function strategy(el, r) {
  const id = r.arg, QD = window.QD;
  el.innerHTML = `<div class="head">${skel(40, 1)}${skel(120, 1)}</div>`;
  let s, cat;
  try { [s, cat] = await Promise.all([lab.strategy(id), catalog().catch(() => null)]); }
  catch (e) { el.innerHTML = `<div class="head">${empty('me', e.status === 404 ? 'Strategy not found' : 'This did not load', e.status === 404 ? 'It may be private. Sign in if it is yours.' : e.message, link('me', 'My strategies', 'btn sm pri'))}</div>`; return; }
  const rule = QD.fromRule(s.info.entry), conds = rule.conds || [];
  const ex = {}; ((s.info.exit && s.info.exit.any) || []).forEach(x => { if (x.type === 'stop_pct') ex.stop = x.v; if (x.type === 'target_pct') ex.target = x.v; if (x.type === 'time') ex.time = x.v; });
  let tab = ['coach', 'now', 'settings'].includes(r.q.get('tab')) ? r.q.get('tab') : 'test';

  el.innerHTML = `
  <div class="head">${link('me', `${icon('back', 16)}My strategies`, 'ey')}
    <h1 class="h1" style="font-size:clamp(30px,7.6vw,46px)">${words(esc(s.name))}</h1>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill">${s.tf === '1W' ? 'Weekly' : 'Daily'} chart</span>${s.enhanced ? `<span class="pill ai">${icon('spark', 13)}AI coach filter on</span>` : ''}${s.live_from ? `<span class="pill">Tracking since ${fmt.date(s.live_from)}</span>` : ''}</div></div>
  <div class="rulebox" style="margin-top:14px"><b class="h3">Rules</b>
    ${conds.length ? conds.map((c, i) => `<div class="rule" style="--i:${i}"><span class="n">${i + 1}</span><span class="t">${say(cat, c)}</span></div>`).join(`<div class="join">${rule.mode === 'all' ? 'AND' : 'OR'}</div>`) : '<p class="small">Custom rule set.</p>'}
    ${Object.keys(ex).length ? `<p class="tiny">Test exits: leaves when it ${[ex.stop ? `falls ${ex.stop}%` : '', ex.target ? `rises ${ex.target}%` : '', ex.time ? `after ${ex.time} days` : ''].filter(Boolean).join(', or ')}.</p>` : ''}</div>
  <div class="seg" id="tab" style="margin-top:18px"><button data-v="test">Test</button><button data-v="coach">AI coach</button><button data-v="now">Now</button><button data-v="settings">Settings</button></div>
  <div id="pane" style="margin-top:16px"></div>`;
  const pane = el.querySelector('#pane'), tabs = el.querySelector('#tab');
  const paint = () => { tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tab)); history.replaceState({}, '', `/app/s/${id}${tab === 'test' ? '' : '?tab=' + tab}`); ({ test, coach, now, settings })[tab](); };
  tabs.onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.v; paint(); };
  let alive = true;

  /* ---------- past test ---------- */
  async function test() {
    pane.innerHTML = skel(90, 3);
    for (let k = 0; alive && k < 60; k++) {
      let b; try { b = await lab.strategyBacktest(id); } catch (e) { pane.innerHTML = errBox(e.message, false); return; }
      if (tab !== 'test') return;
      if (b.status === 'done') { await renderTest(pane, b.result, { title: s.name }); return; }
      if (b.status === 'failed') { pane.innerHTML = errBox(b.error || 'The test did not finish. Try again later.', false); return; }
      pane.innerHTML = `<div class="work"><div style="display:flex;gap:10px;align-items:center"><span class="spin" style="color:var(--brand)"></span><b>Testing on past prices</b></div><div class="tiny">${b.status === 'queued' ? 'In line' : 'Working'}${b.position ? ' · position ' + b.position : ''}</div></div>`;
      await new Promise(z => setTimeout(z, 4000));
    }
  }

  /* ---------- AI coach ---------- */
  const head = `<span class="ey">${icon('spark', 15)}AI coach</span><h3>Let AI find what your best matches had in common</h3>
    <p>The coach studies every past match of these rules, trained only on earlier years and checked on later ones it never saw. If a filter keeps the stronger matches, you will see both versions side by side. You decide.</p>`;
  async function coach() {
    pane.innerHTML = `<div class="coach">${head}<div id="cb" style="margin-top:16px">${skel(60, 1)}</div></div><div style="margin-top:12px">${HONEST}</div>`;
    const cb = pane.querySelector('#cb');
    let e; try { e = await lab.enhancement(id); } catch { e = { status: 'none' }; }
    if (tab !== 'coach') return;
    if (!s.mine) { cb.innerHTML = '<p>Only the owner can run the coach on a strategy.</p>'; return; }
    if (e.status === 'queued' || e.status === 'running') { cb.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span class="spin"></span><b>The coach is studying your matches</b></div><p class="tiny" style="color:rgba(228,234,248,.6)">This takes a few minutes. You can leave and come back.</p>`; setTimeout(() => alive && tab === 'coach' && coach(), 5000); return; }
    if (e.status !== 'done') {
      cb.innerHTML = `<button class="btn pri" id="go">${icon('spark', 17)}Start the AI coach</button>${e.status === 'failed' ? `<p class="tiny" style="margin-top:8px;color:#FF9A9E">Last run did not finish${e.reason ? ': ' + esc(e.reason) : ''}. Try again.</p>` : ''}`;
      cb.querySelector('#go').onclick = async () => { try { await runJob(() => lab.enhance(id), cb, 'The coach is studying your matches'); coach(); } catch (x) { toast(x.message); coach(); } };
      return;
    }
    const res = e.result || {}, opts = QD.pickOptions(res);
    const card = (t, st, ai) => `<div class="${ai ? 'ai' : ''}"><small>${t}</small><b>${fmt.plain(st.win_rate)}</b><span>ended higher · ${fmt.int(st.trades)} matches · avg ${fmt.pct(st.avg_ret)}</span></div>`;
    if (!opts.length) {
      cb.innerHTML = `<b style="font-size:17px">${s.enhanced ? 'The coach’s filter is on.' : 'No reliable improvement found.'}</b><p>${s.enhanced ? 'Your strategy uses the filter the coach suggested.' : 'The coach tested many filters and none clearly beat your rules across the years it never saw. Your rules stay as they are.'}</p>
        ${s.enhanced ? '<button class="btn quiet" id="off" style="margin-top:12px">Back to my original rules</button>' : ''}`;
    } else {
      const plain = QD.plainStat(res, 'All');
      cb.innerHTML = opts.map(o => { const st = QD.gateStat(res, o.gate, 'All'), on = s.ai_gate === o.gate; return `<div style="margin-top:6px"><b style="font-size:17px">${esc(o.title)}</b><p>${esc(o.blurb)}</p>
        <div class="cmp">${card('Your rules', plain)}${card('With the coach’s filter', st, true)}</div>
        <div style="margin-top:12px">${on ? `<span class="pill up">${icon('check', 13)}In use</span> <button class="btn sm quiet" id="off">Back to my rules</button>` : `<button class="btn pri" data-gate="${o.gate}">Use this version</button>`}</div></div>`; }).join('<hr style="border:0;height:1px;background:rgba(255,255,255,.12);margin:18px 0">');
    }
    cb.querySelectorAll('[data-gate]').forEach(b => b.onclick = async () => { b.disabled = true; try { await lab.setGate(id, +b.dataset.gate); toast('Done. Its record starts fresh from today.'); s = await lab.strategy(id); coach(); } catch (x) { toast(x.message); b.disabled = false; } });
    const off = cb.querySelector('#off'); if (off) off.onclick = async () => { off.disabled = true; try { await lab.setGate(id, null); toast('Back to your original rules.'); s = await lab.strategy(id); coach(); } catch (x) { toast(x.message); off.disabled = false; } };
  }

  /* ---------- stocks that meet it now ---------- */
  async function now() {
    pane.innerHTML = skel(60, 4);
    let L; try { L = await lab.trades(id, 'active'); } catch (e) { pane.innerHTML = errBox(e.message, false); return; }
    if (tab !== 'now') return;
    L = L.slice().sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));
    pane.innerHTML = L.length ? `<p class="tiny" style="margin:0 2px 10px">Stocks that met your rules and have not reached your exit settings yet. Listed A to Z. What your rules found, not a recommendation.</p>
      <div class="list">${L.map(t => link(`xray/${encodeURIComponent(t.symbol)}`, `${mono(t.symbol)}<span style="min-width:0"><span class="t" style="display:block">${esc(t.symbol)}</span><span class="s" style="display:block">Met your rules ${fmt.date(t.signal_date || t.entry_date)} at ${fmt.inr(t.entry_price)}</span></span>
        <span class="r"><b>${fmt.inr(t.exit_price)}</b><span class="${fmt.tone(t.ret_pct)}">${fmt.pct(t.ret_pct)}</span></span>`, 'li')).join('')}</div>`
      : empty('search', 'No stock meets it right now', 'Your rules are checked after every market close. Stocks appear here when they match.');
  }

  /* ---------- settings ---------- */
  async function settings() {
    let on = false; try { const a = await lab.alerts(); on = !!((a.items || []).find(i => i.id === id) || {}).on; } catch { /* ignore */ }
    if (tab !== 'settings') return;
    pane.innerHTML = `<div class="list">
      <label class="li" style="grid-template-columns:40px 1fr auto;cursor:pointer"><span class="mono" style="--h:230">${icon('bell', 18)}</span><span><span class="t" style="display:block">Notify me about my rules</span><span class="s" style="display:block">When a stock newly meets them after a close</span></span><input type="checkbox" id="al" ${on ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--brand)"></label>
      <button class="li" id="edit" style="width:100%;text-align:left;grid-template-columns:40px 1fr auto"><span class="mono" style="--h:160">${icon('edit', 18)}</span><span><span class="t" style="display:block">Edit a copy in the builder</span><span class="s" style="display:block">Change rules and test again</span></span>${icon('chev', 18)}</button></div>`;
    pane.querySelector('#al').onchange = async e => { try { await lab.follow(id, true, e.target.checked); toast(e.target.checked ? 'You will be notified about your rules.' : 'Notifications off.'); } catch (x) { e.target.checked = !e.target.checked; toast(x.message); } };
    pane.querySelector('#edit').onclick = () => { try { sessionStorage.setItem('qs-lab-draft', JSON.stringify({ tf: s.tf, mode: rule.mode, conds, exit: { stop: ex.stop || null, target: ex.target || null, time: ex.time || null }, name: s.name + ' (copy)', from: s.name })); } catch { /* blocked */ } go('build'); };
  }
  paint();
  return () => { alive = false; };
}
