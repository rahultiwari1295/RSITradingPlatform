import React, { useState } from "react";
import {
  Briefcase,
  LineChart,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  BarChart3,
  Calendar,
} from "lucide-react";
import { InTradeTrade, ManualPortfolioTrade } from "../../types";

interface ActivePositionsBookProps {
  inTradeTrades: InTradeTrade[];
  portfolio?: ManualPortfolioTrade[];
  onOpenChart: (symbol: string) => void;
  onOpenSellModal?: (trade: ManualPortfolioTrade) => void;
}

const avatarGradients = [
  "from-emerald-400 to-teal-600",
  "from-cyan-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-orange-400 to-rose-500",
  "from-indigo-400 to-blue-600",
  "from-pink-400 to-fuchsia-600",
];

export default function ActivePositionsBook({
  inTradeTrades = [],
  portfolio = [],
  onOpenChart,
  onOpenSellModal,
}: ActivePositionsBookProps) {
  const [sortBy, setSortBy] = useState<"roi" | "days" | "symbol">("roi");

  const positions = [...inTradeTrades].sort((a, b) => {
    if (sortBy === "roi") return (b.currentROI || 0) - (a.currentROI || 0);
    if (sortBy === "days") return (b.holdingDays || 0) - (a.holdingDays || 0);
    return (a.symbol || "").localeCompare(b.symbol || "");
  });

  const getStatusBadge = (roi: number) => {
    if (roi >= 25) return { label: "Compounder", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" };
    if (roi >= 10) return { label: "Runner", cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25" };
    if (roi >= 0) return { label: "Active", cls: "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.06]" };
    return { label: "Drawdown", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25" };
  };

  if (positions.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] animate-fade-in">
        <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No active positions</p>
        <p className="text-xs text-slate-400 mt-0.5">Check Signal Radar for fresh trade triggers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">
            <Briefcase className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Active Positions
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono">
            {positions.length}
          </span>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04]">
          {(["roi", "days", "symbol"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                sortBy === s
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {s === "roi" ? "ROI" : s === "days" ? "Days" : "A-Z"}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Cards (shown below md) */}
      <div className="block md:hidden space-y-3">
        {positions.map((pos, idx) => {
          const ep = Number(pos.entryPrice || 0);
          const lp = Number(pos.currentPrice || ep);
          const roi = Number(pos.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
          const isGain = roi >= 0;
          const calcDays = pos.entryDate
            ? Math.max(1, Math.round((Date.now() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
            : 1;
          const days = Number(pos.holdingDays || calcDays);
          const badge = getStatusBadge(roi);
          const userPos = portfolio.find(p => p.symbol === pos.symbol);
          const gradClass = avatarGradients[idx % avatarGradients.length];

          const mlScore = pos.mlProbability
            ? (pos.mlProbability > 1 ? pos.mlProbability : pos.mlProbability * 100)
            : null;
          const compositeScore = pos.compositeScore ?? null;

          return (
            <div key={pos.symbol} className={`qs-card p-4 animate-fade-in-up stagger-${Math.min(idx + 1, 10)}`}>
              {/* Top: Symbol + ROI */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 font-mono`}>
                    {pos.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[14px] text-slate-900 dark:text-white tracking-tight truncate">
                        {pos.symbol}
                      </span>
                      <span className={`px-1.5 py-px rounded-md text-[8px] font-extrabold uppercase border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {pos.strategyName || "Algo Setup"}
                    </span>
                  </div>
                </div>

                <div className={`text-right font-mono`}>
                  <span className={`text-[15px] font-black tabular ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isGain ? "+" : ""}{roi.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Price Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Current</span>
                  <span className="font-bold text-[12px] text-slate-900 dark:text-white font-mono tabular block mt-0.5">
                    ₹{lp.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Entry</span>
                  <span className="font-bold text-[12px] text-slate-700 dark:text-slate-300 font-mono tabular block mt-0.5">
                    ₹{ep.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Held</span>
                  <span className="font-bold text-[12px] text-slate-700 dark:text-slate-300 font-mono block mt-0.5">
                    {days}d
                  </span>
                </div>
              </div>

              {/* Metadata: Entry Date + ML + Composite */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mb-3 px-0.5">
                {pos.entryDate && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{pos.entryDate}</span>
                  </div>
                )}
                {mlScore !== null && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Brain className="w-3 h-3 text-violet-400 shrink-0" />
                    <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{mlScore.toFixed(0)}%</span>
                  </div>
                )}
                {compositeScore !== null && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <BarChart3 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{compositeScore}</span>
                  </div>
                )}
                {userPos?.quantity && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="text-[10px] font-bold text-indigo-500">{userPos.quantity} shares</span>
                  </div>
                )}
              </div>

              {/* ROI Progress */}
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isGain ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(100, Math.max(8, Math.abs(roi) * 3))}%` }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                <button
                  onClick={() => onOpenChart(pos.symbol)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer qs-btn-press"
                >
                  <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                  Chart
                </button>
                {userPos && onOpenSellModal && (
                  <button
                    onClick={() => onOpenSellModal(userPos)}
                    className="flex-1 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer qs-btn-press"
                  >
                    Exit Position
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (shown at md+) */}
      <div className="hidden md:block rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-3">Entry</th>
                <th className="py-3 px-3">Current</th>
                <th className="py-3 px-3">ROI</th>
                <th className="py-3 px-3">Days</th>
                <th className="py-3 px-3">ML</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Status</th>
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
                const badge = getStatusBadge(roi);
                const userPos = portfolio.find(p => p.symbol === pos.symbol);

                const mlScore = pos.mlProbability
                  ? (pos.mlProbability > 1 ? pos.mlProbability : pos.mlProbability * 100)
                  : null;

                return (
                  <tr
                    key={pos.symbol}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                        {pos.symbol}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {pos.strategyName || "Algo"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      ₹{ep.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                      {pos.entryDate && <span className="text-[10px] text-slate-400 block font-sans">{pos.entryDate}</span>}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      ₹{lp.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="flex items-center gap-1">
                        {isGain ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                        <span className={`font-black text-xs ${isGain ? "text-emerald-500" : "text-rose-500"}`}>
                          {isGain ? "+" : ""}{roi.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-16 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${isGain ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, Math.max(8, Math.abs(roi) * 3))}%` }} />
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {days}d
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                      {mlScore ? `${mlScore.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                      {pos.compositeScore ?? "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenChart(pos.symbol)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-cyan-500/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                        </button>
                        {userPos && onOpenSellModal && (
                          <button
                            onClick={() => onOpenSellModal(userPos)}
                            className="px-2 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Exit
                          </button>
                        )}
                      </div>
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
