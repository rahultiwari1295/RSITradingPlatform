import React, { useState, useEffect, useCallback } from "react";
import { quantsyncApi } from "../api/quantsyncApi";

interface ScreenerScreenProps {
  theme?: "dark" | "light";
  onSelectStock?: (symbol: string) => void;
}

export default function ScreenerScreen({ theme, onSelectStock }: ScreenerScreenProps) {
  const [activeTab, setActiveTab] = useState<"all" | "near_breakout" | "success" | "failed">("all");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [mcapFilter, setMcapFilter] = useState<string>("ALL");
  const [stanceFilter, setStanceFilter] = useState<string>("ALL");
  const [onlyPsu, setOnlyPsu] = useState<boolean>(false);
  const [onlyFno, setOnlyFno] = useState<boolean>(false);
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
    } else {
      if (stageFilter !== "ALL") params.pattern_stage = stageFilter;
    }

    if (mcapFilter !== "ALL") params.mcap_tier = mcapFilter;
    if (stanceFilter !== "ALL") params.stance = stanceFilter;
    if (onlyPsu) params.is_psu = 1;
    if (onlyFno) params.is_fno = 1;
    if (searchQuery.trim()) params.search = searchQuery.trim();

    quantsyncApi.getScreenerRows(params)
      .then((res) => {
        setStocks(res.rows || []);
        setTotalCount(res.total || 0);
        if (res.scan_date) setScanDate(res.scan_date);
      })
      .catch((err) => {
        console.error("Error fetching screener rows:", err);
        setStocks([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, stageFilter, mcapFilter, stanceFilter, onlyPsu, onlyFno, searchQuery]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const handleStockClick = (sym: string) => {
    if (onSelectStock) {
      onSelectStock(sym);
    } else if (typeof window !== "undefined") {
      // Navigate to DNA view for that stock
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "dna");
      url.searchParams.set("stock", sym);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <div className="screener-screen-root" style={{ padding: "16px 14px 40px", maxWidth: 900, margin: "0 auto" }}>
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

        {/* Aggregate KPI Strip */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginTop: 16,
              paddingTop: 14,
              borderTop: "1px solid var(--line-2)"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600 }}>Universe</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink1)", marginTop: 2 }}>{summary.total_stocks || 0}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600 }}>Near Breakout</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#F59E0B", marginTop: 2 }}>
                {summary.pattern_stages?.NEAR_BREAKOUT || 0}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600 }}>Breakout Success</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--profit)", marginTop: 2 }}>
                {summary.breakout_statuses?.SUCCESS || 0}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 600 }}>Bullish Conviction</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>
                {summary.stances?.BULLISH || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── PRIMARY TABS (All / Near Breakout / Success / Failed) ─── */}
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
          onClick={() => setActiveTab("all")}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid",
            borderColor: activeTab === "all" ? "var(--accent)" : "var(--line-2)",
            background: activeTab === "all" ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--s2)",
            color: activeTab === "all" ? "var(--ink1)" : "var(--ink3)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap"
          }}
        >
          <span>All Scanned</span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(255,255,255,0.08)" }}>
            {totalCount}
          </span>
        </button>

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

      {/* ─── FILTER CONTROL BAR ─── */}
      <div
        className="card"
        style={{
          padding: "12px 14px",
          marginBottom: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10
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

        {/* Dropdown Filters & Toggles */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {activeTab === "all" && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--line-2)",
                background: "var(--s2)",
                color: "var(--ink1)",
                fontSize: 11,
                fontWeight: 600
              }}
            >
              <option value="ALL">All Stages</option>
              <option value="NEAR_BREAKOUT">🎯 Near Breakout</option>
              <option value="MATURE">Mature Pattern</option>
              <option value="FORMING">Forming Base</option>
              <option value="POST_BREAKOUT">Post Breakout</option>
            </select>
          )}

          <select
            value={mcapFilter}
            onChange={(e) => setMcapFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line-2)",
              background: "var(--s2)",
              color: "var(--ink1)",
              fontSize: 11,
              fontWeight: 600
            }}
          >
            <option value="ALL">All Market Caps</option>
            <option value="Large Cap">Large Cap</option>
            <option value="Mid Cap">Mid Cap</option>
            <option value="Small Cap">Small Cap</option>
            <option value="Micro Cap">Micro Cap</option>
          </select>

          <select
            value={stanceFilter}
            onChange={(e) => setStanceFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line-2)",
              background: "var(--s2)",
              color: "var(--ink1)",
              fontSize: 11,
              fontWeight: 600
            }}
          >
            <option value="ALL">All Stances</option>
            <option value="BULLISH">🟢 Bullish Conviction</option>
            <option value="NEUTRAL">🟡 Neutral</option>
            <option value="BEARISH">🔴 Bearish / Avoid</option>
          </select>

          {/* Quick Toggle Chips */}
          <button
            onClick={() => setOnlyPsu(!onlyPsu)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: onlyPsu ? "var(--accent)" : "var(--line-2)",
              background: onlyPsu ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--s2)",
              color: onlyPsu ? "var(--accent)" : "var(--ink3)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            🏛️ PSU Stocks
          </button>

          <button
            onClick={() => setOnlyFno(!onlyFno)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: onlyFno ? "var(--accent)" : "var(--line-2)",
              background: onlyFno ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "var(--s2)",
              color: onlyFno ? "var(--accent)" : "var(--ink3)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            ⚡ F&O Traded
          </button>
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
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>No Stocks Match Filters</div>
          <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 4 }}>
            Try adjusting pattern stage, stance, or market cap criteria.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stocks.map((s, idx) => {
            const isNear = s.pattern_stage === "NEAR_BREAKOUT";
            const isSuccess = s.breakout_status === "SUCCESS";
            const isFailed = s.breakout_status === "FAILED";
            const score = s.dna_score || 50;
            const scoreColor = score >= 75 ? "var(--profit)" : score >= 50 ? "#F59E0B" : "var(--loss)";

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
                    ? "3px solid var(--profit)"
                    : isNear
                    ? "3px solid #F59E0B"
                    : isFailed
                    ? "3px solid var(--loss)"
                    : "1px solid var(--line)"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                {/* Top Row: Symbol, Company Name, Badges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "var(--ink1)" }}>
                        {s.symbol}
                      </span>
                      {s.mcap_tier && (
                        <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "var(--s2)", color: "var(--ink3)", fontWeight: 600 }}>
                          {s.mcap_tier}
                        </span>
                      )}
                      {s.is_psu === 1 && (
                        <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.15)", color: "var(--accent)", fontWeight: 700 }}>
                          🏛️ PSU
                        </span>
                      )}
                      {s.is_fno === 1 && (
                        <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#F59E0B", fontWeight: 700 }}>
                          ⚡ F&O
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.company_name || s.sector || "—"}
                    </div>
                  </div>

                  {/* Price & DNA Score */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-mono, monospace)", color: "var(--ink1)" }}>
                      ₹{Number(s.curr_price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: scoreColor, marginTop: 2 }}>
                      DNA Score: {score}/100
                    </div>
                  </div>
                </div>

                {/* Middle Row: Pattern Type & Breakout Stage */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "var(--s2)",
                    fontSize: 11
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ opacity: 0.7 }}>📐</span>
                    <span style={{ fontWeight: 700, color: "var(--ink1)" }}>
                      {s.pattern_type || "Consolidation Range"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {isNear && (
                      <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(245,158,11,0.2)", color: "#F59E0B", fontWeight: 800, fontSize: 10 }}>
                        🎯 Near ({s.consecutive_days_near || 1}d)
                      </span>
                    )}
                    {isSuccess && (
                      <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.2)", color: "var(--profit)", fontWeight: 800, fontSize: 10 }}>
                        🚀 Breakout Success
                      </span>
                    )}
                    {isFailed && (
                      <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(239,68,68,0.2)", color: "var(--loss)", fontWeight: 800, fontSize: 10 }}>
                        ⚠️ Breakout Failed
                      </span>
                    )}
                    {!isNear && !isSuccess && !isFailed && (
                      <span style={{ padding: "2px 8px", borderRadius: 999, background: "var(--s3)", color: "var(--ink2)", fontWeight: 700, fontSize: 10 }}>
                        {s.pattern_stage || "FORMING"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Key Metrics Grid (Zero synthetic values) */}
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
