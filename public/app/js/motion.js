/* Motion layer: every tile, row and card that lands in #view eases in (staggered, on scroll),
   numbers count up, rings and bars fill. Works for async loads, tab switches and redraws via a
   MutationObserver, so views need no changes. Off when the user prefers reduced motion. */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEL = '.blk,.gl>div,.hero-x,.stile,.stile2,.deal,.ni,.grp>a,.r-main,.r-kpis>div,.kp2>div,.pv,.bc,.rulebox,.srvc,.cta,.card,.flow li,.yrs>div,.yrow>div,.pr,.nowbar,.sg>header,.bd-h,.page-h,.head,.landing>*,.how3>*,.rail button,.chips .chip,.dt tbody tr,.mini tr,.info-b,.sec-h,.strow,.sx>*';
const seen = new WeakSet();
let io = null, view = null, q = [], tq = 0;

const fmtLike = (v, src) => {
  const dec = (src.split('.')[1] || '').length;
  return src.includes(',') ? v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
};
function countUp(root) {
  root.querySelectorAll('.tnum, .wring b, .cnt b, .pv-c b').forEach(e => {
    if (seen.has(e)) return; seen.add(e);
    const t = e.firstChild; if (!t || t.nodeType !== 3) return;
    const m = t.nodeValue.match(/^(\s*[^\d\-+]*?)([+-]?)([\d,]+(?:\.\d+)?)(.*)$/s); if (!m) return;
    const end = parseFloat(m[3].replace(/,/g, '')); if (!isFinite(end) || end === 0) return;
    const dur = 900, t0 = performance.now(), ease = x => 1 - Math.pow(1 - x, 4);
    const step = now => { const k = Math.min(1, (now - t0) / dur); t.nodeValue = m[1] + m[2] + fmtLike(end * ease(k), m[3]) + m[4]; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function show(e, i) {
  e.style.setProperty('--d', Math.min(i, 14) * 55 + 'ms');
  e.classList.add('mo-in');
  countUp(e);
  setTimeout(() => { e.classList.remove('mo', 'mo-in'); e.style.removeProperty('--d'); }, 2300 + Math.min(i, 14) * 55);
}
function flush() {
  tq = 0;
  const ents = q.splice(0).sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left));
  ents.forEach((en, i) => { io.unobserve(en.target); show(en.target, i); });
}
function scan(nodes) {
  for (const n of nodes) {
    if (n.nodeType !== 1) continue;
    const list = n.matches(SEL) ? [n, ...n.querySelectorAll(SEL)] : [...n.querySelectorAll(SEL)];
    for (const e of list) {
      if (seen.has(e) || e.closest('footer')) continue;
      seen.add(e);
      const p = e.parentElement && e.parentElement.closest('.mo'); if (p) continue; /* nested: the parent carries it, and counts its numbers */
      if (!e.getClientRects().length) continue; /* not laid out (hidden on this screen size) */
      e.classList.add('mo'); io.observe(e);
    }
  }
}
export function initMotion() {
  view = document.getElementById('view');
  const top = document.getElementById('top'), bar = Object.assign(document.createElement('div'), { id: 'sbar' });
  document.body.append(bar);
  let raf = 0;
  addEventListener('scroll', () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; top && top.classList.toggle('on', scrollY > 6); }); }, { passive: true });
  if (RM || !('IntersectionObserver' in window)) return;
  io = new IntersectionObserver(es => { es.forEach(en => en.isIntersecting && q.push(en)); if (q.length && !tq) tq = requestAnimationFrame(flush); }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  new MutationObserver(ms => scan(ms.flatMap(m => [...m.addedNodes]))).observe(view, { childList: true, subtree: true });
}
/* route loading line */
export const loading = on => document.documentElement.classList.toggle('busy', on);
