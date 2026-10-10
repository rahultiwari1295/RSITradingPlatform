import React, { useState, useEffect, useMemo } from "react";
import { quantsyncApi } from "../api/quantsyncApi";
import { liveMarketSocket } from "../services/liveMarketSocket";
import {
  PATTERN_OPTIONS,
  MCAP_OPTIONS,
  DEFAULT_FILTERS,
  mergeSetupPool,
  isActionableSetup,
  applyLivePrices,
  buildMlGatesMap,
  isLowEdge,
  classifySetups,
  applySetupFilters,
  sortSetups,
  entryPriceFor,
  rewardRisk,
  timeframeLabel,
  expectedMarketClose,
  sanitizeClosedRecords,
  closedTradeView,
  normalizePatternId,
  type SetupFilters,
  type TimeframeFilter,
} from "../lib/setupEngine";

/**
 * Radar — the single screen for actionable breakout setups.
 * Uses the same data pipeline as the Pattern screen (lib/setupEngine) so counts match exactly.
 */

interface RadarScreenProps {
  theme?: "dark" | "light";
  livePrices?: Record<string, { price: number; change_pct?: number }>;
  onSelectStock?: (symbol: string, fullData?: any) => void;
  onOpenAnalyst?: (stock: any) => void;
  onSwitchTab?: (tab: string) => void;
}

type Setup = Record<string, any>;

const TABS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "retest", label: "Retest" },
  { key: "near", label: "Near" },
  { key: "risk", label: "At risk" },
  { key: "closed", label: "Closed" },
];

const SORTS = [
  { key: "default", label: "Closest to trigger" },
  { key: "dna_score", label: "DNA score" },
  { key: "rsi", label: "RSI" },
  { key: "volume_ratio", label: "Volume surge" },
];

const TF_CHIPS: { id: TimeframeFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DAILY", label: "1D" },
  { id: "WEEKLY", label: "1W" },
  { id: "MONTHLY", label: "1M" },
];

const fmt = (n: any, d = 2) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const patLabel = (s: Setup) => String(s.pattern_type || "").split("·")[0].trim();

export default function RadarScreen({ theme = "dark", livePrices, onSelectStock, onOpenAnalyst, onSwitchTab }: RadarScreenProps) {
  const isLight = theme === "light";

  // ── UI state
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<SetupFilters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [sortKey, setSortKey] = useState("default");
  const [mlGateOn, setMlGateOn] = useState(true);
  const [closedFilter, setClosedFilter] = useState<"ALL" | "TARGET_HIT" | "STOP_HIT">("ALL");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Setup | null>(null);

  // ── data state
  const [breakouts, setBreakouts] = useState<{ success: Setup[]; near: Setup[]; failed: Setup[] }>({ success: [], near: [], failed: [] });
  const [rows, setRows] = useState<Setup[]>([]);
  const [failedRows, setFailedRows] = useState<Setup[]>([]);
  const [searchRows, setSearchRows] = useState<Setup[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [accuracy, setAccuracy] = useState<any>(null);
  const [patAcc, setPatAcc] = useState<any>(null);
  const [mlGates, setMlGates] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [closedRecords, setClosedRecords] = useState<Setup[]>([]);
  const [closedLoading, setClosedLoading] = useState(false);

  // ── detail sheet state
  const [riskCapital, setRiskCapital] = useState("10000");
  const [alertActive, setAlertActive] = useState(false);
  const [detailCandles, setDetailCandles] = useState<any[]>([]);
  const [chartState, setChartState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [hoveredCandle, setHoveredCandle] = useState<any | null>(null);

  const colors = useMemo(
    () =>
      isLight
        ? { bg: "#F2F2F7", card: "#FFFFFF", card2: "#E5E5EA", ink: "#000000", mu: "rgba(60,60,67,0.6)", dim: "rgba(60,60,67,0.3)", line: "rgba(60,60,67,0.18)", bl: "#007AFF", gn: "#248A3D", rd: "#D70015", or: "#C93400", track: "rgba(120,120,128,0.16)", sh: "rgba(20,30,70,0.12)", bar: "rgba(249,249,249,0.92)" }
        : { bg: "#0A0A0C", card: "#1C1C1E", card2: "#2C2C2E", ink: "#FFFFFF", mu: "rgba(235,235,245,0.6)", dim: "rgba(235,235,245,0.32)", line: "rgba(84,84,88,0.45)", bl: "#0A84FF", gn: "#30D158", rd: "#FF453A", or: "#FF9F0A", track: "rgba(120,120,128,0.24)", sh: "rgba(0,0,0,0.6)", bar: "rgba(28,28,30,0.85)" },
    [isLight]
  );

  // ── load once (same sources as the Pattern screen)
  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    setLoadError(false);
    Promise.all([
      quantsyncApi.getScreenerBreakouts(),
      quantsyncApi.getScreenerRows({ limit: 150 }),
      quantsyncApi.getScreenerRows({ breakout_status: "FAILED", limit: 60 }).catch(() => ({ rows: [] as Setup[] })),
    ])
      .then(([b, r, f]) => {
        if (!alive) return;
        setBreakouts({ success: b.success || [], near: b.near_breakout || [], failed: b.failed || [] });
        setRows(Array.isArray(r.rows) ? r.rows : []);
        setFailedRows(Array.isArray((f as any).rows) ? (f as any).rows : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.warn("Radar load error:", e);
        if (!alive) return;
        setLoadError(true);
        setIsLoading(false);
      });
    quantsyncApi.getScreenerSummary().then((d) => alive && setSummary(d)).catch(() => {});
    quantsyncApi.getScreenerAccuracy(90).then((d) => alive && setAccuracy(d)).catch(() => {});
    quantsyncApi.getPatternAccuracy().then((d) => alive && setPatAcc(d)).catch(() => {});
    quantsyncApi.getMlQualityGates().then((d) => alive && setMlGates(d)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // ── debounced server search so stocks outside the 150-row sample can still be found
  useEffect(() => {
    const q = searchInput.trim();
    const t = setTimeout(() => {
      setFilters((f) => (f.query === q ? f : { ...f, query: q }));
      if (q.length < 2) {
        setSearchRows([]);
        return;
      }
      quantsyncApi
        .getScreenerRows({ search: q, limit: 40 })
        .then((d) => setSearchRows(Array.isArray(d.rows) ? d.rows : []))
        .catch(() => setSearchRows([]));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── pipeline: merge → valid → live → ML gate → classify
  const gatesMap = useMemo(() => buildMlGatesMap(mlGates), [mlGates]);

  const validPool = useMemo(
    () => mergeSetupPool(breakouts.success, breakouts.near, rows, searchRows).filter(isActionableSetup),
    [breakouts, rows, searchRows]
  );

  useEffect(() => {
    const syms = validPool.map((s) => s.symbol).filter(Boolean);
    if (syms.length) liveMarketSocket.subscribe(syms);
  }, [validPool]);

  const livePool = useMemo(() => applyLivePrices(validPool, livePrices), [validPool, livePrices]);

  const { gated, hiddenByGate } = useMemo(() => {
    if (!mlGateOn || !mlGates) return { gated: livePool, hiddenByGate: 0 };
    const kept = livePool.filter((s) => !isLowEdge(s, gatesMap));
    return { gated: kept, hiddenByGate: livePool.length - kept.length };
  }, [livePool, gatesMap, mlGateOn, mlGates]);

  const groups = useMemo(() => classifySetups(gated), [gated]);

  const riskPool = useMemo(() => {
    const seen = new Set<string>();
    const out: Setup[] = [];
    const activeSyms = new Set(gated.map((s) => String(s.symbol).toUpperCase()));
    for (const s of mergeSetupPool(breakouts.failed, failedRows)) {
      const cmp = Number(s.curr_price || 0);
      const brk = Number(s.breakout_level || 0);
      const sym = String(s.symbol || "").toUpperCase();
      if (s.breakout_status !== "FAILED" || !(cmp > 0) || !(brk > 0) || seen.has(sym) || activeSyms.has(sym)) continue;
      seen.add(sym);
      out.push({ ...s, _tradeType: "FAILED" });
    }
    return applyLivePrices(out, livePrices);
  }, [breakouts.failed, failedRows, gated, livePrices]);

  // filters shared by every list (pattern chip excluded so chip counts stay meaningful)
  const filtersNoPattern = useMemo(() => ({ ...filters, pattern: "ALL" }), [filters]);

  const tabBase = useMemo(() => {
    const f = (l: Setup[]) => applySetupFilters(l, filtersNoPattern);
    return { buyZone: f(groups.buyZone), runners: f(groups.runners), retest: f(groups.retest), radar: f(groups.radar), risk: f(riskPool) };
  }, [groups, riskPool, filtersNoPattern]);

  const byPattern = (l: Setup[]) => (filters.pattern === "ALL" ? l : l.filter((s) => normalizePatternId(s.pattern_type) === filters.pattern));
  const view = useMemo(
    () => ({
      buyZone: sortSetups(byPattern(tabBase.buyZone), sortKey),
      runners: sortSetups(byPattern(tabBase.runners), sortKey),
      retest: sortSetups(byPattern(tabBase.retest), sortKey),
      radar: sortSetups(byPattern(tabBase.radar), sortKey),
      risk: sortSetups(byPattern(tabBase.risk), sortKey),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabBase, filters.pattern, sortKey]
  );

  const tabCounts = [view.buyZone.length + view.runners.length, view.retest.length, view.radar.length, view.risk.length, null as number | null];

  const activeList: Setup[] =
    activeTab === 0 ? [...view.buyZone, ...view.runners] : activeTab === 1 ? view.retest : activeTab === 2 ? view.radar : activeTab === 3 ? view.risk : [];

  // pattern chips with counts for the active tab (only patterns that exist)
  const patternChips = useMemo(() => {
    const base = activeTab === 0 ? [...tabBase.buyZone, ...tabBase.runners] : activeTab === 1 ? tabBase.retest : activeTab === 2 ? tabBase.radar : tabBase.risk;
    const counts: Record<string, number> = {};
    base.forEach((s) => {
      const id = normalizePatternId(s.pattern_type);
      counts[id] = (counts[id] || 0) + 1;
    });
    return PATTERN_OPTIONS.filter((p) => counts[p.id] > 0).map((p) => ({ ...p, count: counts[p.id] }));
  }, [tabBase, activeTab]);

  const sectorOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    gated.forEach((s) => s.sector && (counts[s.sector] = (counts[s.sector] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [gated]);

  // ── closed trades ledger
  useEffect(() => {
    if (activeTab !== 4) return;
    let alive = true;
    setClosedLoading(true);
    const params: any = { limit: 80 };
    if (filters.timeframe !== "ALL") params.timeframe = filters.timeframe;
    if (closedFilter !== "ALL") params.outcome = closedFilter;
    if (filters.pattern !== "ALL") params.pattern = filters.pattern;
    quantsyncApi
      .getHistoricalBreakoutRecords(params)
      .then((res) => alive && setClosedRecords(sanitizeClosedRecords(res.records || [])))
      .catch(() => alive && setClosedRecords([]))
      .finally(() => alive && setClosedLoading(false));
    return () => {
      alive = false;
    };
  }, [activeTab, filters.timeframe, filters.pattern, closedFilter]);

  // ── verdict (driven by the engine's classification, not by raw server flags)
  const getVerdict = (s: Setup) => {
    const bk = Number(s.breakout_level) || 0;
    const cmp = Number(s.curr_price) || 0;
    const sl = Number(s.stop_loss) || 0;
    const d = bk > 0 ? ((cmp - bk) / bk) * 100 : 0;
    const ad = Math.abs(d);
    switch (s._tradeType) {
      case "BUY_ZONE":
        return { color: colors.gn, t: "Buy zone", s: `${d >= 0 ? "+" : ""}${d.toFixed(1)}% from pivot ₹${bk.toFixed(1)}` };
      case "RETEST":
        return { color: colors.bl, t: "Retest zone", s: `Testing ₹${bk.toFixed(1)} as support` };
      case "RADAR":
        return { color: colors.bl, t: "Near breakout", s: `${ad.toFixed(1)}% below · trigger above ₹${bk.toFixed(1)}` };
      case "RUNNER":
        return { color: colors.or, t: "Running", s: `${d.toFixed(1)}% above pivot ₹${bk.toFixed(1)} · don't chase` };
      default:
        return { color: colors.rd, t: "At risk", s: `${ad.toFixed(1)}% ${d < 0 ? "below" : "from"} pivot${sl > 0 ? ` · stop ₹${sl.toFixed(1)}` : ""}` };
    }
  };

  // ── detail sheet: real chart only
  useEffect(() => {
    setHoveredCandle(null);
    setAlertActive(false);
    setDetailCandles([]);
    if (!selectedStock) {
      setChartState("idle");
      return;
    }
    let alive = true;
    setChartState("loading");
    quantsyncApi
      .getChartData(selectedStock.symbol, 60)
      .then((cd) => {
        if (!alive) return;
        const c = (cd && cd.candles) || [];
        if (c.length) {
          setDetailCandles(c.map((x: any) => ({ o: Number(x.open), h: Number(x.high), l: Number(x.low), c: Number(x.close), v: Number(x.volume || 0), time: x.time })));
          setChartState("ready");
        } else setChartState("error");
      })
      .catch(() => alive && setChartState("error"));
    return () => {
      alive = false;
    };
  }, [selectedStock?.symbol]);

  const sizing = useMemo(() => {
    if (!selectedStock) return { qty: 0, cap: 0, profit: 0, loss: 0, ent: 0, sl: 0, tg: 0 };
    const r = Math.max(0, Number(riskCapital.replace(/\D/g, "")) || 0);
    const sl = Number(selectedStock.stop_loss) || 0;
    const tg = Number(selectedStock.target_1) || 0;
    const ent = entryPriceFor(selectedStock);
    const riskPerShare = sl > 0 && ent > sl ? ent - sl : 0;
    const qty = riskPerShare > 0 ? Math.floor(r / riskPerShare) : 0;
    return { qty, cap: qty * ent, profit: qty * (tg > ent ? tg - ent : 0), loss: qty * riskPerShare, ent, sl, tg };
  }, [selectedStock, riskCapital]);

  const activeFilterCount =
    (filters.pattern !== "ALL" ? 1 : 0) + (filters.sector ? 1 : 0) + (filters.mcap !== "ALL" ? 1 : 0) + (filters.fnoOnly ? 1 : 0) + (filters.minScore > 0 ? 1 : 0) + (!mlGateOn ? 1 : 0);

  const setF = (patch: Partial<SetupFilters>) => setFilters((f) => ({ ...f, ...patch }));

  // freshness
  const scanDate: string = summary?.scan_date || "";
  const expected = expectedMarketClose();
  const isStale = !!scanDate && scanDate < expected;

  const winRate = Number(patAcc?.overall?.win_rate_pct ?? accuracy?.win_rate_pct ?? 0);

  // ── UI pieces
  const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        padding: "6px 12px",
        borderRadius: 99,
        border: `0.5px solid ${colors.line}`,
        background: on ? colors.bl : colors.card,
        color: on ? "#FFFFFF" : colors.ink,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );

  const renderRuler = (s: Setup) => {
    const sl = Number(s.stop_loss) || 0;
    const bk = Number(s.breakout_level) || 0;
    const tg = Number(s.target_1) || 0;
    const cmp = Number(s.curr_price) || 0;
    const pts = [sl, bk, tg, cmp].filter((v) => v > 0);
    if (pts.length < 2) return null;
    const lo = Math.min(...pts) * 0.985;
    const hi = Math.max(...pts) * 1.015;
    const pct = (v: number) => Math.max(3, Math.min(97, ((v - lo) / (hi - lo)) * 100));
    const mark = (v: number, color: string, label: string) =>
      v > 0 ? (
        <>
          <div style={{ position: "absolute", left: `${pct(v)}%`, top: 11, width: 2, height: 18, background: color, borderRadius: 1 }} />
          <div style={{ position: "absolute", left: `${pct(v)}%`, top: 30, transform: "translateX(-50%)", fontSize: 10, color: colors.mu, whiteSpace: "nowrap" }}>
            {label} {fmt0(v)}
          </div>
        </>
      ) : null;
    return (
      <div style={{ position: "relative", height: 42, margin: "6px 2px 2px" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 18, height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${colors.rd}, ${colors.track} 38%, ${colors.track} 62%, ${colors.gn})`, opacity: 0.6 }} />
        {mark(sl, colors.rd, "Stop")}
        {mark(bk, colors.bl, "Pivot")}
        {mark(tg, colors.gn, "Target")}
        <div style={{ position: "absolute", left: `${pct(cmp)}%`, top: 13, width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: "#FFFFFF", border: `3px solid ${colors.bl}`, boxShadow: "0 2px 6px rgba(0,0,0,0.4)", transition: "left 0.4s ease" }} />
      </div>
    );
  };

  const pill = (text: string, color?: string) => (
    <span style={{ padding: "2px 7px", borderRadius: 99, background: colors.track, color: color || colors.mu, fontSize: 10.5, fontWeight: 600 }}>{text}</span>
  );

  const renderCard = (s: Setup, idx: number, dim = false) => {
    const v = getVerdict(s);
    const hasScore = Number(s.dna_score) > 0;
    const score = Number(s.dna_score) || 0;
    const scoreBg = score >= 75 ? colors.gn : score >= 50 ? colors.or : colors.rd;
    const vol = Number(s.volume_ratio_20d) || 0;
    const rr = rewardRisk(s);
    const rsi = Number(s.rsi) || 0;
    return (
      <div
        key={`${s.symbol}-${idx}`}
        onClick={() => setSelectedStock(s)}
        style={{ position: "relative", background: colors.card, borderRadius: 20, padding: 16, marginBottom: 12, border: `1px solid ${colors.line}`, boxShadow: `0 6px 18px -6px ${colors.sh}`, cursor: "pointer", opacity: dim ? 0.8 : 1, touchAction: "manipulation" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink, letterSpacing: "0.02em" }}>{s.symbol}</div>
            <div style={{ fontSize: 12, color: colors.mu, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.company_name || s.symbol}
              {s.sector ? ` · ${s.sector}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink }}>₹{fmt(s.curr_price)}</div>
            {hasScore && (
              <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, background: scoreBg, color: "#FFFFFF", fontSize: 11, fontWeight: 700, marginTop: 3 }}>DNA {Math.round(score)}</div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 13, fontWeight: 600, flexWrap: "wrap" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.color, boxShadow: `0 0 6px ${v.color}` }} />
          <span style={{ color: v.color }}>{v.t}</span>
          <span style={{ color: colors.mu, fontWeight: 400, fontSize: 12 }}>{v.s}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {patLabel(s) && pill(patLabel(s))}
          {pill(timeframeLabel(s.timeframe))}
          {Number(s.is_fno) === 1 || s.is_fno === true ? pill("F&O") : null}
        </div>
        {renderRuler(s)}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 6, paddingTop: 10, borderTop: `0.5px solid ${colors.line}`, fontSize: 11, color: colors.mu }}>
          {[
            ["Reward/Risk", rr > 0 ? `${rr.toFixed(1)}×` : "—"],
            ["Volume surge", vol > 0 ? `${vol.toFixed(1)}×` : "—"],
            ["RSI (14)", rsi > 0 ? rsi.toFixed(0) : "—"],
          ].map(([k, val]) => (
            <div key={k}>
              <div>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, marginTop: 1 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderClosed = (c: Setup, idx: number) => {
    const v = closedTradeView(c);
    const color = v.isWin ? colors.gn : v.isLoss ? colors.rd : colors.mu;
    return (
      <div key={`${c.symbol}-${c.breakout_date}-${idx}`} style={{ background: colors.card, borderRadius: 18, padding: 14, marginBottom: 10, border: `1px solid ${colors.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{c.symbol}</div>
            <div style={{ fontSize: 11.5, color: colors.mu }}>
              {v.pattern} · {timeframeLabel(c.timeframe)} · {v.days} bar{v.days === 1 ? "" : "s"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color }}>
              {v.pnl >= 0 ? "+" : ""}
              {v.pnl.toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color, fontWeight: 600 }}>{v.isWin ? "Target hit" : v.isLoss ? "Stopped out" : String(c.outcome_status || "Closed")}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: colors.mu }}>
          <span>
            {c.breakout_date || "—"} → {c.exit_date || "—"}
          </span>
          <span>
            Pivot ₹{fmt(v.pivot)}
            {v.peakRun ? ` · peak +${v.peakRun.toFixed(1)}%` : ""}
          </span>
        </div>
      </div>
    );
  };

  const sectionHeader = (title: string, n: number, top = 14) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: `${top}px 4px 10px` }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 12, color: colors.mu }}>{n} setups</span>
    </div>
  );

  const sheetShell = (onClose: () => void, children: React.ReactNode, maxH = "88vh") => (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: colors.bg, borderRadius: "24px 24px 0 0", maxHeight: maxH, overflowY: "auto", padding: "16px 18px 36px", boxShadow: "0 -10px 40px rgba(0,0,0,0.4)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.dim, margin: "0 auto 14px" }} />
        {children}
      </div>
    </div>
  );

  const label = (t: string) => <div style={{ fontSize: 12, fontWeight: 700, color: colors.mu, textTransform: "uppercase", marginBottom: 8 }}>{t}</div>;
  const row = (k: string, val: React.ReactNode, last = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: last ? "none" : `0.5px solid ${colors.line}` }}>
      <span style={{ color: colors.mu }}>{k}</span>
      <span style={{ fontWeight: 700 }}>{val}</span>
    </div>
  );

  // ── chart
  const renderChart = (s: Setup) => {
    if (chartState === "loading" || chartState === "idle") return <div style={{ marginTop: 14, padding: "30px 0", textAlign: "center", fontSize: 12, color: colors.mu }}>Loading chart…</div>;
    if (chartState === "error" || !detailCandles.length) return <div style={{ marginTop: 14, padding: "30px 0", textAlign: "center", fontSize: 12, color: colors.mu }}>Chart data unavailable</div>;
    const N = detailCandles.length;
    const W = 340, H = 180, pt = 16, pb = 12, pl = 6, pr = 46;
    const ch = H - pt - pb;
    const cw = W - pl - pr;
    const lo = Math.min(...detailCandles.map((b) => b.l)) * 0.985;
    const hi = Math.max(...detailCandles.map((b) => b.h)) * 1.015;
    const rg = hi - lo || 1;
    const getY = (v: number) => pt + ch - ((Math.min(hi, Math.max(lo, v)) - lo) / rg) * ch;
    const getX = (i: number) => pl + (i / (N - 1 || 1)) * cw;
    const bw = Math.max(2, Math.min(6, (cw / N) * 0.65));
    const line = (v: number, color: string, dashed = true) =>
      v > 0 ? (
        <g>
          <line x1={pl} x2={W - pr} y1={getY(v)} y2={getY(v)} stroke={color} strokeWidth="1" strokeDasharray={dashed ? "3 3" : undefined} />
          <text x={W - 2} y={getY(v) + 3} textAnchor="end" fill={color} fontSize="9" fontWeight="700">₹{v.toFixed(0)}</text>
        </g>
      ) : null;
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ background: isLight ? "#F8F9FA" : "#141518", borderRadius: 12, padding: "8px 6px", overflow: "hidden" }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
              setHoveredCandle(detailCandles[Math.min(N - 1, Math.floor((x / rect.width) * N))]);
            }}
            onPointerLeave={() => setHoveredCandle(null)}
          >
            {line(Number(s.breakout_level) || 0, colors.bl)}
            {line(Number(s.stop_loss) || 0, colors.rd)}
            {line(Number(s.target_1) || 0, colors.gn)}
            {detailCandles.map((b, i) => {
              const x = getX(i);
              const c = b.c >= b.o ? colors.gn : colors.rd;
              const yTop = getY(Math.max(b.o, b.c));
              const yBot = getY(Math.min(b.o, b.c));
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={getY(b.h)} y2={getY(b.l)} stroke={c} strokeWidth="1" />
                  <rect x={x - bw / 2} y={yTop} width={bw} height={Math.max(1.5, yBot - yTop)} fill={c} rx="0.5" />
                </g>
              );
            })}
          </svg>
          <div style={{ fontSize: 11, color: colors.mu, marginTop: 4, minHeight: 18 }}>
            {hoveredCandle ? (
              <span>
                <b>{hoveredCandle.time}</b> · O {hoveredCandle.o.toFixed(1)} · H {hoveredCandle.h.toFixed(1)} · L {hoveredCandle.l.toFixed(1)} · C{" "}
                <span style={{ color: hoveredCandle.c >= hoveredCandle.o ? colors.gn : colors.rd, fontWeight: 700 }}>{hoveredCandle.c.toFixed(1)}</span>
              </span>
            ) : (
              "Touch or drag across the chart to inspect sessions"
            )}
          </div>
        </div>
      </div>
    );
  };

  const emptyState = (t: string, sub: string) => (
    <div style={{ textAlign: "center", padding: "40px 20px", color: colors.mu }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, margin: "8px 0" }}>{t}</div>
      <div>{sub}</div>
    </div>
  );

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
    setMlGateOn(true);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", background: colors.bg, color: colors.ink, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: colors.bar, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `0.5px solid ${colors.line}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Pattern Radar</h1>
          <div style={{ fontSize: 12, color: isStale ? colors.or : colors.mu, marginTop: 1 }}>
            {scanDate ? `Scan ${scanDate}${isStale ? ` · latest expected ${expected}` : ""}` : "Daily scan"}
          </div>
        </div>
        <button onClick={() => setIsFilterOpen(true)} style={{ padding: "7px 14px", borderRadius: 14, background: colors.track, border: "none", color: colors.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Filters
          {activeFilterCount > 0 && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 10, background: colors.bl, color: "#FFFFFF", fontSize: 10, fontWeight: 700 }}>{activeFilterCount}</span>}
        </button>
      </div>

      <div style={{ padding: "14px 16px 80px", maxWidth: 900, width: "100%", margin: "0 auto" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, borderRadius: 12, background: colors.track, padding: "0 12px", marginBottom: 12 }}>
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search symbol or company" style={{ flex: 1, background: "none", border: "none", outline: "none", color: colors.ink, fontSize: 14 }} />
          {searchInput && (
            <button onClick={() => setSearchInput("")} style={{ background: "none", border: "none", color: colors.mu, cursor: "pointer", fontSize: 14 }}>
              ✕
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", background: colors.track, borderRadius: 12, padding: 3, marginBottom: 12 }}>
          {TABS.map((t, idx) => {
            const sel = idx === activeTab;
            return (
              <button key={t.key} onClick={() => setActiveTab(idx)} style={{ padding: "7px 2px", borderRadius: 9, border: "none", background: sel ? colors.card : "transparent", color: sel ? colors.ink : colors.mu, boxShadow: sel ? "0 2px 6px rgba(0,0,0,0.18)" : "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", fontSize: 11.5, fontWeight: sel ? 700 : 500, transition: "all 0.2s ease" }}>
                <span>{t.label}</span>
                <span style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>{isLoading ? "…" : tabCounts[idx] ?? "—"}</span>
              </button>
            );
          })}
        </div>

        {/* Timeframe + pattern chips */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 4 }}>
          {TF_CHIPS.map((t) => (
            <Chip key={t.id} on={filters.timeframe === t.id} onClick={() => setF({ timeframe: t.id })}>
              {t.label}
            </Chip>
          ))}
        </div>
        {patternChips.length > 0 && activeTab !== 4 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
            <Chip on={filters.pattern === "ALL"} onClick={() => setF({ pattern: "ALL" })}>
              All patterns
            </Chip>
            {patternChips.map((p) => (
              <Chip key={p.id} on={filters.pattern === p.id} onClick={() => setF({ pattern: filters.pattern === p.id ? "ALL" : p.id })}>
                {p.label} {p.count}
              </Chip>
            ))}
          </div>
        )}

        {/* Win-rate strip (real numbers only) */}
        {winRate > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 14, background: colors.card, border: `1px solid ${colors.line}`, margin: "6px 0 12px", fontSize: 12, color: colors.mu }}>
            <span>
              Historical win rate <b style={{ color: colors.ink }}>{winRate.toFixed(1)}%</b>
              {patAcc?.overall?.resolved_trades ? ` · ${fmt0(patAcc.overall.resolved_trades)} trades` : ""}
            </span>
            {patAcc?.overall?.avg_pnl_pct !== undefined && (
              <span>
                Avg <b style={{ color: Number(patAcc.overall.avg_pnl_pct) >= 0 ? colors.gn : colors.rd }}>{Number(patAcc.overall.avg_pnl_pct) >= 0 ? "+" : ""}{Number(patAcc.overall.avg_pnl_pct).toFixed(1)}%</b>
              </span>
            )}
          </div>
        )}

        {/* Sort bar */}
        {activeTab !== 4 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
            <span style={{ fontSize: 13, color: colors.mu }}>
              {activeList.length} setups
              {mlGateOn && hiddenByGate > 0 ? ` · ${hiddenByGate} low-edge hidden` : ""}
            </span>
            <button onClick={() => setIsSortOpen(true)} style={{ background: "none", border: "none", color: colors.bl, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Sort: {SORTS.find((s) => s.key === sortKey)?.label} ⌄
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && [1, 2, 3].map((i) => <div key={i} style={{ height: 140, borderRadius: 20, marginBottom: 12, background: colors.card, opacity: 0.6 }} />)}

        {loadError && !isLoading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: colors.mu }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, margin: "8px 0" }}>Could not load scan setups</div>
            <button onClick={() => setReloadKey((k) => k + 1)} style={{ marginTop: 10, padding: "8px 20px", borderRadius: 12, background: colors.bl, color: "#FFFFFF", border: "none", fontWeight: 600, cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* Lists */}
        {!isLoading && !loadError && activeTab !== 4 && (
          <div>
            {activeList.length === 0 ? (
              <>
                {emptyState("No setups match", "Try clearing search or filters.")}
                {(activeFilterCount > 0 || searchInput) && (
                  <button onClick={clearAll} style={{ display: "block", margin: "0 auto", padding: "8px 18px", borderRadius: 12, background: colors.track, color: colors.bl, border: "none", fontWeight: 600, cursor: "pointer" }}>
                    Clear all
                  </button>
                )}
              </>
            ) : activeTab === 0 ? (
              <>
                {sectionHeader("Good to buy", view.buyZone.length)}
                {view.buyZone.length === 0 ? <div style={{ fontSize: 12, color: colors.mu, margin: "0 4px 8px" }}>Nothing in the buy zone right now.</div> : view.buyZone.map((s, i) => renderCard(s, i))}
                {view.runners.length > 0 && (
                  <>
                    {sectionHeader("Old trades · already running", view.runners.length, 20)}
                    {view.runners.map((s, i) => renderCard(s, view.buyZone.length + i, true))}
                  </>
                )}
              </>
            ) : (
              activeList.map((s, i) => renderCard(s, i))
            )}
          </div>
        )}

        {/* Closed ledger */}
        {activeTab === 4 && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([["ALL", "All"], ["TARGET_HIT", "Target hit"], ["STOP_HIT", "Stopped out"]] as const).map(([id, l]) => (
                <Chip key={id} on={closedFilter === id} onClick={() => setClosedFilter(id)}>
                  {l}
                </Chip>
              ))}
            </div>
            {closedLoading ? (
              <div style={{ textAlign: "center", padding: 30, color: colors.mu }}>Loading closed trades…</div>
            ) : closedRecords.length === 0 ? (
              emptyState("No closed trades", "Nothing matches these filters.")
            ) : (
              closedRecords.map(renderClosed)
            )}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selectedStock &&
        sheetShell(
          () => setSelectedStock(null),
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{selectedStock.symbol}</h3>
                <div style={{ fontSize: 13, color: colors.mu, marginTop: 2 }}>
                  {selectedStock.company_name || selectedStock.symbol}
                  {selectedStock.sector ? ` · ${selectedStock.sector}` : ""}
                  {Number(selectedStock.is_fno) === 1 || selectedStock.is_fno === true ? " · F&O" : ""}
                </div>
              </div>
              <button onClick={() => setSelectedStock(null)} style={{ background: colors.track, border: "none", borderRadius: 12, padding: "6px 12px", color: colors.bl, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Done
              </button>
            </div>

            <div style={{ background: colors.card, borderRadius: 18, padding: 16, marginBottom: 16, border: `1px solid ${colors.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: getVerdict(selectedStock).color }} />
                  <span style={{ fontWeight: 700, color: getVerdict(selectedStock).color, fontSize: 15 }}>{getVerdict(selectedStock).t}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>₹{fmt(selectedStock.curr_price)}</div>
              </div>
              <div style={{ fontSize: 12, color: colors.mu, marginTop: 4 }}>{getVerdict(selectedStock).s}</div>
              {renderChart(selectedStock)}
            </div>

            {label("Trade execution plan")}
            <div style={{ background: colors.card, borderRadius: 14, padding: "0 14px", marginBottom: 16 }}>
              {row(selectedStock._tradeType === "RADAR" ? "Entry (buy above)" : "Entry (market)", <span style={{ color: colors.bl }}>₹{sizing.ent ? sizing.ent.toFixed(1) : "—"}</span>)}
              {row("Stop loss", <span style={{ color: colors.rd }}>₹{sizing.sl ? sizing.sl.toFixed(1) : "—"}</span>)}
              {row("Target 1", <span style={{ color: colors.gn }}>₹{sizing.tg ? sizing.tg.toFixed(1) : "—"}</span>)}
              {row("Reward / risk", rewardRisk(selectedStock) > 0 ? `${rewardRisk(selectedStock).toFixed(1)}×` : "—", true)}
            </div>

            {label("Position sizing")}
            <div style={{ background: colors.card, borderRadius: 14, padding: "0 14px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${colors.line}` }}>
                <span style={{ color: colors.mu }}>Max risk capital</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span>₹</span>
                  <input type="text" inputMode="numeric" value={riskCapital} onChange={(e) => setRiskCapital(e.target.value.replace(/\D/g, ""))} style={{ width: 90, textAlign: "right", background: colors.track, border: "none", borderRadius: 8, padding: "6px 8px", color: colors.ink, fontWeight: 700, outline: "none" }} />
                </div>
              </div>
              {row("Quantity", `${sizing.qty.toLocaleString("en-IN")} shares`)}
              {row("Capital required", `₹${Math.round(sizing.cap).toLocaleString("en-IN")}`)}
              {row(
                "Target profit / stop loss",
                <span>
                  <b style={{ color: colors.gn }}>+₹{Math.round(sizing.profit).toLocaleString("en-IN")}</b> / <b style={{ color: colors.rd }}>−₹{Math.round(sizing.loss).toLocaleString("en-IN")}</b>
                </span>,
                true
              )}
            </div>

            {onOpenAnalyst && (
              <button
                onClick={() => {
                  const s = selectedStock;
                  setSelectedStock(null);
                  onOpenAnalyst(s);
                }}
                style={{ width: "100%", padding: 14, borderRadius: 14, background: colors.bl, color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 10 }}
              >
                Open analyst view
              </button>
            )}
            <button
              onClick={() => {
                const s = selectedStock;
                setSelectedStock(null);
                if (onSelectStock) onSelectStock(s.symbol, s);
                else if (onSwitchTab) onSwitchTab("dna");
              }}
              style={{ width: "100%", padding: 12, borderRadius: 14, background: onOpenAnalyst ? colors.track : colors.bl, color: onOpenAnalyst ? colors.bl : "#FFFFFF", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}
            >
              Open DNA report
            </button>
            <button onClick={() => setAlertActive(true)} style={{ width: "100%", padding: 12, borderRadius: 14, background: colors.track, color: alertActive ? colors.gn : colors.bl, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              {alertActive ? "✓ Price alert active" : `Alert me at ₹${Number(selectedStock.breakout_level || 0).toFixed(1)}`}
            </button>
          </>
        )}

      {/* Sort sheet */}
      {isSortOpen &&
        sheetShell(
          () => setIsSortOpen(false),
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Sort setups</h3>
            <div style={{ background: colors.card, borderRadius: 14, overflow: "hidden" }}>
              {SORTS.map((s) => (
                <div key={s.key} onClick={() => { setSortKey(s.key); setIsSortOpen(false); }} style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderBottom: `0.5px solid ${colors.line}`, cursor: "pointer" }}>
                  <span style={{ fontWeight: sortKey === s.key ? 700 : 500 }}>{s.label}</span>
                  {sortKey === s.key && <span style={{ color: colors.bl }}>✓</span>}
                </div>
              ))}
            </div>
          </>,
          "60vh"
        )}

      {/* Filter sheet */}
      {isFilterOpen &&
        sheetShell(
          () => setIsFilterOpen(false),
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Filter setups</h3>
              <button onClick={() => setIsFilterOpen(false)} style={{ background: "none", border: "none", color: colors.bl, fontWeight: 700, cursor: "pointer" }}>
                Done
              </button>
            </div>

            {label("Market cap")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {MCAP_OPTIONS.map((m) => (
                <Chip key={m.id} on={filters.mcap === m.id} onClick={() => setF({ mcap: m.id })}>
                  {m.label}
                </Chip>
              ))}
            </div>

            {sectorOptions.length > 0 && (
              <>
                {label("Sector")}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  <Chip on={!filters.sector} onClick={() => setF({ sector: "" })}>
                    Any
                  </Chip>
                  {sectorOptions.map(([name, n]) => (
                    <Chip key={name} on={filters.sector === name} onClick={() => setF({ sector: filters.sector === name ? "" : name })}>
                      {name} {n}
                    </Chip>
                  ))}
                </div>
              </>
            )}

            <div style={{ background: colors.card, borderRadius: 14, padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>F&amp;O stocks only</span>
              <input type="checkbox" checked={filters.fnoOnly} onChange={(e) => setF({ fnoOnly: e.target.checked })} style={{ width: 20, height: 20, accentColor: colors.bl }} />
            </div>

            <div style={{ background: colors.card, borderRadius: 14, padding: "12px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div>Hide low-edge patterns</div>
                  <div style={{ fontSize: 11, color: colors.mu, marginTop: 2 }}>ML quality gate · same as Pattern page</div>
                </div>
                <input type="checkbox" checked={mlGateOn} onChange={(e) => setMlGateOn(e.target.checked)} style={{ width: 20, height: 20, accentColor: colors.bl }} />
              </div>
            </div>

            <div style={{ background: colors.card, borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Minimum DNA score</span>
                <span style={{ fontWeight: 700, color: colors.bl }}>{filters.minScore}</span>
              </div>
              <input type="range" min="0" max="95" step="5" value={filters.minScore} onChange={(e) => setF({ minScore: Number(e.target.value) })} style={{ width: "100%", accentColor: colors.bl }} />
            </div>

            <button onClick={() => { clearAll(); setIsFilterOpen(false); }} style={{ width: "100%", padding: 12, borderRadius: 12, background: "none", border: "none", color: colors.rd, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Reset filters
            </button>
          </>,
          "80vh"
        )}
    </div>
  );
}
