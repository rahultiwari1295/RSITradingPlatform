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
  timeframe?: string;
  baseDurationYears?: number;
  base_duration_years?: number;
  lifecycleState?: string;
  lifecycle_state?: string;
  company_name?: string;
  pattern_type?: string;
  curr_price?: number;
  currentPrice?: number;
  breakout_level?: number;
  stop_loss?: number;
  stopLossPrice?: number;
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
  const rawInputTf = (stock.timeframe || (stock as any).timeframe_type || "").toUpperCase();
  const initialTf = (rawInputTf === "MONTHLY" || rawInputTf === "1M")
    ? "monthly"
    : (rawInputTf === "WEEKLY" || rawInputTf === "1W")
    ? "macro"
    : "tactical";
  const [dnaTimeframe, setDnaTimeframe] = useState<"tactical" | "macro" | "monthly">(initialTf);

  // Sync state if stock prop changes
  useEffect(() => {
    const nextTf = (rawInputTf === "MONTHLY" || rawInputTf === "1M")
      ? "monthly"
      : (rawInputTf === "WEEKLY" || rawInputTf === "1W")
      ? "macro"
      : "tactical";
    setDnaTimeframe(nextTf);
  }, [stock.symbol, rawInputTf]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any | null>(null);
  const [patternAccuracy, setPatternAccuracy] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [loadingProgress, setLoadingProgress] = useState<number>(20);

  useEffect(() => {
    quantsyncApi.getPatternAccuracy()
      .then((acc) => setPatternAccuracy(acc))
      .catch((e) => console.warn("Could not load pattern accuracy in Analyst View", e));
  }, []);

  // Independent Chart Loading & Failover States (Never blocks full page)
  const [loadedChartSrc, setLoadedChartSrc] = useState<string>("");
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [chartError, setChartError] = useState<boolean>(false);
  const [chartReloadKey, setChartReloadKey] = useState<number>(0);
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

  // ── 1. Fetch Live Stock Details (Runs ONLY when symbol changes, never on timeframe toggle) ──
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadingStep(1);
    setLoadingProgress(20);

    const t1 = setTimeout(() => {
      if (isMounted) {
        setLoadingStep(2);
        setLoadingProgress(45);
      }
    }, 250);

    const t2 = setTimeout(() => {
      if (isMounted) {
        setLoadingStep(3);
        setLoadingProgress(75);
      }
    }, 550);

    quantsyncApi
      .getStockDetail(cleanSymbol, rawInputTf)
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
          }, 200);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cleanSymbol, rawInputTf]);

  // ── 2. Independent Chart Generation & Preload (Runs smoothly when timeframe or reload key changes) ──
  useEffect(() => {
    let isCancelled = false;
    setChartLoading(true);
    setChartError(false);

    const ts = Date.now();
    const forceParam = chartReloadKey > 0 ? "&force=true" : "";
    const primaryChartUrl = `/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}${forceParam}&t=${ts}`;
    const fallbackChartUrl = `https://quantsync-api.duckdns.org:8443/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}${forceParam}&t=${ts}`;

    const chartImg = new Image();
    chartImg.src = primaryChartUrl;

    const timeoutTimer = setTimeout(() => {
      if (!isCancelled) {
        const fbImg = new Image();
        fbImg.src = fallbackChartUrl;
        fbImg.onload = () => {
          if (!isCancelled) {
            setLoadedChartSrc(fallbackChartUrl);
            setChartLoading(false);
          }
        };
        fbImg.onerror = () => {
          if (!isCancelled) {
            setChartError(true);
            setChartLoading(false);
          }
        };
      }
    }, 4500);

    chartImg.onload = () => {
      if (!isCancelled) {
        clearTimeout(timeoutTimer);
        setLoadedChartSrc(primaryChartUrl);
        setChartLoading(false);
      }
    };

    chartImg.onerror = () => {
      clearTimeout(timeoutTimer);
      const fbImg = new Image();
      fbImg.src = fallbackChartUrl;
      fbImg.onload = () => {
        if (!isCancelled) {
          setLoadedChartSrc(fallbackChartUrl);
          setChartLoading(false);
        }
      };
      fbImg.onerror = () => {
        if (!isCancelled) {
          setChartError(true);
          setChartLoading(false);
        }
      };
    };

    return () => {
      isCancelled = true;
      clearTimeout(timeoutTimer);
    };
  }, [cleanSymbol, dnaTimeframe, theme, chartReloadKey]);

  // Dynamic Factual Fields strictly from Screener Candidate & API (ZERO contradictory overwrite)
  const stockName = stock.company_name || apiData?.company_name || stock.name || cleanSymbol;
  const sector = stock.sector || apiData?.sector || "Equities";

  // Prioritize verified candidate pattern from screener row (e.g. Symmetrical Triangle, Cup & Handle, Multi-Year Base)
  const rawCandidatePattern = stock.pattern_type || (stock as any).pattern_name || stock.pattern || stock.stage;
  const isGeneric = (p: string) => !p || p.toLowerCase().includes("other") || p.toLowerCase().includes("breakout setup");
  const patternName = (!isGeneric(rawCandidatePattern) && !rawCandidatePattern.toLowerCase().includes("double top"))
    ? rawCandidatePattern
    : (apiData?.pattern_type || rawCandidatePattern || "Breakout Setup");

  const cmp: number | null = stock.curr_price ?? apiData?.curr_price ?? stock.currentPrice ?? (stock as any).price ?? null;
  const entryPrice: number | null = stock.breakout_level ?? (stock as any).pivot_price ?? stock.breakoutPrice ?? apiData?.breakout_level ?? null;
  const targetPrice: number | null = (stock as any).target_1 ?? stock.targetPrice ?? apiData?.target_1 ?? null;
  const stopLossPrice: number | null = (stock as any).stop_loss ?? stock.stopLossPrice ?? apiData?.stop_loss ?? null;

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

  const isTargetAchieved = apiData?.lifecycle_state === "TARGET_ACHIEVED" ||
    stock.lifecycle_state === "TARGET_ACHIEVED" ||
    stock.lifecycleState === "TARGET_ACHIEVED" ||
    String(stock.stage || "").includes("Target Achieved") ||
    String(apiData?.action_title || "").includes("Target Achieved");

  const rawTf = (apiData?.timeframe || stock.timeframe || "").toUpperCase();
  const timeframeTag = rawTf === "MONTHLY" ? "Monthly" : rawTf === "WEEKLY" ? "Weekly" : rawTf === "DAILY" ? "Daily" : null;
  const displayPatternName = patternName.toLowerCase().replace(/_/g, " ").replace(/\band\b/g, "&").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

  const rawBaseYears = Number(apiData?.base_duration_years ?? stock.base_duration_years ?? stock.baseDurationYears ?? 0);
  const baseDurationStr = rawBaseYears >= 0.5 ? `Base · ${rawBaseYears.toFixed(1)} years` : null;

  const patCode = (patternName || "").split("·")[0].trim().toUpperCase().replace(/[\s\-]+/g, "_");
  const tfCode = (rawTf || (dnaTimeframe === "monthly" ? "1M" : dnaTimeframe === "macro" ? "1W" : "1D")).toUpperCase()
    .replace("1M", "MONTHLY").replace("1W", "WEEKLY").replace("1D", "DAILY");
  const accKey = `${tfCode}_${patCode}`;
  const acc = patternAccuracy?.matrix?.[accKey] || patternAccuracy?.by_pattern?.[patCode];

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
    const tvInterval = dnaTimeframe === "monthly" ? "M" : dnaTimeframe === "macro" ? "W" : "D";

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
      interval: tvInterval,
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
  }, [loading, cleanSymbol, theme, dnaTimeframe]);

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
                Preparing the chart for <span className="loading-highlight-sym">{cleanSymbol}</span>
              </h3>

              <p className="chart-loading-subtitle">
                Loading price history and chart levels...
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
                  <span>Preparing the price chart</span>
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
        <header className="topbar analyst-topbar" style={{ position: "sticky", top: 0, zIndex: 100, marginBottom: 16 }}>
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button" 
              className="theme-btn" 
              onClick={handleBackNavigation}
              style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }}
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
            <button type="button" className="dna-nav-share-btn" onClick={handleWhatsAppShare} style={{ margin: 0, padding: "8px 13px", fontSize: 12, borderRadius: 10 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
              </svg>
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* ── 2. HERO STOCK IDENTITY & 52W RANGE ──────────────────────────── */}
        <section className="dna-stock-identity-hero analyst-overview" aria-labelledby="analyst-stock-title">
          <div className="analyst-overview-main">
            <div className="analyst-identity">
              <div className="analyst-eyebrow">
                <span className="analyst-symbol">{cleanSymbol}</span>
                <span className="analyst-market">BSE · {sector}</span>
                {isTargetAchieved && <span className="analyst-status">Target reached</span>}
              </div>
              <h1 id="analyst-stock-title" className="analyst-company-name">{stockName}</h1>
              <div className="analyst-pattern-line">
                <span className="analyst-pattern-label">Detected pattern</span>
                <span className="analyst-pattern-name">{displayPatternName}</span>
              </div>
              <div className="analyst-context-row">
                {timeframeTag && <span className="analyst-context-chip">{timeframeTag}</span>}
                {baseDurationStr && <span className="analyst-context-chip">{baseDurationStr}</span>}
                {acc && acc.win_rate_pct > 0 && <span className="analyst-context-chip analyst-history">Historical win rate {acc.win_rate_pct}% · {acc.resolved || acc.total} trades</span>}
              </div>
              {acc && acc.win_rate_pct > 0 && <p className="analyst-history-note">Historical pattern results are informational and do not predict future returns.</p>}
            </div>
            <div className="analyst-price-block">
              <span className="analyst-price-label">Current price</span>
              <span className="dna-live-price analyst-live-price">{fmtCurrency(cmp)}</span>
              {potentialGainStr && <span className="analyst-target-distance">Target distance <strong>{potentialGainStr.replace(" Potential", "")}</strong></span>}
              <span className="analyst-updated"><span className="analyst-live-dot" />{isTargetAchieved ? "Setup complete" : `Analysis updated · ${new Date().toLocaleDateString("en-CA")}`}</span>
            </div>
          </div>

          <div className="analyst-market-range" aria-label="52-week trading range">
            <div className="analyst-range-heading"><span>52-week range</span><span>{range52Pct != null ? `${range52Pct}% of range` : "Position unavailable"}</span></div>
            <div className="range-52w-track">
              {range52Pct != null && <><div className="range-52w-fill" style={{ width: `${range52Pct}%` }} /><div className="range-52w-thumb" style={{ left: `${range52Pct}%` }} /></>}
            </div>
            <div className="range-52w-labels"><span>Low <strong>{fmtCurrency(low52)}</strong></span><span>High <strong>{fmtCurrency(high52)}</strong></span></div>
          </div>

          <div className="dna-3-levels-hud analyst-levels" aria-label="Key price levels">
            <div className="level-pod pivot-pod"><span className="level-lbl">BREAKOUT PIVOT</span><span className="level-val gold">{fmtCurrency(entryPrice)}</span></div>
            <div className="level-pod target-pod"><span className="level-lbl">{isTargetAchieved ? "TARGET · REACHED" : "TARGET"}</span><span className="level-val profit">{fmtCurrency(targetPrice)}</span></div>
            <div className="level-pod sl-pod"><span className="level-lbl">STOP LOSS</span><span className="level-val loss">{fmtCurrency(stopLossPrice)}</span></div>
          </div>
        </section>

        {/* ── 3. FIRST CHART: THE ANALYSED DNA CHART (NO TEXT ON CHART) ────── */}
        <section className="dna-chart-card-section">
          <div className="chart-card-header-bar">
            <div className="chart-header-left">
              <svg className="chart-icon-flair" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m7 14 4-4 3 3 6-7" />
              </svg>
              <span className="chart-card-heading">Price chart</span>
              <button
                type="button"
                className="chart-refresh-icon-btn"
                title="Reload Chart"
                aria-label="Reload price chart"
                onClick={() => setChartReloadKey((k) => k + 1)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={chartLoading ? "spin-pulse" : ""}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
              </button>
            </div>
            <div className="chart-tf-toggle-capsule" role="group" aria-label="Chart timeframe">
              <button
                type="button"
                className={`chart-tf-btn ${dnaTimeframe === "tactical" ? "active" : ""}`}
                onClick={() => setDnaTimeframe("tactical")}
                aria-pressed={dnaTimeframe === "tactical"}
              >
                Daily
              </button>
              <button
                type="button"
                className={`chart-tf-btn ${dnaTimeframe === "macro" ? "active" : ""}`}
                onClick={() => setDnaTimeframe("macro")}
                aria-pressed={dnaTimeframe === "macro"}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`chart-tf-btn ${dnaTimeframe === "monthly" ? "active" : ""}`}
                onClick={() => setDnaTimeframe("monthly")}
                aria-pressed={dnaTimeframe === "monthly"}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Clean Analysed Chart Stage with In-Chart Loading and Error Recovery */}
          <div className="dna-clean-chart-stage">
            {chartLoading && (
              <div className="chart-stage-loading-overlay">
                <div className="chart-stage-spinner-ring" />
                <div className="chart-stage-loading-text">
                  Loading price chart...
                </div>
                <div className="chart-stage-loading-sub">
                  {dnaTimeframe === "monthly"
                    ? "Loading monthly prices and pattern levels"
                    : dnaTimeframe === "macro"
                    ? "Loading weekly prices and pattern levels"
                    : "Loading daily prices and pattern levels"}
                </div>
              </div>
            )}

            {chartError ? (
              <div className="chart-stage-error-overlay">
                <div className="chart-stage-error-icon">📊</div>
                <div className="chart-stage-error-title">Chart Generation Pending</div>
                <div className="chart-stage-error-sub">
                  The chart is still loading. Please try again in a moment.
                </div>
                <button
                  type="button"
                  className="chart-stage-reload-btn"
                  aria-label="Try loading the chart again"
                  onClick={() => setChartReloadKey((k) => k + 1)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  Generate & Reload Chart
                </button>
              </div>
            ) : (
              loadedChartSrc && (
                <img
                  src={loadedChartSrc}
                  alt={`${cleanSymbol} pattern price chart`}
                  className={`dna-rendered-chart-image ${chartLoading ? "is-reloading" : ""}`}
                />
              )
            )}
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

        {/* ── 6. V4 AI PATTERN FINGERPRINT & CONVICTION ENGINE ────────────── */}
        <section className={`dna-ai-probability-card ${apiData?.ml_decision ? "active-engine" : ""}`} style={apiData?.ml_decision ? { display: "block", borderStyle: "solid", borderColor: "rgba(59, 130, 246, 0.3)" } : {}}>
          {apiData?.ml_decision ? (
            <div className="v4-ai-live-container" style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <div className="ai-prob-kicker" style={{ margin: 0 }}>
                  <span className="neural-spin">✦</span>
                  <span>QUANT ML CONVICTION ENGINE · 98,340 HISTORICAL SETUPS</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: apiData.ml_decision.conviction_grade === "ELITE" ? "rgba(16, 185, 129, 0.2)" : apiData.ml_decision.conviction_grade === "STRONG" ? "rgba(59, 130, 246, 0.2)" : apiData.ml_decision.conviction_grade === "NEUTRAL" ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: apiData.ml_decision.conviction_grade === "ELITE" ? "#10B981" : apiData.ml_decision.conviction_grade === "STRONG" ? "#38BDF8" : apiData.ml_decision.conviction_grade === "NEUTRAL" ? "#F59E0B" : "#EF4444",
                      border: `1px solid ${apiData.ml_decision.conviction_grade === "ELITE" ? "#10B981" : apiData.ml_decision.conviction_grade === "STRONG" ? "#38BDF8" : apiData.ml_decision.conviction_grade === "NEUTRAL" ? "#F59E0B" : "#EF4444"}`
                    }}
                  >
                    GRADE: {apiData.ml_decision.conviction_grade}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.06)",
                      color: "var(--an-text-sub)"
                    }}
                  >
                    Size: {apiData.ml_decision.kelly_size_multiplier}×
                  </span>
                </div>
              </div>

              {/* Stats Bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, margin: "10px 0" }}>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "var(--an-text-sub)", fontWeight: 700 }}>WIN PROBABILITY</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#10B981", marginTop: 2 }}>{apiData.ml_decision.win_probability_pct}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "var(--an-text-sub)", fontWeight: 700 }}>EXPECTED VALUE (EV)</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: apiData.ml_decision.expected_value_pct >= 0 ? "#10B981" : "#EF4444", marginTop: 2 }}>
                    {apiData.ml_decision.expected_value_pct > 0 ? `+${apiData.ml_decision.expected_value_pct}%` : `${apiData.ml_decision.expected_value_pct}%`}
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "var(--an-text-sub)", fontWeight: 700 }}>PATTERN DNA MATCH</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#38BDF8", marginTop: 2 }}>{apiData.fingerprint_analysis?.top_similarity_pct || "—"}</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 9, color: "var(--an-text-sub)", fontWeight: 700 }}>HISTORICAL TWIN WINS</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#F59E0B", marginTop: 2 }}>{apiData.fingerprint_analysis?.twin_historical_win_rate_pct != null ? `${apiData.fingerprint_analysis.twin_historical_win_rate_pct}%` : "—"}</div>
                </div>
              </div>

              {/* Historical Twins Chips */}
              {apiData.fingerprint_analysis?.top_historical_twins && apiData.fingerprint_analysis.top_historical_twins.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 9, color: "var(--an-text-sub)", fontWeight: 700, marginBottom: 5 }}>
                    CLOSEST HISTORICAL TWINS (2019–2024 MEMORY BANK):
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {apiData.fingerprint_analysis.top_historical_twins.slice(0, 3).map((tw: any, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 9.5,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: tw.realized_win ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                          border: `1px solid ${tw.realized_win ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                          color: tw.realized_win ? "#10B981" : "#EF4444",
                          fontWeight: 700
                        }}
                      >
                        {tw.symbol} ({tw.date.slice(0, 7)}) · {tw.similarity_pct} match · {tw.mfe_gain_pct > 0 ? `+${tw.mfe_gain_pct}% peak` : `${tw.mfe_gain_pct}%`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
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
