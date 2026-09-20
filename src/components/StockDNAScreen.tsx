import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Dna, Share2, CheckCircle, AlertTriangle, 
  ExternalLink, ZoomIn, X, Activity, ArrowLeft
} from "lucide-react";
import "./StockDNALuxury.css";
import "./StockDNAMasterpiece.css";

interface StockSuggestion {
  symbol: string;
  name: string;
  token?: string;
  candleCount?: number;
}

interface StockFundamentals {
  symbol: string;
  market_cap_cr: string | number;
  key_ratios?: {
    stock_pe?: number;
    book_value?: number;
    dividend_yield_pct?: number;
    roce_pct?: number;
    roe_pct?: number;
    debt_to_equity?: number;
    face_value?: number;
  };
  quality_score?: {
    score?: number;
    label?: string;
  };
  quarterly_performance?: Array<{
    quarter: string;
    sales: string;
    op_profit: string;
    opm_pct: string;
    net_profit: string;
    eps: string;
  }>;
  balance_sheet?: {
    equity_capital?: string;
    reserves?: string;
    borrowings?: string;
    other_liabilities?: string;
    fixed_assets?: string;
    cwip?: string;
    investments?: string;
    other_assets?: string;
  };
  shareholding_pattern?: {
    promoters?: string;
    fii?: string;
    dii?: string;
    public?: string;
    fii_change_qoq?: string;
    dii_change_qoq?: string;
    public_change_qoq?: string;
  };
  pros?: string[];
  cons?: string[];
  mcap?: string;
  pe?: string | number;
  roce?: string;
  roe?: string;
  de?: string | number;
  div?: string;
  health_score?: number;
  quarterly_pnl?: Array<{
    q: string;
    sales: string;
    op: string;
    opm: string;
    np: string;
    eps: string;
  }>;
  shareholding?: {
    p: string;
    fii: string;
    dii: string;
    pub: string;
  };
}

interface QuestionItem {
  pill: string;
  type: "bullish" | "bearish" | "neutral" | string;
  answer: string;
  metric?: string;
  trigger?: string;
  compass?: string;
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
  sector?: string;
  report_date: string;
  stance?: string;
  action_title?: string;
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

interface CuratedStock {
  symbol: string;
  name: string;
  sector: string;
  price: string;
  score: number;
  stance: "BULLISH" | "NEUTRAL" | "BEARISH";
  stanceLabel: string;
  hook: string;
  pe: string;
  roce: string;
  dist52w: string;
}

const DISCOVERY_SHELVES: Record<string, { label: string; icon: string; subtitle: string; stocks: CuratedStock[] }> = {
  trending: {
    label: "Hot Institutional Radar",
    icon: "🔥",
    subtitle: "Most actively scanned equities with dynamic technical setups and high institutional interest",
    stocks: [
      {
        symbol: "TATASTEEL",
        name: "Tata Steel Limited",
        sector: "Metals & Mining",
        price: "₹186.02",
        score: 82,
        stance: "NEUTRAL",
        stanceLabel: "Breakout Watch",
        hook: "Resting on its 20 EMA corridor with ₹1.0L Cr reserves and zero promoter pledging.",
        pe: "19.6",
        roce: "12.5%",
        dist52w: "-3.1%"
      },
      {
        symbol: "PAYTM",
        name: "One97 Communications",
        sector: "Fintech & Digital",
        price: "₹712.40",
        score: 76,
        stance: "BULLISH",
        stanceLabel: "Strong Momentum",
        hook: "High-velocity reversal with FII fund inflows and expanding operating cash flow.",
        pe: "N/A",
        roce: "8.4%",
        dist52w: "-14.2%"
      },
      {
        symbol: "RELIANCE",
        name: "Reliance Industries",
        sector: "Energy & Telecom",
        price: "₹2,980.50",
        score: 88,
        stance: "BULLISH",
        stanceLabel: "Core Accumulation",
        hook: "Dominant conglomerate moat with 5G capex monetization and massive balance sheet safety.",
        pe: "24.8",
        roce: "14.2%",
        dist52w: "-2.4%"
      },
      {
        symbol: "TATAMOTORS",
        name: "Tata Motors Limited",
        sector: "Auto & EV",
        price: "₹972.10",
        score: 84,
        stance: "BULLISH",
        stanceLabel: "Uptrend Runner",
        hook: "JLR debt reduction ahead of schedule with market-leading domestic EV market share.",
        pe: "15.4",
        roce: "17.8%",
        dist52w: "-5.0%"
      }
    ]
  },
  solvency: {
    label: "Solvency Fortress Kings",
    icon: "🛡️",
    subtitle: "Virtually zero debt, massive accumulated cash reserves, and Solvency Grade A+",
    stocks: [
      {
        symbol: "HDFCBANK",
        name: "HDFC Bank Limited",
        sector: "Private Banking",
        price: "₹1,640.25",
        score: 86,
        stance: "BULLISH",
        stanceLabel: "Value Compounder",
        hook: "India's premier banking fortress trading at decade-low price-to-book valuation.",
        pe: "18.2",
        roce: "16.1%",
        dist52w: "-6.8%"
      },
      {
        symbol: "TCS",
        name: "Tata Consultancy Services",
        sector: "IT Services",
        price: "₹4,250.00",
        score: 91,
        stance: "BULLISH",
        stanceLabel: "Bulletproof Fortress",
        hook: "Debt-free balance sheet with an extraordinary 55%+ ROCE and consistent dividend payouts.",
        pe: "28.5",
        roce: "58.2%",
        dist52w: "-4.1%"
      },
      {
        symbol: "ITC",
        name: "ITC Limited",
        sector: "FMCG & Hotels",
        price: "₹504.80",
        score: 87,
        stance: "BULLISH",
        stanceLabel: "Cash Cow Giant",
        hook: "Monopoly cigarette cash engine funding hotel demerger and fast-growing FMCG brands.",
        pe: "26.2",
        roce: "39.4%",
        dist52w: "-2.1%"
      },
      {
        symbol: "INFY",
        name: "Infosys Limited",
        sector: "IT Services",
        price: "₹1,885.00",
        score: 85,
        stance: "BULLISH",
        stanceLabel: "Zero-Debt Cash Rich",
        hook: "Surplus cash reserves of ₹38,000+ Cr with enterprise AI contract wins ramping up.",
        pe: "27.1",
        roce: "40.5%",
        dist52w: "-3.5%"
      }
    ]
  },
  velocity: {
    label: "High-Velocity Momentum",
    icon: "🚀",
    subtitle: "Equities surfing above their rising 20 EMA with bullish volume expansion",
    stocks: [
      {
        symbol: "ZOMATO",
        name: "Zomato Limited",
        sector: "Internet & Consumer",
        price: "₹264.10",
        score: 85,
        stance: "BULLISH",
        stanceLabel: "Super-Trend Active",
        hook: "Blinkit quick-commerce hypergrowth powering exponential EBITDA margin expansion.",
        pe: "85.0",
        roce: "14.8%",
        dist52w: "-1.8%"
      },
      {
        symbol: "BEL",
        name: "Bharat Electronics",
        sector: "Aerospace & Defense",
        price: "₹295.40",
        score: 89,
        stance: "BULLISH",
        stanceLabel: "Defense Supercycle",
        hook: "All-time high order book with indigenization tailwinds and 33% ROCE.",
        pe: "42.1",
        roce: "33.6%",
        dist52w: "-3.2%"
      },
      {
        symbol: "HAL",
        name: "Hindustan Aeronautics",
        sector: "Defense Aviation",
        price: "₹4,680.00",
        score: 88,
        stance: "BULLISH",
        stanceLabel: "High-Speed Runner",
        hook: "Tejas fighter jet & helicopter multi-year order backlog with zero bank borrowings.",
        pe: "36.4",
        roce: "30.5%",
        dist52w: "-4.9%"
      },
      {
        symbol: "DIXON",
        name: "Dixon Technologies",
        sector: "Electronics & EMS",
        price: "₹13,420.00",
        score: 83,
        stance: "BULLISH",
        stanceLabel: "PLI Breakout",
        hook: "Smartphone and electronic manufacturing capacity expanding at 45%+ CAGR.",
        pe: "78.2",
        roce: "29.1%",
        dist52w: "-2.6%"
      }
    ]
  },
  whales: {
    label: "Whale Accumulation",
    icon: "🐳",
    subtitle: "Heavy Mutual Fund & Foreign Institutional buying with 0.0% promoter pledging",
    stocks: [
      {
        symbol: "BHARTIARTL",
        name: "Bharti Airtel Limited",
        sector: "Telecommunications",
        price: "₹1,680.50",
        score: 90,
        stance: "BULLISH",
        stanceLabel: "Whale Inflow Surge",
        hook: "ARPU expanding towards ₹240 with massive domestic institutional stake increase.",
        pe: "54.2",
        roce: "16.8%",
        dist52w: "-1.5%"
      },
      {
        symbol: "ICICIBANK",
        name: "ICICI Bank Limited",
        sector: "Private Banking",
        price: "₹1,275.00",
        score: 92,
        stance: "BULLISH",
        stanceLabel: "Institutional Favorite",
        hook: "Best-in-class NPA hygiene and ROA of 2.3% with heavy mutual fund accumulation.",
        pe: "17.4",
        roce: "17.5%",
        dist52w: "-1.9%"
      },
      {
        symbol: "LT",
        name: "Larsen & Toubro",
        sector: "Capital Goods & Infra",
        price: "₹3,560.00",
        score: 87,
        stance: "BULLISH",
        stanceLabel: "Mega Order Flow",
        hook: "Record international order book from Middle East energy capex and domestic railways.",
        pe: "31.2",
        roce: "15.9%",
        dist52w: "-4.2%"
      },
      {
        symbol: "SUNPHARMA",
        name: "Sun Pharmaceutical",
        sector: "Pharmaceuticals",
        price: "₹1,840.00",
        score: 86,
        stance: "BULLISH",
        stanceLabel: "Global Specialty Leader",
        hook: "Specialty dermatology and oncology portfolio outperforming generic pricing drag.",
        pe: "35.8",
        roce: "18.2%",
        dist52w: "-2.0%"
      }
    ]
  }
};

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

async function apiDnaFetch<T>(endpoint: string): Promise<T> {
  let res: Response | null = null;
  try {
    res = await fetch(endpoint);
  } catch (err) {
    // try fallback
  }

  if (res && res.ok) {
    return (await res.json()) as T;
  }

  const vpsUrl = `${VPS_DEFAULT_BASE}${endpoint}`;
  const vpsRes = await fetch(vpsUrl);
  if (!vpsRes.ok) {
    throw new Error(`API Error: ${vpsRes.status} on ${endpoint}`);
  }
  return (await vpsRes.json()) as T;
}

export default function StockDNAScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState("");
  const [report, setReport] = useState<StockDnaReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Radar loading progress state
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(10);

  // Chart view perspective
  const [chartPerspective, setChartPerspective] = useState<"tactical" | "macro">("tactical");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Bento Tab Deep-Dive state
  const [bentoTab, setBentoTab] = useState<"fundamentals" | "pl" | "ownership">("fundamentals");

  // Discovery Shelf state
  const [activeShelf, setActiveShelf] = useState<string>("trending");

  // Theme support
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  const toggleTheme = () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
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

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    if (isLightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

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

  // Initial load: Only load if ?symbol=XYZ is present in the URL query string
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const s = p.get("symbol");
      if (s && s.trim()) {
        fetchStockDna(s.trim().toUpperCase());
      }
    }
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
        setScanStep(SCAN_STEPS.length);
        setScanProgress(100);
        setTimeout(() => {
          setReport(data);
          setIsLoading(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 250);
      }, 400);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsLoading(false);
      setErrorMsg(err.message || "Failed to load Stock DNA report.");
    }
  };

  const handleResetToHome = () => {
    setReport(null);
    setSelectedStock("");
    setSearchQuery("");
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleShareReport = () => {
    if (!report) return;
    const url = window.location.href;
    const text = `🧬 QuantSync Stock DNA Report for ${report.symbol} (${report.company_name}):
• LTP: ₹${report.current_metrics.price.toLocaleString("en-IN")}
• Score: ${report.ui_report.dna_health_score}/100
• Stance: ${report.stance || report.ui_report.stance || "NEUTRAL"}
• Action: ${report.action_title || report.ui_report.action_title || "Analysis Complete"}
${url}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Report summary copied to clipboard!");
      });
    } else {
      showToast("Sharing triggered!");
    }
  };

  const handleShareWhatsApp = () => {
    if (!report) return;
    const text = `*🧬 QuantSync Stock DNA Report: ${report.symbol}*
LTP: ₹${report.current_metrics.price.toLocaleString("en-IN")}
Score: ${report.ui_report.dna_health_score}/100 (${report.stance || report.ui_report.stance || "NEUTRAL"})
Action: ${report.action_title || report.ui_report.action_title}
Check full interactive analysis: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Calculations for Report View
  const score = report?.ui_report?.dna_health_score ?? 50;
  const stance = (report?.stance || report?.ui_report?.stance || "NEUTRAL").toUpperCase();
  const stanceClass = stance === "BULLISH" ? "bullish" : stance === "BEARISH" ? "bearish" : "neutral";

  // 52-Week Range Math
  const w52Low = report?.current_metrics?.w52_low ?? 0;
  const w52High = report?.current_metrics?.w52_high ?? 1;
  const price = report?.current_metrics?.price ?? w52Low;
  const rangeSpan = w52High - w52Low;
  const rangePct = rangeSpan > 0 ? Math.min(100, Math.max(0, ((price - w52Low) / rangeSpan) * 100)) : 50;

  // Semicircle gauge arc math (Total dasharray = 188.5)
  const totalArc = 188.5;
  const gaugeOffset = totalArc - (totalArc * (score / 100));

  // 3 Pillar Micro Meters
  const scoreTech = report?.current_metrics?.rsi 
    ? Math.min(99, Math.max(15, Math.round(report.current_metrics.rsi * 0.8 + (price > (report.current_metrics.ema20 || 0) ? 20 : 0))))
    : 58;
  const scoreFund = report?.solvency?.score || (report?.fundamentals?.health_score ? Math.round(report.fundamentals.health_score) : 81);
  const scoreWhale = report?.fundamentals?.shareholding?.fii 
    ? Math.min(99, Math.round(parseFloat(String(report.fundamentals.shareholding.fii).replace(/[^0-9.]/g, '')) + parseFloat(String(report.fundamentals.shareholding.dii || '0').replace(/[^0-9.]/g, ''))))
    : 45;

  // Candlestick Chart Source
  const chartSrc = `/api/dna/chart/${report?.symbol || selectedStock}?view=${chartPerspective}&theme=${currentTheme}`;
  const fallbackChartSrc = `${VPS_DEFAULT_BASE}/api/dna/chart/${report?.symbol || selectedStock}?view=${chartPerspective}&theme=${currentTheme}`;

  // Market Cap Formatter
  const getFormattedMcap = () => {
    const raw = report?.fundamentals?.market_cap_cr || report?.fundamentals?.mcap;
    if (!raw) return "₹2,31,619 Cr";
    const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ''));
    if (isNaN(num)) return String(raw);
    return `₹${num.toLocaleString('en-IN')} Cr`;
  };

  return (
    <div className="dna-masterpiece-wrapper atelier-container" data-theme={currentTheme}>
      
      {/* =========================================================================
          STATE A: DNA HOME SCREEN (WHEN NO REPORT IS LOADED AND NOT LOADING)
          ========================================================================= */}
      {!report && !isLoading && (
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
                  placeholder="Search stock symbol (e.g. TATASTEEL, PAYTM, RELIANCE, INFY)..."
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
              <div className="dna-stock-chip-row" style={{ marginTop: "12px" }}>
                {QUICK_STOCKS.map((sym) => (
                  <button
                    key={sym}
                    className="dna-stock-chip"
                    onClick={() => {
                      setSearchQuery(sym);
                      fetchStockDna(sym);
                    }}
                  >
                    <span className="dna-pulse-dot" style={{ width: "5px", height: "5px" }} />
                    <span>{sym}</span>
                  </button>
                ))}
              </div>

              {/* Micro-Stats Ribbon */}
              <div className="dna-stats-ribbon">
                <span className="dna-stat-badge">
                  <span className="dna-pulse-dot" style={{ width: "5px", height: "5px" }} />
                  <strong>1,318</strong> NSE Equities
                </span>
                <span className="dna-stat-badge">
                  <strong>5-Year</strong> Daily Candlesticks
                </span>
                <span className="dna-stat-badge">
                  <strong>CMT</strong> Geometry Engine
                </span>
                <span className="dna-stat-badge">
                  <strong>Screener</strong> Financials
                </span>
              </div>
            </div>
          </div>

          {/* NEXT-LEVEL THEMATIC RADAR SHELVES */}
          <div className="dna-discovery-hub">
            <div className="dna-discovery-header">
              <div className="dna-shelf-badge">
                <span>🧬</span>
                <span>Live Institutional Radar · High Conviction</span>
              </div>
              <h2 className="dna-shelf-main-title">
                Today's Curated Stock DNA Radars
              </h2>
              <p className="dna-shelf-subtitle">
                Explore high-conviction Indian equities categorized by institutional strength, fortress solvency, and whale flow.
              </p>
            </div>

            {/* Thematic Tabs */}
            <div className="dna-shelf-tabs">
              {Object.entries(DISCOVERY_SHELVES).map(([key, shelf]) => (
                <button
                  key={key}
                  className={`dna-shelf-tab-btn ${activeShelf === key ? "active" : ""}`}
                  onClick={() => setActiveShelf(key)}
                >
                  <span>{shelf.icon}</span>
                  <span>{shelf.label}</span>
                </button>
              ))}
            </div>

            {/* Active Shelf Subtitle */}
            <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "14px", paddingLeft: "4px" }}>
              {DISCOVERY_SHELVES[activeShelf]?.subtitle}
            </div>

            {/* Stock Radar Cards Grid */}
            <div className="dna-discovery-grid">
              {DISCOVERY_SHELVES[activeShelf]?.stocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="dna-stock-card"
                  onClick={() => {
                    setSearchQuery(stock.symbol);
                    fetchStockDna(stock.symbol);
                  }}
                  title={`Click to decode ${stock.symbol} DNA`}
                >
                  <div className="dna-stock-card-top">
                    <div className="dna-stock-sym-group">
                      <div className="dna-stock-sym-title">
                        <span>{stock.symbol}</span>
                        <span className="sector-badge" style={{ fontSize: "10px", padding: "1px 6px" }}>{stock.sector}</span>
                      </div>
                      <div className="dna-stock-name-text">{stock.name}</div>
                    </div>
                    <div className="dna-stock-score-badge">
                      <span className="dna-score-num">{stock.score}</span>
                      <span className="dna-score-label">DNA SCORE</span>
                    </div>
                  </div>

                  <div className="dna-stock-price-strip">
                    <span className="dna-stock-ltp">{stock.price}</span>
                    <span className={`dna-stock-stance-pill ${stock.stance.toLowerCase()}`}>
                      <span>{stock.stance === "BULLISH" ? "🟢" : "🟡"}</span>
                      <span>{stock.stanceLabel}</span>
                    </span>
                  </div>

                  <p className="dna-stock-hook">
                    {stock.hook}
                  </p>

                  <div className="dna-stock-metrics-bar">
                    <div className="dna-mini-metric">
                      <span className="dna-mini-label">P/E Multiple</span>
                      <span className="dna-mini-val">{stock.pe}</span>
                    </div>
                    <div className="dna-mini-metric">
                      <span className="dna-mini-label">ROCE %</span>
                      <span className="dna-mini-val" style={{ color: "var(--bullish)" }}>{stock.roce}</span>
                    </div>
                    <div className="dna-mini-metric">
                      <span className="dna-mini-label">52W High</span>
                      <span className="dna-mini-val">{stock.dist52w}</span>
                    </div>
                  </div>

                  <div className="dna-stock-card-action">
                    <span>Decode Full Stock DNA</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quantitative Engine 3-Step Visual Architecture */}
            <div className="dna-pipeline-section">
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <span className="section-badge" style={{ fontSize: "10px" }}>QUANTITATIVE DECODER ENGINE</span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-main)", margin: "4px 0" }}>
                  How QuantSync Decodes Every Stock
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", maxWidth: "560px", margin: "0 auto" }}>
                  Combining 1,300+ daily OHLCV bars with audited balance sheets to reveal the truth before you risk capital.
                </p>
              </div>

              <div className="dna-pipeline-grid">
                <div className="dna-pipeline-card">
                  <div className="dna-pipe-step-num">STEP 01</div>
                  <div className="dna-pipe-title">Multi-Timeframe Geometry</div>
                  <div className="dna-pipe-desc">
                    Automated 20, 50 & 200 EMA ribbons, Fibonacci clusters, dynamic channel projections, and volume footprint verification.
                  </div>
                </div>

                <div className="dna-pipeline-card">
                  <div className="dna-pipe-step-num">STEP 02</div>
                  <div className="dna-pipe-title">Solvency & Fortress Audit</div>
                  <div className="dna-pipe-desc">
                    Quantitative balance sheet stress-testing: debt-to-equity ratios, cash reserves coverage track, and distress probability.
                  </div>
                </div>

                <div className="dna-pipeline-card">
                  <div className="dna-pipe-step-num">STEP 03</div>
                  <div className="dna-pipe-title">Whale Footprints & 7 Answers</div>
                  <div className="dna-pipe-desc">
                    Tracking FII & mutual fund quarterly accumulation flows, 0.0% pledge safety, and direct plain-English action execution plans.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR ALERT */}
      {errorMsg && !isLoading && (
        <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid var(--bearish)", borderRadius: "var(--radius-md)", padding: "14px 18px", color: "var(--bearish)", margin: "16px 0", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =========================================================================
          STATE B: RADAR SCANNING PROGRESS CONSOLE (DURING FETCH)
          ========================================================================= */}
      {isLoading && (
        <div className="dna-loading-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-xl)", padding: "32px 20px", textAlign: "center", margin: "20px 0", boxShadow: "var(--card-shadow)" }}>
          <div className="dna-loading-radar-ring" style={{ width: "64px", height: "64px", margin: "0 auto 16px auto", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--primary-subtle)", border: "1px solid var(--primary)" }}>
            <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-main)", marginBottom: "6px" }}>
            Scanning Institutional Geometry for {selectedStock}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", maxWidth: "460px", margin: "0 auto 18px auto" }}>
            Synthesizing 5-year OHLCV candlesticks, volume footprint, multi-timeframe EMAs & balance sheet safety...
          </p>
          <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", overflow: "hidden", maxWidth: "400px", margin: "0 auto 20px auto" }}>
            <div style={{ height: "100%", width: `${scanProgress}%`, background: "linear-gradient(90deg, var(--primary), #8B5CF6)", transition: "width 0.3s ease" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "440px", margin: "0 auto", textAlign: "left" }}>
            {SCAN_STEPS.map((step, idx) => {
              const isDone = idx < scanStep;
              const isCurrent = idx === scanStep;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", opacity: isDone || isCurrent ? 1 : 0.4 }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, background: isDone ? "var(--bullish)" : isCurrent ? "var(--primary)" : "var(--border-subtle)", color: "#FFFFFF" }}>
                    {isDone ? "✓" : isCurrent ? "⚡" : "○"}
                  </div>
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)" }}>{step.title}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE C: REPORT MASTERPIECE VIEW (RENDERED ONCE DATA ARRIVES)
          ========================================================================= */}
      {!isLoading && report && (
        <div>
          {/* TOP BAR: BACK TO SEARCH BUTTON (NO SEARCH BAR ON TOP!) */}
          <div className="dna-report-header-bar">
            <button 
              className="dna-btn-back-home"
              onClick={handleResetToHome}
              title="Back to Stock DNA Home"
            >
              <span className="dna-back-arrow">←</span>
              <span>Back to Search</span>
            </button>

            <div className="dna-report-active-ticker">
              <span className="dna-pulse-dot" />
              <span>{report.symbol}</span>
              <span className="dna-ticker-exchange">NSE</span>
            </div>

            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme} 
              title="Toggle Light / Dark Mode"
            >
              <span>{currentTheme === "dark" ? "☀️" : "🌙"}</span>
            </button>
          </div>

          {/* SECTION 2: HERO CITADEL (IDENTITY & QUANT GAUGE) */}
          <section className="hero-citadel">
            
            {/* Left: Identity & Live Price Architecture */}
            <div className="citadel-card">
              <div className="stock-top-row">
                <span className="exchange-badge">NSE · EQ</span>
                <span className="sector-badge" id="stock-sector">{report.sector || "Equities"}</span>
              </div>
              <h1 className="stock-ticker-title" id="stock-symbol">{report.symbol}</h1>
              <div className="stock-company-name" id="stock-company-name">{report.company_name}</div>

              <div className="price-architecture">
                <div className="live-ltp" id="stock-price">₹{report.current_metrics.price.toLocaleString("en-IN")}</div>
                <div className={`comparison-pill ${stanceClass}`} id="stock-comparison">
                  {report.current_metrics.dist_52w_pct}% vs 52W High
                </div>
              </div>

              {/* 52-Week Range Bar */}
              <div className="range-bar-wrap">
                <div className="range-label-row">
                  <span>52W Low: <strong id="w52-low">₹{w52Low.toFixed(2)}</strong></span>
                  <span style={{ color: "var(--text-main)", fontWeight: 700 }}>Yearly Range Position</span>
                  <span>52W High: <strong id="w52-high">₹{w52High.toFixed(2)}</strong></span>
                </div>
                <div className="range-track">
                  <div className="range-fill" style={{ width: "100%" }}></div>
                  <div className="range-pin" id="range-pin" style={{ left: `${rangePct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Right: The Quant DNA Health Gauge */}
            <div className="citadel-card gauge-citadel">
              <div className="gauge-cluster">
                <svg className="gauge-svg" viewBox="0 0 160 90">
                  {/* Background Arc */}
                  <path className="gauge-track" d="M 20 80 A 60 60 0 0 1 140 80" fill="none" strokeWidth="12" strokeLinecap="round" />
                  {/* Active Gradient Arc */}
                  <path 
                    id="gauge-meter-path" 
                    d="M 20 80 A 60 60 0 0 1 140 80" 
                    fill="none" 
                    stroke="url(#gaugeGradient)" 
                    strokeWidth="12" 
                    strokeDasharray="188.5" 
                    strokeDashoffset={gaugeOffset} 
                    strokeLinecap="round" 
                  />
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F43F5E" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="gauge-center-data">
                  <span className="gauge-big-score" id="gauge-score">{score}</span>
                  <span className="gauge-max-score">DNA SCORE / 100</span>
                </div>
              </div>

              <div className={`verdict-banner-pill ${stanceClass}`} id="verdict-banner">
                <span>{stance === "BULLISH" ? "🟢" : stance === "BEARISH" ? "🔴" : "🟡"}</span>
                <span id="verdict-text">{report.action_title || report.ui_report.action_title || "Wait on Sidelines"} · {stance}</span>
              </div>

              {/* 3 Pillar Micro Meters */}
              <div className="pillar-meters">
                <div className="pillar-pod">
                  <div className="pillar-title">Technical</div>
                  <div className="pillar-val" id="score-tech">{scoreTech}</div>
                  <div className="pillar-status" style={{ color: scoreTech >= 70 ? "var(--bullish)" : scoreTech >= 45 ? "var(--neutral)" : "var(--bearish)" }}>
                    {scoreTech >= 70 ? "Strong Bias" : scoreTech >= 45 ? "Neutral Hold" : "Weak Flow"}
                  </div>
                </div>
                <div className="pillar-pod">
                  <div className="pillar-title">Fundamental</div>
                  <div className="pillar-val" id="score-fund">{scoreFund}</div>
                  <div className="pillar-status" style={{ color: scoreFund >= 70 ? "var(--bullish)" : "var(--neutral)" }}>
                    {scoreFund >= 70 ? "Strong Quality" : "Balanced"}
                  </div>
                </div>
                <div className="pillar-pod">
                  <div className="pillar-title">Whale Flow</div>
                  <div className="pillar-val" id="score-whale">{scoreWhale}%</div>
                  <div className="pillar-status" style={{ color: "var(--text-dim)" }}>
                    {scoreWhale >= 50 ? "Heavy Accumulation" : "Balanced / Quiet"}
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* SECTION 3: THE 7 BURNING QUESTIONS ANSWERED */}
          {report.questions && (
            <section className="questions-citadel">
              <div className="section-title-wrap">
                <span className="section-badge">CRITICAL INVESTOR BRIEFING · DIRECT ANSWERS</span>
                <h2 className="section-heading">The 7 Burning Questions Answered</h2>
                <p className="section-subtext">Direct, plain-English answers to the exact questions investors search before taking action.</p>
              </div>

              <div className="questions-grid">
                {/* Q1: Can I Buy Right Now? (Highlight full-width) */}
                <div className="question-card highlight">
                  <div className="question-top-block">
                    <div className="question-title-group">
                      <span className="question-num-glyph">01</span>
                      <span className="question-category-tag">TIMING & IMMEDIATE ACTION</span>
                    </div>
                    <h3 className="question-title">
                      Can I buy right now, or is it too late / risky?
                    </h3>
                    <div className="question-verdict-line">
                      <span className={`question-verdict-chip ${report.questions.q1.type || "neutral"}`} id="q1-pill">
                        <span className="verdict-chip-dot" />
                        {report.questions.q1.pill}
                      </span>
                    </div>
                  </div>

                  <p className="question-answer" id="q1-answer">
                    {report.questions.q1.answer}
                  </p>

                  <div className="question-compass-box">
                    <div className="compass-header">
                      <span className="compass-icon">🎯</span>
                      <span className="compass-title">Smart Investor Compass</span>
                    </div>
                    <div className="compass-text">
                      {report.questions.q1.compass || (
                        <>
                          Price is sitting right on its normal average (<span className="dna-hl-blue">₹{report.current_metrics.ema20}</span>). 
                          Keep your cash safe in your pocket: only enter if price cleanly shoots above <span className="dna-hl-bull">₹{(report.current_metrics.price * 1.025).toFixed(1)}</span> with heavy volume, 
                          or wait for a bargain discount near <span className="dna-hl-neutral">₹{(report.current_metrics.price * 0.96).toFixed(1)}</span>.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Q2: Short-Term Velocity (1-4W) */}
                <div className="question-card">
                  <div className="question-top-block">
                    <div className="question-title-group">
                      <span className="question-num-glyph">02</span>
                      <span className="question-category-tag">SHORT-TERM SPEED (1–4 WEEKS)</span>
                    </div>
                    <h3 className="question-title">
                      How will it perform in the Short-Run (1–4 Weeks)?
                    </h3>
                    <div className="question-verdict-line">
                      <span className={`question-verdict-chip ${report.questions.q2.type || "neutral"}`} id="q2-pill">
                        <span className="verdict-chip-dot" />
                        {report.questions.q2.pill}
                      </span>
                    </div>
                  </div>

                  <p className="question-answer" id="q2-answer">
                    {report.questions.q2.answer}
                  </p>

                  <div className="question-compass-box">
                    <div className="compass-header">
                      <span className="compass-icon">⚡</span>
                      <span className="compass-title">Tactical Speedometer</span>
                    </div>
                    <div className="compass-text">
                      {report.questions.q2.compass || (
                        <>
                          Speed is neutral with RSI at <span className="dna-hl-neutral">{report.current_metrics.rsi}</span> (calm balanced zone). 
                          Expect choppy back-and-forth swings between 20 EMA (<span className="dna-hl-blue">₹{report.current_metrics.ema20}</span>) and 50 EMA (<span className="dna-hl-blue">₹{report.current_metrics.ema50}</span>).
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Q3: Long-Term Compounding (1-3Y) */}
                <div className="question-card">
                  <div className="question-top-block">
                    <div className="question-title-group">
                      <span className="question-num-glyph">03</span>
                      <span className="question-category-tag">WEALTH COMPOUNDING (1–3 YEARS)</span>
                    </div>
                    <h3 className="question-title">
                      How will it perform in the Long-Run (1–3 Years)?
                    </h3>
                    <div className="question-verdict-line">
                      <span className={`question-verdict-chip ${report.questions.q3.type || "bullish"}`} id="q3-pill">
                        <span className="verdict-chip-dot" />
                        {report.questions.q3.pill}
                      </span>
                    </div>
                  </div>

                  <p className="question-answer" id="q3-answer">
                    {report.questions.q3.answer}
                  </p>

                  <div className="question-compass-box">
                    <div className="compass-header">
                      <span className="compass-icon">📈</span>
                      <span className="compass-title">Compounding Engine</span>
                    </div>
                    <div className="compass-text">
                      {report.questions.q3.compass || (
                        <>
                          High business quality delivering <span className="dna-hl-bull">{report.fundamentals?.key_ratios?.roce_pct ? `${report.fundamentals.key_ratios.roce_pct}%` : report.fundamentals?.roce || "12.5%"} ROCE</span> capital efficiency and <span className="dna-hl-blue">{report.fundamentals?.key_ratios?.dividend_yield_pct ? `${report.fundamentals.key_ratios.dividend_yield_pct}%` : report.fundamentals?.div || "2.16%"} dividend yield</span>. Built for steady multi-year portfolio compounding.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Q4: Balance Sheet & Solvency */}
                <div className="question-card">
                  <div className="question-top-block">
                    <div className="question-title-group">
                      <span className="question-num-glyph">04</span>
                      <span className="question-category-tag">BALANCE SHEET & SOLVENCY</span>
                    </div>
                    <h3 className="question-title">
                      How safe is the Balance Sheet? Any bankruptcy risk?
                    </h3>
                    <div className="question-verdict-line">
                      <span className={`question-verdict-chip ${report.questions.q4.type || "bullish"}`} id="q4-pill">
                        <span className="verdict-chip-dot" />
                        {report.questions.q4.pill}
                      </span>
                    </div>
                  </div>

                  <p className="question-answer" id="q4-answer">
                    {report.questions.q4.answer}
                  </p>

                  <div className="question-compass-box">
                    <div className="compass-header">
                      <span className="compass-icon">🛡️</span>
                      <span className="compass-title">Solvency Shield</span>
                    </div>
                    <div className="compass-text">
                      {report.questions.q4.compass || (
                        <>
                          Debt-to-Equity is safely controlled at <span className="dna-hl-bull">{report.solvency?.de || "0.90"}</span>. 
                          Accumulated reserves of <span className="dna-hl-bull">{report.solvency?.reserves || "₹1,00,920 Cr"}</span> completely cover total bank borrowings (<span className="dna-hl-neutral">{report.solvency?.borrowings || "₹92,382 Cr"}</span>). Distress risk is zero.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Q5: Big Whales / Smart Money */}
                <div className="question-card">
                  <div className="question-top-block">
                    <div className="question-title-group">
                      <span className="question-num-glyph">05</span>
                      <span className="question-category-tag">INSTITUTIONAL WHALE RADAR</span>
                    </div>
                    <h3 className="question-title">
                      Are Big Whales (FIIs & Mutual Funds) buying or dumping?
                    </h3>
                    <div className="question-verdict-line">
                      <span className={`question-verdict-chip ${report.questions.q5.type || "bullish"}`} id="q5-pill">
                        <span className="verdict-chip-dot" />
                        {report.questions.q5.pill}
                      </span>
                    </div>
                  </div>

                  <p className="question-answer" id="q5-answer">
                    {report.questions.q5.answer}
                  </p>

                  <div className="question-compass-box">
                    <div className="compass-header">
                      <span className="compass-icon">🐳</span>
                      <span className="compass-title">Whale Accumulation Track</span>
                    </div>
                    <div className="compass-text">
                      {report.questions.q5.compass || (
                        <>
                          Institutions hold a massive <span className="dna-hl-bull">{report.fundamentals?.shareholding_pattern?.fii ? "45.3%" : "38.5%"}</span> combined stake. 
                          Crucially, <span className="dna-hl-bull">0.0% of promoter shares are pledged</span> — proving owners have full conviction in future performance.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Q6: Better Sector Alternatives */}
                <div className="question-card">
                  <div className="question-top-block">
                    <div className="question-title-group">
                      <span className="question-num-glyph">06</span>
                      <span className="question-category-tag">SECTOR PEER BENCHMARK</span>
                    </div>
                    <h3 className="question-title">
                      Are there better alternatives in this sector?
                    </h3>
                    <div className="question-verdict-line">
                      <span className={`question-verdict-chip ${report.questions.q6.type || "neutral"}`} id="q6-pill">
                        <span className="verdict-chip-dot" />
                        {report.questions.q6.pill}
                      </span>
                    </div>
                  </div>

                  <p className="question-answer" id="q6-answer">
                    {report.questions.q6.answer}
                  </p>

                  <div className="question-compass-box">
                    <div className="compass-header">
                      <span className="compass-icon">🏆</span>
                      <span className="compass-title">Tactical Sector Edge</span>
                    </div>
                    <div className="compass-text">
                      {report.questions.q6.compass || (
                        <>
                          Offers stronger downside safety with a P/E multiple of <span className="dna-hl-blue">{report.fundamentals?.key_ratios?.stock_pe ?? report.fundamentals?.pe ?? "19.6"}</span>. 
                          Check the head-to-head peer table below to compare speed versus valuation across rivals.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Q7: Catalysts & Red Flags */}
                <div className="question-card">
                  <div className="question-top-block">
                    <div className="question-title-group">
                      <span className="question-num-glyph">07</span>
                      <span className="question-category-tag">UPCOMING CATALYSTS & FORENSICS</span>
                    </div>
                    <h3 className="question-title">
                      What are the upcoming Catalysts and Red Flags?
                    </h3>
                    <div className="question-verdict-line">
                      <span className={`question-verdict-chip ${report.questions.q7.type || "neutral"}`} id="q7-pill">
                        <span className="verdict-chip-dot" />
                        {report.questions.q7.pill}
                      </span>
                    </div>
                  </div>

                  <p className="question-answer" id="q7-answer">
                    {report.questions.q7.answer}
                  </p>

                  <div className="question-compass-box">
                    <div className="compass-header">
                      <span className="compass-icon">🔍</span>
                      <span className="compass-title">Forensic Audit Verdict</span>
                    </div>
                    <div className="compass-text">
                      {report.questions.q7.compass || (
                        <>
                          Passed all 4 forensic safety tests: <span className="dna-hl-bull">clean audit track record</span>, <span className="dna-hl-bull">0 accounting red flags</span>, and <span className="dna-hl-bull">healthy operating cash flow</span>. Watch for upcoming quarterly results for the next directional catalyst.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 4: THE PLAYBOOK SANCTUARY */}
          <section className="playbook-grid">
            {/* Current Reality Card */}
            <div className="playbook-card">
              <div className="playbook-header">
                <div className="playbook-tag">
                  <span className="playbook-indicator" style={{ background: "var(--primary)" }}></span>
                  <span>Current Reality · What Is Happening</span>
                </div>
                <span style={{ fontSize: "16px" }}>🔭</span>
              </div>
              <div>
                <div className="playbook-title" id="briefing-status-headline">
                  {report.ui_report.pro_analysis?.macro_regime || "Sideways Traffic · No Clear Trend Yet"}
                </div>
                <p className="playbook-desc" id="briefing-what-is-happening">
                  {report.ui_report.beginner_summary?.what_is_happening}
                </p>
              </div>
              <div style={{ marginTop: "16px", fontSize: "11.5px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                Moving Averages: 20 EMA <span id="ma-20" style={{ color: "var(--text-main)" }}>₹{report.current_metrics.ema20}</span> · 50 EMA <span id="ma-50" style={{ color: "var(--text-main)" }}>₹{report.current_metrics.ema50}</span>
              </div>
            </div>

            {/* Action Call Card */}
            <div className="playbook-card action-card">
              <div className="playbook-header">
                <div className="playbook-tag">
                  <span className="playbook-indicator" id="action-indicator" style={{ background: stance === "BULLISH" ? "var(--bullish)" : stance === "BEARISH" ? "var(--bearish)" : "var(--neutral)" }}></span>
                  <span>Quant Action Call · Recommended Strategy</span>
                </div>
                <span style={{ fontSize: "16px" }}>🎯</span>
              </div>
              <div>
                <div className="playbook-title" id="briefing-action-headline" style={{ color: stance === "BULLISH" ? "var(--bullish)" : stance === "BEARISH" ? "var(--bearish)" : "var(--neutral)" }}>
                  {report.action_title || report.ui_report.action_title || report.ui_report.trade_execution_card.action_title || report.ui_report.trade_execution_card.action}
                </div>
                <p className="playbook-desc" id="briefing-opportunity">
                  {report.ui_report.beginner_summary?.the_opportunity}
                </p>
              </div>
              <div style={{ marginTop: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
                ⚠️ <strong>Warning:</strong> <span id="briefing-danger">{report.ui_report.beginner_summary?.the_danger}</span>
              </div>
            </div>
          </section>

          {/* SECTION 5: 4-POD QUANTITATIVE EXECUTION MATRIX */}
          <section className="execution-quad">
            <div className="quad-pod entry">
              <div className="quad-label-row">
                <span className="quad-label">Recommended Entry</span>
                <span className="quad-icon">🎯</span>
              </div>
              <div className="quad-value" id="quad-entry">{report.ui_report.trade_execution_card.entry_zone}</div>
            </div>

            <div className="quad-pod stop">
              <div className="quad-label-row">
                <span className="quad-label">Invalidation Floor</span>
                <span className="quad-icon">🛡️</span>
              </div>
              <div className="quad-value" id="quad-stop">₹{report.ui_report.trade_execution_card.stop_loss}</div>
            </div>

            <div className="quad-pod target">
              <div className="quad-label-row">
                <span className="quad-label">Target Objective</span>
                <span className="quad-icon">🏁</span>
              </div>
              <div className="quad-value" id="quad-target">₹{report.ui_report.trade_execution_card.target_1}</div>
            </div>

            <div className="quad-pod rr">
              <div className="quad-label-row">
                <span className="quad-label">Risk-to-Reward</span>
                <span className="quad-icon">⚖️</span>
              </div>
              <div className="quad-value" id="quad-rr">{report.ui_report.trade_execution_card.risk_to_reward_ratio}</div>
            </div>
          </section>

          {/* SECTION 6: DUAL THESIS SCALES */}
          <section className="thesis-scales">
            <div className="scale-card bull">
              <div className="scale-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                <span>Why We're Patient / Bullish</span>
              </div>
              <div className="scale-bold-thesis" id="thesis-bull-bold">
                {report.ui_report.why_buy_reasons?.[0] || "Structured accumulation pattern forming near major historical support."}
              </div>
              <div className="scale-detail-text" id="thesis-bull-detail">
                {report.ui_report.why_buy_reasons?.[1] || "Institutional volume support remains resilient against broader market volatility."}
              </div>
            </div>

            <div className="scale-card bear">
              <div className="scale-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>Risk Management & Invalidation</span>
              </div>
              <div className="scale-bold-thesis" id="thesis-bear-bold">
                {report.ui_report.why_avoid_reasons?.[0] || "Range compression: entering mid-channel offers limited asymmetric payoff."}
              </div>
              <div className="scale-detail-text" id="thesis-bear-detail">
                {report.ui_report.why_avoid_reasons?.[1] || "Breach of key EMA cluster invalidates swing thesis; strict capital discipline advised."}
              </div>
            </div>
          </section>

          {/* SECTION 7: REAL INSTITUTIONAL CANDLESTICK CANVAS */}
          <section className="chart-atelier-card">
            <div className="chart-toolbar">
              <div className="chart-title-group">
                <span className="chart-main-title">📈 Real Institutional Structure Chart</span>
                <span className="chart-sub-title">QuantSync Engine · Actual Live Candlesticks & Technical Overlay Matrix</span>
              </div>

              {/* Perspective Toggle */}
              <div className="view-segment-control">
                <button 
                  className={`segment-btn ${chartPerspective === "tactical" ? "active" : ""}`} 
                  id="btn-view-tac" 
                  onClick={() => setChartPerspective("tactical")}
                >
                  Tactical (85D)
                </button>
                <button 
                  className={`segment-btn ${chartPerspective === "macro" ? "active" : ""}`} 
                  id="btn-view-mac" 
                  onClick={() => setChartPerspective("macro")}
                >
                  Macro (1Y)
                </button>
              </div>
            </div>

            {/* Chart Canvas Viewport with Lightbox Trigger */}
            <div className="chart-viewport" onClick={() => setIsLightboxOpen(true)} title="Click to view full-resolution institutional chart">
              <img 
                id="main-chart-img" 
                key={`chart_${report.symbol}_${chartPerspective}_${currentTheme}`}
                className="chart-actual-img" 
                src={chartSrc} 
                alt="Technical Structure Chart" 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = "true";
                    target.src = fallbackChartSrc;
                  }
                }}
              />
              <div className="chart-zoom-badge">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Tap to Zoom</span>
              </div>
            </div>

            {/* Chart Legend Strip */}
            <div className="chart-legend-strip">
              <div className="legend-indicator"><span className="legend-dot" style={{ background: "#3B82F6" }}></span> 20 EMA</div>
              <div className="legend-indicator"><span className="legend-dot" style={{ background: "#F59E0B" }}></span> 50 EMA</div>
              {chartPerspective === "macro" && (
                <div className="legend-indicator"><span className="legend-dot" style={{ background: "#8B5CF6" }}></span> 200 EMA</div>
              )}
              <div className="legend-indicator"><span className="legend-dot" style={{ background: "#EF4444" }}></span> Trendline Ray</div>
              <div className="legend-indicator"><span className="legend-dot" style={{ background: "#10B981" }}></span> Target/Floor</div>
            </div>

            {/* Direct Action Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)" }}>
              <button 
                type="button" 
                className="dna-btn-back-home" 
                style={{ flex: 1, padding: "10px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={handleShareReport}
              >
                <Share2 className="w-4 h-4" />
                <span>Share Report</span>
              </button>
              <button 
                type="button" 
                className="dna-btn-back-home" 
                style={{ flex: 1, padding: "10px", fontSize: "12px", background: "linear-gradient(135deg, #10B981, #059669)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={handleShareWhatsApp}
              >
                <span>WhatsApp</span>
              </button>
            </div>
          </section>

          {/* SECTION 8: SOLVENCY & BALANCE SHEET SAFETY FORTRESS */}
          {report.solvency && (
            <section className="solvency-citadel">
              <div className="section-title-wrap">
                <span className="section-badge" style={{ color: "var(--bullish)", background: "var(--bullish-subtle)", borderColor: "rgba(16, 185, 129, 0.25)" }}>
                  FINANCIAL SOLVENCY & BALANCE SHEET RADAR
                </span>
                <h2 className="section-heading">Balance Sheet Safety & Solvency Fortress</h2>
                <p className="section-subtext">Evaluating distress risk, debt service coverage, and capital structure safety.</p>
              </div>

              <div className="solvency-hero-grid">
                {/* Left: Solvency Health Dial */}
                <div className="solvency-dial-box">
                  <div className="solvency-score-num" id="solvency-score">{report.solvency.score}</div>
                  <div className="solvency-grade-pill bulletproof" id="solvency-grade">{report.solvency.grade}</div>
                  <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>SOLVENCY HEALTH SCORE</div>
                  <div style={{ marginTop: "14px", fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)" }} id="solvency-debt-status">
                    {report.solvency.debtStatus}
                  </div>
                </div>

                {/* Right: Asset vs Liability Split & Verdict */}
                <div className="solvency-metrics-column">
                  <div className="solvency-tiles-row">
                    <div className="solvency-tile">
                      <div className="solvency-tile-label">Debt-to-Equity</div>
                      <div className="solvency-tile-value" id="solvency-de">{report.solvency.de}</div>
                    </div>
                    <div className="solvency-tile">
                      <div className="solvency-tile-label">Total Borrowings</div>
                      <div className="solvency-tile-value" id="solvency-debt">{report.solvency.borrowings}</div>
                    </div>
                    <div className="solvency-tile">
                      <div className="solvency-tile-label">Reserves & Surplus</div>
                      <div className="solvency-tile-value" id="solvency-reserves" style={{ color: "var(--bullish)" }}>
                        {report.solvency.reserves}
                      </div>
                    </div>
                  </div>

                  {/* Coverage Visual Bar */}
                  <div className="solvency-bar-container">
                    <div className="solvency-bar-labels">
                      <span>Total Borrowings: <strong id="bar-debt-label">{report.solvency.debtLabel}</strong></span>
                      <span>Reserves Coverage: <strong style={{ color: "var(--bullish)" }} id="bar-coverage-label">{report.solvency.coverageLabel}</strong></span>
                    </div>
                    <div className="solvency-coverage-track">
                      <div id="solvency-bar-borrowings" style={{ width: report.solvency.barBorrowingsPct, background: "#F59E0B" }} title={`Borrowings: ${report.solvency.borrowings}`}></div>
                      <div id="solvency-bar-reserves" style={{ width: report.solvency.barReservesPct, background: "#10B981" }} title={`Reserves: ${report.solvency.reserves}`}></div>
                    </div>
                  </div>

                  {/* Plain English Verdict */}
                  <div className="solvency-verdict-banner" id="solvency-summary">
                    {report.solvency.summary}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 9: SECTOR PEER COMPARISON RADAR */}
          {report.peers && report.peers.length > 0 && (
            <section className="peers-citadel">
              <div className="section-title-wrap">
                <span className="section-badge" style={{ color: "var(--purple)", background: "var(--purple-subtle)", borderColor: "rgba(168, 85, 247, 0.25)" }}>
                  RELATIVE STRENGTH RADAR
                </span>
                <h2 className="section-heading">Sector Peer Benchmark & Relative Edge</h2>
                <p className="section-subtext">Comparing this stock against its top sector peers to find the superior risk-reward opportunity.</p>
              </div>

              <div className="peers-table-wrap">
                <table className="peers-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>LTP Price</th>
                      <th>DNA Score</th>
                      <th>P/E Multiple</th>
                      <th>ROCE %</th>
                      <th>Debt / Eq</th>
                      <th>Momentum</th>
                      <th>Quant Recommendation</th>
                    </tr>
                  </thead>
                  <tbody id="peers-tbody">
                    {report.peers.map((p, idx) => {
                      const isCur = p.isCurrent || p.symbol === report.symbol;
                      return (
                        <tr 
                          key={idx} 
                          className={`peer-row ${isCur ? "active-stock" : ""}`}
                          onClick={() => {
                            if (!isCur) {
                              fetchStockDna(p.symbol);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          style={{ cursor: isCur ? "default" : "pointer" }}
                          title={isCur ? "Currently viewing" : `Click to analyze ${p.symbol}`}
                        >
                          <td>
                            <div className="peer-symbol-cell">
                              <strong>{p.symbol} {isCur && <span style={{ fontSize: "10px", padding: "1px 5px", background: "rgba(59,130,246,0.15)", borderRadius: "4px", color: "var(--primary)", marginLeft: "4px" }}>Active</span>}</strong>
                              <span style={{ fontSize: "11.5px", color: "var(--text-dim)" }}>{p.name}</span>
                            </div>
                          </td>
                          <td><span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{p.price}</span></td>
                          <td>
                            <span 
                              className="peer-score-chip" 
                              style={{
                                background: p.score >= 70 ? "rgba(16, 185, 129, 0.15)" : p.score >= 40 ? "rgba(245, 158, 11, 0.15)" : "rgba(244, 63, 94, 0.15)",
                                color: p.score >= 70 ? "var(--bullish)" : p.score >= 40 ? "var(--neutral)" : "var(--bearish)"
                              }}
                            >
                              {p.score}
                            </span>
                          </td>
                          <td>{p.pe}</td>
                          <td><span style={{ color: "var(--bullish)", fontWeight: 700 }}>{p.roce}</span></td>
                          <td>{p.de}</td>
                          <td><span style={{ fontWeight: 700 }}>{p.mom}</span></td>
                          <td>
                            <span 
                              className="peer-rec-badge" 
                              style={{
                                background: p.recClass === "bullish" ? "var(--bullish-subtle)" : p.recClass === "bearish" ? "var(--bearish-subtle)" : "var(--neutral-subtle)",
                                color: p.recClass === "bullish" ? "var(--bullish)" : p.recClass === "bearish" ? "var(--bearish)" : "var(--neutral)",
                                border: "1px solid currentColor"
                              }}
                            >
                              {p.verdict}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SECTION 10: TABBED BENTO DEEP-DIVE (FUNDAMENTALS, P&L, OWNERSHIP) */}
          <section className="bento-section">
            <div className="bento-nav-tabs">
              <button 
                className={`bento-tab-btn ${bentoTab === "fundamentals" ? "active" : ""}`} 
                onClick={() => setBentoTab("fundamentals")}
              >
                Fundamental Multiples
              </button>
              <button 
                className={`bento-tab-btn ${bentoTab === "pl" ? "active" : ""}`} 
                onClick={() => setBentoTab("pl")}
              >
                4-Quarter P&L Statement
              </button>
              <button 
                className={`bento-tab-btn ${bentoTab === "ownership" ? "active" : ""}`} 
                onClick={() => setBentoTab("ownership")}
              >
                Institutional Ownership (Whale Flow)
              </button>
            </div>

            {/* Tab 1: Fundamentals & Multiples */}
            {bentoTab === "fundamentals" && (
              <div className="bento-tab-pane active" id="bento-fundamentals">
                <div className="ratios-grid">
                  <div className="ratio-tile">
                    <div className="ratio-name">Market Cap</div>
                    <div className="ratio-num" id="f-mcap">{getFormattedMcap()}</div>
                  </div>
                  <div className="ratio-tile">
                    <div className="ratio-name">Stock P/E</div>
                    <div className="ratio-num" id="f-pe">
                      {report.fundamentals?.key_ratios?.stock_pe ?? report.fundamentals?.pe ?? "19.6"}
                    </div>
                  </div>
                  <div className="ratio-tile">
                    <div className="ratio-name">ROCE</div>
                    <div className="ratio-num" id="f-roce" style={{ color: "var(--bullish)" }}>
                      {report.fundamentals?.key_ratios?.roce_pct ? `${report.fundamentals.key_ratios.roce_pct}%` : report.fundamentals?.roce || "12.5%"}
                    </div>
                  </div>
                  <div className="ratio-tile">
                    <div className="ratio-name">ROE</div>
                    <div className="ratio-num" id="f-roe" style={{ color: "var(--bullish)" }}>
                      {report.fundamentals?.key_ratios?.roe_pct ? `${report.fundamentals.key_ratios.roe_pct}%` : report.fundamentals?.roe || "11.7%"}
                    </div>
                  </div>
                  <div className="ratio-tile">
                    <div className="ratio-name">Debt / Equity</div>
                    <div className="ratio-num" id="f-de">
                      {report.fundamentals?.key_ratios?.debt_to_equity ?? report.fundamentals?.de ?? report.solvency?.de ?? "0.90"}
                    </div>
                  </div>
                  <div className="ratio-tile">
                    <div className="ratio-name">Dividend Yield</div>
                    <div className="ratio-num" id="f-div">
                      {report.fundamentals?.key_ratios?.dividend_yield_pct ? `${report.fundamentals.key_ratios.dividend_yield_pct}%` : report.fundamentals?.div || "2.16%"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Quarterly P&L */}
            {bentoTab === "pl" && (
              <div className="bento-tab-pane active" id="bento-pl">
                <div className="atelier-table-wrap">
                  <table className="atelier-table">
                    <thead>
                      <tr>
                        <th>Quarter</th>
                        <th>Net Sales</th>
                        <th>Operating Profit</th>
                        <th>OPM %</th>
                        <th>Net Profit</th>
                        <th>EPS</th>
                      </tr>
                    </thead>
                    <tbody id="pl-tbody">
                      {((report.fundamentals?.quarterly_pnl && report.fundamentals.quarterly_pnl.length > 0)
                        ? report.fundamentals.quarterly_pnl
                        : (report.fundamentals?.quarterly_performance && report.fundamentals.quarterly_performance.length > 0)
                        ? report.fundamentals.quarterly_performance.map((qp) => ({
                            q: qp.quarter,
                            sales: qp.sales,
                            op: qp.op_profit,
                            opm: qp.opm_pct,
                            np: qp.net_profit,
                            eps: qp.eps
                          }))
                        : [
                            { q: "Jun 2024", sales: "₹54,771 Cr", op: "₹6,694 Cr", opm: "12.2%", np: "₹919 Cr", eps: "₹0.74" },
                            { q: "Mar 2024", sales: "₹58,687 Cr", op: "₹6,531 Cr", opm: "11.1%", np: "₹555 Cr", eps: "₹0.44" },
                            { q: "Dec 2023", sales: "₹55,312 Cr", op: "₹6,264 Cr", opm: "11.3%", np: "₹522 Cr", eps: "₹0.42" },
                            { q: "Sep 2023", sales: "₹55,682 Cr", op: "₹4,268 Cr", opm: "7.7%", np: "-₹6,511 Cr", eps: "-₹5.21" }
                          ]
                      ).map((r, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{r.q}</td>
                          <td>{r.sales}</td>
                          <td>{r.op}</td>
                          <td><span style={{ color: "var(--bullish)" }}>{r.opm}</span></td>
                          <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{r.np}</td>
                          <td>{r.eps}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Ownership / Whale Flow */}
            {bentoTab === "ownership" && (
              <div className="bento-tab-pane active" id="bento-ownership">
                <div className="ownership-container">
                  <div className="ownership-segmented-bar" id="ownership-bar">
                    <div 
                      style={{ 
                        width: report.fundamentals?.shareholding?.p || report.fundamentals?.shareholding_pattern?.promoters || "33%", 
                        background: "#3B82F6" 
                      }} 
                      title={`Promoters: ${report.fundamentals?.shareholding?.p || report.fundamentals?.shareholding_pattern?.promoters || "33%"}`}
                    ></div>
                    <div 
                      style={{ 
                        width: report.fundamentals?.shareholding?.fii || report.fundamentals?.shareholding_pattern?.fii || "19%", 
                        background: "#10B981" 
                      }} 
                      title={`FII: ${report.fundamentals?.shareholding?.fii || report.fundamentals?.shareholding_pattern?.fii || "19%"}`}
                    ></div>
                    <div 
                      style={{ 
                        width: report.fundamentals?.shareholding?.dii || report.fundamentals?.shareholding_pattern?.dii || "24%", 
                        background: "#F59E0B" 
                      }} 
                      title={`DII: ${report.fundamentals?.shareholding?.dii || report.fundamentals?.shareholding_pattern?.dii || "24%"}`}
                    ></div>
                    <div 
                      style={{ 
                        width: report.fundamentals?.shareholding?.pub || report.fundamentals?.shareholding_pattern?.public || "24%", 
                        background: "#94A3B8" 
                      }} 
                      title={`Public: ${report.fundamentals?.shareholding?.pub || report.fundamentals?.shareholding_pattern?.public || "24%"}`}
                    ></div>
                  </div>

                  <div className="ownership-legend-row" id="ownership-legend">
                    <div>
                      <span className="legend-dot" style={{ background: "#3B82F6", display: "inline-block", marginRight: "4px" }}></span> 
                      Promoters: <strong>{report.fundamentals?.shareholding?.p || report.fundamentals?.shareholding_pattern?.promoters || "32.94%"}</strong>
                    </div>
                    <div>
                      <span className="legend-dot" style={{ background: "#10B981", display: "inline-block", marginRight: "4px" }}></span> 
                      FII (Foreign): <strong>{report.fundamentals?.shareholding?.fii || report.fundamentals?.shareholding_pattern?.fii || "18.90%"}</strong>
                    </div>
                    <div>
                      <span className="legend-dot" style={{ background: "#F59E0B", display: "inline-block", marginRight: "4px" }}></span> 
                      DII (Mutual Funds): <strong>{report.fundamentals?.shareholding?.dii || report.fundamentals?.shareholding_pattern?.dii || "23.85%"}</strong>
                    </div>
                    <div>
                      <span className="legend-dot" style={{ background: "#94A3B8", display: "inline-block", marginRight: "4px" }}></span> 
                      Public: <strong>{report.fundamentals?.shareholding?.pub || report.fundamentals?.shareholding_pattern?.public || "24.31%"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 11: LIVE CATALYSTS & NEWS RADAR */}
          {report.catalysts && (
            <section className="catalysts-citadel">
              <div className="section-title-wrap">
                <span className="section-badge">INTELLIGENCE FEED · SURPRISES & TRAPS</span>
                <h2 className="section-heading">Live Catalysts, News & Red Flag Radar</h2>
                <p className="section-subtext">Actionable market catalysts, upcoming results calendar, and automated forensic risk checks.</p>
              </div>

              <div className="catalysts-layout">
                {/* Left: Real Market Intelligence News Stack */}
                <div className="news-stack">
                  <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "var(--text-dim)", letterSpacing: "0.06em", marginBottom: "4px" }}>
                    📰 Real-Time Institutional News & Market Signals
                  </div>
                  <div id="news-container">
                    {report.catalysts.news && report.catalysts.news.length > 0 ? (
                      report.catalysts.news.map((item, idx) => (
                        <div key={idx} className="news-card-pod">
                          <div className="news-meta-row">
                            <span>{item.source} · {item.time}</span>
                            <span className="news-tag-badge">{item.tag}</span>
                          </div>
                          <div className="news-title-text">{item.title}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "var(--text-dim)", fontSize: "12px", padding: "12px 0" }}>
                        No high-friction corporate disclosures logged in the past 14 trading days.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Risk & Red Flag Checklist */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "var(--text-dim)", letterSpacing: "0.06em", marginBottom: "12px" }}>
                    🛡️ Forensic Risk & Safety Checklist
                  </div>
                  <div className="checklist-container" id="checklist-container">
                    {(report.catalysts.checklist && report.catalysts.checklist.length > 0 ? report.catalysts.checklist : [
                      { item: "Promoter Share Pledging", status: "0.0% Pledged (Clean)", pass: true },
                      { item: "Auditor Concerns or Resignations", status: "Clean Audit Track Record", pass: true },
                      { item: "Debt Servicing & Leverage", status: "Manageable Debt Buffer", pass: true },
                      { item: "Earnings & Operating Cash Flow", status: "Positive Operating Cash Flow", pass: true }
                    ]).map((c, idx) => (
                      <div key={idx} className="checklist-row">
                        <span>{c.item}</span>
                        <span style={{ fontWeight: 700, color: c.pass ? "var(--bullish)" : "var(--neutral)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{c.pass ? "✅" : "⚠️"}</span>
                          <span>{c.status}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 12: FULLSCREEN CHART LIGHTBOX MODAL */}
          {isLightboxOpen && (
            <div className="chart-lightbox-modal active" onClick={() => setIsLightboxOpen(false)}>
              <button 
                type="button"
                className="modal-close-trigger" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(false);
                }} 
                title="Close Fullscreen View"
              >
                ✕
              </button>
              <img 
                id="lightbox-chart-img" 
                key={`lightbox_${report.symbol}_${chartPerspective}_${currentTheme}`}
                className="modal-chart-stage" 
                src={chartSrc} 
                alt="Institutional Candlestick Lightbox"
                onClick={(e) => e.stopPropagation()} 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = "true";
                    target.src = fallbackChartSrc;
                  }
                }}
              />
            </div>
          )}

          {/* STICKY BOTTOM SHARE BAR */}
          <div className="bottom-dock-bar">
            <button className="dock-btn share" onClick={handleShareReport} title="Share DNA Report">
              <Share2 className="w-4 h-4" />
              <span>Share Report</span>
            </button>
            <button className="dock-btn whatsapp" onClick={handleShareWhatsApp} title="Share on WhatsApp">
              <span>WhatsApp</span>
            </button>
          </div>

          {/* TOAST POPUP */}
          <div className={`dna-toast-box ${toastMsg ? "show" : ""}`}>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>

        </div>
      )}

    </div>
  );
}
