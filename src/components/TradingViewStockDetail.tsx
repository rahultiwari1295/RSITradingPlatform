import React, { useEffect, useRef, memo, useState } from "react";

declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      "tv-technical-analysis": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        symbol?: string;
        "hide-logo-and-name"?: boolean | string;
        "ratings-display-mode"?: string;
        "color-theme"?: string;
      };
      "tv-company-profile": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        symbol?: string;
        "color-theme"?: string;
      };
    }
  }
}

function toTradingViewSymbol(sym: string | undefined): string {
  if (!sym) return "NSE:RELIANCE";
  const clean = String(sym)
    .replace(/^(BSE:|NSE:)/i, "")
    .replace(/\.(NS|BO)$/i, "")
    .replace(/-BE$/i, "")
    .trim()
    .toUpperCase();
  return `NSE:${clean}`;
}

export function getTradeTriggerTelemetry(t: any): [string, string] {
  const strategyName = t.strategy || t.engine || "Quant Engine";
  const triggerReason = t.trigger_reason || t.thesis || t.setup_desc || t.tag || t.stage;
  const volumeMult = t.volume_mult ? `${t.volume_mult}x 20-DMA volume` : (t.vol_mult ? `${t.vol_mult}x volume` : "above-average institutional volume");
  const rsiVal = t.rsi ? `RSI at ${Number(t.rsi).toFixed(1)}` : null;

  const line1 = triggerReason
    ? `${strategyName}: ${String(triggerReason).charAt(0).toUpperCase() + String(triggerReason).slice(1)} structure confirmed.`
    : `${strategyName} algorithmic setup active near ₹${Number(t.entry || t.price || 0).toLocaleString("en-IN")}.`;

  const line2 = t.acc_days !== undefined
    ? `Institutional footprint: ${t.acc_days} accumulation vs ${t.dist_days || 0} distribution days (${volumeMult}).`
    : (rsiVal
        ? `Technical confluence: ${rsiVal} with ${volumeMult} supporting price action.`
        : `Higher-low price structure confirmed above key moving average support.`);

  return [line1, line2];
}

const FundamentalWidget = memo(function FundamentalWidget({
  symbol,
  theme,
}: {
  symbol: string;
  theme: "light" | "dark";
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";
    container.current.appendChild(widgetDiv);

    const copyrightDiv = document.createElement("div");
    copyrightDiv.className = "tradingview-widget-copyright";
    copyrightDiv.style.fontSize = "11px";
    copyrightDiv.style.padding = "6px 8px";
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/financials-overview/" rel="noopener nofollow" target="_blank"><span class="blue-text">${symbol.replace(/^(NSE:|BSE:)/i, "")} fundamentals</span></a><span class="trademark"> by TradingView</span>`;
    container.current.appendChild(copyrightDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      colorTheme: theme === "dark" ? "dark" : "light",
      displayMode: "regular",
      isTransparent: false,
      locale: "en",
      width: "100%",
      height: "100%",
    });
    container.current.appendChild(script);
  }, [symbol, theme]);

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: "480px", width: "100%" }}
    />
  );
});

const AdvancedChartWidget = memo(function AdvancedChartWidget({
  symbol,
  theme,
}: {
  symbol: string;
  theme: "light" | "dark";
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";
    container.current.appendChild(widgetDiv);

    const copyrightDiv = document.createElement("div");
    copyrightDiv.className = "tradingview-widget-copyright";
    copyrightDiv.style.fontSize = "11px";
    copyrightDiv.style.padding = "6px 8px";
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/" rel="noopener nofollow" target="_blank"><span class="blue-text">${symbol.replace(/^(NSE:|BSE:)/i, "")} stock chart</span></a><span class="trademark"> by TradingView</span>`;
    container.current.appendChild(copyrightDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
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
      symbol: symbol,
      theme: theme === "dark" ? "dark" : "light",
      timezone: "Asia/Kolkata",
      backgroundColor: theme === "dark" ? "#151823" : "#ffffff",
      gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(46, 46, 46, 0.15)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      support_host: "https://www.tradingview.com",
      studies: [],
      autosize: true,
    });
    container.current.appendChild(script);
  }, [symbol, theme]);

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: "480px", width: "100%" }}
    />
  );
});

const ChartOverviewWidget = memo(function ChartOverviewWidget({
  trade: t,
  INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`,
}: {
  trade: any;
  INR?: (n: number | string | undefined) => string;
}) {
  const entry = Number(t.entry || t.entryPrice || t.price || 100);
  const now = Number(t.now || t.currentPrice || entry);
  const target = Number(t.target || t.targetPrice || entry * 1.15);
  const stop = Number(t.stop || t.stopLoss || entry * 0.95);

  const cleanSym = String(t.sym || t.symbol || "TCS")
    .replace(/^(BSE:|NSE:)/i, "")
    .replace(/\.(NS|BO)$/i, "")
    .replace(/-BE$/i, "")
    .trim()
    .toUpperCase();

  const [fetchedCandles, setFetchedCandles] = useState<any[] | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    if ((t.miniChart?.candles?.length ?? 0) > 5 || (t.candles?.length ?? 0) > 5) {
      return;
    }
    let isMounted = true;
    setLoadingChart(true);
    fetch(`/api/chart/${encodeURIComponent(cleanSym)}?limit=44`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data.candles)) {
          setFetchedCandles(data.candles);
        }
      })
      .catch((err) => console.warn(`Chart fetch failed for ${cleanSym}:`, err))
      .finally(() => {
        if (isMounted) setLoadingChart(false);
      });
    return () => {
      isMounted = false;
    };
  }, [cleanSym, t.miniChart?.candles, t.candles]);

  const rawCandles =
    t.miniChart?.candles?.length > 5
      ? t.miniChart.candles
      : t.candles?.length > 5
      ? t.candles
      : fetchedCandles || [];

  const W = 360;
  const H = 180;
  const padT = 24;
  const padB = 20;

  if (rawCandles.length === 0) {
    return (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted, #94a3b8)",
          fontSize: "12px",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: "8px",
          background: "rgba(0,0,0,0.15)",
        }}
      >
        {loadingChart ? "Loading verified market candles..." : "Candle history available via full chart"}
      </div>
    );
  }

  const normalized = rawCandles.map((c: any) => ({
    o: Number(c.open ?? c.o ?? 0),
    h: Number(c.high ?? c.h ?? 0),
    l: Number(c.low ?? c.l ?? 0),
    c: Number(c.close ?? c.c ?? 0),
  }));

  let max = -Infinity,
    min = Infinity;
  normalized.forEach((c: any) => {
    if (c.h > max) max = c.h;
    if (c.l < min) min = c.l;
  });

  const overlays = [
    { price: target, color: "var(--profit)", label: `TARGET ${INR(target)}` },
    { price: entry, color: "var(--accent)", label: `ENTRY ${INR(entry)}`, dash: "4 3" },
    { price: stop, color: "var(--loss)", label: `STOP ${INR(stop)}`, dash: "4 3" },
  ];

  overlays.forEach((ov) => {
    if (ov.price > max) max = ov.price;
    if (ov.price < min) min = ov.price;
  });

  const raw = max - min || 1;
  max += raw * 0.08;
  min -= raw * 0.08;
  const span = max - min || 1;

  const y = (p: number) => padT + ((max - p) / span) * (H - padT - padB);
  const slot = W / normalized.length;
  const bw = Math.max(1.8, slot * 0.6);

  const sortedOverlays = [...overlays].sort((a, b) => b.price - a.price);

  return (
    <div
      className="card"
      style={{
        background: "var(--s2)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        padding: "15px 12px 12px",
      }}
    >
      <div className="chartbox" style={{ padding: 0, overflow: "hidden", background: "transparent", border: 0 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          style={{ display: "block", overflow: "visible" }}
        >
          {sortedOverlays.map((ov, idx) => {
            const yy = y(ov.price);
            const isRight = idx % 2 === 1;
            return (
              <g key={`ov-${idx}`}>
                <line
                  x1="0"
                  x2={W}
                  y1={yy}
                  y2={yy}
                  stroke={ov.color}
                  strokeWidth="1"
                  strokeDasharray={ov.dash || "4 4"}
                  opacity={0.8}
                />
                {ov.label && (
                  <text
                    x={isRight ? W - 6 : 6}
                    textAnchor={isRight ? "end" : "start"}
                    y={yy - 4}
                    fontSize="8.5"
                    fontWeight="700"
                    fontFamily="'JetBrains Mono',monospace,sans-serif"
                    fill={ov.color}
                    opacity="0.95"
                  >
                    {ov.label}
                  </text>
                )}
              </g>
            );
          })}

          {normalized.map((c: any, i: number) => {
            const cx = i * slot + slot / 2;
            const up = c.c >= c.o;
            const col = up ? "var(--profit)" : "var(--loss)";
            const bt = y(Math.max(c.o, c.c));
            const bb = y(Math.min(c.o, c.c));
            const bh = Math.max(1.2, bb - bt);

            return (
              <g key={`c-${i}`}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={y(c.h)}
                  y2={y(c.l)}
                  stroke={col}
                  strokeWidth="1"
                  opacity="0.8"
                />
                <rect
                  x={cx - bw / 2}
                  y={bt}
                  width={bw}
                  height={bh}
                  rx={Math.min(1.2, bw / 3)}
                  fill={col}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className="legend"
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 10,
          marginTop: 10,
          display: "flex",
          gap: 18,
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--ink2)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }} />
          Entry
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--loss)" }} />
          Stop
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--profit)" }} />
          Target
        </span>
      </div>
    </div>
  );
});

export function getConvictionTier(score: number | undefined) {
  const s = score !== undefined ? Number(score) : 70;
  if (s >= 85) return { stars: 5, label: "Elite Conviction", badgeClass: "tier-elite", color: "#10b981", pct: 100 };
  if (s >= 70) return { stars: 4, label: "High Conviction", badgeClass: "tier-high", color: "#3b82f6", pct: 80 };
  if (s >= 55) return { stars: 3, label: "Moderate Setup", badgeClass: "tier-mod", color: "#f59e0b", pct: 60 };
  if (s >= 40) return { stars: 2, label: "Speculative", badgeClass: "tier-spec", color: "#f97316", pct: 40 };
  return { stars: 1, label: "High Risk / Avoid", badgeClass: "tier-risk", color: "#ef4444", pct: 20 };
}

interface TradingViewStockDetailProps {
  trade: any;
  theme?: "light" | "dark";
  onOpenChart?: (symbol: string) => void;
  onClose?: () => void;
  INR?: (n: number | string | undefined) => string;
  INR2?: (n: number | string | undefined) => string;
}

export default function TradingViewStockDetail({
  trade: t,
  theme = "dark",
  onOpenChart,
  onClose,
  INR = (n) => (n !== undefined ? `₹${Number(n).toLocaleString("en-IN")}` : "₹0"),
  INR2 = (n) => (n !== undefined ? `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₹0.00"),
}: TradingViewStockDetailProps) {
  const symName = t.sym || t.symbol || "RELIANCE";
  const tvSymbol = toTradingViewSymbol(symName);
  const cleanSym = tvSymbol.replace("NSE:", "");

  const entry = Number(t.entry || t.price || t.entryPrice || 0);
  const now = Number(t.now || t.currentPrice || t.price || entry || 0);
  const target = Number(t.target || t.targetPrice || (entry > 0 ? entry * 1.15 : 0));
  const stop = Number(t.stop || t.stopLoss || (entry > 0 ? entry * 0.95 : 0));

  const prog = Math.max(0, Math.min(100, target > stop ? ((now - stop) / (target - stop)) * 100 : 50));
  const [whyLine1, whyLine2] = getTradeTriggerTelemetry(t);
  const scoreVal = Number(t.health_score ?? t.dnaScore ?? t.score ?? (t.stars ? t.stars * 20 : 70));
  const convictionTier = getConvictionTier(scoreVal);

  // Dynamically load TradingView widget web component scripts on-demand only
  useEffect(() => {
    const loadScript = (src: string, id: string) => {
      if (document.getElementById(id)) return;
      const script = document.createElement("script");
      script.id = id;
      script.type = "module";
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    };
    loadScript("https://widgets.tradingview-widget.com/w/en/tv-technical-analysis.js", "tv-tech-analysis-script");
    loadScript("https://widgets.tradingview-widget.com/w/en/tv-company-profile.js", "tv-company-profile-script");
  }, []);

  return (
    <div className="signal-terminal-modal stock-detail-common">
      {/* Block 1: Navigation Bar & Signal Status Header */}
      <div
        className="signal-terminal-nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 14,
          marginBottom: 6,
          borderBottom: "1px solid var(--line-2, rgba(255,255,255,0.1))",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => {
            if (onClose) onClose();
            else if (typeof window !== "undefined" && (window as any)._closeSheet) (window as any)._closeSheet();
            else if (typeof window !== "undefined" && (window as any).closeSheet) (window as any).closeSheet();
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--s2, rgba(255,255,255,0.06))",
            border: "1px solid var(--line-2, rgba(255,255,255,0.12))",
            color: "var(--ink1, #F4F5F9)",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          ← Back to Signals
        </button>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800,
            color: "var(--accent, #6366F1)",
            letterSpacing: "0.04em",
          }}
        >
          <span>QuantSync V2</span>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981" }} />
          <span style={{ color: "#10B981", fontSize: 11 }}>Active</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={`/dna-mobile-story.html?symbol=${encodeURIComponent(cleanSym)}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(99,102,241,0.15)",
              color: "#818cf8",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            🧬 DNA Link
          </a>
          <button
            onClick={() => {
              const url = (typeof window !== "undefined" ? window.location.origin : "https://quantsync.in") + `/stock-detail.html?symbol=${encodeURIComponent(cleanSym)}`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(url);
                alert(`Setup link copied!\n${url}`);
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              borderRadius: 8,
              background: "var(--s2, rgba(255,255,255,0.06))",
              color: "var(--ink2, #9BA3B4)",
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid var(--line-2, rgba(255,255,255,0.12))",
              cursor: "pointer",
            }}
          >
            📤 Share
          </button>
        </div>
      </div>

      {/* 1. Header: Stock name with star as it is */}
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="row gap12">
          <div
            className="av"
            style={{
              background: t.grad || "linear-gradient(135deg,#6366F1,#8B5CF6)",
              color: "#fff",
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
            }}
          >
            {t.ab || cleanSym.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.035em" }}>
              {cleanSym}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>{t.tag || t.stage || "Diversified · Breakout"}</span>
              <span>·</span>
              <span
                className="stars"
                style={{ fontSize: 11, verticalAlign: "middle", color: convictionTier.color, display: "inline-flex", alignItems: "center", gap: 4 }}
                title={`${convictionTier.label} (QuantSync Score: ${scoreVal}/100)`}
              >
                {"★".repeat(convictionTier.stars) + "☆".repeat(5 - convictionTier.stars)}
                <small style={{ fontSize: 9, opacity: 0.9, fontWeight: 700 }}>({convictionTier.label})</small>
              </span>
            </div>
          </div>
        </div>
        <span className="pill accent" style={{ fontWeight: 700 }}>
          {t.status || "IN TRADE"}
        </span>
      </div>

      {/* 2. Price Line Box: Entry, Current, Target with colorful line */}
      <div className="card" style={{ padding: 15, background: "var(--s2)", borderRadius: 14, border: "1px solid var(--border)" }}>
        <div className="row between" style={{ fontSize: 10.5, color: "var(--ink3)", fontWeight: 600 }}>
          <span>
            Entry <b className="num" style={{ color: "var(--ink2)", fontSize: 12 }}>{INR2(entry)}</b>
          </span>
          <span>
            Current <b className="num" style={{ color: "var(--ink1)", fontSize: 12 }}>{INR2(now)}</b>
          </span>
          <span>
            Target <b className="num up" style={{ fontSize: 12 }}>{INR(target)}</b>
          </span>
        </div>
        <div className="prog" style={{ marginTop: 13, height: 9 }}>
          <span style={{ width: `${prog}%` }} />
          <i className="stopmark" />
          <i className="tgtmark" />
        </div>
        <div className="row between" style={{ marginTop: 9, fontSize: 10, color: "var(--ink3)", fontWeight: 600 }}>
          <span>Stop {INR(stop)}</span>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{prog.toFixed(1)}% to target</span>
          <span>Target {INR(target)}</span>
        </div>
      </div>

      {/* 3. WHY AI SELECTED THIS: exactly 2 lines with actual values */}
      <div
        className="why"
        style={{
          background: "var(--s2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "14px 16px",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: "var(--ink1)", marginBottom: 8 }}>
          💡 WHY AI SELECTED THIS
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink2)", display: "flex", flexDirection: "column", gap: 4 }}>
          <div>• {whyLine1}</div>
          <div>• {whyLine2}</div>
        </div>
      </div>

      {/* 4. Widget 1: Technical Analysis Widget (370x340 aspect ratio auto-adjusting to screen width) */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Technical Analysis
          </span>
        </div>
        <div
          className="tv-gauge-wrapper"
          style={{
            width: "100%",
            maxWidth: "100%",
            aspectRatio: "370 / 340",
            minHeight: "340px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <tv-technical-analysis
            key={`ta-${tvSymbol}-${theme}`}
            symbol={tvSymbol}
            hide-logo-and-name="true"
            ratings-display-mode="gauge-and-breakdown"
            color-theme={theme === "dark" ? "dark" : "light"}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Chart Overview Widget */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Chart Overview
          </span>
        </div>
        <ChartOverviewWidget trade={t} INR={INR} />
      </div>

      {/* Advanced Stock Chart Widget */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Stock Chart
          </span>
        </div>
        <div
          className="tv-chart-wrapper"
          style={{
            width: "100%",
            minHeight: "460px",
            height: "480px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <AdvancedChartWidget
            key={`chart-${tvSymbol}-${theme}`}
            symbol={tvSymbol}
            theme={theme}
          />
        </div>
      </div>

      {/* 5. Widget 2: Company Profile Widget */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Company Profile
          </span>
        </div>
        <div
          className="tv-profile-wrapper"
          style={{
            width: "100%",
            minHeight: "260px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            padding: 4,
            boxSizing: "border-box",
          }}
        >
          <tv-company-profile
            key={`profile-${tvSymbol}-${theme}`}
            symbol={tvSymbol}
            color-theme={theme === "dark" ? "dark" : "light"}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* 6. Widget 3: Fundamental Data (Financials Overview) */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Fundamental Data
          </span>
        </div>
        <div
          className="tv-financials-wrapper"
          style={{
            width: "100%",
            minHeight: "480px",
            height: "500px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <FundamentalWidget
            key={`fund-${tvSymbol}-${theme}`}
            symbol={tvSymbol}
            theme={theme}
          />
        </div>
      </div>

      {/* 7. Action Button: Open Live Chart */}
      {onOpenChart && (
        <button
          className="btn primary"
          style={{ marginTop: 8 }}
          onClick={() => onOpenChart(cleanSym)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19V5M4 19h16" />
            <path d="M8 15l3.5-4 3 2.5L20 7" />
          </svg>
          Open Live Chart
        </button>
      )}
    </div>
  );
}
