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

  // Share text exact format requested by user:
  // StockName :
  // Entry Price :
  // Target :
  // SL :
  const shareText = `StockName : ${cleanSymbol}\n\nEntry Price : ₹${Number(entryPrice).toFixed(2)}\nTarget : ₹${Number(targetPrice).toFixed(2)}\nSL : ₹${Number(stopLossPrice).toFixed(2)}`;

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3000);
      }
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${cleanSymbol} Breakout Setup`,
            text: shareText
          });
        } catch (_) {
          // Native share canceled or dismissed
        }
      }
    } catch (err) {
      console.warn("Share error:", err);
    }
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
        {/* Toast alert */}
        {copiedToast && (
          <div className="share-toast-bubble">
            ✓ Setup copied to clipboard & ready to share!
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
            className="analyst-quick-share-btn" 
            onClick={handleShare}
            title="Share Setup"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span className="share-btn-text">Share</span>
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

        {/* ── 4. CHART DISPLAY STAGE ───────────────────────────────────────── */}
        <div className="analyst-chart-stage-container">
          {activeTab === "dna" ? (
            <div className="dna-chart-viewport">
              {/* Clean Image Stage with NO text on chart */}
              <div className="dna-chart-canvas-wrap">
                <img
                  src={`/api/dna/chart/${cleanSymbol}?view=${dnaTimeframe}&theme=${theme}&t=${Date.now()}`}
                  alt={`${cleanSymbol} DNA Chart`}
                  className="dna-chart-rendered-img"
                  onError={(e) => {
                    // Fallback if specific theme png not yet generated
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
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.95"/>
                    </linearGradient>
                    <linearGradient id="pivotGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.95"/>
                    </linearGradient>
                    <linearGradient id="slGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3"/>
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

        {/* ── 5. SHARE MESSAGE CARD PREVIEW ─────────────────────────────────── */}
        <div className="analyst-share-card">
          <div className="share-card-header">
            <span className="share-card-title">SIGNAL MESSAGE FORMAT</span>
            <button 
              type="button" 
              className="copy-btn-mini" 
              onClick={handleShare}
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

        {/* ── 6. BOTTOM ACTION FOOTER ───────────────────────────────────────── */}
        <div className="analyst-footer-actions">
          <button 
            type="button" 
            className="analyst-btn-dna"
            onClick={() => {
              onClose();
              onNavigateDna(cleanSymbol);
            }}
          >
            <span>Analyze Complete DNA (Financials & Solvency)</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
