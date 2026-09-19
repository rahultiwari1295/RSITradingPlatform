import React, { useMemo } from "react";
import { formatINR } from "../../constants/theme";

export interface PatternChartBar {
  time?: string | number;
  t?: string | number;
  open?: number;
  o?: number;
  high?: number;
  h?: number;
  low?: number;
  l?: number;
  close?: number;
  c?: number;
  volume?: number;
  v?: number;
}

// Helper to format date string to DD/MM (e.g. 21/02)
function formatDDMM(dateStr: string): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[2]}/${match[1]}`;
  }
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
    } else {
      return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
    }
  }
  return dateStr;
}

export interface InstitutionalPatternChartProps {
  symbol: string;
  name?: string;
  sector?: string;
  industry?: string;
  stage?: string;
  strategyName?: string;
  patternName?: string;
  breakoutDate?: string;
  pivotPrice: number;
  entryPrice?: number;
  stopPrice?: number;
  targetPrice?: number;
  currentPrice?: number;
  baseFloor?: number;
  baseLengthStr?: string;
  handleLengthStr?: string;
  breakoutVolumeMultiplier?: number;
  closeInRange?: number;
  rsRating?: number;
  candles?: PatternChartBar[];
  seed?: number;
  showOverviewGrid?: boolean;
  className?: string;
}

// Deterministic pseudo-random helper for consistent candle generation
function pseudoRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function InstitutionalPatternChart({
  symbol,
  name,
  sector = "Diversified",
  industry,
  stage = "Stage 2 Base 📐",
  strategyName,
  patternName,
  breakoutDate = "17 Sep 2026",
  pivotPrice,
  entryPrice,
  stopPrice,
  targetPrice,
  currentPrice,
  baseFloor,
  baseLengthStr = "18.4 wks",
  handleLengthStr,
  breakoutVolumeMultiplier = 4.85,
  closeInRange = 0.82,
  rsRating = 91,
  candles,
  seed = 101,
  showOverviewGrid = true,
  className = "",
}: InstitutionalPatternChartProps) {
  const current = Number(currentPrice || entryPrice || pivotPrice || 100);
  const pivot = Number(pivotPrice || current * 0.98);
  const floor = Number(baseFloor || stopPrice || pivot * 0.84);
  const entry = Number(entryPrice || current);

  // Generate or normalize high-density candlestick series (~52 bars)
  const chartData = useMemo(() => {
    let bars: Array<{
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
      date: string;
      isBreakout?: boolean;
    }> = [];

    const numBars = 50;
    const baseStartIdx = 12;
    const breakoutIdx = 45;

    if (candles && candles.length >= 30) {
      bars = candles.map((c, i) => {
        const o = Number(c.open ?? c.o ?? current);
        const h = Number(c.high ?? c.h ?? o * 1.01);
        const l = Number(c.low ?? c.l ?? o * 0.99);
        const cl = Number(c.close ?? c.c ?? o);
        const isUp = cl >= o;
        const v = Number(
          c.volume ??
            c.v ??
            (i === candles.length - 2
              ? 350000 * breakoutVolumeMultiplier
              : isUp
              ? 120000
              : 80000)
        );
        return {
          o,
          h,
          l,
          c: cl,
          v,
          date: String(c.time ?? c.t ?? `Bar ${i}`),
          isBreakout: i === candles.length - 2 || i === candles.length - 1,
        };
      });
    } else {
      // Synthesize realistic institutional breakout pattern
      const rng = pseudoRandom(seed + Math.round(pivot * 10));
      let p = pivot * 0.88;

      // Dates progression
      const baseDate = new Date("2026-09-18");
      const dayMs = 86400000 * 4; // ~4 days per bar for weekly/multi-day base

      for (let i = 0; i < numBars; i++) {
        const d = new Date(baseDate.getTime() - (numBars - 1 - i) * dayMs);
        const dateStr = d.toISOString().split("T")[0];

        let targetP = p;
        let volMult = 0.8 + rng() * 0.5;
        let isBreakout = false;

        if (i < baseStartIdx) {
          // Prior uptrend running into initial pivot resistance
          const progress = i / baseStartIdx;
          targetP = pivot * (0.88 + progress * 0.12);
        } else if (i === baseStartIdx) {
          // Left resistance peak (initial pivot test)
          targetP = pivot * 0.998;
          volMult = 1.4;
        } else if (i > baseStartIdx && i < 28) {
          // Base correction dipping down to base floor
          const depth = (i - baseStartIdx) / (28 - baseStartIdx);
          targetP = pivot - (pivot - floor) * Math.sin(depth * (Math.PI / 2));
          volMult = 0.5 + rng() * 0.4; // Volume drying up
        } else if (i >= 28 && i < breakoutIdx) {
          // Rounding bottom & handle contraction tightening near pivot
          const progress = (i - 28) / (breakoutIdx - 28);
          targetP = floor + (pivot * 0.98 - floor) * progress;
          volMult = 0.4 + rng() * 0.35; // Quiet volume
        } else if (i === breakoutIdx) {
          // Breakout bar: heavy volume explosion crossing pivot!
          targetP = pivot * 1.025;
          volMult = breakoutVolumeMultiplier;
          isBreakout = true;
        } else {
          // Post-breakout extension near current price
          targetP = current;
          volMult = 1.6 + rng() * 0.8;
          isBreakout = true;
        }

        const barVol = Math.max(0.008, 0.012 + rng() * 0.008);
        const o = p;
        const c = targetP * (1 + (rng() - 0.48) * barVol);
        const isUp = c >= o;
        const h = Math.max(o, c) * (1 + rng() * barVol * 0.8);
        const l = Math.min(o, c) * (1 - rng() * barVol * 0.8);
        const v = Math.round((isUp ? 150000 : 90000) * volMult);

        bars.push({ o, h, l, c, v, date: dateStr, isBreakout });
        p = c;
      }
    }

    // SVG coordinates calculation
    const W = 540;
    const H = 265;
    const padTop = 32;
    const padLeft = 14;
    const padRight = 62;
    const priceH = 142;
    const volTop = 186;
    const volH = 46;

    const chartW = W - padLeft - padRight;
    const n = bars.length;
    const slotW = chartW / n;
    const candleW = Math.max(2.2, Math.min(6.5, slotW * 0.65));

    const allPrices = [
      ...bars.map((b) => b.h),
      ...bars.map((b) => b.l),
      pivot,
      floor,
      entry,
    ];
    let minP = Math.min(...allPrices);
    let maxP = Math.max(...allPrices);
    const pRange = maxP - minP || 1;
    minP -= pRange * 0.05;
    maxP += pRange * 0.06;
    const expandedRange = maxP - minP || 1;

    const toY = (price: number) =>
      padTop + priceH - ((price - minP) / expandedRange) * priceH;
    const toX = (i: number) => padLeft + i * slotW + slotW / 2;

    const maxVol = Math.max(...bars.map((b) => b.v), 1);
    const toVolH = (vol: number) => (vol / maxVol) * volH;

    // Pattern base box coordinates
    const boxStartX = toX(baseStartIdx) - candleW / 2;
    const boxEndX = toX(breakoutIdx) + candleW / 2;
    const boxTop = toY(pivot);
    const boxBottom = toY(floor);

    // Right Y-axis price ticks
    const priceTicks = [
      maxP * 0.98,
      pivot,
      floor,
      minP + (pivot - floor) * 0.2,
    ]
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .sort((a, b) => b - a);

    // Bottom Date Ticks (4 well-spaced ticks formatted as DD/MM, e.g. 21/02)
    const dateIndices = [
      0,
      Math.round((n - 1) * 0.33),
      Math.round((n - 1) * 0.66),
      n - 1,
    ];
    const dateTicks = dateIndices.map((idx, i) => ({
      x: i === 0 ? padLeft + 2 : i === dateIndices.length - 1 ? padLeft + chartW : toX(idx),
      anchor: (i === 0 ? "start" : i === dateIndices.length - 1 ? "end" : "middle") as "start" | "middle" | "end",
      label: formatDDMM(bars[idx]?.date || ""),
    }));

    // Last bar OHLC
    const lastBar = bars[bars.length - 1] || {
      o: current,
      h: current,
      l: current,
      c: current,
      v: 1800000,
    };
    const lastChgPct =
      lastBar.o > 0 ? ((lastBar.c - lastBar.o) / lastBar.o) * 100 : 0;

    return {
      bars,
      n,
      W,
      H,
      chartW,
      candleW,
      slotW,
      toX,
      toY,
      toVolH,
      volTop,
      volH,
      boxStartX,
      boxEndX,
      boxTop,
      boxBottom,
      baseStartIdx,
      breakoutIdx,
      priceTicks,
      dateTicks,
      lastBar,
      lastChgPct,
    };
  }, [candles, current, pivot, floor, entry, seed, breakoutVolumeMultiplier]);

  const {
    bars,
    W,
    H,
    candleW,
    toX,
    toY,
    toVolH,
    volTop,
    volH,
    boxStartX,
    boxEndX,
    boxTop,
    boxBottom,
    breakoutIdx,
    baseStartIdx,
    priceTicks,
    dateTicks,
    lastBar,
    lastChgPct,
  } = chartData;

  const nowVsPivotPct =
    pivot > 0 ? ((current - pivot) / pivot) * 100 : 0;
  const cleanPatternName =
    patternName || stage.replace(/📐|🚀|📦/g, "").trim() || "Stage 2 Flat Base";

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200/90 dark:border-white/[0.08] p-2 sm:p-2.5 text-slate-900 dark:text-white shadow-xs select-none ${className}`}
    >
      {/* ── HIGH PRECISION SVG PATTERN CHART ── */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50/50 dark:bg-black/20">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          style={{ maxHeight: 240 }}
        >
          <defs>
            {/* Soft green gradient fill for the base consolidation box */}
            <linearGradient id={`baseBoxGrad_${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {priceTicks.map((p, idx) => (
            <g key={`grid-${idx}`}>
              <line
                x1="12"
                y1={toY(p)}
                x2="480"
                y2={toY(p)}
                stroke="currentColor"
                className="text-slate-200 dark:text-white/[0.05]"
                strokeWidth="0.75"
                strokeDasharray="3 3"
              />
              <text
                x="536"
                y={toY(p) + 3.5}
                textAnchor="end"
                fill="#8B8D98"
                fontSize="8px"
                fontWeight="600"
                fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                className="fill-[#8B8D98] dark:fill-slate-400 font-sans text-[8px] font-semibold"
              >
                {p >= 1000 ? `₹${p.toFixed(0)}` : `₹${p.toFixed(1)}`}
              </text>
            </g>
          ))}

          {/* ── A. BASE CONSOLIDATION BOX (Image 2 & 3 signature overlay) ── */}
          {boxEndX > boxStartX && (
            <g className="base-pattern-box">
              {/* Shaded base rectangle */}
              <rect
                x={boxStartX}
                y={boxTop}
                width={boxEndX - boxStartX}
                height={Math.max(8, boxBottom - boxTop)}
                fill={`url(#baseBoxGrad_${symbol})`}
                stroke="#10B981"
                strokeWidth="1"
                strokeOpacity="0.45"
                rx="2"
              />

              {/* Base Duration Label centered on top of box (e.g. 98.4 wks) */}
              <text
                x={(boxStartX + boxEndX) / 2}
                y={boxTop - 6}
                textAnchor="middle"
                fill="#10B981"
                className="font-mono text-[10.5px] font-bold"
              >
                {baseLengthStr}
              </text>

              {/* Base Floor label on bottom line */}
              <line
                x1={boxStartX}
                y1={boxBottom}
                x2={boxEndX}
                y2={boxBottom}
                stroke="#10B981"
                strokeWidth="1"
                strokeOpacity="0.6"
              />

              {/* Secondary Handle Box (if specified, like Welspun Living Image 3) */}
              {handleLengthStr && (
                <g>
                  <rect
                    x={boxStartX + (boxEndX - boxStartX) * 0.58}
                    y={boxTop + (boxBottom - boxTop) * 0.15}
                    width={(boxEndX - boxStartX) * 0.42}
                    height={(boxBottom - boxTop) * 0.85}
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    strokeOpacity="0.6"
                    rx="2"
                  />
                  <text
                    x={boxStartX + (boxEndX - boxStartX) * 0.79}
                    y={boxTop + (boxBottom - boxTop) * 0.15 - 4}
                    textAnchor="middle"
                    fill="#94A3B8"
                    className="font-mono text-[8.5px] font-semibold"
                  >
                    {handleLengthStr}
                  </text>
                </g>
              )}
            </g>
          )}

          {/* ── B. PIVOT LINE & PILL BADGE (Image 2 & 3 style) ── */}
          <line
            x1="12"
            y1={boxTop}
            x2="480"
            y2={boxTop}
            stroke="#10B981"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />

          {/* Green Pivot Pill Badge on the left */}
          <g transform={`translate(12, ${boxTop - 9})`}>
            <rect width="80" height="18" rx="4" fill="#10B981" />
            <text
              x="40"
              y="12.5"
              textAnchor="middle"
              fill="#FFFFFF"
              className="font-mono font-black text-[9.5px]"
            >
              pivot ₹{pivot.toFixed(1)}
            </text>
          </g>

          {/* ── C. BREAKOUT MARKERS ── */}
          {/* Initial Left Resistance Peak crosshair (Image 2 & 3) */}
          <g transform={`translate(${toX(baseStartIdx)}, ${boxTop - 5})`}>
            <path
              d="M -3 -3 L 3 3 M 3 -3 L -3 3"
              stroke="#D97706"
              strokeWidth="1.5"
            />
          </g>

          {/* Breakout Flag / Marker on the pivot crossing bar (Image 2 & 3) */}
          <g transform={`translate(${toX(breakoutIdx)}, ${boxTop - 12})`}>
            <path
              d="M 0 0 L 8 -5 L 8 5 L 0 0 Z M 0 0 L 0 12"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="1.2"
            />
          </g>

          {/* ── D. HIGH-DENSITY CANDLESTICKS ── */}
          {bars.map((b, i) => {
            const x = toX(i);
            const isUp = b.c >= b.o;
            const color = isUp ? "#10B981" : "#EF4444";

            const bodyTop = toY(Math.max(b.o, b.c));
            const bodyBot = toY(Math.min(b.o, b.c));
            const bodyH = Math.max(1.2, bodyBot - bodyTop);

            const wickTop = toY(b.h);
            const wickBot = toY(b.l);

            // Volume bar
            const barVolH = toVolH(b.v);
            const barVolY = volTop + volH - barVolH;

            return (
              <g key={`bar-${i}`}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={wickTop}
                  x2={x}
                  y2={wickBot}
                  stroke={color}
                  strokeWidth="0.8"
                  opacity={b.isBreakout ? 1 : 0.8}
                />
                {/* Body */}
                <rect
                  x={x - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  fill={color}
                  opacity={b.isBreakout ? 1 : 0.85}
                  rx="0.5"
                />
                {/* Volume Bar */}
                <rect
                  x={x - candleW / 2}
                  y={barVolY}
                  width={candleW}
                  height={Math.max(1, barVolH)}
                  fill={
                    b.isBreakout && isUp
                      ? "#10B981"
                      : isUp
                      ? "rgba(16, 185, 129, 0.45)"
                      : "rgba(239, 68, 68, 0.45)"
                  }
                  rx="0.4"
                />
              </g>
            );
          })}

          {/* ── E. VOLUME PANEL DIVIDER ── */}
          <line
            x1="12"
            y1={volTop}
            x2="480"
            y2={volTop}
            stroke="currentColor"
            className="text-slate-200 dark:text-white/[0.08]"
            strokeWidth="0.75"
          />
          <text
            x="14"
            y={volTop + 10}
            fill="#8B8D98"
            fontSize="7.5px"
            fontWeight="700"
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            className="fill-[#8B8D98] dark:fill-slate-400 font-sans text-[7.5px] uppercase font-bold tracking-wider"
          >
            VOL
          </text>

          {/* ── F. TIME / DATE AXIS (Bottom of chart) ── */}
          {dateTicks.map((tick, idx) => (
            <text
              key={`date-${idx}`}
              x={tick.x}
              y={H - 6}
              textAnchor={tick.anchor}
              fill="#8B8D98"
              fontSize="7.5px"
              fontWeight="500"
              fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              className="fill-[#8B8D98] dark:fill-slate-400 font-sans text-[7.5px]"
            >
              {tick.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
