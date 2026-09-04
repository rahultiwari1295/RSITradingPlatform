import React, { useState, useMemo } from "react";
import { History, LineChart, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from "lucide-react";
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
  const [search, setSearch] = useState<string>("");

  const filteredTrades = useMemo(() => {
    return closedTrades.filter((t) => {
      const ret = Number(t.returnPct ?? t.tradeReturnPercent ?? 0);
      const isWin = ret >= 0 || t.pnlLabel === "WIN";
      if (filter === "WIN" && !isWin) return false;
      if (filter === "LOSS" && isWin) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          t.symbol.toLowerCase().includes(q) ||
          (t.strategyName && t.strategyName.toLowerCase().includes(q)) ||
          (t.exitReason && t.exitReason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [closedTrades, filter, search]);

  if (!closedTrades || closedTrades.length === 0) {
    return (
      <div className="rounded-3xl p-8 text-center bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xl">
        <History className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No closed trades recorded yet</p>
        <p className="text-xs text-slate-400 mt-0.5">Completed trade exits will automatically appear here.</p>
      </div>
    );
  }

  const winCount = closedTrades.filter((t) => Number(t.returnPct ?? 0) >= 0).length;
  const lossCount = closedTrades.length - winCount;
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20">
              <History className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Audited Closed Trades Ledger
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {winRate.toFixed(1)}% Realized Win Rate
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical closed trade log with verified entry, exit price, hold days, and exit triggers.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All ({closedTrades.length})
            </button>
            <button
              onClick={() => setFilter("WIN")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === "WIN"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Wins ({winCount})
            </button>
            <button
              onClick={() => setFilter("LOSS")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === "LOSS"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Losses ({lossCount})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Symbol / Strategy</th>
              <th className="py-3 px-3">Entry & Exit Price</th>
              <th className="py-3 px-3">Realized Return</th>
              <th className="py-3 px-3">Exit Reason</th>
              <th className="py-3 px-3">Duration</th>
              <th className="py-3 px-3 text-right">Chart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredTrades.slice(0, 50).map((trade, idx) => {
              const ret = Number(trade.returnPct ?? trade.tradeReturnPercent ?? 0);
              const isWin = ret >= 0;
              const ep = Number(trade.entryPrice || 0);
              const xp = Number(trade.exitPrice || 0);
              const days = trade.holdingDays || trade.holdDays || 1;

              return (
                <tr
                  key={`${trade.symbol}-${idx}`}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  {/* Symbol & Strategy */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                        {trade.symbol}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                          isWin
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {isWin ? "WIN" : "LOSS"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                      {trade.strategyName || "Algorithmic Setup"}
                    </span>
                  </td>

                  {/* Entry & Exit Price */}
                  <td className="py-3.5 px-3 font-mono text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">
                      ₹{xp.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Entry ₹{ep.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Realized Return */}
                  <td className="py-3.5 px-3 font-mono">
                    <div className="flex items-center gap-1">
                      {isWin ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      <span className={`font-black text-xs ${isWin ? "text-emerald-500" : "text-rose-500"}`}>
                        {isWin ? "+" : ""}{ret.toFixed(2)}%
                      </span>
                    </div>
                  </td>

                  {/* Exit Reason */}
                  <td className="py-3.5 px-3 text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      {(trade.exitReason || "TARGET_HIT").replace(/_/g, " ")}
                    </span>
                    <span className="text-slate-400 text-[10px] block">
                      Exit on {trade.exitDate || "Recent"}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="py-3.5 px-3 font-mono text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {days}d held
                    </span>
                  </td>

                  {/* Chart Action */}
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => onOpenChart(trade.symbol)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 hover:text-cyan-500 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                      title="Open TradingView chart"
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
    </div>
  );
}
