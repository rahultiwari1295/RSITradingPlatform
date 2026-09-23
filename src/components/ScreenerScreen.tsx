import React, { useState, useEffect, useCallback } from "react";
import { quantsyncApi } from "../api/quantsyncApi";

interface ScreenerScreenProps {
  theme?: "dark" | "light";
  onSelectStock?: (symbol: string) => void;
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

export default function ScreenerScreen({ theme, onSelectStock }: ScreenerScreenProps) {
  const [activeTab, setActiveTab] = useState<"near_breakout" | "success" | "failed">("near_breakout");
  const [selectedPattern, setSelectedPattern] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [stocks, setStocks] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [scanDate, setScanDate] = useState<string>("");

  const [breakouts, setBreakouts] = useState<{ success: any[]; near_breakout: any[]; failed: any[] }>({
    success: [],
    near_breakout: [],
    failed: []
  });
  const [summary, setSummary] = useState<any>(null);
  const [accuracy, setAccuracy] = useState<any>(null);

  // Load summary and accuracy once on mount
  useEffect(() => {
    quantsyncApi.getScreenerSummary()
      .then((data) => setSummary(data))
      .catch((e) => console.warn("Could not load screener summary", e));

    quantsyncApi.getScreenerAccuracy(90)
      .then((data) => setAccuracy(data))
      .catch((e) => console.warn("Could not load screener accuracy", e));

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

  // Fetch stocks when filters change
  const fetchStocks = useCallback(() => {
    setLoading(true);
    const params: Record<string, any> = {
      limit: 100
    };

    if (activeTab === "near_breakout") {
      params.pattern_stage = "NEAR_BREAKOUT";
    } else if (activeTab === "success") {
      params.breakout_status = "SUCCESS";
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
        // Secondary client-side guard for strict actionable entry rules
        if (activeTab === "success") {
          rows = rows.filter((s: any) => {
            const hasPivot = s.breakout_level && Number(s.breakout_level) > 0;
            const diffPct = hasPivot ? Math.abs((Number(s.curr_price) - Number(s.breakout_level)) / Number(s.breakout_level) * 100) : 999;
            const freshDays = s.days_since_breakout !== null && s.days_since_breakout !== undefined && Number(s.days_since_breakout) < 6;
            return diffPct <= 5.0 || freshDays;
          });
          // Sort latest to oldest breakout (0 days first)
          rows.sort((a: any, b: any) => {
            const da = a.days_since_breakout !== null && a.days_since_breakout !== undefined ? Number(a.days_since_breakout) : 999;
            const db = b.days_since_breakout !== null && b.days_since_breakout !== undefined ? Number(b.days_since_breakout) : 999;
            return da - db;
          });
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

  const handleStockClick = (sym: string) => {
    if (onSelectStock) {
      onSelectStock(sym);
    } else if (typeof window !== "undefined") {
      window.location.href = `/stock-detail.html?symbol=${encodeURIComponent(sym)}`;
    }
  };

  return (
    <div className="screener-screen-root" style={{ padding: "12px 6px 36px", width: "100%", maxWidth: "100%", margin: "0" }}>
      {/* ─── HEADER HERO BANNER ─── */}
      <div
        className="card"
        style={{
          padding: "18px 16px",
          marginBottom: 14,
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.06)), var(--s1)",
          borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
          position: "relative"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", marginBottom: 8 }}>
              <span style={{ fontSize: 11 }}>⚡</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent)" }}>
                QuantSync Institutional Screener
              </span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px 0", letterSpacing: "-0.02em", color: "var(--ink1)" }}>
              Pattern & Breakout Intelligence
            </h1>
            <p style={{ fontSize: 11.5, color: "var(--ink3)", margin: 0 }}>
              Scanned across 1,318 NSE universe equities · Updated {scanDate || "Daily 3:00 AM"}
            </p>
          </div>

          {/* Accuracy Proof Badge */}
          {accuracy && accuracy.win_rate_pct > 0 && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 14,
                background: "linear-gradient(180deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))",
                border: "1px solid rgba(16,185,129,0.3)",
                textAlign: "right"
              }}
            >
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--profit)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Audited 90D Win Rate
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--profit)", fontFamily: "var(--font-mono, monospace)" }}>
                {accuracy.win_rate_pct}%
              </div>
              <div style={{ fontSize: 9.5, color: "var(--ink3)" }}>
                {accuracy.winners} of {accuracy.total_resolved_signals} signals verified
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── PRIMARY TABS (Near Breakout / Success / Failed) ─── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 12,
          scrollbarWidth: "none"
        }}
      >
        <button
          onClick={() => setActiveTab("near_breakout")}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid",
            borderColor: activeTab === "near_breakout" ? "#F59E0B" : "var(--line-2)",
            background: activeTab === "near_breakout" ? "rgba(245,158,11,0.18)" : "var(--s2)",
            color: activeTab === "near_breakout" ? "#F59E0B" : "var(--ink3)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap"
          }}
        >
          <span>🎯 Near Breakout</span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(245,158,11,0.2)" }}>
            {breakouts.near_breakout.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("success")}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid",
            borderColor: activeTab === "success" ? "var(--profit)" : "var(--line-2)",
            background: activeTab === "success" ? "rgba(16,185,129,0.18)" : "var(--s2)",
            color: activeTab === "success" ? "var(--profit)" : "var(--ink3)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap"
          }}
        >
          <span>🚀 Breakout Confirmed</span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(16,185,129,0.2)" }}>
            {breakouts.success.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("failed")}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid",
            borderColor: activeTab === "failed" ? "var(--loss)" : "var(--line-2)",
            background: activeTab === "failed" ? "rgba(239,68,68,0.18)" : "var(--s2)",
            color: activeTab === "failed" ? "var(--loss)" : "var(--ink3)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap"
          }}
        >
          <span>⚠️ Failed Breakout</span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(239,68,68,0.2)" }}>
            {breakouts.failed.length}
          </span>
        </button>
      </div>

      {/* ─── PATTERN EXPLORER & SEARCH BAR ─── */}
      <div
        className="card"
        style={{
          padding: "12px 14px",
          marginBottom: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}
      >
        {/* Search input */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search stock ticker or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px 9px 36px",
              borderRadius: 10,
              border: "1px solid var(--line-2)",
              background: "var(--s2)",
              color: "var(--ink1)",
              fontSize: 12.5,
              outline: "none"
            }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: 14 }}>
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
                cursor: "pointer"
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Pattern Name Explorer Pills */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Explore Chart Patterns & Bases
            </span>
            {selectedPattern !== "ALL" && (
              <button
                onClick={() => setSelectedPattern("ALL")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Clear Pattern Filter
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 4,
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
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: isSelected ? "var(--accent)" : "var(--line-2)",
                    background: isSelected ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--s2)",
                    color: isSelected ? "var(--ink1)" : "var(--ink3)",
                    fontSize: 11.5,
                    fontWeight: isSelected ? 800 : 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{ fontSize: 13 }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── STOCK CARDS LIST ─── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink3)" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "3px solid var(--line-2)",
              borderTopColor: "var(--accent)",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px"
            }}
          />
          <div style={{ fontSize: 12, fontWeight: 600 }}>Filtering Institutional Screener Universe...</div>
        </div>
      ) : stocks.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "36px 16px" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No Actionable Entry Setups Found</div>
          <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 4 }}>
            Try selecting "All Setups" or clearing the pattern filter to see more stocks.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stocks.map((s, idx) => {
            const hasPivot = s.breakout_level && Number(s.breakout_level) > 0;
            const cmp = Number(s.curr_price || 0);
            const brk = Number(s.breakout_level || 0);
            const tgt = Number(s.target_1 || 0);
            const diffPct = hasPivot ? ((cmp - brk) / brk * 100) : 0;
            const diffAbs = Math.abs(diffPct);
            const targetGainPct = (tgt > 0 && cmp > 0) ? ((tgt - cmp) / cmp * 100) : null;

            const isNear = s.pattern_stage === "NEAR_BREAKOUT" || (hasPivot && cmp < brk && diffAbs <= 5.0);
            const isSuccess = s.breakout_status === "SUCCESS";
            const isFailed = s.breakout_status === "FAILED";
            const score = s.dna_score || 50;
            const scoreColor = score >= 75 ? "var(--profit)" : score >= 50 ? "#F59E0B" : "var(--loss)";

            const isMissed = diffAbs > 5.0;
            const isSkip = !isMissed && targetGainPct !== null && targetGainPct < 5.0;
            const isGoodToBuy = !isMissed && !isSkip;

            const daysSince = s.days_since_breakout !== null && s.days_since_breakout !== undefined ? Number(s.days_since_breakout) : null;
            const daysLabel = daysSince === 0 ? "🔥 Today (Day 0)" : daysSince === 1 ? "⚡ 1d ago" : daysSince !== null ? `⚡ ${daysSince}d ago` : "";

            return (
              <div
                key={s.symbol || idx}
                onClick={() => handleStockClick(s.symbol)}
                className="card"
                style={{
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "transform 0.18s ease, border-color 0.2s ease",
                  borderLeft: isSuccess
                    ? (isMissed ? "3px solid var(--loss)" : isSkip ? "3px solid #F59E0B" : "3px solid var(--profit)")
                    : isNear
                    ? "3px solid var(--accent)"
                    : isFailed
                    ? "3px solid var(--loss)"
                    : "1px solid var(--line)"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                {/* Top Row: Symbol, Pattern Tag, Price */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "var(--ink1)" }}>
                        {s.symbol}
                      </span>
                      {s.pattern_type && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                            color: "var(--accent)"
                          }}
                        >
                          📐 {s.pattern_type}
                        </span>
                      )}
                      {s.mcap_tier && (
                        <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "var(--s2)", color: "var(--ink3)", fontWeight: 600 }}>
                          {s.mcap_tier}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.company_name || s.sector || "—"}
                    </div>
                  </div>

                  {/* Price & DNA Score */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "var(--ink1)" }}>
                      ₹{Number(s.curr_price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: scoreColor, marginTop: 2 }}>
                      DNA Score: {score}/100
                    </div>
                  </div>
                </div>

                {/* Breakout Confirmed Banners */}
                {isSuccess && hasPivot && isGoodToBuy && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      marginTop: 10
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--profit)", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>🟢</span>
                      <span>Good to Buy : {diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`} from Breakout (₹{brk.toFixed(1)})</span>
                    </span>
                    {daysLabel && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink2)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
                        {daysLabel}
                      </span>
                    )}
                  </div>
                )}

                {isSuccess && hasPivot && isSkip && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      marginTop: 10
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#F59E0B", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>⏭️</span>
                      <span>SKIPP : {targetGainPct !== null ? `${targetGainPct.toFixed(1)}%` : "0%"} left in target</span>
                    </span>
                    {daysLabel && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink2)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
                        {daysLabel}
                      </span>
                    )}
                  </div>
                )}

                {isSuccess && hasPivot && isMissed && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      marginTop: 10
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--loss)", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>🛑</span>
                      <span>MISSED : {diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`} from Breakout (₹{brk.toFixed(1)})</span>
                    </span>
                    {daysLabel && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink2)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
                        {daysLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* Near Breakout Banner */}
                {isNear && hasPivot && !isSuccess && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.25)",
                      marginTop: 10
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--accent)", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>🎯</span>
                      <span>Ready to Buy at ₹{brk.toFixed(1)}</span>
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink2)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>
                      (just {diffAbs.toFixed(2)}% left for confirmation)
                    </span>
                  </div>
                )}

                {/* Bottom Row: Key Metrics Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                    marginTop: 10,
                    fontSize: 10
                  }}
                >
                  <div>
                    <span style={{ color: "var(--ink3)" }}>Breakout: </span>
                    <b style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--ink1)" }}>
                      {s.breakout_level ? `₹${Number(s.breakout_level).toFixed(1)}` : "—"}
                    </b>
                  </div>
                  <div>
                    <span style={{ color: "var(--ink3)" }}>RSI (14): </span>
                    <b style={{ fontFamily: "var(--font-mono, monospace)", color: s.rsi > 70 ? "var(--loss)" : s.rsi < 35 ? "var(--profit)" : "var(--ink1)" }}>
                      {s.rsi !== null && s.rsi !== undefined ? Number(s.rsi).toFixed(1) : "—"}
                    </b>
                  </div>
                  <div>
                    <span style={{ color: "var(--ink3)" }}>ROCE: </span>
                    <b style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--ink1)" }}>
                      {s.roce_pct !== null && s.roce_pct !== undefined ? `${Number(s.roce_pct).toFixed(1)}%` : "—"}
                    </b>
                  </div>
                  <div>
                    <span style={{ color: "var(--ink3)" }}>P/E: </span>
                    <b style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--ink1)" }}>
                      {s.pe_ratio !== null && s.pe_ratio !== undefined ? Number(s.pe_ratio).toFixed(1) : "—"}
                    </b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
