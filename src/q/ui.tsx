import React, { useEffect, useRef } from "react";
import { q, RM, clamp, px, fmtv, num } from "./core";

/* ---------------- icons ---------------- */
const IC: Record<string, string> = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  xray: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h2.5l1.5-3 2 6 1.5-3H17"/>',
  ai: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  pat: '<path d="M3 18l4.5-4.5 3 2.5L15 10l2.5 2.5L21 8"/><path d="M3 6h18" stroke-dasharray="2.2 3"/>',
  pie: '<path d="M12 3v9h9"/><path d="M21 12A9 9 0 1 1 12 3"/>',
  chev: '<path d="M9 5l7 7-7 7"/>', back: '<path d="M15 5l-7 7 7 7"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.2"/>',
  share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>', play: '<path d="M8 5l11 7-11 7z"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>', bell: '<path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>', out: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
};
export function Icon({ n, s = 20, w = 2, c, className }: { n: string; s?: number; w?: number; c?: string; className?: string }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c || "currentColor"} strokeWidth={w}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: IC[n] || "" }} />
  );
}
export const Chev = () => <Icon n="chev" s={17} w={2.4} className="q-chev" />;

/* ---------------- small pieces ---------------- */
export function Ring({ score, size = 44, w = 4.5, color }: { score: number; size?: number; w?: number; color?: string }) {
  const r = (size - w) / 2, c = 2 * Math.PI * r, v = clamp(isFinite(score) ? score : 0, 0, 100);
  const col = color || (v >= 70 ? "var(--up)" : v >= 45 ? "var(--warn)" : "var(--dn)");
  return (
    <svg className="q-mini-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${Math.round(v)} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={w} />
      <circle className="q-rg" data-c={c} data-v={v} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={RM ? c * (1 - v / 100) : c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.9,.2,1)" }} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fill="var(--fg)" fontFamily="-apple-system,BlinkMacSystemFont,Inter,sans-serif" fontWeight={700} fontSize={Math.round(size * 0.33)}>
        {isFinite(score) ? Math.round(score) : "–"}
      </text>
    </svg>
  );
}
export function Rail({ lo, hi, mark, now, ll, rl, ml }: { lo: number; hi: number; mark?: number; now: number; ll: string; rl: string; ml?: string }) {
  if (!(hi > lo)) return null;
  const e = clamp((((mark ?? now) - lo) / (hi - lo)) * 100, 0, 100), n = clamp(((now - lo) / (hi - lo)) * 100, 0, 100);
  return (
    <div className={q("rail")} style={{ ["--e" as any]: e.toFixed(1) + "%" }}>
      <div className={q("tk")} />
      {ml && mark != null ? (<><i className={q("mk")} style={{ left: e.toFixed(1) + "%" }} /><span style={{ left: clamp(e, 16, 84).toFixed(1) + "%" }}>{ml}</span></>) : null}
      <i className={q("nw")} style={{ left: n.toFixed(1) + "%" }} />
      <span className={q("l")}>{ll}</span>
      <span className={q("r")}>{rl}</span>
    </div>
  );
}
export const Pill = ({ k = "", children, style }: { k?: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <span className={q("pill " + k)} style={style}>{children}</span>
);
export const Sh = ({ t, small, right }: { t: string; small?: string; right?: React.ReactNode }) => (
  <div className={q("sh")}><h2>{t}</h2>{small ? <small>{small}</small> : null}{right}</div>
);
export function Words({ text, hl = [] }: { text: string; hl?: string[] }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <React.Fragment key={i}>
          <span className={q("w" + (hl.includes(w.replace(/[.,?]/g, "")) ? " g" : ""))} style={{ ["--i" as any]: i }}>{w}</span>{" "}
        </React.Fragment>
      ))}
    </>
  );
}
export function Count({ v, fmt = "int", className }: { v: number; fmt?: string; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !isFinite(v)) return;
    if (RM) { el.textContent = fmtv(v, fmt); return; }
    let raf = 0, t0 = 0, started = false;
    const run = (t: number) => {
      if (!t0) t0 = t;
      const k = clamp((t - t0) / 1300, 0, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmtv(v * e, fmt);
      if (k < 1) raf = requestAnimationFrame(run);
    };
    const start = () => { if (!started) { started = true; raf = requestAnimationFrame(run); } };
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) { io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && (start(), io && io.disconnect()))); io.observe(el); } else start();
    return () => { cancelAnimationFrame(raf); io && io.disconnect(); };
  }, [v, fmt]);
  if (!isFinite(v)) return <b className={className}>—</b>;
  return <b ref={ref as any} className={(className || "") + " q-num"}>{RM ? fmtv(v, fmt) : fmtv(0, fmt)}</b>;
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      <div className={q("dhead")}><div className={q("sk")} style={{ height: 14, width: "38%" }} /><div className={q("sk")} style={{ height: 46, width: "66%", marginTop: 10 }} /></div>
      <div className={q("sk")} style={{ height: 280, borderRadius: 24 }} />
      <div className={q("g2")}>{Array.from({ length: rows - 1 }).map((_, i) => <div key={i} className={q("sk")} style={{ height: 180, borderRadius: 22 }} />)}</div>
    </>
  );
}
export function ListSkeleton({ n = 4 }: { n?: number }) {
  return <div className={q("sec")}>{Array.from({ length: n }).map((_, i) => <div key={i} className={q("sk")} style={{ height: 96, borderRadius: 22 }} />)}</div>;
}
export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className={q("card pad err")}>
      <h3>Could not load this right now</h3>
      <p className={q("mu")} style={{ margin: 0, fontSize: 14.5 }}>{text}</p>
      {onRetry ? <button className={q("btn sm soft")} onClick={onRetry}><Icon n="refresh" s={15} /> Try again</button> : null}
    </div>
  );
}

/* ---------------- hero (animated art + headline) ---------------- */
const F = '-apple-system,Inter,sans-serif';
function bl(a: string, b: string, c: string) {
  return `<div class="q-bl" style="--c1:${a}"></div><div class="q-bl" style="--c2:${b}"></div><div class="q-bl" style="--c3:${c}"></div><div class="q-dots"></div>`;
}
function miniRing(score: number) {
  const r = 14.25, c = 2 * Math.PI * r;
  return `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--track)" stroke-width="3.5"/><circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--up)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}" transform="rotate(-90 16 16)"/><text x="16" y="17" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="var(--fg)" font-family="${F}">${score}</text></svg>`;
}
export const ART: Record<string, (o?: any) => string> = {
  home: (o: any = {}) => {
    const pts: string[] = [];
    for (let x = 0; x <= 340; x += 10) { const y = 150 - x * 0.22 + Math.sin(x / 17) * 12 + (x > 230 ? -(x - 230) * 0.35 : 0); pts.push(x + "," + y.toFixed(1)); }
    return bl("var(--ax)", "var(--ai)", "var(--pt)") +
      `<svg class="q-bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><polyline class="q-drawloop" pathLength="1" points="${pts.join(" ")}" fill="none" stroke="var(--fg)" stroke-opacity=".35" stroke-width="2" stroke-linejoin="round"/></svg>` +
      `<div class="q-chipf" style="left:6%;top:12%;animation-delay:-1s">${miniRing(o.xs ?? 76)}<div>Stock X-Ray<small>${o.xt || "Health score in seconds"}</small></div></div>` +
      `<div class="q-chipf" style="right:5%;top:40%;animation-delay:-3s"><span class="q-dot" style="background:var(--up);width:9px;height:9px"></span><div>AI Call · Buy<small>${o.ai || "Today's top call"}</small></div></div>` +
      `<div class="q-chipf" style="left:12%;bottom:10%;animation-delay:-4.6s"><svg width="44" height="24" viewBox="0 0 44 24"><path d="M2 20L9 15 15 18 22 11 28 14 34 10 42 2" fill="none" stroke="var(--pt)" stroke-width="2" stroke-linecap="round"/><path d="M2 9H42" stroke="var(--pt)" stroke-dasharray="2 3"/></svg><div>Pattern Call<small>${o.pt || "Breakouts ranked by odds"}</small></div></div>`;
  },
  xray: () => {
    let o = "", at = 0, arcs = "";
    for (let i = 0; i < 60; i++) { const a = (i * 6 * Math.PI) / 180, l = i % 5 ? 3 : 6; o += `<line x1="${(100 + Math.cos(a) * (96 - l)).toFixed(1)}" y1="${(100 + Math.sin(a) * (96 - l)).toFixed(1)}" x2="${(100 + Math.cos(a) * 96).toFixed(1)}" y2="${(100 + Math.sin(a) * 96).toFixed(1)}" stroke="var(--fg)" stroke-opacity="${i % 5 ? 0.25 : 0.6}" stroke-width="1"/>`; }
    const W = [30, 25, 25, 20], v = [80, 72, 64, 85], C = ["var(--p1)", "var(--p2)", "var(--p5)", "var(--p3)"];
    W.forEach((w, i) => { const L = w - 2, f = (L * v[i]) / 100; arcs += `<circle cx="100" cy="100" r="78" pathLength="100" fill="none" stroke="var(--track)" stroke-width="9" stroke-dasharray="${L} ${100 - L}" stroke-dashoffset="${-at + 25}"/><circle class="q-arcin" style="--l:${f.toFixed(1)};--i:${i}" cx="100" cy="100" r="78" pathLength="100" fill="none" stroke="${C[i]}" stroke-width="9" stroke-linecap="round" stroke-dashoffset="${-at + 25}"/>`; at += w; });
    return bl("var(--ax)", "var(--p2)", "var(--p4)") + `<svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;height:88%;transform:translate(-50%,-50%)" aria-hidden="true"><g class="q-spin">${o}</g>${arcs}<text x="100" y="104" text-anchor="middle" font-family="${F}" font-size="38" font-weight="750" fill="var(--fg)">X-Ray</text><text x="100" y="126" text-anchor="middle" font-family="${F}" font-size="10.5" font-weight="600" fill="var(--dim)">HEALTH SCORE</text></svg><div class="q-scan"></div>`;
  },
  calls: () => {
    const pts: string[] = [];
    for (let x = 0; x <= 320; x += 8) { const y = x < 170 ? 118 + Math.sin(x / 11) * 9 + Math.cos(x / 5) * 3 : 118 - (x - 170) * 0.42 + Math.sin(x / 9) * 5; pts.push(x + "," + y.toFixed(1)); }
    const ex = 170, ey = 118;
    return bl("var(--ai)", "var(--p2)", "var(--ai)") + `<svg class="q-bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
      `<line x1="0" x2="340" y1="48" y2="48" stroke="var(--up)" stroke-dasharray="4 5" stroke-opacity=".8"/><text x="330" y="40" text-anchor="end" font-size="10" font-weight="600" fill="var(--up)" font-family="${F}">TAKE PROFIT</text>` +
      `<line x1="0" x2="340" y1="160" y2="160" stroke="var(--dn)" stroke-dasharray="4 5" stroke-opacity=".8"/><text x="330" y="176" text-anchor="end" font-size="10" font-weight="600" fill="var(--dn)" font-family="${F}">STOP LOSS</text>` +
      `<polyline class="q-drawloop" pathLength="1" points="${pts.join(" ")}" fill="none" stroke="var(--ai)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<g class="q-popin" style="transform-origin:${ex}px ${ey}px"><circle cx="${ex}" cy="${ey}" r="5" fill="var(--ai)"/><rect x="${ex - 24}" y="${ey - 34}" width="48" height="22" rx="11" fill="var(--ai)"/><text x="${ex}" y="${ey - 19}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--bg)" font-family="${F}">BUY</text></g>` +
      `<path class="q-twk" d="M60 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--ai)"/><path class="q-twk" style="animation-delay:-1.4s" d="M285 92l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--fg)" opacity=".7"/></svg>`;
  },
  patterns: () => {
    let b = "", x = 18;
    const tops = [136, 120, 128, 104, 96, 110, 92, 86, 100, 90, 84, 88, 82, 80, 58, 40];
    for (let i = 0; i < 16; i++) { const up = i >= 14; b += `<rect class="q-pbar2${up ? " q-glowb" : ""}" style="--i:${i}" x="${x}" y="${tops[i]}" width="12" height="${170 - tops[i]}" rx="3" fill="${up ? "var(--pt)" : "var(--fg)"}" fill-opacity="${up ? 1 : 0.22}"/>`; x += 19.5; }
    return bl("var(--pt)", "var(--p4)", "var(--pt)") + `<svg class="q-bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${b}<line class="q-dash" x1="0" x2="340" y1="78" y2="78" stroke="var(--pt)" stroke-width="2"/><text x="12" y="70" font-size="10.5" font-weight="700" fill="var(--pt)" font-family="${F}">CEILING</text></svg>`;
  },
  portfolio: (o: any = {}) => {
    const seg: [number, string][] = o.seg && o.seg.length ? o.seg : [[30, "var(--p1)"], [25, "var(--p2)"], [20, "var(--p5)"], [15, "var(--p3)"], [10, "var(--p4)"]];
    let at = 0, c = "";
    seg.forEach((s) => { c += `<circle cx="100" cy="100" r="62" pathLength="100" fill="none" stroke="${s[1]}" stroke-width="18" stroke-dasharray="${Math.max(0, s[0] - 1.5)} ${101.5 - s[0]}" stroke-dashoffset="${-at}"/>`; at += s[0]; });
    return bl("var(--pf)", "var(--p1)", "var(--p5)") + `<svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;height:86%;transform:translate(-50%,-50%)" aria-hidden="true"><g class="q-spin" style="animation-duration:60s">${c}</g><text x="100" y="98" text-anchor="middle" font-family="${F}" font-size="${o.value ? 22 : 15}" font-weight="750" fill="var(--fg)">${o.value || "Your stocks"}</text><text x="100" y="118" text-anchor="middle" font-family="${F}" font-size="10.5" font-weight="600" fill="var(--dim)">${o.sub || "CHECKED DAILY"}</text></svg>`;
  },
};
export function Hero({ art, artOpts, label, icon, ey, h, hl, lede, children }: {
  art: string; artOpts?: any; label: string; icon?: string; ey: React.ReactNode; h: string; hl: string[]; lede: string; children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || RM) return;
    el.classList.remove("q-play"); void el.offsetWidth; el.classList.add("q-play");
  }, []);
  const n = h.split(" ").length;
  return (
    <>
      <header className={q("nav")}>{icon ? <Icon n={icon} s={17} w={2.2} /> : null}{label}</header>
      <div className={q("hero")} ref={ref}>
        <div className={q("art")} dangerouslySetInnerHTML={{ __html: ART[art](artOpts) }} />
        <div className={q("hcopy")}>
          <p className={q("ey" + (icon ? "" : " n"))}>{icon ? <Icon n={icon} s={16} w={2.2} /> : null}{ey}</p>
          <h1 className={q("ht")}><Words text={h} hl={hl} /></h1>
          <p className={q("lede")} style={{ ["--i" as any]: n }}>{lede}</p>
          {children}
        </div>
      </div>
    </>
  );
}

/* ---------------- charts ---------------- */
export type Candle = { t: string; o: number; h: number; l: number; c: number };
export type Level = { y: number; label: string; color: string; dash?: number[] };
export function PriceChart({ candles, levels = [], markIndex, height = 240, accent = "--ai", closes }: {
  candles?: Candle[]; closes?: number[]; levels?: Level[]; markIndex?: number; height?: number; accent?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ser = closes && closes.length ? closes : (candles || []).map((c) => c.c);
    const dates = (candles || []).map((c) => c.t);
    if (ser.length < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3), FONT = "-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif";
    let ptr = -1, raf = 0, alive = true;
    const t0 = performance.now() + 150;
    const css = (n: string) => getComputedStyle(cv).getPropertyValue(n).trim();
    const draw = (now: number) => {
      if (!alive) return;
      const W = cv.clientWidth, H = cv.clientHeight;
      if (!W) { raf = requestAnimationFrame(draw); return; }
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const x = cv.getContext("2d")!;
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      const fg = css("--fg"), dim = css("--dim"), line = css("--line2"), ac = css(accent);
      const pr = RM ? 1 : clamp((now - t0) / 1200, 0, 1), ease = 1 - Math.pow(1 - pr, 3);
      const vals = ser.concat(levels.map((l) => l.y).filter((v) => isFinite(v)));
      const mn = Math.min(...vals) * 0.992, mx = Math.max(...vals) * 1.008, pad = { l: 6, r: 58, t: 14, b: 10 }, n = ser.length;
      const X = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r), Y = (v: number) => pad.t + (1 - (v - mn) / (mx - mn)) * (H - pad.t - pad.b);
      x.font = "500 11px " + FONT; x.textBaseline = "middle";
      for (let k = 0; k <= 4; k++) {
        const gv = mn + ((mx - mn) * k) / 4, gy = Y(gv);
        x.strokeStyle = line; x.lineWidth = 0.5; x.beginPath(); x.moveTo(pad.l, gy); x.lineTo(W - pad.r, gy); x.stroke();
        x.fillStyle = dim; x.textAlign = "left"; x.fillText(gv >= 1000 ? Math.round(gv).toLocaleString("en-IN") : gv.toFixed(1), W - pad.r + 8, gy);
      }
      levels.forEach((l) => {
        if (!isFinite(l.y)) return;
        const y = Y(l.y), col = l.color.startsWith("--") ? css(l.color) : l.color;
        x.strokeStyle = col; x.lineWidth = 1.2; x.setLineDash(l.dash || [3, 4]); x.beginPath(); x.moveTo(pad.l, y); x.lineTo(W - pad.r, y); x.stroke(); x.setLineDash([]);
        x.fillStyle = col; x.textAlign = "left"; x.font = "600 11px " + FONT; x.fillText(l.label, pad.l + 4, y - 8);
      });
      const upto = Math.max(1, Math.floor((n - 1) * ease));
      const gr = x.createLinearGradient(0, pad.t, 0, H); gr.addColorStop(0, ac); gr.addColorStop(1, "transparent");
      x.beginPath(); x.moveTo(X(0), H); for (let i = 0; i <= upto; i++) x.lineTo(X(i), Y(ser[i])); x.lineTo(X(upto), H); x.closePath();
      x.globalAlpha = 0.16; x.fillStyle = gr; x.fill(); x.globalAlpha = 1;
      x.beginPath(); for (let i = 0; i <= upto; i++) i ? x.lineTo(X(i), Y(ser[i])) : x.moveTo(X(i), Y(ser[i]));
      x.strokeStyle = fg; x.lineWidth = 1.8; x.lineJoin = "round"; x.stroke();
      if (pr >= 1) {
        if (markIndex != null && markIndex >= 0 && markIndex < n) { x.fillStyle = css("--up"); x.beginPath(); x.arc(X(markIndex), Y(ser[markIndex]), 4.5, 0, 7); x.fill(); }
        const lx = X(n - 1), ly = Y(ser[n - 1]), pulse = RM ? 0 : (now % 1800) / 1800;
        x.strokeStyle = ac; x.globalAlpha = 1 - pulse; x.lineWidth = 1.5; x.beginPath(); x.arc(lx, ly, 4 + pulse * 12, 0, 7); x.stroke(); x.globalAlpha = 1;
        x.fillStyle = ac; x.beginPath(); x.arc(lx, ly, 4.5, 0, 7); x.fill();
      }
      if (ptr >= 0) {
        const pi = clamp(Math.round(((ptr - pad.l) / (W - pad.l - pad.r)) * (n - 1)), 0, n - 1), pxx = X(pi), py = Y(ser[pi]);
        x.strokeStyle = dim; x.lineWidth = 1; x.beginPath(); x.moveTo(pxx, pad.t); x.lineTo(pxx, H - pad.b); x.stroke();
        x.fillStyle = fg; x.beginPath(); x.arc(pxx, py, 4, 0, 7); x.fill();
        const lab = (ser[pi] >= 1000 ? Math.round(ser[pi]).toLocaleString("en-IN") : ser[pi].toFixed(1)) + (dates[pi] ? "  " + String(dates[pi]).slice(0, 10) : "");
        x.font = "600 12px " + FONT;
        const bw = x.measureText(lab).width + 18, bx = clamp(pxx - bw / 2, pad.l, W - pad.r - bw);
        x.fillStyle = fg; x.beginPath(); (x as any).roundRect ? (x as any).roundRect(bx, 0, bw, 22, 11) : x.rect(bx, 0, bw, 22); x.fill();
        x.fillStyle = css("--bg"); x.textAlign = "left"; x.fillText(lab, bx + 9, 11);
      }
      raf = requestAnimationFrame(draw);
    };
    const mv = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); ptr = e.clientX - r.left; };
    const lv = () => (ptr = -1);
    cv.addEventListener("pointermove", mv); cv.addEventListener("pointerdown", mv); cv.addEventListener("pointerleave", lv);
    raf = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(raf); cv.removeEventListener("pointermove", mv); cv.removeEventListener("pointerdown", mv); cv.removeEventListener("pointerleave", lv); };
  }, [candles, closes, levels, markIndex, accent]);
  return <canvas ref={ref} className={q("chart")} style={{ height }} aria-label="Price chart. Drag across it to read prices." />;
}
/** Small line chart with a dashed ceiling. Draws itself when it scrolls into view. */
export function Spark({ values, level, height = 74, id, big }: { values: number[]; level?: number; height?: number; id: string; big?: boolean }) {
  const s = values.filter((v) => isFinite(v));
  if (s.length < 3) return <div className={q("sk")} style={{ height, borderRadius: 12, marginTop: 12 }} />;
  const W = 320, n = s.length, vals = isFinite(level as number) ? s.concat([level as number]) : s;
  const mn = Math.min(...vals) * 0.99, mx = Math.max(...vals) * 1.01, cw = W - (big ? 54 : 8);
  const X = (i: number) => ((i / (n - 1)) * cw).toFixed(1), Y = (v: number) => (6 + (1 - (v - mn) / (mx - mn)) * (height - 14)).toFixed(1);
  const d = s.map((v, i) => (i ? "L" : "M") + X(i) + "," + Y(v)).join("");
  const ly = isFinite(level as number) ? Y(level as number) : null, gid = "sg" + id.replace(/\W/g, "");
  return (
    <svg className={q("spark")} viewBox={`0 0 ${W} ${height}`} style={{ height }} preserveAspectRatio="none" role="img" aria-label="Price line with the ceiling">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--pt)" stopOpacity=".22" /><stop offset="1" stopColor="var(--pt)" stopOpacity="0" /></linearGradient></defs>
      <path className={q("ar")} d={`${d}L${X(n - 1)},${height}L0,${height}Z`} fill={`url(#${gid})`} />
      {ly ? <line className={q("dash")} x1="0" x2={cw} y1={ly} y2={ly} stroke="var(--pt)" strokeWidth="1.3" vectorEffect="non-scaling-stroke" /> : null}
      <path className={q("ln")} pathLength={1} d={d} fill="none" stroke="var(--fg)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={X(n - 1)} cy={Y(s[n - 1])} r="3.5" fill="var(--pt)" />
      {big && ly ? <text x={W - 48} y={+ly + 4} fontSize="11" fontWeight={600} fill="var(--pt)" fontFamily={F}>{px(level).replace("₹", "")}</text> : null}
    </svg>
  );
}

export const n0 = (v: any) => (isFinite(num(v)) ? Math.round(num(v)).toLocaleString("en-IN") : "—");
