import React, { useState, useEffect, useRef } from "react";
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
}

interface BreakoutAnalystViewProps {
  stock: BreakoutStockData;
  theme?: "dark" | "light";
  onClose: () => void;
  onNavigateDna: (symbol: string) => void;
}

function getSpecificPoints(stock: BreakoutStockData): { good: string; bad: string } {
  const sym = (stock.symbol || "").toUpperCase().trim();
  const pattern = (stock.stage || stock.pattern || "").toLowerCase();
  const vol = stock.volRatio || "3.2x";
  const rr = stock.rrRatio || "1:2.8";
  const stopStr = Number(stock.stopPrice || stock.stopLoss || 0).toFixed(2);

  if (sym === "AUROPHARMA") {
    return {
      good: "Heavy 3.4x institutional volume expansion clearing 38-day base consolidation. Sustained momentum above 20 & 50 EMA with 1:2.8 risk-to-reward.",
      bad: "Overhead supply zone near ₹1,420 swing high; setup invalidates if price drops below ₹1,180.00 stop loss."
    };
  }
  if (sym === "SMLMAH") {
    return {
      good: "Multi-month cup breakout to 52-week highs with 2.8x volume surge and zero overhead trapped supply.",
      bad: "Cyclical commercial auto beta; volatility requires strict stop-loss adherence at ₹1,390.00."
    };
  }
  if (sym === "VIJAYA") {
    return {
      good: "Textbook Cup & Handle pivot breakout with institutional accumulation and relative strength outperformance.",
      bad: "Short-term volume contraction could lead to retesting the ₹895.00 pivot floor before moving higher."
    };
  }

  // Dynamic high-relevance fallback for any screener stock
  let goodStr = `High-conviction ${stock.stage || "Stage-2"} setup backed by ${vol} volume surge above key EMAs with favorable ${rr} risk-to-reward.`;
  let badStr = `Trade strictly invalidates on any daily close below the ₹${stopStr} protective stop loss.`;

  if (pattern.includes("52-week") || pattern.includes("high")) {
    goodStr = `Clean breakout into 52-week high territory with ${vol} institutional volume expansion and zero overhead resistance.`;
    badStr = `Vulnerable to broader index pullback; exit immediately if price slips below ₹${stopStr}.`;
  } else if (pattern.includes("cup")) {
    goodStr = `Completed multi-month accumulation bowl with volume surge clearing the handle pivot point.`;
    badStr = `Handle breakdown risk if price fails to sustain above ₹${stopStr} invalidation floor.`;
  } else if (pattern.includes("wedge") || pattern.includes("triangle")) {
    goodStr = `Volatility contraction squeeze resolving with clean directional breakout above upper resistance rail.`;
    badStr = `False breakout risk if index market breadth declines sharply.`;
  }

  return { good: goodStr, bad: badStr };
}

export const BreakoutAnalystView: React.FC<BreakoutAnalystViewProps> = ({
  stock,
  theme = "light",
  onClose,
  onNavigateDna
}) => {
  const [activeTab, setActiveTab] = useState<"dna" | "tradingview">("dna");
  const [dnaTimeframe, setDnaTimeframe] = useState<"tactical" | "macro">("tactical");
  const [copiedToast, setCopiedToast] = useState(false);
  const tvContainerRef = useRef<HTMLDivElement>(null);

  const cleanSymbol = (stock.symbol || "").trim().toUpperCase().replace(/^(BSE:|NSE:)/i, "");
  const stockName = stock.name || cleanSymbol;
  const entryPrice = stock.breakoutPrice || stock.entryPrice || stock.price || 0;
  const targetPrice = stock.targetPrice || stock.target || entryPrice * 1.12;
  const stopLossPrice = stock.stopPrice || stock.stopLoss || entryPrice * 0.95;
  const currentCmp = stock.currPrice || stock.price || entryPrice;
  const patternName = stock.stage || stock.pattern || "Stage-2 Base Breakout";

  const { good, bad } = getSpecificPoints(stock);

  const websiteLink = typeof window !== "undefined" && window.location.origin
    ? `${window.location.origin}/?stock=${cleanSymbol}`
    : `https://rsitradingplatform.vercel.app/?stock=${cleanSymbol}`;

  // Exact share message format specified by user
  const shareText = `StockName : ${cleanSymbol}

Entry Price : ₹${Number(entryPrice).toFixed(2)}
Target : ₹${Number(targetPrice).toFixed(2)}
SL : ₹${Number(stopLossPrice).toFixed(2)}

Good Point : ${good}
Bad Point : ${bad}

*Only For Education Purpose, always research first before investing your hard earned money.*

ChartAnalysis : ${websiteLink}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3200);
      }
    } catch (err) {
      console.warn("Copy error:", err);
    }
  };

  const handleWhatsAppShare = () => {
    handleCopy();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  // ── Embed TradingView Widget strictly with BSE exchange prefix ──
  useEffect(() => {
    if (activeTab !== "tradingview" || !tvContainerRef.current) return;
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

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol: `BSE:${cleanSymbol}`,
      theme: theme === "dark" ? "dark" : "light",
      timezone: "Etc/UTC",
      backgroundColor: theme === "dark" ? "#0F0F0F" : "#FFFFFF",
      gridColor: theme === "dark" ? "rgba(242, 242, 242, 0.12)" : "rgba(0, 0, 0, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      support_host: "https://www.tradingview.com",
      studies: [],
      autosize: true
    });

    widgetWrap.appendChild(script);
    tvContainerRef.current.appendChild(widgetWrap);
  }, [activeTab, cleanSymbol, theme]);

  return (
    <div className={`analyst-modal-backdrop theme-${theme}`}>
      <div className="analyst-view-panel">
        {/* Toast confirmation */}
        {copiedToast && (
          <div className="share-toast-bubble">
            ✓ Copied to clipboard & opening WhatsApp!
          </div>
        )}

        {/* ── 1. TOP EXECUTIVE APP BAR ─────────────────────────────────────── */}
        <div className="analyst-top-bar">
          <button 
            type="button" 
            className="analyst-back-btn" 
            onClick={onClose}
            aria-label="Back to previous screen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back</span>
          </button>

          <div className="analyst-stock-title-cluster">
            <div className="stock-ticker-row">
              <span className="stock-ticker-bold">{cleanSymbol}</span>
              <span className="exchange-pill-bse">BSE EQ</span>
              {stock.dnaScore && (
                <span className="dna-score-micro-tag">{stock.dnaScore} DNA</span>
              )}
            </div>
            <div className="stock-company-name-sub">
              {stockName} · {patternName}
            </div>
          </div>

          <button 
            type="button" 
            className="analyst-whatsapp-mini-btn" 
            onClick={handleWhatsAppShare}
            title="Share directly to WhatsApp"
          >
            {/* Official WhatsApp SVG Icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Share</span>
          </button>
        </div>

        {/* ── 2. KEY METRICS STRIP (ENTRY, TARGET, SL, CMP) ─────────────────── */}
        <div className="analyst-metrics-strip">
          <div className="analyst-metric-box pivot-box">
            <span className="a-metric-lbl">ENTRY / PIVOT</span>
            <span className="a-metric-val gold-accent">₹{Number(entryPrice).toFixed(2)}</span>
          </div>

          <div className="analyst-metric-box target-box">
            <span className="a-metric-lbl">TARGET</span>
            <span className="a-metric-val profit-accent">₹{Number(targetPrice).toFixed(2)}</span>
            <span className="a-metric-badge">
              +{(((targetPrice - entryPrice) / (entryPrice || 1)) * 100).toFixed(1)}%
            </span>
          </div>

          <div className="analyst-metric-box sl-box">
            <span className="a-metric-lbl">STOP LOSS (SL)</span>
            <span className="a-metric-val loss-accent">₹{Number(stopLossPrice).toFixed(2)}</span>
            <span className="a-metric-badge red">
              -{(((entryPrice - stopLossPrice) / (entryPrice || 1)) * 100).toFixed(1)}%
            </span>
          </div>

          <div className="analyst-metric-box cmp-box">
            <span className="a-metric-lbl">CURRENT CMP</span>
            <span className="a-metric-val cmp-accent">₹{Number(currentCmp).toFixed(2)}</span>
          </div>
        </div>

        {/* ── 3. CHART NAVIGATION TABS ─────────────────────────────────────── */}
        <div className="chart-view-selector-bar">
          <div className="chart-tabs-left">
            <button
              type="button"
              className={`chart-mode-pill ${activeTab === "dna" ? "active" : ""}`}
              onClick={() => setActiveTab("dna")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>DNA Chart</span>
            </button>
            <button
              type="button"
              className={`chart-mode-pill ${activeTab === "tradingview" ? "active" : ""}`}
              onClick={() => setActiveTab("tradingview")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 3v18h18M7 16l4-4 4 4 6-6"/>
              </svg>
              <span>TradingView (BSE)</span>
            </button>
          </div>

          {activeTab === "dna" && (
            <div className="timeframe-toggle-pills">
              <button
                type="button"
                className={`tf-pill ${dnaTimeframe === "tactical" ? "active" : ""}`}
                onClick={() => setDnaTimeframe("tactical")}
              >
                4M Tactical
              </button>
              <button
                type="button"
                className={`tf-pill ${dnaTimeframe === "macro" ? "active" : ""}`}
                onClick={() => setDnaTimeframe("macro")}
              >
                1Y Macro
              </button>
            </div>
          )}
        </div>

        {/* ── 4. CHART DISPLAY STAGE (STRICTLY NO TEXT ON CHART) ─────────────── */}
        <div className="analyst-chart-stage-container">
          {activeTab === "dna" ? (
            <div className="dna-chart-viewport">
              <div className="dna-chart-canvas-wrap">
                <img
                  src={`/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}&t=${Date.now()}`}
                  alt={`${cleanSymbol} DNA Chart`}
                  className="dna-chart-rendered-img"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes("tactical")) {
                      target.src = `/api/dna/chart/${cleanSymbol}?view=tactical`;
                    }
                  }}
                />

                {/* SVG Target, Pivot, SL line overlay (strictly with NO text on chart) */}
                <svg className="clean-levels-overlay" viewBox="0 0 600 340" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="targetGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.95"/>
                    </linearGradient>
                    <linearGradient id="pivotGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.95"/>
                    </linearGradient>
                    <linearGradient id="slGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.95"/>
                    </linearGradient>
                  </defs>

                  {/* Target Line: Green dashed line across chart */}
                  <line 
                    x1="20" 
                    y1="65" 
                    x2="580" 
                    y2="65" 
                    stroke="url(#targetGrad)" 
                    strokeWidth="2.2" 
                    strokeDasharray="6 4" 
                  />

                  {/* Pivot / Entry Line: Amber dashed line across chart */}
                  <line 
                    x1="20" 
                    y1="160" 
                    x2="580" 
                    y2="160" 
                    stroke="url(#pivotGrad)" 
                    strokeWidth="2.2" 
                    strokeDasharray="6 4" 
                  />

                  {/* Stop Loss Line: Red dashed line across chart */}
                  <line 
                    x1="20" 
                    y1="240" 
                    x2="580" 
                    y2="240" 
                    stroke="url(#slGrad)" 
                    strokeWidth="2.2" 
                    strokeDasharray="6 4" 
                  />
                </svg>
              </div>

              {/* Clean Legend Bar BELOW chart (so chart itself has 0 text) */}
              <div className="dna-chart-clean-legend">
                <div className="legend-indicator target-ind">
                  <span className="legend-line green" />
                  <span className="legend-text">Target: <strong>₹{Number(targetPrice).toFixed(2)}</strong></span>
                </div>
                <div className="legend-indicator pivot-ind">
                  <span className="legend-line amber" />
                  <span className="legend-text">Pivot / Entry: <strong>₹{Number(entryPrice).toFixed(2)}</strong></span>
                </div>
                <div className="legend-indicator sl-ind">
                  <span className="legend-line red" />
                  <span className="legend-text">Stop Loss (SL): <strong>₹{Number(stopLossPrice).toFixed(2)}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="tradingview-viewport" ref={tvContainerRef} />
          )}
        </div>

        {/* ── 5. SHARE TO WHATSAPP PRIMARY ACTION (DIRECTLY AFTER CHART) ───── */}
        <div className="whatsapp-action-block">
          <button 
            type="button" 
            className="whatsapp-share-btn-large" 
            onClick={handleWhatsAppShare}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Share to WhatsApp</span>
          </button>
        </div>

        {/* ── 6. FORMATTED SIGNAL MESSAGE PREVIEW ────────────────────────────── */}
        <div className="analyst-share-card">
          <div className="share-card-header">
            <span className="share-card-title">SIGNAL MESSAGE PREVIEW</span>
            <button 
              type="button" 
              className="copy-btn-mini" 
              onClick={handleCopy}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Copy Message</span>
            </button>
          </div>

          <pre className="share-message-box">
{shareText}
          </pre>
        </div>

        {/* ── 7. BOTTOM ACTION FOOTER ───────────────────────────────────────── */}
        <div className="analyst-footer-actions">
          <button 
            type="button" 
            className="analyst-btn-dna"
            onClick={() => {
              onClose();
              onNavigateDna(cleanSymbol);
            }}
          >
            <span>Analyze Complete DNA (Financials & Solvency) ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
};
