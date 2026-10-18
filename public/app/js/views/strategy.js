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
  <div class="head">${s.kind === 'library' || s.kind === 'flagship' ? link('strategies', `${icon('back', 16)}Strategies`, 'ey') : link('me', `${icon('back', 16)}My strategies`, 'ey')}
    <h1 class="h1" style="font-size:clamp(30px,7.6vw,46px)">${words(esc(s.name))}</h1>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill">${s.tf === '1W' ? 'Weekly' : 'Daily'} chart</span>${s.enhanced ? `<span class="pill ai">${icon('spark', 13)}AI coach filter on</span>` : ''}${s.live_from ? `<span class="pill">Tracking since ${fmt.date(s.live_from)}</span>` : ''}</div></div>
  <div class="rulebox" style="margin-top:14px"><b class="h3">Rules</b>
    ${conds.length ? conds.map((c, i) => `<div class="rule" style="--i:${i}"><span class="n">${i + 1}</span><span class="t">${say(cat, c)}</span></div>`).join(`<div class="join">${rule.mode === 'all' ? 'AND' : 'OR'}</div>`) : '<p class="small">Custom rule set.</p>'}
    ${Object.keys(ex).length ? `<p class="tiny">Test exits: leaves when it ${[ex.stop ? `falls ${ex.stop}%` : '', ex.target ? `rises ${ex.target}%` : '', ex.time ? `after ${ex.time} days` : ''].filter(Boolean).join(', or ')}.</p>` : ''}</div>
  <div class="seg" id="tab" style="margin-top:18px"><button data-v="test">Test</button><button data-v="coach">AI coach</button><button data-v="now">Now</button><button data-v="settings">Settings</button></div>
  <div id="pane" style="margin-top:16px"></div>`;
  const pane = el.querySelector('#pane'), tabs = el.querySelector('#tab');
  const paint = () => { tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tab)); history.replaceState(history.state, '', `/app/s/${id}${tab === 'test' ? '' : '?tab=' + tab}`); ({ test, coach, now, settings })[tab](); };
  tabs.onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.v; paint(); };
  let alive = true;

  /* ---------- past test ---------- */
  async function test() {
    pane.innerHTML = skel(90, 3);
    const aiVerdict = s.ai ? s.ai.verdict : null;
    let variantChoice = 'ai';
    if (aiVerdict === 'improved') {
      try {
        const saved = localStorage.getItem('qs-strat-var-' + id);
        if (saved === 'plain' || saved === 'ai') variantChoice = saved;
      } catch { /* blocked */ }
    } else {
      variantChoice = 'plain';
    }

    async function loadTest(v) {
      pane.innerHTML = `
        ${aiVerdict === 'improved' ? `<div class="seg sm" id="vsw" style="margin-bottom:14px"><button type="button" data-v="ai" aria-pressed="${v === 'ai'}">With AI filter</button><button type="button" data-v="plain" aria-pressed="${v === 'plain'}">Plain rules</button></div>` : ''}
        ${aiVerdict === 'no_edge' ? `<div style="margin-bottom:12px"><span class="pill ghost" style="color:var(--ink-2)">AI tested · no gain</span></div>` : ''}
        <div id="tpane">${skel(90, 3)}</div>`;
      const tpane = pane.querySelector('#tpane');
      const vsw = pane.querySelector('#vsw');
      if (vsw) {
        vsw.onclick = e => {
          const b = e.target.closest('button');
          if (!b || b.dataset.v === v) return;
          const nv = b.dataset.v;
          try { localStorage.setItem('qs-strat-var-' + id, nv); } catch { /* blocked */ }
          loadTest(nv);
        };
      }
      for (let k = 0; alive && k < 60; k++) {
        let b;
        try { b = await lab.strategyBacktest(id, aiVerdict === 'improved' ? v : undefined); }
        catch (e) { tpane.innerHTML = errBox(e.message, false); return; }
        if (tab !== 'test') return;
        if (b.status === 'done') {
          await renderTest(tpane, b.result, { title: s.name + (aiVerdict === 'improved' && v === 'ai' ? ' (with AI filter)' : '') });
          return;
        }
        if (b.status === 'failed') { tpane.innerHTML = errBox(b.error || 'The test did not finish. Try again later.', false); return; }
        tpane.innerHTML = `<div class="work"><div style="display:flex;gap:10px;align-items:center"><span class="spin" style="color:var(--brand)"></span><b>Testing on past prices</b></div><div class="tiny">${b.status === 'queued' ? 'In line' : 'Working'}${b.position ? ' · position ' + b.position : ''}</div></div>`;
        await new Promise(z => setTimeout(z, 4000));
      }
    }
    await loadTest(variantChoice);
  }

  /* ---------- AI coach ---------- */
  const head = `<span class="ey">${icon('spark', 15)}AI coach</span><h3>Let AI find what your best matches had in common</h3>
    <p>The coach studies every past match of these rules, trained only on earlier years and checked on later ones it never saw. If a filter keeps the stronger matches, you will see both versions side by side. You decide.</p>`;
  async function coach() {
    pane.innerHTML = `<div class="coach">${head}<div id="cb" style="margin-top:16px">${skel(60, 1)}</div></div><div style="margin-top:12px">${HONEST}</div>`;
    const cb = pane.querySelector('#cb');
    let e; try { e = await lab.enhancement(id); } catch { e = { status: 'none' }; }
    if (tab !== 'coach') return;

    if (e.status === 'queued' || e.status === 'running') {
      cb.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><span class="spin"></span><b>The coach is studying your matches</b></div><p class="tiny" style="color:rgba(228,234,248,.6)">This takes a few minutes. You can leave and come back.</p>`;
      setTimeout(() => alive && tab === 'coach' && coach(), 5000);
      return;
    }

    const isPrebuilt = s.kind === 'library' || s.kind === 'flagship';

    if (e.status !== 'done') {
      if (!s.mine) {
        cb.innerHTML = `<p>${isPrebuilt ? 'AI check has not run yet for this strategy.' : 'Only the owner can run the coach on a strategy.'}</p>
          ${isPrebuilt ? `<button class="btn quiet" id="copy" style="margin-top:14px">${icon('copy', 16)}Make my copy</button><p class="tiny" style="color:var(--ink-2);margin-top:4px">Copy it to change the rules and run the coach yourself.</p>` : ''}`;
        const cp = cb.querySelector('#copy');
        if (cp) cp.onclick = async () => { try { const out = await lab.copyStrategy(id); toast('Copied to your strategies.'); go('s/' + out.id); } catch (x) { toast(x.message); } };
        return;
      }
      cb.innerHTML = `<button class="btn pri" id="go">${icon('spark', 17)}Start the AI coach</button>${e.status === 'failed' ? `<p class="tiny" style="margin-top:8px;color:#FF9A9E">Last run did not finish${e.reason ? ': ' + esc(e.reason) : ''}. Try again.</p>` : ''}`;
      cb.querySelector('#go').onclick = async () => { try { await runJob(() => lab.enhance(id), cb, 'The coach is studying your matches'); coach(); } catch (x) { toast(x.message); coach(); } };
      return;
    }

    const res = e.result || {};
    const verdict = e.verdict || res.verdict;
    const verdictMsg = {
      improved: 'The AI filter kept the stronger matches in years it never saw.',
      no_edge: 'AI tested, no improvement. The plain rules are shown.',
      insufficient: 'Not enough past trades for the AI to learn from.',
      paused_live: 'AI filter paused: it stopped beating the plain rules in live tracking.'
    };

    const checkedDate = res.checked_at || e.as_of;
    const checkedDateStr = checkedDate ? fmt.date(checkedDate) : (e.as_of ? fmt.date(e.as_of) : '');

    let html = '';
    if (isPrebuilt) {
      html += `<div class="tiny" style="color:var(--ink-2);margin-bottom:12px;display:flex;align-items:center;gap:6px">${icon('spark', 14)}<span>AI-checked by QuantSync${checkedDateStr ? ' · ' + esc(checkedDateStr) : ''}</span></div>`;
    }

    if (verdict) {
      const isImp = verdict === 'improved';
      html += `<div class="v-banner" style="padding:12px 14px;border-radius:10px;margin-bottom:14px;background:var(--fill);display:flex;gap:10px;align-items:center">
        <span style="color:${isImp ? 'var(--good)' : 'var(--ink-2)'}">${icon(isImp ? 'check' : 'info', 18)}</span>
        <div><b>${isImp ? 'Verified Edge' : verdict === 'paused_live' ? 'AI Filter Paused' : 'AI Check'}</b>
        <div class="tiny" style="color:var(--ink-2)">${esc(verdictMsg[verdict] || e.reason || 'AI check completed.')}</div></div>
      </div>`;
    }

    if (res.tune || res.valid || res.blind) {
      const tPlain = (res.tune && res.tune.plain) || {};
      const tAi = (res.tune && res.tune.ai) || {};
      const vPlain = (res.valid && res.valid.plain) || {};
      const vAi = (res.valid && res.valid.ai) || {};
      const bPlain = (res.blind && res.blind.plain) || {};
      const bAi = (res.blind && res.blind.ai) || {};

      const cell = (st, isAi) => {
        if (!st || st.trades == null || st.trades === 0) return '<span style="color:var(--ink-3)">—</span>';
        return `<div><b class="tnum ${isAi ? 'good' : ''}">${st.win_rate != null ? fmt.plain(st.win_rate) : '—'}</b> higher</div>
                <div class="tiny" style="color:var(--ink-2)">${fmt.int(st.trades)} matches · avg ${fmt.pct(st.avg_ret)}</div>`;
      };

      const tuneLabel = (res.tune && res.tune.years && res.tune.years.length)
        ? `Learned on ${res.tune.years[0]}–${String(res.tune.years.at(-1)).slice(2)}`
        : 'Learned on 2022–24';
      const validLabel = (res.valid && res.valid.year) ? `Checked on ${res.valid.year}` : 'Checked on 2025';
      const blindLabel = (res.blind && res.blind.year) ? `Blind test ${res.blind.year}` : 'Blind test 2026';

      html += `
      <div style="overflow-x:auto;margin:16px 0">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:13.5px">
          <thead>
            <tr style="border-bottom:1px solid var(--line-2)">
              <th style="padding:8px 6px"></th>
              <th style="padding:8px 6px"><b>${esc(tuneLabel)}</b></th>
              <th style="padding:8px 6px"><b>${esc(validLabel)}</b></th>
              <th style="padding:8px 6px"><b>${esc(blindLabel)}</b></th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--line)">
              <td style="padding:10px 6px;white-space:nowrap"><b>Plain rules</b></td>
              <td style="padding:10px 6px">${cell(tPlain, false)}</td>
              <td style="padding:10px 6px">${cell(vPlain, false)}</td>
              <td style="padding:10px 6px">${cell(bPlain, false)}</td>
            </tr>
            <tr>
              <td style="padding:10px 6px;white-space:nowrap"><b style="color:var(--brand)">With AI filter</b></td>
              <td style="padding:10px 6px">${cell(tAi, true)}</td>
              <td style="padding:10px 6px">${cell(vAi, true)}</td>
              <td style="padding:10px 6px">${cell(bAi, true)}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
    }

    if (isPrebuilt) {
      html += `
        <div style="margin-top:18px">
          <button class="btn quiet" id="copy">${icon('copy', 16)}Make my copy</button>
          <p class="tiny" style="color:var(--ink-2);margin-top:6px">Copy it to change the rules and run the coach yourself.</p>
        </div>`;
    } else if (s.mine) {
      const gate = res.gate || 60;
      if (verdict === 'improved') {
        const on = s.ai_gate === gate || s.enhanced;
        html += `<div style="margin-top:16px">
          ${on ? `<span class="pill up">${icon('check', 13)}In use</span> <button class="btn sm quiet" id="off">Back to my rules</button>`
               : `<button class="btn pri" id="use" data-gate="${gate}">Use this version</button>`}
        </div>`;
      }
    }

    cb.innerHTML = html;

    const copyBtn = cb.querySelector('#copy');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        copyBtn.disabled = true;
        try {
          const cp = await lab.copyStrategy(id);
          toast('Copied to your strategies.');
          go('s/' + cp.id);
        } catch (x) {
          toast(x.message);
          copyBtn.disabled = false;
        }
      };
    }

    const useBtn = cb.querySelector('#use');
    if (useBtn) {
      useBtn.onclick = async () => {
        useBtn.disabled = true;
        try {
          await lab.setGate(id, +useBtn.dataset.gate);
          toast('Done. Its record starts fresh from today.');
          s = await lab.strategy(id);
          coach();
        } catch (x) {
          toast(x.message);
          useBtn.disabled = false;
        }
      };
    }

    const offBtn = cb.querySelector('#off');
    if (offBtn) {
      offBtn.onclick = async () => {
        offBtn.disabled = true;
        try {
          await lab.setGate(id, null);
          toast('Back to your original rules.');
          s = await lab.strategy(id);
          coach();
        } catch (x) {
          toast(x.message);
          offBtn.disabled = false;
        }
      };
    }
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
