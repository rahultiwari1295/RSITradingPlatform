import React, { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Lock, Target, Shield,
  ChevronRight, Zap, Activity, BarChart2
} from "lucide-react";
import { V3ActiveTrade } from "../../types-v3";
import V3PatternMiniChart from "./V3PatternMiniChart";

interface V3ActiveCardProps {
  trade: V3ActiveTrade;
  index?: number;
  onOpenChart?: (symbol: string) => void;
}

// Pattern label and reasoning string from geometry/strategy
function getPatternContext(trade: V3ActiveTrade) {
  const geom = trade.geometry ?? {};
  const pattern = geom.pattern ?? trade.strategyId ?? "BASE";
  const strat = trade.strategyName ?? trade.strategyId ?? "Breakout";

  const labelMap: Record<string, { icon: string; label: string; color: string }> = {
    BASE:        { icon: "🏛️", label: "Ultra Base Breakout",     color: "#10B981" },
    HTF:         { icon: "🚀", label: "High-Tight Flag",         color: "#8B5CF6" },
    POCKET_PIVOT:{ icon: "⚡", label: "Pocket Pivot Launch",     color: "#F59E0B" },
    RS_LEADER:   { icon: "👑", label: "RS Leader Breakout",      color: "#3B82F6" },
    FIB:         { icon: "📐", label: "Fib Expansion Setup",     color: "#A78BFA" },
  };

  const found = labelMap[pattern] ?? { icon: "📊", label: strat, color: "#94A3B8" };

  // Context why this buy is happening
  let reason = "";
  if (geom.base_ceiling && geom.base_floor) {
    const depth = geom.base_depth_pct ?? Math.round((1 - geom.base_floor / geom.base_ceiling) * 100);
    reason = `${depth}% depth consolidation — breaking ceiling ₹${geom.base_ceiling?.toFixed(2)}`;
  }

  const fibLevels = geom.fib_levels ?? trade.fibLevels ?? {};
  const fib127 = fibLevels["1.272"];
  if (fib127 && !reason) {
    reason = `Fib Expansion target: ₹${fib127.toFixed(2)} (+27.2% from A-B-C)`;
  }

  return { ...found, reason };
}

function getRoiBadge(roi: number) {
  if (roi >= 10) return { color: "#10B981", bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.3)", label: "RUNNER" };
  if (roi >= 3)  return { color: "#34D399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)", label: "PROFIT" };
  if (roi >= 0)  return { color: "#6EE7B7", bg: "rgba(110,231,183,0.1)", border: "rgba(110,231,183,0.2)", label: "GREEN" };
  if (roi >= -3) return { color: "#FBBF24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", label: "BUFFER" };
  return { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)", label: "BELOW" };
}

export default function V3ActiveCard({ trade, index = 0, onOpenChart }: V3ActiveCardProps) {
  const ep = Number(trade.entryPrice ?? 0);
  const lp = Number(trade.livePrice ?? trade.currentPrice ?? ep);
  const roi = Number(trade.roiPct ?? trade.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
  const stopPrice = Number(trade.stopLoss ?? trade.stop ?? 0);
  const tgtPrice  = Number(trade.targetPrice ?? trade.target ?? 0);
  const pivot     = Number(trade.pivot ?? trade.geometry?.pivot ?? 0);
  const conviction = Number(trade.convictionScore ?? trade.compositeScore ?? 0);
  const shares = Number(trade.shares ?? 0);
  const invested = ep * shares;
  const days = Number(trade.holdingDays ?? 0);

  const roiBadge = useMemo(() => getRoiBadge(roi), [roi]);
  const patternCtx = useMemo(() => getPatternContext(trade), [trade]);

  const miniChartData = trade.miniChart;

  // Progress between stop → entry → target
  const progressPct = useMemo(() => {
    if (!stopPrice || !tgtPrice || ep <= stopPrice) return 50;
    const range = tgtPrice - stopPrice;
    const pos = lp - stopPrice;
    return Math.max(0, Math.min(100, (pos / range) * 100));
  }, [lp, stopPrice, tgtPrice, ep]);

  // Fib levels
  const fibLevels = trade.fibLevels ?? trade.geometry?.fib_levels;

  const animDelay = `${index * 60}ms`;

  return (
    <div
      className="v3-active-card group"
      style={{ animationDelay: animDelay }}
    >
      {/* Gradient border shimmer on hover */}
      <div className="v3-card-border-glow" />

      {/* Card inner */}
      <div className="v3-card-inner">

        {/* ── TOP ROW ── */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Symbol avatar */}
            <div className="v3-symbol-badge flex-shrink-0">
              <span className="text-[11px] font-black text-white leading-none">
                {trade.symbol.slice(0, 2)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-black text-white tracking-tight truncate">
                  {trade.symbol}
                </span>
                {days > 0 && (
                  <span className="text-[9px] font-semibold text-white/30 flex-shrink-0">
                    {days}d
                  </span>
                )}
              </div>
              {/* Pattern label */}
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9.5px]">{patternCtx.icon}</span>
                <span
                  className="text-[9.5px] font-bold tracking-wide"
                  style={{ color: patternCtx.color }}
                >
                  {patternCtx.label}
                </span>
              </div>
            </div>
          </div>

          {/* ROI badge */}
          <div
            className="flex-shrink-0 flex flex-col items-end gap-1"
          >
            <div
              className="px-2.5 py-1 rounded-xl text-[13px] font-black tabular"
              style={{
                background: roiBadge.bg,
                border: `1px solid ${roiBadge.border}`,
                color: roiBadge.color,
              }}
            >
              {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
            </div>
            <div
              className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md"
              style={{ background: roiBadge.bg, color: roiBadge.color, opacity: 0.85 }}
            >
              {roiBadge.label}
            </div>
          </div>
        </div>

        {/* ── PATTERN MINI CHART ── */}
        <div
          className="v3-mini-chart-wrap mb-3 cursor-pointer"
          onClick={() => onOpenChart?.(trade.symbol)}
          title="Tap for full interactive chart"
        >
          {miniChartData ? (
            <V3PatternMiniChart
              miniChart={miniChartData}
              entryPrice={ep}
              stopPrice={stopPrice}
              targetPrice={tgtPrice}
              pivotPrice={pivot}
              width={324}
              height={156}
            />
          ) : (
            /* Placeholder if no mini chart data yet */
            <div className="flex items-center justify-center h-[156px] w-full">
              <div className="flex flex-col items-center gap-2 text-white/20">
                <BarChart2 className="w-6 h-6" />
                <span className="text-[10px] font-medium">Chart loading…</span>
              </div>
            </div>
          )}
          {/* Tap hint overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl">
            <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
              <Activity className="w-3.5 h-3.5" />
              Open Fibonacci Chart
            </div>
          </div>
        </div>

        {/* ── WHY CALL CONTEXT ── */}
        {patternCtx.reason && (
          <div className="v3-reason-pill mb-3">
            <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="text-[10.5px] font-medium text-white/60 leading-snug">
              {patternCtx.reason}
            </span>
          </div>
        )}

        {/* ── PRICE PROGRESS BAR ── */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[9px] font-semibold text-white/40 mb-1.5">
            <span className="flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" />
              SL ₹{stopPrice.toFixed(0)}
            </span>
            <span className="text-white/60 font-bold text-[10px]">
              ₹{lp.toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              T1 ₹{tgtPrice.toFixed(0)}
              <Target className="w-2.5 h-2.5" />
            </span>
          </div>
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            {/* Stop zone - red left */}
            <div className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: "25%", background: "rgba(239,68,68,0.3)" }} />
            {/* Progress fill */}
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: progressPct >= 75
                  ? "linear-gradient(90deg, #10B981, #34D399)"
                  : progressPct >= 45
                  ? "linear-gradient(90deg, #10B981, #6EE7B7)"
                  : "linear-gradient(90deg, #F59E0B, #FBBF24)",
              }}
            />
            {/* Entry tick */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white/40 rounded-full"
              style={{ left: `${Math.max(0, Math.min(100, ((ep - stopPrice) / (tgtPrice - stopPrice)) * 100))}%` }}
            />
          </div>
        </div>

        {/* ── METRICS GRID ── */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { label: "Entry", value: `₹${ep.toFixed(0)}`, sub: null, icon: null },
            { label: "Shares", value: shares > 0 ? shares.toLocaleString() : "—", sub: null, icon: null },
            { label: "Invested", value: invested > 0 ? `₹${(invested / 1000).toFixed(1)}k` : "—", sub: null, icon: null },
            { label: "Score", value: conviction > 0 ? `${conviction}` : "—", sub: "/100", icon: null },
          ].map(m => (
            <div key={m.label} className="v3-metric-cell">
              <span className="text-[9px] text-white/35 font-medium block">{m.label}</span>
              <span className="text-[12px] font-black text-white tabular leading-tight">
                {m.value}
                {m.sub && <span className="text-[9px] text-white/40">{m.sub}</span>}
              </span>
            </div>
          ))}
        </div>

        {/* ── FIBONACCI LEVELS ── */}
        {fibLevels && Object.keys(fibLevels).length > 0 && (
          <div className="mb-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-purple-400/70 font-semibold">FIB</span>
            {Object.entries(fibLevels).slice(0, 4).map(([k, v]) => (
              <div key={k} className="v3-fib-chip">
                <span className="text-[8px] text-purple-400/60">{k}×</span>
                <span className="text-[9px] font-bold text-purple-300">₹{Number(v).toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {roi >= 0
              ? <TrendingUp className="w-3 h-3 text-emerald-400" />
              : <TrendingDown className="w-3 h-3 text-red-400" />
            }
            <span className="text-[10px] text-white/40 font-medium">
              {trade.footerLine ?? trade.slippageText ?? `Entry ₹${ep.toFixed(2)}`}
            </span>
          </div>
          <button
            onClick={() => onOpenChart?.(trade.symbol)}
            className="v3-chart-btn"
          >
            <span>Chart</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
