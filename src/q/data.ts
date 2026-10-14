/* Data layer for the calm-luxe UI. Thin, cached wrappers over the existing VPS API.
   Every number shown in the UI comes from here; nothing is invented on the client. */
import { useEffect, useState } from "react";
import { quantsyncApi } from "../api/quantsyncApi";
import { num } from "./core";

const cache = new Map<string, { t: number; p: Promise<any>; v?: any }>();
const TTL = 5 * 60 * 1000;

export function cached<T>(key: string, fn: () => Promise<T>, ttl = TTL): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.p;
  const p = fn().then(
    (v) => { const e = cache.get(key); if (e) e.v = v; return v; },
    (e) => { cache.delete(key); throw e; }
  );
  cache.set(key, { t: Date.now(), p });
  return p;
}
export function peek<T>(key: string): T | undefined { return cache.get(key)?.v; }

async function getJson(path: string) {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const fb = await fetch("https://backing-lapping-denial.ngrok-free.dev" + path, {
      headers: { Accept: "application/json", "ngrok-skip-browser-warning": "true" }
    }).catch(() => null);
    if (fb && fb.ok) return fb.json();
    throw new Error(path + " → " + res.status);
  }
  return res.json();
}

export type Load<T> = { data: T | undefined; error: string | null; loading: boolean; reload: () => void };
export function useLoad<T>(key: string | null, fn: () => Promise<T>): Load<T> {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ data: T | undefined; error: string | null; loading: boolean }>(() => ({
    data: key ? peek<T>(key) : undefined, error: null, loading: !!key && peek<T>(key) === undefined,
  }));
  useEffect(() => {
    if (!key) return;
    let alive = true;
    const have = peek<T>(key);
    setState({ data: have, error: null, loading: have === undefined });
    cached(key, fn).then(
      (d) => alive && setState({ data: d, error: null, loading: false }),
      (e) => alive && setState({ data: undefined, error: String(e?.message || e), loading: false })
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  return { ...state, reload: () => { if (key) cache.delete(key); setTick((x) => x + 1); } };
}

/* ---------------- AI Calls (terminal engine) ---------------- */
export interface Call {
  id: string; sym: string; name: string; action: string; actionLabel: string; strategy: string;
  entry: number; stop: number; target: number; now: number; roiPct: number; days: number; entryDate: string;
  why: string; conviction: number; fib: [string, number][]; pivot: number; spark: number[]; raw: any;
}
export interface ClosedCall {
  id: string; sym: string; name: string; strategy: string; entry: number; exit: number; roiPct: number; isWin: boolean;
  reason: string; entryDate: string; exitDate: string; days: number; spark: number[]; why: string; raw: any;
}
export interface Terminal {
  active: Call[]; toBuy: Call[]; closed: ClosedCall[];
  stats: { winRate: number; avgPct: number; medianPct: number; closedN: number; profitFactor: number; stocks: number; avgWinPct: number; avgLossPct: number };
  updatedAt: string;
}
const reasonText = (r: string) => {
  const s = String(r || "").toUpperCase();
  if (s.includes("TARGET") || s === "T1" || s === "T2") return "Profit target hit";
  if (s.includes("TRAIL")) return "Exit moved up, closed in profit";
  if (s.includes("STOP") || s === "SL") return "Stop loss hit";
  if (s.includes("TIME")) return "Time limit reached";
  if (s.includes("DIST") || s.includes("GUARD")) return "Heavy selling, exited early";
  return s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Closed";
};
function toCall(a: any): Call {
  const fib = a.fibLevels ? Object.entries(a.fibLevels).map(([k, v]) => [k, num(v)] as [string, number]) : [];
  return {
    id: String(a.symbol || a.sym), sym: String(a.symbol || a.sym), name: a.name || a.symbol,
    action: String(a.action || "BUY_NOW").toUpperCase(), actionLabel: a.actionLabel || "Buy",
    strategy: a.strategyName || a.stage || "Breakout",
    entry: num(a.entryPrice ?? a.entry), stop: num(a.stopLoss ?? a.stop), target: num(a.targetPrice ?? a.target),
    now: num(a.livePrice ?? a.currentPrice ?? a.price ?? a.entryPrice), roiPct: num(a.currentROI ?? a.roiPct ?? a.chg ?? 0),
    days: num(a.holdingDays ?? a.days ?? 0), entryDate: a.entryDate || "", why: a.why || "",
    conviction: num(a.convictionScore ?? a.compositeScore ?? 0), fib, pivot: num(a.pivot),
    spark: (a.sparkline || a.miniChart?.sparkline || []).map(num).filter((x: number) => isFinite(x)), raw: a,
  };
}
function toClosed(c: any): ClosedCall {
  const roi = num(c.roiPct ?? c.pnlPct);
  return {
    id: String(c.tradeId || `${c.symbol || c.sym}_${c.entryDate || c.date}`), sym: c.symbol || c.sym, name: c.name || c.symbol,
    strategy: c.strategyName || "", entry: num(c.entryPrice ?? c.entry), exit: num(c.exitPrice ?? c.exit), roiPct: roi,
    isWin: c.isWin != null ? !!c.isWin : roi > 0, reason: reasonText(c.exitReason || c.reason),
    entryDate: c.entryDate || "", exitDate: c.exitDate || c.date || "", days: num(c.holdingDays ?? c.days ?? 0),
    spark: (c.sparkline || c.miniChart?.sparkline || []).map(num).filter((x: number) => isFinite(x)), why: c.why || "", raw: c,
  };
}
export function loadTerminal(): Promise<Terminal> {
  return cached("terminal", async () => {
    const d: any = await quantsyncApi.getTerminalData("v2");
    const active = (d.active || d.inTradeTrades || []).map(toCall);
    const toBuy = (d.toBuySignals || []).map(toCall).sort((a: Call, b: Call) => b.conviction - a.conviction);
    const closed: ClosedCall[] = (d.closedTrades || d.closed || []).map(toClosed).filter((c: ClosedCall) => isFinite(c.roiPct));
    closed.sort((a, b) => (b.exitDate || "").localeCompare(a.exitDate || ""));
    const rois = closed.map((c) => c.roiPct).sort((a, b) => a - b);
    const mean = rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : NaN;
    const med = rois.length ? rois[Math.floor(rois.length / 2)] : NaN;
    const wins = closed.filter((c) => c.isWin), losses = closed.filter((c) => !c.isWin);
    const avg = (l: ClosedCall[]) => (l.length ? l.reduce((a, c) => a + c.roiPct, 0) / l.length : NaN);
    const k = d.kpis || {};
    return {
      active, toBuy, closed, updatedAt: d.updatedAt || "",
      stats: {
        winRate: num(k.winRate ?? d.winRate ?? (closed.length ? (wins.length / closed.length) * 100 : NaN)),
        avgPct: mean, medianPct: med, closedN: closed.length, profitFactor: num(k.profitFactor ?? d.profitFactor),
        stocks: num(k.totalStocks), avgWinPct: avg(wins), avgLossPct: avg(losses),
      },
    };
  });
}
export const actionInfo = (a: string) => {
  const s = a.toUpperCase();
  if (s.includes("EXIT") || s.includes("SELL") || s.includes("BOOK")) return { k: "sell", t: "Sell now" };
  if (s.includes("HOLD") || s.includes("TRAIL")) return { k: "hold", t: "Hold" };
  if (s.includes("WAIT") || s.includes("WATCH")) return { k: "warn", t: "Watch" };
  return { k: "buy", t: "Buy" };
};

/* ---------------- Stock X-Ray (DNA report) ---------------- */
export const loadReport = (sym: string) => cached("dna:" + sym, () => getJson(`/api/dna/report/${encodeURIComponent(sym)}`), 15 * 60 * 1000);
export const searchStocks = (qq: string) =>
  cached("search:" + qq.toLowerCase(), () => quantsyncApi.searchSymbols(qq), 10 * 60 * 1000);
export const loadDiscovery = () => cached("discovery", () => getJson("/api/dna/discovery"), 30 * 60 * 1000);
export const loadQuote = (sym: string) => cached("quote:" + sym, () => getJson(`/api/stock/quote/${encodeURIComponent(sym)}`), 2 * 60 * 1000);
export const loadCandles = (sym: string, limit = 120) =>
  cached(`candles:${sym}:${limit}`, async () => {
    const d: any = await quantsyncApi.getChartData(sym, limit);
    return (d?.candles || []).map((c: any) => ({ t: c.time, o: num(c.open), h: num(c.high), l: num(c.low), c: num(c.close) })).filter((c: any) => isFinite(c.c));
  }, 10 * 60 * 1000);
export const loadNews = (sym: string) => cached("news:" + sym, () => quantsyncApi.getNews(6, sym), 15 * 60 * 1000);

export const scoreTone = (s: number) =>
  s >= 70 ? { k: "buy", t: "Strong", c: "var(--up)" } : s >= 45 ? { k: "warn", t: "Mixed", c: "var(--warn)" } : { k: "sell", t: "Weak", c: "var(--dn)" };

/* ---------------- Pattern Calls (Radar engine) ---------------- */
export type Stage = "Breakout" | "Near" | "Retest" | "Forming" | "Other";
export function stageOf(r: any, origin = ""): Stage {
  const st = String(r?.trade_call?.state || r?.trade_state || "").toUpperCase();
  if (st && st !== "NA") {
    if (st === "BREAKOUT" || st === "WEAK_BREAKOUT") return "Breakout";
    if (st === "NEAR" || st === "ATTEMPT") return "Near";
    if (st === "RETEST_HOLD" || st === "RETEST_WATCH") return "Retest";
    if (st === "BUILDING" || st === "FORMING") return "Forming";
    return "Other"; // running, extended, failed, stopped, target achieved
  }
  /* older rows without the trade engine verdict */
  const bs = String(r?.breakout_status || "").toUpperCase(), ps = String(r?.pattern_stage || "").toUpperCase(), ex = String(r?.execution_state || "").toUpperCase();
  if (bs === "TARGET_ACHIEVED" || ex.includes("TARGET")) return "Other";
  if (origin === "retest") return "Retest";
  if (origin === "near" || ex === "NEAR" || ps === "NEAR_BREAKOUT") return "Near";
  if (bs === "SUCCESS" || bs === "POST_BREAKOUT") {
    const g = num(r?.curr_price) / num(r?.breakout_level) - 1;
    return isFinite(g) && g >= -0.02 && g <= 0.06 ? "Breakout" : "Other";
  }
  if (ps === "FORMING" || bs === "PENDING") return "Forming";
  return "Other";
}
export interface PatternRow {
  sym: string; name: string; sector: string; tf: string; stage: Stage; action: string; grade: string;
  price: number; level: number; stop: number; target: number; pattern: string; notes: string[];
  conf: null | { label: string; text: string; win: number; hit: number; avgPct: number; n: number };
  xray: number; raw: any;
}
function toPattern(r: any, origin = ""): PatternRow {
  const tc = r.trade_call || {};
  const c = tc.confidence;
  return {
    sym: r.symbol, name: r.company_name || r.symbol, sector: r.sector || "", tf: String(r.timeframe || tc.tf || "DAILY").toUpperCase(),
    stage: stageOf(r, origin), action: String(tc.action || r.trade_action || "NONE").toUpperCase(), grade: tc.grade || "",
    price: num(r.curr_price ?? tc.price), level: num(tc.level ?? r.breakout_level), stop: num(r.stop_loss), target: num(r.target_1),
    pattern: String(r.pattern_type || "").split("·")[0].trim(), notes: Array.isArray(tc.notes) ? tc.notes : [],
    conf: c && c.n != null ? { label: c.label, text: c.text, win: num(c.win_rate) * 100, hit: num(c.p_target) * 100, avgPct: num(c.expectancy_pct), n: num(c.n) } : c ? { label: c.label, text: c.text, win: NaN, hit: NaN, avgPct: NaN, n: NaN } : null,
    xray: num(r.dna_score), raw: r,
  };
}
export function loadPatterns(): Promise<{ rows: PatternRow[]; counts: Record<Stage, number>; scanDate: string }> {
  return cached("patterns", async () => {
    const [br, rows] = await Promise.all([
      quantsyncApi.getScreenerBreakouts().catch(() => ({ success: [], near_breakout: [], failed: [], scan_date: "" } as any)),
      quantsyncApi.getScreenerRows({ limit: 200 }).catch(() => ({ rows: [], scan_date: "" } as any)),
    ]);
    const seen = new Map<string, PatternRow>();
    const add = (l: any[] | undefined, origin: string) => (l || []).forEach((r: any) => {
      const key = `${r?.symbol}|${r?.timeframe || ""}`;
      if (r?.symbol && !seen.has(key)) seen.set(key, toPattern(r, origin));
    });
    add(br.success, "success"); add(br.retest, "retest"); add(br.near_breakout, "near"); add(rows.rows, "");
    const list = Array.from(seen.values()).filter((p) => p.stage !== "Other" && isFinite(p.price) && p.level > 0);
    const order: Record<Stage, number> = { Breakout: 0, Retest: 1, Near: 2, Forming: 3, Other: 4 };
    list.sort((a, b) => order[a.stage] - order[b.stage] || (b.action === "BUY" ? 1 : 0) - (a.action === "BUY" ? 1 : 0) || Math.abs(a.price / a.level - 1) - Math.abs(b.price / b.level - 1));
    const counts = { Breakout: 0, Near: 0, Retest: 0, Forming: 0, Other: 0 } as Record<Stage, number>;
    list.forEach((p) => counts[p.stage]++);
    return { rows: list, counts, scanDate: br.scan_date || rows.scan_date || "" };
  });
}
export const searchPattern = (sym: string) =>
  cached("patsearch:" + sym, async () => {
    const d: any = await quantsyncApi.getScreenerRows({ search: sym, limit: 10 });
    return (d.rows || []).map((r: any) => toPattern(r)).filter((p: PatternRow) => p.sym === sym);
  });
export function loadEdge(): Promise<{ W?: any; D?: any }> {
  return cached("edge", async () => {
    const d: any = await getJson("/api/radar/edge").catch(() => ({}));
    const cells = d?.cells || {};
    const f = (k: string) => {
      const c = cells[k];
      return c ? { n: num(c.n), win: num(c.win_rate) * 100, hit: num(c.hit_target) * 100, avgPct: num(c.mean_R) * num(c.avg_risk_pct), verdict: c.verdict } : undefined;
    };
    return { W: f("W|BREAKOUT|A"), D: f("D|BREAKOUT|A") };
  }, 60 * 60 * 1000);
}

/* ---------------- Portfolio (stored on this device) ---------------- */
export interface Holding { sym: string; qty: number; avg: number }
const HK = "q-holdings";
export function getHoldings(): Holding[] {
  try { const v = JSON.parse(localStorage.getItem(HK) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
const hsubs = new Set<() => void>();
export const onHoldingsChange = (f: () => void) => { hsubs.add(f); };
export function setHoldings(h: Holding[], silent = false) { try { localStorage.setItem(HK, JSON.stringify(h)); } catch { /* storage blocked */ } if (!silent) hsubs.forEach((f) => f()); }

/* ---------------- market clock ---------------- */
export function marketStatus(): { open: boolean; text: string } {
  const now = new Date(), ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  const d = ist.getDay(), m = ist.getHours() * 60 + ist.getMinutes();
  const open = d >= 1 && d <= 5 && m >= 555 && m <= 930;
  const day = ist.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  return { open, text: (open ? "Market open · " : "Market closed · ") + day };
}
