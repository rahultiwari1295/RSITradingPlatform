import React, { useState, useEffect, useCallback, useMemo } from "react";
import { quantsyncApi } from "../api/quantsyncApi";

interface ScreenerScreenProps {
  theme?: "dark" | "light";
  onSelectStock?: (symbol: string, stockData?: any) => void;
}

const PATTERN_CATEGORIES = [
  { id: "ALL", label: "All Setups", icon: "✨" },
  { id: "Breakout Rally", label: "Breakout Rally", icon: "🚀" },
  { id: "Double Bottom", label: "Double Bottom (W)", icon: "🇼" },
  { id: "Horizontal Range", label: "Horizontal Base", icon: "📏" },
  { id: "Orderly Pullback", label: "50-EMA Dip", icon: "📉" },
  { id: "Volatility Contraction", label: "VCP Squeeze", icon: "🌪️" },
  { id: "Triangle", label: "Triangle / Wedge", icon: "📐" },
];

const AVATAR_GRADS = [
  "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
  "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
  "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
];

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

export default function ScreenerScreen({ theme, onSelectStock }: ScreenerScreenProps) {
  const [activeTab, setActiveTab] = useState<"near_breakout" | "success" | "retest" | "failed">("near_breakout");
  const [selectedPattern, setSelectedPattern] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "BUY" | "MISSED" | "SKIP">("ALL");
  const [nearFilter, setNearFilter] = useState<"ALL" | "HOT" | "MID" | "FAR">("ALL");
  const [expandedOlder, setExpandedOlder] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [stocks, setStocks] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [scanDate, setScanDate] = useState<string>("");

  const [breakouts, setBreakouts] = useState<{ success: any[]; near_breakout: any[]; retest?: any[]; failed?: any[] }>({
    success: [],
    near_breakout: [],
    retest: [],
    failed: []
  });

  // Load breakouts snapshot once on mount
  useEffect(() => {
    quantsyncApi.getScreenerBreakouts()
      .then((data) => {
        setBreakouts({
          success: data.success || [],
          near_breakout: data.near_breakout || [],
          failed: data.failed || []
        });
      })
      .catch((e) => console.warn("Could not load screener breakouts", e));
  }, []);

  // Fetch stocks when primary tab, pattern, or search changes
  const fetchStocks = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = {
      limit: 150
    };

    if (activeTab === "near_breakout") {
      params.pattern_stage = "NEAR_BREAKOUT";
    } else if (activeTab === "success") {
      params.breakout_status = "SUCCESS";
    } else if (activeTab === "retest") {
      params.setup = "breakout_retest";
    } else if (activeTab === "failed") {
      params.breakout_status = "FAILED";
    }

    if (selectedPattern !== "ALL") {
      params.pattern_type = selectedPattern;
    }

    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    quantsyncApi.getScreenerRows(params)
      .then((res) => {
        let rows = res.rows || [];
        if (activeTab === "success") {
          rows = rows.filter((s: any) => s.breakout_level && Number(s.breakout_level) > 0);
        } else if (activeTab === "near_breakout") {
          rows = rows.filter((s: any) => {
            const hasPivot = s.breakout_level && Number(s.breakout_level) > 0;
            if (!hasPivot) return false;
            const distPct = (Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100;
            return Number(s.curr_price) < Number(s.breakout_level) && distPct <= 5.0 && distPct >= 0;
          });
          // Sort closest to pivot first
          rows.sort((a: any, b: any) => {
            const distA = (Number(a.breakout_level) - Number(a.curr_price)) / Number(a.breakout_level);
            const distB = (Number(b.breakout_level) - Number(b.curr_price)) / Number(b.breakout_level);
            return distA - distB;
          });
        }

        setStocks(rows);
        setTotalCount(res.total || rows.length);
        if (res.scan_date) setScanDate(res.scan_date);
      })
      .catch((err) => {
        console.error("Error fetching screener rows:", err);
        setStocks([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, selectedPattern, searchQuery]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Action counts for Breakout Confirmed tab (Buy, Missed, Skip)
  const { buyCount, missedCount, skipCount } = useMemo(() => {
    let b = 0, m = 0, sk = 0;
    if (activeTab === "success") {
      stocks.forEach((s) => {
        const cls = getBreakoutClassification(s);
        if (cls.status === "BUY") b++;
        else if (cls.status === "MISSED") m++;
        else if (cls.status === "SKIP") sk++;
      });
    }
    return { buyCount: b, missedCount: m, skipCount: sk };
  }, [stocks, activeTab]);

  // Timeline grouping for Breakout Confirmed tab (Latest Date to Oldest Date)
  const { timelineGroups, olderSetups } = useMemo(() => {
    if (activeTab !== "success") {
      return { timelineGroups: [], olderSetups: [] };
    }

    let list = [...stocks];
    if (actionFilter !== "ALL") {
      list = list.filter((s) => getBreakoutClassification(s).status === actionFilter);
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

    // Sort inside each date group: BUY (tier 0) -> MISSED (tier 1) -> SKIP (tier 2), then diffPct
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
  }, [stocks, activeTab, actionFilter, scanDate]);

  // Filtered list for Near Breakout
  const nearBreakoutFiltered = useMemo(() => {
    if (activeTab !== "near_breakout") return [];
    if (nearFilter === "ALL") return stocks;
    return stocks.filter((s) => {
      const distPct = (Number(s.breakout_level) - Number(s.curr_price)) / Number(s.breakout_level) * 100;
      if (nearFilter === "HOT") return distPct < 1.0;
      if (nearFilter === "MID") return distPct >= 1.0 && distPct < 3.0;
      if (nearFilter === "FAR") return distPct >= 3.0 && distPct <= 5.0;
      return true;
    });
  }, [stocks, activeTab, nearFilter]);

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

    // Card border indicator class
    let borderCls = "";
    if (activeTab === "success") {
      borderCls = cls.isGoodToBuy ? "border-buy" : cls.isMissed ? "border-missed" : "border-skip";
    } else if (activeTab === "near_breakout") {
      borderCls = "border-near";
    } else if (activeTab === "failed") {
      borderCls = "border-missed";
    }

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
                    📐 {s.pattern_type}
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

        {/* Action Strip Banner */}
        {activeTab === "success" && cls.hasPivot && (
          <>
            {cls.isGoodToBuy && (
              <div className="sc-action-banner buy">
                <span>🟢 Good to Buy: {cls.diffPct >= 0 ? `+${cls.diffPct.toFixed(1)}%` : `${cls.diffPct.toFixed(1)}%`} from Breakout (₹{cls.brk.toFixed(1)})</span>
                {cls.targetGainPct !== null && (
                  <span style={{ opacity: 0.9 }}>Target ₹{cls.tgt.toFixed(0)} (+{cls.targetGainPct.toFixed(1)}%)</span>
                )}
              </div>
            )}
            {cls.isMissed && (
              <div className="sc-action-banner missed">
                <span>🛑 Missed: +{cls.diffAbs.toFixed(1)}% extended past Breakout (₹{cls.brk.toFixed(1)})</span>
                <span style={{ opacity: 0.85 }}>High Chase Risk</span>
              </div>
            )}
            {cls.isSkip && (
              <div className="sc-action-banner skip">
                <span>⏭️ Skip: Low upside left ({cls.targetGainPct !== null ? `+${cls.targetGainPct.toFixed(1)}%` : "0%"} to Target)</span>
                <span style={{ opacity: 0.85 }}>Poor R:R</span>
              </div>
            )}
          </>
        )}

        {activeTab === "near_breakout" && cls.hasPivot && (
          <div className="sc-action-banner near">
            <span>🎯 Ready to Buy at ₹{cls.brk.toFixed(1)}</span>
            <span>(just {cls.diffAbs.toFixed(2)}% left for confirmation)</span>
          </div>
        )}

        {activeTab === "retest" && (
          <div className="sc-action-banner near">
            <span>🔄 Pivot Retest Zone: Holding breakout level at ₹{cls.brk.toFixed(1)}</span>
          </div>
        )}

        {activeTab === "failed" && (
          <div className="sc-action-banner missed">
            <span>⚠️ At Risk / Breakdown: Capital Protection Advised</span>
          </div>
        )}

        {/* 4-Column Key Metrics Row */}
        <div className="sc-metrics-row">
          <div className="sc-m-col">
            <span className="sc-m-lbl">Breakout</span>
            <span className="sc-m-val">{s.breakout_level ? `₹${Number(s.breakout_level).toFixed(1)}` : "—"}</span>
          </div>
          <div className="sc-m-col">
            <span className="sc-m-lbl">RSI (14)</span>
            <span className="sc-m-val" style={{ color: s.rsi > 70 ? "var(--loss)" : s.rsi < 35 ? "var(--profit)" : "var(--ink1)" }}>
              {s.rsi !== null && s.rsi !== undefined ? Number(s.rsi).toFixed(1) : "—"}
            </span>
          </div>
          <div className="sc-m-col">
            <span className="sc-m-lbl">ROCE</span>
            <span className="sc-m-val">{s.roce_pct !== null && s.roce_pct !== undefined ? `${Number(s.roce_pct).toFixed(1)}%` : "—"}</span>
          </div>
          <div className="sc-m-col">
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
          Institutional chart pattern setups across NSE equities · Updated {scanDate || "Daily"}
        </p>
      </div>

      {/* ─── 2. PRIMARY SCREENER TABS ─── */}
      <div className="sc-tabs-bar">
        <button
          onClick={() => setActiveTab("near_breakout")}
          className={`sc-tab-btn near ${activeTab === "near_breakout" ? "active" : ""}`}
        >
          <span>🎯 Near Breakout</span>
          <span className="sc-tab-count">
            {breakouts.near_breakout.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("success")}
          className={`sc-tab-btn success ${activeTab === "success" ? "active" : ""}`}
        >
          <span>🚀 Breakout Confirmed</span>
          <span className="sc-tab-count">
            {breakouts.success.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("retest")}
          className={`sc-tab-btn retest ${activeTab === "retest" ? "active" : ""}`}
        >
          <span>🔄 Pivot Retest</span>
          <span className="sc-tab-count">
            {(breakouts.retest || []).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("failed")}
          className={`sc-tab-btn failed ${activeTab === "failed" ? "active" : ""}`}
        >
          <span>⚠️ At Risk</span>
          <span className="sc-tab-count">
            {(breakouts.failed || []).length}
          </span>
        </button>
      </div>

      {/* ─── 3. ACTION STATUS FILTER BAR (BUY / MISSED / SKIP) ─── */}
      {activeTab === "success" && (
        <div className="sc-action-filter-bar">
          <button
            onClick={() => setActionFilter("ALL")}
            className={`sc-filter-chip all ${actionFilter === "ALL" ? "active" : ""}`}
          >
            All Setups ({stocks.length})
          </button>
          <button
            onClick={() => setActionFilter("BUY")}
            className={`sc-filter-chip buy ${actionFilter === "BUY" ? "active" : ""}`}
          >
            🟢 Good to Buy ({buyCount})
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
            All Radar ({stocks.length})
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

      {/* ─── 4. SEARCH & PATTERN BASE CHIPS ─── */}
      <div
        className="card"
        style={{
          padding: "10px 12px",
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10
        }}
      >
        {/* Search input */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search stock ticker or pattern..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px 8px 34px",
              borderRadius: 9,
              border: "1px solid var(--line-2)",
              background: "var(--s2)",
              color: "var(--ink1)",
              fontSize: 12,
              outline: "none"
            }}
          />
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: 13 }}>
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--ink3)",
                cursor: "pointer",
                padding: "2px 6px"
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Pattern Explorer Base Chips */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Explore Chart Patterns & Bases
            </span>
            {selectedPattern !== "ALL" && (
              <button
                onClick={() => setSelectedPattern("ALL")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Clear Filter
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 5,
              overflowX: "auto",
              paddingBottom: 2,
              scrollbarWidth: "none"
            }}
          >
            {PATTERN_CATEGORIES.map((cat) => {
              const isSelected = selectedPattern === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedPattern(cat.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: isSelected ? "var(--accent)" : "var(--line-2)",
                    background: isSelected ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--s2)",
                    color: isSelected ? "var(--ink1)" : "var(--ink3)",
                    fontSize: 11,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{ fontSize: 12 }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
                Try selecting "All Setups" or clearing the status filter.
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
      ) : activeTab === "near_breakout" ? (
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
      ) : (
        /* ─── OTHER TABS (RETEST, FAILED) ─── */
        <div>
          {stocks.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No Setups Found</div>
              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                No active signals under this filter.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {stocks.map((s, idx) => renderStockCard(s, idx))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
