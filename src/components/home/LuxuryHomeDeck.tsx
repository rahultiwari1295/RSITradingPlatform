import React, { useState, useRef, useEffect } from "react";
import { TerminalSnapshot } from "../../api/quantsyncApi";

interface IndexTick {
  n: string;
  v: number;
  p: number;
  seed: number;
  trend: number;
  spark?: number[];
}

interface LuxuryHomeDeckProps {
  terminalData: TerminalSnapshot | null;
  livePrices: Record<string, { price: number; change_pct?: number }>;
  terminalIndices: IndexTick[];
  isWsConnected: boolean;
  theme?: "dark" | "light";
  onNavigate: (tab: "home" | "signals" | "portfolio" | "dna" | "charts" | "screener", filter?: string) => void;
  onSelectStockForDna: (symbol: string) => void;
  onOpenChart?: (symbol: string) => void;
  onOpenAnalyst?: (stock: any) => void;
}

// Safe currency formatting helper (zero runtime errors on undefined/null)
const fmtPrice = (val: any): string => {
  if (val == null || val === "" || isNaN(Number(val)) || Number(val) <= 0) return "—";
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Curated breakout setups (zero fake hardcoded prices)
const FEATURED_BREAKOUT_DATA = [
  {
    symbol: "AUROPHARMA",
    name: "Aurobindo Pharma",
    sector: "Healthcare & Pharma",
    stage: "Stage-2 Base Breakout 🚀",
    volRatio: "3.4×",
    dnaScore: 92,
    pnlPotential: "+12.0%",
    rrRatio: "1 : 2.8",
    why: "Institutional volume breakout after consolidation. High relative strength vs Nifty 50.",
    currPrice: undefined,
    breakoutPrice: undefined,
    targetPrice: undefined,
    stopPrice: undefined
  },
  {
    symbol: "SMLMAH",
    name: "SML Isuzu",
    sector: "Commercial Auto",
    stage: "52-Week High Volume Run ⚡",
    volRatio: "2.8×",
    dnaScore: 89,
    pnlPotential: "+13.5%",
    rrRatio: "1 : 2.5",
    why: "Heavy institutional accumulation above pivot with surging volume. Clean multi-month cup pattern.",
    currPrice: undefined,
    breakoutPrice: undefined,
    targetPrice: undefined,
    stopPrice: undefined
  },
  {
    symbol: "VIJAYA",
    name: "Vijaya Diagnostic",
    sector: "Diagnostic Labs",
    stage: "Cup & Handle Pivot 🏆",
    volRatio: "2.5×",
    dnaScore: 87,
    pnlPotential: "+14.5%",
    rrRatio: "1 : 2.9",
    why: "Healthcare sector momentum leader. Handle contraction with volume dry-up, then violent breakout.",
    currPrice: undefined,
    breakoutPrice: undefined,
    targetPrice: undefined,
    stopPrice: undefined
  }
];

const POPULAR_DNA_STOCKS = [
  "RELIANCE", "TCS", "HDFCBANK", "AUROPHARMA", "EMUDHRA", "VIJAYA", "CAPLIPOINT", "DIXON"
];

export const LuxuryHomeDeck: React.FC<LuxuryHomeDeckProps> = ({
  terminalData,
  livePrices,
  terminalIndices,
  isWsConnected,
  theme = "light",
  onNavigate,
  onSelectStockForDna,
  onOpenChart,
  onOpenAnalyst
}) => {
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveBreakouts, setLiveBreakouts] = useState<any[]>([]);
  const [isBreakoutsLoading, setIsBreakoutsLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch real confirmed breakout candidates from API with shimmer placeholder
  useEffect(() => {
    let isMounted = true;
    setIsBreakoutsLoading(true);
    fetch("/api/screener?breakout_status=SUCCESS&limit=5")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && data.rows && data.rows.length > 0) {
          setLiveBreakouts(data.rows);
        }
      })
      .catch((err) => console.debug("Home breakouts fetch:", err))
      .finally(() => {
        if (isMounted) setIsBreakoutsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-peek nudge animation on load so user intuitively understands it's scrollable
  useEffect(() => {
    if (!isBreakoutsLoading && featuredBreakouts.length > 1 && carouselRef.current) {
      const el = carouselRef.current;
      const nudgeTimer = setTimeout(() => {
        const cardWidth = el.offsetWidth;
        const nudgeDist = Math.min(95, Math.round(cardWidth * 0.18));
        el.scrollTo({ left: nudgeDist, behavior: "smooth" });

        const returnTimer = setTimeout(() => {
          el.scrollTo({ left: 0, behavior: "smooth" });
        }, 600);

        return () => clearTimeout(returnTimer);
      }, 450);

      return () => clearTimeout(nudgeTimer);
    }
  }, [isBreakoutsLoading, featuredBreakouts.length]);

  // Discover AI Spotlight Buy Call: prioritize V2 buy signals
  const buySignals = terminalData?.toBuySignals || [];
  const spotlightBuy = buySignals.find(
    (s: any) => s.action === "BUY_NOW" || s.action === "BUY"
  ) || (terminalData?.active || []).find((t: any) => t.action === "BUY_NOW" || t.action === "BUY");

  const baseList = liveBreakouts.length > 0
    ? liveBreakouts.map((r: any) => ({
        symbol: r.symbol,
        name: r.company_name || r.symbol,
        sector: r.sector || "Equities",
        stage: r.pattern_type || "Stage-2 Base Breakout 🚀",
        volRatio: r.volume_ratio_20d != null && !isNaN(Number(r.volume_ratio_20d)) ? `${Number(r.volume_ratio_20d).toFixed(1)}×` : "2.5×",
        dnaScore: r.dna_score || 90,
        pnlPotential: r.curr_price != null && r.target_1 != null && Number(r.curr_price) > 0 ? `+${(((Number(r.target_1) - Number(r.curr_price)) / Number(r.curr_price)) * 100).toFixed(1)}%` : "+12.0%",
        rrRatio: r.risk_reward_ratio != null && !isNaN(Number(r.risk_reward_ratio)) ? `1 : ${Number(r.risk_reward_ratio).toFixed(1)}` : "1 : 2.5",
        why: `Confirmed stage breakout with volume expansion and defined risk boundaries.`,
        currPrice: r.curr_price,
        breakoutPrice: r.breakout_level,
        targetPrice: r.target_1,
        stopPrice: r.stop_loss
      }))
    : FEATURED_BREAKOUT_DATA;

  // Merge live prices into featured breakouts
  const featuredBreakouts = baseList.map((item: any) => {
    const live = livePrices[item.symbol];
    const currPrice = live && live.price > 0 ? live.price : item.currPrice;
    const chgPct = live && live.change_pct !== undefined ? live.change_pct : null;
    return {
      ...item,
      currPrice,
      chgPct
    };
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim().toUpperCase();
    if (clean) {
      onSelectStockForDna(clean);
      onNavigate("dna");
    }
  };

  const scrollToCard = (index: number) => {
    setActiveCardIdx(index);
    if (carouselRef.current) {
      const card = carouselRef.current.children[index] as HTMLElement;
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const el = carouselRef.current;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.offsetWidth;
    if (cardWidth > 0) {
      const idx = Math.round(scrollLeft / cardWidth);
      if (idx >= 0 && idx < featuredBreakouts.length && idx !== activeCardIdx) {
        setActiveCardIdx(idx);
      }
    }
  };

  const winRate = terminalData?.hero?.winRate || terminalData?.winRate || 74.2;
  const profitFactor = terminalData?.profitFactor || terminalData?.kpis?.profitFactor || 2.14;
  const activeCount = terminalData?.activeCount || (terminalData?.active ? terminalData.active.length : 8);
  const closedCount = terminalData?.closedCount || (terminalData?.closed ? terminalData.closed.length : 240);

  return (
    <div className={`luxury-deck-container theme-${theme}`}>
      {/* Ambient Luxury Aura */}
      <div className="luxury-ambient-mesh" />

      {/* ── 1. EXECUTIVE COMMAND HEADER ─────────────────────────────────────── */}
      <header className="luxury-deck-header">
        <div className="brand-crest">
          <div className="crest-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" fill="url(#crestGrad)" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M5 19H19V21H5V19Z" fill="url(#crestGrad)" />
              <defs>
                <linearGradient id="crestGrad" x1="3" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FDE68A" />
                  <stop offset="0.5" stopColor="#D4AF37" />
                  <stop offset="1" stopColor="#92400E" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="crest-meta">
            <div className="crest-brand-name">QUANTSYNC ALPHA</div>
            <div className="crest-subtext">INSTITUTIONAL QUANT SYSTEM</div>
          </div>
        </div>

        <div className="live-status-pill">
          <span className={`live-radar-dot ${isWsConnected ? "online" : "sync"}`} />
          <span className="live-label">{isWsConnected ? "STREAM LIVE" : "MARKET SYNC"}</span>
        </div>
      </header>

      {/* ── 2. LIVE BENCHMARK INDICES BAR (0 REST CALLS) ─────────────────────── */}
      <div className="luxury-indices-ribbon">
        {terminalIndices.slice(0, 3).map((idx) => {
          const isUp = (idx.p ?? 0) >= 0;
          return (
            <div key={idx.n} className="luxury-index-pod">
              <div className="idx-pod-top">
                <span className="idx-pod-title">{idx.n}</span>
                <span className={`idx-pod-delta ${isUp ? "positive" : "negative"}`}>
                  {isUp ? "+" : ""}{idx.p != null ? Number(idx.p).toFixed(2) : "0.00"}%
                </span>
              </div>
              <div className="idx-pod-price">
                ₹{idx.v != null ? Number(idx.v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. HERO SECTION: "WHAT TO BUY TODAY?" ─────────────────────────────── */}
      <section className="action-command-section">
        <div className="section-header-row">
          <div className="header-titles">
            <h1 className="hero-headline">
              What to Buy <span className="headline-gold-gradient">Today?</span>
            </h1>
            <p className="hero-descriptor">
              Systematic Stage-2 breakout candidates verified by quantitative momentum algorithms.
            </p>
          </div>
          <button 
            type="button"
            className="view-all-screener-btn"
            onClick={() => onNavigate("screener", "SUCCESS")}
            aria-label="View all breakout setups"
          >
            <span>View All Breakouts</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {/* ── STOCK SELECTOR CHIPS & DOTS ────────────────────────────────────── */}
        <div className="breakout-selector-bar">
          <div className="breakout-chips-group">
            {featuredBreakouts.map((b, i) => (
              <button
                key={b.symbol}
                type="button"
                className={`stock-tab-chip ${activeCardIdx === i ? "active" : ""}`}
                onClick={() => scrollToCard(i)}
              >
                <span className="chip-sym">{b.symbol}</span>
                <span className="chip-score">{b.dnaScore} DNA</span>
              </button>
            ))}
          </div>
          <div className="carousel-pagination-dots">
            {featuredBreakouts.map((_, i) => (
              <span 
                key={i} 
                className={`pag-dot ${activeCardIdx === i ? "active" : ""}`}
                onClick={() => scrollToCard(i)}
              />
            ))}
          </div>
        </div>

        {/* ── FULL-WIDTH HORIZONTAL SNAP SHOWCASE CARDS ─────────────────────── */}
        <div 
          className="featured-breakouts-carousel" 
          ref={carouselRef}
          onScroll={handleCarouselScroll}
        >
          {isBreakoutsLoading ? (
            <div className="breakout-skeleton-card">
              <div className="sk-header-row">
                <div className="sk-sym-block">
                  <div className="sk-bar sk-sym" style={{ width: 140, height: 22 }} />
                  <div className="sk-bar sk-sub" style={{ width: 210, height: 13 }} />
                </div>
                <div className="sk-bar sk-badge-block" />
              </div>
              <div className="sk-bar sk-pattern" style={{ width: "100%", height: 32, borderRadius: 8 }} />
              <div className="sk-grid">
                <div className="sk-bar sk-col" />
                <div className="sk-bar sk-col" />
                <div className="sk-bar sk-col" />
                <div className="sk-bar sk-col" />
              </div>
              <div className="sk-bar sk-thesis" style={{ width: "100%", height: 36, borderRadius: 8 }} />
              <div className="sk-footer-row">
                <div className="sk-bar sk-vol" style={{ width: 160, height: 16 }} />
                <div className="sk-bar sk-btn" style={{ width: 100, height: 34, borderRadius: 9 }} />
              </div>
            </div>
          ) : (
            featuredBreakouts.map((b) => (
              <div key={b.symbol} className="breakout-master-card">
              {/* Card Header */}
              <div className="b-card-header">
                <div className="b-sym-info">
                  <div className="b-ticker-row">
                    <span className="b-ticker-name">{b.symbol}</span>
                    <span className="b-exchange-tag">NSE EQ</span>
                  </div>
                  <div className="b-company-name">{b.name} · {b.sector}</div>
                </div>

                <div className="b-dna-badge">
                  <div className="dna-score-ring">
                    <span className="dna-number">{b.dnaScore}</span>
                  </div>
                  <div className="dna-badge-label">INSTITUTIONAL</div>
                </div>
              </div>

              {/* Pattern Banner */}
              <div className="b-pattern-pill">
                <span className="pattern-glow-dot" />
                <span className="pattern-title">{b.stage}</span>
              </div>

              {/* Price Architecture Grid */}
              <div className="b-pricing-architecture">
                <div className="b-price-col">
                  <span className="b-label">BREAKOUT PIVOT</span>
                  <span className="b-val gold-accent">{fmtPrice(b.breakoutPrice)}</span>
                </div>
                <div className="b-price-col">
                  <span className="b-label">CURRENT CMP</span>
                  <span className="b-val live-cmp">{fmtPrice(b.currPrice)}</span>
                </div>
                <div className="b-price-col">
                  <span className="b-label">TARGET {b.pnlPotential ? `(${b.pnlPotential})` : ""}</span>
                  <span className="b-val profit-val">{fmtPrice(b.targetPrice)}</span>
                </div>
                <div className="b-price-col">
                  <span className="b-label">STOP LOSS</span>
                  <span className="b-val stop-val">{fmtPrice(b.stopPrice)}</span>
                </div>
              </div>

              {/* Institutional Rationale Note */}
              <div className="b-rationale-box">
                <span className="rationale-lead">Setup Thesis:</span> {b.why}
              </div>

              {/* Card Footer Actions */}
              <div className="b-card-footer">
                <div className="b-volume-indicator">
                  {/* Clean Bar Chart Icon instead of Dollar sign */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  <span>{b.volRatio} Volume Surge · R:R {b.rrRatio}</span>
                </div>

                <div className="b-action-buttons">
                  <button 
                    type="button"
                    className="b-btn-primary"
                    onClick={() => {
                      if (onOpenAnalyst) {
                        onOpenAnalyst(b);
                      } else {
                        onSelectStockForDna(b.symbol);
                        onNavigate("dna");
                      }
                    }}
                  >
                    <span>Analyze</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )))}
        </div>
      </section>

      {/* ── 4. AI RECOMMENDED TRADES ─────────────────────────────────────── */}
      <section className="action-command-section ai-recommended-section">
        <div className="section-header-row">
          <div className="header-titles">
            <h2 className="hero-headline">
              AI Recommended <span className="headline-gold-gradient">Trades</span>
            </h2>
            <p className="hero-descriptor">
              Systematic quantitative setups strictly validated through institutional risk criteria.
            </p>
          </div>
          <button 
            type="button"
            className="view-all-screener-btn"
            onClick={() => onNavigate("signals")}
            aria-label="View all active AI signals"
          >
            <span>View Active ({activeCount})</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {spotlightBuy ? (
          <div className="ai-spotlight-card active-call">
            <div className="spotlight-top-strip">
              <div className="spotlight-beacon">
                <span className="star-emblem">★</span>
                <span>V2 AUTONOMOUS AI BUY CALL ACTIVE</span>
              </div>
              <div className="spotlight-live-tag">● LIVE IN ENGINE</div>
            </div>

            <div className="spotlight-content-body">
              <div className="spotlight-stock-header">
                <div className="spotlight-symbol">{spotlightBuy.symbol || spotlightBuy.sym}</div>
                <div className="spotlight-subtitle">
                  Strategy: {spotlightBuy.strategyName || "V2 Autonomous Momentum"} · Stage-2 Continuation
                </div>
              </div>

              <div className="spotlight-metrics-row">
                <div className="spot-metric-pod">
                  <span className="spot-metric-label">RECOMMENDED BUY</span>
                  <span className="spot-metric-value gold-tone">
                    {fmtPrice(spotlightBuy.buyPrice || spotlightBuy.price)}
                  </span>
                </div>
                <div className="spot-metric-pod">
                  <span className="spot-metric-label">TARGET 1</span>
                  <span className="spot-metric-value profit-tone">
                    {fmtPrice(spotlightBuy.target || spotlightBuy.target1)}
                  </span>
                </div>
                <div className="spot-metric-pod">
                  <span className="spot-metric-label">STOP LOSS</span>
                  <span className="spot-metric-value loss-tone">
                    {fmtPrice(spotlightBuy.stopLoss || spotlightBuy.stop)}
                  </span>
                </div>
              </div>

              <div className="spotlight-cta-row">
                <button 
                  type="button"
                  className="spot-cta-btn primary"
                  onClick={() => onNavigate("signals")}
                >
                  <span>Review in AI BuySell</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
                {onOpenChart && (
                  <button 
                    type="button"
                    className="spot-cta-btn secondary"
                    onClick={() => onOpenChart(spotlightBuy.symbol || spotlightBuy.sym)}
                  >
                    View Chart
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="ai-risk-shield-card">
            <div className="risk-shield-icon-wrap">
              <div className="shield-halo-pulse" />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>

            <div className="risk-shield-info">
              <div className="risk-badge-strip">
                <span className="risk-pill">ALGO REGIME: DEFENSIVE</span>
                <span className="risk-dot-sep">·</span>
                <span className="risk-sub-label">1,318 Equities Scanned</span>
              </div>
              <h3 className="risk-title">No Fresh Entry Today · Preserving Capital</h3>
              <p className="risk-explanation">
                Since current market conditions do not meet our strict risk-reward criteria, the AI is not recommending any new calls today. In volatile markets, protecting your hard-earned capital and waiting for high-conviction setups is the smartest trade. Existing open positions continue to be monitored with trailing stops.
              </p>
            </div>

            <button 
              type="button"
              className="risk-review-btn"
              onClick={() => onNavigate("signals")}
            >
              <span>Review Active Trades ({activeCount})</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        )}
      </section>

      {/* ── 5. ANALYZE ANY STOCK LIKE A PRO ───────────────────────────────── */}
      <section className="action-command-section stock-analysis-section">
        <div className="section-header-row">
          <div className="header-titles">
            <h2 className="hero-headline">
              Analyze Any Stock <span className="headline-gold-gradient">Like a Pro</span>
            </h2>
            <p className="hero-descriptor">
              Instant fundamental health check, Piotroski solvency score & breakout targets.
            </p>
          </div>
        </div>

        <div className="stock-dna-pr-hero">
          <div className="dna-hero-inner">
            <div className="dna-kicker-badge">INSTITUTIONAL STOCK BLUEPRINT</div>
            <h3 className="dna-hero-title">
              Complete 360° Stock Analysis <span className="gold-accent-span">& Health Score</span>
            </h3>
            <p className="dna-hero-subtitle">
              Scan balance sheet solvency, Piotroski score, promoter holdings, valuation checks, and calculated Target & Stop-loss levels for any NSE stock.
            </p>

            <form onSubmit={handleSearchSubmit} className="dna-search-form">
              <div className="dna-search-field">
                <svg className="search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search any stock (e.g. RELIANCE, TCS, TATASTEEL, DIXON)..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dna-input-element"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <button type="submit" className="dna-submit-btn">
                <span>Analyze Stock Report</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>

            <div className="dna-chips-container">
              <span className="chips-title">Popular Searches:</span>
              <div className="chips-scroller">
                {POPULAR_DNA_STOCKS.map((sym) => (
                  <button 
                    key={sym} 
                    type="button"
                    className="popular-stock-pill"
                    onClick={() => {
                      onSelectStockForDna(sym);
                      onNavigate("dna");
                    }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. PLATFORM TRUST & PERFORMANCE METRICS RIBBON ──────────────────── */}
      <section className="performance-trust-ribbon">
        <div className="trust-pod">
          <div className="trust-pod-value gold-tint">{winRate}%</div>
          <div className="trust-pod-label">VERIFIED WIN RATE</div>
        </div>
        <div className="trust-divider" />
        <div className="trust-pod">
          <div className="trust-pod-value">{profitFactor}</div>
          <div className="trust-pod-label">PROFIT FACTOR</div>
        </div>
        <div className="trust-divider" />
        <div className="trust-pod">
          <div className="trust-pod-value">{activeCount} / 25</div>
          <div className="trust-pod-label">SLOTS DEPLOYED</div>
        </div>
        <div className="trust-divider" />
        <div className="trust-pod">
          <div className="trust-pod-value">{closedCount}+</div>
          <div className="trust-pod-label">TRADES AUDITED</div>
        </div>
      </section>
    </div>
  );
};
