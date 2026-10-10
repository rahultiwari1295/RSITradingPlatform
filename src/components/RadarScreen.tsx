import DataStatusBadge from "./DataStatusBadge";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { quantsyncApi } from "../api/quantsyncApi";
import RadarStockPage from "./RadarStockPage";
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
  patternCode,
  getBreakoutClassification,
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
  onSwitchTab?: (tab: string) => void;
  /** Tells the app header whether a stock page is open (to show its back arrow). */
  onStockOpenChange?: (symbol: string | null) => void;
  /** Increment to go back from the open stock page (header arrow). */
  backSignal?: number;
  /** Increment to return to the Radar home list (dock icon). */
  homeSignal?: number;
}

type Setup = Record<string, any>;

const STAGES = [
  { key: "ready", label: "Ready", text: "<b>Ready to buy.</b> Price just broke above its trigger and is still close to it, so the risk is small." },
  { key: "watch", label: "Watching", text: "<b>Almost there.</b> Price is just under its trigger. Wait for it to cross before buying." },
  { key: "retest", label: "Retest", text: "<b>Second chance.</b> Price broke out, came back to test the trigger and is holding. Often a safer entry." },
  { key: "moved", label: "Moved", text: "<b>Already moved.</b> Price ran well past its trigger. Buying now means chasing; most traders wait for a pullback." },
  { key: "risk", label: "At risk", text: "<b>Broke down.</b> These setups failed. They are here so you can avoid them or exit." },
  { key: "closed", label: "Closed", text: "<b>Track record.</b> Every finished trade, win or loss. This is what the win rate is built from." },
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

function RadarScreenInner({ theme = "dark", livePrices, onSelectStock, onSwitchTab, onStockOpenChange, backSignal = 0, homeSignal = 0 }: RadarScreenProps) {
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

  const colors = useMemo(
    () =>
      isLight
        ? { bg: "#FFFFFF", ink: "#0B0D14", mu: "rgba(20,24,40,0.62)", acc: "#4F5BE8", gn: "#0E9F6E", rd: "#E11D48", am: "#B45309" }
        : { bg: "#0C0E14", ink: "#F5F6F8", mu: "rgba(235,238,245,0.62)", acc: "#7C8CFF", gn: "#34D399", rd: "#FB7185", am: "#FBBF24" },
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

  // One verdict per stock: a chart breakout is only "Good to buy" if the deep research (DNA),
  // the pattern's real track record and the data-quality check all agree.
  const holdReason = (s: any): string | null => {
    if (s.data_quarantine) return s.data_note ? `${s.data_note}.` : "Price data is under review.";
    // Radar and DNA are separate: a chart setup judged by the trade rules is not second-guessed by DNA or the old pattern gate.
    if (s.trade_call) return null;
    const st = String(s.stance || "").toUpperCase();
    if (st && st !== "BULLISH" && st !== "ACCUMULATION") return "Deep research does not confirm the uptrend yet.";
    if (String(s.action || "").toUpperCase() === "NO_TRADE_WAIT") return "Deep research says wait for a cleaner setup.";
    const e = s.pattern_edge;
    if (e && !e.low_confidence && e.edge_pts != null && Number(e.edge_pts) < 0) return "This pattern has historically done worse than a random stock.";
    return null;
  };
  const groups = useMemo(() => {
    const g = classifySetups(gated);
    const hold = (l: Setup[]) => l.filter((x) => holdReason(x)).map((x) => ({ ...x, _tradeType: "RADAR", _hold: holdReason(x) } as Setup));
    const keep = (l: Setup[]) => l.filter((x) => !holdReason(x));
    return { ...g, buyZone: keep(g.buyZone), retest: keep(g.retest), radar: [...hold(g.buyZone), ...hold(g.retest), ...g.radar] };
  }, [gated]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const stageLists: Setup[][] = [view.buyZone, view.radar, view.retest, view.runners, view.risk, []];
  const stageCounts = stageLists.map((l) => l.length);
  const activeList: Setup[] = stageLists[activeTab] || [];

  // pattern chips with counts for the active tab (only patterns that exist)
  const patternChips = useMemo(() => {
    const base = [tabBase.buyZone, tabBase.radar, tabBase.retest, tabBase.runners, tabBase.risk, [] as Setup[]][activeTab];
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
    if (activeTab !== 5) return;
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

  const activeFilterCount =
    (filters.pattern !== "ALL" ? 1 : 0) + (filters.sector ? 1 : 0) + (filters.mcap !== "ALL" ? 1 : 0) + (filters.fnoOnly ? 1 : 0) + (filters.minScore > 0 ? 1 : 0) + (!mlGateOn ? 1 : 0);

  const setF = (patch: Partial<SetupFilters>) => setFilters((f) => ({ ...f, ...patch }));

  // freshness
  const scanDate: string = summary?.scan_date || "";
  const expected = expectedMarketClose();
  const isStale = !!scanDate && scanDate < expected;

  const winRate = Number(patAcc?.overall?.win_rate_pct ?? accuracy?.win_rate_pct ?? 0);

  // track record of a setup's pattern (real closed-trade stats), null when the sample is too small
  const patternStats = (s: Setup) => {
    const map: Record<string, any> = patAcc?.by_pattern || {};
    const code = patternCode(s);
    const label = patLabel(s).toUpperCase();
    const norm = (k: string) => k.toUpperCase().split("·")[0].trim().replace(/[\s\-&]+/g, "_");
    const key = Object.keys(map).find((k) => norm(k) === code || k.toUpperCase() === label);
    const st = key ? map[key] : null;
    return st && Number(st.resolved) >= 10 ? st : null;
  };
  const mlGateFor = (s: Setup) => {
    const code = patternCode(s);
    if (!code) return null;
    return (gatesMap as any)[code] || Object.values(gatesMap as any).find((g: any) => code.includes(g.pattern_type) || (g.pattern_type && g.pattern_type.includes(code))) || null;
  };


  // ── plain-language verdicts
  const verdictOf = (s: Setup) => {
    switch (s._tradeType) {
      case "BUY_ZONE":
      case "RETEST":
        return { w: "Good to buy", c: colors.gn };
      case "RADAR":
        return { w: "Wait", c: colors.acc };
      case "RUNNER":
        return { w: "Don't chase", c: colors.am };
      default:
        return { w: "At risk", c: colors.rd };
    }
  };
  const diffOf = (s: Setup) => {
    const bk = Number(s.breakout_level) || 0;
    const cmp = Number(s.curr_price) || 0;
    return bk > 0 ? ((cmp - bk) / bk) * 100 : 0;
  };
  const whyText = (s: Setup) => {
    const bk = Number(s.breakout_level) || 0;
    const sl = Number(s.stop_loss) || 0;
    const d = diffOf(s);
    const a = Math.abs(d).toFixed(1);
    const cmp = Number(s.curr_price) || 0;
    const stopPct = sl > 0 && cmp > sl ? ((cmp - sl) / cmp) * 100 : null;
    const stopTxt = stopPct == null ? "" : stopPct <= 6 ? ` Stop is ${stopPct.toFixed(1)}% away, so risk is small.` : ` Stop is ${stopPct.toFixed(1)}% away — size the position for that.`;
    if ((s as any)._hold) return `Chart says breakout, but: ${(s as any)._hold}`;
    const tc = (s as any).trade_call;
    if (tc && tc.state && tc.state !== "NA") {
      const p = tc.plan;
      const note = Array.isArray(tc.notes) && tc.notes.length ? tc.notes[0] : "";
      if (tc.action === "BUY" && p) {
        return `${tc.state === "RETEST_HOLD" ? "Held the retest of" : "Closed decisively above"} ₹${fmt(bk, 1)} (grade ${tc.grade}). Buy next open ≈ ₹${fmt(p.entry_ref, 1)}, stop ₹${fmt(p.stop, 1)} (−${p.risk_pct}%), target ₹${fmt(p.target, 1)}. Risking 1% of capital means a ${p.size_pct_for_1pct_risk}% position.`;
      }
      if (tc.state === "NEAR" || tc.state === "ATTEMPT") return `${a}% under its ₹${fmt(bk, 1)} level. ${tc.state === "ATTEMPT" ? "It tried and closed below. " : ""}Needs a decisive close above it (about ${tc.atr ? "₹" + fmt(bk + 0.8 * tc.atr, 1) : "0.8 ATR over"}).`;
      if (note) return `${note}.`.replace("..", ".");
    }
    switch (s._tradeType) {
      case "BUY_ZONE":
        return `Broke above ₹${fmt(bk, 1)} and is only ${a}% past it.${stopTxt}`;
      case "RETEST":
        return `Back testing ₹${fmt(bk, 1)} after the breakout, and holding.`;
      case "RADAR":
        return `${a}% under its ₹${fmt(bk, 1)} trigger. Wait for a close above it.`;
      case "RUNNER":
        return `${d.toFixed(1)}% above its trigger already. Wait for a dip to ₹${fmt(bk, 1)}.`;
      default:
        return `${a}% ${d < 0 ? "below" : "from"} its ₹${fmt(bk, 1)} trigger${sl > 0 ? `. Exit level ₹${fmt(sl, 1)}` : ""}.`;
    }
  };

  // ── hero count-up
  const readyCount = view.buyZone.length + view.retest.length;
  const [shownReady, setShownReady] = useState(0);
  useEffect(() => {
    if (isLoading) return;
    let raf = 0;
    const from = 0;
    const t0 = performance.now();
    const step = (n: number) => {
      const k = Math.min(1, (n - t0) / 900);
      setShownReady(Math.round(from + (readyCount - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [readyCount, isLoading]);

  // ── top picks: best reward for the risk, weighted by the pattern's real win rate
  const topPicks = useMemo(() => {
    const score = (s: Setup) => {
      const conf = (s as any).trade_call?.confidence;
      if (conf && conf.expectancy_pct != null) return Number(conf.expectancy_pct); // measured average result per trade
      const st = patternStats(s);
      const win = st ? Number(st.win_rate_pct) : 50;
      return rewardRisk(s) * win;
    };
    return [...view.buyZone, ...view.retest]
      .filter((s) => rewardRisk(s) > 0)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, patAcc]);

  // ── scroll-driven depth (no pointer/hover movement)
  const rootRef = useRef<HTMLDivElement>(null);
  const picksRef = useRef<HTMLDivElement>(null);
  const reduceMotion = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const runFx = () => {
    try {
      runFxUnsafe();
    } catch (e) {
      console.warn("Radar fx skipped", e);
    }
  };
  const runFxUnsafe = () => {
    const sc = rootRef.current;
    if (!sc || reduceMotion) return;
    // while pinch-zoomed (or on a page-zoomed desktop) the 3D effects are switched off: it keeps zooming smooth and light on memory
    const vv = window.visualViewport;
    const zoomed = !!vv && Math.abs(vv.scale - 1) > 0.02;
    sc.parentElement?.classList.toggle("zoomed", zoomed);
    if (zoomed) return;
    const y = sc.scrollTop;
    const h = sc.clientHeight || 1;
    const pr = sc.getBoundingClientRect();
    const aura = sc.querySelector<HTMLElement>(".rdr-aura");
    if (aura) aura.style.setProperty("--py", `${-y * 0.3}px`);
    const hero = sc.querySelector<HTMLElement>(".rdr-hero");
    if (hero) {
      const k = Math.min(1, y / 360);
      hero.style.setProperty("--hs", (1 - k * 0.1).toFixed(3));
      hero.style.setProperty("--hy", `${(y * 0.35).toFixed(1)}px`);
      hero.style.setProperty("--ho", (1 - k * 0.9).toFixed(3));
    }
    sc.querySelectorAll<HTMLElement>(".rdr-sec").forEach((e) => {
      const r = e.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (pr.bottom - r.top) / (h * 0.35)));
      e.style.setProperty("--ro", t.toFixed(3));
      e.style.setProperty("--ry2", `${((1 - t) * 24).toFixed(1)}px`);
    });
    sc.querySelectorAll<HTMLElement>(".rdr-card").forEach((el) => {
      // layout-based position (ignores the card's own transform, so no feedback jitter); short phone screens keep several cards visible
      let top = 0;
      for (let n: HTMLElement | null = el; n && n !== sc; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
      const mid = top + el.offsetHeight / 2 - y;
      const c = mid / h;
      // rises + tilts back as it enters from the bottom, settles into focus mid-screen, then recedes gently as it leaves the top
      // (tilt is always "away" from the viewer and recede only shrinks toward the bottom edge, so cards can never overlap)
      let e = Math.min(1, Math.max(0, (c - 0.7) / 0.3));
      e = e * e * (3 - 2 * e);
      const lv = Math.min(1, Math.max(0, (0.24 - c) / 0.3));
      const f = 1 - Math.min(1, Math.abs(c - 0.42) / 0.55);
      el.style.setProperty("--rx", `${(e * 15).toFixed(2)}deg`);
      el.style.setProperty("--s", ((0.965 + 0.035 * f) * (1 - e * 0.06) * (1 - lv * 0.07)).toFixed(3));
      el.style.setProperty("--ty", `${(e * 34).toFixed(1)}px`);
      el.style.setProperty("--o", Math.max(0.45, 1 - e * 0.5 - lv * 0.3).toFixed(3));
      el.style.setProperty("--sx", `${((c - 0.5) * 160 - 10).toFixed(0)}%`);
    });
    runPicksFx();
  };
  const runPicksFx = () => {
    const box = picksRef.current;
    if (!box || reduceMotion) return;
    const br = box.getBoundingClientRect();
    const mid = br.left + br.width / 2;
    box.querySelectorAll<HTMLElement>(".rdr-pick").forEach((p) => {
      const r = p.getBoundingClientRect();
      const off = (r.left + r.width / 2 - mid) / br.width;
      const d = Math.min(1, Math.abs(off));
      p.style.setProperty("--s", (1 - d * 0.1).toFixed(3));
      p.style.setProperty("--o", (1 - d * 0.45).toFixed(3));
      p.style.setProperty("--ry", `${(-off * 38).toFixed(1)}deg`);
      p.style.setProperty("--sx", `${(off * 120 - 10).toFixed(0)}%`);
    });
  };
  useEffect(() => {
    const sc = rootRef.current;
    if (!sc) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(runFx);
    };
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    window.visualViewport?.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      sc.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      window.visualViewport?.removeEventListener("resize", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(runFx);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeList.length, isLoading, closedRecords.length, topPicks.length]);

  // ── tooltips + first-visit tour + track-record sheet
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [trustOpen, setTrustOpen] = useState(false);
  const TOUR = [
    ["Welcome to Radar", "We scan every NSE stock each day and show only the few worth your attention, with plain reasons."],
    ["Follow the journey", "Stocks move through Watching → Ready → Retest → Moved. Tap a stage to see what to do at that point."],
    ["Read the bar", "The dot is today's price. The red side is where you exit if you're wrong, the green side is where you aim. Tap any card for the full plan."],
  ];
  const [tourStep, setTourStep] = useState<number | null>(() => {
    try {
      return localStorage.getItem("radar_tour_v1") ? null : 0;
    } catch (_) {
      return 0;
    }
  });
  const endTour = () => {
    setTourStep(null);
    try {
      localStorage.setItem("radar_tour_v1", "1");
    } catch (_) {}
  };
  const GLOSS: Record<string, string> = {
    strength: "A 0-100 score for how clean and well-supported the pattern is. Higher is better.",
    rr: "For every ₹1 you risk, how many ₹ you could make if the target is reached.",
    trigger: "The price a stock needs to cross to confirm the pattern. Buying above it is the signal.",
  };
  const Tip = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <span
      className="rdr-tip"
      onClick={(e) => {
        e.stopPropagation();
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTip({ text: GLOSS[k], x: Math.max(12, Math.min(window.innerWidth - 252, r.left)), y: r.top });
      }}
    >
      {children}
    </span>
  );

  // ── pieces
  const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button className={`rdr-chip${on ? " on" : ""}`} onClick={onClick}>
      {children}
    </button>
  );

  const renderRuler = (s: Setup) => {
    const sl = Number(s.stop_loss) || 0;
    const bk = Number(s.breakout_level) || 0;
    const tg = Number(s.target_1) || 0;
    const cmp = Number(s.curr_price) || 0;
    const pts = [sl, bk, tg, cmp].filter((v) => v > 0);
    if (pts.length < 2 || !(bk > 0)) return null;
    const lo = Math.min(...pts) * 0.99;
    const hi = Math.max(...pts) * 1.01;
    const P = (v: number) => Math.max(3, Math.min(97, ((v - lo) / (hi - lo)) * 100));
    // nudge labels apart so they never overlap
    const marks = [
      sl > 0 ? { v: sl, t: `Stop ${fmt0(sl)}` } : null,
      { v: bk, t: `Trigger ${fmt0(bk)}` },
      tg > 0 ? { v: tg, t: `Target ${fmt0(tg)}` } : null,
    ].filter(Boolean) as { v: number; t: string }[];
    let last = -100;
    const placed = marks.map((m) => {
      let x = P(m.v);
      if (x - last < 22) x = last + 22;
      last = x;
      return { ...m, x: Math.min(92, x) };
    });
    return (
      <div className="rdr-ruler">
        <div className="rdr-rt">
          {sl > 0 && <i style={{ left: `${P(sl)}%`, width: `${P(bk) - P(sl)}%`, background: "rgba(251,113,133,.45)" }} />}
          {tg > 0 && <i style={{ left: `${P(bk)}%`, width: `${P(tg) - P(bk)}%`, background: "rgba(52,211,153,.45)" }} />}
        </div>
        <div className="rdr-rd" style={{ left: `${P(cmp)}%` }} />
        {placed.map((m) => (
          <div key={m.t} className="rdr-rl" style={{ left: `${m.x}%` }}>
            {m.t}
          </div>
        ))}
      </div>
    );
  };

  const renderCard = (s: Setup, idx: number) => {
    const v = verdictOf(s);
    const d = diffOf(s);
    const st = patternStats(s);
    return (
      <div key={`${s.symbol}-${idx}`} className="rdr-card" style={{ ["--vc" as any]: v.c }} onClick={() => openStock(s)}>
        <div className="rdr-shine" />
        <div className="rdr-row">
          <div style={{ minWidth: 0 }}>
            <div className="rdr-cs">{s.symbol}</div>
            <div className="rdr-cc">{s.company_name || s.symbol}</div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <div className="rdr-cp rdr-num">₹{fmt(s.curr_price)}</div>
            <div className="rdr-cd rdr-num" style={{ color: d >= 0 ? colors.gn : colors.rd }}>
              {d >= 0 ? "+" : ""}
              {d.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="rdr-vline">
          <span className="rdr-vtag" style={{ color: v.c, background: `${v.c}24` }}>
            {v.w}
          </span>
          <span className="rdr-vtxt">{whyText(s)}</span>
        </div>
        {renderRuler(s)}
        {(s as any).trade_call?.confidence ? (
          <div className="rdr-foot rdr-num" title={(s as any).trade_call.confidence.text}>
            <b style={{ color: (s as any).trade_call.confidence.label === "Validated edge" ? colors.gn : colors.am }}>{(s as any).trade_call.confidence.label}</b>
            {(s as any).trade_call.confidence.n != null &&
              ` · ${Math.round(100 * (s as any).trade_call.confidence.win_rate)}% won, ${Math.round(100 * (s as any).trade_call.confidence.p_target)}% hit +2R (${Number((s as any).trade_call.confidence.n).toLocaleString()} similar)`}
            {(s as any).trade_call.resolution?.conflict ? ` · ⚠ ${(s as any).trade_call.resolution.conflict}` : ""}
          </div>
        ) : (
          st && (
            <div className="rdr-foot rdr-num">
              {Number(st.win_rate_pct).toFixed(0)}% of {st.resolved} similar setups won
            </div>
          )
        )}
        {dnaPill(s)}
      </div>
    );
  };

  // Company-health gauge. Informational only: it never changes the trade call (Radar is price-driven).
  const dnaPill = (s: Setup) => {
    const raw = (s as any).dna_score;
    const score = raw === undefined || raw === null || raw === "" ? null : Number(raw);
    const [label, c] =
      score === null || Number.isNaN(score) ? ["Fundamentals: no data", colors.mu] : score >= 75 ? ["Fundamentals: strong", colors.gn] : score >= 50 ? ["Fundamentals: mixed", colors.am] : ["Fundamentals: weak", colors.rd];
    return (
      <div className="rdr-foot rdr-num" title="Company health from the DNA score. Shown as a safety check; it does not change the trade call.">
        <b style={{ color: c }}>{label}</b>
        {score !== null && !Number.isNaN(score) && ` · DNA ${Math.round(score)}`}
      </div>
    );
  };

  const renderClosed = (c: Setup, idx: number) => {
    const v = closedTradeView(c);
    const color = v.isWin ? colors.gn : v.isLoss ? colors.rd : colors.mu;
    return (
      <div key={`${c.symbol}-${c.breakout_date}-${idx}`} className="rdr-card" style={{ ["--vc" as any]: color }}>
        <div className="rdr-shine" />
        <div className="rdr-row">
          <div>
            <div className="rdr-cs">{c.symbol}</div>
            <div className="rdr-cc">
              {v.pattern} · {timeframeLabel(c.timeframe)} · {v.days} bar{v.days === 1 ? "" : "s"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="rdr-cp rdr-num" style={{ color }}>
              {v.pnl >= 0 ? "+" : ""}
              {v.pnl.toFixed(1)}%
            </div>
            <div className="rdr-cd" style={{ color }}>
              {v.isWin ? "Target hit" : v.isLoss ? "Stopped out" : String(c.outcome_status || "Closed")}
            </div>
          </div>
        </div>
        <div className="rdr-foot rdr-num" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            {c.breakout_date || "—"} → {c.exit_date || "—"}
          </span>
          <span>
            Trigger ₹{fmt(v.pivot)}
            {v.peakRun ? ` · peak +${v.peakRun.toFixed(1)}%` : ""}
          </span>
        </div>
      </div>
    );
  };

  const sectionHeader = (title: string, right: React.ReactNode) => (
    <div className="rdr-sec">
      <h2>{title}</h2>
      <span>{right}</span>
    </div>
  );

  const label = (t: string) => <div className="rdr-lab rdr-st">{t}</div>;
  const row = (k: React.ReactNode, val: React.ReactNode, last = false) => (
    <div className="rdr-kv" style={last ? { borderBottom: "none" } : undefined}>
      <span>{k}</span>
      <b className="rdr-num">{val}</b>
    </div>
  );

  const sheetShell = (onClose: () => void, children: React.ReactNode, maxH = "92%") => (
    <>
      <div className="rdr-scrim" onClick={onClose} />
      <div className="rdr-sheet" style={{ maxHeight: maxH }} onClick={() => setTip(null)}>
        <div className="rdr-grab" />
        {children}
      </div>
    </>
  );

  const emptyState = (t: string, sub: string) => (
    <div style={{ textAlign: "center", padding: "40px 20px", color: colors.mu }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: colors.ink, margin: "8px 0" }}>{t}</div>
      <div>{sub}</div>
    </div>
  );

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
    setMlGateOn(true);
  };

  // ── stock page navigation: a real history entry so browser Back / edge-swipe returns to the list
  const [pageClosing, setPageClosing] = useState(false);
  const selectedRef = useRef<Setup | null>(null);
  selectedRef.current = selectedStock;
  const openStock = (st: Setup) => {
    try {
      window.history.pushState({ radarStock: st.symbol }, "", window.location.href);
    } catch (_) {}
    setPageClosing(false);
    setSelectedStock(st);
  };
  const closePage = () => {
    setPageClosing(true);
    window.setTimeout(() => {
      setSelectedStock(null);
      setPageClosing(false);
    }, 320);
  };
  const goBack = () => {
    if (window.history.state && window.history.state.radarStock) window.history.back();
    else closePage();
  };
  useEffect(() => {
    const onPop = () => {
      if (selectedRef.current) closePage();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    onStockOpenChange?.(selectedStock ? String(selectedStock.symbol) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStock?.symbol]);
  const firstSig = useRef(true);
  useEffect(() => {
    if (firstSig.current) return;
    if (selectedRef.current) goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backSignal]);
  useEffect(() => {
    if (firstSig.current) {
      firstSig.current = false;
      return;
    }
    // dock icon: always land on the Radar home list
    if (selectedRef.current) {
      setSelectedStock(null);
      setPageClosing(false);
    }
    rootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeSignal]);
  // keep the open page's numbers live as prices tick
  const liveSelected = useMemo(() => {
    if (!selectedStock) return null;
    const all = [...view.buyZone, ...view.radar, ...view.retest, ...view.runners, ...view.risk];
    return all.find((x) => x.symbol === selectedStock.symbol) || selectedStock;
  }, [selectedStock, view]);

  const sheetOpen = !!selectedStock || trustOpen || isSortOpen || isFilterOpen;
  const dateStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const overall = patAcc?.overall;

  return (
    <div className={`rdr-root${isLight ? " light" : ""}`} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
    <div ref={rootRef} className="rdr">
      <style>{RDR_CSS}</style>
      <div className="rdr-aura" />
      <div className={`rdr-content${sheetOpen ? " recede" : ""}`}>
        {/* Top bar */}
        <div className="rdr-top">
          <div className="rdr-brand">Radar</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="rdr-ibtn" onClick={() => setIsFilterOpen(true)} aria-label="Filters" style={{ width: "auto", padding: "0 14px", fontSize: 13, fontWeight: 650 }}>
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
            </button>
            <button className="rdr-ibtn" onClick={() => setTourStep(0)} aria-label="Show the tour">?</button>
          </div>
        </div>

        {/* Hero */}
        <div className="rdr-hero">
          <div className="rdr-date" style={{ color: isStale ? colors.am : undefined }}>
            {dateStr}
            {isStale ? ` · latest scan ${scanDate}` : ""}
          </div>
          <div style={{ margin: "6px 0 2px" }}><DataStatusBadge compact /></div>
          <div className="rdr-big">
            <em className="rdr-num">{isLoading ? "–" : shownReady}</em> {readyCount === 1 ? "stock is" : "stocks are"}
            <br />
            ready to buy today
          </div>
          <div className="rdr-sub">
            {summary?.total_stocks ? `Out of ${Number(summary.total_stocks).toLocaleString("en-IN")} scanned, these` : "These"} few are at a good price right now. We show you why, and when to stay away.
          </div>
          {winRate > 0 && (
            <div className="rdr-trust" onClick={() => setTrustOpen(true)}>
              <span className="rdr-dot" />
              <span>
                <b className="rdr-num">{winRate.toFixed(0)}%</b> of past setups hit their target
                {overall?.resolved_trades ? <> · <b className="rdr-num">{fmt0(overall.resolved_trades)}</b> trades</> : null}
              </span>
              <span>›</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="rdr-search">
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search any stock" />
          {searchInput && <button onClick={() => setSearchInput("")} aria-label="Clear search">✕</button>}
        </div>

        {/* Top picks */}
        {!isLoading && !loadError && topPicks.length > 0 && (
          <>
            {sectionHeader("Top picks", "Best reward for the risk")}
            <div className="rdr-picks" ref={picksRef} onScroll={runPicksFx}>
              {topPicks.map((s, i) => {
                const v = verdictOf(s);
                const d = diffOf(s);
                const st = patternStats(s);
                return (
                  <div key={s.symbol} className="rdr-pick" style={{ ["--vc" as any]: v.c }} onClick={() => openStock(s)}>
                    <div className="rdr-shine" />
                    <div className="rdr-rank">#{i + 1} pick</div>
                    <div className="rdr-psym">{s.symbol}</div>
                    <div className="rdr-cc">{s.company_name || s.symbol}</div>
                    <div className="rdr-verdict" style={{ color: v.c }}>
                      <i style={{ background: v.c, boxShadow: `0 0 10px ${v.c}` }} />
                      {v.w}
                    </div>
                    <div className="rdr-why">{whyText(s)}</div>
                    <div className="rdr-pprice rdr-num">
                      ₹{fmt(s.curr_price)}
                      <small style={{ color: d >= 0 ? colors.gn : colors.rd }}>
                        {d >= 0 ? "+" : ""}
                        {d.toFixed(1)}% vs trigger
                      </small>
                    </div>
                    <div className="rdr-why rdr-num" style={{ marginTop: 10 }}>
                      {st ? `${Number(st.win_rate_pct).toFixed(0)}% of similar setups won · ` : ""}
                      {rewardRisk(s).toFixed(1)}× reward vs risk
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Journey */}
        {sectionHeader("All setups", isLoading ? "Loading…" : activeTab === 5 ? `${closedRecords.length} trades` : `${activeList.length} stocks${mlGateOn && hiddenByGate > 0 ? ` · ${hiddenByGate} low-edge hidden` : ""}`)}
        <div className="rdr-journey">
          {STAGES.map((st, idx) => (
            <div key={st.key} className={`rdr-stage${idx === activeTab ? " on" : ""}${idx >= 4 ? " quiet" : ""}`} onClick={() => setActiveTab(idx)}>
              <div className="n rdr-num">{idx === 5 ? "↺" : isLoading ? "…" : stageCounts[idx]}</div>
              <div className="l">{st.label}</div>
            </div>
          ))}
        </div>
        <div className="rdr-stagetext" dangerouslySetInnerHTML={{ __html: STAGES[activeTab].text }} />

        <div className="rdr-filters">
          {TF_CHIPS.map((t) => (
            <Chip key={t.id} on={filters.timeframe === t.id} onClick={() => setF({ timeframe: t.id })}>
              {t.label}
            </Chip>
          ))}
          {activeTab !== 5 && (
            <button className="rdr-chip" onClick={() => setIsSortOpen(true)} style={{ marginLeft: "auto" }}>
              Sort: {SORTS.find((x) => x.key === sortKey)?.label} ⌄
            </button>
          )}
        </div>
        {patternChips.length > 0 && activeTab !== 5 && (
          <div className="rdr-filters">
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

        {isLoading && [1, 2, 3].map((i) => <div key={i} className="rdr-skel" />)}

        {loadError && !isLoading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: colors.mu }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: colors.ink, margin: "8px 0" }}>Could not load scan setups</div>
            <button className="rdr-cta" style={{ width: "auto", padding: "10px 24px" }} onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !loadError && activeTab !== 5 && (
          <div className="rdr-list">
            {activeList.length === 0 ? (
              <>
                {emptyState(
                  activeTab === 0 && !(activeFilterCount > 0 || searchInput) ? "No validated buys right now" : "Nothing here right now",
                  activeFilterCount > 0 || searchInput
                    ? "Try clearing search or filters."
                    : activeTab === 0
                    ? `The bar is strict on purpose. Meanwhile ${stageCounts[1]} setups are close to breaking out and ${stageCounts[2]} are retesting a broken level. Check those tabs.`
                    : "Check another stage, or come back after the next scan."
                )}
                {(activeFilterCount > 0 || searchInput) && (
                  <button className="rdr-chip" style={{ display: "block", margin: "0 auto" }} onClick={clearAll}>
                    Clear all
                  </button>
                )}
              </>
            ) : (
              activeList.map((s, i) => renderCard(s, i))
            )}
          </div>
        )}

        {activeTab === 5 && (
          <div className="rdr-list">
            <div className="rdr-filters" style={{ padding: "0 4px 12px" }}>
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
        <div style={{ height: 90 }} />
      </div>

      {/* Track record */}
      {trustOpen &&
        sheetShell(
          () => setTrustOpen(false),
          <>
            <div className="rdr-shsym rdr-st" style={{ fontSize: 24 }}>Track record</div>
            <div className="rdr-why rdr-st" style={{ fontSize: 15 }}>Every setup is tested against what happened next. Nothing is hidden.</div>
            <div className="rdr-sbox rdr-st">
              {row("Closed trades", fmt0(overall?.resolved_trades))}
              {row("Hit target", <span style={{ color: colors.gn }}>{winRate.toFixed(0)}%</span>)}
              {overall?.avg_pnl_pct !== undefined && row("Average result", `${Number(overall.avg_pnl_pct) >= 0 ? "+" : ""}${Number(overall.avg_pnl_pct).toFixed(1)}%`)}
              {overall?.avg_holding_bars !== undefined && row("Typical hold", `${Number(overall.avg_holding_bars).toFixed(0)} bars`, true)}
            </div>
            {patAcc?.by_timeframe && (
              <>
                {label("By timeframe")}
                <div className="rdr-sbox rdr-st">
                  {Object.entries(patAcc.by_timeframe as Record<string, any>).map(([k, t], i, a) => row(timeframeLabel(k), `${Number(t.win_rate_pct).toFixed(0)}% · ${t.resolved} trades`, i === a.length - 1))}
                </div>
              </>
            )}
          </>
        )}

      {/* Sort sheet */}
      {isSortOpen &&
        sheetShell(
          () => setIsSortOpen(false),
          <>
            <div className="rdr-shsym rdr-st" style={{ fontSize: 22, marginBottom: 12 }}>Sort setups</div>
            <div className="rdr-sbox rdr-st">
              {SORTS.map((x, i) => (
                <div key={x.key} className="rdr-kv" style={{ cursor: "pointer", borderBottom: i === SORTS.length - 1 ? "none" : undefined }} onClick={() => { setSortKey(x.key); setIsSortOpen(false); }}>
                  <span style={{ color: colors.ink, fontWeight: sortKey === x.key ? 700 : 500 }}>{x.label}</span>
                  {sortKey === x.key && <span style={{ color: colors.acc }}>✓</span>}
                </div>
              ))}
            </div>
          </>,
          "60%"
        )}

      {/* Filter sheet */}
      {isFilterOpen &&
        sheetShell(
          () => setIsFilterOpen(false),
          <>
            <div className="rdr-row rdr-st" style={{ marginBottom: 12, alignItems: "center" }}>
              <div className="rdr-shsym" style={{ fontSize: 22 }}>Filters</div>
              <button className="rdr-chip on" onClick={() => setIsFilterOpen(false)}>Done</button>
            </div>
            {label("Market cap")}
            <div className="rdr-wrap rdr-st">
              {MCAP_OPTIONS.map((m) => (
                <Chip key={m.id} on={filters.mcap === m.id} onClick={() => setF({ mcap: m.id })}>{m.label}</Chip>
              ))}
            </div>
            {sectorOptions.length > 0 && (
              <>
                {label("Sector")}
                <div className="rdr-wrap rdr-st">
                  <Chip on={!filters.sector} onClick={() => setF({ sector: "" })}>Any</Chip>
                  {sectorOptions.map(([name, n]) => (
                    <Chip key={name} on={filters.sector === name} onClick={() => setF({ sector: filters.sector === name ? "" : name })}>{name} {n}</Chip>
                  ))}
                </div>
              </>
            )}
            <div className="rdr-sbox rdr-st" style={{ marginTop: 18 }}>
              <div className="rdr-kv">
                <span style={{ color: colors.ink }}>F&amp;O stocks only</span>
                <input type="checkbox" checked={filters.fnoOnly} onChange={(e) => setF({ fnoOnly: e.target.checked })} style={{ width: 20, height: 20, accentColor: colors.acc }} />
              </div>
              <div className="rdr-kv">
                <span style={{ color: colors.ink }}>Hide low-edge patterns<div style={{ fontSize: 11, color: colors.mu }}>Patterns that historically lose more than they win</div></span>
                <input type="checkbox" checked={mlGateOn} onChange={(e) => setMlGateOn(e.target.checked)} style={{ width: 20, height: 20, accentColor: colors.acc }} />
              </div>
              <div className="rdr-kv" style={{ flexDirection: "column", gap: 8, borderBottom: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: colors.ink }}>Minimum setup strength</span>
                  <b style={{ color: colors.acc }}>{filters.minScore}</b>
                </div>
                <input type="range" min="0" max="95" step="5" value={filters.minScore} onChange={(e) => setF({ minScore: Number(e.target.value) })} style={{ width: "100%", accentColor: colors.acc }} />
              </div>
            </div>
            <button className="rdr-btn2 rdr-st" style={{ color: colors.rd }} onClick={() => { clearAll(); setIsFilterOpen(false); }}>Reset filters</button>
          </>,
          "86%"
        )}

      {/* Glossary tooltip */}
      {tip && <div className="rdr-tipbox" style={{ left: tip.x, top: Math.max(8, tip.y - 78) }}>{tip.text}</div>}

      {/* First-visit tour */}
      {tourStep !== null && (
        <div className="rdr-coach">
          <div className="rdr-cbox">
            <h3>{TOUR[tourStep][0]}</h3>
            <p>{TOUR[tourStep][1]}</p>
            <div className="rdr-dots">{TOUR.map((_, i) => <i key={i} className={i === tourStep ? "on" : ""} />)}</div>
            <button className="rdr-cta" onClick={() => (tourStep < TOUR.length - 1 ? setTourStep(tourStep + 1) : endTour())}>
              {tourStep < TOUR.length - 1 ? "Next" : "Got it"}
            </button>
            <button className="rdr-skip" onClick={endTour}>Skip</button>
          </div>
        </div>
      )}
    </div>
    {/* Stock page (sits under the app header so its back arrow stays visible) */}
      {liveSelected && (
        <RadarStockPage
          key={liveSelected.symbol}
          stock={liveSelected}
          theme={isLight ? "light" : "dark"}
          colors={colors}
          verdict={verdictOf(liveSelected)}
          why={whyText(liveSelected)}
          stats={patternStats(liveSelected)}
          gate={mlGateFor(liveSelected)}
          closing={pageClosing}
          onBack={goBack}
          onOpenDna={() => {
            const x = liveSelected;
            setSelectedStock(null);
            setPageClosing(false);
            if (onSelectStock) onSelectStock(x.symbol, x);
            else if (onSwitchTab) onSwitchTab("dna");
          }}
        />
      )}

    </div>
  );
}

class RadarBoundary extends React.Component<{ children: React.ReactNode; theme?: string }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("Radar crashed:", err, info.componentStack);
  }
  render() {
    if (!this.state.err) return this.props.children;
    const light = this.props.theme === "light";
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: light ? "#0B0D14" : "#F5F6F8", background: light ? "#EEF1F9" : "#06070A" }}>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 18, fontWeight: 750, marginBottom: 8 }}>Radar hit a problem</div>
          <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5, marginBottom: 6 }}>The rest of the app is fine. Tap below to reload this screen.</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 16, wordBreak: "break-word" }}>{String(this.state.err.message || this.state.err).slice(0, 160)}</div>
          <button onClick={() => this.setState({ err: null })} style={{ padding: "11px 22px", borderRadius: 14, border: "none", background: "linear-gradient(120deg,#6C7BFF,#9B7BF5)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Reload Radar
          </button>
        </div>
      </div>
    );
  }
}

export default function RadarScreen(props: RadarScreenProps) {
  return (
    <RadarBoundary theme={props.theme}>
      <RadarScreenInner {...props} />
    </RadarBoundary>
  );
}

const RDR_CSS = `
.rdr-root{--bg:#06070A;--bg2:#0C0E14;--glass:rgba(255,255,255,.055);--glass2:rgba(255,255,255,.09);--line:rgba(255,255,255,.09);--ink:#F5F6F8;--mu:rgba(235,238,245,.62);--dim:rgba(235,238,245,.36);--acc:#7C8CFF;--acc2:#A78BFA;--gn:#34D399;--rd:#FB7185;--am:#FBBF24;
--sh:0 1px 0 rgba(255,255,255,.12) inset,0 -1px 0 rgba(0,0,0,.4) inset,0 2px 4px rgba(0,0,0,.35),0 14px 28px -8px rgba(0,0,0,.55),0 44px 80px -30px rgba(0,0,0,.85);--r:22px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",sans-serif;color:var(--ink)}
.rdr{position:relative;width:100%;height:100%;overflow-y:auto;overflow-x:hidden;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",sans-serif;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.rdr-root.light{--bg:#E9EDF8;--bg2:#F7F8FD;--glass:#FFFFFF;--glass2:#FFFFFF;--line:rgba(48,58,130,.12);--ink:#0A0C18;--mu:rgba(16,22,52,.70);--dim:rgba(16,22,52,.46);--acc:#4B57F0;--acc2:#8B5CF6;--gn:#0A9B69;--rd:#E0163F;--am:#B45309;
--sh:0 1px 0 rgba(255,255,255,1) inset,0 1px 2px rgba(40,50,130,.10),0 10px 22px -8px rgba(60,72,190,.26),0 34px 56px -26px rgba(60,72,190,.38)}
.rdr::-webkit-scrollbar{display:none}
.rdr *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.rdr button{font-family:inherit}
.rdr-num{font-variant-numeric:tabular-nums}
.rdr-aura{position:absolute;left:-20%;right:-20%;top:-10%;height:60vh;background:radial-gradient(60% 60% at 30% 30%,rgba(124,140,255,.28),transparent 70%),radial-gradient(50% 50% at 80% 20%,rgba(167,139,250,.2),transparent 70%);pointer-events:none;transform:translateY(var(--py,0px));filter:blur(8px)}
.rdr-root.light .rdr-aura{background:radial-gradient(55% 60% at 22% 25%,rgba(99,102,241,.38),transparent 70%),radial-gradient(45% 55% at 85% 12%,rgba(236,72,153,.22),transparent 70%),radial-gradient(50% 50% at 60% 55%,rgba(20,184,166,.16),transparent 70%)}
.rdr-root.light{background:linear-gradient(180deg,#E3E8F7,#EEF1FA 40%,#E9EDF8)}
.rdr-root.light .rdr{background:transparent}
.rdr-content{position:relative;max-width:620px;margin:0 auto;transform-origin:50% 0;transition:transform .6s cubic-bezier(.2,.9,.25,1),filter .6s}
.rdr-content.recede{transform:scale(.95) translateY(8px);filter:brightness(.55)}
.rdr-top{position:sticky;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;padding:16px 20px 10px;background:linear-gradient(var(--bg) 85%,transparent)}
.rdr-brand{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.rdr-ibtn{min-width:36px;height:36px;border-radius:99px;background:var(--glass);border:1px solid var(--line);display:grid;place-items:center;color:var(--ink);cursor:pointer;font-size:15px;box-shadow:var(--sh)}
.rdr-hero{padding:6px 22px 8px;transform-origin:0 0;transform:translateY(var(--hy,0px)) scale(var(--hs,1));opacity:var(--ho,1);will-change:transform,opacity}
.rdr-date{font-size:13px;color:var(--mu);font-weight:500}
.rdr-big{font-size:38px;line-height:1.05;font-weight:800;letter-spacing:-.035em;margin:8px 0 10px}
.rdr-big em{font-style:normal;background:linear-gradient(100deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}
.rdr-sub{font-size:15px;line-height:1.45;color:var(--mu);max-width:340px}
.rdr-trust{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:7px 12px;border-radius:99px;background:var(--glass);border:1px solid var(--line);box-shadow:var(--sh);font-size:12px;color:var(--mu);cursor:pointer}
.rdr-trust b{color:var(--ink)}
.rdr-dot{width:7px;height:7px;border-radius:50%;background:var(--gn);box-shadow:0 0 10px var(--gn);animation:rdrpulse 2s infinite}
@keyframes rdrpulse{50%{opacity:.4}}
.rdr-search{display:flex;align-items:center;margin:16px 22px 0;height:42px;border-radius:14px;background:var(--glass);border:1px solid var(--line);padding:0 14px;box-shadow:var(--sh)}
.rdr-search input{flex:1;background:none;border:none;outline:none;color:var(--ink);font-size:14.5px}
.rdr-search button{background:none;border:none;color:var(--mu);cursor:pointer}
.rdr-sec{display:flex;justify-content:space-between;align-items:baseline;padding:26px 22px 12px;transform:translateY(var(--ry2,0px));opacity:var(--ro,1)}
.rdr-sec h2{margin:0;font-size:20px;font-weight:750;letter-spacing:-.02em}
.rdr-sec span{font-size:12.5px;color:var(--mu)}
.rdr-picks,.rdr-list{perspective:1100px}
.rdr-picks{display:flex;gap:14px;overflow-x:auto;padding:14px 22px 34px;scroll-snap-type:x mandatory;scrollbar-width:none}
.rdr-picks::-webkit-scrollbar{display:none}
.rdr-pick{flex:0 0 78%;scroll-snap-align:center;border-radius:28px;padding:20px;position:relative;overflow:hidden;cursor:pointer;background:linear-gradient(155deg,var(--glass2),var(--glass));border:1px solid var(--line);box-shadow:var(--sh);
 transform:translate3d(0,0,0) rotateY(var(--ry,0deg)) scale(var(--s,1));opacity:var(--o,1)}
.rdr-pick:before{content:"";position:absolute;inset:0;background:radial-gradient(85% 70% at 100% 0,color-mix(in srgb,var(--vc,#7C8CFF) 26%,transparent),transparent 62%);pointer-events:none}
.rdr-pick:after,.rdr-card:before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:linear-gradient(160deg,rgba(255,255,255,.34),rgba(255,255,255,0) 38%,rgba(124,140,255,.25) 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.rdr-shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.10) 45%,transparent 60%);transform:translateX(var(--sx,-60%));pointer-events:none}
.rdr-rank{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--acc);text-transform:uppercase}
.rdr-psym{font-size:26px;font-weight:800;letter-spacing:-.03em;margin-top:6px}
.rdr-verdict{display:inline-flex;align-items:center;gap:7px;margin-top:14px;font-weight:750;font-size:15px}
.rdr-verdict i{width:9px;height:9px;border-radius:50%;display:block}
.rdr-why{font-size:13.5px;line-height:1.4;color:var(--mu);margin-top:6px}
.rdr-pprice{font-size:22px;font-weight:750;margin-top:14px}
.rdr-pprice small{font-size:12.5px;font-weight:600;margin-left:6px}
.rdr-journey{display:flex;gap:8px;padding:0 22px;overflow-x:auto;scrollbar-width:none}
.rdr-journey::-webkit-scrollbar{display:none}
.rdr-stage{flex:1 0 auto;min-width:82px;text-align:left;padding:11px 13px;border-radius:18px;background:var(--glass);border:1px solid var(--line);box-shadow:var(--sh);color:var(--ink);cursor:pointer;transition:all .3s cubic-bezier(.2,.8,.2,1)}
.rdr-stage .n{font-size:22px;font-weight:800;letter-spacing:-.02em}
.rdr-stage .l{font-size:12px;color:var(--mu);margin-top:1px;font-weight:600}
.rdr-stage.quiet{min-width:70px;opacity:.8}
.rdr-stage.on{background:linear-gradient(150deg,var(--acc),var(--acc2));border-color:transparent;box-shadow:0 14px 30px -12px var(--acc);opacity:1}
.rdr-stage.on .l,.rdr-stage.on .n{color:#fff}
.rdr-stagetext{padding:14px 24px 8px;font-size:14px;line-height:1.45;color:var(--mu);min-height:54px}
.rdr-stagetext b{color:var(--ink)}
.rdr-filters{display:flex;gap:6px;overflow-x:auto;padding:4px 22px 8px;scrollbar-width:none}
.rdr-filters::-webkit-scrollbar{display:none}
.rdr-wrap{display:flex;flex-wrap:wrap;gap:8px}
.rdr-chip{flex:0 0 auto;padding:7px 13px;border-radius:99px;border:1px solid var(--line);background:var(--glass);box-shadow:0 1px 2px rgba(20,24,60,.08);color:var(--ink);font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.rdr-chip.on{background:linear-gradient(150deg,var(--acc),var(--acc2));border-color:transparent;color:#fff}
.rdr-list{padding:8px 18px 0}
.rdr-card{position:relative;overflow:hidden;border-radius:var(--r);padding:16px 18px 14px;margin-bottom:14px;background:linear-gradient(165deg,var(--glass2),var(--glass));border:1px solid var(--line);box-shadow:var(--sh);cursor:pointer;
 transform-origin:50% 100%;transform:translate3d(0,var(--ty,0px),0) rotateX(var(--rx,0deg)) scale(var(--s,1));opacity:var(--o,1)}
.rdr-root.light .rdr-card{background:linear-gradient(165deg,#FFFFFF 40%,#F1F3FF)}
.rdr-card:after{content:"";position:absolute;right:-30px;top:-40px;width:170px;height:150px;background:radial-gradient(closest-side,color-mix(in srgb,var(--vc,#7C8CFF) 30%,transparent),transparent);pointer-events:none;opacity:.8}
.rdr-card:active{filter:brightness(1.05)}
.rdr-card>*{position:relative;z-index:1}
.rdr-card>.rdr-shine{position:absolute;z-index:0}
.rdr-root.zoomed .rdr-card,.rdr-root.zoomed .rdr-pick,.rdr-root.zoomed .rdr-hero,.rdr-root.zoomed .rdr-sec{transform:none!important;opacity:1!important}
.rdr-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.rdr-cs{font-size:19px;font-weight:780;letter-spacing:-.02em}
.rdr-cc{font-size:12px;color:var(--mu);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rdr-cp{font-size:18px;font-weight:750;text-align:right}
.rdr-cd{font-size:12px;font-weight:650;text-align:right;margin-top:1px}
.rdr-vline{display:flex;align-items:center;gap:8px;margin-top:11px}
.rdr-vtag{font-size:13px;font-weight:760;padding:4px 10px;border-radius:99px;white-space:nowrap}
.rdr-vtxt{font-size:12.5px;color:var(--mu);flex:1}
.rdr-foot{margin-top:6px;font-size:11.5px;color:var(--dim)}
.rdr-ruler{position:relative;height:36px;margin:14px 2px 2px}
.rdr-rt{position:absolute;left:0;right:0;top:12px;height:5px;border-radius:3px;background:var(--glass2);overflow:hidden}
.rdr-rt i{position:absolute;top:0;bottom:0}
.rdr-rd{position:absolute;top:6px;width:17px;height:17px;margin-left:-8px;border-radius:50%;background:#fff;border:4px solid var(--acc);box-shadow:0 0 0 6px rgba(124,140,255,.18),0 4px 12px rgba(0,0,0,.4);transition:left .8s cubic-bezier(.2,.8,.2,1)}
.rdr-rl{position:absolute;top:24px;font-size:10.5px;color:var(--dim);transform:translateX(-50%);white-space:nowrap}
.rdr-skel{height:150px;border-radius:22px;margin:0 18px 14px;background:var(--glass);animation:rdrpulse 1.4s infinite}
.rdr-scrim{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.55);backdrop-filter:blur(3px);animation:rdrfade .3s ease both}
@keyframes rdrfade{from{opacity:0}to{opacity:1}}
.rdr-sheet{position:fixed;left:0;right:0;margin:0 auto;bottom:0;z-index:60;width:100%;max-width:620px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y;border-radius:30px 30px 0 0;background:var(--bg2);color:var(--ink);border:1px solid var(--line);padding:12px 20px 40px;box-shadow:0 -30px 80px rgba(0,0,0,.6),0 -1px 0 rgba(255,255,255,.14) inset;scrollbar-width:none;animation:rdrsheet .55s cubic-bezier(.2,.9,.25,1) both}
.rdr-sheet::-webkit-scrollbar{display:none}
@keyframes rdrsheet{from{transform:translateY(105%)}to{transform:none}}
.rdr-sheet *{min-width:0;max-width:100%}
.rdr-sheet .rdr-row>div:first-child{flex:1 1 auto;min-width:0}
.rdr-sheet .rdr-row>div:last-child{flex:0 0 auto;white-space:nowrap}
.rdr-sheet .rdr-shsym{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rdr-kv>span:first-child{flex:1 1 auto}
.rdr-kv b{flex:0 1 auto;overflow-wrap:anywhere}
.rdr-sheet svg{max-width:100%}
.rdr-st{animation:rdrrise .7s cubic-bezier(.2,.9,.25,1) both;animation-delay:.18s}
.rdr-sheet .rdr-st:nth-child(n+3){animation-delay:.26s}.rdr-sheet .rdr-st:nth-child(n+5){animation-delay:.34s}.rdr-sheet .rdr-st:nth-child(n+7){animation-delay:.42s}.rdr-sheet .rdr-st:nth-child(n+9){animation-delay:.5s}
@keyframes rdrrise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.rdr-cand{animation:rdrgrow .6s cubic-bezier(.2,.9,.25,1) both;animation-delay:calc(var(--c)*14ms + 350ms);transform-box:fill-box;transform-origin:center}
@keyframes rdrgrow{from{opacity:0;transform:scaleY(.2)}to{opacity:1;transform:none}}
.rdr-grab{width:38px;height:5px;border-radius:3px;background:var(--dim);margin:0 auto 16px}
.rdr-shsym{font-size:clamp(21px,6.2vw,30px);font-weight:800;letter-spacing:-.03em}
.rdr-sbox{margin-top:16px;border-radius:20px;background:var(--glass);border:1px solid var(--line);padding:4px 16px;box-shadow:var(--sh)}
.rdr-kv{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);font-size:14px}
.rdr-kv>span:first-child{color:var(--mu)}
.rdr-kv b{font-weight:700;text-align:right}
.rdr-lab{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);font-weight:700;margin:22px 4px 8px}
.rdr-input{width:96px;text-align:right;background:var(--glass2);border:1px solid var(--line);border-radius:10px;padding:6px 9px;color:var(--ink);font-weight:700;outline:none}
.rdr-chartmsg{padding:30px 0;text-align:center;font-size:12px;color:var(--mu)}
.rdr-chart{color:var(--ink)}
.rdr-cta{width:100%;margin-top:18px;padding:16px;border:none;border-radius:18px;font-size:16px;font-weight:750;color:#fff;background:linear-gradient(120deg,var(--acc),var(--acc2));box-shadow:0 16px 34px -14px var(--acc);cursor:pointer}
.rdr-btn2{width:100%;margin-top:10px;padding:14px;border:1px solid var(--line);border-radius:18px;font-size:15px;font-weight:700;color:var(--acc);background:var(--glass);cursor:pointer}
.rdr-tip{border-bottom:1px dotted var(--dim);cursor:help}
.rdr-tipbox{position:fixed;z-index:90;max-width:240px;padding:11px 13px;border-radius:14px;background:var(--ink);color:var(--bg);font-size:12.5px;line-height:1.4;box-shadow:0 12px 30px rgba(0,0,0,.5);animation:rdrfade .2s both}
.rdr-coach{position:fixed;inset:0;z-index:100;background:rgba(3,4,8,.82);backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;padding:20px;animation:rdrfade .4s both}
.rdr-cbox{width:100%;max-width:520px;border-radius:28px;padding:24px;background:var(--bg2);border:1px solid var(--line);color:var(--ink)}
.rdr-cbox h3{margin:0 0 6px;font-size:22px;letter-spacing:-.02em}
.rdr-cbox p{margin:0;color:var(--mu);font-size:15px;line-height:1.5}
.rdr-dots{display:flex;gap:6px;margin:18px 0 4px}.rdr-dots i{height:5px;width:18px;border-radius:3px;background:var(--line)}.rdr-dots i.on{background:var(--acc);width:30px}
.rdr-skip{display:block;margin:10px auto 0;background:none;border:none;color:var(--mu);font-size:13px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.rdr *{animation-duration:.01ms!important;transition-duration:.01ms!important}.rdr-card,.rdr-pick,.rdr-hero,.rdr-sec{transform:none!important;opacity:1!important;filter:none!important}}
`;
