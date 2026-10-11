/* Draws the pattern a stock is actually making: trend lines through real swing highs and lows,
   a neckline with its bottoms, or a flat box. Uses the scanner's own lines when the API sends them,
   otherwise fits them from the candles. */
export interface Bar { t?: any; h: number; l: number; c: number }
export type GLine = { a: [number, number]; b: [number, number]; k: "res" | "sup" | "neck" };
export interface Geo { lines: GLine[]; pts: { i: number; y: number }[]; kind: string }

const piv = (cs: Bar[], s: number, hi: boolean, k = 3) => {
  const out: { i: number; y: number }[] = [];
  for (let i = Math.max(s, k); i < cs.length - 2; i++) {
    const v = hi ? cs[i].h : cs[i].l;
    let ok = true;
    for (let j = Math.max(0, i - k); j <= Math.min(cs.length - 1, i + k); j++) { const w = hi ? cs[j].h : cs[j].l; if (hi ? w > v : w < v) { ok = false; break; } }
    if (ok) out.push({ i, y: v });
  }
  return out;
};
const fit = (p: { i: number; y: number }[]) => {
  if (p.length < 2) return null;
  const n = p.length, mx = p.reduce((a, q) => a + q.i, 0) / n, my = p.reduce((a, q) => a + q.y, 0) / n;
  let nu = 0, de = 0; for (const q of p) { nu += (q.i - mx) * (q.y - my); de += (q.i - mx) ** 2; }
  const m = de ? nu / de : 0; return { m, c: my - m * mx };
};
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

export function fitPattern(cs: Bar[], name: string, level: number): Geo | null {
  const n = cs.length; if (n < 20) return null;
  const nm = (name || "").toLowerCase(), s = Math.max(0, n - Math.min(n, 120)), last = n - 1;
  const H = piv(cs, s, true).slice(-4), L = piv(cs, s, false).slice(-4);
  const lines: GLine[] = [], pts: Geo["pts"] = [];
  const ray = (p: { i: number; y: number }[], k: GLine["k"]) => {
    const f = fit(p); if (!f) return false;
    const i0 = p[0].i, y0 = f.m * i0 + f.c, y1 = f.m * last + f.c;
    if (!(y1 > 0) || !(y0 > 0)) return false;
    lines.push({ a: [i0, y0], b: [last, y1], k }); return true;
  };
  const flat = (y: number, i0: number, k: GLine["k"]) => { if (y > 0) lines.push({ a: [i0, y], b: [last, y], k }); };
  const lowest = L.slice().sort((a, b) => a.y - b.y);
  if (/double|triple|inverse|head|shoulder|cup|handle|saucer|rounding|neck/.test(nm)) {
    const want = /triple|head|shoulder/.test(nm) ? 3 : 2;
    const b = lowest.slice(0, want).sort((x, y) => x.i - y.i);
    b.forEach((q) => pts.push(q));
    const i0 = b.length ? b[0].i : s;
    if (level > 0) flat(level, i0, "neck");
    return lines.length ? { lines, pts, kind: "neck" } : null;
  }
  if (/rectangle|range|box|base|consolidation|tight|darvas|flat|sideways/.test(nm)) {
    const hi = H.length ? med(H.map((q) => q.y)) : level, lo = L.length ? med(L.map((q) => q.y)) : 0, i0 = Math.min(H[0]?.i ?? s, L[0]?.i ?? s);
    flat(level > 0 ? level : hi, i0, "res"); if (lo > 0) flat(lo, i0, "sup");
    return lines.length ? { lines, pts, kind: "box" } : null;
  }
  if (/ascending/.test(nm) && /triangle/.test(nm)) {
    if (level > 0) flat(level, H[0]?.i ?? s, "res"); ray(L, "sup");
    return lines.length ? { lines, pts, kind: "tri" } : null;
  }
  if (/descending/.test(nm) && /triangle/.test(nm)) {
    ray(H, "res"); if (L.length) flat(med(L.map((q) => q.y)), L[0].i, "sup");
    return lines.length ? { lines, pts, kind: "tri" } : null;
  }
  const r = ray(H, "res"), u = ray(L, "sup");
  if (!r && level > 0) flat(level, H[0]?.i ?? s, "res");
  if (!u && lines.length < 2 && L.length) flat(med(L.map((q) => q.y)), L[0].i, "sup");
  return lines.length ? { lines, pts, kind: "rails" } : null;
}

/** Lines the scanner already measured (trendlines with dated end points), mapped onto these candles. */
export function geoFromLines(tls: any[], cs: Bar[]): Geo | null {
  if (!Array.isArray(tls) || !tls.length || !cs.length) return null;
  const at = (d: any) => { const k = String(d || "").slice(0, 10); let j = cs.findIndex((c) => String(c.t || "").slice(0, 10) >= k); return j < 0 ? cs.length - 1 : j; };
  const lines: GLine[] = [];
  for (const t of tls.slice(0, 4)) {
    const a = at(t?.p1?.date), pa = +t?.p1?.price, pb = +t?.p2?.price; let b = at(t?.p2?.date);
    if (!(pa > 0) || !(pb > 0)) continue;
    const ty = String(t.type || "").toLowerCase(), k: GLine["k"] = /support|floor|lower/.test(ty) ? "sup" : /neck/.test(ty) ? "neck" : "res";
    if (b === a) b = Math.min(cs.length - 1, a + 1);
    const m = (pb - pa) / (b - a), end = cs.length - 1;
    lines.push({ a: [a, pa], b: [end, k === "neck" ? pb : pa + m * (end - a)], k });
  }
  return lines.length ? { lines, pts: [], kind: "scanner" } : null;
}

export const GEO_COL: Record<GLine["k"], string> = { res: "--pt", sup: "--up", neck: "--pt" };
