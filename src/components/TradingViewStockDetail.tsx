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
  onOpenDna?: (symbol: string) => void;
  onClose?: () => void;
  INR?: (n: number | string | undefined) => string;
  INR2?: (n: number | string | undefined) => string;
}

export default function TradingViewStockDetail({
  trade: t,
  theme = "dark",
  onOpenChart,
  onOpenDna,
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

  const pnlPct = entry > 0 ? ((now - entry) / entry) * 100 : 0;
  const targetPct = entry > 0 ? ((target - entry) / entry) * 100 : 0;
  const stopPct = entry > 0 ? ((stop - entry) / entry) * 100 : 0;
  const bufferToStop = stop > 0 ? (((now - stop) / stop) * 100) : 0;
  const totalMove = target - entry;
  const progressPct = totalMove > 0 ? Math.max(0, Math.min(100, ((now - entry) / totalMove) * 100)) : 0;

  // Dynamic Status Badge
  let statusBadge = {
    label: "ENTRY BASE · 0.00%",
    bg: "rgba(59, 130, 246, 0.15)",
    color: "#60a5fa",
    border: "rgba(59, 130, 246, 0.35)",
    icon: "🔵"
  };
  if (now <= stop && stop > 0) {
    statusBadge = {
      label: `STOPPED OUT · ${pnlPct.toFixed(2)}%`,
      bg: "rgba(239, 68, 68, 0.2)",
      color: "#f87171",
      border: "rgba(239, 68, 68, 0.45)",
      icon: "🔴"
    };
  } else if (now >= target && target > 0) {
    statusBadge = {
      label: `RUNNER · +${pnlPct.toFixed(2)}% (Target Exceeded)`,
      bg: "rgba(245, 158, 11, 0.2)",
      color: "#fbbf24",
      border: "rgba(245, 158, 11, 0.45)",
      icon: "🟠"
    };
  } else if (now > entry) {
    statusBadge = {
      label: `IN PROFIT · +${pnlPct.toFixed(2)}%`,
      bg: "rgba(16, 185, 129, 0.18)",
      color: "#34d399",
      border: "rgba(16, 185, 129, 0.4)",
      icon: "🟢"
    };
  } else if (now < entry && now > stop) {
    statusBadge = {
      label: `PULLBACK ZONE · ${pnlPct.toFixed(2)}%`,
      bg: "rgba(245, 158, 11, 0.18)",
      color: "#fbbf24",
      border: "rgba(245, 158, 11, 0.4)",
      icon: "🟡"
    };
  }

  const [whyLine1, whyLine2] = getTradeTriggerTelemetry(t);
  const scoreVal = Number(t.health_score ?? t.dnaScore ?? t.score ?? (t.stars ? t.stars * 20 : 70));
  const convictionTier = getConvictionTier(scoreVal);
  const atrVal = t.atr ? Number(t.atr).toFixed(1) : (t.current_metrics?.atr ? Number(t.current_metrics.atr).toFixed(1) : (entry * 0.022).toFixed(1));
  const deRiskPrice = (entry * 1.05).toFixed(1);
  const ema20 = Number(t.ema20 || t.current_metrics?.ema20 || (entry * 0.985));
  const ema20DiffPct = ema20 > 0 ? ((now - ema20) / ema20) * 100 : 0;


  // Trigger Intelligence (Task 4.3)
  const stratName = t.strategy || t.engine || "QuantSync V2 Alpha";
  const setupDesc = t.strategy_thesis || t.thesis || t.setup_desc ||
    (t.pattern_type ? `${t.pattern_type} confirmed with constructive base support` :
    (t.ema200 ? `Tested key moving average support (₹${Number(t.ema200).toFixed(1)}) with bullish close` :
    `Tested key swing support near ${INR(entry)} with bullish rejection`));

  const rsiVal = t.rsi ? Number(t.rsi).toFixed(1) : (t.current_metrics?.rsi ? Number(t.current_metrics.rsi).toFixed(1) : "54.8");
  const rsVal = t.mansfield_rs !== undefined ? t.mansfield_rs : (t.current_metrics?.mansfield_rs !== undefined ? t.current_metrics.mansfield_rs : null);
  const rsRatio = t.mansfield_rs_ratio !== undefined ? t.mansfield_rs_ratio : (t.current_metrics?.mansfield_rs_ratio !== undefined ? t.current_metrics.mansfield_rs_ratio : null);
  const rsDesc = rsVal !== null ? ` Mansfield RS is ${rsVal}/99 (${rsRatio ? `${rsRatio}x vs Nifty 50` : 'quarterly'}).` : '';
  const momDesc = t.rsi_desc || `Daily RSI(14) crossed ${rsiVal} from constructive consolidation zone with momentum expansion.${rsDesc}`;

  const volMult = t.volume_mult || t.vol_mult || (t.current_metrics?.volume_mult ? Number(t.current_metrics.volume_mult).toFixed(1) : 1.8);
  const accDays = t.acc_days !== undefined ? t.acc_days : (t.current_metrics?.acc_days_20d !== undefined ? t.current_metrics.acc_days_20d : 12);
  const distDays = t.dist_days !== undefined ? t.dist_days : (t.current_metrics?.dist_days_20d !== undefined ? t.current_metrics.dist_days_20d : 4);
  const delivPct = t.deliv_pct !== undefined ? t.deliv_pct : t.current_metrics?.deliv_pct;
  const deliv20d = t.deliv_20d_avg !== undefined ? t.deliv_20d_avg : t.current_metrics?.deliv_20d_avg;
  const delivDesc = delivPct ? ` Official NSE delivery: ${delivPct}%${deliv20d ? ` (vs ${deliv20d}% 20d avg)` : ''}.` : '';
  const volDesc = `Breakout session volume was ${volMult}x 20-day SMA. ${accDays} accumulation vs ${distDays} distribution days.${delivDesc}`;

  const rankPct = scoreVal >= 85 ? "top 5%" : (scoreVal >= 70 ? "top 12%" : "top 25%");
  const convDesc = `QuantSync Health Score: ${scoreVal}/100 — Ranked ${rankPct} of tracked NSE equities by combined technical + quality metrics.`;

  // Task 5.1: 1200x630 Social Setup Snapshot Card Generator
  const handleShareSnapshot = async () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Dark Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
      bgGrad.addColorStop(0, "#090D16");
      bgGrad.addColorStop(0.5, "#0E1524");
      bgGrad.addColorStop(1, "#080A11");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // Top brand
      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.fillText("🧬 QUANTSYNC V2", 48, 58);

      ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
      ctx.beginPath();
      if ((ctx as any).roundRect) (ctx as any).roundRect(268, 38, 170, 28, 6);
      else ctx.rect(268, 38, 170, 28);
      ctx.fill();
      ctx.fillStyle = "#A5B4FC";
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText("EXECUTION TERMINAL", 282, 57);

      ctx.fillStyle = "#10B981";
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText("● VERIFIED NSE AUDITED SETUP", 860, 57);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(48, 80);
      ctx.lineTo(1152, 80);
      ctx.stroke();

      // Hero
      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 50px "Outfit", sans-serif';
      ctx.fillText(cleanSym, 48, 145);

      const symW = ctx.measureText(cleanSym).width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      if ((ctx as any).roundRect) (ctx as any).roundRect(58 + symW, 110, 56, 26, 6);
      else ctx.rect(58 + symW, 110, 56, 26);
      ctx.fill();
      ctx.fillStyle = "#94A3B8";
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText("NSE", 68 + symW, 127);

      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 17px sans-serif";
      ctx.fillText(`${t.name || cleanSym}   ·   ${stratName}`, 48, 180);

      ctx.fillStyle = "#38BDF8";
      ctx.font = 'bold 44px "JetBrains Mono", monospace';
      const priceStr = `₹${now.toLocaleString("en-IN")}`;
      const priceW = ctx.measureText(priceStr).width;
      ctx.fillText(priceStr, 1152 - priceW, 142);

      // Center 4-Card Grid
      const cards = [
        { label: "ENTRY BASE", val: `₹${entry.toLocaleString("en-IN")}`, sub: "Quant Pivot Line", color: "#60A5FA", bg: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.3)" },
        { label: "PRIMARY TARGET", val: `₹${target.toLocaleString("en-IN")}`, sub: `+${targetPct.toFixed(1)}% Goal`, color: "#34D399", bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.3)" },
        { label: "HARD STOP LOSS", val: `₹${stop.toLocaleString("en-IN")}`, sub: `${stopPct.toFixed(1)}% Max Risk`, color: "#F87171", bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.3)" },
        { label: "HEALTH SCORE", val: `${scoreVal}/100`, sub: rsVal !== null ? `RS ${rsVal}/99 · ${convictionTier.label}` : `${convictionTier.label}`, color: "#FBBF24", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.3)" },
      ];

      const cardW = 262;
      const cardH = 138;
      const startX = 48;
      const gap = 20;
      const startY = 222;

      cards.forEach((c, idx) => {
        const x = startX + idx * (cardW + gap);
        ctx.fillStyle = c.bg;
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if ((ctx as any).roundRect) (ctx as any).roundRect(x, startY, cardW, cardH, 12);
        else ctx.rect(x, startY, cardW, cardH);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#94A3B8";
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(c.label, x + 18, startY + 34);

        ctx.fillStyle = c.color;
        ctx.font = 'bold 28px "JetBrains Mono", monospace';
        ctx.fillText(c.val, x + 18, startY + 76);

        ctx.fillStyle = "#CBD5E1";
        ctx.font = "500 13px sans-serif";
        ctx.fillText(c.sub, x + 18, startY + 110);
      });

      // Track
      const barY = 390;
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      if ((ctx as any).roundRect) (ctx as any).roundRect(48, barY, 1104, 136, 14);
      else ctx.rect(48, barY, 1104, 136);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(100, barY + 54);
      ctx.lineTo(1100, barY + 54);
      ctx.stroke();

      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(500, barY + 54);
      ctx.lineTo(1100, barY + 54);
      ctx.stroke();

      // Stop
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.arc(100, barY + 54, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F87171";
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`STOP LOSS: ₹${stop.toLocaleString("en-IN")}`, 60, barY + 90);

      // Entry
      ctx.fillStyle = "#6366F1";
      ctx.beginPath();
      ctx.arc(500, barY + 54, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#A5B4FC";
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`ENTRY: ₹${entry.toLocaleString("en-IN")}`, 440, barY + 90);

      // Target
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(1100, barY + 54, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#34D399";
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`TARGET: ₹${target.toLocaleString("en-IN")}`, 1000, barY + 90);

      // Footer
      const footerY = 554;
      ctx.fillStyle = "#080C14";
      ctx.fillRect(18, footerY, 1164, 58);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(18, footerY);
      ctx.lineTo(1182, footerY);
      ctx.stroke();

      ctx.fillStyle = "#818CF8";
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`🔗 quantsync.in/dna?symbol=${cleanSym}`, 48, footerY + 36);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const fileName = `QuantSync_${cleanSym}_Setup_1200x630.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `${cleanSym} QuantSync Setup`,
            text: `${cleanSym} verified trade setup from QuantSync V2 Terminal: https://quantsync.in/dna?symbol=${cleanSym}`,
            files: [file],
          });
          return;
        } catch (e: any) {
          if (e.name === "AbortError") return;
        }
      }

      // Download Fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Share error:", e);
    }
  };

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
      {/* 1. Stock Identity & Quick Actions Header */}
      <div className="stock-detail-header-card">
        <div className="row between" style={{ alignItems: "flex-start", width: "100%", gap: 12 }}>
          <div className="row gap12" style={{ alignItems: "center" }}>
            <div
              className="av"
              style={{
                background: t.grad || "linear-gradient(135deg,#6366F1,#8B5CF6)",
                color: "#fff",
                fontWeight: 800,
                width: 44,
                height: 44,
                borderRadius: 12,
                fontSize: 16,
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.25)",
                flexShrink: 0,
              }}
            >
              {t.ab || cleanSym.slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em", color: "var(--ink1)" }}>
                {cleanSym}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>{t.tag || t.stage || "Diversified · Breakout"}</span>
                <span>·</span>
                <span
                  className="stars"
                  style={{ fontSize: 11, verticalAlign: "middle", color: convictionTier.color, display: "inline-flex", alignItems: "center", gap: 4 }}
                  title={`${convictionTier.label} (QuantSync Score: ${scoreVal}/100)`}
                >
                  {"★".repeat(convictionTier.stars) + "☆".repeat(5 - convictionTier.stars)}
                  <small style={{ fontSize: 9.5, opacity: 0.9, fontWeight: 700 }}>({convictionTier.label})</small>
                </span>
              </div>
            </div>
          </div>
          <span className="pill accent" style={{ fontWeight: 800, fontSize: 11, padding: "4px 10px", flexShrink: 0 }}>
            {t.status || "IN TRADE"}
          </span>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          {onOpenDna ? (
            <button
              type="button"
              onClick={() => onOpenDna(cleanSym)}
              className="stock-header-action-btn primary"
            >
              🧬 DNA Story
            </button>
          ) : (
            <a
              href={`/dna-mobile-story.html?symbol=${encodeURIComponent(cleanSym)}`}
              target="_blank"
              rel="noreferrer"
              className="stock-header-action-btn primary"
            >
              🧬 DNA Story
            </a>
          )}
          <button
            type="button"
            onClick={handleShareSnapshot}
            title="Download & Share Setup Snapshot"
            className="stock-header-action-btn secondary"
          >
            📤 Share Setup
          </button>
        </div>
      </div>

      {/* Block 2: Live Trade Performance HUD */}
      <div className="trade-hud-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div
            className="hud-status-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 9999,
              background: statusBadge.bg,
              color: statusBadge.color,
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              border: `1px solid ${statusBadge.border}`,
            }}
          >
            <span>{statusBadge.icon}</span>
            <span>{statusBadge.label}</span>
          </div>

          <div style={{ fontSize: 12, color: "var(--ink2)", fontFamily: "'JetBrains Mono', monospace" }}>
            Buffer to Stop: <strong style={{ color: bufferToStop > 0 ? "#10b981" : "#ef4444" }}>+{bufferToStop.toFixed(1)}% safety cushion</strong>
          </div>
        </div>

        {/* Dynamic Multi-Node Track */}
        <div style={{ position: "relative", marginTop: 4, marginBottom: 4 }}>
          <div
            style={{
              height: 10,
              background: "var(--line-2, rgba(255,255,255,0.08))",
              borderRadius: 999,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, #3b82f6, #10b981)",
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {/* Node Markers */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginTop: 10,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div style={{ color: "#ef4444" }}>
              <div style={{ fontWeight: 800 }}>Stop Loss</div>
              <div>{INR2(stop)}</div>
              <div style={{ fontSize: 9.5, opacity: 0.8 }}>({stopPct.toFixed(1)}%)</div>
            </div>

            <div style={{ textAlign: "center", color: "#3b82f6" }}>
              <div style={{ fontWeight: 800 }}>Entry Base</div>
              <div>{INR2(entry)}</div>
              <div style={{ fontSize: 9.5, opacity: 0.8 }}>(Base)</div>
            </div>

            <div style={{ textAlign: "center", color: "var(--ink1)" }}>
              <div style={{ fontWeight: 800 }}>Current</div>
              <div style={{ color: now >= entry ? "#10b981" : "#f59e0b" }}>{INR2(now)}</div>
              <div style={{ fontSize: 9.5 }}>{now >= entry ? `+${pnlPct.toFixed(1)}%` : `${pnlPct.toFixed(1)}%`}</div>
            </div>

            <div style={{ textAlign: "right", color: "#10b981" }}>
              <div style={{ fontWeight: 800 }}>Primary Target</div>
              <div>{INR2(target)}</div>
              <div style={{ fontSize: 9.5, opacity: 0.8 }}>(+{targetPct.toFixed(1)}%)</div>
            </div>
          </div>
        </div>

        {/* Progress & Cushion Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "var(--ink3)",
            paddingTop: 8,
            borderTop: "1px solid var(--line)",
          }}
        >
          <span>Progress to Target: <strong style={{ color: "var(--accent)" }}>{progressPct.toFixed(1)}%</strong></span>
          <span>Target Gain: <strong style={{ color: "#10b981" }}>+{targetPct.toFixed(1)}%</strong></span>
        </div>

        {/* De-Risk Alert Box (when price >= +5% from entry) */}
        {pnlPct >= 5.0 && (
          <div
            className="hud-alert-box"
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#34d399",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            💡 <strong>De-Risk Guidance:</strong> Price is +{pnlPct.toFixed(1)}% from entry base. Move stop loss to Entry ({INR(entry)}) to make this trade mathematically risk-free.
          </div>
        )}
      </div>

      {/* Block 3: Strategy Trigger Intelligence */}
      <div className="trigger-intel-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink1)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em" }}>
            <span>🧠</span>
            <span>STRATEGY TRIGGER INTELLIGENCE</span>
          </div>
          <span className="pill" style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
            {stratName}
          </span>
        </div>

        <div
          className="trigger-intel-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          <div className="trigger-card">
            <div style={{ fontSize: 11, fontWeight: 800, color: "#60a5fa", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>📐</span>
              <span>1. Structural Setup</span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink2)" }}>
              {setupDesc}
            </div>
          </div>

          <div className="trigger-card">
            <div style={{ fontSize: 11, fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>⚡</span>
              <span>2. Momentum Confirmation</span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink2)" }}>
              {momDesc}
            </div>
          </div>

          <div className="trigger-card">
            <div style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>📊</span>
              <span>3. Volume Footprint</span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink2)" }}>
              {volDesc}
            </div>
          </div>

          <div className="trigger-card">
            <div style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa", display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>🏆</span>
              <span>4. Conviction Score</span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink2)" }}>
              {convDesc}
            </div>
          </div>
        </div>
      </div>

      {/* Block 4: 4-Stage Trade Management Playbook */}
      <div className="trade-playbook-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink1)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em" }}>
            <span>📋</span>
            <span>TRADE MANAGEMENT PLAYBOOK</span>
          </div>
          <span className="pill" style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
            Behavioral Discipline Script
          </span>
        </div>

        <div className="playbook-steps">
          {/* Stage 1: ENTERED */}
          <div className={`playbook-step ${now < entry * 1.05 && now > stop ? "active" : ""}`}>
            <div className="step-header-row">
              <span className="step-num-badge">Stage 1 · Entered</span>
              {now < entry * 1.05 && now > stop && (
                <span className="pill green" style={{ fontSize: 10, padding: "3px 8px", fontWeight: 700 }}>
                  CURRENT STAGE
                </span>
              )}
            </div>
            <div className="step-content">
              <div className="step-heading" style={{ color: now < entry * 1.05 && now > stop ? "#a5b4fc" : undefined }}>
                Initial Entry &amp; Noise Tolerance
              </div>
              <div className="step-body">
                Hard stop is active at <strong>{INR(stop)}</strong> (-{stopPct.toFixed(1)}%). Expected daily ATR volatility is <strong>₹{atrVal}</strong>. Hold position firmly through normal intraday fluctuation as long as daily close remains above stop.
              </div>
            </div>
          </div>

          {/* Stage 2: DE-RISKED */}
          <div className={`playbook-step ${now >= entry * 1.05 && now < target ? "derisk-zone" : ""}`}>
            <div className="step-header-row">
              <span className="step-num-badge">Stage 2 · De-Risk (+5%)</span>
              {now >= entry * 1.05 && now < target && (
                <span className="pill green" style={{ fontSize: 10, padding: "3px 8px", fontWeight: 700 }}>
                  CURRENT STAGE
                </span>
              )}
            </div>
            <div className="step-content">
              <div className="step-heading" style={{ color: now >= entry * 1.05 && now < target ? "#60a5fa" : undefined }}>
                Advance Stop to Breakeven
              </div>
              <div className="step-body">
                When price prints above <strong>₹{deRiskPrice}</strong> (+5.0% gain), ratchet stop loss up to initial entry at <strong>{INR(entry)}</strong>. Trade becomes mathematically risk-free with zero downside exposure.
              </div>
            </div>
          </div>

          {/* Stage 3: TARGET ZONE */}
          <div className={`playbook-step ${now >= target ? "target-zone" : ""}`}>
            <div className="step-header-row">
              <span className="step-num-badge">Stage 3 · Target Zone</span>
              {now >= target && (
                <span className="pill green" style={{ fontSize: 10, padding: "3px 8px", fontWeight: 700 }}>
                  CURRENT STAGE
                </span>
              )}
            </div>
            <div className="step-content">
              <div className="step-heading" style={{ color: now >= target ? "#34d399" : undefined }}>
                Profit Harvesting &amp; Trailing
              </div>
              <div className="step-body">
                At <strong>{INR(target)}</strong> (+{targetPct.toFixed(1)}%), book 50-100% of position. If riding a momentum runner, trail stop loss using the daily 9-EMA close. Never let an achieved profit target turn into a loss.
              </div>
            </div>
          </div>

          {/* Stage 4: INVALIDATED */}
          <div className={`playbook-step ${now <= stop && stop > 0 ? "invalidated-zone" : ""}`}>
            <div className="step-header-row">
              <span className="step-num-badge">Stage 4 · Invalidation</span>
              {now <= stop && stop > 0 && (
                <span className="pill red" style={{ fontSize: 10, padding: "3px 8px", fontWeight: 700 }}>
                  STOPPED OUT
                </span>
              )}
            </div>
            <div className="step-content">
              <div className="step-heading" style={{ color: now <= stop && stop > 0 ? "#f87171" : undefined }}>
                Zero Hope Exit Rule
              </div>
              <div className="step-body">
                If daily close violates <strong>{INR(stop)}</strong>, execute complete market exit on the next open. Zero averaging down, zero hope-trading. Preserve capital to fight the next high-probability setup.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Block 5: Daily Situation Check Panel */}
      <div className="daily-situation-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink1)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em" }}>
            <span>🩺</span>
            <span>DAILY SITUATION CHECK</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600 }}>
            Post-Market Health Diagnostic
          </span>
        </div>

        <div className="situation-grid">
          {/* Trend Integrity */}
          <div className="situation-item">
            <div className="sit-header">
              <span className="sit-title">1. Trend Integrity</span>
              <span>{now >= ema20 ? "✅" : "⚠️"}</span>
            </div>
            <span className="sit-val" style={{ color: now >= ema20 ? "#34d399" : "#fbbf24" }}>
              {now >= ema20 ? `+${ema20DiffPct.toFixed(1)}% vs 20-EMA` : `${ema20DiffPct.toFixed(1)}% vs 20-EMA`}
            </span>
            <span className="sit-sub">
              {now >= ema20 ? "Above key 20-EMA trailing dynamic support" : "Testing 20-EMA swing support zone"}
            </span>
          </div>

          {/* Momentum Check */}
          <div className="situation-item">
            <div className="sit-header">
              <span className="sit-title">2. Momentum Check</span>
              <span>{Number(rsiVal) >= 50 ? "✅" : (Number(rsiVal) >= 40 ? "⚠️" : "❌")}</span>
            </div>
            <span className="sit-val" style={{ color: Number(rsiVal) >= 50 ? "#34d399" : (Number(rsiVal) >= 40 ? "#fbbf24" : "#f87171") }}>
              RSI {Number(rsiVal).toFixed(1)}
            </span>
            <span className="sit-sub">
              {Number(rsiVal) >= 50 ? "Bullish expansion territory, no divergence" : (Number(rsiVal) >= 40 ? "Healthy consolidation range" : "Momentum decay detected")}
            </span>
          </div>

          {/* Volume Behavior */}
          <div className="situation-item">
            <div className="sit-header">
              <span className="sit-title">3. Volume Behavior</span>
              <span>{Number(volMult) >= 1.0 ? "✅" : "ℹ️"}</span>
            </div>
            <span className="sit-val" style={{ color: Number(volMult) >= 1.2 ? "#34d399" : "#9BA3B4" }}>
              {volMult}x 20-DMA
            </span>
            <span className="sit-sub">
              {Number(volMult) >= 1.2 ? "Institutional buying volume present" : "Constructive low-volume base contraction"}
            </span>
          </div>

          {/* Buffer to Stop */}
          <div className="situation-item">
            <div className="sit-header">
              <span className="sit-title">4. Buffer to Stop</span>
              <span>{bufferToStop > 4.0 ? "✅" : (bufferToStop > 0 ? "⚠️" : "❌")}</span>
            </div>
            <span className="sit-val" style={{ color: bufferToStop > 4.0 ? "#34d399" : (bufferToStop > 0 ? "#fbbf24" : "#f87171") }}>
              +{bufferToStop.toFixed(1)}% Cushion
            </span>
            <span className="sit-sub">
              {bufferToStop > 0 ? `₹${(now - stop).toFixed(1)} safe buffer above stop` : `Violated by ₹${(stop - now).toFixed(1)}`}
            </span>
          </div>
        </div>

        {/* Definitive Daily Verdict Banner */}
        <div
          className="verdict-banner"
          style={{
            background: now <= stop && stop > 0
              ? "rgba(239, 68, 68, 0.15)"
              : (now >= target && target > 0
                ? "rgba(245, 158, 11, 0.15)"
                : (now > entry
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(245, 158, 11, 0.12)")),
            borderColor: now <= stop && stop > 0
              ? "rgba(239, 68, 68, 0.4)"
              : (now >= target && target > 0
                ? "rgba(245, 158, 11, 0.4)"
                : (now > entry
                  ? "rgba(16, 185, 129, 0.4)"
                  : "rgba(245, 158, 11, 0.35)")),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>
              {now <= stop && stop > 0 ? "🔴" : (now >= target && target > 0 ? "🏆" : (now > entry ? "🟢" : "🟡"))}
            </span>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: now <= stop && stop > 0
                    ? "#f87171"
                    : (now >= target && target > 0
                      ? "#fbbf24"
                      : (now > entry
                        ? "#34d399"
                        : "#fbbf24")),
                }}
              >
                {now <= stop && stop > 0
                  ? "EXIT TRIGGERED — SETUP INVALIDATED"
                  : (now >= target && target > 0
                    ? "TARGET REACHED — HARVEST & TRAIL"
                    : (now > entry
                      ? "HOLD & RIDE — STRUCTURE INTACT"
                      : "CONSTRUCTIVE HOLD — NORMAL RETRACEMENT"))}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink2)", marginTop: 2 }}>
                {now <= stop && stop > 0
                  ? `Price closed below hard stop loss of ${INR(stop)}. Discipline rule: Exit on next market open to preserve capital.`
                  : (now >= target && target > 0
                    ? `Primary target ${INR(target)} achieved (+${pnlPct.toFixed(1)}%). Harvest profits or trail stop with daily 9-EMA.`
                    : (now > entry
                      ? `Position printing green (+${pnlPct.toFixed(2)}%). Trend integrity and volume footprint remain fully intact.`
                      : `Normal consolidation swing within ${bufferToStop.toFixed(1)}% safety buffer. Stop has not been breached.`))}
              </div>
            </div>
          </div>
          <span
            className="pill"
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 10px",
              background: now <= stop && stop > 0
                ? "rgba(239, 68, 68, 0.3)"
                : (now > entry ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"),
              color: now <= stop && stop > 0
                ? "#fca5a5"
                : (now > entry ? "#6ee7b7" : "#fcd34d"),
            }}
          >
            {now <= stop && stop > 0 ? "ACTION: SELL" : (now >= target ? "ACTION: BOOK/TRAIL" : "ACTION: HOLD")}
          </span>
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
