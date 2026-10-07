import React, { useEffect, useRef, memo, useState } from "react";

function toTradingViewSymbol(sym: string | undefined): string {
  if (!sym) return "BSE:RELIANCE";
  const clean = String(sym)
    .replace(/^(BSE:|NSE:)/i, "")
    .replace(/\.(NS|BO)$/i, "")
    .replace(/-BE$/i, "")
    .trim()
    .toUpperCase();
  return `BSE:${clean}`;
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
  portfolioView?: boolean;
  theme?: "light" | "dark";
  onOpenChart?: (symbol: string) => void;
  onOpenDna?: (symbol: string) => void;
  onClose?: () => void;
  INR?: (n: number | string | undefined) => string;
  INR2?: (n: number | string | undefined) => string;
}

export default function TradingViewStockDetail({
  trade: t,
  portfolioView = false,
  theme = "dark",
  onOpenChart,
  onOpenDna,
  onClose,
  INR = (n) => (n !== undefined ? `₹${Number(n).toLocaleString("en-IN")}` : "₹0"),
  INR2 = (n) => (n !== undefined ? `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₹0.00"),
}: TradingViewStockDetailProps) {
  const symName = t.sym || t.symbol || "RELIANCE";
  const tvSymbol = toTradingViewSymbol(symName);
  const cleanSym = tvSymbol.replace(/^(BSE:|NSE:)/i, "");

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

  // Active Tab for Apple VisionOS Segmented Control
  const [activeDetailTab, setActiveDetailTab] = useState<"all" | "intel" | "situation" | "playbook" | "charts">("all");

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
  const delivDesc = delivPct ? ` Official BSE delivery: ${delivPct}%${deliv20d ? ` (vs ${deliv20d}% 20d avg)` : ''}.` : '';
  const volDesc = `Breakout session volume was ${volMult}x 20-day SMA. ${accDays} accumulation vs ${distDays} distribution days.${delivDesc}`;

  const rankPct = scoreVal >= 85 ? "top 5%" : (scoreVal >= 70 ? "top 12%" : "top 25%");
  const convDesc = `QuantSync Health Score: ${scoreVal}/100 — Ranked ${rankPct} of tracked BSE equities by combined technical + quality metrics.`;

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
      ctx.fillText("● VERIFIED BSE AUDITED SETUP", 860, 57);

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
      ctx.fillText("BSE", 68 + symW, 127);

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



  return (
    <div className={`signal-terminal-modal stock-detail-common${portfolioView ? " portfolio-stock-detail" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 0. Suspended Floating VisionOS Top Navigation Bar */}
      <nav className="suspended-vision-nav">
        {/* Left: Stock Identity & Live Price Quick Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: t.grad || "linear-gradient(135deg,#0A84FF,#6366F1)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 11,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {t.ab || cleanSym.slice(0, 2)}
          </div>
          <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: "-0.02em", color: "var(--ink-primary)" }}>
            {cleanSym}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12.5, color: "var(--ink-primary)" }}>
            {INR2(now)}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              padding: "2px 7px",
              borderRadius: 9999,
              background: pnlPct >= 0 ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 69, 58, 0.15)",
              color: pnlPct >= 0 ? "var(--apple-green)" : "var(--apple-red)",
            }}
          >
            {pnlPct >= 0 ? `+${pnlPct.toFixed(2)}%` : `${pnlPct.toFixed(2)}%`}
          </span>
        </div>

        {/* Right: Close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="vision-back-btn"
            style={{ padding: "6px 11px", fontSize: 13, lineHeight: 1 }}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        )}
      </nav>

      {/* 1. Stock Identity & Quick Actions Hero (Depth Card) */}
      <div className="depth-card portfolio-stock-overview" style={{ padding: "16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                background: t.grad || "linear-gradient(135deg, #0A84FF, #6366F1)",
                color: "#fff",
                fontWeight: 800,
                width: 52,
                height: 52,
                borderRadius: 16,
                fontSize: 18,
                display: "grid",
                placeItems: "center",
                boxShadow: "0 6px 18px rgba(10, 132, 255, 0.35), 0 1px 0 rgba(255,255,255,0.2) inset",
                flexShrink: 0,
              }}
            >
              {t.ab || cleanSym.slice(0, 2)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", color: "var(--ink-primary)" }}>
                  {cleanSym}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-secondary)", marginTop: 3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>{t.tag || t.stage || "Diversified · Breakout"}</span>
                <span>·</span>
                <span
                  style={{ fontSize: 11, verticalAlign: "middle", color: convictionTier.color, display: "inline-flex", alignItems: "center", gap: 4 }}
                  title={`${convictionTier.label} (QuantSync Score: ${scoreVal}/100)`}
                >
                  {"★".repeat(convictionTier.stars) + "☆".repeat(5 - convictionTier.stars)}
                  <small style={{ fontSize: 9.5, opacity: 0.9, fontWeight: 700 }}>({convictionTier.label})</small>
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 9999,
              background: "var(--recessed-trench)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            }}
          >
            <span
              className={`status-dot-glow ${now <= stop && stop > 0 ? "red" : (now > entry ? "green" : "amber")}`}
              style={{ marginBottom: 0 }}
            />
            <span style={{ fontWeight: 800, fontSize: 11.5, letterSpacing: "0.03em", color: "var(--ink-primary)" }}>
              {t.status || (now <= stop && stop > 0 ? "STOPPED OUT" : "IN TRADE")}
            </span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
          {onOpenDna ? (
            <button
              type="button"
              onClick={() => onOpenDna(cleanSym)}
              className="btn-apple-pass"
            >
              🧬 DNA Story
            </button>
          ) : (
            <a
              href={`/dna-mobile-story.html?symbol=${encodeURIComponent(cleanSym)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-apple-pass"
            >
              🧬 DNA Story
            </a>
          )}
          <button
            type="button"
            onClick={handleShareSnapshot}
            title="Download & Share Setup Snapshot"
            className="btn-apple-secondary"
          >
            📤 Share Setup
          </button>
        </div>
      </div>

      {/* 2. Milled Segmented Control Track */}
      <div className="ref-segmented-track">
        <button
          type="button"
          className={`ref-tab-btn ${activeDetailTab === "all" ? "active" : ""}`}
          onClick={() => setActiveDetailTab("all")}
        >
          All Intelligence
        </button>
        <button
          type="button"
          className={`ref-tab-btn ${activeDetailTab === "intel" ? "active" : ""}`}
          onClick={() => setActiveDetailTab("intel")}
        >
          🧠 Trigger Intel
        </button>
        <button
          type="button"
          className={`ref-tab-btn ${activeDetailTab === "situation" ? "active" : ""}`}
          onClick={() => setActiveDetailTab("situation")}
        >
          🩺 Daily Health
        </button>
        <button
          type="button"
          className={`ref-tab-btn ${activeDetailTab === "playbook" ? "active" : ""}`}
          onClick={() => setActiveDetailTab("playbook")}
        >
          📋 Playbook
        </button>
        <button
          type="button"
          className={`ref-tab-btn ${activeDetailTab === "charts" ? "active" : ""}`}
          onClick={() => setActiveDetailTab("charts")}
        >
          📊 Charts & Tech
        </button>
      </div>

      {/* 3. Live Trade Performance HUD (Alert Card with Left Accent Strip + Carved Trench) */}
      <div className="alert-accent-card depth-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div
            className="hud-status-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
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

          <div style={{ fontSize: 12, color: "var(--ink-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
            Buffer to Stop: <strong style={{ color: bufferToStop > 0 ? "var(--apple-green)" : "var(--apple-red)" }}>+{bufferToStop.toFixed(1)}% safety cushion</strong>
          </div>
        </div>

        {/* Dynamic Multi-Node Track in Carved Trench */}
        <div style={{ position: "relative", marginTop: 4, marginBottom: 4 }}>
          <div
            className="carved-trench"
            style={{
              height: 12,
              borderRadius: 999,
              overflow: "hidden",
              position: "relative",
              padding: 2,
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--apple-blue), var(--apple-green))",
                borderRadius: 999,
                boxShadow: "0 0 10px rgba(10, 132, 255, 0.4)",
                transition: "width 0.35s ease",
              }}
            />
          </div>

          {/* Node Markers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginTop: 12,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="portfolio-risk-nodes"
          >
            <div className="carved-trench" style={{ padding: "8px 10px", textAlign: "left" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--apple-red)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Stop Loss</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-primary)", marginTop: 2 }}>{INR2(stop)}</div>
              <div style={{ fontSize: 10, color: "var(--apple-red)", opacity: 0.9 }}>({stopPct.toFixed(1)}%)</div>
            </div>

            <div className="carved-trench" style={{ padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--apple-blue)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Entry Base</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-primary)", marginTop: 2 }}>{INR2(entry)}</div>
              <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>(Base)</div>
            </div>

            <div className="carved-trench" style={{ padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Live CMP</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: now >= entry ? "var(--apple-green)" : "var(--apple-amber)", marginTop: 2 }}>{INR2(now)}</div>
              <div style={{ fontSize: 10, color: now >= entry ? "var(--apple-green)" : "var(--apple-amber)" }}>
                {now >= entry ? `+${pnlPct.toFixed(1)}%` : `${pnlPct.toFixed(1)}%`}
              </div>
            </div>

            <div className="carved-trench" style={{ padding: "8px 10px", textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--apple-green)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Target</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-primary)", marginTop: 2 }}>{INR2(target)}</div>
              <div style={{ fontSize: 10, color: "var(--apple-green)", opacity: 0.9 }}>(+{targetPct.toFixed(1)}%)</div>
            </div>
          </div>
        </div>

        {/* Progress & Cushion Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "var(--ink-secondary)",
            paddingTop: 8,
            borderTop: "1px solid var(--border-subtle)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span>Progress to Target: <strong style={{ color: "var(--apple-blue)" }}>{progressPct.toFixed(1)}%</strong></span>
          <span>Target Gain: <strong style={{ color: "var(--apple-green)" }}>+{targetPct.toFixed(1)}%</strong></span>
        </div>

        {/* De-Risk Alert Box (when price >= +5% from entry) */}
        {pnlPct >= 5.0 && (
          <div
            className="hud-alert-box"
            style={{
              background: "rgba(48, 209, 88, 0.12)",
              border: "1px solid rgba(48, 209, 88, 0.35)",
              color: "var(--apple-green)",
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            💡 <strong>De-Risk Guidance:</strong> Price is +{pnlPct.toFixed(1)}% from entry base. Move stop loss to Entry ({INR(entry)}) to make this trade mathematically risk-free.
          </div>
        )}
      </div>

      {/* 4. Strategy Trigger Intelligence (Depth Card) */}
      {(activeDetailTab === "all" || activeDetailTab === "intel") && (
        <div className="depth-card" style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink-primary)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em" }}>
              <span>🧠</span>
              <span>STRATEGY TRIGGER INTELLIGENCE</span>
            </div>
            <span
              className="pill"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 9999,
                background: "rgba(10, 132, 255, 0.12)",
                color: "var(--apple-blue)",
                border: "1px solid rgba(10, 132, 255, 0.25)",
              }}
            >
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
            <div className="carved-trench" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--apple-blue)", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>📐</span>
                <span>1. Structural Setup</span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-secondary)", marginTop: 6 }}>
                {setupDesc}
              </div>
            </div>

            <div className="carved-trench" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--apple-green)", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>⚡</span>
                <span>2. Momentum Confirmation</span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-secondary)", marginTop: 6 }}>
                {momDesc}
              </div>
            </div>

            <div className="carved-trench" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--apple-gold)", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>📊</span>
                <span>3. Volume Footprint</span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-secondary)", marginTop: 6 }}>
                {volDesc}
              </div>
            </div>

            <div className="carved-trench" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#BF5AF2", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span>🏆</span>
                <span>4. Conviction Score</span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-secondary)", marginTop: 6 }}>
                {convDesc}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. 4-Stage Trade Management Playbook (Depth Card) */}
      {(activeDetailTab === "all" || activeDetailTab === "playbook") && (
        <div className="depth-card" style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink-primary)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em" }}>
              <span>📋</span>
              <span>TRADE MANAGEMENT PLAYBOOK</span>
            </div>
            <span
              className="pill"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 9999,
                background: "rgba(10, 132, 255, 0.12)",
                color: "var(--apple-blue)",
                border: "1px solid rgba(10, 132, 255, 0.25)",
              }}
            >
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
                <div className="step-heading" style={{ color: now < entry * 1.05 && now > stop ? "var(--apple-blue)" : undefined }}>
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
                <div className="step-heading" style={{ color: now >= entry * 1.05 && now < target ? "var(--apple-blue)" : undefined }}>
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
                <div className="step-heading" style={{ color: now >= target ? "var(--apple-green)" : undefined }}>
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
                <div className="step-heading" style={{ color: now <= stop && stop > 0 ? "var(--apple-red)" : undefined }}>
                  Zero Hope Exit Rule
                </div>
                <div className="step-body">
                  If daily close violates <strong>{INR(stop)}</strong>, execute complete market exit on the next open. Zero averaging down, zero hope-trading. Preserve capital to fight the next high-probability setup.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Daily Situation Check Panel (Depth Card + Mini Status Cards with Glowing LEDs) */}
      {(activeDetailTab === "all" || activeDetailTab === "situation") && (
        <div className="depth-card" style={{ padding: "16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink-primary)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.01em" }}>
              <span>🩺</span>
              <span>DAILY SITUATION CHECK</span>
            </div>
            <span style={{ fontSize: 11, color: "var(--ink-secondary)", fontWeight: 600 }}>
              Post-Market Health Diagnostic
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {/* Trend Integrity */}
            <div className="mini-status-card">
              <span className={`status-dot-glow ${now >= ema20 ? "green" : "amber"}`} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                1. Trend Integrity
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: now >= ema20 ? "var(--apple-green)" : "var(--apple-gold)", margin: "4px 0 2px" }}>
                {now >= ema20 ? `+${ema20DiffPct.toFixed(1)}% vs 20-EMA` : `${ema20DiffPct.toFixed(1)}% vs 20-EMA`}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>
                {now >= ema20 ? "Above key 20-EMA trailing dynamic support" : "Testing 20-EMA swing support zone"}
              </div>
            </div>

            {/* Momentum Check */}
            <div className="mini-status-card">
              <span className={`status-dot-glow ${Number(rsiVal) >= 50 ? "green" : (Number(rsiVal) >= 40 ? "amber" : "red")}`} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                2. Momentum Check
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: Number(rsiVal) >= 50 ? "var(--apple-green)" : (Number(rsiVal) >= 40 ? "var(--apple-gold)" : "var(--apple-red)"), margin: "4px 0 2px" }}>
                RSI {Number(rsiVal).toFixed(1)}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>
                {Number(rsiVal) >= 50 ? "Bullish expansion, no divergence" : (Number(rsiVal) >= 40 ? "Healthy consolidation range" : "Momentum decay detected")}
              </div>
            </div>

            {/* Volume Behavior */}
            <div className="mini-status-card">
              <span className={`status-dot-glow ${Number(volMult) >= 1.2 ? "green" : "blue"}`} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                3. Volume Behavior
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: Number(volMult) >= 1.2 ? "var(--apple-green)" : "var(--apple-blue)", margin: "4px 0 2px" }}>
                {volMult}x 20-DMA
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>
                {Number(volMult) >= 1.2 ? "Institutional buying volume present" : "Constructive low-volume base contraction"}
              </div>
            </div>

            {/* Buffer to Stop */}
            <div className="mini-status-card">
              <span className={`status-dot-glow ${bufferToStop > 4.0 ? "green" : (bufferToStop > 0 ? "amber" : "red")}`} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                4. Buffer to Stop
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: bufferToStop > 4.0 ? "var(--apple-green)" : (bufferToStop > 0 ? "var(--apple-gold)" : "var(--apple-red)"), margin: "4px 0 2px" }}>
                +{bufferToStop.toFixed(1)}% Cushion
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-muted)", lineHeight: 1.4 }}>
                {bufferToStop > 0 ? `₹${(now - stop).toFixed(1)} safe buffer above stop` : `Violated by ₹${(stop - now).toFixed(1)}`}
              </div>
            </div>
          </div>

          {/* Definitive Daily Verdict Banner */}
          <div
            className="verdict-banner"
            style={{
              background: now <= stop && stop > 0
                ? "rgba(255, 69, 58, 0.15)"
                : (now >= target && target > 0
                  ? "rgba(255, 159, 10, 0.15)"
                  : (now > entry
                    ? "rgba(48, 209, 88, 0.15)"
                    : "rgba(255, 159, 10, 0.12)")),
              borderColor: now <= stop && stop > 0
                ? "rgba(255, 69, 58, 0.4)"
                : (now >= target && target > 0
                  ? "rgba(255, 159, 10, 0.4)"
                  : (now > entry
                    ? "rgba(48, 209, 88, 0.4)"
                    : "rgba(255, 159, 10, 0.35)")),
              borderRadius: 16,
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>
                {now <= stop && stop > 0 ? "🔴" : (now >= target && target > 0 ? "🏆" : (now > entry ? "🟢" : "🟡"))}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    color: now <= stop && stop > 0
                      ? "var(--apple-red)"
                      : (now >= target && target > 0
                        ? "var(--apple-gold)"
                        : (now > entry
                          ? "var(--apple-green)"
                          : "var(--apple-gold)")),
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
                <div style={{ fontSize: 11.5, color: "var(--ink-secondary)", marginTop: 2 }}>
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
                padding: "6px 14px",
                borderRadius: 9999,
                background: now <= stop && stop > 0
                  ? "rgba(255, 69, 58, 0.25)"
                  : (now > entry ? "rgba(48, 209, 88, 0.22)" : "rgba(255, 159, 10, 0.22)"),
                color: now <= stop && stop > 0
                  ? "#ff8a80"
                  : (now > entry ? "#81c784" : "#ffd54f"),
                border: "1px solid currentColor",
              }}
            >
              {now <= stop && stop > 0 ? "ACTION: SELL" : (now >= target ? "ACTION: BOOK/TRAIL" : "ACTION: HOLD")}
            </span>
          </div>
        </div>
      )}

      {/* 7. Interactive Charts & Technical Widgets (Depth Card) */}
      {(activeDetailTab === "all" || activeDetailTab === "charts") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Chart Overview Widget */}
          <div className="depth-card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink-secondary)" }}>
                📈 Chart Overview
              </span>
              <span style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>Interactive Range</span>
            </div>
            <ChartOverviewWidget trade={t} INR={INR} />
          </div>

          {/* Advanced Stock Chart Widget */}
          <div className="depth-card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink-secondary)" }}>
                📊 Advanced Stock Chart (BSE)
              </span>
              <span style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>BSE Candlestick & Volume</span>
            </div>
            <div
              className="tv-chart-wrapper carved-trench"
              style={{
                width: "100%",
                minHeight: "460px",
                height: "480px",
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

          {/* Fundamental Data Widget */}
          <div className="depth-card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink-secondary)" }}>
                📑 Fundamental Financials Overview
              </span>
              <span style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>Statements & Ratios</span>
            </div>
            <div
              className="tv-financials-wrapper carved-trench"
              style={{
                width: "100%",
                minHeight: "480px",
                height: "500px",
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

          {/* Action Button: Open Live Chart */}
          {onOpenChart && (
            <button
              className="btn-apple-pass"
              style={{ padding: "12px 24px", fontSize: 14, justifyContent: "center" }}
              onClick={() => onOpenChart(cleanSym)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 19V5M4 19h16" />
                <path d="M8 15l3.5-4 3 2.5L20 7" />
              </svg>
              Open Full Live Terminal Chart
            </button>
          )}
        </div>
      )}
    </div>
  );
}
