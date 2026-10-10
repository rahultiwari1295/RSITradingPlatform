import React, { useState, useEffect, useCallback, useMemo } from "react";
import { quantsyncApi } from "../api/quantsyncApi";
import { liveMarketSocket } from "../services/liveMarketSocket";
import { normalizePatternId, getBreakoutClassification, matchesMcap } from "../lib/setupEngine";
// Re-exported so existing imports keep working; the logic now lives in lib/setupEngine.ts
export { normalizePatternId, getBreakoutClassification };

interface ScreenerScreenProps {
  theme?: "dark" | "light";
  livePrices?: Record<string, { price: number; change_pct?: number }>;
  onSelectStock?: (symbol: string, stockData?: any) => void;
}

const AVATAR_GRADS = [
  "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
  "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
  "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
];

// ─────────────────────────────────────────────────────────────
// PREMIUM CHART PATTERN SVG ILLUSTRATIONS (MATCHING USER REFERENCE)
// ─────────────────────────────────────────────────────────────

function SvgAllPatterns() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <path d="M 6 28 Q 28 12 50 22 T 82 10 L 92 5" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <polygon points="92,3 94,10 87,8" fill="var(--accent)" />
      <circle cx="28" cy="18" r="2.5" fill="#10B981" />
      <circle cx="58" cy="21" r="2.5" fill="#F59E0B" />
      <circle cx="82" cy="10" r="3" fill="#10B981" />
    </svg>
  );
}

function SvgDoubleBottom() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <line x1="16" y1="13" x2="88" y2="13" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="12" y1="12" x2="25" y2="28" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="28" x2="42" y2="14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="14" x2="58" y2="28" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="58" y1="28" x2="84" y2="6" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      <polygon points="84,3 87,11 79,9" fill="#10B981" />
    </svg>
  );
}

function SvgBreakoutRally() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <line x1="8" y1="15" x2="70" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3 2" />
      <rect x="14" y="19" width="3.5" height="8" fill="#10B981" rx="1" />
      <rect x="23" y="17" width="3.5" height="10" fill="#EF4444" rx="1" />
      <rect x="32" y="20" width="3.5" height="7" fill="#10B981" rx="1" />
      <rect x="41" y="16" width="3.5" height="11" fill="#10B981" rx="1" />
      <rect x="54" y="9" width="4.5" height="18" fill="#10B981" rx="1" />
      <rect x="66" y="5" width="4.5" height="16" fill="#10B981" rx="1" />
      <path d="M 72 9 L 86 4" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" />
      <polygon points="86,2 88,9 81,7" fill="#10B981" />
    </svg>
  );
}

function SvgHorizontalBase() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <line x1="8" y1="13" x2="72" y2="13" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="8" y1="28" x2="72" y2="28" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <rect x="13" y="16" width="3.5" height="10" fill="#10B981" rx="1" />
      <rect x="22" y="14" width="3.5" height="12" fill="#EF4444" rx="1" />
      <rect x="31" y="18" width="3.5" height="8" fill="#10B981" rx="1" />
      <rect x="40" y="15" width="3.5" height="11" fill="#EF4444" rx="1" />
      <rect x="49" y="14" width="3.5" height="12" fill="#10B981" rx="1" />
      <rect x="60" y="6" width="4.5" height="15" fill="#10B981" rx="1" />
      <path d="M 68 9 L 85 4" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" />
      <polygon points="85,2 87,9 80,7" fill="#10B981" />
    </svg>
  );
}

function SvgPullback() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <path d="M 6 30 Q 38 26 84 17" stroke="#3B82F6" strokeWidth="1.2" strokeDasharray="2 2" />
      <line x1="10" y1="30" x2="26" y2="10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="10" x2="36" y2="18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="18" x2="46" y2="14" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="14" x2="56" y2="23" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <line x1="56" y1="23" x2="82" y2="6" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      <polygon points="82,3 85,11 77,9" fill="#10B981" />
    </svg>
  );
}

function SvgVcpSqueeze() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <line x1="10" y1="9" x2="68" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <line x1="10" y1="31" x2="68" y2="21" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <path d="M 12 11 Q 22 28 30 19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M 30 19 Q 42 26 50 18" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
      <path d="M 50 18 Q 58 21 64 19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M 65 19 L 86 5" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      <polygon points="86,3 88,10 81,8" fill="#10B981" />
    </svg>
  );
}

function SvgTriangle() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <line x1="8" y1="13" x2="70" y2="13" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1="8" y1="30" x2="68" y2="15" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <rect x="14" y="15" width="3.5" height="13" fill="#10B981" rx="1" />
      <rect x="26" y="15" width="3.5" height="10" fill="#EF4444" rx="1" />
      <rect x="38" y="15" width="3.5" height="7" fill="#10B981" rx="1" />
      <rect x="50" y="14" width="3.5" height="5" fill="#10B981" rx="1" />
      <path d="M 64 13 L 84 5" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" />
      <polygon points="84,3 86,10 79,8" fill="#10B981" />
    </svg>
  );
}

function SvgCupHandle() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <line x1="8" y1="13" x2="72" y2="13" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M 12 13 Q 32 33 54 14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 54 14 Q 63 22 70 16" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M 70 15 L 85 5" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" />
      <polygon points="85,3 87,10 80,8" fill="#10B981" />
    </svg>
  );
}

function SvgInvHeadShoulders() {
  return (
    <svg viewBox="0 0 100 36" className="sc-pat-svg" fill="none">
      <line x1="10" y1="13" x2="80" y2="13" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M 12 13 Q 22 25 30 14" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M 30 14 Q 45 33 58 14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 58 14 Q 67 24 74 14" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M 74 14 L 87 5" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" />
      <polygon points="87,3 89,10 82,8" fill="#10B981" />
    </svg>
  );
}

// Map pattern types to friendly ID and visual SVG
const MASTER_PATTERNS = [
  { id: "ALL", label: "All Setups", icon: SvgAllPatterns },
  { id: "BREAKOUT_RALLY", label: "Breakout Rally", icon: SvgBreakoutRally },
  { id: "HORIZONTAL_RANGE", label: "Horizontal Base", icon: SvgHorizontalBase },
  { id: "PULLBACK", label: "50-EMA Dip", icon: SvgPullback },
  { id: "DOUBLE_BOTTOM", label: "Double Bottom (W)", icon: SvgDoubleBottom },
  { id: "VCP_SQUEEZE", label: "VCP Squeeze", icon: SvgVcpSqueeze },
  { id: "TRIANGLE", label: "Triangle / Wedge", icon: SvgTriangle },
  { id: "CUP_HANDLE", label: "Cup & Handle", icon: SvgCupHandle },
  { id: "INV_HEAD_SHOULDERS", label: "Inv. Head & Shoulders", icon: SvgInvHeadShoulders },
];

interface MiniBaseSparklineProps {
  candlesJson?: string | any[];
  isBullish?: boolean;
}

export const MiniBaseSparkline: React.FC<MiniBaseSparklineProps> = ({ candlesJson, isBullish = true }) => {
  let candles: Array<{ o: number; h: number; l: number; c: number; v?: number }> = [];

  if (typeof candlesJson === "string" && candlesJson.trim()) {
    try {
      candles = JSON.parse(candlesJson);
    } catch {
      candles = [];
    }
  } else if (Array.isArray(candlesJson)) {
    candles = candlesJson;
  }

  if (!candles || candles.length < 5) {
    return (
      <div className="sc-mini-sparkline fallback">
        <svg viewBox="0 0 160 36" className="sc-sparkline-svg" preserveAspectRatio="none">
          <path
            d="M 4 28 Q 40 30 75 22 T 120 14 L 154 6"
            fill="none"
            stroke={isBullish ? "#10B981" : "#F59E0B"}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="154" cy="6" r="2.5" fill={isBullish ? "#10B981" : "#F59E0B"} />
        </svg>
      </div>
    );
  }

  const slice = candles.slice(-20);
  let minP = Infinity;
  let maxP = -Infinity;
  for (const c of slice) {
    if (c.l < minP) minP = c.l;
    if (c.h > maxP) maxP = c.h;
  }
  const range = maxP - minP || 1;
  const W = 160;
  const H = 36;
  const padY = 3;
  const step = W / (slice.length || 1);

  return (
    <div className="sc-mini-sparkline" title="Base formation & breakout candles">
      <svg viewBox={`0 0 ${W} ${H}`} className="sc-sparkline-svg" preserveAspectRatio="none">
        {slice.map((c, i) => {
          const x = i * step + step * 0.5;
          const yH = H - padY - ((c.h - minP) / range) * (H - 2 * padY);
          const yL = H - padY - ((c.l - minP) / range) * (H - 2 * padY);
          const yO = H - padY - ((c.o - minP) / range) * (H - 2 * padY);
          const yC = H - padY - ((c.c - minP) / range) * (H - 2 * padY);
          const isUp = c.c >= c.o;
          const color = isUp ? "#10B981" : "#EF4444";
          const bodyY = Math.min(yO, yC);
          const bodyH = Math.max(1.8, Math.abs(yC - yO));

          return (
            <g key={i}>
              <line x1={x} y1={yH} x2={x} y2={yL} stroke={color} strokeWidth="1" opacity="0.7" />
              <rect
                x={x - Math.max(1.2, step * 0.32)}
                y={bodyY}
                width={Math.max(2.4, step * 0.64)}
                height={bodyH}
                fill={color}
                rx="0.5"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

interface BreakoutProximityGaugeProps {
  cmp: number;
  pivot: number;
  target?: number | null;
  stopLoss?: number | null;
  status: "BUY" | "MISSED" | "SKIP" | "TARGET_ACHIEVED" | "NEAR";
}

export const BreakoutProximityGauge: React.FC<BreakoutProximityGaugeProps> = ({ cmp, pivot, target, stopLoss, status }) => {
  if (!pivot || pivot <= 0 || !cmp || cmp <= 0) return null;

  const diffPct = ((cmp - pivot) / pivot) * 100;
  const floor = stopLoss && stopLoss > 0 && stopLoss < pivot ? stopLoss : pivot * 0.92;
  const ceiling = target && target > pivot ? target : pivot * 1.25;
  const totalSpan = ceiling - floor || 1;
  const pivotPosPct = Math.max(15, Math.min(85, ((pivot - floor) / totalSpan) * 100));
  const currentPosPct = Math.max(4, Math.min(96, ((cmp - floor) / totalSpan) * 100));
  const isHot = Math.abs(diffPct) <= 1.5;

  let trackClass = "gauge-near";
  if (status === "TARGET_ACHIEVED") trackClass = "gauge-achieved";
  else if (status === "BUY") trackClass = "gauge-buy";
  else if (status === "MISSED") trackClass = "gauge-extended";
  else if (status === "SKIP") trackClass = "gauge-skip";

  return (
    <div className={`sc-proximity-gauge ${trackClass}`}>
      <div className="sc-gauge-labels">
        <span className="sc-gauge-label-left">
          Floor <b className="num">₹{floor.toFixed(0)}</b>
        </span>
        <span className="sc-gauge-label-mid">
          Pivot <b className="num">₹{pivot.toFixed(1)}</b>
        </span>
        <span className="sc-gauge-label-right">
          Target <b className="num">₹{ceiling.toFixed(0)}</b>
        </span>
      </div>

      <div className="sc-gauge-track-wrap">
        <div className="sc-gauge-track">
          <div className="sc-gauge-fill" style={{ width: `${currentPosPct}%` }} />
          <div className="sc-gauge-pivot-pin" style={{ left: `${pivotPosPct}%` }} title={`Pivot Trigger: ₹${pivot.toFixed(1)}`} />
          <div
            className={`sc-gauge-cmp-dot ${isHot ? "is-hot" : ""}`}
            style={{ left: `${currentPosPct}%` }}
            title={`CMP: ₹${cmp.toFixed(2)} (${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%)`}
          />
        </div>
      </div>
    </div>
  );
};

// Market Cap Filter Options
const MCAP_OPTIONS = [
  { id: "ALL", label: "All Caps" },
  { id: "Large-Cap", label: "Large Cap" },
  { id: "Mid-Cap", label: "Mid Cap" },
  { id: "Small-Cap", label: "Small Cap" },
  { id: "Micro-Cap", label: "Micro Cap" },
];

function formatDateStr(d?: string) {
  if (!d) return "—";
  try {
    const parts = d.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${months[monthIdx] || parts[1]} ${year}`;
    }
  } catch {}
  return d;
}

export default function ScreenerScreen({ theme, livePrices, onSelectStock }: ScreenerScreenProps) {
  // 1. Master 3-Tab Lifecycle: "fresh" (Fresh Opportunities) | "runners" (Active Runners) | "closed" (Closed Trades Ledger)
  const [masterTab, setMasterTab] = useState<"fresh" | "runners" | "closed">("fresh");
  const [globalTf, setGlobalTf] = useState<"ALL" | "DAILY" | "WEEKLY" | "MONTHLY">("ALL");
  const [selectedPattern, setSelectedPattern] = useState<string>("ALL");
  const [freshSubFilter, setFreshSubFilter] = useState<"ALL" | "BUY_ZONE" | "RETEST" | "RADAR">("ALL");
  const [closedFilter, setClosedFilter] = useState<"ALL" | "TARGET_HIT" | "STOPPED_OUT">("ALL");
  const [mcapFilter, setMcapFilter] = useState<string>("ALL");
  const [patternAccuracy, setPatternAccuracy] = useState<any>(null);
  const [mlGatesData, setMlGatesData] = useState<any>(null);

  // Closed Trades Ledger State
  const [closedRecords, setClosedRecords] = useState<any[]>([]);
  const [closedTotal, setClosedTotal] = useState<number>(0);
  const [closedLoading, setClosedLoading] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [rawStocks, setRawStocks] = useState<any[]>([]);
  const [scanDate, setScanDate] = useState<string>("");

  const [breakouts, setBreakouts] = useState<{ success: any[]; near_breakout: any[] }>({
    success: [],
    near_breakout: []
  });

  // Load snapshot once on mount
  useEffect(() => {
    quantsyncApi.getScreenerBreakouts()
      .then((data) => {
        setBreakouts({
          success: data.success || [],
          near_breakout: data.near_breakout || []
        });
      })
      .catch((e) => console.warn("Could not load screener breakouts", e));

    quantsyncApi.getPatternAccuracy()
      .then((acc) => setPatternAccuracy(acc))
      .catch((e) => console.warn("Could not load pattern accuracy", e));

    quantsyncApi.getMlQualityGates()
      .then((data) => setMlGatesData(data))
      .catch((e) => console.warn("Could not load ML quality gates", e));
  }, []);

  // Fetch Closed Trades dynamically when closed tab is active
  useEffect(() => {
    if (masterTab === "closed") {
      setClosedLoading(true);
      const params: any = { limit: 80 };
      if (globalTf !== "ALL") params.timeframe = globalTf;
      if (closedFilter !== "ALL") params.outcome = closedFilter;
      if (selectedPattern !== "ALL") params.pattern = selectedPattern;

      quantsyncApi.getHistoricalBreakoutRecords(params)
        .then((res) => {
          const raw = res.records || [];
          const sanitized = raw.filter((c: any) => {
            const bars = Number(c.holding_bars || 1);
            const pnl = Math.abs(Number(c.realized_pnl_pct || 0));
            // Sanitize impossible 1-2 day huge gains from legacy test runs
            if (bars <= 2 && pnl > 25) return false;
            return true;
          });
          setClosedRecords(sanitized);
          setClosedTotal(res.count || sanitized.length);
        })
        .catch((e) => console.warn("Could not load closed records", e))
        .finally(() => setClosedLoading(false));
    }
  }, [masterTab, globalTf, closedFilter, selectedPattern]);

  // Initial load: Fetch all confirmed breakouts and radar setups
  useEffect(() => {
    setLoading(true);
    Promise.all([
      quantsyncApi.getScreenerBreakouts().catch(() => ({ success: [], near_breakout: [] })),
      quantsyncApi.getScreenerRows({ limit: 150 }).catch(() => ({ rows: [] }))
    ]).then(([boData, rowsData]: [any, any]) => {
      setBreakouts({
        success: boData?.success || [],
        near_breakout: boData?.near_breakout || []
      });
      if (rowsData?.rows) {
        setRawStocks(rowsData.rows);
      }
      if (boData?.scan_date || rowsData?.scan_date) {
        setScanDate(boData?.scan_date || rowsData?.scan_date || "");
      }
    }).finally(() => setLoading(false));
  }, []);

  // Combined unique breakout pool from all scanner sources
  const allBreakoutStocks = useMemo(() => {
    const list = [...(breakouts.near_breakout || []), ...(breakouts.success || []), ...rawStocks];
    const seen = new Set<string>();
    const deduped: any[] = [];
    list.forEach((s) => {
      const sym = (s.symbol || "").toUpperCase();
      if (sym && !seen.has(sym)) {
        seen.add(sym);
        deduped.push(s);
      }
    });
    return deduped;
  }, [breakouts, rawStocks]);

  // Filter out target-hit stocks & at-risk stocks
  const validStocks = useMemo(() => {
    return allBreakoutStocks.filter((s: any) => {
      const cmp = Number(s.curr_price || 0);
      const tgt = Number(s.target_1 || 0);
      const brk = Number(s.breakout_level || 0);

      if (!brk || brk <= 0) return false;
      if (tgt > 0 && cmp >= tgt) return false;
      if (s.breakout_status === "FAILED") return false;
      if (s.stance === "BEARISH") return false;
      if (s.action && typeof s.action === "string" && s.action.toUpperCase().includes("AVOID")) return false;
      return true;
    });
  }, [allBreakoutStocks]);

  // Auto-subscribe all visible stocks to live WebSocket stream
  useEffect(() => {
    if (validStocks && validStocks.length > 0) {
      const syms = validStocks.map((s) => s.symbol).filter(Boolean);
      liveMarketSocket.subscribe(syms);
    }
  }, [validStocks]);

  // Merge livePrices into validStocks so breakout distances and targets update on the fly!
  const liveEnrichedStocks = useMemo(() => {
    if (!livePrices || Object.keys(livePrices).length === 0) return validStocks;
    return validStocks.map((s) => {
      const sym = (s.symbol || "").toUpperCase();
      const live = livePrices[sym];
      if (live && live.price > 0 && live.price !== s.curr_price) {
        return { ...s, curr_price: live.price };
      }
      return s;
    });
  }, [validStocks, livePrices]);

  // Map of trained ML Quality Gates per pattern archetype
  const mlGatesMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (mlGatesData?.gates) {
      mlGatesData.gates.forEach((g: any) => {
        map[g.pattern_type] = g;
        const clean = g.pattern_type.replace(/_/g, " ").toUpperCase();
        map[clean] = g;
      });
    }
    return map;
  }, [mlGatesData]);

  // ML Quality Gate active by default under the hood (per user instructions):
  // Automatically purges low-edge / negative expectation patterns (Double Bottom, Bull Flag, or survival_verdict === "PURGE")
  const mlFilteredStocks = useMemo(() => {
    return liveEnrichedStocks.filter((s) => {
      const patCode = (s.pattern_type || "").split("·")[0].trim().toUpperCase().replace(/[\s\-&]+/g, "_");
      const gate = mlGatesMap[patCode] || Object.values(mlGatesMap).find((g: any) => patCode.includes(g.pattern_type) || (g.pattern_type && g.pattern_type.includes(patCode)));
      if (gate && (gate.survival_verdict === "PURGE" || gate.post_win_rate < 40)) {
        return false;
      }
      if (patCode === "DOUBLE_BOTTOM" || patCode === "BULL_FLAG") {
        return false;
      }
      return true;
    });
  }, [liveEnrichedStocks, mlGatesMap]);

  // Compute active pattern counts across ML-vetted valid stocks
  const patternCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mlFilteredStocks.forEach((s) => {
      const pid = normalizePatternId(s.pattern_type);
      counts[pid] = (counts[pid] || 0) + 1;
    });
    return counts;
  }, [mlFilteredStocks]);

  // Only show chart patterns that have count > 0!
  const visiblePatterns = useMemo(() => {
    return MASTER_PATTERNS.filter((pat) => {
      if (pat.id === "ALL") return true;
      return (patternCounts[pat.id] || 0) > 0;
    });
  }, [patternCounts]);

  // Dynamic filter by Global Timeframe, Pattern, and Market Cap
  const tfAndPatternFiltered = useMemo(() => {
    let list = mlFilteredStocks;
    if (globalTf !== "ALL") {
      list = list.filter((s) => (s.timeframe || "DAILY").toUpperCase() === globalTf);
    }
    if (selectedPattern !== "ALL") {
      list = list.filter((s) => normalizePatternId(s.pattern_type) === selectedPattern);
    }
    if (mcapFilter !== "ALL") {
      list = list.filter((s) => matchesMcap(s, mcapFilter));
    }
    return list;
  }, [mlFilteredStocks, globalTf, selectedPattern, mcapFilter]);

  // Split into Fresh Opportunities vs Active Runners
  const { freshStocks, runnersStocks, freshCounts } = useMemo(() => {
    const fresh: any[] = [];
    const runners: any[] = [];
    let bzCount = 0;
    let rtCount = 0;
    let radCount = 0;

    tfAndPatternFiltered.forEach((s) => {
      const cls = getBreakoutClassification(s);
      const tf = (s.timeframe || "DAILY").toUpperCase();
      const buyZoneLimit = tf === "MONTHLY" ? 8.0 : tf === "WEEKLY" ? 5.5 : 3.5;

      const isRetest = cls.executionState === "RETEST";
      const isBuyZone = cls.executionState === "BUY_ZONE";
      const isRadar = cls.cmp < cls.brk && cls.diffAbs <= 2.5;
      const isRunner = cls.diffPct > buyZoneLimit && cls.executionState !== "TARGET_ACHIEVED";

      if (isRetest) {
        fresh.push({ ...s, _tradeType: "RETEST" });
        rtCount++;
      } else if (isBuyZone) {
        fresh.push({ ...s, _tradeType: "BUY_ZONE" });
        bzCount++;
      } else if (isRadar) {
        fresh.push({ ...s, _tradeType: "RADAR" });
        radCount++;
      } else if (isRunner) {
        runners.push({ ...s, _tradeType: "RUNNER" });
      }
    });

    // Sort Fresh: RETEST first, then BUY_ZONE (lowest diffPct first), then RADAR (closest to trigger first)
    fresh.sort((a, b) => {
      const typeRank = (t: string) => (t === "RETEST" ? 0 : t === "BUY_ZONE" ? 1 : 2);
      const rA = typeRank(a._tradeType);
      const rB = typeRank(b._tradeType);
      if (rA !== rB) return rA - rB;
      const clsA = getBreakoutClassification(a);
      const clsB = getBreakoutClassification(b);
      return clsA.diffPct - clsB.diffPct;
    });

    // Sort Runners: highest gainers first
    runners.sort((a, b) => {
      const clsA = getBreakoutClassification(a);
      const clsB = getBreakoutClassification(b);
      return clsB.diffPct - clsA.diffPct;
    });

    return {
      freshStocks: fresh,
      runnersStocks: runners,
      freshCounts: { buyZone: bzCount, retest: rtCount, radar: radCount }
    };
  }, [tfAndPatternFiltered]);

  const displayedFreshStocks = useMemo(() => {
    if (freshSubFilter === "BUY_ZONE") {
      return freshStocks.filter((s) => s._tradeType === "BUY_ZONE");
    }
    if (freshSubFilter === "RETEST") {
      return freshStocks.filter((s) => s._tradeType === "RETEST");
    }
    if (freshSubFilter === "RADAR") {
      return freshStocks.filter((s) => s._tradeType === "RADAR");
    }
    return freshStocks;
  }, [freshStocks, freshSubFilter]);

  const filteredClosedRecords = useMemo(() => {
    let list = closedRecords;
    if (closedFilter === "TARGET_HIT") {
      list = list.filter((r) => r.outcome_status === "TARGET_HIT" || r.is_win);
    } else if (closedFilter === "STOPPED_OUT") {
      list = list.filter((r) => r.outcome_status === "STOP_HIT" || !r.is_win);
    }
    return list;
  }, [closedRecords, closedFilter]);

  // Dynamic Market Cap counts
  const mcapCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: 0,
      "Large-Cap": 0,
      "Mid-Cap": 0,
      "Small-Cap": 0,
      "Micro-Cap": 0
    };

    const baseList = masterTab === "fresh" ? freshStocks : masterTab === "runners" ? runnersStocks : [];
    counts.ALL = baseList.length;
    baseList.forEach((s) => {
      const raw = (s.mcap_tier || "").toLowerCase();
      if (raw.includes("large")) counts["Large-Cap"]++;
      else if (raw.includes("mid")) counts["Mid-Cap"]++;
      else if (raw.includes("small")) counts["Small-Cap"]++;
      else if (raw.includes("micro")) counts["Micro-Cap"]++;
    });
    return counts;
  }, [freshStocks, runnersStocks, masterTab]);

  const handleStockClick = (s: any) => {
    const sym = typeof s === "string" ? s : (s?.symbol || "");
    if (onSelectStock) {
      onSelectStock(sym, typeof s === "object" ? s : undefined);
    } else if (typeof window !== "undefined") {
      window.location.href = `/stock-detail.html?symbol=${encodeURIComponent(sym)}`;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // APPLE 3D VISION TILE 1: FRESH OPPORTUNITIES & ACTIVE RUNNERS
  // ─────────────────────────────────────────────────────────────
  const renderStockCard = (s: any, idx: number) => {
    const sym = s.symbol || "";
    const liveItem = livePrices && sym ? livePrices[sym.toUpperCase()] : undefined;
    const currentPrice = liveItem ? liveItem.price : Number(s.curr_price || 0);
    const stockWithLive = liveItem ? { ...s, curr_price: currentPrice } : s;

    const cls = getBreakoutClassification(stockWithLive);
    const score = s.dna_score === undefined || s.dna_score === null ? null : Number(s.dna_score);
    const scoreColor = (score ?? 0) >= 75 ? "var(--apple-green)" : (score ?? 0) >= 50 ? "var(--apple-gold)" : "var(--apple-red)";
    const avatarGrad = AVATAR_GRADS[idx % AVATAR_GRADS.length];

    const isRetest = s._tradeType === "RETEST" || cls.executionState === "RETEST";
    const isRadar = s._tradeType === "RADAR" || (cls.cmp < cls.brk && cls.diffAbs <= 2.5);
    const isRunner = s._tradeType === "RUNNER" || masterTab === "runners";

    const glowClass = isRetest
      ? "retest-glow"
      : isRadar
      ? "radar-glow"
      : isRunner
      ? "runner-glow"
      : "buy-glow";

    let actionBadge = { text: "Near entry", cls: "buy" };
    if (isRetest) {
      actionBadge = { text: "Retest", cls: "retest" };
    } else if (isRadar) {
      actionBadge = { text: "Near pivot", cls: "near" };
    } else if (isRunner) {
      actionBadge = { text: "In progress", cls: "missed" };
    }

    const patClean = (s.pattern_type || "Setup").split("·")[0].trim();
    const patCode = patClean.toUpperCase().replace(/[\s\-&]+/g, "_");
    const tfCode = (s.timeframe || "DAILY").toUpperCase();
    const accKey = `${tfCode}_${patCode}`;
    const acc = patternAccuracy?.matrix?.[accKey] || patternAccuracy?.by_pattern?.[patCode];

    return (
      <article
        key={`${sym}-${idx}`}
        onClick={() => handleStockClick(stockWithLive)}
        className={`apple-3d-card ${glowClass}`}
        role="button"
        tabIndex={0}
        aria-label={`${sym}, ${patClean}, ${actionBadge.text}. Open setup details`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleStockClick(stockWithLive);
          }
        }}
      >
        <div className="sc-card-head sc-stock-head">
          <div className="sc-card-left" style={{ gap: 10 }}>
            <div className="sc-avatar sc-stock-avatar" style={{ background: avatarGrad }}>
              {sym.slice(0, 2) || "ST"}
            </div>
            <div className="sc-card-id-block">
              <div className="sc-sym-row sc-stock-identity">
                <span className="sc-sym">{sym}</span>
                <span className="sc-pill tf-dur">{s.timeframe === "MONTHLY" ? "1M" : s.timeframe === "WEEKLY" ? "1W" : "1D"}</span>
              </div>
              <div className="sc-company-line">{s.company_name || s.sector || "NSE listed equity"}</div>
            </div>
          </div>

          <div className="sc-card-right sc-stock-quote">
            <div className={`sc-cmp ${liveItem ? "live-tick" : ""}`}>
              ₹{Number(currentPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className={`sc-action-badge ${actionBadge.cls}`}>{actionBadge.text}</span>
          </div>
        </div>

        <div className="sc-stock-context">
          <span className="sc-stock-pattern">{patClean}</span>
          {s.mcap_tier && <span className="sc-stock-cap">{s.mcap_tier}</span>}
          {acc && acc.win_rate_pct > 0 && (
            <span className="sc-stock-history" title="Historical win rate for this pattern and timeframe">
              {acc.win_rate_pct}% historical win rate
            </span>
          )}
        </div>

        <div className="sc-levels-panel">
          <div className="apple-metric-col">
            <span className="apple-metric-lbl">Pivot</span>
            <span className="apple-metric-val amber">
              {s.breakout_level ? `₹${Number(s.breakout_level).toFixed(1)}` : "—"}
            </span>
            <small className="apple-level-detail">{cls.diffPct >= 0 ? "+" : ""}{cls.diffPct.toFixed(1)}% from price</small>
          </div>
          <div className="apple-metric-col">
            <span className="apple-metric-lbl">Risk level</span>
            <span className="apple-metric-val red">
              {s.stop_loss ? `₹${Number(s.stop_loss).toFixed(1)}` : "—"}
            </span>
            <small className="apple-level-detail">Stop</small>
          </div>
          <div className="apple-metric-col">
            <span className="apple-metric-lbl">Target</span>
            <span className="apple-metric-val green">
              {s.target_1 ? `₹${Number(s.target_1).toFixed(0)}` : "—"}
            </span>
            <small className="apple-level-detail">{cls.targetGainPct !== null ? `+${cls.targetGainPct.toFixed(0)}% potential` : "Strategy target"}</small>
          </div>
        </div>

        <div className="apple-card-footer">
          <div className="apple-tags-row">
            {s.volume_ratio_20d != null && <span className="apple-pill-badge">Volume {Number(s.volume_ratio_20d).toFixed(1)}×</span>}
            {s.rsi != null && <span className="apple-pill-badge">RSI {Number(s.rsi).toFixed(0)}</span>}
            {score !== null && Number.isFinite(score) && <span className="apple-pill-badge" style={{ color: scoreColor }}>Quality {score}/100</span>}
          </div>

          <div className="apple-inspect-pill">
            <span>View setup</span>
            <span style={{ fontSize: 13 }}>↗</span>
          </div>
        </div>
      </article>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // APPLE 3D VISION TILE 2: CLOSED TRADE AUDIT CARD
  // ─────────────────────────────────────────────────────────────
  const renderClosedCard = (c: any, idx: number) => {
    const sym = c.symbol || "";
    const isWin = c.outcome_status === "TARGET_HIT" || c.is_win;
    const isLoss = c.outcome_status === "STOP_HIT";
    const statusCls = isWin ? "win" : isLoss ? "loss" : "timestop";
    const glowClass = isWin ? "win-glow" : "loss-glow";

    const pnl = Number(c.realized_pnl_pct || 0);
    const pnlStr = `${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`;
    const maxGain = Number(c.max_gain_pct || c.realized_pnl_pct || 0);

    const outcomeText = isWin
      ? `Target hit · ${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`
      : isLoss
      ? `Stop hit · ${pnl.toFixed(1)}%`
      : `Time exit · ${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`;

    const pivot = Number(c.pivot_price || 0);
    const exitPrice = pivot > 0 && pnl !== 0 ? pivot * (1 + pnl / 100) : Number(c.target_price || pivot);
    const avatarGrad = AVATAR_GRADS[idx % AVATAR_GRADS.length];
    const patClean = (c.pattern_name || c.pattern_type || "Setup").split("·")[0].trim();

    return (
      <article
        key={c.id || `${sym}-${idx}`}
        onClick={() => handleStockClick(c)}
        className={`apple-3d-card ${glowClass}`}
        role="button"
        tabIndex={0}
        aria-label={`${sym}, ${patClean}, ${outcomeText}. Inspect trade details`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleStockClick(c);
          }
        }}
      >
        {/* Row 1: Header with Symbol, Timeframe, Pattern & Result Badge */}
        <div className="sc-card-head" style={{ marginBottom: 6 }}>
          <div className="sc-card-left" style={{ gap: 10 }}>
            <div className="sc-avatar" style={{ background: avatarGrad, width: 36, height: 36, borderRadius: 10, fontSize: 13 }}>
              {sym.slice(0, 2) || "ST"}
            </div>
            <div className="sc-card-id-block">
              <div className="sc-sym-row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span className="sc-sym" style={{ fontSize: 16 }}>{sym}</span>
                <span className="sc-pill tf-dur">{c.timeframe === "MONTHLY" ? "1M" : c.timeframe === "WEEKLY" ? "1W" : "1D"}</span>
                <span className="sc-pill pattern">
                  {patClean}
                </span>
              </div>
            </div>
          </div>
          <div className="sc-card-right">
            <div className={`sc-outcome-badge ${statusCls}`}>
              {outcomeText}
            </div>
          </div>
        </div>

        {/* Row 2: Clean Date Timeline Ribbon (Never Truncates!) */}
        <div className="sc-closed-meta">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span>Entry</span> <b>{formatDateStr(c.breakout_date)}</b>
            <span className="sc-closed-arrow">→</span>
            <span>Exit</span> <b>{formatDateStr(c.exit_date)}</b>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span>Held</span> <b>{c.holding_bars || 1} {Number(c.holding_bars || 1) === 1 ? "day" : "days"}</b>
          </span>
        </div>

        <div className="sc-levels-panel sc-closed-levels">
          <div className="apple-metric-col">
            <span className="apple-metric-lbl">ENTRY PIVOT</span>
            <span className="apple-metric-val amber">
              ₹{pivot.toFixed(1)}
            </span>
          </div>
          <div className="apple-metric-col">
            <span className="apple-metric-lbl">EXIT PRICE</span>
            <span className="apple-metric-val">
              ₹{exitPrice.toFixed(1)}
            </span>
          </div>
          <div className="apple-metric-col">
            <span className="apple-metric-lbl">REALIZED P&amp;L</span>
            <span className={`apple-metric-val ${isWin ? "green" : isLoss ? "red" : "amber"}`}>
              {pnlStr}
            </span>
          </div>
          <div className="apple-metric-col">
            <span className="apple-metric-lbl">PEAK RUN</span>
            <span className="apple-metric-val green">
              +{maxGain.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="apple-card-footer">
          <div className="sc-closed-status">
            <b>{c.outcome_status || (isWin ? "TARGET HIT" : isLoss ? "STOP HIT" : "TIME EXIT")}</b> · Historical trade
          </div>
          <div className="apple-inspect-pill">
            <span>Inspect Trade</span>
            <span style={{ fontSize: 13 }}>↗</span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="screener-screen-root" style={{ padding: "14px 14px 44px", width: "100%", maxWidth: "100%", margin: "0" }}>
      {/* ─── 1. REFINED COMPACT HERO BANNER ─── */}
      <div className="sc-hero">
        <div className="sc-hero-badge">
          <span className="sc-live-dot" aria-hidden="true" />
          <span>QUANTSYNC · MARKET SCANNER</span>
        </div>
        <h1 className="sc-hero-title">
          Pattern intelligence
        </h1>
        <p className="sc-hero-sub">
          A clear view of emerging setups, active breakouts, and completed trades across NSE equities.
        </p>
        <div className="sc-hero-meta">
          <span><span className="sc-live-dot" aria-hidden="true" /> {scanDate ? `Last scan ${scanDate}` : "NSE equities"}</span>
          <span className="sc-hero-meta-divider" />
          <span>Prices update live when available</span>
        </div>
      </div>

      {/* ─── 2. CHART TIMEFRAME FILTER ─── */}
      <div className="sc-global-tf-bar">
        <div className="sc-global-tf-left">
          <label className="sc-global-tf-lbl" htmlFor="sc-chart-timeframe">Timeframe for charts</label>
          <select
            id="sc-chart-timeframe"
            className="sc-global-tf-select"
            value={globalTf}
            onChange={(e) => setGlobalTf(e.target.value as any)}
          >
            <option value="ALL">All (Daily, Weekly, Monthly)</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
      </div>

      {/* ─── 3. MASTER 3-TAB LIFECYCLE CONTROLS ─── */}
      <div className="sc-master-tabs">
        <button
          onClick={() => {
            setMasterTab("fresh");
            setSelectedPattern("ALL");
            setMcapFilter("ALL");
            setFreshSubFilter("ALL");
          }}
          className={`sc-master-tab-btn ${masterTab === "fresh" ? "active fresh" : ""}`}
          aria-pressed={masterTab === "fresh"}
        >
          <span className="sc-mt-icon">◉</span>
          <span className="sc-mt-title">Fresh signals</span>
          <span className="sc-mt-badge">{freshStocks.length}</span>
        </button>

        <button
          onClick={() => {
            setMasterTab("runners");
            setSelectedPattern("ALL");
            setMcapFilter("ALL");
          }}
          className={`sc-master-tab-btn ${masterTab === "runners" ? "active runners" : ""}`}
          aria-pressed={masterTab === "runners"}
        >
          <span className="sc-mt-icon">↗</span>
          <span className="sc-mt-title">In progress</span>
          <span className="sc-mt-badge">{runnersStocks.length}</span>
        </button>

        <button
          onClick={() => {
            setMasterTab("closed");
            setSelectedPattern("ALL");
            setMcapFilter("ALL");
            setClosedFilter("ALL");
          }}
          className={`sc-master-tab-btn ${masterTab === "closed" ? "active closed" : ""}`}
          aria-pressed={masterTab === "closed"}
        >
          <span className="sc-mt-icon">◷</span>
          <span className="sc-mt-title">Past trades</span>
          <span className="sc-mt-badge">
            {closedTotal > 0 ? (closedTotal > 999 ? `${(closedTotal / 1000).toFixed(1)}k` : closedTotal) : "—"}
          </span>
        </button>
      </div>

      {/* ─── 4. EXECUTIVE HUD METRIC TILES (PRIMARY INTERACTIVE FILTER) ─── */}
      <div className={`sc-executive-hud ${masterTab === "closed" ? "closed" : ""}`}>
        {masterTab === "fresh" ? (
          <>
            <div
              onClick={() => setFreshSubFilter(freshSubFilter === "BUY_ZONE" ? "ALL" : "BUY_ZONE")}
              className={`sc-hud-tile green selectable ${freshSubFilter === "BUY_ZONE" ? "selected" : ""}`}
              role="button"
              tabIndex={0}
            >
              <div className="sc-hud-lbl">Near entry price</div>
              <div className="sc-hud-val">{freshCounts.buyZone} Setups</div>
              <div className="sc-hud-sub">Price is near the planned entry</div>
            </div>

            <div
              onClick={() => setFreshSubFilter(freshSubFilter === "RETEST" ? "ALL" : "RETEST")}
              className={`sc-hud-tile cyan selectable ${freshSubFilter === "RETEST" ? "selected" : ""}`}
              style={{ borderColor: "rgba(6, 182, 212, 0.3)" }}
              role="button"
              tabIndex={0}
            >
              <div className="sc-hud-lbl">Retesting breakout</div>
              <div className="sc-hud-val" style={{ color: "#22D3EE" }}>{freshCounts.retest} Setups</div>
              <div className="sc-hud-sub">Price has returned to the breakout level</div>
            </div>

            <div
              onClick={() => setFreshSubFilter(freshSubFilter === "RADAR" ? "ALL" : "RADAR")}
              className={`sc-hud-tile indigo selectable ${freshSubFilter === "RADAR" ? "selected" : ""}`}
              role="button"
              tabIndex={0}
            >
              <div className="sc-hud-lbl">Close to breakout</div>
              <div className="sc-hud-val">{freshCounts.radar} Setups</div>
              <div className="sc-hud-sub">Less than 2.5% from breakout</div>
            </div>

            <div
              onClick={() => setFreshSubFilter("ALL")}
              className={`sc-hud-tile gold selectable ${freshSubFilter === "ALL" ? "selected" : ""}`}
              role="button"
              tabIndex={0}
            >
              <div className="sc-hud-lbl">All fresh signals</div>
              <div className="sc-hud-val">{freshStocks.length} Setups</div>
              <div className="sc-hud-sub">Across selected timeframes</div>
            </div>
          </>
        ) : masterTab === "runners" ? (
          <>
            <div className="sc-hud-tile indigo">
              <div className="sc-hud-lbl">⚡ Active breakouts</div>
              <div className="sc-hud-val">{runnersStocks.length} Stocks</div>
              <div className="sc-hud-sub">Breakouts still in progress</div>
            </div>
            <div className="sc-hud-tile green">
              <div className="sc-hud-lbl">📈 Avg Running Gain</div>
              <div className="sc-hud-val">
                +{runnersStocks.length > 0
                  ? (runnersStocks.reduce((acc, s) => acc + getBreakoutClassification(s).diffPct, 0) / runnersStocks.length).toFixed(1)
                  : "0.0"}%
              </div>
              <div className="sc-hud-sub">Average change since entry</div>
            </div>
            <div className="sc-hud-tile gold">
              <div className="sc-hud-lbl">🚀 Leading breakout</div>
              <div className="sc-hud-val">
                {runnersStocks[0] ? `${runnersStocks[0].symbol} (+${getBreakoutClassification(runnersStocks[0]).diffPct.toFixed(0)}%)` : "—"}
              </div>
              <div className="sc-hud-sub">Largest gain since entry</div>
            </div>
            <div className="sc-hud-tile muted">
              <div className="sc-hud-lbl">🛡️ Active setups</div>
              <div className="sc-hud-val">{runnersStocks.length} Stocks</div>
              <div className="sc-hud-sub">Being tracked</div>
            </div>
          </>
        ) : (
          <>
            <div
              onClick={() => setClosedFilter("ALL")}
              className={`sc-hud-tile indigo selectable ${closedFilter === "ALL" ? "selected" : ""}`}
              role="button"
              tabIndex={0}
            >
              <div className="sc-hud-lbl">All past trades</div>
              <div className="sc-hud-val">{closedTotal > 0 ? closedTotal.toLocaleString() : "—"}</div>
              <div className="sc-hud-sub">Historical trade records</div>
            </div>

            <div
              onClick={() => setClosedFilter(closedFilter === "TARGET_HIT" ? "ALL" : "TARGET_HIT")}
              className={`sc-hud-tile green selectable ${closedFilter === "TARGET_HIT" ? "selected" : ""}`}
              role="button"
              tabIndex={0}
            >
              <div className="sc-hud-lbl">Target hits</div>
              <div className="sc-hud-val">{patternAccuracy?.overall_win_rate_pct ? `${patternAccuracy.overall_win_rate_pct}%` : "—"}</div>
              <div className="sc-hud-sub">Historical win rate</div>
            </div>

            <div
              onClick={() => setClosedFilter(closedFilter === "STOPPED_OUT" ? "ALL" : "STOPPED_OUT")}
              className={`sc-hud-tile red selectable ${closedFilter === "STOPPED_OUT" ? "selected" : ""}`}
              role="button"
              tabIndex={0}
            >
              <div className="sc-hud-lbl">Stopped out</div>
              <div className="sc-hud-val" style={{ color: "var(--apple-red)" }}>Review exits</div>
              <div className="sc-hud-sub">View stopped trades</div>
            </div>

          </>
        )}
      </div>

      {/* ─── 5. CHART PATTERN HORIZONTAL SHELF (ACTIVE PATTERNS ONLY) ─── */}
      {visiblePatterns.length > 1 && masterTab !== "closed" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, padding: "0 2px" }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Pattern types ({visiblePatterns.length - 1})
            </span>
            {selectedPattern !== "ALL" && (
              <button
                onClick={() => setSelectedPattern("ALL")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 10.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Reset Pattern Filter
              </button>
            )}
          </div>

          <div className="sc-pattern-hero-grid">
            {visiblePatterns.map((pat) => {
              const isSelected = selectedPattern === pat.id;
              const count = pat.id === "ALL" ? mlFilteredStocks.length : (patternCounts[pat.id] || 0);
              const SvgComp = pat.icon;

              return (
                <button
                  key={pat.id}
                  onClick={() => setSelectedPattern(isSelected && pat.id !== "ALL" ? "ALL" : pat.id)}
                  className={`sc-pattern-card ${isSelected ? "active" : ""}`}
                >
                  <div className="sc-pat-svg-wrap">
                    <SvgComp />
                  </div>
                  <div className="sc-pat-name">{pat.label}</div>
                  <div className="sc-pat-count-badge">
                    {count} {count === 1 ? "setup" : "setups"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 6. MARKET CAP FILTER BAR ─── */}
      {masterTab !== "closed" && (
        <div className="sc-mcap-filter-bar">
          <span className="sc-mcap-label">Market cap</span>
          {MCAP_OPTIONS.map((opt) => {
            const count = mcapCounts[opt.id] ?? 0;
            if (opt.id !== "ALL" && count === 0) return null;
            const isActive = mcapFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setMcapFilter(opt.id)}
                className={`sc-mcap-chip ${isActive ? "active" : ""}`}
              >
                <span>{opt.label}</span>
                <span className="sc-mcap-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── 8. MAIN DISPLAY LIST ─── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink3)" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "2.5px solid var(--line-2)",
              borderTopColor: "var(--accent)",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 10px"
            }}
          />
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Loading signals...</div>
        </div>
      ) : masterTab === "fresh" ? (
        <div>
          {displayedFreshStocks.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🟢</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No fresh signals match these filters</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                Try another pattern or timeframe to see more signals.
              </div>
            </div>
          ) : (
            <div className="apple-3d-perspective-grid">
              {displayedFreshStocks.map((s, idx) => renderStockCard(s, idx))}
            </div>
          )}
        </div>
      ) : masterTab === "runners" ? (
        <div>
          {runnersStocks.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>⚡</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No active breakouts match this timeframe</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                Choose All timeframes to see active breakouts across Daily, Weekly, and Monthly charts.
              </div>
            </div>
          ) : (
            <div className="apple-3d-perspective-grid">
              {runnersStocks.map((s, idx) => renderStockCard(s, idx))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {closedLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink3)" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "2.5px solid var(--line-2)",
                  borderTopColor: "var(--accent)",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 10px"
                }}
              />
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Loading Verified Closed Trades Ledger...</div>
            </div>
          ) : filteredClosedRecords.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>📜</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No Historical Records Matching Filter</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                Switch to "All Closed" or clear pattern filter to view historical trades.
              </div>
            </div>
          ) : (
            <div className="apple-3d-perspective-grid">
              {filteredClosedRecords.map((c, idx) => renderClosedCard(c, idx))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
