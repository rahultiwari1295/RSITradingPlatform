import React, { useState } from "react";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Link2
} from "lucide-react";
import type { SectorAnalysisItem } from "../../types";

interface SectorRotationHeatmapProps {
  sectors: SectorAnalysisItem[];
  timeframe: "day" | "week";
  onTimeframeChange: (tf: "day" | "week") => void;
  onOpenChart?: (symbol: string) => void;
  isLoading?: boolean;
}

export const SectorRotationHeatmap: React.FC<SectorRotationHeatmapProps> = ({
  sectors,
  timeframe,
  onTimeframeChange,
  onOpenChart,
  isLoading = false,
}) => {
  const [filterType, setFilterType] = useState<"all" | "sector" | "industry" | "linked">("all");
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(null);

  const filteredSectors = sectors.filter((s) => {
    if (filterType === "sector") return s.category === "sector";
    if (filterType === "industry") return s.category === "industry";
    if (filterType === "linked") return (s.activeSignalsCount || 0) > 0;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedSectorId((prev) => (prev === id ? null : id));
  };

  const topSector = sectors[0];

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-sm shadow-cyan-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Sector &amp; Industry Rotation
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300/80 dark:border-cyan-700/50">
                {timeframe === "day" ? "Intraday Momentum" : "Weekly Breakouts"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Identify where big institutional smart money is rotating across 30+ market clusters
            </p>
          </div>
        </div>

        {/* Timeframe & External Link */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Day / Week Switch */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/70 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => onTimeframeChange("day")}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                timeframe === "day"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Day (1D)
            </button>
            <button
              type="button"
              onClick={() => onTimeframeChange("week")}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                timeframe === "week"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Week (1W)
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar (Mobile scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`px-3 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border ${
            filterType === "all"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white"
              : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.06]"
          }`}
        >
          All Sectors ({sectors.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterType("linked")}
          className={`px-3 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
            filterType === "linked"
              ? "bg-indigo-600 text-white border-indigo-700 shadow-xs shadow-indigo-500/30"
              : "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40"
          }`}
        >
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Linked to Active Signals</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType("sector")}
          className={`px-3 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border ${
            filterType === "sector"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white"
              : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.06]"
          }`}
        >
          Sectors
        </button>

        <button
          type="button"
          onClick={() => setFilterType("industry")}
          className={`px-3 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border ${
            filterType === "industry"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white"
              : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.06]"
          }`}
        >
          Industries
        </button>
      </div>

      {/* Top Sector Banner Spotlight */}
      {topSector && filterType === "all" && (
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 dark:border-emerald-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <Flame className="w-3 h-3 text-emerald-600" />
                  #1 Leader Today
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {topSector.advances} Advances / {topSector.declines} Declines
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {topSector.name}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Pacing the market with {timeframe === "week" ? topSector.weekChangeP : topSector.dayChangeP}% surge.
                Top movers: {topSector.topGainers.map((g) => `${g.symbol} (+${g.changeP}%)`).join(", ")}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {timeframe === "week" ? "1-Week Gain" : "Day Gain"}
                </span>
                <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                  +{timeframe === "week" ? topSector.weekChangeP : topSector.dayChangeP}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredSectors.map((sector) => {
          const changeVal = timeframe === "week" ? sector.weekChangeP : sector.dayChangeP;
          const isPositive = changeVal >= 0;
          const isExpanded = expandedSectorId === sector.id;
          const totalBreadth = (sector.advances || 0) + (sector.declines || 0) || 1;
          const advPct = Math.round(((sector.advances || 0) / totalBreadth) * 100);

          return (
            <div
              key={sector.id}
              className={`group rounded-2xl p-4 transition-all duration-200 bg-white/95 dark:bg-slate-900/80 border ${
                sector.activeSignalsCount && sector.activeSignalsCount > 0
                  ? "border-indigo-300 dark:border-indigo-500/40 shadow-sm shadow-indigo-500/10"
                  : "border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
              }`}
            >
              {/* Card Header: Sector Name, Badges, % Change */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                      {sector.name}
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                      {sector.category}
                    </span>
                  </div>

                  {/* Active Signals Tag */}
                  {sector.activeSignalsCount && sector.activeSignalsCount > 0 ? (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>
                        {sector.activeSignalsCount} active signal{sector.activeSignalsCount > 1 ? "s" : ""}:{" "}
                        {sector.activeSignals?.join(", ")}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Change Percentage Pill */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-black shrink-0 ${
                    isPositive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {changeVal.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Market Breadth Split Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Adv: {sector.advances}</span>
                  <span className="font-mono">P/E: {sector.pe || "—"} · P/B: {sector.pb || "—"}</span>
                  <span>Dec: {sector.declines}</span>
                </div>

                <div className="h-1.5 rounded-full bg-rose-200 dark:bg-rose-950/70 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${advPct}%` }}
                  />
                </div>
              </div>

              {/* Top Gainers Quick Pills */}
              {sector.topGainers && sector.topGainers.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
                    Drivers:
                  </span>
                  {sector.topGainers.map((stk) => (
                    <button
                      key={stk.symbol}
                      type="button"
                      onClick={() => onOpenChart?.(stk.symbol)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      title={`Open chart for ${stk.symbol}`}
                    >
                      <span>{stk.symbol}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{stk.changeP}%
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Accordion Toggle for Deep Breakdown */}
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleExpand(sector.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span>{isExpanded ? "Hide Details" : "View Movers & Multi-Timeframe"}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>1M: {sector.monthChangeP ? `+${sector.monthChangeP}%` : "—"}</span>
                  <span>1Y: {sector.yearChangeP ? `+${sector.yearChangeP}%` : "—"}</span>
                </div>
              </div>

              {/* Expanded Details Drawer */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-white/[0.08] space-y-2 text-xs animate-fade-in-up">
                  {/* Top Draggers */}
                  {sector.topDraggers && sector.topDraggers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Draggers:
                      </span>
                      {sector.topDraggers.map((d) => (
                        <span
                          key={d.symbol}
                          className="px-2 py-0.5 rounded-lg text-[10.5px] font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold"
                        >
                          {d.symbol} ({d.changeP}%)
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>Total Universe: {sector.totalStocks} Equities</span>
                    {sector.marketCapCr && (
                      <span>
                        Market Cap: ₹{(sector.marketCapCr / 1000).toFixed(0)}k Cr
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
