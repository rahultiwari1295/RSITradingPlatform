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
    stance?: "BULLISH" | "NEUTRAL" | "BEARISH" | string;
    action_title?: string;
    why_buy_reasons?: string[];
    why_avoid_reasons?: string[];
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
      volume_footprint?: string;
      fibonacci_confluence?: string;
    };
    trade_execution_card: {
      action: string;
      action_title?: string;
      stance?: string;
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
  const [chartPerspective, setChartPerspective] = useState<"tactical" | "macro">("tactical");
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const docTheme = document.documentElement.dataset.theme as "light" | "dark";
      if (docTheme) return docTheme;
      const stored = localStorage.getItem("theme") as "light" | "dark";
      if (stored) return stored;
    }
    return "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateTheme = () => {
      const docTheme = (document.documentElement.dataset.theme as "light" | "dark") || 
                        (localStorage.getItem("theme") as "light" | "dark") || 
                        "light";
      setCurrentTheme(docTheme);
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoTranslate, setPhotoTranslate] = useState({ x: 0, y: 0 });

  const touchState = useRef({
    initialDist: 0,
    initialScale: 1,
    startX: 0,
    startY: 0,
    initialTransX: 0,
    initialTransY: 0,
    lastTap: 0,
    isPinching: false,
    isDragging: false,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchState.current.initialDist = dist;
      touchState.current.initialScale = photoScale;
      touchState.current.isPinching = true;
      touchState.current.isDragging = false;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - touchState.current.lastTap < 300) {
        if (photoScale > 1.2) {
          setPhotoScale(1);
          setPhotoTranslate({ x: 0, y: 0 });
        } else {
          setPhotoScale(2.5);
        }
        touchState.current.lastTap = 0;
        return;
      }
      touchState.current.lastTap = now;
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
      touchState.current.initialTransX = photoTranslate.x;
      touchState.current.initialTransY = photoTranslate.y;
      touchState.current.isDragging = photoScale > 1;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchState.current.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / (touchState.current.initialDist || 1);
      const nextScale = Math.min(5, Math.max(1, touchState.current.initialScale * ratio));
      setPhotoScale(nextScale);
      if (nextScale <= 1.05) {
        setPhotoTranslate({ x: 0, y: 0 });
      }
    } else if (touchState.current.isDragging && e.touches.length === 1 && photoScale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchState.current.startX;
      const dy = e.touches[0].clientY - touchState.current.startY;
      setPhotoTranslate({
        x: touchState.current.initialTransX + dx,
        y: touchState.current.initialTransY + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    touchState.current.isPinching = false;
    touchState.current.isDragging = false;
    if (photoScale < 1.08) {
      setPhotoScale(1);
      setPhotoTranslate({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setPhotoScale(prev => {
      const next = Math.min(5, Math.max(1, Math.round((prev + delta) * 100) / 100));
      if (next <= 1) {
        setPhotoTranslate({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleDoubleClick = () => {
    if (photoScale > 1.2) {
      setPhotoScale(1);
      setPhotoTranslate({ x: 0, y: 0 });
    } else {
      setPhotoScale(2.5);
    }
  };

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
                {report.ui_report.pro_analysis.volume_footprint && (
                  <div className="dna-pro-spec-row">
                    <span className="dna-spec-k">Volume & VSA Footprint</span>
                    <span className="dna-spec-v">{report.ui_report.pro_analysis.volume_footprint}</span>
                  </div>
                )}
                {report.ui_report.pro_analysis.fibonacci_confluence && (
                  <div className="dna-pro-spec-row">
                    <span className="dna-spec-k">Fibonacci Confluence</span>
                    <span className="dna-spec-v font-mono">{report.ui_report.pro_analysis.fibonacci_confluence}</span>
                  </div>
                )}
                <div className="dna-pro-spec-row">
                  <span className="dna-spec-k">Key Breakout Trigger</span>
                  <span className="dna-spec-v">{report.ui_report.pro_analysis.key_triggers}</span>
                </div>
              </div>

              {/* Trade Blueprint Box */}
              <div className="dna-trade-blueprint">
                <div className="dna-trade-top">
                  <span className={`dna-action-pill ${getActionBadgeClass(report.ui_report.trade_execution_card.action)}`}>
                    {report.ui_report.trade_execution_card.action_title || report.ui_report.trade_execution_card.action.replace(/_/g, " ")}
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

          {/* Dual Perspective: Why to Enter (Conviction) vs Why to Avoid / Invalidation Risks */}
          {((report.ui_report.why_buy_reasons && report.ui_report.why_buy_reasons.length > 0) || 
            (report.ui_report.why_avoid_reasons && report.ui_report.why_avoid_reasons.length > 0)) && (
            <div className="dna-dual-reasons-grid">
              {/* Bullish Conviction Catalysts */}
              <div className="dna-card dna-reason-card buy">
                <div className="dna-reason-header buy">
                  <div className="dna-reason-title-box">
                    <span className="dna-reason-badge buy">🎯 CONVICTION CATALYSTS</span>
                    <h4>Why to Enter / Trade Thesis</h4>
                  </div>
                </div>
                <ul className="dna-reason-list">
                  {(report.ui_report.why_buy_reasons || []).map((reason, idx) => (
                    <li key={idx} className="dna-reason-item buy">
                      <span className="dna-reason-bullet buy">✓</span>
                      <span className="dna-reason-text">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risk Hazards & Invalidation Triggers */}
              <div className="dna-card dna-reason-card avoid">
                <div className="dna-reason-header avoid">
                  <div className="dna-reason-title-box">
                    <span className="dna-reason-badge avoid">⚠️ RISK HAZARDS & HURDLES</span>
                    <h4>Why to Avoid / Obstacles & Traps</h4>
                  </div>
                </div>
                <ul className="dna-reason-list">
                  {(report.ui_report.why_avoid_reasons || []).map((reason, idx) => (
                    <li key={idx} className="dna-reason-item avoid">
                      <span className="dna-reason-bullet avoid">✕</span>
                      <span className="dna-reason-text">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Institutional Technical Snapshot Chart (Tactical 4M vs Macro 1Y) */}
          <div className="dna-card dna-chart-card">
            <div className="dna-section-header">
              <div className="dna-sec-title-box">
                <ImageIcon className="w-4 h-4 text-accent" />
                <h3>Institutional Technical Chart</h3>
              </div>

              {/* Perspective (Tactical vs Macro) */}
              <div className="dna-chart-header-actions">
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
              </div>
            </div>

            {/* Subheader Status */}
            <div className="dna-chart-subbar">
              <div className="dna-snapshot-meta">
                <span>{chartPerspective === "macro" ? "🌐 1-Year Structural History · Origin Swing Pivots · 200 EMA" : "🎯 4-Month Precision Setup · Active Candlesticks · Base Levels"}</span>
              </div>
              <div className="dna-chart-click-hint">
                <span>💡 Click image to open fullscreen & zoom</span>
              </div>
            </div>

            {/* Snapshot Image Display */}
            <div 
              className="dna-analyst-image-container" 
              onClick={() => {
                setPhotoScale(1);
                setPhotoTranslate({ x: 0, y: 0 });
                setIsZoomOpen(true);
              }}
              title="Click to open photo"
            >
              <img 
                key={`${report.symbol}-${chartPerspective}-${currentTheme}`}
                src={`${getApiBaseUrl()}/api/dna/chart/${report.symbol}?view=${chartPerspective}&theme=${currentTheme}`}
                alt={`${report.symbol} ${chartPerspective} Analyst Snapshot Chart`}
                className="dna-analyst-img"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.retried) {
                    target.dataset.retried = "1";
                    target.src = `/api/dna/chart/${report.symbol}?view=${chartPerspective}&theme=${currentTheme}`;
                  }
                }}
              />
              <div className="dna-analyst-overlay">
                <div className="dna-analyst-badge">
                  <Maximize2 className="w-4 h-4 mr-2 text-accent" />
                  Click to Open
                </div>
              </div>
            </div>
          </div>

          {/* Pure Fullscreen Photo Viewer — ONLY the image and a fixed close button */}
          {isZoomOpen && (
            <div 
              className="dna-photo-fullscreen-viewer"
              onClick={() => setIsZoomOpen(false)}
            >
              {/* Single Fixed Close Button: Always in top-right corner, stays fixed even when zooming */}
              <button 
                type="button" 
                className="dna-photo-fixed-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomOpen(false);
                }}
                aria-label="Close Photo"
                title="Close (Esc)"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Pure Photo Viewport: Supports 2-finger pinch zoom, dragging, double tap & wheel */}
              <div 
                className="dna-photo-container"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setIsZoomOpen(false);
                  }
                }}
              >
                <img 
                  key={`pv-${report.symbol}-${chartPerspective}-${currentTheme}`}
                  src={`${getApiBaseUrl()}/api/dna/chart/${report.symbol}?view=${chartPerspective}&theme=${currentTheme}`}
                  alt={`${report.symbol} ${chartPerspective} Chart`} 
                  className="dna-pure-photo"
                  style={{
                    transform: `translate3d(${photoTranslate.x}px, ${photoTranslate.y}px, 0) scale(${photoScale})`,
                    transition: touchState.current.isPinching || touchState.current.isDragging ? "none" : "transform 0.18s ease-out"
                  }}
                  draggable={false}
                />
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

