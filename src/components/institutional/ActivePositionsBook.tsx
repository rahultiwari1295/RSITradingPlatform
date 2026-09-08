import React, { useState, useMemo } from "react";
import { Briefcase, LayoutGrid, Table } from "lucide-react";
import { InTradeTrade, ManualPortfolioTrade } from "../../types";
import QuantSyncAlertCard from "./QuantSyncAlertCard";
import { getSignalStatus } from "../../lib/signalStatus";

interface ActivePositionsBookProps {
  inTradeTrades: InTradeTrade[];
  portfolio?: ManualPortfolioTrade[];
  onOpenChart: (symbol: string) => void;
  onOpenSellModal?: (trade: ManualPortfolioTrade) => void;
  onOpenBuyModal?: (symbol: string, price: number, strategy?: string) => void;
}

export default function ActivePositionsBook({
  inTradeTrades = [],
  portfolio = [],
  onOpenChart,
  onOpenSellModal,
  onOpenBuyModal,
}: ActivePositionsBookProps) {
  // Default sort is "days" (latest entry date first)
  const [sortBy, setSortBy] = useState<"days" | "roi" | "symbol">("days");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const positions = useMemo(() => {
    return [...inTradeTrades].sort((a, b) => {
      if (sortBy === "days") {
        // "means latest entry should show first .."
        const getTime = (t: InTradeTrade) => {
          if (t.entryDate) {
            const time = new Date(t.entryDate).getTime();
            if (!isNaN(time)) return time;
          }
          if (t.holdingDays !== undefined && t.holdingDays !== null) {
            return Date.now() - Number(t.holdingDays) * 86400000;
          }
          return 0;
        };
        const diff = getTime(b) - getTime(a);
        if (diff !== 0) return diff;
        return (a.symbol || "").localeCompare(b.symbol || "");
      }
      if (sortBy === "roi") {
        const epA = Number(a.entryPrice || 0);
        const lpA = Number(a.currentPrice || epA);
        const roiA = Number(a.currentROI ?? (epA > 0 ? ((lpA - epA) / epA) * 100 : 0));

        const epB = Number(b.entryPrice || 0);
        const lpB = Number(b.currentPrice || epB);
        const roiB = Number(b.currentROI ?? (epB > 0 ? ((lpB - epB) / epB) * 100 : 0));

        return roiB - roiA;
      }
      return (a.symbol || "").localeCompare(b.symbol || "");
    });
  }, [inTradeTrades, sortBy]);

  const profitCount = positions.filter((p) => {
    const ep = Number(p.entryPrice || 0);
    const lp = Number(p.currentPrice || ep);
    const roi = Number(p.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
    return roi >= 0;
  }).length;
  const lossCount = positions.length - profitCount;

  if (positions.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] animate-fade-in">
        <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No active positions</p>
        <p className="text-xs text-slate-400 mt-0.5">Active strategy trades will appear here as the engine enters new positions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
            <Briefcase className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Active Positions
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            {profitCount} In Profit
          </span>
          {lossCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
              {lossCount} Drawdown
            </span>
          )}
        </div>

        {/* Controls: Sort & View Mode */}
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04]">
            {(["days", "roi", "symbol"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sortBy === s
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {s === "days" ? "Days" : s === "roi" ? "ROI" : "A-Z"}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04]">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards View (Super Reactive Grid) */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
          {positions.map((pos) => {
            const ep = Number(pos.entryPrice || 0);
            const lp = Number(pos.currentPrice || ep);
            const roi = Number(pos.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
            const calcDays = pos.entryDate
              ? Math.max(1, Math.round((Date.now() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
              : 1;
            const days = Number(pos.holdingDays || calcDays);
            const userPos = portfolio.find((p) => p.symbol === pos.symbol);

            return (
              <QuantSyncAlertCard
                key={pos.symbol}
                mode="active"
                symbol={pos.symbol}
                strategyName={pos.strategyName || "INSTITUTIONAL POCKET PIVOT · SLEEVE 2"}
                entryPrice={ep}
                exitOrCurrentPrice={lp}
                returnPct={roi}
                holdingDays={days}
                entryDate={pos.entryDate}
                onOpenChart={onOpenChart}
                onOpenSellModal={userPos && onOpenSellModal ? () => onOpenSellModal(userPos) : undefined}
                onOpenBuyModal={onOpenBuyModal ? () => onOpenBuyModal(pos.symbol, lp, pos.strategyName) : undefined}
                isBought={!!userPos}
              />
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                    onClick={() => setSortBy("symbol")}
                    title="Sort by Symbol (A-Z)"
                  >
                    Symbol {sortBy === "symbol" && "▾"}
                  </th>
                  <th className="py-3 px-3">Entry</th>
                  <th className="py-3 px-3">Current</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                    onClick={() => setSortBy("roi")}
                    title="Sort by ROI"
                  >
                    ROI {sortBy === "roi" && "▾"}
                  </th>
                  <th className="py-3 px-3">Signal (Status)</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                    onClick={() => setSortBy("days")}
                    title="Sort by Days (Latest Entry first)"
                  >
                    Days {sortBy === "days" && "▾"}
                  </th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {positions.map((pos) => {
                  const ep = Number(pos.entryPrice || 0);
                  const lp = Number(pos.currentPrice || ep);
                  const roi = Number(pos.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
                  const isGain = roi >= 0;
                  const calcDays = pos.entryDate
                    ? Math.max(1, Math.round((Date.now() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
                    : 1;
                  const days = Number(pos.holdingDays || calcDays);

                  return (
                    <tr
                      key={pos.symbol}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => onOpenChart(pos.symbol)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                          {pos.symbol}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          {pos.strategyName || "Algo"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                        ₹{ep.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        ₹{lp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={`font-black text-xs ${isGain ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isGain ? "+" : ""}{roi.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {(() => {
                          const status = getSignalStatus("active", days, roi);
                          return (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border shadow-2xs ${status.badgeClass}`}
                              title={status.tooltip}
                            >
                              {status.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {days}d
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChart(pos.symbol);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[10px] font-bold text-slate-900 dark:text-white transition-colors"
                        >
                          Chart
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

