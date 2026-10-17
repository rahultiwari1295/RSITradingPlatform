/* Feel: haptic taps, and the bell (activity feed + browser notifications). */

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
   The bell badge counts new high-impact items that match the person's alert settings. The full lists live on the Activity page. */
const SEEN = 'qs-feed-seen';
const seen = () => { try { return +localStorage.getItem(SEEN) || 0; } catch { return 0; } };
const markSeen = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch { /* blocked */ } };
export const seenAt = seen;
export const unread = items => { const P = alertPrefs(); return items.filter(x => x.t > seen() && wanted(x, P)).length; };
/** Live feed: the highest-impact filings, deals and insider trades of the last two days (from /api/intel2/top). */
export async function liveFeed(intel) {
  const L = await intel.top(48, 30);
  return (Array.isArray(L) ? L : []).map(e => ({ id: e.id, t: new Date(String(e.ts).replace(' ', 'T') + '+05:30').getTime() || Date.now(), sym: e.symbol || '',
    kind: 'event', cat: e.category, label: e.label || e.type, head: String(e.summary || e.headline || '').split('\n')[0], impact: e.impact || 0, sent: e.sentiment }));
}
/** Alert preferences (this browser): on/off, minimum impact, which kinds, optional watchlist. */
const AK = 'qs-alerts';
export const ALERT_DEFAULT = { on: true, min: 70, kinds: ['filing', 'insider', 'deal', 'meeting', 'news'], neg: true, watch: [] };
export function alertPrefs() { try { return { ...ALERT_DEFAULT, ...JSON.parse(localStorage.getItem(AK) || '{}') }; } catch { return { ...ALERT_DEFAULT }; } }
export function saveAlertPrefs(p) { try { localStorage.setItem(AK, JSON.stringify(p)); } catch { /* blocked */ } }
export const wanted = (x, p) => p.on && (x.impact >= p.min || (p.watch.length && p.watch.includes(x.sym) && x.impact >= 30)) && (!x.cat || p.kinds.includes(x.cat)) && (p.neg || x.sent !== 'negative');
/** While the page is open, tell the user about new items that match their alert settings (browser notification if allowed). */
export function watchFeed(intel, onItems) {
  let known = new Set();
  const tick = async () => {
    try {
      const items = await liveFeed(intel); onItems(items);
      const P = alertPrefs(), fresh = items.filter(x => wanted(x, P) && !known.has(x.id) && x.t > seen());
      if (known.size && fresh.length && notifState() === 'granted') {
        const x = fresh[0], opt = { body: x.head.slice(0, 160), tag: 'qs-' + x.id, icon: '/favicon.ico' };
        try { const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null; if (reg) reg.showNotification(`${x.sym} · ${x.label}`, opt); else new Notification(`${x.sym} · ${x.label}`, opt); } catch { /* ignore */ }
      }
      known = new Set(items.map(x => x.id));
    } catch { /* offline: keep what we have */ }
  };
  tick();
  return setInterval(() => { if (!document.hidden) tick(); }, 5 * 60e3);
}

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

export { markSeen };
