import React, { useState, useMemo } from "react";
import { History, LineChart, ArrowUpRight, ArrowDownRight, Clock, Calendar } from "lucide-react";
import { ClosedTrade } from "../../types";

interface ClosedTradesLedgerProps {
  closedTrades: ClosedTrade[];
  onOpenChart: (symbol: string) => void;
}

export default function ClosedTradesLedger({
  closedTrades = [],
  onOpenChart,
}: ClosedTradesLedgerProps) {
  const [filter, setFilter] = useState<"ALL" | "WIN" | "LOSS">("ALL");

  const filteredTrades = useMemo(() => {
    return closedTrades.filter((t) => {
      const ret = Number(t.returnPct ?? (t as any).tradeReturnPercent ?? 0);
      const isWin = ret >= 0 || t.pnlLabel === "WIN";
      if (filter === "WIN" && !isWin) return false;
      if (filter === "LOSS" && isWin) return false;
      return true;
    });
  }, [closedTrades, filter]);

  if (!closedTrades || closedTrades.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] animate-fade-in">
        <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No closed trades yet</p>
        <p className="text-xs text-slate-400 mt-0.5">Completed exits will appear here automatically.</p>
      </div>
    );
  }

  const winCount = closedTrades.filter((t) => Number(t.returnPct ?? 0) >= 0).length;
  const lossCount = closedTrades.length - winCount;
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/15">
            <History className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Closed Trades
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            {winRate.toFixed(0)}% Win
          </span>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04]">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              filter === "ALL" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            All ({closedTrades.length})
          </button>
          <button
            onClick={() => setFilter("WIN")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              filter === "WIN" ? "bg-emerald-500 text-white shadow-xs" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Wins ({winCount})
          </button>
          <button
            onClick={() => setFilter("LOSS")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              filter === "LOSS" ? "bg-rose-500 text-white shadow-xs" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Losses ({lossCount})
          </button>
        </div>
      </div>

      {/* Mobile Cards (below md) */}
      <div className="block md:hidden space-y-3">
        {filteredTrades.slice(0, 50).map((trade, idx) => {
          const ret = Number(trade.returnPct ?? (trade as any).tradeReturnPercent ?? 0);
          const isWin = ret >= 0;
          const ep = Number(trade.entryPrice || 0);
          const xp = Number(trade.exitPrice || 0);
          const days = (trade as any).holdingDays || (trade as any).holdDays || 1;

          return (
            <div key={`${trade.symbol}-${idx}`} className={`qs-card p-4 animate-fade-in-up stagger-${Math.min(idx + 1, 10)}`}>
              {/* Top: Symbol + Return */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[14px] text-slate-900 dark:text-white tracking-tight truncate">
                    {trade.symbol}
                  </span>
                  <span className={`px-1.5 py-px rounded-md text-[8px] font-extrabold uppercase border ${
                    isWin
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                  }`}>
                    {isWin ? "WIN" : "LOSS"}
                  </span>
                </div>
                <span className={`font-black text-[15px] font-mono tabular ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {isWin ? "+" : ""}{ret.toFixed(2)}%
                </span>
              </div>

              {/* Price Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Entry</span>
                  <span className="font-bold text-[12px] text-slate-700 dark:text-slate-300 font-mono tabular block mt-0.5">
                    ₹{ep.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Exit</span>
                  <span className="font-bold text-[12px] text-slate-900 dark:text-white font-mono tabular block mt-0.5">
                    ₹{xp.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Held</span>
                  <span className="font-bold text-[12px] text-slate-700 dark:text-slate-300 font-mono block mt-0.5">
                    {days}d
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-0.5">
                <span className="font-medium">{trade.strategyName || "Algo"}</span>
                <span className="font-medium">{(trade.exitReason || "TARGET_HIT").replace(/_/g, " ")}</span>
              </div>

              {/* Chart Button */}
              <button
                onClick={() => onOpenChart(trade.symbol)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer qs-btn-press"
              >
                <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                View Chart
              </button>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (md+) */}
      <div className="hidden md:block rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-3">Entry</th>
                <th className="py-3 px-3">Exit</th>
                <th className="py-3 px-3">Return</th>
                <th className="py-3 px-3">Exit Reason</th>
                <th className="py-3 px-3">Days</th>
                <th className="py-3 px-3 text-right">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredTrades.slice(0, 50).map((trade, idx) => {
                const ret = Number(trade.returnPct ?? (trade as any).tradeReturnPercent ?? 0);
                const isWin = ret >= 0;
                const ep = Number(trade.entryPrice || 0);
                const xp = Number(trade.exitPrice || 0);
                const days = (trade as any).holdingDays || (trade as any).holdDays || 1;

                return (
                  <tr key={`${trade.symbol}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                          {trade.symbol}
                        </span>
                        <span className={`px-1.5 py-px rounded-md text-[8px] font-extrabold uppercase border ${
                          isWin
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                        }`}>
                          {isWin ? "WIN" : "LOSS"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {trade.strategyName || "Algo"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      ₹{ep.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                      <span className="text-[10px] text-slate-400 font-sans block">{trade.entryDate}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      ₹{xp.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                      {trade.exitDate && <span className="text-[10px] text-slate-400 font-sans block">{trade.exitDate}</span>}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className={`font-black text-xs flex items-center gap-0.5 ${isWin ? "text-emerald-500" : "text-rose-500"}`}>
                        {isWin ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isWin ? "+" : ""}{ret.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {(trade.exitReason || "TARGET_HIT").replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {days}d
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenChart(trade.symbol)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-cyan-500/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
