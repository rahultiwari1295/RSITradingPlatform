import { icon, esc, link, toast, auth, setTheme, go } from '../app.js';
import { alertPrefs, saveAlertPrefs, notifState, enableNotifs, ALERT_DEFAULT } from '../feel.js';

/* Account: sign in / create account / sign out, the look (style + light/dark), and alert settings.
   Look and alerts are kept in this browser; the account is the Google sign-in the Lab already uses. */
const getSkin = () => document.documentElement.dataset.skin || 'porcelain';
function setSkin(k) {
  try { localStorage.setItem('qs-skin', k); } catch { /* blocked */ }
  const l = document.getElementById('skin-porcelain'); if (l) l.media = k === 'classic' ? 'not all' : 'all';
  document.documentElement.dataset.skin = k;
}
const getMode = () => { try { return localStorage.getItem('qs-theme') || 'auto'; } catch { return 'auto'; } };
function setMode(m) {
  if (m === 'auto') { try { localStorage.removeItem('qs-theme'); } catch { /* blocked */ } delete document.documentElement.dataset.theme; document.querySelectorAll('[data-theme-btn]').forEach(b => b.setAttribute('aria-checked', matchMedia('(prefers-color-scheme: dark)').matches)); }
  else setTheme(m);
}
const KINDS = [['filing', 'Filings'], ['insider', 'Insider trades'], ['deal', 'Bulk / block deals'], ['meeting', 'Board meetings'], ['news', 'News']];
const SKINS = [
  ['porcelain', 'Porcelain', 'New. Soft cream cards, buttons that press in, rounded and tactile.'],
  ['classic', 'Classic', 'The current look. Cooler tones, flatter and denser.'],
];
const preview = k => `<span class="skp skp-${k}" aria-hidden="true"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i></span>`;

export default async function account(el) {
  const draw = () => {
    const u = auth.user, P = alertPrefs(), ns = notifState(), mode = getMode(), skin = getSkin();
    const name = u ? (u.displayName || u.email || 'You') : '';
    const ini = name.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
    el.innerHTML = `
    <div class="page-h"><div class="ph-row"><div><h1 class="h1">Account</h1><p class="lede">Your sign-in, how the app looks, and which alerts you get.</p></div></div></div>

    <section class="card pad acc-me">
      ${u ? `<div class="acc-id">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span class="acc-av">${esc(ini)}</span>`}<div><b>${esc(name)}</b><small>${esc(u.email || 'Signed in')}</small></div></div>
        <div class="row-b">${link('me', `${icon('learn', 16)}My strategies`, 'btn sm quiet')}<button class="btn sm quiet" id="out">${icon('back', 16)}Sign out</button></div>`
      : `<div class="acc-id"><span class="acc-av">${icon('me', 22)}</span><div><b>You are not signed in</b><small>Sign in to save strategies, follow them and get their alerts on any device.</small></div></div>
        <div class="acc-btns"><button class="btn pri block" id="in">${icon('me', 17)}Sign in with Google</button><button class="btn quiet block" id="up">Create an account</button></div>
        <p class="tiny">New here? “Create an account” uses the same Google sign-in: your account is made the first time you sign in. No password to remember.</p>`}
    </section>

    <section class="sec"><div class="sec-h"><h2 class="h2">Look</h2></div>
      <div class="skins">${SKINS.map(([k, n, d]) => `<button class="skin ${k === skin ? 'on' : ''}" data-skin="${k}" aria-pressed="${k === skin}">${preview(k)}<span class="sk-t"><b>${n}</b><small>${d}</small></span><span class="radio" aria-hidden="true"></span></button>`).join('')}</div>
      <div class="acc-row"><span><b>Light or dark</b><small>Auto follows your phone.</small></span><div class="seg" id="mode">${[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === mode}">${l}</button>`).join('')}</div></div>
    </section>

    <section class="sec"><div class="sec-h"><h2 class="h2">Alerts</h2></div>
      <div class="acc-box">
        ${ns === 'granted' ? `<div class="nt on">${icon('check', 18)}<div><b>Notifications are on in this browser</b><span>You get a notification while QuantSync is open.</span></div><button class="btn sm quiet" id="test">Test</button></div>`
        : ns === 'denied' ? `<div class="nt">${icon('bell', 18)}<div><b>Notifications are blocked</b><span>Allow them for this site in your browser settings, then reload.</span></div></div>`
        : ns === 'ios-install' ? `<div class="nt">${icon('bell', 18)}<div><b>Alerts on iPhone</b><span>Tap Share → Add to Home Screen, open QuantSync from there, then turn alerts on here.</span></div></div>`
        : ns === 'unsupported' ? '' : `<div class="nt"><span class="bi">${icon('bell', 18)}</span><div><b>Turn on notifications</b><span>So alerts reach you even when this tab is in the background.</span></div><button class="btn pri sm" id="en">Enable</button></div>`}
        <label class="acc-row acc-sw"><span><b>Alerts</b><small>High-impact filings, deals and insider trades.</small></span><input type="checkbox" switch id="aon" ${P.on ? 'checked' : ''}><i class="tg" aria-hidden="true"></i></label>
        <div class="acc-row"><span><b>Only when impact is at least</b><small>0–100. Higher means fewer, bigger items.</small></span><div class="seg sm" id="amin">${[50, 60, 70, 80].map(v => `<button data-v="${v}" aria-pressed="${v === P.min}">${v}</button>`).join('')}</div></div>
        <div class="acc-col"><b>Kinds</b><div class="acc-chips" id="akind">${KINDS.map(([k, l]) => `<button class="chip" data-k="${k}" aria-pressed="${P.kinds.includes(k)}">${l}</button>`).join('')}</div></div>
        <label class="acc-row acc-sw"><span><b>Include bad news</b><small>Auditor exits, downgrades, pledges, defaults.</small></span><input type="checkbox" switch id="aneg" ${P.neg ? 'checked' : ''}><i class="tg" aria-hidden="true"></i></label>
        <div class="acc-col"><b>Watchlist</b><small class="tiny">Stocks here alert from impact 30. Separate with commas.</small><input class="inp" id="awatch" placeholder="RELIANCE, HAL, DIXON" value="${esc(P.watch.join(', '))}" autocapitalize="characters" autocomplete="off"></div>
        <div class="row-b"><button class="btn quiet sm" id="areset">Reset alerts</button></div>
      </div>
    </section>

    <section class="sec"><div class="grp">${link('config', `<span class="m"><b>Server</b><span>Where the Lab runs, sign-in mode</span></span>${icon('chev', 18)}`, 'strow')}${link('me', `<span class="m"><b>My strategies</b><span>Saved, followed and tracked</span></span>${icon('chev', 18)}`, 'strow')}</div></section>
    <p class="disc">Look and alert settings are saved in this browser.</p>`;
    wire();
  };

  const wire = () => {
    const $ = s => el.querySelector(s), P = alertPrefs(), save = () => { saveAlertPrefs(P); };
    const sin = async () => { try { await auth.signIn(); } catch (e) { toast(e.message || 'Sign-in did not finish.'); } };
    $('#in') && ($('#in').onclick = sin); $('#up') && ($('#up').onclick = sin);
    $('#out') && ($('#out').onclick = async () => { await auth.signOut(); toast('Signed out'); });
    el.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { setSkin(b.dataset.skin); draw(); toast(b.dataset.skin === 'classic' ? 'Classic look' : 'Porcelain look'); });
    $('#mode').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; setMode(b.dataset.v); draw(); };
    $('#en') && ($('#en').onclick = async () => { const r = await enableNotifs(); toast(r === 'granted' ? 'Notifications are on.' : 'Notifications not turned on.'); draw(); });
    $('#test') && ($('#test').onclick = async () => { try { const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null; const o = { body: 'This is what an alert looks like.', tag: 'qs-test' }; if (reg) reg.showNotification('QuantSync test alert', o); else new Notification('QuantSync test alert', o); } catch { toast('Could not show a notification here.'); } });
    $('#aon').onchange = e => { P.on = e.target.checked; save(); };
    $('#aneg').onchange = e => { P.neg = e.target.checked; save(); };
    $('#amin').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; P.min = +b.dataset.v; save(); $('#amin').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
    $('#akind').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; P.kinds = P.kinds.includes(k) ? P.kinds.filter(x => x !== k) : [...P.kinds, k]; if (!P.kinds.length) P.kinds = [k]; save(); $('#akind').querySelectorAll('[data-k]').forEach(x => x.setAttribute('aria-pressed', P.kinds.includes(x.dataset.k))); };
    let wt = 0; $('#awatch').oninput = e => { clearTimeout(wt); wt = setTimeout(() => { P.watch = e.target.value.toUpperCase().split(/[\s,]+/).filter(Boolean).slice(0, 50); save(); }, 300); };
    $('#areset').onclick = () => { saveAlertPrefs({ ...ALERT_DEFAULT }); draw(); toast('Alerts reset'); };
  };

  draw();
  const off = auth.onChange(() => el.isConnected && draw());
  auth.init();
  return () => off();
}
