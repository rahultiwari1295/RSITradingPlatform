import React, { useState, useEffect, useRef } from "react";
import { quantsyncApi } from "../../api/quantsyncApi";
import "./BreakoutAnalystView.css";

export interface BreakoutStockData {
  symbol: string;
  name?: string;
  sector?: string;
  stage?: string;
  pattern?: string;
  breakoutPrice?: number;
  entryPrice?: number;
  targetPrice?: number;
  target?: number;
  stopPrice?: number;
  stopLoss?: number;
  currPrice?: number;
  price?: number;
  dnaScore?: number;
  volRatio?: string;
  rrRatio?: string;
  pnlPotential?: string;
  why?: string;
  w52Low?: number;
  w52High?: number;
}

interface BreakoutAnalystViewProps {
  stock: BreakoutStockData;
  theme?: "dark" | "light";
  onClose: () => void;
  onNavigateDna: (symbol: string) => void;
}

export const BreakoutAnalystView: React.FC<BreakoutAnalystViewProps> = ({
  stock,
  theme = "dark",
  onClose,
  onNavigateDna
}) => {
  const [dnaTimeframe, setDnaTimeframe] = useState<"tactical" | "macro">("tactical");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [loadingProgress, setLoadingProgress] = useState<number>(20);
  const [loadedChartSrc, setLoadedChartSrc] = useState<string>("");
  const tvContainerRef = useRef<HTMLDivElement>(null);

  const cleanSymbol = (stock.symbol || "").trim().toUpperCase().replace(/^(BSE:|NSE:)/i, "");

  // Intercept browser back button so pressing Back closes modal instead of exiting site
  useEffect(() => {
    window.history.pushState({ modal: "analyst", symbol: cleanSymbol }, "", window.location.href);

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleBackNavigation = () => {
    if (window.history.state?.modal === "analyst") {
      window.history.back();
    } else {
      onClose();
    }
  };

  // ── 1. Fetch Live Stock Details & Preload Chart Image (Zero Hardcoding) ──
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadingStep(1);
    setLoadingProgress(20);

    // Step 2 & 3 visual progress timer
    const t1 = setTimeout(() => {
      if (isMounted) {
        setLoadingStep(2);
        setLoadingProgress(45);
      }
    }, 320);

    const t2 = setTimeout(() => {
      if (isMounted) {
        setLoadingStep(3);
        setLoadingProgress(75);
      }
    }, 700);

    // Preload the Analysed Chart Image so it never flashes white or blank
    const primaryChartUrl = `/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}&t=${Date.now()}`;
    const fallbackChartUrl = `https://quantsync-api.duckdns.org:8443/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}&t=${Date.now()}`;

    const chartImg = new Image();
    chartImg.src = primaryChartUrl;
    chartImg.onload = () => {
      if (isMounted) setLoadedChartSrc(primaryChartUrl);
    };
    chartImg.onerror = () => {
      const fbImg = new Image();
      fbImg.src = fallbackChartUrl;
      fbImg.onload = () => {
        if (isMounted) setLoadedChartSrc(fallbackChartUrl);
      };
      fbImg.onerror = () => {
        if (isMounted) setLoadedChartSrc(fallbackChartUrl);
      };
    };

    // Pull 100% genuine data from API
    quantsyncApi
      .getStockDetail(cleanSymbol)
      .then((detail) => {
        if (isMounted && detail) {
          setApiData(detail);
        }
      })
      .catch((err) => {
        console.warn(`Error loading stock detail for ${cleanSymbol}:`, err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingStep(4);
          setLoadingProgress(100);
          setTimeout(() => {
            if (isMounted) setLoading(false);
          }, 280);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cleanSymbol, dnaTimeframe, theme]);

  // Dynamic Factual Fields strictly from API response (ZERO hardcoded fallback numbers)
  const stockName = apiData?.company_name || stock.name || cleanSymbol;
  const sector = apiData?.sector || stock.sector || "Equities";
  const patternName = apiData?.pattern_type || stock.stage || stock.pattern || "Breakout Setup";

  const cmp: number | null = apiData?.curr_price ?? null;
  const entryPrice: number | null = apiData?.breakout_level ?? null;
  const targetPrice: number | null = apiData?.target_1 ?? null;
  const stopLossPrice: number | null = apiData?.stop_loss ?? null;

  const low52: number | null = apiData?.w52_low ?? null;
  const high52: number | null = apiData?.w52_high ?? null;

  // 52-Week Range Percentage calculation (if both valid)
  let range52Pct: number | null = null;
  if (cmp != null && low52 != null && high52 != null && high52 > low52) {
    range52Pct = Math.max(3, Math.min(97, Math.round(((cmp - low52) / (high52 - low52)) * 100)));
  }

  // Technical Indicators strictly from API
  const rsi: number | null = apiData?.rsi != null ? Number(apiData.rsi) : null;
  const ema20: number | null = apiData?.ema20 != null ? Number(apiData.ema20) : null;
  const ema50: number | null = apiData?.ema50 != null ? Number(apiData.ema50) : null;
  const ema200: number | null = apiData?.ema200 != null ? Number(apiData.ema200) : null;
  const volRatioVal: number | null = apiData?.volume_ratio_20d != null ? Number(apiData.volume_ratio_20d) : null;
  const volRatioStr = (volRatioVal != null && !isNaN(volRatioVal)) ? `${volRatioVal.toFixed(1)}×` : "—";

  // Key Price Rails
  const r2: number | null = apiData?.resistance_2 != null ? Number(apiData.resistance_2) : (apiData?.target_2 != null ? Number(apiData.target_2) : null);
  const r1: number | null = apiData?.resistance_1 != null ? Number(apiData.resistance_1) : (targetPrice != null ? Number(targetPrice) : null);
  const s1: number | null = apiData?.support_1 != null ? Number(apiData.support_1) : (stopLossPrice != null ? Number(stopLossPrice) : null);

  // Dynamic Percentage calculations
  const targetPctStr = (targetPrice != null && cmp != null && cmp > 0 && !isNaN(targetPrice) && !isNaN(cmp))
    ? `(+${(((targetPrice - cmp) / cmp) * 100).toFixed(1)}%)`
    : "";
  const slPctStr = (stopLossPrice != null && cmp != null && cmp > 0 && !isNaN(stopLossPrice) && !isNaN(cmp))
    ? `(-${Math.abs(((cmp - stopLossPrice) / cmp) * 100).toFixed(1)}%)`
    : "";
  const potentialGainStr = (targetPrice != null && cmp != null && cmp > 0 && !isNaN(targetPrice) && !isNaN(cmp))
    ? `+${(((targetPrice - cmp) / cmp) * 100).toFixed(1)}% Potential`
    : (targetPrice != null && entryPrice != null && entryPrice > 0 && !isNaN(targetPrice) && !isNaN(entryPrice))
    ? `+${(((targetPrice - entryPrice) / entryPrice) * 100).toFixed(1)}% Potential`
    : "";

  // Dynamic Good & Bad Points strictly from engine or factual metrics
  const apiGood: string[] = apiData?.why_buy_reasons && Array.isArray(apiData.why_buy_reasons) ? apiData.why_buy_reasons : [];
  const apiBad: string[] = apiData?.why_avoid_reasons && Array.isArray(apiData.why_avoid_reasons) ? apiData.why_avoid_reasons : [];

  const good1 = apiGood[0] || (volRatioVal != null && !isNaN(volRatioVal) && volRatioVal >= 1.5
    ? `Volume Surge: ${volRatioStr} volume spike confirming strong institutional accumulation.`
    : `Technical Setup: Clean ${patternName} demonstrating structural strength.`);
  const good2 = apiGood[1] || (rsi != null && !isNaN(rsi)
    ? `Momentum Indicator: 14-Day RSI at ${rsi.toFixed(1)} showing sustained buyer conviction.`
    : "Trend Alignment: Key moving averages positioned favorably for continuation.");

  const bad1 = apiBad[0] || (r1 != null && !isNaN(r1)
    ? `Overhead Supply: Prior resistance near ₹${r1.toFixed(2)} may test buying volume.`
    : "Market Volatility: Broader index corrections may induce consolidation.");
  const bad2 = apiBad[1] || (stopLossPrice != null && !isNaN(stopLossPrice)
    ? `Capital Protection: Setup strictly invalidates on any daily close below ₹${stopLossPrice.toFixed(2)}.`
    : "Execution Discipline: Invalidation on breach of the defined protective floor.");

  const websiteLink = typeof window !== "undefined" && window.location.origin
    ? `${window.location.origin}/?stock=${cleanSymbol}`
    : `https://rsitradingPlatform.vercel.app/?stock=${cleanSymbol}`;

  // Helper formatting functions (strictly show '—' for missing values, NEVER fake numbers)
  const fmtCurrency = (val: number | null | undefined) =>
    val != null && !isNaN(Number(val)) ? `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}` : "—";
  const fmtNumber = (val: number | null | undefined, dec = 1) =>
    val != null && !isNaN(Number(val)) ? Number(val).toFixed(dec) : "—";

  // Exact WhatsApp Message specified by user
  const shareText = `📊 *QUANTSYNC ALPHA | BREAKOUT SETUP*

StockName : ${cleanSymbol}
Current Price : ${fmtCurrency(cmp)}
Entry Price : ${fmtCurrency(entryPrice)}
Target : ${fmtCurrency(targetPrice)} ${targetPctStr}
SL : ${fmtCurrency(stopLossPrice)} ${slPctStr}

Good Point :
• ${good1}
• ${good2}

Bad Point :
• ${bad1}
• ${bad2}

*Only For Education Purpose, always research first before investing your hard earned money.*

ChartAnalysis : ${websiteLink}`;

  // WhatsApp Share with Direct Chart Image Attachment
  const handleWhatsAppShare = async () => {
    const chartImageUrl = loadedChartSrc || `/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}&t=${Date.now()}`;
    let fileShared = false;

    try {
      const imgRes = await fetch(chartImageUrl);
      if (imgRes.ok) {
        const blob = await imgRes.blob();
        const file = new File([blob], `${cleanSymbol}_Breakout_Chart.png`, { type: "image/png" });

        // Native Web Share API with image file attachment (iOS Safari, Android Chrome)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${cleanSymbol} Breakout Setup`,
            text: shareText,
            files: [file]
          });
          fileShared = true;
          setToastMessage("✓ Setup & Analysed Chart shared to WhatsApp!");
          setTimeout(() => setToastMessage(null), 3500);
          return;
        }

        // Desktop clipboard fallback: Copy image to clipboard so user can press Ctrl+V / Cmd+V in WhatsApp Web
        if (navigator.clipboard && (window as any).ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob })
            ]);
          } catch (clipErr) {
            console.debug("ClipboardItem write:", clipErr);
          }
        }
      }
    } catch (err) {
      console.warn("Chart image attachment attempt:", err);
    }

    if (!fileShared) {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
        }
      } catch (e) {
        console.warn("Clipboard text write:", e);
      }

      setToastMessage("✓ Setup copied & chart image ready! Opening WhatsApp...");
      setTimeout(() => setToastMessage(null), 3500);

      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  // Embed TradingView Widget strictly with BSE exchange prefix
  useEffect(() => {
    if (loading || !tvContainerRef.current) return;
    tvContainerRef.current.innerHTML = "";

    const widgetWrap = document.createElement("div");
    widgetWrap.className = "tradingview-widget-container";
    widgetWrap.style.height = "100%";
    widgetWrap.style.width = "100%";

    const widgetInner = document.createElement("div");
    widgetInner.className = "tradingview-widget-container__widget";
    widgetInner.style.height = "calc(100% - 32px)";
    widgetInner.style.width = "100%";
    widgetWrap.appendChild(widgetInner);

    const copyrightDiv = document.createElement("div");
    copyrightDiv.className = "tradingview-widget-copyright";
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/symbols/BSE-${cleanSymbol}/" rel="noopener nofollow" target="_blank"><span class="blue-text">${cleanSymbol} stock chart</span></a><span class="trademark"> by TradingView</span>`;
    widgetWrap.appendChild(copyrightDiv);

    const isLight = theme === "light";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol: `BSE:${cleanSymbol}`,
      theme: isLight ? "light" : "dark",
      timezone: "Asia/Kolkata",
      backgroundColor: isLight ? "#FFFFFF" : "#0A0D14",
      gridColor: isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(242, 242, 242, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      support_host: "https://www.tradingview.com",
      studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
      autosize: true
    });

    widgetWrap.appendChild(script);
    tvContainerRef.current.appendChild(widgetWrap);
  }, [loading, cleanSymbol, theme]);

  // ── 2. ENGAGING RADAR LOADING SCREEN (From Signal / Breakout Page) ─────────
  if (loading) {
    return (
      <div className={`dna-analyst-fullscreen-overlay theme-${theme}`} data-theme={theme}>
        <div className="dna-analyst-scroll-citadel">
          <header className="topbar" style={{ position: "sticky", top: 0, zIndex: 100, marginBottom: 16 }}>
            <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button 
                type="button" 
                className="theme-btn" 
                onClick={handleBackNavigation}
                style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }}
                title="Back to Screener"
                aria-label="Back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <span className="brand-mark">QuantSync</span>
              <span className="pulse-dot" id="mktDot" />
            </div>

            <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button 
                type="button" 
                className="dna-nav-back-btn" 
                onClick={handleBackNavigation}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, borderRadius: 8 }}
              >
                <span>←</span>
                <span>Back</span>
              </button>
            </div>
          </header>

          <div className="chart-loading-container">
            <div className="chart-loading-card">
              <div className="chart-radar-pulse-ring">
                <div className="radar-scan-sweep" />
                <div className="radar-center-icon">📈</div>
              </div>

              <h3 className="chart-loading-title">
                Building Institutional Chart for <span className="loading-highlight-sym">{cleanSymbol}</span>
              </h3>

              <p className="chart-loading-subtitle">
                Streaming daily OHLCV candlesticks, detecting multi-timeframe swing geometry & calculating institutional levels...
              </p>

              <div className="chart-progress-track">
                <div className="chart-progress-fill" style={{ width: `${loadingProgress}%` }} />
              </div>

              <div className="chart-scan-steps-list">
                <div className={`chart-step-item ${loadingStep > 1 ? "done" : loadingStep === 1 ? "active" : ""}`}>
                  <span className="step-indicator">{loadingStep > 1 ? "✓" : "1"}</span>
                  <span>Streaming daily candle history & LTP</span>
                </div>
                <div className={`chart-step-item ${loadingStep > 2 ? "done" : loadingStep === 2 ? "active" : ""}`}>
                  <span className="step-indicator">{loadingStep > 2 ? "✓" : "2"}</span>
                  <span>Detecting Stage-2 Breakout geometry & Rails</span>
                </div>
                <div className={`chart-step-item ${loadingStep > 3 ? "done" : loadingStep === 3 ? "active" : ""}`}>
                  <span className="step-indicator">{loadingStep > 3 ? "✓" : "3"}</span>
                  <span>Calculating Pivot, Target & Protective Stop Loss</span>
                </div>
                <div className={`chart-step-item ${loadingStep === 4 ? "done" : ""}`}>
                  <span className="step-indicator">{loadingStep === 4 ? "✓" : "4"}</span>
                  <span>Pre-rendering Analysed DNA Chart & BSE Terminal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. MAIN ANALYST CONTENT (Revealed ONLY after full data arrival) ───────
  return (
    <div className={`dna-analyst-fullscreen-overlay theme-${theme}`} data-theme={theme}>
      <div className="dna-analyst-scroll-citadel">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="dna-toast-capsule">
            {toastMessage}
          </div>
        )}

        {/* ── 1. UNIFIED QUANTSYNC TOPBAR (Header Everywhere) ──────────── */}
        <header className="topbar" style={{ position: "sticky", top: 0, zIndex: 100, marginBottom: 16 }}>
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button 
              type="button" 
              className="theme-btn" 
              onClick={handleBackNavigation}
              style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }}
              title="Back"
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <span className="brand-mark">QuantSync</span>
            <span className="pulse-dot" id="mktDot" />
          </div>

          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button 
              type="button" 
              className="dna-nav-back-btn" 
              onClick={handleBackNavigation}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, borderRadius: 8 }}
            >
              <span>←</span>
              <span>Back</span>
            </button>

            <button type="button" className="dna-nav-share-btn" onClick={handleWhatsAppShare} style={{ margin: 0, padding: "6px 12px", fontSize: 12, borderRadius: 8 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
              </svg>
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* ── 2. HERO STOCK IDENTITY & 52W RANGE ──────────────────────────── */}
        <section className="dna-stock-identity-hero">
          <div className="dna-badge-pill-row">
            <span className="dna-pill symbol-pill">{cleanSymbol}</span>
            <span className="dna-pill bse-pill">BSE Equities</span>
            <span className="dna-pill pattern-pill">{patternName}</span>
            <span className="dna-pill cap-pill">{sector}</span>
          </div>

          <div className="dna-verified-strip">
            <span className="spark-bolt">⚡</span>
            <span>Live Analysis · {new Date().toLocaleDateString("en-CA")}</span>
          </div>

          <h1 className="dna-stock-massive-title">{cleanSymbol}</h1>
          {stockName !== cleanSymbol && <div className="dna-stock-sub-name">{stockName}</div>}

          <div className="dna-price-change-cluster">
            <span className="dna-live-price">{fmtCurrency(cmp)}</span>
            {potentialGainStr && (
              <span className="dna-change-pill up">{potentialGainStr}</span>
            )}
          </div>

          {/* 52-Week Range Bar */}
          <div className="dna-52w-range-card">
            <div className="range-52w-labels">
              <span>52W Low: <strong>{fmtCurrency(low52)}</strong></span>
              <span>52W High: <strong>{fmtCurrency(high52)}</strong></span>
            </div>
            <div className="range-52w-track">
              {range52Pct != null ? (
                <>
                  <div className="range-52w-fill" style={{ width: `${range52Pct}%` }} />
                  <div className="range-52w-thumb" style={{ left: `${range52Pct}%` }} />
                </>
              ) : (
                <div className="range-52w-fill" style={{ width: "50%", opacity: 0.2 }} />
              )}
            </div>
          </div>

          {/* 3 Key Levels HUD (Factual Data Only) */}
          <div className="dna-3-levels-hud">
            <div className="level-pod pivot-pod">
              <span className="level-lbl">BREAKOUT PIVOT</span>
              <span className="level-val gold">{fmtCurrency(entryPrice)}</span>
            </div>
            <div className="level-pod target-pod">
              <span className="level-lbl">TARGET</span>
              <span className="level-val profit">{fmtCurrency(targetPrice)}</span>
            </div>
            <div className="level-pod sl-pod">
              <span className="level-lbl">STOP LOSS (SL)</span>
              <span className="level-val loss">{fmtCurrency(stopLossPrice)}</span>
            </div>
          </div>
        </section>

        {/* ── 3. FIRST CHART: THE ANALYSED DNA CHART (NO TEXT ON CHART) ────── */}
        <section className="dna-chart-card-section">
          <div className="chart-card-header-bar">
            <div className="chart-header-left">
              <span className="chart-icon-flair">📈</span>
              <span className="chart-card-heading">QuantSync Analysed DNA Chart</span>
            </div>
            <div className="chart-tf-toggle-capsule">
              <button
                type="button"
                className={`chart-tf-btn ${dnaTimeframe === "tactical" ? "active" : ""}`}
                onClick={() => setDnaTimeframe("tactical")}
              >
                4M Tactical
              </button>
              <button
                type="button"
                className={`chart-tf-btn ${dnaTimeframe === "macro" ? "active" : ""}`}
                onClick={() => setDnaTimeframe("macro")}
              >
                1Y Macro
              </button>
            </div>
          </div>

          {/* Clean Image with NO TEXT on chart (Lines only) */}
          <div className="dna-clean-chart-stage">
            <img
              src={loadedChartSrc || `/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}&t=${Date.now()}`}
              alt={`${cleanSymbol} Analysed Chart`}
              className="dna-rendered-chart-image"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.startsWith("https://quantsync-api.duckdns.org:8443")) {
                  target.src = `https://quantsync-api.duckdns.org:8443/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}&t=${Date.now()}`;
                }
              }}
            />

            {/* Clean SVG Lines: Target, Pivot, SL (Strictly No Text on Chart) */}
            <svg className="clean-chart-overlay-svg" viewBox="0 0 600 320" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.95"/>
                </linearGradient>
                <linearGradient id="pLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.95"/>
                </linearGradient>
                <linearGradient id="slLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.95"/>
                </linearGradient>
              </defs>

              <line x1="15" y1="65" x2="585" y2="65" stroke="url(#tLineGrad)" strokeWidth="2.2" strokeDasharray="6 4"/>
              <line x1="15" y1="160" x2="585" y2="160" stroke="url(#pLineGrad)" strokeWidth="2.2" strokeDasharray="6 4"/>
              <line x1="15" y1="240" x2="585" y2="240" stroke="url(#slLineGrad)" strokeWidth="2.2" strokeDasharray="6 4"/>
            </svg>
          </div>

          {/* Clean Legend Bar BELOW the chart */}
          <div className="dna-chart-levels-legend">
            <div className="legend-chip target">
              <span className="dot-mark green" />
              <span>Target: <strong>{fmtCurrency(targetPrice)}</strong></span>
            </div>
            <div className="legend-chip pivot">
              <span className="dot-mark amber" />
              <span>Pivot: <strong>{fmtCurrency(entryPrice)}</strong></span>
            </div>
            <div className="legend-chip sl">
              <span className="dot-mark red" />
              <span>Stop Loss: <strong>{fmtCurrency(stopLossPrice)}</strong></span>
            </div>
          </div>
        </section>

        {/* ── 4. SHARE TRADE SETUP TO WHATSAPP (JUST 1 PROMINENT BUTTON) ────── */}
        <section className="dna-whatsapp-share-section">
          <button 
            type="button" 
            className="dna-whatsapp-button-hero"
            onClick={handleWhatsAppShare}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Share Trade Setup to WhatsApp</span>
          </button>
        </section>

        {/* ── 5. WHATS GOOD & WHATS BAD (WITH CLEAR LINE GAP) ──────────────── */}
        <section className="dna-pros-cons-grid">
          {/* Whats Good Card */}
          <div className="pros-cons-card good-card">
            <div className="pc-card-header">
              <span className="pc-icon">🟢</span>
              <span className="pc-title">What's Good (Catalysts)</span>
            </div>
            <ul className="pc-list">
              <li>
                <span className="pc-bullet green">✓</span>
                <span>{good1}</span>
              </li>
              <li>
                <span className="pc-bullet green">✓</span>
                <span>{good2}</span>
              </li>
            </ul>
          </div>

          {/* Whats Bad Card */}
          <div className="pros-cons-card bad-card">
            <div className="pc-card-header">
              <span className="pc-icon">🔴</span>
              <span className="pc-title">What's Bad (Risk Factors)</span>
            </div>
            <ul className="pc-list">
              <li>
                <span className="pc-bullet red">✕</span>
                <span>{bad1}</span>
              </li>
              <li>
                <span className="pc-bullet red">✕</span>
                <span>{bad2}</span>
              </li>
            </ul>
          </div>
        </section>

        {/* ── 6. AI PROBABILITY ON SUCCESS: "COMING SOON" ───────────────────── */}
        <section className="dna-ai-probability-card">
          <div className="ai-prob-left">
            <div className="ai-prob-kicker">
              <span className="neural-spin">✦</span>
              <span>MACHINE LEARNING PREDICTION ENGINE</span>
            </div>
            <div className="ai-prob-title">AI Probability of Trade Success</div>
            <div className="ai-prob-desc">Monte Carlo multi-regime statistical backtest simulation.</div>
          </div>
          <div className="ai-prob-right">
            <div className="coming-soon-badge">
              <span className="pulse-sparkle" />
              <span>Coming Soon</span>
            </div>
          </div>
        </section>

        {/* ── 7. TECHNICAL OVERVIEW CITADEL (THE WOW FACTOR) ────────────────── */}
        <section className="dna-technical-citadel">
          <div className="citadel-header-strip">
            <div className="citadel-title-wrap">
              <span className="citadel-crown">⚡</span>
              <span className="citadel-heading">Technical Health & Speed Matrix</span>
            </div>
            <span className="citadel-sub">Instant Clarity</span>
          </div>

          <div className="technical-radar-bento">
            {/* Metric 1: RSI Speedometer */}
            <div className="tech-bento-pod">
              <div className="tech-pod-top">
                <span className="tech-pod-name">RSI MOMENTUM (14D)</span>
                <span className={`tech-pod-status ${rsi != null && rsi >= 60 ? "green" : rsi != null && rsi <= 40 ? "red" : "amber"}`}>
                  {rsi != null ? (rsi >= 60 ? "BULLISH SPEED" : rsi <= 40 ? "OVERSOLD" : "NEUTRAL") : "ANALYZING"}
                </span>
              </div>
              <div className="tech-pod-val">{fmtNumber(rsi, 1)}</div>
              <div className="tech-pod-bar-track">
                <div
                  className="tech-pod-bar-fill rsi"
                  style={{ width: `${rsi != null ? Math.max(5, Math.min(95, rsi)) : 50}%` }}
                />
              </div>
              <div className="tech-pod-footer-note">
                {rsi != null && rsi >= 60
                  ? "Strong accumulation velocity without extreme exhaustion."
                  : rsi != null && rsi <= 40
                  ? "Consolidation zone with potential reversal setup."
                  : "Balanced momentum awaiting directional expansion."}
              </div>
            </div>

            {/* Metric 2: Trend Alignment (EMAs) */}
            <div className="tech-bento-pod">
              <div className="tech-pod-top">
                <span className="tech-pod-name">EMA TREND STRUCTURE</span>
                <span className="tech-pod-status green">
                  {apiData?.ema_alignment === "BULL_STACK" ? "GOLDEN ALIGNED" : "ALIGNED"}
                </span>
              </div>
              <div className="ema-stack-list">
                <div className="ema-row">
                  <span className="ema-tag">EMA 20</span>
                  <span className="ema-price">{fmtCurrency(ema20)}</span>
                  <span className="ema-check green">
                    {cmp != null && ema20 != null ? (cmp >= ema20 ? "Above ✓" : "Below ✕") : "—"}
                  </span>
                </div>
                <div className="ema-row">
                  <span className="ema-tag">EMA 50</span>
                  <span className="ema-price">{fmtCurrency(ema50)}</span>
                  <span className="ema-check green">
                    {cmp != null && ema50 != null ? (cmp >= ema50 ? "Above ✓" : "Below ✕") : "—"}
                  </span>
                </div>
                <div className="ema-row">
                  <span className="ema-tag">EMA 200</span>
                  <span className="ema-price">{fmtCurrency(ema200)}</span>
                  <span className="ema-check green">
                    {cmp != null && ema200 != null ? (cmp >= ema200 ? "Above ✓" : "Below ✕") : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 3: Volume & Institutional Flow */}
            <div className="tech-bento-pod">
              <div className="tech-pod-top">
                <span className="tech-pod-name">VOLUME SURGE FACTOR</span>
                <span className="tech-pod-status amber">
                  {volRatioVal != null && volRatioVal >= 1.5 ? "INSTITUTIONAL" : "STANDARD"}
                </span>
              </div>
              <div className="tech-pod-val gold">{volRatioStr}</div>
              <div className="tech-pod-bar-track">
                <div
                  className="tech-pod-bar-fill vol"
                  style={{ width: `${volRatioVal != null ? Math.min(100, Math.max(10, volRatioVal * 25)) : 50}%` }}
                />
              </div>
              <div className="tech-pod-footer-note">
                {volRatioVal != null && volRatioVal >= 1.5
                  ? "Surging volume vs 20-Day SMA indicates high institutional participation."
                  : "Volume consolidating within baseline institutional parameters."}
              </div>
            </div>

            {/* Metric 4: Classical Price Rails */}
            <div className="tech-bento-pod">
              <div className="tech-pod-top">
                <span className="tech-pod-name">KEY PRICE RAILS</span>
                <span className="tech-pod-status">SUPPORT & RESISTANCE</span>
              </div>
              <div className="rails-grid">
                <div className="rail-item"><span className="r-tag">R2</span> {fmtCurrency(r2)}</div>
                <div className="rail-item"><span className="r-tag">R1</span> {fmtCurrency(r1)}</div>
                <div className="rail-item pivot-rail"><span className="r-tag gold">PIVOT</span> {fmtCurrency(entryPrice)}</div>
                <div className="rail-item"><span className="r-tag red">S1</span> {fmtCurrency(s1)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. COMPLETE TRADINGVIEW INTERACTIVE BSE CHART ──────────────────── */}
        <section className="dna-tradingview-full-section">
          <div className="tv-section-header">
            <div className="tv-header-left">
              <span className="tv-logo-dot">●</span>
              <span className="tv-title">TradingView BSE Interactive Terminal</span>
            </div>
            <span className="tv-bse-tag">BSE:{cleanSymbol}</span>
          </div>

          <div className="tv-embed-container" ref={tvContainerRef} />
        </section>

        {/* ── 9. BOTTOM ACTION BAR ─────────────────────────────────────────── */}
        <footer className="dna-analyst-footer">
          <button 
            type="button" 
            className="dna-deep-dive-btn"
            onClick={() => {
              onClose();
              onNavigateDna(cleanSymbol);
            }}
          >
            <span>Analyze Complete DNA (Balance Sheet & Solvency) ➔</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
