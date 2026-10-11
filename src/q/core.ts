/* Core helpers + the motion engine for the QuantSync calm-luxe UI.
   Motion is imperative on purpose: one rAF loop drives springs, scroll-linked entrances,
   list "jelly", hero parallax and reveal triggers, so React re-renders never stutter it. */

export const RM: boolean =
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const q = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .map((w) => "q-" + w)
    .join(" ");

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const num = (v: any): number => {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[₹,%\s]/g, "").replace("−", "-"));
  return isNaN(n) ? NaN : n;
};
export const inr = (n: number, d = 0) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const px = (n: any) => {
  const v = num(n);
  if (!isFinite(v)) return "—";
  return v >= 1000 ? inr(v, 0) : inr(v, v >= 100 ? 1 : 2);
};
export const sgn = (n: any, d = 1) => {
  const v = num(n);
  if (!isFinite(v)) return "—";
  return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d) + "%";
};
export const cr = (n: any) => {
  const v = num(n);
  return isFinite(v) ? "₹" + Math.round(v).toLocaleString("en-IN") + " Cr" : "—";
};
export const fmtv = (v: number, f: string) =>
  f === "pct" ? Math.round(v) + "%" : f === "pct1" ? v.toFixed(1) + "%" : f === "spct" ? (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%" : f === "inr" ? inr(v) : Math.round(v).toLocaleString("en-IN");

export function hash(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/* ---------------- springs ---------------- */
const SPR: Spring[] = [];
export class Spring {
  x: number; t: number; v = 0; k: number; c: number; on: (x: number) => void; done: null | (() => void) = null;
  constructor(x: number, k: number, c: number, on: (x: number) => void) {
    this.x = x; this.t = x; this.k = k; this.c = c; this.on = on;
  }
  to(t: number, v?: number | null, done?: () => void) {
    this.t = t;
    if (v != null) this.v = v;
    this.done = done || null;
    if (RM) { this.x = t; this.v = 0; this.on(t); done && done(); return; }
    if (SPR.indexOf(this) < 0) SPR.push(this);
  }
  set(x: number) {
    this.x = x; this.t = x; this.v = 0; this.on(x);
    const i = SPR.indexOf(this);
    if (i >= 0) SPR.splice(i, 1);
  }
  stop() { const i = SPR.indexOf(this); if (i >= 0) SPR.splice(i, 1); }
}
function stepSprings(dt: number) {
  for (let i = SPR.length - 1; i >= 0; i--) {
    const s = SPR[i], h = dt / 4;
    for (let j = 0; j < 4; j++) { const a = -s.k * (s.x - s.t) - s.c * s.v; s.v += a * h; s.x += s.v * h; }
    if (Math.abs(s.v) < 0.02 && Math.abs(s.x - s.t) < 0.002) {
      s.x = s.t; s.v = 0; SPR.splice(i, 1); s.on(s.x); s.done && s.done();
    } else s.on(s.x);
  }
}

/* ---------------- reveal: rings, arcs, bars, counters ---------------- */
function countUp(n: HTMLElement) {
  if ((n as any)._c) return;
  (n as any)._c = 1;
  const to = +(n.getAttribute("data-count") || 0), f = n.getAttribute("data-fmt") || "int", t0 = performance.now() + 150;
  if (RM) { n.textContent = fmtv(to, f); return; }
  const s = (t: number) => {
    const k = clamp((t - t0) / 1300, 0, 1), e = 1 - Math.pow(1 - k, 4);
    n.textContent = fmtv(to * e, f);
    if (k < 1) requestAnimationFrame(s);
  };
  requestAnimationFrame(s);
}
export function reveal(el: Element) {
  if (el.classList.contains("q-vis")) return;
  el.classList.add("q-vis");
  el.querySelectorAll(".q-rg").forEach((c) => c.setAttribute("stroke-dashoffset", String(+(c.getAttribute("data-c") || 0) * (1 - +(c.getAttribute("data-v") || 0) / 100))));
  el.querySelectorAll(".q-arc").forEach((c) => c.setAttribute("stroke-dasharray", (c.getAttribute("data-l") || "0") + " 100"));
  el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
}

/* ---------------- engine ---------------- */
/* Scrolling is native. Nothing here touches layout per frame: entrances and reveals run from one
   IntersectionObserver (CSS transitions on transform/opacity), and the loop only steps springs and
   the hero parallax when the scroll position actually changed. */
const E = {
  scroller: null as HTMLElement | null,
  running: false,
  guards: [] as HTMLElement[],
  io: null as IntersectionObserver | null,
  seen: new WeakSet<Element>(),
  lastSt: -1,
  lastSc: null as HTMLElement | null,
  touching: false,
  settleT: 0 as any,
};
const WATCH = ".q-en,.q-card,.q-list,.q-hero,.q-spark,.q-reveal";
function show(el: Element, i: number) {
  reveal(el);
  if (el.classList.contains("q-en")) {
    (el as HTMLElement).style.transitionDelay = RM ? "" : Math.min(i, 6) * 70 + "ms";
    el.classList.add("q-in");
  }
}
function observer(): IntersectionObserver | null {
  if (E.io) return E.io;
  if (typeof IntersectionObserver === "undefined") return null;
  E.io = new IntersectionObserver((ents) => {
    let i = 0;
    for (const en of ents) if (en.isIntersecting) { show(en.target, i++); E.io!.unobserve(en.target); }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
  return E.io;
}

/** Point the engine at the scroller the user is looking at (a tab screen or the detail page). */
export function setScroller(el: HTMLElement | null, _replay = true) {
  E.scroller = el;
  E.lastSt = -1;
  rescan();
}
/** Pick up new animated blocks after content changes (data arrived, filter changed). */
export function rescan(_replay = false) {
  const sc = E.scroller; if (!sc) return;
  const io = observer();
  sc.querySelectorAll(WATCH).forEach((el) => {
    if (E.seen.has(el)) return;
    E.seen.add(el);
    if (!io || RM) show(el, 0); else io.observe(el);
  });
}
export function guardScroll(...els: HTMLElement[]) { E.guards = els; }

/* after a scroll comes to rest, ease a nearby section heading up under the header */
function settle(sc: HTMLElement) {
  if (RM || E.touching) return;
  const sr = sc.getBoundingClientRect(), want = sr.top + 62;
  let best: HTMLElement | null = null, bd = 1e9;
  sc.querySelectorAll<HTMLElement>(".q-sec").forEach((el) => {
    const d = el.getBoundingClientRect().top - want;
    if (d > -40 && d < 110 && Math.abs(d) < bd) { bd = Math.abs(d); best = el; }
  });
  if (best && bd > 6) sc.scrollBy({ top: (best as HTMLElement).getBoundingClientRect().top - want, behavior: "smooth" });
}
if (typeof window !== "undefined") {
  window.addEventListener("touchstart", () => { E.touching = true; }, { passive: true, capture: true });
  const end = () => { E.touching = false; };
  window.addEventListener("touchend", end, { passive: true, capture: true });
  window.addEventListener("touchcancel", end, { passive: true, capture: true });
  document.addEventListener("scroll", (e) => {
    const sc = e.target as HTMLElement;
    if (!sc || sc !== E.scroller) return;
    clearTimeout(E.settleT);
    E.settleT = setTimeout(() => settle(sc), 180);
  }, { passive: true, capture: true });
}

function chrome(sc: HTMLElement) {
  const st = sc.scrollTop;
  if (sc === E.lastSc && st === E.lastSt) return;
  E.lastSc = sc; E.lastSt = st;
  const pb = sc.querySelector(".q-pbar");
  if (pb) pb.classList.toggle("q-sc", st > 60);
  const nav = sc.querySelector<HTMLElement>(".q-nav");
  if (nav) nav.style.opacity = clamp((st - 230) / 40, 0, 1).toFixed(2);
  if (RM || st > 900) return;
  const art = sc.querySelector<HTMLElement>(".q-hero .q-art"), hc = sc.querySelector<HTMLElement>(".q-hero .q-hcopy");
  if (art) {
    art.style.transform = st > 0 ? `translate3d(0,${(st * 0.3).toFixed(1)}px,0) scale(${(1 + st / 2400).toFixed(4)})` : "";
    art.style.opacity = (1 - clamp(st / 420, 0, 1)).toFixed(3);
  }
  if (hc) {
    hc.style.transform = st > 0 ? `translate3d(0,${(st * 0.1).toFixed(1)}px,0)` : "";
    hc.style.opacity = (1 - clamp((st - 120) / 380, 0, 1)).toFixed(3);
  }
}

export function startEngine() {
  if (E.running) return;
  E.running = true;
  let last = performance.now(), n = 0;
  const loop = (now: number) => {
    if (!E.running) return;
    const dt = clamp((now - last) / 1000, 0, 1 / 30);
    last = now;
    stepSprings(dt);
    for (const g of E.guards) if (g.scrollLeft || g.scrollTop) { g.scrollLeft = 0; g.scrollTop = 0; }
    const sc = E.scroller;
    if (sc && sc.isConnected) {
      chrome(sc);
      if (++n % 30 === 0) rescan();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
export function stopEngine() { E.running = false; }
