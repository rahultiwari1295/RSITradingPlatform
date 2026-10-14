import { icon, esc, link, words, auth, lab, skel, errBox, fmt, toast } from '../app.js';

/* My strategies: everything the person built. */
export default async function me(el) {
  el.innerHTML = `<div class="head"><span class="ey">${icon('me', 16)}Me</span><h1 class="h1">${words('My <em>strategies</em>')}</h1></div><div id="b" style="margin-top:16px">${skel(84, 3)}</div>`;
  const b = el.querySelector('#b');
  const u = await auth.whenReady();
  if (!u) {
    b.innerHTML = `<div class="coach"><span class="ey">${icon('spark', 15)}Free account</span><h3>Keep your strategies and let AI coach them</h3><p>Sign in to save what you build, test it on years of past prices, and get the AI coach’s suggestions.</p>
      <button class="btn pri" id="in" style="margin-top:16px">Continue with Google</button></div>`;
    b.querySelector('#in').onclick = () => auth.signIn().then(() => me(el)).catch(e => toast(e.message));
    return;
  }
  const nm = u.displayName || u.email || 'You';
  try {
    const L = await lab.strategies('mine');
    b.innerHTML = `<div class="card pad" style="display:flex;align-items:center;gap:12px;margin-bottom:18px"><span class="avbtn" style="width:44px;height:44px">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(nm.slice(0, 1))}</span>
      <div style="flex:1;min-width:0"><b>${esc(nm)}</b><div class="tiny">${L.length} ${L.length === 1 ? 'strategy' : 'strategies'}</div></div><button class="btn sm quiet" id="out">Sign out</button></div>
      ${L.length ? `<div class="list">${L.map(s => link(`s/${s.id}`, `<span class="mono" style="--h:${(s.name.length * 47) % 360}">${esc(s.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase())}</span>
        <span style="min-width:0"><span class="t" style="display:block">${esc(s.name)}</span><span class="s" style="display:block">${s.tf === '1W' ? 'Weekly' : 'Daily'} · ${fmt.int((s.stats || {}).open || 0)} stocks meet it now${s.enhanced ? ' · AI coach on' : ''}</span></span>${icon('chev', 18)}`, 'li')).join('')}</div>`
        : `<div class="card empty"><span class="ic">${icon('build', 24)}</span><b class="h3">Nothing here yet</b><p class="small" style="max-width:34ch">Describe an idea, test it and save it. It will live here with its AI coach.</p>${link('build', 'Build a strategy', 'btn pri sm')}</div>`}
      <div style="margin-top:14px">${link('build', `${icon('plus', 18)}New strategy`, 'btn block')}</div>`;
    b.querySelector('#out').onclick = () => auth.signOut().then(() => me(el));
  } catch (e) { b.innerHTML = errBox(e.message); const r = b.querySelector('[data-retry]'); if (r) r.onclick = () => me(el); }
}
