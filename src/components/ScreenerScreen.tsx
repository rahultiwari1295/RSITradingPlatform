import React, { useState, useEffect, useCallback, useMemo } from "react";
import { quantsyncApi } from "../api/quantsyncApi";

interface ScreenerScreenProps {
  theme?: "dark" | "light";
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

export function normalizePatternId(rawType?: string): string {
  if (!rawType) return "OTHER";
  const s = rawType.toLowerCase();
  if (s.includes("breakout rally") || s.includes("volume breakout")) return "BREAKOUT_RALLY";
  if (s.includes("double bottom") || s.includes("w-reversal")) return "DOUBLE_BOTTOM";
  if (s.includes("horizontal") || s.includes("rectangle") || s.includes("box")) return "HORIZONTAL_RANGE";
  if (s.includes("pullback") || s.includes("50-day") || s.includes("ema")) return "PULLBACK";
  if (s.includes("volatility") || s.includes("vcp") || s.includes("squeeze")) return "VCP_SQUEEZE";
  if (s.includes("triangle") || s.includes("wedge")) return "TRIANGLE";
  if (s.includes("cup") || s.includes("handle")) return "CUP_HANDLE";
  if (s.includes("head & shoulders") || s.includes("inverse head")) return "INV_HEAD_SHOULDERS";
  return "OTHER";
}

export function getBreakoutClassification(s: any) {
  const cmp = Number(s.curr_price || 0);
  const brk = Number(s.breakout_level || 0);
  const tgt = Number(s.target_1 || 0);
  const hasPivot = brk > 0;
  const diffPct = hasPivot ? ((cmp - brk) / brk) * 100 : 0;
  const diffAbs = Math.abs(diffPct);
  const targetGainPct = (tgt > 0 && cmp > 0) ? ((tgt - cmp) / cmp * 100) : null;

  const isMissed = diffAbs > 5.0;
  const isSkip = !isMissed && targetGainPct !== null && targetGainPct < 5.0;
  const isGoodToBuy = !isMissed && !isSkip;

  let status: "BUY" | "MISSED" | "SKIP" = "BUY";
  if (isMissed) status = "MISSED";
  else if (isSkip) status = "SKIP";

  return {
    hasPivot,
    cmp,
    brk,
    tgt,
    diffPct,
    diffAbs,
    targetGainPct,
    status,
    isGoodToBuy,
    isMissed,
    isSkip
  };
}

// Market Cap Filter Options
const MCAP_OPTIONS = [
  { id: "ALL", label: "All Caps" },
  { id: "Large-Cap", label: "Large Cap" },
  { id: "Mid-Cap", label: "Mid Cap" },
  { id: "Small-Cap", label: "Small Cap" },
  { id: "Micro-Cap", label: "Micro Cap" },
];

function matchesMcap(s: any, filter: string) {
  if (filter === "ALL") return true;
  const raw = (s.mcap_tier || "").toLowerCase();
  if (filter === "Large-Cap") return raw.includes("large");
  if (filter === "Mid-Cap") return raw.includes("mid");
  if (filter === "Small-Cap") return raw.includes("small");
  if (filter === "Micro-Cap") return raw.includes("micro");
  return true;
}

export default function ScreenerScreen({ theme, onSelectStock }: ScreenerScreenProps) {
  // 1. Two-way primary switch: "near_breakout" vs "success" (Confirmed Breakout)
  const [activeTab, setActiveTab] = useState<"near_breakout" | "success">("near_breakout");
  const [selectedPattern, setSelectedPattern] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<"ALL" | "BUY" | "MISSED" | "SKIP">("BUY");
  const [nearFilter, setNearFilter] = useState<"ALL" | "HOT" | "MID" | "FAR">("ALL");
  const [mcapFilter, setMcapFilter] = useState<string>("ALL");
  const [expandedOlder, setExpandedOlder] = useState<boolean>(false);

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
  }, []);

  // Fetch stocks when primary tab changes
  const fetchStocks = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = {
      limit: 150
    };

    if (activeTab === "near_breakout") {
      params.pattern_stage = "NEAR_BREAKOUT";
    } else {
      params.breakout_status = "SUCCESS";
    }

    quantsyncApi.getScreenerRows(params)
      .then((res) => {
        let rows = res.rows || [];
        setRawStocks(rows);
        if (res.scan_date) setScanDate(res.scan_date);
      })
      .catch((err) => {
        console.error("Error fetching screener rows:", err);
        setRawStocks([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Filter out target-hit stocks & at-risk stocks per user requirements:
  // 1. "if any stock already touched the target then it should not needed in pattern page right"
  // 2. "and whats the at risk .. we dont need that page also or dont keep those stocks also which have at risk thing"
  const validStocks = useMemo(() => {
    return rawStocks.filter((s: any) => {
      const cmp = Number(s.curr_price || 0);
      const tgt = Number(s.target_1 || 0);
      const brk = Number(s.breakout_level || 0);

      // Must have valid breakout level
      if (!brk || brk <= 0) return false;

      // Filter out Target Hit stocks: if price already touched or passed target, exclude!
      if (tgt > 0 && cmp >= tgt) return false;

      // Filter out At-Risk / Failed / Bearish / Avoid setups:
      if (s.breakout_status === "FAILED") return false;
      if (s.stance === "BEARISH") return false;
      if (s.action && typeof s.action === "string" && s.action.toUpperCase().includes("AVOID")) return false;
      if (s.dna_score !== undefined && s.dna_score !== null && Number(s.dna_score) < 45) return false;

      // Secondary check for Near Breakout: price must be approaching pivot within 5%
      if (activeTab === "near_breakout") {
        const distPct = (brk - cmp) / brk * 100;
        if (cmp >= brk || distPct > 5.0 || distPct < 0) return false;
      }

      return true;
    });
  }, [rawStocks, activeTab]);

  // Compute active pattern counts across valid stocks
  const patternCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    validStocks.forEach((s) => {
      const pid = normalizePatternId(s.pattern_type);
      counts[pid] = (counts[pid] || 0) + 1;
    });
    return counts;
  }, [validStocks]);

  // Only show chart patterns that have count > 0!
  // "and chart pattern show those list which have the count .. dont show those who have 0 values .."
  const visiblePatterns = useMemo(() => {
    return MASTER_PATTERNS.filter((pat) => {
      if (pat.id === "ALL") return true;
      return (patternCounts[pat.id] || 0) > 0;
    });
  }, [patternCounts]);

  // Filter stocks by selected pattern
  const patternFilteredStocks = useMemo(() => {
    if (selectedPattern === "ALL") return validStocks;
    return validStocks.filter((s) => normalizePatternId(s.pattern_type) === selectedPattern);
  }, [validStocks, selectedPattern]);

  // Action status counts for Confirmed Breakout
  const { buyCount, missedCount, skipCount } = useMemo(() => {
    let b = 0, m = 0, sk = 0;
    if (activeTab === "success") {
      patternFilteredStocks.forEach((s) => {
        const cls = getBreakoutClassification(s);
        if (cls.status === "BUY") b++;
        else if (cls.status === "MISSED") m++;
        else if (cls.status === "SKIP") sk++;
      });
    }
    return { buyCount: b, missedCount: m, skipCount: sk };
  }, [patternFilteredStocks, activeTab]);

  // Dynamic Market Cap counts across filtered set
  const mcapCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: 0,
      "Large-Cap": 0,
      "Mid-Cap": 0,
      "Small-Cap": 0,
      "Micro-Cap": 0
    };

    let baseList = patternFilteredStocks;
    if (activeTab === "success") {
      if (actionFilter !== "ALL") {
        baseList = baseList.filter((s) => getBreakoutClassification(s).status === actionFilter);
      }
    } else {
      if (nearFilter === "HOT") {
        baseList = baseList.filter((s) => ((Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100) < 1.0);
      } else if (nearFilter === "MID") {
        baseList = baseList.filter((s) => {
          const d = (Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100;
          return d >= 1.0 && d < 3.0;
        });
      } else if (nearFilter === "FAR") {
        baseList = baseList.filter((s) => {
          const d = (Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100;
          return d >= 3.0 && d <= 5.0;
        });
      }
    }

    counts.ALL = baseList.length;
    baseList.forEach((s) => {
      const raw = (s.mcap_tier || "").toLowerCase();
      if (raw.includes("large")) counts["Large-Cap"]++;
      else if (raw.includes("mid")) counts["Mid-Cap"]++;
      else if (raw.includes("small")) counts["Small-Cap"]++;
      else if (raw.includes("micro")) counts["Micro-Cap"]++;
    });
    return counts;
  }, [patternFilteredStocks, activeTab, actionFilter, nearFilter]);

  // Timeline grouping for Confirmed Breakout: Latest Day -> Oldest Day within 1 week, and collapsed older section
  const { timelineGroups, olderSetups } = useMemo(() => {
    if (activeTab !== "success") {
      return { timelineGroups: [], olderSetups: [] };
    }

    let list = [...patternFilteredStocks];
    if (actionFilter !== "ALL") {
      list = list.filter((s) => getBreakoutClassification(s).status === actionFilter);
    }
    if (mcapFilter !== "ALL") {
      list = list.filter((s) => matchesMcap(s, mcapFilter));
    }

    const base = scanDate ? new Date(scanDate) : new Date();
    const dateMap = new Map<string, { label: string; daysAgo: number; stocks: any[] }>();
    const older: any[] = [];

    list.forEach((s) => {
      const daysAgo = s.days_since_breakout !== null && s.days_since_breakout !== undefined
        ? Number(s.days_since_breakout)
        : 0;

      if (daysAgo > 7) {
        older.push(s);
      } else {
        const d = new Date(base);
        d.setDate(d.getDate() - daysAgo);
        const dateKey = d.toISOString().split("T")[0];

        let label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        if (daysAgo === 0) label = `Today · ${label}`;
        else if (daysAgo === 1) label = `Yesterday · ${label}`;
        else label = `${label} (${daysAgo}d ago)`;

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { label, daysAgo, stocks: [] });
        }
        dateMap.get(dateKey)!.stocks.push(s);
      }
    });

    // Sort order within each date: BUY (tier 0) -> MISSED (tier 1) -> SKIP (tier 2), then diffPct
    const sortFn = (a: any, b: any) => {
      const clsA = getBreakoutClassification(a);
      const clsB = getBreakoutClassification(b);
      const tierA = clsA.isGoodToBuy ? 0 : clsA.isMissed ? 1 : 2;
      const tierB = clsB.isGoodToBuy ? 0 : clsB.isMissed ? 1 : 2;
      if (tierA !== tierB) return tierA - tierB;
      return clsA.diffPct - clsB.diffPct;
    };

    const timelineGroups = Array.from(dateMap.entries())
      .map(([dateKey, val]) => ({
        dateKey,
        label: val.label,
        daysAgo: val.daysAgo,
        stocks: val.stocks.sort(sortFn)
      }))
      .filter((g) => g.stocks.length > 0)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    older.sort(sortFn);

    return { timelineGroups, olderSetups: older };
  }, [patternFilteredStocks, activeTab, actionFilter, scanDate, mcapFilter]);

  // Near Breakout Filtered List
  const nearBreakoutFiltered = useMemo(() => {
    if (activeTab !== "near_breakout") return [];
    let list = [...patternFilteredStocks];

    if (nearFilter === "HOT") {
      list = list.filter((s) => ((Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100) < 1.0);
    } else if (nearFilter === "MID") {
      list = list.filter((s) => {
        const d = (Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100;
        return d >= 1.0 && d < 3.0;
      });
    } else if (nearFilter === "FAR") {
      list = list.filter((s) => {
        const d = (Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100;
        return d >= 3.0 && d <= 5.0;
      });
    }

    if (mcapFilter !== "ALL") {
      list = list.filter((s) => matchesMcap(s, mcapFilter));
    }

    // Sort closest to pivot trigger first
    list.sort((a: any, b: any) => {
      const distA = (Number(a.breakout_level) - Number(a.curr_price)) / Number(a.breakout_level);
      const distB = (Number(b.breakout_level) - Number(b.curr_price)) / Number(b.breakout_level);
      return distA - distB;
    });

    return list;
  }, [patternFilteredStocks, activeTab, nearFilter, mcapFilter]);

  const handleStockClick = (s: any) => {
    const sym = typeof s === "string" ? s : (s?.symbol || "");
    if (onSelectStock) {
      onSelectStock(sym, typeof s === "object" ? s : undefined);
    } else if (typeof window !== "undefined") {
      window.location.href = `/stock-detail.html?symbol=${encodeURIComponent(sym)}`;
    }
  };

  const renderStockCard = (s: any, idx: number) => {
    const cls = getBreakoutClassification(s);
    const score = s.dna_score || 50;
    const scoreColor = score >= 75 ? "var(--profit)" : score >= 50 ? "#F59E0B" : "var(--loss)";
    const avatarGrad = AVATAR_GRADS[idx % AVATAR_GRADS.length];
    const sym = s.symbol || "";

    const borderCls = activeTab === "success"
      ? (cls.isGoodToBuy ? "border-buy" : cls.isMissed ? "border-missed" : "border-skip")
      : "border-near";

    return (
      <div
        key={sym || idx}
        onClick={() => handleStockClick(s)}
        className={`sc-card ${borderCls}`}
      >
        {/* Top Row: Monogram, Symbol, Pattern Pill, Price, DNA Score */}
        <div className="sc-card-head">
          <div className="sc-card-left">
            <div className="sc-avatar" style={{ background: avatarGrad }}>
              {sym.slice(0, 2) || "ST"}
            </div>
            <div className="sc-card-id-block">
              <div className="sc-sym-row">
                <span className="sc-sym">{sym}</span>
                {s.pattern_type && (
                  <span className="sc-pill pattern">
                    📐 {s.pattern_type.split("·")[0].trim()}
                  </span>
                )}
                {s.mcap_tier && (
                  <span className="sc-pill mcap">{s.mcap_tier}</span>
                )}
              </div>
              <div className="sc-subline">
                {s.company_name || s.sector || "NSE Equity"}
              </div>
            </div>
          </div>

          <div className="sc-card-right">
            <div className="sc-cmp">
              ₹{Number(s.curr_price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="sc-dna-badge" style={{ color: scoreColor }}>
              DNA {score}/100
            </div>
          </div>
        </div>

        {/* Precision Action Strip Banner */}
        {activeTab === "success" && cls.hasPivot && (
          <>
            {cls.isGoodToBuy && (
              <div className="sc-action-banner buy">
                <div className="sc-banner-left">
                  <span className="sc-banner-tag buy">🟢 BUY ZONE</span>
                  <span className="sc-banner-desc">
                    <b className="num">{cls.diffPct >= 0 ? `+${cls.diffPct.toFixed(1)}%` : `${cls.diffPct.toFixed(1)}%`}</b> from Breakout (<b className="num">₹{cls.brk.toFixed(1)}</b>)
                  </span>
                </div>
                {cls.targetGainPct !== null && (
                  <div className="sc-banner-right">
                    <span className="sc-target-badge">
                      Target <b className="num">₹{cls.tgt.toFixed(0)}</b> (<b className="num">+{cls.targetGainPct.toFixed(1)}%</b>)
                    </span>
                  </div>
                )}
              </div>
            )}
            {cls.isMissed && (
              <div className="sc-action-banner missed">
                <div className="sc-banner-left">
                  <span className="sc-banner-tag missed">🛑 EXTENDED</span>
                  <span className="sc-banner-desc">
                    <b className="num">+{cls.diffAbs.toFixed(1)}%</b> past Breakout (<b className="num">₹{cls.brk.toFixed(1)}</b>)
                  </span>
                </div>
                <div className="sc-banner-right">
                  <span className="sc-dist-badge">High Chase Risk</span>
                </div>
              </div>
            )}
            {cls.isSkip && (
              <div className="sc-action-banner skip">
                <div className="sc-banner-left">
                  <span className="sc-banner-tag skip">⏭️ SKIP</span>
                  <span className="sc-banner-desc">
                    Low upside left (<b className="num">{cls.targetGainPct !== null ? `+${cls.targetGainPct.toFixed(1)}%` : "0%"}</b> to Target)
                  </span>
                </div>
                <div className="sc-banner-right">
                  <span className="sc-dist-badge">Poor R:R</span>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "near_breakout" && cls.hasPivot && (
          <div className="sc-action-banner near">
            <div className="sc-banner-left">
              <span className="sc-banner-tag near">⚡ PIVOT</span>
              <span className="sc-banner-desc">
                Trigger: <b className="num">₹{cls.brk.toFixed(1)}</b>
              </span>
            </div>
            <div className="sc-banner-right">
              <span className={`sc-dist-badge ${cls.diffAbs < 1.0 ? "hot" : ""}`}>
                {cls.diffAbs < 1.0 ? "🔥" : "⏳"} <b className="num">{cls.diffAbs.toFixed(2)}%</b> to Trigger
              </span>
            </div>
          </div>
        )}

        {/* 4-Column Key Metrics Grid */}
        <div className="sc-metrics-grid">
          <div className="sc-m-cell">
            <span className="sc-m-lbl">Breakout</span>
            <span className="sc-m-val">{s.breakout_level ? `₹${Number(s.breakout_level).toFixed(1)}` : "—"}</span>
          </div>
          <div className="sc-m-cell">
            <span className="sc-m-lbl">RSI (14)</span>
            <span className="sc-m-val" style={{ color: s.rsi > 70 ? "var(--loss)" : s.rsi < 35 ? "var(--profit)" : "var(--ink1)" }}>
              {s.rsi !== null && s.rsi !== undefined ? Number(s.rsi).toFixed(1) : "—"}
            </span>
          </div>
          <div className="sc-m-cell">
            <span className="sc-m-lbl">ROCE</span>
            <span className="sc-m-val">{s.roce_pct !== null && s.roce_pct !== undefined ? `${Number(s.roce_pct).toFixed(1)}%` : "—"}</span>
          </div>
          <div className="sc-m-cell">
            <span className="sc-m-lbl">P/E</span>
            <span className="sc-m-val">{s.pe_ratio !== null && s.pe_ratio !== undefined ? Number(s.pe_ratio).toFixed(1) : "—"}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="screener-screen-root" style={{ padding: "8px 6px 36px", width: "100%", maxWidth: "100%", margin: "0" }}>
      {/* ─── 1. REFINED COMPACT HERO BANNER ─── */}
      <div className="sc-hero">
        <div className="sc-hero-badge">
          <span>⚡</span>
          <span>QuantSync Screener</span>
        </div>
        <h1 className="sc-hero-title">
          Pattern & Breakout Intelligence
        </h1>
        <p className="sc-hero-sub">
          Verified institutional chart pattern setups across NSE equities · Updated {scanDate || "Daily"}
        </p>
      </div>

      {/* ─── 2. PRIMARY 2-WAY SWITCH BUTTON (NEAR BREAKOUT vs CONFIRMED BREAKOUT) ─── */}
      <div className="sc-segment-switch">
        <button
          onClick={() => {
            setActiveTab("near_breakout");
            setSelectedPattern("ALL");
            setMcapFilter("ALL");
          }}
          className={`sc-segment-btn ${activeTab === "near_breakout" ? "active near" : ""}`}
        >
          <span className="sc-seg-icon">🎯</span>
          <span className="sc-seg-label">Near Breakout</span>
          <span className="sc-seg-badge">
            {breakouts.near_breakout.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("success");
            setSelectedPattern("ALL");
            setActionFilter("BUY");
            setMcapFilter("ALL");
          }}
          className={`sc-segment-btn ${activeTab === "success" ? "active success" : ""}`}
        >
          <span className="sc-seg-icon">🚀</span>
          <span className="sc-seg-label">Confirmed Breakout</span>
          <span className="sc-seg-badge">
            {breakouts.success.length}
          </span>
        </button>
      </div>

      {/* ─── 3. CHART PATTERN HERO GRID (3 BUTTONS PER ROW WITH CANDLESTICK SVG VISUALS) ─── */}
      {visiblePatterns.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, padding: "0 2px" }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Explore Chart Patterns ({visiblePatterns.length - 1} Active)
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
              const count = pat.id === "ALL" ? validStocks.length : (patternCounts[pat.id] || 0);
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
                    {count} {count === 1 ? "call" : "calls"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. ACTION STATUS FILTER BAR (BUY / MISSED / SKIP) ─── */}
      {activeTab === "success" && (
        <div className="sc-action-filter-bar">
          <button
            onClick={() => setActionFilter("BUY")}
            className={`sc-filter-chip buy ${actionFilter === "BUY" ? "active" : ""}`}
          >
            🟢 Good to Buy ({buyCount})
          </button>
          <button
            onClick={() => setActionFilter("ALL")}
            className={`sc-filter-chip all ${actionFilter === "ALL" ? "active" : ""}`}
          >
            All Breakouts ({patternFilteredStocks.length})
          </button>
          <button
            onClick={() => setActionFilter("MISSED")}
            className={`sc-filter-chip missed ${actionFilter === "MISSED" ? "active" : ""}`}
          >
            🛑 Missed ({missedCount})
          </button>
          <button
            onClick={() => setActionFilter("SKIP")}
            className={`sc-filter-chip skip ${actionFilter === "SKIP" ? "active" : ""}`}
          >
            ⏭️ Skip ({skipCount})
          </button>
        </div>
      )}

      {/* Proximity Filter for Near Breakout */}
      {activeTab === "near_breakout" && (
        <div className="sc-action-filter-bar">
          <button
            onClick={() => setNearFilter("ALL")}
            className={`sc-filter-chip all ${nearFilter === "ALL" ? "active" : ""}`}
          >
            All Radar ({patternFilteredStocks.length})
          </button>
          <button
            onClick={() => setNearFilter("HOT")}
            className={`sc-filter-chip buy ${nearFilter === "HOT" ? "active" : ""}`}
          >
            🎯 &lt; 1% to Trigger
          </button>
          <button
            onClick={() => setNearFilter("MID")}
            className={`sc-filter-chip skip ${nearFilter === "MID" ? "active" : ""}`}
          >
            ⚡ 1% – 3% Trigger
          </button>
          <button
            onClick={() => setNearFilter("FAR")}
            className={`sc-filter-chip missed ${nearFilter === "FAR" ? "active" : ""}`}
          >
            📏 3% – 5% Trigger
          </button>
        </div>
      )}

      {/* ─── 4B. MARKET CAP FILTER BAR (Large-Cap, Mid-Cap, Small-Cap, Micro-Cap) ─── */}
      <div className="sc-mcap-filter-bar">
        <span className="sc-mcap-label">CAP:</span>
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

      {/* ─── 5. TIMELINE STOCK LIST ─── */}
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
          <div style={{ fontSize: 11.5, fontWeight: 600 }}>Filtering Pattern Setups...</div>
        </div>
      ) : activeTab === "success" ? (
        /* ─── BREAKOUT CONFIRMED TIMELINE VIEW ─── */
        <div>
          {timelineGroups.length === 0 && olderSetups.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No Matching Breakouts Found</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                Try selecting "All Setups" or clearing the pattern filter.
              </div>
            </div>
          ) : (
            <>
              {/* Daily Timeline Groups (within 1 week, latest day first) */}
              {timelineGroups.map((group) => (
                <div key={group.dateKey} style={{ marginBottom: 12 }}>
                  <div className="sc-timeline-header">
                    <div className="sc-timeline-title">
                      <span className="sc-timeline-dot" />
                      <span>{group.label}</span>
                    </div>
                    <span className="sc-timeline-badge">
                      {group.stocks.length} setup{group.stocks.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {group.stocks.map((s, idx) => renderStockCard(s, idx))}
                  </div>
                </div>
              ))}

              {/* 1 Week Ago & Older Collapsible Section */}
              {olderSetups.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="sc-older-toggle"
                    onClick={() => setExpandedOlder((prev) => !prev)}
                  >
                    <span>📅 1 Week Ago & Older ({olderSetups.length} Setups)</span>
                    <span style={{ fontSize: 11, color: "var(--accent)" }}>
                      {expandedOlder ? "Collapse ▴" : "Show All ▾"}
                    </span>
                  </button>

                  {expandedOlder && (
                    <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
                      {olderSetups.map((s, idx) => renderStockCard(s, idx + 100))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ─── NEAR BREAKOUT PROXIMITY VIEW ─── */
        <div>
          {nearBreakoutFiltered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🎯</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No Setups In Selected Trigger Zone</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                Try switching to "All Radar" to see all stocks approaching breakout.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {nearBreakoutFiltered.map((s, idx) => renderStockCard(s, idx))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
