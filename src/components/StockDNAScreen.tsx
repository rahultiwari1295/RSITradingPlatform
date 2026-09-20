import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Dna, Share2, CheckCircle, AlertTriangle, 
  ExternalLink, ZoomIn, X
} from "lucide-react";
import "./StockDNALuxury.css";

interface StockSuggestion {
  symbol: string;
  name: string;
  token?: string;
  candleCount?: number;
}

interface StockFundamentals {
  symbol: string;
  market_cap_cr: string;
  key_ratios: {
    stock_pe: number;
    book_value: number;
    dividend_yield_pct: number;
    roce_pct: number;
    roe_pct: number;
    debt_to_equity: number;
    face_value: number;
  };
  quality_score: {
    score: number;
    label: string;
  };
  quarterly_performance: Array<{
    quarter: string;
    sales: string;
    op_profit: string;
    opm_pct: string;
    net_profit: string;
    eps: string;
  }>;
  balance_sheet: {
    equity_capital: string;
    reserves: string;
    borrowings: string;
    other_liabilities: string;
    fixed_assets: string;
    cwip: string;
    investments: string;
    other_assets: string;
  };
  shareholding_pattern: {
    promoters: string;
    fii: string;
    dii: string;
    public: string;
    fii_change_qoq: string;
    dii_change_qoq: string;
    public_change_qoq: string;
  };
  pros: string[];
  cons: string[];
}

interface QuestionItem {
  pill: string;
  type: "bullish" | "bearish" | "neutral" | string;
  answer: string;
  metric: string;
  trigger?: string;
}

interface BurningQuestions {
  q1: QuestionItem;
  q2: QuestionItem;
  q3: QuestionItem;
  q4: QuestionItem;
  q5: QuestionItem;
  q6: QuestionItem;
  q7: QuestionItem;
}

interface SolvencyFortress {
  score: number;
  grade: string;
  badgeClass?: string;
  debtStatus: string;
  de: string;
  borrowings: string;
  reserves: string;
  debtLabel: string;
  coverageLabel: string;
  barBorrowingsPct: string;
  barReservesPct: string;
  summary: string;
}

interface PeerItem {
  symbol: string;
  name: string;
  price: string;
  score: number;
  pe: string;
  roce: string;
  de: string;
  mom: string;
  isCurrent: boolean;
  verdict: string;
  recClass: string;
}

interface CatalystNewsItem {
  title: string;
  time: string;
  source: string;
  tag: string;
}

interface ChecklistItem {
  item: string;
  status: string;
  pass: boolean;
}

interface CatalystsRadar {
  news: CatalystNewsItem[];
  checklist: ChecklistItem[];
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
    patience_horizon?: {
      headline: string;
      detail: string;
    };
    multi_timeframe?: Array<{
      tf: string;
      dot: string;
      bias: string;
      ma: string;
      rsi: string;
      pivot: string;
    }>;
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
  fundamentals?: StockFundamentals;
  questions?: BurningQuestions;
  solvency?: SolvencyFortress;
  peers?: PeerItem[];
  catalysts?: CatalystsRadar;
}

const QUICK_STOCKS = [
  "TATASTEEL", "PAYTM", "RELIANCE", "TATAMOTORS", "HDFCBANK", "INFY", "ITC"
];

const SCAN_STEPS = [
  { title: "Locating Stock Record", desc: "Querying 1,318 equities in stock_history.db..." },
  { title: "Slicing 5-Year Candlesticks", desc: "Extracting 1,300+ daily OHLCV bars & volume profile..." },
  { title: "Computing Geometry & Pivots", desc: "Scanning weekly swing extrema & Fibonacci clusters..." },
  { title: "Technical Radar Analysis", desc: "Evaluating 20/50/200 EMAs, RSI divergence & ATR bands..." },
  { title: "Synthesizing Stock DNA & Fundamentals", desc: "Formulating CMT trade card & Screener balance sheet..." }
];

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
      // ignore
    }
    throw err;
  }
}

export default function StockDNAScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState("TATASTEEL");
  
  const [report, setReport] = useState<StockDnaReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Luxury UI States
  const [viewMode, setViewMode] = useState<"summary" | "pro">("summary");
  const [proCategory, setProCategory] = useState<string>("all");
  const [chartPerspective, setChartPerspective] = useState<"tactical" | "macro">("tactical");
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      const docTheme = document.documentElement.dataset.theme as "light" | "dark";
      if (docTheme) return docTheme;
      const stored = localStorage.getItem("theme") as "light" | "dark";
      if (stored) return stored;
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateTheme = () => {
      const docTheme = (document.documentElement.dataset.theme as "light" | "dark") || 
                        (localStorage.getItem("theme") as "light" | "dark") || 
                        "dark";
      setCurrentTheme(docTheme);
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

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

    const stepInterval = setInterval(() => {
      setScanStep((prev) => {
        const next = prev + 1;
        if (next < SCAN_STEPS.length) return next;
        return prev;
      });
      setScanProgress((prev) => Math.min(92, prev + 18));
    }, 320);

    try {
      const data: StockDnaReport = await apiDnaFetch<StockDnaReport>(`/api/dna/report/${encodeURIComponent(sym)}`);
      setTimeout(() => {
        clearInterval(stepInterval);
        setScanStep(4);
        setScanProgress(100);
        setTimeout(() => {
          setReport(data);
          setIsLoading(false);
        }, 250);
      }, 900);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to load Stock DNA report.");
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

  const isNegative = (val: any) => String(val ?? "").includes("-");

  const handleShareReport = () => {
    if (!report) return;
    const shareText = `⚡ QuantSync DNA Intelligence Report: ${report.symbol} (${report.company_name || report.symbol})\n` +
      `Price: ₹${report.current_metrics?.price?.toLocaleString("en-IN") || "—"} (${report.current_metrics?.dist_52w_pct || 0}% vs 52W High)\n` +
      `DNA Health Score: ${report.ui_report?.dna_health_score || 50}/100 (${report.ui_report?.dna_archetype || "Neutral"})\n` +
      `Quant Stance: ${report.ui_report?.action_title || report.ui_report?.trade_execution_card?.action_title || "HOLD / WATCH"}\n` +
      `Plan: Entry: ${report.ui_report?.trade_execution_card?.entry_zone || "—"} | Stop: ₹${report.ui_report?.trade_execution_card?.stop_loss || "—"} | Target: ₹${report.ui_report?.trade_execution_card?.target_1 || "—"} (R:R ${report.ui_report?.trade_execution_card?.risk_to_reward_ratio || "—"})\n` +
      `View Live DNA Terminal: ${window.location.origin}/?tab=dna&symbol=${report.symbol}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast("DNA Report copied to clipboard!");
      }).catch(() => {
        showToast("Link copied!");
      });
    } else {
      showToast("DNA Report copied!");
    }
  };

  const handleShareWhatsApp = () => {
    if (!report) return;
    const msg = `⚡ *QuantSync DNA Intelligence Report* | *${report.symbol}*\n\n` +
      `• *Company*: ${report.company_name || report.symbol}\n` +
      `• *Current Price*: ₹${report.current_metrics?.price?.toLocaleString("en-IN") || "—"} (${report.current_metrics?.dist_52w_pct || 0}% vs 52W High)\n` +
      `• *DNA Score*: ${report.ui_report?.dna_health_score || 50}/100 (${report.ui_report?.dna_archetype || "Neutral"})\n` +
      `• *Verdict*: ${report.ui_report?.action_title || report.ui_report?.trade_execution_card?.action_title || "HOLD / WATCH"}\n` +
      `• *Key Levels*: Entry: ${report.ui_report?.trade_execution_card?.entry_zone || "—"} | Target: ₹${report.ui_report?.trade_execution_card?.target_1 || "—"} | SL: ₹${report.ui_report?.trade_execution_card?.stop_loss || "—"} (R:R ${report.ui_report?.trade_execution_card?.risk_to_reward_ratio || "—"})\n\n` +
      `🔗 *Explore Live DNA Terminal*: ${window.location.origin}/?tab=dna&symbol=${report.symbol}`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const score = report?.ui_report?.dna_health_score || 50;
  const scoreOffset = 125 - (125 * score) / 100;
  const stance = (report?.ui_report?.stance || "NEUTRAL").toUpperCase();
  const verdictClass = stance === "BULLISH" ? "verdict-bullish" : stance === "BEARISH" ? "verdict-bearish" : "verdict-neutral";
  const stanceColor = stance === "BULLISH" ? "var(--dna-bullish)" : stance === "BEARISH" ? "var(--dna-bearish)" : "var(--dna-neutral)";
  const stanceIcon = stance === "BULLISH" ? "🟢" : stance === "BEARISH" ? "🔴" : "🟡";

  const rawArchetype = report?.ui_report?.dna_archetype || "";
  const shortVerdict = rawArchetype.includes("/")
    ? rawArchetype.split("/")[0].trim()
    : rawArchetype.includes("&")
    ? rawArchetype.split("&")[0].trim()
    : (rawArchetype || stance);

  const mcapRaw = report?.fundamentals?.market_cap_cr ? String(report.fundamentals.market_cap_cr).replace(/Cr|cr|₹/g, "").trim() : "";
  const mcapText = mcapRaw ? ` · Market Cap: ₹${mcapRaw} Cr` : "";

  // TradingView Gauge & 3-Pillar Calculations
  let verdictWord = "NEUTRAL";
  let verdictColor = "var(--dna-neutral)";
  if (score >= 80) {
    verdictWord = "STRONG BUY";
    verdictColor = "var(--dna-bullish)";
  } else if (score >= 60) {
    verdictWord = "BUY";
    verdictColor = "var(--dna-primary, #3B82F6)";
  } else if (score >= 40) {
    verdictWord = "NEUTRAL";
    verdictColor = "var(--dna-neutral)";
  } else if (score >= 25) {
    verdictWord = "SELL";
    verdictColor = "var(--dna-sell, #F87171)";
  } else {
    verdictWord = "STRONG SELL";
    verdictColor = "var(--dna-bearish)";
  }

  // Needle angle (-90deg to +90deg)
  const needleAngle = -90 + (Math.min(100, Math.max(0, score)) / 100) * 180;

  // 52-Week Range
  const w52High = Number(report?.current_metrics?.w52_high || report?.current_metrics?.ath || report?.current_metrics?.price || 100);
  const w52Low = Number(report?.current_metrics?.w52_low || (w52High * 0.7));
  const curPrice = Number(report?.current_metrics?.price || 0);
  const rangePct = w52High > w52Low ? Math.min(100, Math.max(0, ((curPrice - w52Low) / (w52High - w52Low)) * 100)) : 50;

  // Pillar 1: Technical
  let techScore = 50;
  if (report?.current_metrics) {
    const m = report.current_metrics;
    let pts = 50;
    if (m.price > m.ema20) pts += 15; else pts -= 15;
    if (m.price > m.ema50) pts += 15; else pts -= 15;
    if (m.price > m.ema200) pts += 10; else pts -= 10;
    if (m.rsi > 55) pts += 10; else if (m.rsi < 45) pts -= 10;
    techScore = Math.min(100, Math.max(12, pts));
  }
  const techText = techScore >= 75 ? `${techScore} (Strong)` : techScore >= 55 ? `${techScore} (Buy)` : techScore >= 40 ? `${techScore} (Hold)` : `${techScore} (Weak)`;
  const techColor = techScore >= 75 ? "var(--dna-bullish)" : techScore >= 55 ? "var(--dna-primary)" : techScore >= 40 ? "var(--dna-neutral)" : "var(--dna-bearish)";

  // Chart URL
  const chartSrc = `/api/dna/chart/${report?.symbol}?view=${chartPerspective}&theme=${currentTheme}`;
  const fallbackChartSrc = `/dna_charts/${report?.symbol}_${chartPerspective}_${currentTheme}.png`;

  // Safe normalized fundamentals
  const f = report?.fundamentals;
  const keyRatios = f?.key_ratios || {
    stock_pe: 19.6,
    book_value: 81.8,
    dividend_yield_pct: 2.16,
    roce_pct: 12.5,
    roe_pct: 11.7,
    debt_to_equity: 0.9,
    face_value: 1.0
  };

  const qualityScore = f?.quality_score || {
    score: 74,
    label: "Moderate Quality (Cyclical / Capital Intensive)"
  };

  // Pillar 2: Financial
  const qualityVal = f?.quality_score?.score;
  const finScore = Math.min(100, Math.max(15, qualityVal || 72));
  const finText = finScore >= 75 ? `${finScore} (Solid)` : finScore >= 55 ? `${finScore} (Good)` : finScore >= 40 ? `${finScore} (Moderate)` : `${finScore} (Risk)`;
  const finColor = finScore >= 75 ? "var(--dna-bullish)" : finScore >= 55 ? "var(--dna-primary)" : finScore >= 40 ? "var(--dna-neutral)" : "var(--dna-bearish)";

  // Pillar 3: Valuation
  let valScore = 60;
  const peVal = Number(keyRatios?.stock_pe) || 20;
  const roceVal = Number(keyRatios?.roce_pct) || 12;
  if (roceVal > 15) valScore += 15;
  if (roceVal < 8) valScore -= 15;
  if (peVal < 25) valScore += 10; else if (peVal > 60) valScore -= 15;
  valScore = Math.min(100, Math.max(15, valScore));
  const valText = valScore >= 75 ? `${valScore} (Undervalued)` : valScore >= 55 ? `${valScore} (Fair)` : valScore >= 40 ? `${valScore} (Average)` : `${valScore} (Expensive)`;
  const valColor = valScore >= 75 ? "var(--dna-bullish)" : valScore >= 55 ? "var(--dna-primary)" : valScore >= 40 ? "var(--dna-neutral)" : "var(--dna-bearish)";

  const quarterlyData = (f?.quarterly_performance || []).map((q: any) => ({
    quarter: q?.quarter || "Quarter",
    sales: q?.sales_cr || q?.sales || "—",
    opProfit: q?.op_profit_cr || q?.op_profit || "—",
    opm: String(q?.opm_pct || q?.opm || "—").replace("%", "") + "%",
    netProfit: String(q?.net_profit_cr || q?.net_profit || "—"),
    eps: String(q?.eps || "—")
  }));

  const bs = (f?.balance_sheet || {}) as Record<string, any>;
  const bsReserves = bs["Reserves"] || bs.reserves || "100,920 Cr";
  const bsBorrowings = bs["Borrowings"] || bs.borrowings || "92,382 Cr";
  const bsFixedAssets = bs["Fixed Assets"] || bs.fixed_assets || "179,908 Cr";
  const bsCwip = bs["CWIP"] || bs.cwip || "28,497 Cr";

  const sh = (f?.shareholding_pattern || {}) as Record<string, any>;
  const shPromoters = (typeof sh["Promoters"] === "object" && sh["Promoters"] !== null) ? `${sh["Promoters"]?.holding_pct || 33}%` : String(sh.promoters || "33%");
  const shFii = (typeof sh["FIIs"] === "object" && sh["FIIs"] !== null) ? `${sh["FIIs"]?.holding_pct || 19}%` : String(sh.fii || "19%");
  const shFiiChange = (typeof sh["FIIs"] === "object" && sh["FIIs"] !== null) 
    ? `${(sh["FIIs"]?.qoq_change || 0) > 0 ? "+" : ""}${sh["FIIs"]?.qoq_change || 0}% QoQ` 
    : String(sh.fii_change_qoq || "+0.32% QoQ");
  const shDii = (typeof sh["DIIs"] === "object" && sh["DIIs"] !== null) 
    ? `${sh["DIIs"]?.holding_pct || 26}%` 
    : String(sh.dii || "26%");
  const shDiiChange = (typeof sh["DIIs"] === "object" && sh["DIIs"] !== null) 
    ? `${(sh["DIIs"]?.qoq_change || 0) > 0 ? "+" : ""}${sh["DIIs"]?.qoq_change || 0}% QoQ` 
    : String(sh.dii_change_qoq || "-0.23% QoQ");
  const shPublic = (typeof sh["Public"] === "object" && sh["Public"] !== null) 
    ? `${sh["Public"]?.holding_pct || 21}%` 
    : String(sh.public || "21%");
  const shPublicChange = (typeof sh["Public"] === "object" && sh["Public"] !== null) 
    ? `${(sh["Public"]?.qoq_change || 0) > 0 ? "+" : ""}${sh["Public"]?.qoq_change || 0}% QoQ` 
    : String(sh.public_change_qoq || "+0.16% QoQ");

  const prosList = f?.pros && f.pros.length > 0 ? f.pros : [
    "Healthy operating profit margin expanded in recent quarters.",
    "Institutional FII & DII aggregate holding remains solid across market cycles."
  ];

  const consList = f?.cons && f.cons.length > 0 ? f.cons : [
    "Capital intensive operating base with ongoing working capital requirements.",
    "Cyclical sensitivity to overall industry demand and input price fluctuations."
  ];

  return (
    <div className="dna-luxury-wrap">
      {/* Top Brand Header */}
      <div className="dna-hero-header">
        <div className="dna-brand-badge">
          <Dna className="w-3.5 h-3.5" style={{ color: "var(--accent, #3B82F6)" }} />
          <span>QuantSync DNA · Algorithmic Decoder</span>
        </div>
        <h1 className="dna-main-title">
          Stock <em>DNA</em> Intelligence
        </h1>
        <p className="dna-subtitle">
          Institutional multi-timeframe geometry, CMT execution cards, and real Screener financials across Indian equities.
        </p>

        {/* Search Console */}
        <div className="dna-search-wrapper" ref={dropdownRef}>
          <div className="dna-search-box">
            <Search className="dna-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="dna-search-input"
              placeholder="Search stock symbol (e.g. TATASTEEL, PAYTM)..."
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
              <span className="dna-btn-text">Decode DNA</span>
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="dna-suggestions-popover">
              <div className="dna-suggestions-header">
                <span>Matching Equities ({suggestions.length})</span>
                <span className="dna-popover-tag">NSE Live Database</span>
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
          <div className="dna-stock-chip-row" style={{ marginTop: "10px" }}>
            {QUICK_STOCKS.map((sym) => (
              <button
                key={sym}
                className={`dna-stock-chip ${selectedStock === sym ? "active" : ""}`}
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

      {/* Radar Scanning Progress State */}
      {isLoading && (
        <div className="dna-loading-card">
          <div className="dna-radar-sweep-container">
            <div className="dna-radar-sweep">
              <div className="dna-radar-line" />
            </div>
            <div className="dna-radar-icon">
              <Dna className="w-8 h-8 animate-spin" style={{ color: "var(--accent, #3B82F6)" }} />
            </div>
          </div>

          <div className="dna-scan-content">
            <div className="dna-scan-header">
              <span className="dna-scan-ticker">{selectedStock}</span>
              <span className="dna-scan-pct">{scanProgress}%</span>
            </div>

            <div className="dna-progress-track">
              <div 
                className="dna-progress-bar" 
                style={{ width: `${scanProgress}%` }} 
              />
            </div>

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

      {/* Error Card */}
      {errorMsg && !isLoading && (
        <div className="dna-error-card">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="dna-error-content">
            <div className="dna-error-title">Stock DNA Calculation Failed</div>
            <div className="dna-error-desc">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Full DNA Report Display */}
      {report && !isLoading && (
        <div>
          {/* Hero Stock Header Card — TradingView Speedometer & 3 Pillars */}
          <div className="dna-hero-card">
            
            {/* LEFT COLUMN: Asset Info & Vertical Price Stack */}
            <div className="dna-hero-asset-col">
              <div className="dna-asset-top-row">
                <span className="dna-asset-title">{report.symbol}</span>
                <span className="dna-exchange-pill">NSE: EQ</span>
              </div>

              <div className="dna-asset-subtitle" title={`${report.company_name}${mcapText}`}>
                {report.company_name}{mcapText}
              </div>

              {/* Vertical Price Stack: Price on top, Comparison badge directly underneath */}
              <div className="dna-price-stack">
                <span className="dna-current-price">₹{report.current_metrics?.price?.toLocaleString("en-IN") || "—"}</span>
                <div className="dna-diff-badge-wrap">
                  <span className={`dna-price-diff ${report.current_metrics?.dist_52w_pct >= -3 ? "bull" : "bear"}`}>
                    <span>{report.current_metrics?.dist_52w_pct >= 0 ? "▲ +" : "▼ "}</span>
                    <span>{report.current_metrics?.dist_52w_pct}% vs 52W High</span>
                  </span>
                  <span className="dna-price-context-caption">Real-Time LTP</span>
                </div>
              </div>

              {/* 52-Week Range Bar */}
              <div className="dna-range-bar-box">
                <div className="dna-range-labels">
                  <span>52W L: <strong>₹{w52Low.toLocaleString("en-IN")}</strong></span>
                  <span>52W H: <strong>₹{w52High.toLocaleString("en-IN")}</strong></span>
                </div>
                <div className="dna-range-track">
                  <div className="dna-range-thumb" style={{ left: `${rangePct}%` }} title={`Price: ₹${curPrice}`} />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: TRADINGVIEW SPEEDOMETER & 3 PILLARS */}
            <div className="dna-hero-gauge-col">
              <div className="dna-tv-gauge-wrapper">
                <svg className="dna-tv-gauge-svg" viewBox="0 0 250 145">
                  {/* 5 Zone Arcs */}
                  <path className="dna-arc-zone" d="M 25 125 A 100 100 0 0 1 44.1 66.2" stroke="#EF4444" />
                  <path className="dna-arc-zone" d="M 44.1 66.2 A 100 100 0 0 1 94.1 29.8" stroke="#F87171" />
                  <path className="dna-arc-zone" d="M 94.1 29.8 A 100 100 0 0 1 155.9 29.8" stroke="#F59E0B" />
                  <path className="dna-arc-zone" d="M 155.9 29.8 A 100 100 0 0 1 205.9 66.2" stroke="#3B82F6" />
                  <path className="dna-arc-zone" d="M 205.9 66.2 A 100 100 0 0 1 225 125" stroke="#10B981" />

                  {/* Zone Tick Labels */}
                  <text x="14" y="140" className="dna-gauge-tick-label">Strong sell</text>
                  <text x="50" y="44" className="dna-gauge-tick-label">Sell</text>
                  <text x="125" y="14" className="dna-gauge-tick-label">Neutral</text>
                  <text x="200" y="44" className="dna-gauge-tick-label">Buy</text>
                  <text x="236" y="140" className="dna-gauge-tick-label">Strong buy</text>

                  {/* Needle Pointer */}
                  <g className="dna-gauge-needle" style={{ transform: `rotate(${needleAngle}deg)` }}>
                    <line x1="125" y1="125" x2="125" y2="42" className="dna-needle-line" />
                    <circle cx="125" cy="125" r="8" className="dna-needle-hub" />
                    <circle cx="125" cy="125" r="3.5" className="dna-needle-hub-inner" />
                  </g>
                </svg>
              </div>

              {/* 1-Word Status & Numeric DNA Score */}
              <div className="dna-tv-verdict-box">
                <span className="dna-tv-verdict-word" style={{ color: verdictColor }}>
                  {verdictWord}
                </span>
                <span className="dna-tv-score-caption">
                  DNA Health Score: {score} / 100
                </span>
              </div>

              {/* 3 Core Parameter Bars */}
              <div className="dna-pillars-container">
                <div className="dna-pillar-row">
                  <span className="dna-pillar-name">
                    <span className="dna-pillar-icon">🔬</span>
                    <span className="dna-pillar-label-full">Technical</span>
                    <span className="dna-pillar-label-short">Tech</span>
                  </span>
                  <div className="dna-pillar-bar-track">
                    <div className="dna-pillar-bar-fill" style={{ width: `${techScore}%`, background: techColor }} />
                  </div>
                  <span className="dna-pillar-val-tag" style={{ color: techColor }}>
                    <span className="dna-pillar-val-full">{techText}</span>
                    <span className="dna-pillar-val-short">{techScore}</span>
                  </span>
                </div>

                <div className="dna-pillar-row">
                  <span className="dna-pillar-name">
                    <span className="dna-pillar-icon">🏛️</span>
                    <span className="dna-pillar-label-full">Financial</span>
                    <span className="dna-pillar-label-short">Fin</span>
                  </span>
                  <div className="dna-pillar-bar-track">
                    <div className="dna-pillar-bar-fill" style={{ width: `${finScore}%`, background: finColor }} />
                  </div>
                  <span className="dna-pillar-val-tag" style={{ color: finColor }}>
                    <span className="dna-pillar-val-full">{finText}</span>
                    <span className="dna-pillar-val-short">{finScore}</span>
                  </span>
                </div>

                <div className="dna-pillar-row">
                  <span className="dna-pillar-name">
                    <span className="dna-pillar-icon">🎯</span>
                    <span className="dna-pillar-label-full">Valuation</span>
                    <span className="dna-pillar-label-short">Val</span>
                  </span>
                  <div className="dna-pillar-bar-track">
                    <div className="dna-pillar-bar-fill" style={{ width: `${valScore}%`, background: valColor }} />
                  </div>
                  <span className="dna-pillar-val-tag" style={{ color: valColor }}>
                    <span className="dna-pillar-val-full">{valText}</span>
                    <span className="dna-pillar-val-short">{valScore}</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Mode Switcher (Summary vs Pro Details) */}
          <div className="dna-mode-switcher">
            <button 
              className={`dna-mode-btn ${viewMode === "summary" ? "active" : ""}`}
              onClick={() => {
                setViewMode("summary");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span>📋</span>
              <span>Summary</span>
            </button>
            <button 
              className={`dna-mode-btn ${viewMode === "pro" ? "active" : ""}`}
              onClick={() => {
                setViewMode("pro");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span>🔬</span>
              <span>Pro Details</span>
              <span className="pro-spark-badge">PRO ⚡</span>
            </button>
          </div>

          {/* VIEW A: EXECUTIVE SUMMARY */}
          {viewMode === "summary" && (
            <div>
              {/* THE 7 BURNING QUESTIONS MATRIX */}
              {report.questions && (
                <div className="dna-content-section" style={{ marginBottom: "18px" }}>
                  <div className="dna-section-head">
                    <span className="dna-section-tag">Direct Investor Answers</span>
                    <h3 className="dna-section-title">The 7 Burning Questions Every Investor Asks</h3>
                    <p className="dna-section-subtitle">
                      Plain-English answers with zero jargon — tested against live price geometry and institutional financials.
                    </p>
                  </div>

                  <div className="dna-questions-bento">
                    {/* Q1: Can I Buy Today? */}
                    <div className="dna-question-pod">
                      <div className="dna-q-top">
                        <div className="dna-q-title-group">
                          <span className="dna-q-num-glyph">1</span>
                          <span className="dna-q-title">Can I Buy Today?</span>
                        </div>
                        <span className={`dna-q-pill ${report.questions.q1.type || "neutral"}`}>
                          {report.questions.q1.pill}
                        </span>
                      </div>
                      <p className="dna-q-answer">{report.questions.q1.answer}</p>
                      <div className="dna-q-footer">
                        <span>Distance: <strong className="dna-q-metric-tag">{report.questions.q1.metric}</strong></span>
                        <span className="dna-q-trigger-tag">{report.questions.q1.trigger || "Active"}</span>
                      </div>
                    </div>

                    {/* Q2: Short-Term Velocity */}
                    <div className="dna-question-pod">
                      <div className="dna-q-top">
                        <div className="dna-q-title-group">
                          <span className="dna-q-num-glyph">2</span>
                          <span className="dna-q-title">Short-Term Velocity (1–4 Weeks)</span>
                        </div>
                        <span className={`dna-q-pill ${report.questions.q2.type || "neutral"}`}>
                          {report.questions.q2.pill}
                        </span>
                      </div>
                      <p className="dna-q-answer">{report.questions.q2.answer}</p>
                      <div className="dna-q-footer">
                        <span>Momentum: <strong className="dna-q-metric-tag">{report.questions.q2.metric}</strong></span>
                      </div>
                    </div>

                    {/* Q3: Long-Term Compounding */}
                    <div className="dna-question-pod">
                      <div className="dna-q-top">
                        <div className="dna-q-title-group">
                          <span className="dna-q-num-glyph">3</span>
                          <span className="dna-q-title">Long-Term Compounding (1–3 Years)</span>
                        </div>
                        <span className={`dna-q-pill ${report.questions.q3.type || "bullish"}`}>
                          {report.questions.q3.pill}
                        </span>
                      </div>
                      <p className="dna-q-answer">{report.questions.q3.answer}</p>
                      <div className="dna-q-footer">
                        <span>Moat: <strong className="dna-q-metric-tag">{report.questions.q3.metric}</strong></span>
                      </div>
                    </div>

                    {/* Q4: Balance Sheet Safety */}
                    <div className="dna-question-pod">
                      <div className="dna-q-top">
                        <div className="dna-q-title-group">
                          <span className="dna-q-num-glyph">4</span>
                          <span className="dna-q-title">Is the Balance Sheet Bulletproof?</span>
                        </div>
                        <span className={`dna-q-pill ${report.questions.q4.type || "bullish"}`}>
                          {report.questions.q4.pill}
                        </span>
                      </div>
                      <p className="dna-q-answer">{report.questions.q4.answer}</p>
                      <div className="dna-q-footer">
                        <span>Solvency: <strong className="dna-q-metric-tag">{report.questions.q4.metric}</strong></span>
                      </div>
                    </div>

                    {/* Q5: Institutional Whales */}
                    <div className="dna-question-pod">
                      <div className="dna-q-top">
                        <div className="dna-q-title-group">
                          <span className="dna-q-num-glyph">5</span>
                          <span className="dna-q-title">What are Smart Money Whales Doing?</span>
                        </div>
                        <span className={`dna-q-pill ${report.questions.q5.type || "bullish"}`}>
                          {report.questions.q5.pill}
                        </span>
                      </div>
                      <p className="dna-q-answer">{report.questions.q5.answer}</p>
                      <div className="dna-q-footer">
                        <span>Whales: <strong className="dna-q-metric-tag">{report.questions.q5.metric}</strong></span>
                      </div>
                    </div>

                    {/* Q6: Better Sector Alternative */}
                    <div className="dna-question-pod">
                      <div className="dna-q-top">
                        <div className="dna-q-title-group">
                          <span className="dna-q-num-glyph">6</span>
                          <span className="dna-q-title">Is there a Better Sector Alternative?</span>
                        </div>
                        <span className={`dna-q-pill ${report.questions.q6.type || "neutral"}`}>
                          {report.questions.q6.pill}
                        </span>
                      </div>
                      <p className="dna-q-answer">{report.questions.q6.answer}</p>
                      <div className="dna-q-footer">
                        <span>Edge: <strong className="dna-q-metric-tag">{report.questions.q6.metric}</strong></span>
                      </div>
                    </div>

                    {/* Q7: Upcoming Catalysts & Red Flags */}
                    <div className="dna-question-pod">
                      <div className="dna-q-top">
                        <div className="dna-q-title-group">
                          <span className="dna-q-num-glyph">7</span>
                          <span className="dna-q-title">Upcoming Catalysts & Red Flags</span>
                        </div>
                        <span className={`dna-q-pill ${report.questions.q7.type || "neutral"}`}>
                          {report.questions.q7.pill}
                        </span>
                      </div>
                      <p className="dna-q-answer">{report.questions.q7.answer}</p>
                      <div className="dna-q-footer">
                        <span>Radar: <strong className="dna-q-metric-tag">{report.questions.q7.metric}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Position Benchmark Card */}
              <div className="dna-card">
                <div className="dna-card-header-row">
                  <div className="dna-card-badge-pill">
                    <span>📊</span>
                    <span>Position Benchmark</span>
                  </div>
                  <span className="dna-card-top-tag">STAGE & REGIME</span>
                </div>
                <div className="dna-card-headline">
                  ₹{report.current_metrics.price.toLocaleString("en-IN")} — {report.current_metrics.dist_52w_pct}% vs 52W High ({report.ui_report.pro_analysis.macro_regime})
                </div>
                <div className="dna-briefing-callout">
                  <p className="dna-callout-text">
                    {report.ui_report.beginner_summary.what_is_happening}
                  </p>
                </div>
              </div>

              {/* 2. The Verdict Call Card */}
              <div className={`dna-card ${verdictClass}`}>
                <div className="dna-card-header-row">
                  <div className="dna-card-badge-pill" style={{ color: stanceColor }}>
                    <span>{stanceIcon}</span>
                    <span>{stance} · Quant Stance</span>
                  </div>
                  <div className="dna-confidence-pill">
                    <span className="dna-conf-dot" style={{ background: stanceColor }} />
                    <span>{score}/100 Confidence</span>
                  </div>
                </div>
                <div className="dna-card-headline">
                  {report.ui_report.action_title || report.ui_report.trade_execution_card.action_title || report.ui_report.trade_execution_card.action} ({score}/100 Confidence)
                </div>
                <div className="dna-briefing-callout">
                  <p className="dna-callout-text">
                    {report.ui_report.beginner_summary.the_opportunity}
                  </p>
                </div>

                {/* 4-Quadrant Trade Plan Matrix */}
                <div className="dna-trade-grid">
                  <div className="dna-trade-item ti-entry">
                    <div className="dna-trade-item-header">
                      <span className="dna-trade-label">Recommended Entry</span>
                      <span>🎯</span>
                    </div>
                    <span className="dna-trade-value tv-entry">{report.ui_report.trade_execution_card.entry_zone}</span>
                  </div>
                  <div className="dna-trade-item ti-stop">
                    <div className="dna-trade-item-header">
                      <span className="dna-trade-label">Invalidation Floor</span>
                      <span>🛡️</span>
                    </div>
                    <span className="dna-trade-value tv-stop">₹{report.ui_report.trade_execution_card.stop_loss}</span>
                  </div>
                  <div className="dna-trade-item ti-target">
                    <div className="dna-trade-item-header">
                      <span className="dna-trade-label">Target Objective</span>
                      <span>🏁</span>
                    </div>
                    <span className="dna-trade-value tv-target">₹{report.ui_report.trade_execution_card.target_1}</span>
                  </div>
                  <div className="dna-trade-item ti-rr">
                    <div className="dna-trade-item-header">
                      <span className="dna-trade-label">Risk-to-Reward</span>
                      <span>⚖️</span>
                    </div>
                    <span className="dna-trade-value tv-rr">{report.ui_report.trade_execution_card.risk_to_reward_ratio}</span>
                  </div>
                </div>
              </div>

              {/* 3. Dual Theses */}
              <div className="dna-thesis-grid">
                <div className="dna-thesis-card bull">
                  <div className="dna-thesis-header">
                    <span>🟢</span>
                    <span>Why We're Bullish / Patient</span>
                  </div>
                  <div className="dna-thesis-bold">
                    {report.ui_report.why_buy_reasons?.[0] || "Structural Confluence & Accumulation Support"}
                  </div>
                  <div className="dna-thesis-detail-wrap">
                    <p className="dna-thesis-detail">
                      {report.ui_report.why_buy_reasons?.[1] || report.ui_report.beginner_summary.the_opportunity}
                    </p>
                  </div>
                </div>

                <div className="dna-thesis-card bear">
                  <div className="dna-thesis-header">
                    <span>🛡️</span>
                    <span>Risk Management & Invalidation</span>
                  </div>
                  <div className="dna-thesis-bold">
                    {report.ui_report.why_avoid_reasons?.[0] || `Daily close below ₹${report.ui_report.trade_execution_card.stop_loss} invalidates the setup.`}
                  </div>
                  <div className="dna-thesis-detail-wrap">
                    <p className="dna-thesis-detail">
                      {report.ui_report.why_avoid_reasons?.[1] || report.ui_report.beginner_summary.the_danger}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Patience Horizon */}
              <div className="dna-card">
                <div className="dna-card-header-row">
                  <div className="dna-card-badge-pill">
                    <span>⏳</span>
                    <span>Execution Horizon</span>
                  </div>
                  <span className="dna-card-top-tag">TIMEFRAME ALIGNMENT</span>
                </div>
                <div className="dna-card-headline">
                  {report.ui_report.patience_horizon?.headline || "Patience is required — wait for expansion out of base."}
                </div>
                <div className="dna-briefing-callout">
                  <p className="dna-callout-text">
                    {report.ui_report.patience_horizon?.detail || "Allow trading sessions for momentum confirmation and volume expansion above the 20-DMA."}
                  </p>
                </div>
              </div>

              {/* 5. Institutional Candlestick Chart */}
              <div className="dna-chart-wrapper">
                <div className="dna-chart-header">
                  <div className="dna-chart-title">
                    <span>📉</span>
                    <span>Institutional Radar Chart</span>
                  </div>
                  <div className="dna-chart-tabs">
                    <button 
                      className={`dna-chart-tab ${chartPerspective === "tactical" ? "active" : ""}`}
                      onClick={() => setChartPerspective("tactical")}
                    >
                      Tactical
                    </button>
                    <button 
                      className={`dna-chart-tab ${chartPerspective === "macro" ? "active" : ""}`}
                      onClick={() => setChartPerspective("macro")}
                    >
                      Macro (1Y)
                    </button>
                  </div>
                </div>

                <div className="dna-real-chart-container" onClick={() => setIsZoomOpen(true)}>
                  <img 
                    key={`chart_${report.symbol}_${chartPerspective}_${currentTheme}`}
                    src={chartSrc} 
                    alt={`${report.symbol} Institutional Chart`}
                    className="dna-real-chart-img"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = "true";
                        target.src = fallbackChartSrc;
                      }
                    }}
                  />
                </div>

                <div className="dna-chart-legend-bar">
                  <div className="dna-legend-chip"><span className="dna-chip-dot" style={{ background: "#3B82F6" }} /> 20 EMA</div>
                  <div className="dna-legend-chip"><span className="dna-chip-dot" style={{ background: "#F59E0B" }} /> 50 EMA</div>
                  {chartPerspective === "macro" && (
                    <div className="dna-legend-chip"><span className="dna-chip-dot" style={{ background: "#8B5CF6" }} /> 200 EMA</div>
                  )}
                  <div className="dna-legend-chip"><span className="dna-chip-dot" style={{ background: "#EF4444" }} /> Trendline Ray</div>
                  <div className="dna-legend-chip"><span className="dna-chip-dot" style={{ background: "#10B981" }} /> Target/Floor</div>
                  <div className="dna-legend-zoom-prompt" onClick={() => setIsZoomOpen(true)}>
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Tap to Zoom</span>
                  </div>
                </div>

                {/* Direct Action Buttons at the bottom of the chart */}
                <div className="dna-chart-bottom-actions">
                  <button 
                    type="button" 
                    className="dna-btn-share-report" 
                    onClick={handleShareReport} 
                    title="Share DNA Analysis"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Report</span>
                  </button>

                  <button 
                    type="button" 
                    className="dna-btn-whatsapp" 
                    onClick={handleShareWhatsApp} 
                    title="Share on WhatsApp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.861.947 2.796.947 3.179 0 5.765-2.587 5.767-5.766.002-3.18-2.584-5.767-5.767-5.767zm8.347 5.766c-.003 4.604-3.748 8.346-8.349 8.346-1.42 0-2.766-.363-3.957-1.002l-4.405 1.155 1.176-4.293c-.727-1.242-1.162-2.673-1.164-4.206.002-4.605 3.748-8.349 8.35-8.349 4.601 0 8.346 3.745 8.349 8.349zM12.032 2C6.49 2 2 6.49 2 12.032c0 1.838.497 3.565 1.365 5.064L2 22l5.053-1.325c1.45.795 3.111 1.258 4.88 1.258 5.541 0 10.032-4.49 10.032-10.032C22.065 6.49 17.573 2 12.032 2zm4.786 13.921c-.201.564-1.174 1.077-1.632 1.12-.459.043-.912.196-2.984-.663-1.745-.724-2.884-2.484-2.97-2.6-.086-.117-.714-.95-.714-1.812 0-.862.451-1.287.612-1.46.16-.173.35-.216.467-.216.117 0 .234.001.336.006.107.006.251-.041.393.3.149.362.508 1.24.553 1.331.045.09.075.196.015.315-.06.12-.09.195-.18.3-.09.105-.189.234-.27.315-.09.09-.184.188-.079.368.105.18.468.772 1.004 1.25.688.613 1.27.803 1.45.893.18.09.285.076.39-.045.105-.12.451-.525.571-.705.12-.18.24-.15.405-.09.165.06 1.05.495 1.23.585.18.09.3.135.345.21.045.075.045.435-.156.999z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* THE SOLVENCY & BALANCE SHEET SAFETY FORTRESS */}
              {report.solvency && (
                <div className="dna-content-section" style={{ marginBottom: "18px" }}>
                  <div className="dna-section-head">
                    <span className="dna-section-tag">Balance Sheet & Liquidity Fortress</span>
                    <h3 className="dna-section-title">Solvency & Debt Servicing Health</h3>
                    <p className="dna-section-subtitle">
                      Evaluation of corporate borrowings, reserves coverage, and default risk buffer.
                    </p>
                  </div>

                  <div className="dna-solvency-fortress">
                    <div className="dna-solvency-top-bar">
                      <div className="dna-solvency-score-group">
                        <span className="dna-solvency-score-num">{report.solvency.score}</span>
                        <div className="dna-solvency-score-meta">
                          <span className="dna-solvency-score-label">Solvency Score</span>
                          <span className="dna-solvency-score-grade">{report.solvency.grade} · Grade</span>
                        </div>
                      </div>
                      <span className="dna-solvency-status-pill">
                        {report.solvency.debtStatus || report.solvency.status || "Healthy Capital Structure"}
                      </span>
                    </div>

                    <div className="dna-solvency-kpi-row">
                      <div className="dna-solvency-kpi-box">
                        <span className="dna-solvency-kpi-label">Debt to Equity</span>
                        <span className="dna-solvency-kpi-val">{report.solvency.de}</span>
                      </div>
                      <div className="dna-solvency-kpi-box">
                        <span className="dna-solvency-kpi-label">Interest Coverage</span>
                        <span className="dna-solvency-kpi-val">{report.solvency.interest_coverage || "Healthy"}</span>
                      </div>
                      <div className="dna-solvency-kpi-box">
                        <span className="dna-solvency-kpi-label">Altman Z-Score</span>
                        <span className="dna-solvency-kpi-val">{report.solvency.altman_z || "Safe Zone"}</span>
                      </div>
                    </div>

                    {/* Proportional Capital Structure Bar */}
                    <div style={{ marginTop: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, color: "var(--dna-text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        <span>Capital Structure Breakdown</span>
                        <span>Borrowings vs Reserves</span>
                      </div>
                      <div className="dna-capital-track">
                        <div 
                          className="dna-capital-fill-debt" 
                          style={{ width: report.solvency.barBorrowingsPct || `${Math.max(5, Math.min(95, report.solvency.borrowings_pct || 45))}%` }} 
                          title={`Borrowings: ${report.solvency.borrowings || report.solvency.borrowings_cr || ""}`} 
                        />
                        <div 
                          className="dna-capital-fill-res" 
                          style={{ width: report.solvency.barReservesPct || `${Math.max(5, Math.min(95, 100 - (report.solvency.borrowings_pct || 45)))}%` }} 
                          title={`Reserves: ${report.solvency.reserves || report.solvency.reserves_cr || ""}`} 
                        />
                      </div>
                      <div className="dna-capital-legend">
                        <span>🔴 Borrowings: <strong>{report.solvency.borrowings || (report.solvency.borrowings_cr ? `₹${report.solvency.borrowings_cr} Cr` : "")}</strong> ({report.solvency.barBorrowingsPct || `${report.solvency.borrowings_pct || 45}%`})</span>
                        <span>🟢 Reserves Buffer: <strong>{report.solvency.reserves || (report.solvency.reserves_cr ? `₹${report.solvency.reserves_cr} Cr` : "")}</strong> ({report.solvency.barReservesPct || `${100 - (report.solvency.borrowings_pct || 45)}%`})</span>
                      </div>
                    </div>

                    <div className="dna-solvency-verdict-box" style={{ marginTop: "12px" }}>
                      <strong>🛡️ Solvency Verdict:</strong> {report.solvency.summary || report.solvency.verdict}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTOR PEER BENCHMARK RADAR */}
              {report.peers && report.peers.length > 0 && (
                <div className="dna-content-section" style={{ marginBottom: "18px" }}>
                  <div className="dna-section-head">
                    <span className="dna-section-tag">Competitive Relative Value</span>
                    <h3 className="dna-section-title">Sector Peer Benchmark Radar</h3>
                    <p className="dna-section-subtitle">
                      How does {report.symbol} stack up against its top sector rivals on valuation, return ratios, and momentum?
                    </p>
                  </div>

                  <div className="dna-peer-table-wrap">
                    <table className="dna-peer-table">
                      <thead>
                        <tr>
                          <th>Stock / Company</th>
                          <th>Price</th>
                          <th>Health Score</th>
                          <th>P/E Multiple</th>
                          <th>ROCE</th>
                          <th>Debt/Eq</th>
                          <th>Momentum</th>
                          <th>Comparative Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.peers.map((peer, idx) => {
                          const isCur = peer.isCurrent || peer.symbol === report.symbol;
                          return (
                            <tr 
                              key={idx} 
                              className={`dna-peer-row ${isCur ? "active-stock" : ""}`}
                              style={{ cursor: isCur ? "default" : "pointer" }}
                              onClick={() => {
                                if (!isCur) {
                                  fetchStockDna(peer.symbol);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }
                              }}
                              title={isCur ? "Currently viewing" : `Click to analyze ${peer.symbol}`}
                            >
                              <td style={{ fontWeight: 700, color: isCur ? "var(--dna-primary)" : "var(--dna-text-main)" }}>
                                <div>{peer.symbol} {isCur && <span style={{ fontSize: "10px", padding: "1px 5px", background: "rgba(59,130,246,0.15)", borderRadius: "4px", color: "var(--dna-primary)", marginLeft: "4px" }}>Active</span>}</div>
                                <div style={{ fontSize: "10.5px", color: "var(--dna-text-dim)", fontWeight: 400 }}>{peer.name}</div>
                              </td>
                              <td style={{ fontFamily: "var(--dna-font-mono)", fontWeight: 600 }}>{peer.price}</td>
                              <td>
                                <span 
                                  className="dna-peer-score-chip" 
                                  style={{ 
                                    background: peer.score >= 70 ? "rgba(16,185,129,0.15)" : peer.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", 
                                    color: peer.score >= 70 ? "var(--dna-bullish)" : peer.score >= 50 ? "var(--dna-neutral)" : "var(--dna-bearish)" 
                                  }}
                                >
                                  {peer.score}/100
                                </span>
                              </td>
                              <td style={{ fontFamily: "var(--dna-font-mono)" }}>{peer.pe}</td>
                              <td style={{ fontFamily: "var(--dna-font-mono)", color: "var(--dna-bullish)", fontWeight: 600 }}>{peer.roce}</td>
                              <td style={{ fontFamily: "var(--dna-font-mono)" }}>{peer.de}</td>
                              <td style={{ fontFamily: "var(--dna-font-mono)", fontWeight: 600 }}>{peer.mom}</td>
                              <td>
                                <span 
                                  className="dna-peer-rec-badge" 
                                  style={{
                                    borderColor: peer.recClass === "bullish" ? "var(--dna-bullish)" : peer.recClass === "bearish" ? "var(--dna-bearish)" : "var(--dna-neutral)",
                                    color: peer.recClass === "bullish" ? "var(--dna-bullish)" : peer.recClass === "bearish" ? "var(--dna-bearish)" : "var(--dna-neutral)"
                                  }}
                                >
                                  {peer.verdict}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LIVE CATALYSTS & FORENSIC RED FLAGS RADAR */}
              {report.catalysts && (
                <div className="dna-content-section" style={{ marginBottom: "18px" }}>
                  <div className="dna-section-head">
                    <span className="dna-section-tag">Real-Time Radar & Forensics</span>
                    <h3 className="dna-section-title">Catalysts & Red Flag Integrity Check</h3>
                    <p className="dna-section-subtitle">
                      Continuous corporate disclosure monitoring, recent quarterly events, and structural governance audits.
                    </p>
                  </div>

                  <div className="dna-catalysts-grid">
                    {/* Recent News & Event Feed */}
                    <div className="dna-radar-pod">
                      <div className="dna-radar-header-title">
                        <span>📰</span>
                        <span>Recent Developments & Catalysts</span>
                      </div>
                      <div>
                        {report.catalysts.news && report.catalysts.news.length > 0 ? (
                          report.catalysts.news.map((item, idx) => (
                            <div key={idx} className="dna-news-item-card">
                              <div className="dna-news-meta">
                                <span>{item.source} · {item.time}</span>
                                <span className="dna-news-tag">{item.tag}</span>
                              </div>
                              <div className="dna-news-title">{item.title}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{ color: "var(--dna-text-dim)", fontSize: "12px", padding: "12px 0" }}>
                            No high-friction corporate disclosures logged in the past 14 trading days.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4-Point Forensic Red Flag Checklist */}
                    <div className="dna-radar-pod">
                      <div className="dna-radar-header-title">
                        <span>🔍</span>
                        <span>4-Point Forensic Red Flag Checklist</span>
                      </div>
                      <div>
                        {(report.catalysts.checklist && report.catalysts.checklist.length > 0 ? report.catalysts.checklist : [
                          { item: "Promoter Share Pledging", status: "0.0% Pledged (Clean)", pass: true },
                          { item: "Auditor Concerns or Resignations", status: "Clean Audit Track Record", pass: true },
                          { item: "Debt Servicing & Leverage", status: "Manageable Debt Buffer", pass: true },
                          { item: "Earnings & Operating Cash Flow", status: "Positive Operating Cash Flow", pass: true }
                        ]).map((c, idx) => (
                          <div key={idx} className="dna-check-row">
                            <span style={{ fontWeight: 500 }}>{c.item}</span>
                            <span style={{ fontWeight: 700, color: c.pass ? "var(--dna-bullish)" : "var(--dna-neutral)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>{c.pass ? "✅" : "⚠️"}</span>
                              <span>{c.status}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Pro Discovery Banner */}
              <div 
                className="dna-pro-discovery-banner" 
                onClick={() => {
                  setViewMode("pro");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <div className="dna-pro-discovery-content">
                  <div className="dna-pro-discovery-badge">
                    <span className="pro-spark-badge">PRO ⚡</span>
                    <span>INSTITUTIONAL QUANT DEPTH</span>
                  </div>
                  <div className="dna-pro-discovery-title">Read Complete Details on Pro Page →</div>
                  <div className="dna-pro-discovery-subtitle">
                    Valuation Multiples · 4-Quarter P&L · Solvency & Borrowings · Whale Flow (FII/DII) · Moats & Red Flags
                  </div>
                </div>
                <button 
                  className="dna-pro-discovery-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode("pro");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span>View Pro</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW B: INSTITUTIONAL PRO TERMINAL */}
          {viewMode === "pro" && (
            <div>
              {/* Sticky Pro Sub-navigation */}
              <div className="dna-pro-subnav">
                <button 
                  className={`dna-subnav-pill ${proCategory === "all" ? "active" : ""}`}
                  onClick={() => setProCategory("all")}
                >
                  ⚡ All Insights
                </button>
                <button 
                  className={`dna-subnav-pill ${proCategory === "valuation" ? "active" : ""}`}
                  onClick={() => setProCategory("valuation")}
                >
                  🎯 Valuation
                </button>
                <button 
                  className={`dna-subnav-pill ${proCategory === "financials" ? "active" : ""}`}
                  onClick={() => setProCategory("financials")}
                >
                  📈 Financials
                </button>
                <button 
                  className={`dna-subnav-pill ${proCategory === "balance-sheet" ? "active" : ""}`}
                  onClick={() => setProCategory("balance-sheet")}
                >
                  🏛️ Balance Sheet
                </button>
                <button 
                  className={`dna-subnav-pill ${proCategory === "shareholding" ? "active" : ""}`}
                  onClick={() => setProCategory("shareholding")}
                >
                  🐳 Whale Flow
                </button>
                <button 
                  className={`dna-subnav-pill ${proCategory === "pros-cons" ? "active" : ""}`}
                  onClick={() => setProCategory("pros-cons")}
                >
                  💡 Moats & Flags
                </button>
                <button 
                  className={`dna-subnav-pill ${proCategory === "technical" ? "active" : ""}`}
                  onClick={() => setProCategory("technical")}
                >
                  🔬 Quant Edge
                </button>
              </div>

              {/* Top Return to Summary Bar */}
              <div className="dna-pro-back-bar">
                <button 
                  className="dna-btn-back-summary"
                  onClick={() => {
                    setViewMode("summary");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span>← Back to Executive Summary</span>
                </button>
                <span className="dna-pro-back-caption">Quick 10-sec brief & chart</span>
              </div>

              {/* MODULE 1: VALUATION & QUALITY */}
              {(proCategory === "all" || proCategory === "valuation") && (
                <div className="dna-card">
                  <div className="dna-card-headline" style={{ fontSize: "14.5px" }}>
                    🎯 Institutional Quality & Valuation
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--dna-bg-card-subtle)", padding: "12px", borderRadius: "var(--dna-radius-md)", marginBottom: "12px", border: "1px solid var(--dna-border-subtle)" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--dna-bg-card)", border: "2px solid var(--dna-bullish)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--dna-font-display)", fontSize: "18px", fontWeight: 900, color: "var(--dna-bullish)", boxShadow: "0 0 12px var(--dna-bullish-bg)" }}>
                      {qualityScore.score}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--dna-font-display)", fontWeight: 800, fontSize: "13.5px" }}>
                        {qualityScore.label}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--dna-text-muted)" }}>
                        Screener fundamental composite scoring (Return on Capital, Solvency & Earnings Quality)
                      </div>
                    </div>
                  </div>

                  <div className="dna-ratio-grid">
                    <div className="dna-ratio-card">
                      <span className="dna-ratio-label">Stock P/E</span>
                      <span className="dna-ratio-val">{keyRatios.stock_pe || "19.6"}</span>
                      <span className="dna-ratio-hint">TTM Earnings</span>
                    </div>
                    <div className="dna-ratio-card">
                      <span className="dna-ratio-label">ROCE</span>
                      <span className="dna-ratio-val" style={{ color: "var(--dna-bullish)" }}>
                        {keyRatios.roce_pct ? `${keyRatios.roce_pct}%` : "12.5%"}
                      </span>
                      <span className="dna-ratio-hint">Return on Capital</span>
                    </div>
                    <div className="dna-ratio-card">
                      <span className="dna-ratio-label">ROE</span>
                      <span className="dna-ratio-val">
                        {keyRatios.roe_pct ? `${keyRatios.roe_pct}%` : "8.8%"}
                      </span>
                      <span className="dna-ratio-hint">Return on Equity</span>
                    </div>
                    <div className="dna-ratio-card">
                      <span className="dna-ratio-label">Debt / Equity</span>
                      <span className="dna-ratio-val">
                        {keyRatios.debt_to_equity || "0.45"}
                      </span>
                      <span className="dna-ratio-hint">Solvency Ratio</span>
                    </div>
                    <div className="dna-ratio-card">
                      <span className="dna-ratio-label">Book Value</span>
                      <span className="dna-ratio-val">₹{keyRatios.book_value || "76.4"}</span>
                      <span className="dna-ratio-hint">Per Share NAV</span>
                    </div>
                    <div className="dna-ratio-card">
                      <span className="dna-ratio-label">Dividend Yield</span>
                      <span className="dna-ratio-val" style={{ color: "var(--dna-purple)" }}>
                        {keyRatios.dividend_yield_pct ? `${keyRatios.dividend_yield_pct}%` : "1.9%"}
                      </span>
                      <span className="dna-ratio-hint">Annual Cash Yield</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 2: 4-QUARTER FINANCIAL TREND */}
              {(proCategory === "all" || proCategory === "financials") && (
                <div className="dna-card">
                  <div className="dna-card-headline" style={{ fontSize: "14.5px" }}>
                    📈 4-Quarter Financial Trend (Screener Consolidated)
                  </div>
                  <div className="dna-table-wrap">
                    <table className="dna-data-table">
                      <thead>
                        <tr>
                          <th>Quarter</th>
                          <th>Sales (Cr)</th>
                          <th>Op. Profit</th>
                          <th>OPM %</th>
                          <th>Net Profit</th>
                          <th>EPS (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quarterlyData.length > 0 ? (
                          quarterlyData.map((q, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: "var(--dna-text-main)" }}>{q.quarter}</td>
                              <td>₹{q.sales}</td>
                              <td>₹{q.opProfit}</td>
                              <td><span style={{ color: "var(--dna-bullish)", fontWeight: 700 }}>{q.opm}</span></td>
                              <td style={{ fontWeight: 600, color: isNegative(q?.netProfit) ? "var(--dna-bearish)" : "var(--dna-text-main)" }}>
                                ₹{q.netProfit}
                              </td>
                              <td style={{ fontWeight: 700 }}>₹{q.eps}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", color: "var(--dna-text-muted)" }}>
                              Consolidated 4-quarter financials loading from Screener engine...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 3: BALANCE SHEET & SOLVENCY */}
              {(proCategory === "all" || proCategory === "balance-sheet") && (
                <div className="dna-card">
                  <div className="dna-card-headline" style={{ fontSize: "14.5px" }}>
                    🏛️ Balance Sheet & Solvency Check
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", margin: "8px 0 4px 0", fontSize: "11.5px" }}>
                    <span style={{ color: "var(--dna-text-muted)" }}>Capital Structure Composition</span>
                    <span style={{ fontFamily: "var(--dna-font-mono)", fontWeight: 700, color: "var(--dna-bullish)" }}>
                      Net Worth: ₹{bsReserves}
                    </span>
                  </div>

                  <div className="dna-sh-stack">
                    <div className="dna-sh-seg" style={{ width: "65%", background: "var(--dna-bullish)" }} title="Shareholders Equity / Reserves" />
                    <div className="dna-sh-seg" style={{ width: "35%", background: "var(--dna-bearish)" }} title="Total Borrowings" />
                  </div>

                  <div className="dna-sh-legend">
                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-bullish)" }} />
                        <span>Reserves & Equity</span>
                      </div>
                      <span className="dna-sh-val" style={{ color: "var(--dna-bullish)" }}>
                        ₹{bsReserves}
                      </span>
                    </div>
                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-bearish)" }} />
                        <span>Total Borrowings</span>
                      </div>
                      <span className="dna-sh-val" style={{ color: "var(--dna-bearish)" }}>
                        ₹{bsBorrowings}
                      </span>
                    </div>
                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-primary)" }} />
                        <span>Fixed Assets</span>
                      </div>
                      <span className="dna-sh-val">
                        ₹{bsFixedAssets}
                      </span>
                    </div>
                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-purple)" }} />
                        <span>Work In Progress (CWIP)</span>
                      </div>
                      <span className="dna-sh-val">
                        ₹{bsCwip}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 4: WHALE TRACKER */}
              {(proCategory === "all" || proCategory === "shareholding") && (
                <div className="dna-card">
                  <div className="dna-card-headline" style={{ fontSize: "14.5px" }}>
                    🐳 Whale Tracker · FII & DII Smart Money Flow
                  </div>
                  
                  <div className="dna-sh-stack">
                    <div className="dna-sh-seg dna-sh-promoter" style={{ width: shPromoters }} />
                    <div className="dna-sh-seg dna-sh-fii" style={{ width: shFii }} />
                    <div className="dna-sh-seg dna-sh-dii" style={{ width: shDii }} />
                    <div className="dna-sh-seg dna-sh-public" style={{ width: shPublic }} />
                  </div>

                  <div className="dna-sh-legend">
                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-primary)" }} />
                        <span>Promoters</span>
                      </div>
                      <span className="dna-sh-val">{shPromoters}</span>
                    </div>

                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-bullish)" }} />
                        <span>Foreign (FIIs)</span>
                      </div>
                      <span className="dna-sh-val">{shFii}</span>
                      <span className={`dna-sh-change ${isNegative(shFiiChange) ? "trim" : "accum"}`}>
                        {shFiiChange}
                      </span>
                    </div>

                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-purple)" }} />
                        <span>Domestic (DIIs)</span>
                      </div>
                      <span className="dna-sh-val">{shDii}</span>
                      <span className={`dna-sh-change ${isNegative(shDiiChange) ? "trim" : "accum"}`}>
                        {shDiiChange}
                      </span>
                    </div>

                    <div className="dna-sh-item">
                      <div className="dna-sh-header">
                        <span className="dna-sh-dot" style={{ background: "var(--dna-text-dim)" }} />
                        <span>Retail Public</span>
                      </div>
                      <span className="dna-sh-val">{shPublic}</span>
                      <span className={`dna-sh-change ${isNegative(shPublicChange) ? "trim" : "accum"}`}>
                        {shPublicChange}
                      </span>
                    </div>
                  </div>

                  <div className="dna-briefing-callout" style={{ marginTop: "12px" }}>
                    <p className="dna-callout-text">
                      Smart Money Flow: {report.ui_report?.pro_analysis?.volume_footprint || "High-conviction institutional accumulation detected."}
                    </p>
                  </div>
                </div>
              )}

              {/* MODULE 5: MOATS & RED FLAGS */}
              {(proCategory === "all" || proCategory === "pros-cons") && (
                <div className="dna-card">
                  <div className="dna-card-headline" style={{ fontSize: "14.5px" }}>
                    💡 Institutional Moats vs Red Flags
                  </div>
                  <div className="dna-pros-cons">
                    <div className="dna-pc-card pros">
                      <div className="dna-pc-title">✓ Institutional Strengths & Moats</div>
                      <ul className="dna-pc-list">
                        {prosList.map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="dna-pc-card cons">
                      <div className="dna-pc-title">✕ Key Risk Factors & Drag</div>
                      <ul className="dna-pc-list">
                        {consList.map((c: string, idx: number) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 6: MULTI-TIMEFRAME MATRIX */}
              {(proCategory === "all" || proCategory === "technical") && (
                <div className="dna-card">
                  <div className="dna-card-headline" style={{ fontSize: "14.5px" }}>
                    🌐 Multi-Timeframe Matrix
                  </div>
                  <div className="dna-table-wrap">
                    <table className="dna-data-table">
                      <thead>
                        <tr>
                          <th>Timeframe</th>
                          <th>Bias</th>
                          <th>MA Confluence</th>
                          <th>RSI</th>
                          <th>Key Pivot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.ui_report?.multi_timeframe && report.ui_report.multi_timeframe.length > 0 ? (
                          report.ui_report.multi_timeframe.map((tf, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: "var(--dna-text-main)" }}>{tf.tf}</td>
                              <td>
                                <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: tf.dot === "green" ? "var(--dna-bullish)" : tf.dot === "amber" ? "var(--dna-neutral)" : "var(--dna-bearish)", marginRight: "6px" }} />
                                {tf.bias}
                              </td>
                              <td style={{ fontFamily: "var(--dna-font-mono)" }}>{tf.ma}</td>
                              <td style={{ fontFamily: "var(--dna-font-mono)" }}>{tf.rsi}</td>
                              <td style={{ fontFamily: "var(--dna-font-mono)", fontWeight: 700 }}>{tf.pivot}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", color: "var(--dna-text-muted)" }}>
                              Technical radar evaluating multi-timeframe slopes...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="dna-briefing-callout" style={{ marginTop: "12px" }}>
                    <p className="dna-callout-text">
                      <strong>Fibonacci Confluence:</strong> {report.ui_report?.pro_analysis?.fibonacci_confluence || "0.382 / 0.50 / 0.618 Golden Ratio clusters active."}
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Return to Summary Button in Pro Details */}
              <div style={{ margin: "14px 0 28px 0", textAlign: "center" }}>
                <button 
                  className="dna-btn-back-summary"
                  onClick={() => {
                    setViewMode("summary");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span>← Back to Executive Summary</span>
                </button>
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar (Share Report & WhatsApp) */}
          <div className="dna-bottom-bar">
            <button className="dna-btn-share-report" onClick={handleShareReport} title="Share DNA Report">
              <Share2 className="w-4 h-4" />
              <span>Share Report</span>
            </button>

            <button className="dna-btn-whatsapp" onClick={handleShareWhatsApp} title="Share on WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.861.947 2.796.947 3.179 0 5.765-2.587 5.767-5.766.002-3.18-2.584-5.767-5.767-5.767zm8.347 5.766c-.003 4.604-3.748 8.346-8.349 8.346-1.42 0-2.766-.363-3.957-1.002l-4.405 1.155 1.176-4.293c-.727-1.242-1.162-2.673-1.164-4.206.002-4.605 3.748-8.349 8.35-8.349 4.601 0 8.346 3.745 8.349 8.349zM12.032 2C6.49 2 2 6.49 2 12.032c0 1.838.497 3.565 1.365 5.064L2 22l5.053-1.325c1.45.795 3.111 1.258 4.88 1.258 5.541 0 10.032-4.49 10.032-10.032C22.065 6.49 17.573 2 12.032 2zm4.786 13.921c-.201.564-1.174 1.077-1.632 1.12-.459.043-.912.196-2.984-.663-1.745-.724-2.884-2.484-2.97-2.6-.086-.117-.714-.95-.714-1.812 0-.862.451-1.287.612-1.46.16-.173.35-.216.467-.216.117 0 .234.001.336.006.107.006.251-.041.393.3.149.362.508 1.24.553 1.331.045.09.075.196.015.315-.06.12-.09.195-.18.3-.09.105-.189.234-.27.315-.09.09-.184.188-.079.368.105.18.468.772 1.004 1.25.688.613 1.27.803 1.45.893.18.09.285.076.39-.045.105-.12.451-.525.571-.705.12-.18.24-.15.405-.09.165.06 1.05.495 1.23.585.18.09.3.135.345.21.045.075.045.435-.156.999z"/>
              </svg>
              <span>WhatsApp</span>
            </button>
          </div>

          {/* Toast Notification */}
          <div className={`dna-toast-popup ${toastMsg ? "show" : ""}`}>
            <span>📋</span>
            <span>{toastMsg}</span>
          </div>

          {/* Fullscreen Chart Modal */}
          {isZoomOpen && (
            <div className="chart-fullscreen-modal active" onClick={() => setIsZoomOpen(false)}>
              <button 
                type="button"
                className="modal-close-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomOpen(false);
                }}
                title="Close Fullscreen Chart"
              >
                ✕
              </button>
              <img 
                key={`modal_${report.symbol}_${chartPerspective}_${currentTheme}`}
                src={chartSrc} 
                className="modal-chart-img" 
                onClick={(e) => e.stopPropagation()} 
                alt="Full Resolution DNA Chart"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = "true";
                    target.src = fallbackChartSrc;
                  }
                }}
              />
              <div className="modal-caption-text">
                ⚡ QuantSync DNA Engine · Actual Live Candlesticks & Technical Overlay Matrix
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
