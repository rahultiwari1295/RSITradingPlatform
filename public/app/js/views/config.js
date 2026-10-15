import { icon, esc, words, toast, isDark } from '../app.js';

/* Settings: where the Lab server lives, how to sign in, and looks. Saved in this browser only. */
export default async function config(el) {
  const ST = window.QD.settings, s = ST.get(), act = ST.active();
  const rows = [
    ['phone', 'phone', s.phone, 'https://lab.yourdomain.in  or  abc.trycloudflare.com'],
    ['local', 'home', s.local, 'http://localhost:8100'],
    ['site', 'layers', ST.SITE_LAB, ''],
    ['custom', 'edit', s.custom, 'https://…'],
  ];
  el.innerHTML = `
  <div class="head"><span class="ey">${icon('gear', 16)}Settings</span><h1 class="h1">${words('Where the <em>Lab</em> runs')}</h1>
    <p class="lede">Pick the server for scans, tests and strategies. Phone is the default. Settings stay in this browser.</p></div>

  <div class="nowbar" id="now"><span class="dot"></span><span><b>Now using</b><span class="tiny" style="display:block">${esc(act.lab)}</span></span><span class="grow"></span><button class="btn sm quiet" id="tnow">Test</button></div>
  ${act.fallback ? `<div class="honest" style="margin-top:12px">${icon('info', 18)}<span>No phone URL is saved yet, so the Lab uses the site proxy. Paste your phone's tunnel URL below and press Use.</span></div>` : ''}

  <section class="sec" style="margin-top:22px"><div class="sech"><h2 class="h2">Server</h2></div>
    <div class="srv">${rows.map(([k, ic, v, ph]) => `
      <div class="srvc ${s.profile === k ? 'on' : ''}" data-p="${k}">
        <div class="srvh"><span class="ic">${icon(ic, 20)}</span><span style="flex:1;min-width:0"><b>${esc(ST.PROFILES[k].name)}</b>${k === 'phone' ? ' <span class="pill ai">Default</span>' : ''}<span class="tiny" style="display:block">${esc(ST.PROFILES[k].note)}</span></span>
          <span class="radio" aria-hidden="true"></span></div>
        ${k === 'site' ? `<code class="url">${esc(v)}</code>` : `<input class="inp" data-url="${k}" value="${esc(v || '')}" placeholder="${esc(ph)}" inputmode="url" autocapitalize="off" spellcheck="false">`}
        <div class="srvf"><span class="res tiny" data-res="${k}"></span><span class="grow"></span><button class="btn sm quiet" data-test="${k}">Test</button><button class="btn sm pri" data-use="${k}">${s.profile === k ? 'In use' : 'Use'}</button></div>
      </div>`).join('')}</div>
    <p class="tiny" style="margin:10px 2px 0">The address can be the server root; <code>/lab/v1</code> is added for you. A phone or laptop server must allow this site (the Lab API already allows *.vercel.app and localhost).</p>
  </section>

  <section class="sec"><div class="sech"><h2 class="h2">Sign-in</h2></div>
    <div class="rulebox">
      <div class="seg" id="sg"><button data-v="google">Google account</button><button data-v="dev">Local user (no login)</button></div>
      <div id="devrow" ${s.signin === 'dev' ? '' : 'hidden'}><label class="tiny" style="display:grid;gap:6px">User id sent to a server running in dev mode<input class="inp" id="uid" value="${esc(s.devUid || 'local')}" autocapitalize="off" spellcheck="false"></label>
        <p class="tiny" style="margin-top:8px">Only works when the server has <code>auth_mode: dev</code> (your own phone or laptop). Public servers ignore it.</p></div>
    </div>
  </section>

  <section class="sec"><div class="sech"><h2 class="h2">Other</h2></div>
    <div class="rulebox">
      <label class="tiny" style="display:grid;gap:6px">Main API (X-Ray, company data)<input class="inp" id="api" value="${esc(s.api || '/api')}" autocapitalize="off" spellcheck="false"></label>
      <div class="seg" id="th"><button data-v="light">${icon('sun', 16)} Light</button><button data-v="dark">${icon('moon', 16)} Dark</button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="sv" style="flex:1">${icon('save', 17)}Save and reload</button><button class="btn quiet" id="rs">Reset all</button></div>
    </div>
  </section>`;

  const $ = q => el.querySelector(q), $$ = q => [...el.querySelectorAll(q)];
  const val = k => (k === 'site' ? ST.SITE_LAB : ($(`[data-url="${k}"]`) || {}).value || '');
  const show = (box, r) => { box.className = 'res tiny ' + (r.ok ? 'up' : 'dn'); box.innerHTML = r.ok ? `${icon('check', 13)} ${r.ms} ms · data ${esc(r.asOf || '?')} · ${r.symbols ?? '?'} stocks · sign-in ${esc(r.auth || '?')}` : `${icon('warn', 13)} ${esc(r.error)}`; };
  async function test(k) {
    const base = ST.labBase(val(k)) || ST.SITE_LAB, box = $(`[data-res="${k}"]`);
    box.className = 'res tiny'; box.innerHTML = '<span class="spin" style="display:inline-block;vertical-align:-3px"></span> Checking…';
    const r = await ST.probe(base); show(box, r); return r;
  }
  $$('[data-test]').forEach(b => b.onclick = () => test(b.dataset.test));
  $$('[data-use]').forEach(b => b.onclick = async () => {
    const k = b.dataset.use, raw = val(k);
    if (k !== 'site' && !raw.trim()) { toast('Enter the address first.'); $(`[data-url="${k}"]`).focus(); return; }
    const r = await test(k);
    if (!r.ok && !confirmBad()) return;
    const next = { profile: k }; if (k !== 'site') next[k] = raw.trim(); if (r.auth === 'dev' && k !== 'site') next.signin = 'dev';
    ST.save(next);
    toast(r.auth === 'dev' ? 'Saved. That server runs without login, so Local user is on.' : 'Saved. Reloading…'); setTimeout(() => location.reload(), 700);
  });
  let warned = false;
  function confirmBad() { if (warned) return true; warned = true; toast('That server did not answer. Press Use again to save it anyway.'); return false; }

  const seg = (box, v) => box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  let signin = s.signin, theme = isDark() ? 'dark' : 'light';
  seg($('#sg'), signin); seg($('#th'), theme);
  $('#sg').onclick = e => { const b = e.target.closest('button'); if (!b) return; signin = b.dataset.v; seg($('#sg'), signin); $('#devrow').hidden = signin !== 'dev'; };
  $('#th').onclick = e => { const b = e.target.closest('button'); if (!b) return; theme = b.dataset.v; seg($('#th'), theme); document.documentElement.dataset.theme = theme; try { localStorage.setItem('qs-theme', theme); } catch { /* blocked */ } };
  $('#sv').onclick = () => {
    const next = { signin, devUid: ($('#uid').value || 'local').trim(), api: ($('#api').value || '/api').trim() };
    ['phone', 'local', 'custom'].forEach(k => { next[k] = val(k).trim(); });
    try { ST.save(next); } catch (e) { toast(e.message); return; }
    toast('Saved. Reloading…'); setTimeout(() => location.reload(), 600);
  };
  $('#rs').onclick = () => { ST.reset(); toast('Back to defaults. Reloading…'); setTimeout(() => location.reload(), 600); };
  const nowDot = async () => { const d = $('#now .dot'); d.className = 'dot'; const r = await ST.probe(act.lab); d.className = 'dot ' + (r.ok ? 'ok' : 'bad'); $('#now .tiny').textContent = act.lab + (r.ok ? ` · ${r.ms} ms · data ${r.asOf || '?'}` : ` · ${r.error}`); };
  $('#tnow').onclick = nowDot; nowDot();
}
