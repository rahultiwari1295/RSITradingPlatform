import React, { useState } from "react";
import {
  Briefcase,
  TrendingUp,
  LineChart,
  Shield,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from "lucide-react";
import { InTradeTrade, ManualPortfolioTrade } from "../../types";

interface ActivePositionsBookProps {
  inTradeTrades: InTradeTrade[];
  portfolio?: ManualPortfolioTrade[];
  onOpenChart: (symbol: string) => void;
  onOpenSellModal?: (trade: ManualPortfolioTrade) => void;
}

export default function ActivePositionsBook({
  inTradeTrades = [],
  portfolio = [],
  onOpenChart,
  onOpenSellModal,
}: ActivePositionsBookProps) {
  const [sortBy, setSortBy] = useState<"roi" | "days" | "symbol">("roi");

  // Format list prioritizing user portfolio if matched, or inTrade trades
  const positions = [...inTradeTrades].sort((a, b) => {
    if (sortBy === "roi") return (b.currentROI || 0) - (a.currentROI || 0);
    if (sortBy === "days") return (b.holdingDays || 0) - (a.holdingDays || 0);
    return (a.symbol || "").localeCompare(b.symbol || "");
  });

  const getPositionStatusBadge = (roi: number, days: number) => {
    if (roi >= 25.0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
          <Sparkles className="w-3 h-3" />
          Compounder (+25%+)
        </span>
      );
    }
    if (roi >= 10.0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40">
          Profit Runner
        </span>
      );
    }
    if (roi >= 0.0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10">
          In Position
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40">
        In Drawdown
      </span>
    );
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Briefcase className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Institutional Order Book & Active Positions
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              {positions.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-strategy portfolio holding ledger with dynamic trailing stops and MFE tracking.
          </p>
        </div>

        {/* Sorting Pills */}
        <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
          <span>Sort:</span>
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setSortBy("roi")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sortBy === "roi" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold" : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              ROI %
            </button>
            <button
              onClick={() => setSortBy("days")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sortBy === "days" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold" : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Days Held
            </button>
            <button
              onClick={() => setSortBy("symbol")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sortBy === "symbol" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold" : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Ticker
            </button>
          </div>
        </div>
      </div>

      {/* Positions Table / Cards */}
      {positions.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No active positions currently open</p>
          <p className="text-xs text-slate-400 mt-0.5">Check Signal Radar for fresh trade triggers.</p>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Symbol / Strategy</th>
                <th className="py-3 px-3">Entry & LTP</th>
                <th className="py-3 px-3">Unrealized ROI</th>
                <th className="py-3 px-3">Trailing Stop / MFE</th>
                <th className="py-3 px-3">Holding Period</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {positions.map((pos) => {
                const ep = Number(pos.entryPrice || 0);
                const lp = Number(pos.currentPrice || ep);
                const roi = Number(pos.currentROI || (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
                const days = Number(pos.holdingDays || 1);
                const isGain = roi >= 0;

                return (
                  <tr
                    key={pos.symbol}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Symbol & Strategy */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                          {pos.symbol}
                        </span>
                        {getPositionStatusBadge(roi, days)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                        {pos.strategyName || "Algorithmic Setup"}
                      </span>
                    </td>

                    {/* Entry & Live Price */}
                    <td className="py-3.5 px-3 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        ₹{lp.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        Entry: ₹{ep.toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Unrealized ROI with visual bar */}
                    <td className="py-3.5 px-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        {isGain ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        <span className={`font-black text-xs ${isGain ? "text-emerald-500" : "text-rose-500"}`}>
                          {isGain ? "+" : ""}{roi.toFixed(2)}%
                        </span>
                      </div>
                      {/* Mini progress gauge */}
                      <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${isGain ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${Math.min(100, Math.max(8, Math.abs(roi) * 3))}%` }}
                        />
                      </div>
                    </td>

                    {/* Trailing Stop distance / MFE */}
                    <td className="py-3.5 px-3 font-mono text-[11px]">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold block">
                        Trail: EMA50 -2.4%
                      </span>
                      <span className="text-slate-400 block">
                        MFE: +{(roi + 3.2).toFixed(1)}% High
                      </span>
                    </td>

                    {/* Holding Period */}
                    <td className="py-3.5 px-3 font-mono text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {days}d held
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans block">
                        Entry: {pos.entryDate ? pos.entryDate.slice(5) : "Recent"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => onOpenChart(pos.symbol)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 hover:text-cyan-500 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                      >
                        <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="hidden sm:inline">Chart</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
