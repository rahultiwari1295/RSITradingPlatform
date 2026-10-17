import { icon, esc, link, go, fmt, intel, auth, lab, skel, errBox } from '../app.js';
import { evCard } from './news.js';
import { alertPrefs, seenAt, markSeen, wanted } from '../feel.js';

/* Activity (the bell): two tabs.
   News   = significant things happening now (high-impact filings, deals, insider trades, big headlines).
   Alerts = stocks that entered or left the strategies you switched on. */
const TABS = [['news', 'News'], ['alerts', 'Alerts']];
const day = t => { const d = new Date(t), now = new Date(), k = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5); return k <= 0 ? 'Today' : k === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); };
const tsOf = e => new Date(String(e.ts).replace(' ', 'T') + '+05:30').getTime() || 0;
const goBack = () => { if ((history.state && history.state.i) > 0) history.back(); else go(''); };

export default async function activity(el, r) {
  let tab = TABS.some(t => t[0] === r.q.get('t')) ? r.q.get('t') : 'news', more = false, af = 'all';
  const s0 = seenAt(), QD = window.QD, P = alertPrefs();
  el.innerHTML = `
  <div class="page-h"><div class="act-h"><button class="gearbtn actback" id="ab" type="button" aria-label="Back">${icon('back', 21)}</button><div><h1 class="h1">Activity</h1><p class="lede">What is happening now, and what changed in your strategies.</p></div></div>
    <div class="tabs-x act-t" id="at" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-v="${k}">${l}<i class="tc" data-c="${k}" hidden></i></button>`).join('')}</div></div>
  <div id="ab-body"></div>`;
  const body = el.querySelector('#ab-body'), tabs = el.querySelector('#at');
  el.querySelector('#ab').onclick = goBack;
  const count = (k, n) => { const c = tabs.querySelector(`[data-c="${k}"]`); if (c) { c.hidden = !n; c.textContent = n > 99 ? '99+' : n; } };
  let token = 0;

  /* ---------------- News ---------------- */
  async function news() {
    const L = await intel.top(72, 80);
    const all = (Array.isArray(L) ? L : []).map(e => ({ e, t: tsOf(e) })).sort((a, b) => b.t - a.t);
    const sig = all.filter(x => (x.e.impact || 0) >= P.min && (!x.e.category || P.kinds.includes(x.e.category)) && (P.neg || x.e.sentiment !== 'negative'));
    const list = more ? all.filter(x => (x.e.impact || 0) >= 40) : sig;
    const fresh = sig.filter(x => x.t > s0).length; count('news', fresh);
    let last = '';
    const rows = list.map(({ e, t }) => { const g = day(t), h = g !== last ? `<h4 class="fg">${g}</h4>` : ''; last = g; return `${h}<div class="act-i ${t > s0 ? 'new' : ''}">${evCard(e)}</div>`; }).join('');
    return `<div class="act-note"><span>${more ? 'Impact 40 and up, last 3 days' : `Impact ${P.min} and up, last 3 days`}</span><button class="btn sm quiet" id="mo">${more ? 'Only significant' : 'Show more'}</button></div>
      ${rows || `<div class="card empty"><span class="ic">${icon('check', 24)}</span><b class="h3">Nothing significant right now</b><p class="small" style="max-width:36ch">Big filings, deals and headlines show up here as they happen. You can change what counts as significant in Account.</p>${link('account', 'Alert settings', 'btn sm quiet')}</div>`}
      <p class="disc">Facts from filings and news, scored automatically from 0 to 100. Not investment advice.</p>`;
  }

  /* ---------------- Alerts ---------------- */
  async function alerts() {
    await auth.whenReady();
    let ev, subs = [], signed = !!auth.user;
    if (signed) {
      const WHY = { stop: 'loss limit in its rules', target: 'gain limit in its rules', trail: 'trailing exit in its rules', time: 'time limit in its rules' };
      const server = await lab.changes(30).then(d => (d && Array.isArray(d.items) ? d.items : null)).catch(() => null);
      if (server) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        ev = server.map(e => ({ ...e, age: Math.round((today - new Date(String(e.date).slice(0, 10) + 'T00:00:00')) / 864e5), why: e.kind === 'out' ? (WHY[String(e.reason || '').split('_')[0]] || 'its exit rule') : undefined }));
      } else {
        const m = await lab.matches().catch(() => ({ rows: [] }));
        ev = await QD.changes(m.rows || [], 30);
      }
      subs = ((await lab.alerts().catch(() => ({ items: [] }))).items || []).filter(i => i.on);
    } else ev = await QD.qsai.changes(30);
    const nAdd = ev.filter(x => x.kind === 'add').length, nOut = ev.length - nAdd;
    const list = ev.filter(x => af === 'all' || (af === 'add') === (x.kind === 'add'));
    count('alerts', ev.filter(x => x.age <= 1).length);
    let last = '';
    const rows = list.map(x => { const g = fmt.rel(x.date), h = g !== last ? `<h4 class="fg">${g}</h4>` : ''; last = g;
      const add = x.kind === 'add';
      return `${h}${link(`xray/${encodeURIComponent(x.sym)}`, `<span class="al-k ${add ? 'in' : 'out'}">${icon(add ? 'plus' : 'x', 16)}<i>${add ? 'Entered' : 'Exited'}</i></span>
        <span class="al-m"><b>${esc(x.sym)}</b><small>${add ? 'joined' : 'left'} <em>${esc(x.name || 'QuantSync AI')}</em>${add ? (fmt.inr(x.price) !== '—' ? ` at ${fmt.inr(x.price)}` : '') : ` · held ${x.held} ${x.held === 1 ? 'day' : 'days'} · ${esc(x.why || '')}`}</small></span>
        <span class="al-v tnum ${fmt.tone(add ? x.chg : x.ret)}">${add ? (x.chg != null && !Number.isNaN(+x.chg) ? fmt.pct(x.chg) : '') : fmt.pct(x.ret)}<small>${add ? 'since' : 'result'}</small></span>`, 'al')}`; }).join('');
    const head = signed
      ? `<div class="act-sum"><span><b>${subs.length}</b> ${subs.length === 1 ? 'strategy' : 'strategies'} switched on</span>${link('me', 'Choose strategies', 'btn sm quiet')}</div>`
      : `<div class="nt"><span class="bi">${icon('me', 18)}</span><div><b>Sign in to follow your own strategies</b><span>Showing QuantSync AI for now. Sign in and switch on strategies to get their entries and exits here.</span></div><button class="btn pri sm" id="si">Sign in</button></div>`;
    return `${head}
      <div class="act-f"><div class="seg sm" id="af">${[['all', `All ${ev.length}`], ['add', `Entered ${nAdd}`], ['out', `Exited ${nOut}`]].map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === af}">${l}</button>`).join('')}</div><span class="tiny">last 30 days</span></div>
      ${rows || `<div class="card empty"><span class="ic">${icon('bell', 24)}</span><b class="h3">No entries or exits yet</b><p class="small" style="max-width:36ch">${signed ? 'Switch on alerts for a strategy and every stock that enters or leaves it appears here.' : 'When a stock enters or leaves QuantSync AI it appears here.'}</p>${link(signed ? 'strategies' : 'strategies', 'Browse strategies', 'btn sm quiet')}</div>`}
      <p class="disc">Entries and exits are what each strategy’s rules produced. They are not recommendations.</p>`;
  }

  async function paint() {
    const my = ++token;
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === tab));
    try { history.replaceState(history.state, '', '/app/activity' + (tab === 'news' ? '' : '?t=' + tab)); } catch { /* ignore */ }
    if (!body.firstElementChild) body.innerHTML = skel(110, 3);
    try {
      const html = await (tab === 'news' ? news() : alerts());
      if (my !== token || !body.isConnected) return;
      body.innerHTML = html; wire();
      if (tab === 'news') { markSeen(); window.dispatchEvent(new Event('qs-seen')); }
    } catch (e) { if (my === token && body.isConnected) { body.innerHTML = errBox('Could not load this. ' + (e.message || ''), true); body.querySelector('[data-retry]').onclick = () => { body.innerHTML = skel(110, 3); paint(); }; } }
  }
  function wire() {
    const mo = body.querySelector('#mo'); if (mo) mo.onclick = () => { more = !more; paint(); };
    const f = body.querySelector('#af'); if (f) f.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { af = b.dataset.v; paint(); } };
    const si = body.querySelector('#si'); if (si) si.onclick = async () => { try { await auth.signIn(); } catch { /* cancelled */ } };
  }
  tabs.onclick = e => { const b = e.target.closest('[data-v]'); if (b && b.dataset.v !== tab) { tab = b.dataset.v; body.innerHTML = ''; paint(); window.scrollTo({ top: 0 }); } };
  const off = auth.onChange(() => { if (tab === 'alerts' && el.isConnected) paint(); });
  paint();
  /* the other tab's count, so the dot shows before it is opened */
  (tab === 'news' ? alerts() : news()).catch(() => {});
  return () => off();
}
