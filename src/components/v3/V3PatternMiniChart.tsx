import React, { useMemo } from "react";
import { V3MiniChart } from "../../types-v3";

interface V3PatternMiniChartProps {
  miniChart: V3MiniChart;
  entryPrice?: number;
  stopPrice?: number;
  targetPrice?: number;
  pivotPrice?: number;
  width?: number;
  height?: number;
  onClick?: () => void;
  className?: string;
}

function getCandles(miniChart: V3MiniChart) {
  if (miniChart.bars && miniChart.bars.length > 0) {
    return miniChart.bars;
  }
  if (miniChart.candles && miniChart.candles.length > 0) {
    return miniChart.candles.map(c => ({
      t: c.time, o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume,
    }));
  }
  return [];
}

export default function V3PatternMiniChart({
  miniChart,
  entryPrice,
  stopPrice,
  targetPrice,
  pivotPrice,
  width = 320,
  height = 168,
  onClick,
  className = "",
}: V3PatternMiniChartProps) {
  const candles = useMemo(() => getCandles(miniChart), [miniChart]);

  const chartData = useMemo(() => {
    if (candles.length === 0) return null;

    const ep = entryPrice ?? miniChart.levels?.entry ?? 0;
    const sp = stopPrice ?? miniChart.levels?.stop ?? 0;
    const tp = targetPrice ?? miniChart.levels?.target ?? 0;
    const pv = pivotPrice ?? miniChart.pivot ?? miniChart.levels?.pivot ?? 0;

    const allHighs = candles.map(c => c.h);
    const allLows = candles.map(c => c.l);
    const levelVals = [ep, sp, tp, pv].filter(v => v > 0);
    const dataMin = Math.min(...allLows, ...levelVals) * 0.985;
    const dataMax = Math.max(...allHighs, ...levelVals) * 1.015;
    const priceRange = dataMax - dataMin;

    const paddingTop = 16;
    const paddingBottom = 30;
    const paddingLeft = 4;
    const paddingRight = 36;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;
    const volH = 20;
    const n = candles.length;
    const gap = chartW / n;
    const candleW = Math.max(1.5, Math.min(6, gap * 0.7));

    const toY = (price: number) =>
      paddingTop + chartH - ((price - dataMin) / priceRange) * chartH;
    const toX = (i: number) =>
      paddingLeft + i * gap + gap / 2;

    const maxVol = Math.max(...candles.map(c => c.v), 1);

    const baseBox = miniChart.base_box;
    let boxStartX = -1, boxEndX = width - paddingRight;
    if (baseBox) {
      const si = candles.findIndex(c => c.t >= baseBox.start_date);
      const ei = candles.findIndex(c => c.t >= baseBox.end_date);
      if (si >= 0) boxStartX = toX(si) - candleW;
      if (ei >= 0) boxEndX = toX(ei) + candleW;
    }

    return {
      candles, n, candleW, gap, toX, toY,
      chartW, chartH, paddingTop, paddingLeft, paddingRight,
      volH, maxVol, dataMin, dataMax, priceRange,
      levels: { ep, sp, tp, pv },
      baseBox,
      boxStartX, boxEndX,
      baseBoxTop: baseBox ? toY(baseBox.top) : 0,
      baseBoxBottom: baseBox ? toY(baseBox.bottom) : 0,
    };
  }, [candles, entryPrice, stopPrice, targetPrice, pivotPrice, miniChart, width, height]);

  // Fallback sparkline
  if (!chartData) {
    const sp = miniChart.sparkline ?? [];
    if (sp.length < 2) return (
      <div className={`flex items-center justify-center text-[10px] text-white/20 ${className}`}
        style={{ width, height }}>No data</div>
    );
    const mn = Math.min(...sp), mx = Math.max(...sp), rng = mx - mn || 1;
    const pts = sp.map((v, i) => {
      const x = 4 + (i / (sp.length - 1)) * (width - 12);
      const y = height - 12 - ((v - mn) / rng) * (height - 24);
      return `${x},${y}`;
    }).join(" ");
    const up = sp[sp.length - 1] >= sp[0];
    return (
      <svg width={width} height={height} className={className} onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default" }}>
        <polyline points={pts} fill="none" stroke={up ? "#10B981" : "#EF4444"}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const {
    toX, toY, candleW, n, candles: bars,
    chartH, paddingTop, paddingLeft, paddingRight,
    volH, maxVol, levels, baseBox, boxStartX, boxEndX,
    baseBoxTop, baseBoxBottom,
  } = chartData;
  const { ep, sp, tp, pv } = levels;
  const uid = miniChart.symbol.replace(/[^a-z0-9]/gi, "");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`select-none ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", display: "block" }}
    >
      <defs>
        <linearGradient id={`boxGrad_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
        </linearGradient>
        <filter id={`glow_${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Subtle grid */}
      {[0.25, 0.5, 0.75].map(f => {
        const gy = paddingTop + chartH * (1 - f);
        return (
          <line key={f} x1={paddingLeft} y1={gy}
            x2={width - paddingRight} y2={gy}
            stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        );
      })}

      {/* Base consolidation box */}
      {baseBox && boxStartX >= 0 && (
        <>
          <rect
            x={boxStartX} y={baseBoxTop}
            width={Math.max(4, boxEndX - boxStartX)}
            height={Math.max(4, baseBoxBottom - baseBoxTop)}
            fill={`url(#boxGrad_${uid})`}
            stroke="rgba(16,185,129,0.3)"
            strokeWidth="0.75"
            strokeDasharray="3,2"
            rx="2"
          />
          {baseBox.duration_str && (
            <text x={(boxStartX + boxEndX) / 2} y={baseBoxTop - 3}
              textAnchor="middle" fill="rgba(52,211,153,0.75)"
              fontSize="7" fontFamily="Inter,sans-serif" fontWeight="600">
              {baseBox.duration_str} base
            </text>
          )}
        </>
      )}

      {/* Pivot dashed line */}
      {pv > 0 && (
        <>
          <line x1={paddingLeft} y1={toY(pv)} x2={width - paddingRight} y2={toY(pv)}
            stroke="rgba(167,139,250,0.55)" strokeWidth="0.8" strokeDasharray="3,3" />
          <rect x={width - paddingRight + 1} y={toY(pv) - 6} width={paddingRight - 2} height={12}
            fill="rgba(139,92,246,0.18)" rx="3" />
          <text x={width - paddingRight + 3} y={toY(pv) + 3.5}
            fill="#C4B5FD" fontSize="6.5" fontWeight="700"
            fontFamily="'JetBrains Mono',monospace">
            {pv >= 1000 ? `₹${(pv / 1000).toFixed(1)}k` : `₹${pv.toFixed(0)}`}
          </text>
        </>
      )}

      {/* Stop line */}
      {sp > 0 && (
        <>
          <line x1={paddingLeft} y1={toY(sp)} x2={width - paddingRight} y2={toY(sp)}
            stroke="rgba(239,68,68,0.4)" strokeWidth="0.7" strokeDasharray="2,4" />
          <text x={width - paddingRight + 2} y={toY(sp) + 3.5}
            fill="#F87171" fontSize="6.5" fontWeight="600"
            fontFamily="'JetBrains Mono',monospace">SL</text>
        </>
      )}

      {/* Target line */}
      {tp > 0 && (
        <>
          <line x1={paddingLeft} y1={toY(tp)} x2={width - paddingRight} y2={toY(tp)}
            stroke="rgba(16,185,129,0.4)" strokeWidth="0.7" strokeDasharray="2,4" />
          <text x={width - paddingRight + 2} y={toY(tp) + 3.5}
            fill="#34D399" fontSize="6.5" fontWeight="600"
            fontFamily="'JetBrains Mono',monospace">T1</text>
        </>
      )}

      {/* Candles */}
      {bars.map((bar, i) => {
        const x = toX(i);
        const isGreen = bar.c >= bar.o;
        const isLast = i === n - 1;
        const isBreakout = pv > 0 && bar.h >= pv && bar.c > bar.o;
        const isFeatured = isLast || isBreakout;

        const color = isGreen ? "#10B981" : "#EF4444";
        const opacity = isFeatured ? 1 : 0.75;

        const bodyTop = toY(Math.max(bar.o, bar.c));
        const bodyBot = toY(Math.min(bar.o, bar.c));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        const wickTop = toY(bar.h);
        const wickBot = toY(bar.l);

        const volH_bar = ((bar.v / maxVol) * volH) * 0.9;
        const volY = height - volH_bar - 4;
        const isHighVol = bar.v > maxVol * 0.55;

        return (
          <g key={i} filter={isBreakout && isGreen ? `url(#glow_${uid})` : undefined}>
            <line x1={x} y1={wickTop} x2={x} y2={wickBot}
              stroke={color} strokeWidth={0.8} opacity={opacity} />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
              fill={color} opacity={opacity} rx={0.5} />
            <rect x={x - candleW / 2} y={volY} width={candleW} height={volH_bar}
              fill={isHighVol ? "rgba(139,92,246,0.55)" : "rgba(139,92,246,0.18)"}
              rx={0.5} />
          </g>
        );
      })}

      {/* Breakout triangle marker on last bar if above pivot */}
      {bars.length > 0 && pv > 0 && bars[n - 1].c > pv && (() => {
        const x = toX(n - 1);
        const tipY = toY(bars[n - 1].h) - 10;
        const pts = `${x},${tipY} ${x - 5},${tipY + 8} ${x + 5},${tipY + 8}`;
        return (
          <polygon points={pts} fill="#10B981" opacity="0.95"
            filter={`url(#glow_${uid})`} />
        );
      })()}

      {/* Entry price label */}
      {ep > 0 && (
        <>
          <rect x={width - paddingRight + 1} y={toY(ep) - 6}
            width={paddingRight - 2} height={12}
            fill="rgba(16,185,129,0.22)" rx="3" />
          <text x={width - paddingRight + 3} y={toY(ep) + 3.5}
            fill="#6EE7B7" fontSize="6.5" fontWeight="800"
            fontFamily="'JetBrains Mono',monospace">
            {ep >= 1000 ? `₹${(ep / 1000).toFixed(1)}k` : `₹${ep.toFixed(0)}`}
          </text>
        </>
      )}
    </svg>
  );
}
