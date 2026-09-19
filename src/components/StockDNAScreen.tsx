import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Dna, Share2, TrendingUp, ShieldAlert, Sparkles, 
  ArrowUpRight, BarChart2, CheckCircle, Copy, AlertTriangle, 
  RefreshCw, Layers, Compass, Crosshair, ChevronDown, ExternalLink,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, Download, Image as ImageIcon, X
} from "lucide-react";

interface StockSuggestion {
  symbol: string;
  name: string;
  token?: string;
  candleCount?: number;
}

interface StockDnaReport {
  symbol: string;
  company_name: string;
  report_date: string;
  chart_image_url?: string;
  chart_image_macro_url?: string;
  current_metrics: {
    price: number;
    ema20: number;
    ema50: number;
    ema200: number;
    rsi: number;
    atr: number;
    volume_mult: number;
    ath: number;
    ath_date: string;
    dist_ath_pct: number;
    w52_high: number;
    w52_low: number;
    dist_52w_pct: number;
    candle_count: number;
  };
  ui_report: {
    dna_archetype: string;
    dna_health_score: number;
    beginner_summary: {
      what_is_happening: string;
      the_opportunity: string;
      the_danger: string;
    };
    pro_analysis: {
      macro_regime: string;
      chart_pattern_detected: string;
      momentum_state: string;
      key_triggers: string;
    };
    trade_execution_card: {
      action: string;
      entry_zone: string;
      stop_loss: number;
      target_1: number;
      target_2: number;
      risk_to_reward_ratio: string;
    };
  };
  chart_directives: {
    trendlines: Array<{
      type: string;
      p1: { date: string; price: number };
      p2: { date: string; price: number };
      color: string;
      label: string;
    }>;
    horizontal_levels: Array<{
      price: number;
      color: string;
      style: string;
      label: string;
    }>;
  };
  chart_candles: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    ema20?: number;
    ema50?: number;
    ema200?: number;
  }>;
}

const QUICK_STOCKS = [
  "TATAMOTORS", "TATASTEEL", "TATACHEM", "TATAPOWER", "RELIANCE", "HDFCBANK", "INFY", "ITC"
];

const SCAN_STEPS = [
  { title: "Locating Stock Record", desc: "Querying 1,318 equities in stock_history.db..." },
  { title: "Slicing 5-Year Candlesticks", desc: "Extracting 1,300+ daily OHLCV bars & volume profile..." },
  { title: "Computing Geometry & Pivots", desc: "Scanning weekly swing extrema & Fibonacci clusters..." },
  { title: "Technical Radar Analysis", desc: "Evaluating 20/50/200 EMAs, RSI divergence & ATR bands..." },
  { title: "Synthesizing Stock DNA", desc: "Formulating CMT trade card & plain-English narrative..." }
];

export default function StockDNAScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState("TATASTEEL");
  
  const [report, setReport] = useState<StockDnaReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [copyToast, setCopyToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<any | null>(null);
  const [chartViewMode, setChartViewMode] = useState<"interactive" | "snapshot">("interactive");
  const [chartPerspective, setChartPerspective] = useState<"tactical" | "macro">("tactical");
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current && 
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close zoom modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsZoomOpen(false);
      }
    };
    if (isZoomOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomOpen]);

const VPS_DEFAULT_BASE = "https://quantsync-api.duckdns.org:8000";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as any).env?.VITE_VPS_API_URL;
    if (envUrl) return envUrl;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "";
    }
  }
  return VPS_DEFAULT_BASE;
}

async function apiDnaFetch<T>(path: string): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      return await res.json();
    }
    // Fallback: If primary failed, try alternative host
    if (base) {
      const fallbackRes = await fetch(path, { headers: { Accept: "application/json" } });
      if (fallbackRes.ok) return await fallbackRes.json();
    } else {
      const vpsRes = await fetch(`${VPS_DEFAULT_BASE}${path}`, { headers: { Accept: "application/json" } });
      if (vpsRes.ok) return await vpsRes.json();
    }
    throw new Error(`API returned HTTP ${res.status}`);
  } catch (err: any) {
    const altUrl = base ? path : `${VPS_DEFAULT_BASE}${path}`;
    try {
      const altRes = await fetch(altUrl, { headers: { Accept: "application/json" } });
      if (altRes.ok) return await altRes.json();
    } catch {
      // Fallback network error
    }
    throw err;
  }
}

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await apiDnaFetch<any[]>(`/api/dna/search?q=${encodeURIComponent(searchQuery)}`);
        setSuggestions(Array.isArray(data) ? data : []);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error("Search fetch error:", err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial load
  useEffect(() => {
    let initialSymbol = "TATASTEEL";
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const s = p.get("symbol");
      if (s) initialSymbol = s.trim().toUpperCase();
    }
    fetchStockDna(initialSymbol);
  }, []);

  const fetchStockDna = async (symbol: string) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;

    setSelectedStock(sym);
    setIsDropdownOpen(false);
    setIsLoading(true);
    setErrorMsg(null);
    setScanStep(0);
    setScanProgress(5);

    // Multi-step animated progress simulation to give high-conviction institutional feel
    const stepInterval = setInterval(() => {
      setScanStep((prev) => {
        const next = prev + 1;
        if (next < SCAN_STEPS.length) return next;
        return prev;
      });
      setScanProgress((prev) => Math.min(92, prev + 18));
    }, 380);

    try {
      const data: StockDnaReport = await apiDnaFetch<StockDnaReport>(`/api/dna/report/${encodeURIComponent(sym)}`);
      
      // Allow user to see the scanning steps complete smoothly
      setTimeout(() => {
        clearInterval(stepInterval);
        setScanStep(4);
        setScanProgress(100);
        setTimeout(() => {
          setReport(data);
          setIsLoading(false);
        }, 300);
      }, 1200);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to load Stock DNA report.");
    }
  };

  const handleShare = () => {
    if (!report) return;
    const shareUrl = `https://rsitradingplatform.vercel.app/?tab=dna&symbol=${report.symbol}`;
    const shareText = `🧬 QuantSync Stock DNA Report — ${report.symbol} (${report.company_name})
Health Score: ${report.ui_report.dna_health_score}/100 · ${report.ui_report.dna_archetype}
Trade Setup: ${report.ui_report.trade_execution_card.action} (Entry: ${report.ui_report.trade_execution_card.entry_zone} | Target: ₹${report.ui_report.trade_execution_card.target_1} | Stop: ₹${report.ui_report.trade_execution_card.stop_loss})
Decoded by QuantSync Algorithmic Terminal: ${shareUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2500);
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "#10B981"; // Emerald
    if (score >= 55) return "#3B82F6"; // Blue
    if (score >= 40) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  const getActionBadgeClass = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("BUY")) return "dna-pill-bullish";
    if (act.includes("ACCUMULATE")) return "dna-pill-accumulate";
    if (act.includes("AVOID") || act.includes("EXIT")) return "dna-pill-bearish";
    return "dna-pill-neutral";
  };

  return (
    <div className="dna-container">
      {/* Top Header */}
      <div className="dna-hero-header">
        <div className="dna-brand-badge">
          <Dna className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <span>QuantSync DNA · Algorithmic Decoder</span>
        </div>
        <h1 className="dna-main-title">
          Stock <em>DNA</em> Intelligence
        </h1>
        <p className="dna-subtitle">
          Decode 5-year multi-timeframe geometry, institutional swing pivots, and CMT execution cards across 1,318 Indian equities.
        </p>

        {/* Search Console */}
        <div className="dna-search-wrapper" ref={dropdownRef}>
          <div className="dna-search-box">
            <Search className="dna-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="dna-search-input"
              placeholder="Search stock (e.g. TATA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setIsDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  fetchStockDna(searchQuery);
                }
              }}
            />
            {searchQuery && (
              <button 
                className="dna-clear-btn" 
                onClick={() => { setSearchQuery(""); setSuggestions([]); }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <button 
              className="dna-submit-btn" 
              onClick={() => {
                if (searchQuery.trim()) fetchStockDna(searchQuery);
              }}
            >
              <Dna className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="dna-btn-text">Show DNA</span>
              <span className="dna-btn-text-mobile">DNA</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="dna-suggestions-popover">
              <div className="dna-suggestions-header">
                <span>Matching Equities in Database ({suggestions.length})</span>
                <span className="dna-popover-tag">stock_history.db</span>
              </div>
              <div className="dna-suggestions-list">
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    className="dna-suggestion-item"
                    onClick={() => {
                      setSearchQuery(s.symbol);
                      fetchStockDna(s.symbol);
                    }}
                  >
                    <div className="dna-sug-left">
                      <span className="dna-sug-symbol">{s.symbol}</span>
                      <span className="dna-sug-name">{s.name}</span>
                    </div>
                    <div className="dna-sug-right">
                      {s.candleCount && (
                        <span className="dna-sug-candles">{s.candleCount} bars</span>
                      )}
                      <span className="dna-sug-nse">NSE</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Ticker Chips */}
          <div className="dna-quick-chips">
            <span className="dna-chips-label">Quick Scan:</span>
            {QUICK_STOCKS.map((sym) => (
              <button
                key={sym}
                className={`dna-chip-btn ${selectedStock === sym ? "active" : ""}`}
                onClick={() => {
                  setSearchQuery(sym);
                  fetchStockDna(sym);
                }}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Step Radar Scanning Animation Console */}
      {isLoading && (
        <div className="dna-loading-card">
          <div className="dna-radar-sweep-container">
            <div className="dna-radar-sweep">
              <div className="dna-radar-line" />
            </div>
            <div className="dna-radar-icon">
              <Dna className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          </div>

          <div className="dna-scan-content">
            <div className="dna-scan-header">
              <span className="dna-scan-ticker">{selectedStock}</span>
              <span className="dna-scan-pct">{scanProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="dna-progress-track">
              <div 
                className="dna-progress-bar" 
                style={{ width: `${scanProgress}%` }} 
              />
            </div>

            {/* Steps Checklist */}
            <div className="dna-scan-steps">
              {SCAN_STEPS.map((step, idx) => {
                const isPast = idx < scanStep;
                const isCurrent = idx === scanStep;
                return (
                  <div 
                    key={idx} 
                    className={`dna-scan-step-item ${isPast ? "done" : isCurrent ? "active" : "pending"}`}
                  >
                    <div className="dna-step-dot">
                      {isPast ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <div className="dna-step-text">
                      <div className="dna-step-title">{step.title}</div>
                      <div className="dna-step-desc">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && !isLoading && (
        <div className="dna-error-card">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div className="dna-error-content">
            <div className="dna-error-title">Stock DNA Calculation Failed</div>
            <div className="dna-error-desc">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Full DNA Report Display */}
      {report && !isLoading && (
        <div className="dna-report-container">
          {/* Hero Stock Header */}
          <div className="dna-card dna-report-hero">
            <div className="dna-hero-top">
              <div className="dna-hero-info">
                <div className="dna-ticker-row">
                  <h2 className="dna-hero-ticker">{report.symbol}</h2>
                  <span className="dna-exchange-tag">NSE · Cash</span>
                </div>
                <div className="dna-company-title">{report.company_name}</div>
                <div className="dna-archetype-row">
                  <span className="dna-archetype-pill">{report.ui_report.dna_archetype}</span>
                </div>
                <div className="dna-price-row">
                  <span className="dna-current-price">₹{report.current_metrics.price.toLocaleString("en-IN")}</span>
                  <span className={`dna-metric-change ${report.current_metrics.dist_52w_pct >= -5 ? "up" : "neutral"}`}>
                    {report.current_metrics.dist_52w_pct >= 0 ? "+" : ""}{report.current_metrics.dist_52w_pct}% vs 52W High
                  </span>
                </div>
              </div>

              {/* Health Score Circular Meter pinned to right side on same line */}
              <div className="dna-health-meter">
                <div 
                  className="dna-score-circle" 
                  style={{ borderColor: getScoreColor(report.ui_report.dna_health_score) }}
                >
                  <span className="dna-score-num">{report.ui_report.dna_health_score}</span>
                  <span className="dna-score-max">/ 100</span>
                </div>
                <div className="dna-score-label">DNA Health Score</div>
                <div 
                  className="dna-score-badge"
                  style={{ color: getScoreColor(report.ui_report.dna_health_score) }}
                >
                  {report.ui_report.dna_health_score >= 70 ? "Strong Confluence" : report.ui_report.dna_health_score >= 50 ? "Balanced Neutral" : "Cautionary Setup"}
                </div>
              </div>
            </div>

            {/* Metric Strips */}
            <div className="dna-metrics-grid">
              <div className="dna-metric-box">
                <span className="dna-m-label">52-Week High</span>
                <span className="dna-m-val">₹{report.current_metrics.w52_high.toLocaleString("en-IN")}</span>
              </div>
              <div className="dna-metric-box">
                <span className="dna-m-label">52-Week Low</span>
                <span className="dna-m-val">₹{report.current_metrics.w52_low.toLocaleString("en-IN")}</span>
              </div>
              <div className="dna-metric-box">
                <span className="dna-m-label">200 EMA Benchmark</span>
                <span className="dna-m-val">₹{report.current_metrics.ema200.toLocaleString("en-IN")}</span>
              </div>
              <div className="dna-metric-box">
                <span className="dna-m-label">RSI (14 Daily)</span>
                <span className={`dna-m-val ${report.current_metrics.rsi >= 60 ? "up" : report.current_metrics.rsi <= 35 ? "down" : ""}`}>
                  {report.current_metrics.rsi}
                </span>
              </div>
              <div className="dna-metric-box">
                <span className="dna-m-label">Volume Multiple</span>
                <span className="dna-m-val">{report.current_metrics.volume_mult}× 20-DMA</span>
              </div>
              <div className="dna-metric-box">
                <span className="dna-m-label">Historical Data</span>
                <span className="dna-m-val">{report.current_metrics.candle_count} Daily Bars</span>
              </div>
            </div>
          </div>

          {/* Dual Layer: Beginner Story + Pro CMT Setup */}
          <div className="dna-grid-layers">
            {/* Beginner Layer: Plain-English Story */}
            <div className="dna-card dna-beginner-card">
              <div className="dna-section-header">
                <div className="dna-sec-title-box">
                  <Compass className="w-4 h-4 text-emerald-500" />
                  <h3>Beginner DNA Summary</h3>
                </div>
                <span className="dna-layer-badge">Plain English</span>
              </div>

              <div className="dna-narrative-list">
                <div className="dna-narrative-item">
                  <div className="dna-narrative-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                    📖
                  </div>
                  <div className="dna-narrative-body">
                    <div className="dna-n-title">What is happening right now</div>
                    <p className="dna-n-text">{report.ui_report.beginner_summary.what_is_happening}</p>
                  </div>
                </div>

                <div className="dna-narrative-item">
                  <div className="dna-narrative-icon" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }}>
                    🎯
                  </div>
                  <div className="dna-narrative-body">
                    <div className="dna-n-title">The Big Opportunity</div>
                    <p className="dna-n-text">{report.ui_report.beginner_summary.the_opportunity}</p>
                  </div>
                </div>

                <div className="dna-narrative-item">
                  <div className="dna-narrative-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" }}>
                    ⚠️
                  </div>
                  <div className="dna-narrative-body">
                    <div className="dna-n-title">The Primary Risk / Danger</div>
                    <p className="dna-n-text">{report.ui_report.beginner_summary.the_danger}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Layer: CMT Trade Execution Card */}
            <div className="dna-card dna-pro-card">
              <div className="dna-section-header">
                <div className="dna-sec-title-box">
                  <Crosshair className="w-4 h-4 text-indigo-500" />
                  <h3>Pro CMT Execution Terminal</h3>
                </div>
                <span className="dna-layer-badge pro">Institutional Quantitative</span>
              </div>

              <div className="dna-pro-details">
                <div className="dna-pro-spec-row">
                  <span className="dna-spec-k">Macro Secular Regime</span>
                  <span className="dna-spec-v">{report.ui_report.pro_analysis.macro_regime}</span>
                </div>
                <div className="dna-pro-spec-row">
                  <span className="dna-spec-k">Chart Pattern Detected</span>
                  <span className="dna-spec-v font-bold text-amber-500">{report.ui_report.pro_analysis.chart_pattern_detected}</span>
                </div>
                <div className="dna-pro-spec-row">
                  <span className="dna-spec-k">Momentum & Divergence</span>
                  <span className="dna-spec-v">{report.ui_report.pro_analysis.momentum_state}</span>
                </div>
                <div className="dna-pro-spec-row">
                  <span className="dna-spec-k">Key Breakout Trigger</span>
                  <span className="dna-spec-v">{report.ui_report.pro_analysis.key_triggers}</span>
                </div>
              </div>

              {/* Trade Blueprint Box */}
              <div className="dna-trade-blueprint">
                <div className="dna-trade-top">
                  <span className={`dna-action-pill ${getActionBadgeClass(report.ui_report.trade_execution_card.action)}`}>
                    {report.ui_report.trade_execution_card.action.replace(/_/g, " ")}
                  </span>
                  <span className="dna-rr-tag">R:R {report.ui_report.trade_execution_card.risk_to_reward_ratio}</span>
                </div>

                <div className="dna-trade-levels-grid">
                  <div className="dna-level-chip entry">
                    <span className="dna-lc-label">Recommended Entry</span>
                    <span className="dna-lc-val">{report.ui_report.trade_execution_card.entry_zone}</span>
                  </div>
                  <div className="dna-level-chip stop">
                    <span className="dna-lc-label">Stop-Loss (Invalidation)</span>
                    <span className="dna-lc-val">₹{report.ui_report.trade_execution_card.stop_loss.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="dna-level-chip target1">
                    <span className="dna-lc-label">Target 1 (Swing Move)</span>
                    <span className="dna-lc-val">₹{report.ui_report.trade_execution_card.target_1.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="dna-level-chip target2">
                    <span className="dna-lc-label">Target 2 (Macro Fib)</span>
                    <span className="dna-lc-val">₹{report.ui_report.trade_execution_card.target_2.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dual-Mode Chart Section (Interactive SVG + Analyst Snapshot Image) */}
          <div className="dna-card dna-chart-card">
            <div className="dna-section-header">
              <div className="dna-sec-title-box">
                <BarChart2 className="w-4 h-4 text-accent" />
                <h3>Algorithmic Price Geometry & Trendlines</h3>
              </div>

              {/* Perspective (Tactical vs Macro) + View Mode + Fullscreen Zoom */}
              <div className="dna-chart-header-actions">
                {/* Perspective Pill */}
                <div className="dna-chart-toggle-group perspective">
                  <button 
                    type="button"
                    className={`dna-chart-toggle-btn ${chartPerspective === "tactical" ? "active" : ""}`}
                    onClick={() => setChartPerspective("tactical")}
                    title="4-Month Precision Setup"
                  >
                    🎯 Tactical (4M)
                  </button>
                  <button 
                    type="button"
                    className={`dna-chart-toggle-btn ${chartPerspective === "macro" ? "active" : ""}`}
                    onClick={() => setChartPerspective("macro")}
                    title="1-Year Full Structural View"
                  >
                    🌐 Macro (1Y)
                  </button>
                </div>

                {/* View Mode Pill */}
                <div className="dna-chart-toggle-group">
                  <button 
                    type="button"
                    className={`dna-chart-toggle-btn ${chartViewMode === "interactive" ? "active" : ""}`}
                    onClick={() => setChartViewMode("interactive")}
                  >
                    <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
                    Interactive
                  </button>
                  <button 
                    type="button"
                    className={`dna-chart-toggle-btn ${chartViewMode === "snapshot" ? "active" : ""}`}
                    onClick={() => setChartViewMode("snapshot")}
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                    Snapshot
                  </button>
                </div>

                <button 
                  type="button"
                  className="dna-zoom-expand-btn"
                  onClick={() => {
                    setZoomScale(1);
                    setIsZoomOpen(true);
                  }}
                  title="Click to Zoom Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Zoom</span>
                </button>
              </div>
            </div>

            {/* Subheader Legend / Status */}
            <div className="dna-chart-subbar">
              {chartViewMode === "interactive" ? (
                <div className="dna-chart-legend">
                  <span className="dna-legend-item"><span className="dna-dot ema20" /> 20 EMA</span>
                  <span className="dna-legend-item"><span className="dna-dot ema50" /> 50 EMA</span>
                  {chartPerspective === "macro" && <span className="dna-legend-item"><span className="dna-dot ema200" /> 200 EMA</span>}
                  <span className="dna-legend-item"><span className="dna-dot trendline" /> Valid Pivot Ray</span>
                  <span className="dna-legend-item"><span className="dna-dot stop" /> Stop Loss</span>
                  <span className="dna-legend-item"><span className="dna-dot target" /> Target</span>
                </div>
              ) : (
                <div className="dna-snapshot-meta">
                  <span>{chartPerspective === "macro" ? "🌐 1-Year Structural History · Origin Swing Pivots · 200 EMA" : "🎯 4-Month Precision Setup · Active Candlesticks · Base Levels"}</span>
                </div>
              )}
              <div className="dna-chart-click-hint">
                <span>💡 Click chart to zoom fullscreen</span>
              </div>
            </div>

            {/* View Body */}
            {chartViewMode === "interactive" ? (
              <div className="dna-chart-viewport" onClick={() => setIsZoomOpen(true)}>
                {hoveredCandle && (
                  <div className="dna-chart-tooltip">
                    <span><strong>Date:</strong> {hoveredCandle.time}</span>
                    <span><strong>O:</strong> ₹{hoveredCandle.open}</span>
                    <span><strong>H:</strong> ₹{hoveredCandle.high}</span>
                    <span><strong>L:</strong> ₹{hoveredCandle.low}</span>
                    <span><strong>C:</strong> ₹{hoveredCandle.close}</span>
                    <span><strong>Vol:</strong> {hoveredCandle.volume.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <DnaCandleSvgChart 
                  candles={chartPerspective === "macro" ? report.chart_candles : report.chart_candles.slice(-85)}
                  stopLoss={report.ui_report.trade_execution_card.stop_loss}
                  targetPrice={report.ui_report.trade_execution_card.target_1}
                  currentPrice={report.current_metrics.price}
                  trendlines={report.chart_directives?.trendlines}
                  onHoverCandle={setHoveredCandle}
                  isMacro={chartPerspective === "macro"}
                />
              </div>
            ) : (
              <div className="dna-analyst-image-container" onClick={() => setIsZoomOpen(true)}>
                <img 
                  key={`${report.symbol}-${chartPerspective}`}
                  src={`${getApiBaseUrl()}/api/dna/chart/${report.symbol}?view=${chartPerspective}`}
                  alt={`${report.symbol} ${chartPerspective} Analyst Snapshot Chart`}
                  className="dna-analyst-img"
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.retried) {
                      target.dataset.retried = "1";
                      target.src = `/api/dna/chart/${report.symbol}?view=${chartPerspective}`;
                    }
                  }}
                />
                <div className="dna-analyst-overlay">
                  <div className="dna-analyst-badge">
                    <Maximize2 className="w-4 h-4 mr-2 text-accent" />
                    Click to Zoom Fullscreen
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Click-to-Zoom Lightbox Modal */}
          {isZoomOpen && (
            <div className="dna-lightbox-overlay" onClick={() => setIsZoomOpen(false)}>
              <div className="dna-lightbox-content" onClick={(e) => e.stopPropagation()}>
                {/* Lightbox Top Header */}
                <div className="dna-lightbox-header">
                  <div className="dna-lightbox-title">
                    <span className="dna-lb-sym">{report.symbol}</span>
                    <span className="dna-lb-name">{report.company_name}</span>
                    <span className="dna-lb-pattern">{report.ui_report.pro_analysis.chart_pattern_detected}</span>
                    <span className="dna-lb-score">Health {report.ui_report.dna_health_score}/100</span>
                  </div>

                  <div className="dna-lightbox-actions">
                    {/* Perspective Pill inside modal */}
                    <div className="dna-chart-toggle-group mini perspective">
                      <button 
                        type="button"
                        className={`dna-chart-toggle-btn ${chartPerspective === "tactical" ? "active" : ""}`}
                        onClick={() => setChartPerspective("tactical")}
                      >
                        Tactical (4M)
                      </button>
                      <button 
                        type="button"
                        className={`dna-chart-toggle-btn ${chartPerspective === "macro" ? "active" : ""}`}
                        onClick={() => setChartPerspective("macro")}
                      >
                        Macro (1Y)
                      </button>
                    </div>

                    {/* Zoom scale controls for Snapshot */}
                    {chartViewMode === "snapshot" && (
                      <div className="dna-zoom-controls">
                        <button 
                          type="button"
                          className="dna-btn-icon" 
                          onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.2))}
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="dna-zoom-val">{Math.round(zoomScale * 100)}%</span>
                        <button 
                          type="button"
                          className="dna-btn-icon" 
                          onClick={() => setZoomScale(prev => Math.min(2.5, prev + 0.2))}
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          className="dna-btn-icon" 
                          onClick={() => setZoomScale(1)}
                          title="Reset Zoom"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <a 
                          href={`${getApiBaseUrl()}/api/dna/chart/${report.symbol}?view=${chartPerspective}`}
                          download={`${report.symbol}_${chartPerspective}_QuantSync_Chart.png`}
                          className="dna-btn-icon" 
                          title="Download High-Res PNG"
                          target="_blank" 
                          rel="noreferrer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}

                    {/* View mode toggle inside lightbox */}
                    <div className="dna-chart-toggle-group mini">
                      <button 
                        type="button"
                        className={`dna-chart-toggle-btn ${chartViewMode === "interactive" ? "active" : ""}`}
                        onClick={() => setChartViewMode("interactive")}
                      >
                        Interactive
                      </button>
                      <button 
                        type="button"
                        className={`dna-chart-toggle-btn ${chartViewMode === "snapshot" ? "active" : ""}`}
                        onClick={() => setChartViewMode("snapshot")}
                      >
                        Snapshot
                      </button>
                    </div>

                    <button 
                      type="button"
                      className="dna-lightbox-close" 
                      onClick={() => setIsZoomOpen(false)} 
                      title="Close (Esc)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Lightbox Display Body */}
                <div className="dna-lightbox-body">
                  {chartViewMode === "snapshot" ? (
                    <div className="dna-lightbox-img-wrap">
                      <img 
                        key={`lb-${report.symbol}-${chartPerspective}`}
                        src={`${getApiBaseUrl()}/api/dna/chart/${report.symbol}?view=${chartPerspective}`}
                        alt={`${report.symbol} Fullscreen ${chartPerspective} Chart`} 
                        className="dna-lightbox-img"
                        style={{ transform: `scale(${zoomScale})` }}
                      />
                    </div>
                  ) : (
                    <div className="dna-lightbox-svg-wrap">
                      <DnaCandleSvgChart 
                        candles={chartPerspective === "macro" ? report.chart_candles : report.chart_candles.slice(-85)}
                        stopLoss={report.ui_report.trade_execution_card.stop_loss}
                        targetPrice={report.ui_report.trade_execution_card.target_1}
                        currentPrice={report.current_metrics.price}
                        trendlines={report.chart_directives?.trendlines}
                        onHoverCandle={() => {}}
                        height={550}
                        width={1100}
                        isMacro={chartPerspective === "macro"}
                      />
                    </div>
                  )}
                </div>

                {/* Lightbox Footer */}
                <div className="dna-lightbox-footer">
                  <div className="dna-lb-footer-left">
                    <span>Perspective: <strong>{chartPerspective === "macro" ? "Macro (1-Year)" : "Tactical (4-Month)"}</strong></span>
                    <span>Target 1: ₹{report.ui_report.trade_execution_card.target_1}</span>
                    <span>Stop Loss: ₹{report.ui_report.trade_execution_card.stop_loss}</span>
                    <span>Action: {report.ui_report.trade_execution_card.action}</span>
                  </div>
                  <div className="dna-lb-footer-right">
                    <span>Press <strong>ESC</strong> or click outside to close</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Created by QuantSync Attribution & Share Engine */}
          <div className="dna-card dna-share-card">
            <div className="dna-share-content">
              <div className="dna-share-brand">
                <div className="dna-brand-avatar">QS</div>
                <div>
                  <div className="dna-share-title">Created with Precision by <strong>QuantSync</strong></div>
                  <div className="dna-share-desc">Institutional Algorithmic & CMT Intelligence System</div>
                </div>
              </div>

              <div className="dna-share-actions">
                <button className="dna-share-btn" onClick={handleShare}>
                  {copyToast ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share DNA Report
                    </>
                  )}
                </button>

                <a 
                  className="dna-whatsapp-btn"
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🧬 QuantSync Stock DNA: ${report.symbol} (Score: ${report.ui_report.dna_health_score}/100) — ${report.ui_report.dna_archetype}. Full Report: https://rsitradingplatform.vercel.app/?tab=dna&symbol=${report.symbol}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>

                <a 
                  className="dna-external-btn"
                  href={`https://www.tradingview.com/chart/?symbol=NSE:${report.symbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  TradingView
                </a>
              </div>
            </div>

            {copyToast && (
              <div className="dna-toast-banner">
                ✓ Full Stock DNA analysis link copied to clipboard! Anyone opening the link will see this complete analysis.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Lightweight Interactive SVG Candlestick Chart Component with Valid Trendlines
function DnaCandleSvgChart({ 
  candles, 
  stopLoss, 
  targetPrice, 
  currentPrice,
  trendlines,
  onHoverCandle,
  width = 800,
  height = 300,
  isMacro = false
}: { 
  candles: any[]; 
  stopLoss: number; 
  targetPrice: number; 
  currentPrice: number;
  trendlines?: any[];
  onHoverCandle: (c: any) => void;
  width?: number;
  height?: number;
  isMacro?: boolean;
}) {
  if (!candles || candles.length === 0) {
    return <div className="p-4 text-center text-sm opacity-60">No candlestick data available.</div>;
  }

  const padding = { top: 22, right: 82, bottom: 28, left: 18 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Find min and max price across candles and key levels
  const allPrices = candles.flatMap(c => [c.high, c.low]).concat([stopLoss, targetPrice, currentPrice].filter(p => p > 0));
  const minP = Math.min(...allPrices) * 0.985;
  const maxP = Math.max(...allPrices) * 1.015;
  const priceRange = maxP - minP || 1;

  const getY = (price: number) => padding.top + plotH - ((price - minP) / priceRange) * plotH;
  const candleW = Math.max(1.8, Math.min(10, (plotW / candles.length) * 0.7));

  // Generate SVG path for EMA 20 and EMA 50
  const ema20Points = candles
    .map((c, i) => {
      if (!c.ema20) return null;
      const x = padding.left + (i + 0.5) * (plotW / candles.length);
      const y = getY(c.ema20);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  const ema50Points = candles
    .map((c, i) => {
      if (!c.ema50) return null;
      const x = padding.left + (i + 0.5) * (plotW / candles.length);
      const y = getY(c.ema50);
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  const ema200Points = isMacro
    ? candles
        .map((c, i) => {
          if (!c.ema200) return null;
          const x = padding.left + (i + 0.5) * (plotW / candles.length);
          const y = getY(c.ema200);
          return `${x},${y}`;
        })
        .filter(Boolean)
        .join(" ")
    : null;

  // Vertical relaxation collision resolver for right-side price badges
  const priceBadges: Array<{ id: string; label: string; origY: number; y: number; color: string; bg: string }> = [];
  if (targetPrice > 0) {
    const y = getY(targetPrice);
    priceBadges.push({ id: "target", label: `T1 ₹${Math.round(targetPrice)}`, origY: y, y, color: "#10B981", bg: "rgba(16, 185, 129, 0.18)" });
  }
  if (currentPrice > 0) {
    const y = getY(currentPrice);
    priceBadges.push({ id: "cmp", label: `CMP ₹${Math.round(currentPrice)}`, origY: y, y, color: "#38BDF8", bg: "rgba(56, 189, 248, 0.18)" });
  }
  if (stopLoss > 0) {
    const y = getY(stopLoss);
    priceBadges.push({ id: "sl", label: `SL ₹${Math.round(stopLoss)}`, origY: y, y, color: "#EF4444", bg: "rgba(239, 68, 68, 0.18)" });
  }

  // Sort top-to-bottom by y coordinate
  priceBadges.sort((a, b) => a.y - b.y);
  const minGap = 16;
  for (let i = 1; i < priceBadges.length; i++) {
    if (priceBadges[i].y - priceBadges[i - 1].y < minGap) {
      priceBadges[i].y = priceBadges[i - 1].y + minGap;
    }
  }
  for (let i = priceBadges.length - 1; i >= 0; i--) {
    if (priceBadges[i].y > height - padding.bottom - 2) {
      priceBadges[i].y = height - padding.bottom - 2;
      if (i > 0 && priceBadges[i].y - priceBadges[i - 1].y < minGap) {
        priceBadges[i - 1].y = priceBadges[i].y - minGap;
      }
    }
  }

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="dna-svg-chart"
      onMouseLeave={() => onHoverCandle(null)}
    >
      {/* Background horizontal grid lines & price ticks */}
      {[0.2, 0.4, 0.6, 0.8].map((pct, i) => {
        const y = padding.top + plotH * pct;
        const p = maxP - pct * priceRange;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <text x={width - padding.right + 6} y={y + 3.5} fill="var(--ink3)" fontSize="8.5" fontFamily="monospace">
              ₹{Math.round(p)}
            </text>
          </g>
        );
      })}

      {/* Shaded Target Profit Zone */}
      {targetPrice > currentPrice && (
        <rect
          x={padding.left + plotW * 0.75}
          y={getY(targetPrice)}
          width={plotW * 0.25}
          height={Math.max(2, getY(currentPrice) - getY(targetPrice))}
          fill="#10B981"
          fillOpacity="0.08"
          rx="3"
        />
      )}

      {/* Shaded Stop Loss Invalidation Zone */}
      {stopLoss > 0 && stopLoss < currentPrice && (
        <rect
          x={padding.left + plotW * 0.75}
          y={getY(currentPrice)}
          width={plotW * 0.25}
          height={Math.max(2, getY(stopLoss) - getY(currentPrice))}
          fill="#EF4444"
          fillOpacity="0.07"
          rx="3"
        />
      )}

      {/* Target Price Horizontal Line */}
      {targetPrice > 0 && (
        <line 
          x1={padding.left} 
          y1={getY(targetPrice)} 
          x2={width - padding.right} 
          y2={getY(targetPrice)} 
          stroke="#10B981" 
          strokeDasharray="4 4" 
          strokeWidth="1.2" 
        />
      )}

      {/* Current Price Line */}
      {currentPrice > 0 && (
        <line 
          x1={padding.left} 
          y1={getY(currentPrice)} 
          x2={width - padding.right} 
          y2={getY(currentPrice)} 
          stroke="#38BDF8" 
          strokeDasharray="2 3" 
          strokeWidth="1" 
          strokeOpacity="0.8"
        />
      )}

      {/* Stop Loss Horizontal Line */}
      {stopLoss > 0 && (
        <line 
          x1={padding.left} 
          y1={getY(stopLoss)} 
          x2={width - padding.right} 
          y2={getY(stopLoss)} 
          stroke="#EF4444" 
          strokeDasharray="4 4" 
          strokeWidth="1.2" 
        />
      )}

      {/* Candlesticks */}
      {candles.map((c, i) => {
        const x = padding.left + i * (plotW / candles.length) + (plotW / candles.length - candleW) / 2;
        const xMid = x + candleW / 2;
        const isBull = c.close >= c.open;
        const yOpen = getY(c.open);
        const yClose = getY(c.close);
        const yHigh = getY(c.high);
        const yLow = getY(c.low);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1.5, Math.abs(yOpen - yClose));
        const color = isBull ? "#10B981" : "#EF4444";

        return (
          <g 
            key={i} 
            className="dna-candle-group"
            onMouseEnter={() => onHoverCandle(c)}
          >
            {/* Wick */}
            <line x1={xMid} y1={yHigh} x2={xMid} y2={yLow} stroke={color} strokeWidth="1" opacity="0.8" />
            {/* Body */}
            <rect 
              x={x} 
              y={bodyTop} 
              width={candleW} 
              height={bodyH} 
              fill={color} 
              rx="0.6"
            />
          </g>
        );
      })}

      {/* EMA 20 line */}
      {ema20Points && (
        <polyline 
          points={ema20Points} 
          fill="none" 
          stroke="#3B82F6" 
          strokeWidth="1.5" 
          opacity="0.85" 
        />
      )}

      {/* EMA 50 line */}
      {ema50Points && (
        <polyline 
          points={ema50Points} 
          fill="none" 
          stroke="#F59E0B" 
          strokeWidth="1.5" 
          opacity="0.85" 
        />
      )}

      {/* EMA 200 line (Macro View) */}
      {ema200Points && (
        <polyline 
          points={ema200Points} 
          fill="none" 
          stroke="#8B5CF6" 
          strokeWidth="1.6" 
          opacity="0.9" 
        />
      )}

      {/* Strictly 1-2 Valid Diagonal Mathematical Trendlines with Midpoint Anti-Collision Badges */}
      {trendlines && trendlines.slice(0, 2).map((tl: any, i: number) => {
        if (!tl.p1 || !tl.p2 || !tl.p1.date || !tl.p2.date) return null;
        const dt1 = new Date(tl.p1.date).getTime();
        const dt2 = new Date(tl.p2.date).getTime();
        const daysSpan = (dt2 - dt1) / 86400000;
        if (!daysSpan || isNaN(daysSpan)) return null;
        const pricePerDay = (tl.p2.price - tl.p1.price) / daysSpan;

        const firstCandleTime = new Date(candles[0].time).getTime();
        const startDt = Math.max(dt1, firstCandleTime);

        let startIdx = 0;
        for (let cIdx = 0; cIdx < candles.length; cIdx++) {
          if (new Date(candles[cIdx].time).getTime() >= startDt) {
            startIdx = cIdx;
            break;
          }
        }
        const endIdx = candles.length - 1;
        if (endIdx <= startIdx) return null;

        const startPrice = tl.p2.price + pricePerDay * ((new Date(candles[startIdx].time).getTime() - dt2) / 86400000);
        const endPrice = tl.p2.price + pricePerDay * ((new Date(candles[endIdx].time).getTime() - dt2) / 86400000);

        const x1 = padding.left + (startIdx + 0.5) * (plotW / candles.length);
        const y1 = getY(startPrice);
        const x2 = padding.left + (endIdx + 0.5) * (plotW / candles.length);
        const y2 = getY(endPrice);

        const strokeColor = tl.color || (tl.type === 'support' ? '#10B981' : '#EF4444');
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const labelText = tl.label || (tl.type === 'support' ? 'Ascending Support' : 'Structural Resistance');
        const pillW = Math.min(140, labelText.length * 5.8 + 14);

        return (
          <g key={`tl-${i}`} className="dna-svg-trendline">
            {/* Glow underlay */}
            <line 
              x1={x1} y1={y1} x2={x2} y2={y2} 
              stroke={strokeColor} 
              strokeWidth="4" 
              strokeOpacity="0.2" 
            />
            {/* Crisp ray */}
            <line 
              x1={x1} y1={y1} x2={x2} y2={y2} 
              stroke={strokeColor} 
              strokeWidth="1.8" 
              strokeDasharray={tl.type === 'resistance' ? '5 3' : 'none'}
            />
            {/* Midpoint Pill Box — Completely avoids colliding with right price margin */}
            <rect 
              x={midX - pillW / 2}
              y={midY - 8}
              width={pillW}
              height={15}
              rx="4"
              fill="#0B0E14"
              stroke={strokeColor}
              strokeWidth="1.1"
              opacity="0.95"
            />
            <text 
              x={midX} 
              y={midY + 3} 
              fill={strokeColor} 
              fontSize="7.8" 
              fontWeight="bold" 
              textAnchor="middle"
              fontFamily="monospace"
            >
              {labelText}
            </text>
          </g>
        );
      })}

      {/* Collision-Free Right-Side Price Badges */}
      {priceBadges.map((badge) => {
        const isDisplaced = Math.abs(badge.y - badge.origY) > 2;
        const badgeW = padding.right - 8;
        return (
          <g key={`badge-${badge.id}`} className="dna-price-badge">
            {isDisplaced && (
              <line 
                x1={width - padding.right} 
                y1={badge.origY} 
                x2={width - padding.right + 4} 
                y2={badge.y} 
                stroke={badge.color} 
                strokeWidth="1" 
                strokeDasharray="2 2" 
                opacity="0.6" 
              />
            )}
            <rect 
              x={width - padding.right + 4} 
              y={badge.y - 7} 
              width={badgeW} 
              height={14} 
              rx="3" 
              fill="#0B0E14" 
              stroke={badge.color} 
              strokeWidth="1" 
            />
            <text 
              x={width - padding.right + 8} 
              y={badge.y + 3.5} 
              fill={badge.color} 
              fontSize="8.5" 
              fontWeight="bold" 
              fontFamily="monospace"
            >
              {badge.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
