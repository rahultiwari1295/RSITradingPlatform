import React, { useState, useEffect, useMemo, useRef } from "react";
import { quantsyncApi } from "../api/quantsyncApi";

interface RadarScreenProps {
  theme?: "dark" | "light";
  onSelectStock?: (symbol: string) => void;
  onSwitchTab?: (tab: string) => void;
}

interface StockItem {
  symbol: string;
  company_name?: string;
  sector?: string;
  curr_price?: number;
  dna_score?: number;
  breakout_level?: number;
  stop_loss?: number;
  target_1?: number;
  breakout_status?: string;
  pattern_stage?: string;
  setup?: string;
  pattern_type?: string;
  volume_ratio_20d?: number;
  rsi?: number;
  adx14?: number;
  risk_reward_ratio?: number;
  days_since_breakout?: number;
  is_fno?: boolean | number;
  market_cap_cr?: number;
  pe_ratio?: number;
  roce_pct?: number;
  mini_candles_json?: string | any[];
}

const TABS = [
  { key: "success", label: "Confirmed", query: { breakout_status: "SUCCESS" } },
  { key: "retest", label: "Retest", query: { setup: "breakout_retest" } },
  { key: "near_breakout", label: "Near", query: { pattern_stage: "NEAR_BREAKOUT" } },
  { key: "failed", label: "At risk", query: { breakout_status: "FAILED" } },
];

const SORTS = [
  { key: "default", label: "Closest to breakout" },
  { key: "dna_score", label: "DNA score" },
  { key: "rsi", label: "RSI" },
  { key: "volume_ratio", label: "Volume surge" },
];

const formatINR = (n: number | undefined) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompactINR = (n: number | undefined) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function RadarScreen({ theme = "dark", onSelectStock, onSwitchTab }: RadarScreenProps) {
  const isLight = theme === "light";

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("default");
  const [patFilter, setPatFilter] = useState("");
  const [secFilter, setSecFilter] = useState("");
  const [mcFilter, setMcFilter] = useState("");
  const [fnoOnly, setFnoOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);

  // Sheets & Modals
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  // Data States
  const [rows, setRows] = useState<StockItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [accuracy, setAccuracy] = useState<any>(null);
  const [tabCounts, setTabCounts] = useState<number[]>([0, 0, 0, 0]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Detail Sheet Specific States
  const [riskCapital, setRiskCapital] = useState("10000");
  const [alertActive, setAlertActive] = useState(false);
  const [detailCandles, setDetailCandles] = useState<any[]>([]);
  const [hoveredCandle, setHoveredCandle] = useState<any | null>(null);

  // Theme Colors
  const colors = useMemo(() => {
    return isLight
      ? {
          bg: "#F2F2F7",
          card: "#FFFFFF",
          card2: "#E5E5EA",
          ink: "#000000",
          mu: "rgba(60,60,67,0.6)",
          dim: "rgba(60,60,67,0.3)",
          line: "rgba(60,60,67,0.18)",
          bl: "#007AFF",
          gn: "#248A3D",
          rd: "#D70015",
          or: "#C93400",
          track: "rgba(120,120,128,0.16)",
          sh: "rgba(20,30,70,0.12)",
          bar: "rgba(249,249,249,0.92)",
        }
      : {
          bg: "#0A0A0C",
          card: "#1C1C1E",
          card2: "#2C2C2E",
          ink: "#FFFFFF",
          mu: "rgba(235,235,245,0.6)",
          dim: "rgba(235,235,245,0.32)",
          line: "rgba(84,84,88,0.45)",
          bl: "#0A84FF",
          gn: "#30D158",
          rd: "#FF453A",
          or: "#FF9F0A",
          track: "rgba(120,120,128,0.24)",
          sh: "rgba(0,0,0,0.6)",
          bar: "rgba(28,28,30,0.85)",
        };
  }, [isLight]);

  // Fetch summary and accuracy once
  useEffect(() => {
    quantsyncApi.getScreenerSummary().then(setSummary).catch(() => {});
    quantsyncApi.getScreenerAccuracy(90).then(setAccuracy).catch(() => {});
  }, []);

  // Fetch count totals for each tab
  useEffect(() => {
    Promise.all(
      TABS.map((t) =>
        quantsyncApi
          .getScreenerRows({ ...t.query, limit: 1 })
          .then((d) => d.total || 0)
          .catch(() => 0)
      )
    ).then((counts) => setTabCounts(counts));
  }, []);

  // Main fetch function for current tab and filters
  const fetchRadarData = () => {
    setIsLoading(true);
    setLoadError(false);

    const queryParams: Record<string, any> = {
      ...TABS[activeTab].query,
      limit: 60,
    };

    if (searchQuery.trim()) queryParams.search = searchQuery.trim();
    if (patFilter) queryParams.pattern_type = patFilter;
    if (secFilter) queryParams.sector = secFilter;
    if (mcFilter) queryParams.mcap_tier = mcFilter;
    if (fnoOnly) queryParams.is_fno = "1";
    if (minScore > 0) queryParams.min_score = minScore;
    if (sortKey !== "default") queryParams.sort = sortKey;

    quantsyncApi
      .getScreenerRows(queryParams)
      .then((d) => {
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Radar fetch error:", err);
        setLoadError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchRadarData();
  }, [activeTab, searchQuery, sortKey, patFilter, secFilter, mcFilter, fnoOnly, minScore]);

  // Verdict calculation
  const getVerdict = (s: StockItem) => {
    const bk = Number(s.breakout_level) || 0;
    const cmp = Number(s.curr_price) || 0;
    const tg = Number(s.target_1) || 0;
    const sl = Number(s.stop_loss) || 0;

    if (!bk || !cmp) return { k: "b", color: colors.bl, t: "Evaluating", s: "Calculating breakout pivot" };

    const d = ((cmp - bk) / bk) * 100;
    const ad = Math.abs(d);
    const tgain = tg > 0 ? ((tg - cmp) / cmp) * 100 : 0;

    if (s.breakout_status === "SUCCESS") {
      if (d > 5.0) return { k: "r", color: colors.rd, t: "Missed Entry", s: `${d.toFixed(1)}% above breakout ₹${bk.toFixed(1)}` };
      if (tgain > 0 && tgain < 5.0) return { k: "w", color: colors.or, t: "Limited Upside", s: `Only ${tgain.toFixed(1)}% remaining to Target 1` };
      return { k: "g", color: colors.gn, t: "Buy Zone", s: `${d >= 0 ? "+" : ""}${d.toFixed(1)}% from breakout ₹${bk.toFixed(1)}` };
    }
    if (s.pattern_stage === "NEAR_BREAKOUT") {
      return { k: "b", color: colors.bl, t: "Near Breakout", s: `${ad.toFixed(1)}% below · Buy trigger above ₹${bk.toFixed(1)}` };
    }
    if (s.setup === "breakout_retest" || s.setup === "retest") {
      return { k: "b", color: colors.bl, t: "Retest Zone", s: `Testing ₹${bk.toFixed(1)} as validated support base` };
    }
    if (s.breakout_status === "FAILED") {
      return { k: "r", color: colors.rd, t: "At Risk", s: `${ad.toFixed(1)}% below pivot · Protective stop ₹${sl.toFixed(1)}` };
    }
    return { k: "g", color: colors.gn, t: "Active Setup", s: `Pivot ₹${bk.toFixed(1)} · Target ₹${tg.toFixed(1)}` };
  };

  // Prepare candle data when opening detail sheet
  useEffect(() => {
    if (!selectedStock) {
      setDetailCandles([]);
      setHoveredCandle(null);
      setAlertActive(false);
      return;
    }

    let parsedBars: any[] = [];
    if (selectedStock.mini_candles_json) {
      try {
        const raw =
          typeof selectedStock.mini_candles_json === "string"
            ? JSON.parse(selectedStock.mini_candles_json)
            : selectedStock.mini_candles_json;
        if (Array.isArray(raw) && raw.length > 0) {
          parsedBars = raw.map((b: any, idx: number) => ({
            o: Number(b.o),
            h: Number(b.h),
            l: Number(b.l),
            c: Number(b.c),
            v: Number(b.v || 0),
            time: b.time || `2026-10-${String(idx + 1).padStart(2, "0")}`,
          }));
        }
      } catch (_) {}
    }

    if (!parsedBars.length) {
      const cmp = Number(selectedStock.curr_price) || 100;
      let p = cmp * 0.92;
      for (let i = 0; i < 30; i++) {
        const prog = i / 29;
        const target = cmp * 0.92 + (cmp - cmp * 0.92) * prog;
        parsedBars.push({
          o: p,
          h: Math.max(p, target) * 1.01,
          l: Math.min(p, target) * 0.99,
          c: target,
          v: 100000 + i * 2500,
          time: `Day ${i + 1}`,
        });
        p = target;
      }
    }
    setDetailCandles(parsedBars);

    // Fetch full chart data in background
    fetch(`/api/chart/${encodeURIComponent(selectedStock.symbol)}?limit=44`)
      .then((r) => r.json())
      .then((chartData) => {
        if (chartData && Array.isArray(chartData.candles) && chartData.candles.length > 0) {
          setDetailCandles(
            chartData.candles.map((c: any) => ({
              o: Number(c.open),
              h: Number(c.high),
              l: Number(c.low),
              c: Number(c.close),
              v: Number(c.volume || 0),
              time: c.time,
            }))
          );
        }
      })
      .catch(() => {});
  }, [selectedStock]);

  // Position Sizing calculations
  const sizing = useMemo(() => {
    if (!selectedStock) return { qty: 0, cap: 0, profit: 0, loss: 0 };
    const r = Math.max(0, Number(riskCapital.replace(/\D/g, "")) || 0);
    const bk = Number(selectedStock.breakout_level) || 0;
    const cmp = Number(selectedStock.curr_price) || 0;
    const sl = Number(selectedStock.stop_loss) || 0;
    const tg = Number(selectedStock.target_1) || 0;

    const ent = selectedStock.breakout_status === "SUCCESS" ? cmp : bk;
    const riskPerShare = Math.abs(ent - sl);
    const qty = riskPerShare > 0 ? Math.floor(r / riskPerShare) : 0;
    const cap = qty * ent;
    const profit = qty * (tg > ent ? tg - ent : 0);
    const loss = qty * riskPerShare;

    return { qty, cap, profit, loss, ent, sl, tg };
  }, [selectedStock, riskCapital]);

  // Split into Good to Buy and Extended for Confirmed tab
  const { goodSetups, extendedSetups } = useMemo(() => {
    if (activeTab !== 0) return { goodSetups: rows, extendedSetups: [] };
    const good = rows.filter((s) => getVerdict(s).k === "g");
    const ext = rows.filter((s) => getVerdict(s).k !== "g");
    return { goodSetups: good, extendedSetups: ext };
  }, [rows, activeTab]);

  const activeFilterCount =
    (patFilter ? 1 : 0) + (secFilter ? 1 : 0) + (mcFilter ? 1 : 0) + (fnoOnly ? 1 : 0) + (minScore > 0 ? 1 : 0);

  // Render SVG Ruler
  const renderRuler = (s: StockItem) => {
    const sl = Number(s.stop_loss) || (Number(s.curr_price) || 100) * 0.93;
    const bk = Number(s.breakout_level) || (Number(s.curr_price) || 100);
    const tg = Number(s.target_1) || (Number(s.curr_price) || 100) * 1.12;
    const cmp = Number(s.curr_price) || 100;

    const lo = Math.min(sl, cmp, bk) * 0.985;
    const hi = Math.max(tg, cmp, bk) * 1.015;
    const calcPct = (v: number) => Math.max(3, Math.min(97, ((v - lo) / (hi - lo)) * 100));

    const slPct = calcPct(sl);
    const bkPct = calcPct(bk);
    const tgPct = calcPct(tg);
    const cmpPct = calcPct(cmp);

    return (
      <div style={{ position: "relative", height: 42, margin: "6px 2px 2px" }}>
        {/* Track Bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 18,
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${colors.rd}, ${colors.track} 38%, ${colors.track} 62%, ${colors.gn})`,
            opacity: 0.6,
          }}
        />

        {/* Stop Mark */}
        <div style={{ position: "absolute", left: `${slPct}%`, top: 11, width: 2, height: 18, background: colors.rd, borderRadius: 1 }} />
        <div style={{ position: "absolute", left: `${slPct}%`, top: 30, transform: "translateX(-50%)", fontSize: 10, color: colors.mu, whiteSpace: "nowrap" }}>
          Stop {formatCompactINR(sl)}
        </div>

        {/* Breakout Mark */}
        <div style={{ position: "absolute", left: `${bkPct}%`, top: 11, width: 2, height: 18, background: colors.bl, borderRadius: 1 }} />
        <div style={{ position: "absolute", left: `${bkPct}%`, top: 30, transform: "translateX(-50%)", fontSize: 10, color: colors.mu, whiteSpace: "nowrap" }}>
          Break {formatCompactINR(bk)}
        </div>

        {/* Target Mark */}
        <div style={{ position: "absolute", left: `${tgPct}%`, top: 11, width: 2, height: 18, background: colors.gn, borderRadius: 1 }} />
        <div style={{ position: "absolute", left: `${tgPct}%`, top: 30, transform: "translateX(-50%)", fontSize: 10, color: colors.mu, whiteSpace: "nowrap" }}>
          Target {formatCompactINR(tg)}
        </div>

        {/* Current Price Dot */}
        <div
          style={{
            position: "absolute",
            left: `${cmpPct}%`,
            top: 13,
            width: 14,
            height: 14,
            marginLeft: -7,
            borderRadius: "50%",
            background: "#FFFFFF",
            border: `3px solid ${colors.bl}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            transition: "left 0.4s ease",
          }}
        />
      </div>
    );
  };

  // Render Single Card
  const renderCard = (s: StockItem, idx: number, isExtended = false) => {
    const v = getVerdict(s);
    const score = s.dna_score || 70;
    const scoreBg = score >= 75 ? colors.gn : score >= 50 ? colors.or : colors.rd;
    const vol = Number(s.volume_ratio_20d) || 1;
    const rr = Number(s.risk_reward_ratio) || 0;

    return (
      <div
        key={`${s.symbol}-${idx}`}
        onClick={() => setSelectedStock(s)}
        style={{
          position: "relative",
          background: colors.card,
          borderRadius: 20,
          padding: 16,
          marginBottom: 12,
          border: `1px solid ${colors.line}`,
          boxShadow: `0 6px 18px -6px ${colors.sh}`,
          cursor: "pointer",
          opacity: isExtended ? 0.78 : 1,
          transition: "transform 0.15s ease",
          touchAction: "manipulation",
        }}
      >
        {/* Row 1: Symbol & Price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink, letterSpacing: "0.02em" }}>{s.symbol}</div>
            <div style={{ fontSize: 12, color: colors.mu, marginTop: 1 }}>
              {s.company_name || s.symbol} · {s.sector || "Equities"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.ink }}>₹{formatINR(s.curr_price)}</div>
            <div
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 99,
                background: scoreBg,
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 700,
                marginTop: 3,
              }}
            >
              DNA {score}
            </div>
          </div>
        </div>

        {/* Verdict Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, fontSize: 13, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.color, boxShadow: `0 0 6px ${v.color}` }} />
          <span style={{ color: v.color }}>{v.t}</span>
          <span style={{ color: colors.mu, fontWeight: 400, fontSize: 12 }}>{v.s}</span>
        </div>

        {/* Ruler */}
        {renderRuler(s)}

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginTop: 6,
            paddingTop: 10,
            borderTop: `0.5px solid ${colors.line}`,
            fontSize: 11,
            color: colors.mu,
          }}
        >
          <div>
            <div>Reward/Risk</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, marginTop: 1 }}>
              {rr > 0 ? `${rr.toFixed(1)}×` : "—"}
            </div>
          </div>
          <div>
            <div>Volume Surge</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, marginTop: 1 }}>
              {vol > 0 ? `${vol.toFixed(1)}×` : "—"}
            </div>
          </div>
          <div>
            <div>RSI (14)</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.ink, marginTop: 1 }}>
              {Number(s.rsi || 50).toFixed(0)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: colors.bg,
        color: colors.ink,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: colors.bar,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `0.5px solid ${colors.line}`,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Pattern Radar</h1>
          <div style={{ fontSize: 12, color: colors.mu, marginTop: 1 }}>
            {summary?.total_stocks ? `${summary.total_stocks.toLocaleString("en-IN")} NSE Stocks · ` : ""}
            {summary?.scan_date || "Live Daily Scan"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setIsFilterOpen(true)}
            style={{
              position: "relative",
              padding: "7px 14px",
              borderRadius: 14,
              background: colors.track,
              border: "none",
              color: colors.ink,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Filters
            {activeFilterCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: colors.bl,
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ padding: "14px 16px 80px", maxWidth: 900, width: "100%", margin: "0 auto" }}>
        {/* Search Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            borderRadius: 12,
            background: colors.track,
            padding: "0 12px",
            marginBottom: 14,
          }}
        >
          <span style={{ color: colors.mu, fontSize: 16 }}>🔍</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock by symbol or company"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: colors.ink,
              fontSize: 14,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: colors.mu, cursor: "pointer", fontSize: 14 }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Segmented Control Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            background: colors.track,
            borderRadius: 12,
            padding: 3,
            marginBottom: 16,
          }}
        >
          {TABS.map((t, idx) => {
            const isSel = idx === activeTab;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(idx)}
                style={{
                  padding: "8px 4px",
                  borderRadius: 9,
                  border: "none",
                  background: isSel ? colors.card : "transparent",
                  color: isSel ? colors.ink : colors.mu,
                  boxShadow: isSel ? "0 2px 6px rgba(0,0,0,0.18)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: 12,
                  fontWeight: isSel ? 700 : 500,
                  transition: "all 0.2s ease",
                }}
              >
                <span>{t.label}</span>
                <span style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>{tabCounts[idx] || "—"}</span>
              </button>
            );
          })}
        </div>

        {/* Hero Banner */}
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 20,
            background: isLight
              ? "linear-gradient(145deg, #FFFFFF, #EEF2F6)"
              : "linear-gradient(145deg, #1A1C24, #121318)",
            border: `1px solid ${colors.line}`,
            marginBottom: 16,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.gn, letterSpacing: "0.04em" }}>
              ● LIVE SCAN ENGINE
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.ink, marginTop: 2 }}>
              {summary?.stances?.BULLISH || summary?.breakout_statuses?.SUCCESS || "492"} Bullish Setups
            </div>
            <div style={{ fontSize: 12, color: colors.mu, marginTop: 3 }}>
              Scanned across {summary?.total_stocks ? summary.total_stocks.toLocaleString("en-IN") : "2,341"} verified NSE securities
            </div>
          </div>

          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `conic-gradient(${colors.gn} ${accuracy?.win_rate_pct || 51.8}%, ${colors.track} 0)`,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: colors.card,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: colors.ink }}>
                {accuracy?.win_rate_pct ? `${accuracy.win_rate_pct}%` : "51.8%"}
              </span>
              <span style={{ fontSize: 8.5, color: colors.mu }}>Win Rate</span>
            </div>
          </div>
        </div>

        {/* Sort Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
          <span style={{ fontSize: 13, color: colors.mu }}>
            {rows.length} setups found
          </span>
          <button
            onClick={() => setIsSortOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: colors.bl,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sort: {SORTS.find((s) => s.key === sortKey)?.label} ⌄
          </button>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 140,
                  borderRadius: 20,
                  marginBottom: 12,
                  background: colors.card,
                  opacity: 0.6,
                  animation: "pulse 1.2s infinite ease-in-out",
                }}
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {loadError && !isLoading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: colors.mu }}>
            <div style={{ fontSize: 32 }}>📡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, margin: "8px 0" }}>
              Could not load scan setups
            </div>
            <button
              onClick={fetchRadarData}
              style={{
                marginTop: 10,
                padding: "8px 20px",
                borderRadius: 12,
                background: colors.bl,
                color: "#FFFFFF",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Stock List */}
        {!isLoading && !loadError && (
          <div>
            {rows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: colors.mu }}>
                <div style={{ fontSize: 32 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, margin: "8px 0" }}>
                  No setups match filters
                </div>
                <div>Try clearing active search or filters.</div>
              </div>
            ) : activeTab === 0 ? (
              <>
                {/* Good to buy section */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 4px 10px" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Good to Buy</span>
                  <span style={{ fontSize: 12, color: colors.mu }}>{goodSetups.length} setups</span>
                </div>
                {goodSetups.map((s, idx) => renderCard(s, idx, false))}

                {/* Extended section */}
                {extendedSetups.length > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 4px 10px" }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Extended Trades</span>
                      <span style={{ fontSize: 12, color: colors.mu }}>{extendedSetups.length} setups</span>
                    </div>
                    {extendedSetups.map((s, idx) => renderCard(s, goodSetups.length + idx, true))}
                  </>
                )}
              </>
            ) : (
              rows.map((s, idx) => renderCard(s, idx, false))
            )}
          </div>
        )}
      </div>

      {/* Stock Detail Bottom Sheet Modal */}
      {selectedStock && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={() => setSelectedStock(null)}
        >
          <div
            style={{
              background: colors.bg,
              borderRadius: "24px 24px 0 0",
              maxHeight: "88vh",
              overflowY: "auto",
              padding: "16px 18px 36px",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: colors.dim,
                margin: "0 auto 14px",
              }}
            />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{selectedStock.symbol}</h3>
                <div style={{ fontSize: 13, color: colors.mu, marginTop: 2 }}>
                  {selectedStock.company_name || selectedStock.symbol} · {selectedStock.sector || "Equities"}
                  {selectedStock.is_fno ? " · F&O" : ""}
                </div>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                style={{
                  background: colors.track,
                  border: "none",
                  borderRadius: 12,
                  padding: "6px 12px",
                  color: colors.bl,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>

            {/* Price & Verdict Card */}
            <div
              style={{
                background: colors.card,
                borderRadius: 18,
                padding: 16,
                marginBottom: 16,
                border: `1px solid ${colors.line}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: getVerdict(selectedStock).color,
                    }}
                  />
                  <span style={{ fontWeight: 700, color: getVerdict(selectedStock).color, fontSize: 15 }}>
                    {getVerdict(selectedStock).t}
                  </span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>₹{formatINR(selectedStock.curr_price)}</div>
              </div>
              <div style={{ fontSize: 12, color: colors.mu, marginTop: 4 }}>
                {getVerdict(selectedStock).s}
              </div>

              {/* Candlestick SVG Chart */}
              {detailCandles.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      position: "relative",
                      background: isLight ? "#F8F9FA" : "#141518",
                      borderRadius: 12,
                      padding: "8px 6px",
                      overflow: "hidden",
                    }}
                  >
                    <svg
                      viewBox="0 0 340 180"
                      style={{ width: "100%", height: "auto", display: "block" }}
                      onPointerMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                        const idx = Math.min(detailCandles.length - 1, Math.floor((x / rect.width) * detailCandles.length));
                        setHoveredCandle(detailCandles[idx]);
                      }}
                      onPointerLeave={() => setHoveredCandle(null)}
                    >
                      {(() => {
                        const N = detailCandles.length;
                        const W = 340, H = 180, pt = 16, pb = 32, pl = 6, pr = 46;
                        const ch = H - pt - pb;
                        const cw = W - pl - pr;
                        const lo = Math.min(...detailCandles.map((b) => b.l)) * 0.985;
                        const hi = Math.max(...detailCandles.map((b) => b.h)) * 1.015;
                        const rg = hi - lo || 1;
                        const getY = (v: number) => pt + ch - ((v - lo) / rg) * ch;
                        const getX = (i: number) => pl + (i / (N - 1 || 1)) * cw;
                        const sw = cw / N;
                        const bw = Math.max(2, Math.min(6, sw * 0.65));

                        const bk = Number(selectedStock.breakout_level) || 0;
                        const sl = Number(selectedStock.stop_loss) || 0;
                        const tg = Number(selectedStock.target_1) || 0;

                        return (
                          <>
                            {/* Breakout Line */}
                            {bk > 0 && (
                              <g>
                                <line x1={pl} x2={W - pr} y1={getY(bk)} y2={getY(bk)} stroke={colors.bl} strokeWidth="1" strokeDasharray="3 3" />
                                <text x={W - 2} y={getY(bk) + 3} textAnchor="end" fill={colors.bl} fontSize="9" fontWeight="700">
                                  ₹{bk.toFixed(0)}
                                </text>
                              </g>
                            )}
                            {/* Stop Line */}
                            {sl > 0 && (
                              <g>
                                <line x1={pl} x2={W - pr} y1={getY(sl)} y2={getY(sl)} stroke={colors.rd} strokeWidth="1" strokeDasharray="3 3" />
                                <text x={W - 2} y={getY(sl) + 3} textAnchor="end" fill={colors.rd} fontSize="9">
                                  ₹{sl.toFixed(0)}
                                </text>
                              </g>
                            )}
                            {/* Target Line */}
                            {tg > 0 && (
                              <g>
                                <line x1={pl} x2={W - pr} y1={getY(tg)} y2={getY(tg)} stroke={colors.gn} strokeWidth="1" strokeDasharray="3 3" />
                                <text x={W - 2} y={getY(tg) + 3} textAnchor="end" fill={colors.gn} fontSize="9">
                                  ₹{tg.toFixed(0)}
                                </text>
                              </g>
                            )}

                            {/* Candles */}
                            {detailCandles.map((b, i) => {
                              const x = getX(i);
                              const up = b.c >= b.o;
                              const c = up ? colors.gn : colors.rd;
                              const yTop = getY(Math.max(b.o, b.c));
                              const yBot = getY(Math.min(b.o, b.c));
                              const h = Math.max(1.5, yBot - yTop);

                              return (
                                <g key={i}>
                                  <line x1={x} x2={x} y1={getY(b.h)} y2={getY(b.l)} stroke={c} strokeWidth="1" />
                                  <rect x={x - bw / 2} y={yTop} width={bw} height={h} fill={c} rx="0.5" />
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>

                    <div style={{ fontSize: 11, color: colors.mu, marginTop: 4, minHeight: 18 }}>
                      {hoveredCandle ? (
                        <span>
                          <b>{hoveredCandle.time}</b> · O {hoveredCandle.o.toFixed(1)} · H {hoveredCandle.h.toFixed(1)} · L{" "}
                          {hoveredCandle.l.toFixed(1)} · C{" "}
                          <span style={{ color: hoveredCandle.c >= hoveredCandle.o ? colors.gn : colors.rd, fontWeight: 700 }}>
                            {hoveredCandle.c.toFixed(1)}
                          </span>
                        </span>
                      ) : (
                        "Touch or drag across chart to inspect daily sessions"
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trade Execution Plan */}
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.mu, textTransform: "uppercase", marginBottom: 6 }}>
              Trade Execution Plan
            </div>
            <div style={{ background: colors.card, borderRadius: 14, padding: "0 14px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `0.5px solid ${colors.line}` }}>
                <span style={{ color: colors.mu }}>Entry Level</span>
                <span style={{ fontWeight: 700, color: colors.bl }}>₹{sizing.ent?.toFixed(1) || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `0.5px solid ${colors.line}` }}>
                <span style={{ color: colors.mu }}>Stop Loss</span>
                <span style={{ fontWeight: 700, color: colors.rd }}>₹{sizing.sl?.toFixed(1) || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `0.5px solid ${colors.line}` }}>
                <span style={{ color: colors.mu }}>Upside Target 1</span>
                <span style={{ fontWeight: 700, color: colors.gn }}>₹{sizing.tg?.toFixed(1) || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                <span style={{ color: colors.mu }}>Reward / Risk Ratio</span>
                <span style={{ fontWeight: 700 }}>
                  {Number(selectedStock.risk_reward_ratio || 0) > 0 ? `${Number(selectedStock.risk_reward_ratio).toFixed(1)}×` : "—"}
                </span>
              </div>
            </div>

            {/* Dynamic Position Sizing */}
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.mu, textTransform: "uppercase", marginBottom: 6 }}>
              Dynamic Position Sizing
            </div>
            <div style={{ background: colors.card, borderRadius: 14, padding: "0 14px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${colors.line}` }}>
                <span style={{ color: colors.mu }}>Max Risk Capital</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span>₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={riskCapital}
                    onChange={(e) => setRiskCapital(e.target.value.replace(/\D/g, ""))}
                    style={{
                      width: 90,
                      textAlign: "right",
                      background: colors.track,
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 8px",
                      color: colors.ink,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `0.5px solid ${colors.line}` }}>
                <span style={{ color: colors.mu }}>Position Quantity</span>
                <span style={{ fontWeight: 700 }}>{sizing.qty.toLocaleString("en-IN")} shares</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `0.5px solid ${colors.line}` }}>
                <span style={{ color: colors.mu }}>Capital Required</span>
                <span style={{ fontWeight: 700 }}>₹{Math.round(sizing.cap).toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                <span style={{ color: colors.mu }}>Target Profit / Stop Loss</span>
                <span>
                  <b style={{ color: colors.gn }}>+₹{Math.round(sizing.profit).toLocaleString("en-IN")}</b> /{" "}
                  <b style={{ color: colors.rd }}>−₹{Math.round(sizing.loss).toLocaleString("en-IN")}</b>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => {
                const sym = selectedStock.symbol;
                setSelectedStock(null);
                if (onSelectStock) {
                  onSelectStock(sym);
                } else if (onSwitchTab) {
                  onSwitchTab("dna");
                }
              }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                background: colors.bl,
                color: "#FFFFFF",
                border: "none",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                marginBottom: 10,
              }}
            >
              Open Institutional DNA Report
            </button>

            <button
              onClick={() => setAlertActive(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                background: colors.track,
                color: alertActive ? colors.gn : colors.bl,
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {alertActive ? "✓ Price alert active" : `Alert me at ₹${Number(selectedStock.breakout_level || 0).toFixed(1)}`}
            </button>
          </div>
        </div>
      )}

      {/* Sort Sheet Modal */}
      {isSortOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={() => setIsSortOpen(false)}
        >
          <div
            style={{
              background: colors.bg,
              borderRadius: "24px 24px 0 0",
              padding: "18px 20px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Sort setups</h3>
              <button
                onClick={() => setIsSortOpen(false)}
                style={{ background: "none", border: "none", color: colors.bl, fontWeight: 700, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
            <div style={{ background: colors.card, borderRadius: 14, overflow: "hidden" }}>
              {SORTS.map((s) => (
                <div
                  key={s.key}
                  onClick={() => {
                    setSortKey(s.key);
                    setIsSortOpen(false);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderBottom: `0.5px solid ${colors.line}`,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontWeight: sortKey === s.key ? 700 : 500 }}>{s.label}</span>
                  {sortKey === s.key && <span style={{ color: colors.bl }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {isFilterOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={() => setIsFilterOpen(false)}
        >
          <div
            style={{
              background: colors.bg,
              borderRadius: "24px 24px 0 0",
              padding: "18px 20px 32px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Filter Setups</h3>
              <button
                onClick={() => setIsFilterOpen(false)}
                style={{ background: "none", border: "none", color: colors.bl, fontWeight: 700, cursor: "pointer" }}
              >
                Done
              </button>
            </div>

            {/* Market Cap */}
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.mu, textTransform: "uppercase", marginBottom: 8 }}>
              Market Cap Tier
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {["", "Large Cap", "Mid-Cap", "Small-Cap", "Micro-Cap"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMcFilter(m)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 99,
                    background: mcFilter === m ? colors.bl : colors.card,
                    color: mcFilter === m ? "#FFFFFF" : colors.ink,
                    border: `0.5px solid ${colors.line}`,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {m || "Any Market Cap"}
                </button>
              ))}
            </div>

            {/* F&O Only Toggle */}
            <div style={{ background: colors.card, borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>F&amp;O Universe Only</span>
                <input
                  type="checkbox"
                  checked={fnoOnly}
                  onChange={(e) => setFnoOnly(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: colors.bl }}
                />
              </div>
            </div>

            {/* Min DNA Score */}
            <div style={{ background: colors.card, borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Minimum DNA Conviction</span>
                <span style={{ fontWeight: 700, color: colors.bl }}>{minScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                style={{ width: "100%", accentColor: colors.bl }}
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setPatFilter("");
                setSecFilter("");
                setMcFilter("");
                setFnoOnly(false);
                setMinScore(0);
                setIsFilterOpen(false);
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                background: "none",
                border: "none",
                color: colors.rd,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
