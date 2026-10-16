/* Feel: haptic taps, and the bell (activity feed + browser notifications). */
import { STRATEGIES, strategyDetail } from './sample.js';

/* ---------------------------------------------------------------- haptics
   Android/Chrome: navigator.vibrate. iPhone Safari (iOS 18+) has no vibrate API, but toggling an
   <input type="checkbox" switch> gives a real system tick, so we keep a hidden one and click its label. */
let lab = null;
function iosSwitch() {
  if (lab) return lab;
  const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.id = 'qs-hap'; i.tabIndex = -1; i.setAttribute('aria-hidden', 'true');
  lab = document.createElement('label'); lab.htmlFor = 'qs-hap'; lab.setAttribute('aria-hidden', 'true');
  const box = document.createElement('div'); box.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9px;top:-9px';
  box.append(i, lab); document.body.append(box); return lab;
}
const off = () => { try { return localStorage.getItem('qs-haptics') === 'off'; } catch { return false; } };
export function haptic(kind = 'tap') {
  if (off()) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(kind === 'success' ? [12, 40, 18] : kind === 'warn' ? [20, 30, 20] : 9); return; }
    if (/iP(hone|ad|od)/.test(navigator.userAgent)) { const l = iosSwitch(); l.click(); if (kind === 'success') setTimeout(() => l.click(), 90); }
  } catch { /* no haptics here */ }
}
/** Every tap on a button, link, chip or row ticks once. */
export function wireHaptics() {
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    if (e.target.closest('button,a,[role=tab],[data-s],[data-href],.chip,label.btn,input[type=checkbox]')) haptic();
  }, { passive: true });
}

/* ---------------------------------------------------------------- activity feed
   New stocks entering strategies. Sample until the alerts API is connected; signed-in users also get
   their own strategies' matches from the Lab (lab.matches). */
const SEEN = 'qs-feed-seen';
const seen = () => { try { return +localStorage.getItem(SEEN) || 0; } catch { return 0; } };
const markSeen = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch { /* blocked */ } };
export function sampleFeed() {
  const out = [];
  STRATEGIES.forEach((s, k) => strategyDetail(s).active.slice(0, 3).forEach((a, j) => {
    const t = new Date(a.date + 'T15:45:00+05:30').getTime() - (k * 7 + j) * 6e5;
    out.push({ id: s.id + a.sym, t, sym: a.sym, strat: s.name, sid: s.id, price: a.entry, kind: 'enter' });
  }));
  return out.sort((a, b) => b.t - a.t).slice(0, 30);
}
export const unread = items => items.filter(x => x.t > seen()).length;

const when = t => { const d = new Date(t), now = new Date(), days = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5); return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }); };
const time = t => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/* ---------------------------------------------------------------- browser notifications */
export function notifState() {
  if (!('Notification' in window)) return /iP(hone|ad)/.test(navigator.userAgent) ? 'ios-install' : 'unsupported';
  return Notification.permission; // default | granted | denied
}
export async function enableNotifs() {
  if (!('Notification' in window)) return notifState();
  const p = await Notification.requestPermission();
  if (p === 'granted') {
    haptic('success');
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
      const opt = { body: 'You will be told when a stock enters one of your strategies.', icon: '/favicon.ico', tag: 'qs-welcome' };
      if (reg) reg.showNotification('QuantSync alerts are on', opt); else new Notification('QuantSync alerts are on', opt);
    } catch { /* shown in-page instead */ }
  }
  return p;
}

/** Bell sheet content. */
export function feedHTML(items, esc, fmt, icon, link) {
  const st = notifState();
  const card = st === 'granted' ? `<div class="nt on">${icon('check', 18)}<div><b>Notifications are on</b><span>This browser will alert you when a stock enters a strategy.</span></div></div>`
    : st === 'denied' ? `<div class="nt">${icon('bell', 18)}<div><b>Notifications are blocked</b><span>Allow them for this site in your browser settings, then reload.</span></div></div>`
    : st === 'ios-install' ? `<div class="nt">${icon('bell', 18)}<div><b>Get alerts on iPhone</b><span>Tap Share → Add to Home Screen, open QuantSync from there, then turn alerts on.</span></div></div>`
    : st === 'unsupported' ? '' : `<div class="nt"><span class="bi">${icon('bell', 18)}</span><div><b>Turn on alerts</b><span>Get a notification when a stock enters a strategy.</span></div><button class="btn pri sm" data-enable>Enable</button></div>`;
  const s0 = seen(); let last = '';
  const rows = items.map(x => { const g = when(x.t), h = g !== last ? `<h4 class="fg">${g}</h4>` : ''; last = g;
    return h + link(`strategies/${x.sid}`, `<span class="fi ${x.t > s0 ? 'new' : ''}">${esc(x.sym.slice(0, 2))}</span><span class="fm"><b>${esc(x.sym)} entered <em>${esc(x.strat)}</em></b><small>at ${fmt.inr(x.price)} · ${time(x.t)}</small></span>`, 'frow'); }).join('');
  return `<div class="feedh"><h3>Activity</h3><span class="tag-s">Sample</span></div>${card}<div class="feed">${rows || '<p class="empty-s">Nothing new yet.</p>'}</div>
    <div class="row-b" style="margin-top:14px;justify-content:space-between"><a href="/app/config" data-nav class="btn sm quiet" data-close>Server settings</a><button class="btn sm quiet" data-close>Close</button></div>`;
}
export { markSeen };
