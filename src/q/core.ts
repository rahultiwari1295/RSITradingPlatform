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
type Jl = { el: HTMLElement; x: number; v: number };
const E = {
  scroller: null as HTMLElement | null,
  en: [] as HTMLElement[],
  jl: [] as Jl[],
  t0: 0,
  lastSt: 0,
  vel: 0,
  lastSc: null as HTMLElement | null,
  frame: 0,
  running: false,
  guards: [] as HTMLElement[],
};

/** Point the engine at the scroller the user is looking at (a tab screen or the detail page). */
export function setScroller(el: HTMLElement | null, replay = true) {
  E.scroller = el;
  rescan(replay);
}
/** Re-read the animated blocks after content changes (data arrived, filter changed). */
export function rescan(replay = false) {
  const sc = E.scroller;
  if (!sc) { E.en = []; E.jl = []; return; }
  const prev = new Set(E.en);
  E.en = Array.from(sc.querySelectorAll<HTMLElement>(".q-en"));
  if (replay) { E.t0 = performance.now(); E.en.forEach((e) => ((e as any)._k = -1)); }
  else E.en.forEach((e) => { if (!prev.has(e)) (e as any)._k = -1; });
  const old = new Map(E.jl.map((j) => [j.el, j]));
  E.jl = Array.from(sc.querySelectorAll<HTMLElement>(".q-jl")).map((el) => old.get(el) || { el, x: 0, v: 0 });
}
export function guardScroll(...els: HTMLElement[]) { E.guards = els; }

function entrance(sc: HTMLElement, now: number) {
  const sr = sc.getBoundingClientRect(), vh = sr.height;
  let idx = 0;
  for (const el of E.en) {
    const r = el.getBoundingClientRect(), top = r.top - sr.top;
    const ps = clamp((vh - top) / (vh * 0.3), 0, 1);
    let pt = 1;
    if (top < vh) { pt = clamp((now - E.t0 - 220 - idx * 90) / 650, 0, 1); idx++; }
    const p = Math.min(ps, pt), e = 1 - Math.pow(1 - p, 3);
    const k = (el as any)._k;
    if (k != null && Math.abs(e - k) < 0.002) continue;
    (el as any)._k = e;
    if (e >= 0.999) { el.style.transform = ""; el.style.opacity = ""; }
    else { el.style.transform = `translate3d(0,${((1 - e) * 54).toFixed(1)}px,0) scale(${(0.93 + 0.07 * e).toFixed(4)})`; el.style.opacity = e.toFixed(3); }
  }
}
function jelly(sc: HTMLElement, dt: number) {
  if (sc !== E.lastSc) { E.lastSc = sc; E.lastSt = sc.scrollTop; }
  const st = sc.scrollTop, raw = st - E.lastSt;
  E.lastSt = st; E.vel = lerp(E.vel, raw, 0.5);
  const sr = sc.getBoundingClientRect(), vh = sr.height, mid = vh * 0.5;
  for (const j of E.jl) {
    const r = j.el.getBoundingClientRect(), c = r.top - sr.top + r.height / 2;
    if (c < -300 || c > vh + 300) { if (j.x) { j.x = 0; j.v = 0; j.el.style.translate = ""; } continue; }
    const f = 0.25 + Math.min(Math.abs(c - mid) / vh, 1) * 0.75, t = clamp(E.vel * f * 0.9, -22, 22);
    const a = -320 * (j.x - t) - 22 * j.v;
    j.v += a * dt; j.x += j.v * dt;
    const rx = Math.round(j.x);
    j.el.style.translate = rx ? `0 ${rx}px` : "";
  }
}
function revealScan(sc: HTMLElement) {
  const sr = sc.getBoundingClientRect();
  sc.querySelectorAll(".q-en:not(.q-vis),.q-card:not(.q-vis),.q-list:not(.q-vis),.q-hero:not(.q-vis),.q-spark:not(.q-vis),.q-reveal:not(.q-vis)").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < sr.bottom - sr.height * 0.1 && r.bottom > sr.top) reveal(el);
  });
}
function chrome(sc: HTMLElement) {
  const st = sc.scrollTop;
  const pb = sc.querySelector(".q-pbar");
  if (pb) pb.classList.toggle("q-sc", st > 60);
  const nav = sc.querySelector<HTMLElement>(".q-nav");
  if (nav) nav.style.opacity = clamp((st - 230) / 40, 0, 1).toFixed(2);
  if (RM || st > 900) return;
  const art = sc.querySelector<HTMLElement>(".q-hero .q-art"), hc = sc.querySelector<HTMLElement>(".q-hero .q-hcopy");
  if (art) {
    art.style.transform = st > 0 ? `translate3d(0,${(st * 0.42).toFixed(1)}px,0) scale(${(1 + st / 1600).toFixed(4)})` : st < 0 ? `scale(${(1 - st / 500).toFixed(4)})` : "";
    art.style.opacity = (1 - clamp(st / 380, 0, 1)).toFixed(3);
  }
  if (hc) {
    hc.style.transform = st > 0 ? `translate3d(0,${(st * 0.14).toFixed(1)}px,0)` : "";
    hc.style.opacity = (1 - clamp((st - 120) / 360, 0, 1)).toFixed(3);
  }
}

export function startEngine() {
  if (E.running) return;
  E.running = true;
  let last = performance.now();
  const loop = (now: number) => {
    if (!E.running) return;
    const dt = clamp((now - last) / 1000, 0, 1 / 30);
    last = now;
    stepSprings(dt);
    for (const g of E.guards) if (g.scrollLeft || g.scrollTop) { g.scrollLeft = 0; g.scrollTop = 0; }
    const sc = E.scroller;
    if (sc && sc.isConnected) {
      if (!RM) { jelly(sc, dt); entrance(sc, now); }
      chrome(sc);
      if (E.frame++ % 6 === 0) revealScan(sc);
      if (E.frame % 45 === 0) rescan(false);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
export function stopEngine() { E.running = false; }
