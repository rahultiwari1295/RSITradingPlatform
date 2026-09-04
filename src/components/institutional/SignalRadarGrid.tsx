import React, { useState } from "react";
import {
  Zap,
  Star,
  LineChart,
  ShoppingCart,
  Calendar,
  Clock,
  Brain,
  BarChart3,
  Target,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { ToBuySignal } from "../../types";

interface SignalRadarGridProps {
  signals: ToBuySignal[];
  portfolioSymbols?: string[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, price: number, strategy?: string) => void;
}

const avatarGradients = [
  "from-indigo-500 to-violet-600",
  "from-orange-400 to-rose-500",
  "from-emerald-400 to-teal-600",
  "from-pink-400 to-fuchsia-600",
  "from-cyan-400 to-blue-600",
  "from-amber-400 to-orange-600",
];

export default function SignalRadarGrid({
  signals = [],
  portfolioSymbols = [],
  onOpenChart,
  onOpenBuyModal,
}: SignalRadarGridProps) {
  const [filterAction, setFilterAction] = useState<"ALL" | "BUY_NOW" | "WAIT" | "MISSED">("ALL");

  const filtered = signals.filter((sig) => {
    if (filterAction === "ALL") return true;
    const action = (sig.action || "BUY_NOW").toUpperCase();
    if (filterAction === "BUY_NOW") return action === "BUY_NOW" || action === "BUY";
    if (filterAction === "WAIT") return action === "WAIT" || action === "HOLD";
    if (filterAction === "MISSED") return action === "MISSED" || action === "RUNNER" || action === "PROFIT";
    return true;
  });

  const getActionBadge = (action?: string) => {
    const act = (action || "BUY_NOW").toUpperCase();
    if (act === "BUY" || act === "BUY_NOW") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {act === "BUY_NOW" ? "BUY NOW" : "BUY"}
        </span>
      );
    }
    if (act === "WAIT" || act === "HOLD") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
          WAIT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/25">
        MISSED
      </span>
    );
  };

  if (signals.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] animate-fade-in">
        <Zap className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No active signals</p>
        <p className="text-xs text-slate-400 mt-0.5">Signals will appear here when triggered by the engine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Section Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/15">
            <Zap className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Signal Radar
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            {filtered.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04]">
          {(["ALL", "BUY_NOW", "WAIT", "MISSED"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setFilterAction(a)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterAction === a
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {a === "BUY_NOW" ? "Buy" : a === "ALL" ? "All" : a.charAt(0) + a.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid — Responsive: 1 col mobile, 2 tablet, 3 desktop */}
      <div className="signal-grid">
        {filtered.map((item, idx) => {
          const sym = item.symbol;
          const price = Number(item.currentPrice || item.entryPrice || item.price || 0);
          const entryPrice = Number(item.entryPrice || price);
          const roi = item.currentROI ?? (entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100 : 0);
          const isUp = roi >= 0;
          const stars = typeof item.stars === "number" ? item.stars : 4.0;
          const inPortfolio = portfolioSymbols.includes(sym);
          const gradClass = avatarGradients[idx % avatarGradients.length];

          // Days held
          const daysHeld = item.holdingDays || (item.entryDate
            ? Math.max(1, Math.round((Date.now() - new Date(item.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
            : 0);

          // ML & Composite scores
          const mlScore = item.mlProbability
            ? (item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100)
            : null;
          const compositeScore = item.compositeScore ?? null;

          // Target & Stop
          const targetPct = item.target1Pct ? Math.abs(item.target1Pct) : null;
          const stopPct = item.stopPct ? -Math.abs(item.stopPct) : null;
          const targetPrice = item.target1Price || (targetPct ? price * (1 + targetPct / 100) : null);
          const stopPrice = item.stopPrice || (stopPct ? price * (1 + stopPct / 100) : null);
          const rrRatio = targetPct && stopPct ? (Math.abs(targetPct) / Math.max(0.1, Math.abs(stopPct))).toFixed(1) : null;

          return (
            <div
              key={`${sym}-${idx}`}
              className={`qs-card p-4 flex flex-col justify-between animate-fade-in-up stagger-${Math.min(idx + 1, 10)}`}
            >
              {/* Row 1: Symbol + Strategy + Action Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 font-mono`}>
                      {sym.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[14px] text-slate-900 dark:text-white tracking-tight truncate">
                          {sym}
                        </span>
                        {inPortfolio && (
                          <span className="px-1.5 py-px rounded-md text-[8px] font-extrabold uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            Held
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                          {item.strategyName || "Momentum"}
                        </span>
                        <span className="text-[10px] text-amber-500 flex items-center gap-0.5 font-semibold shrink-0">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          {stars.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {getActionBadge(item.action)}
                  </div>
                </div>

                {/* Row 2: Price metrics — Current | Entry | ROI */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Current</span>
                    <span className="font-black text-[13px] text-slate-900 dark:text-white font-mono tabular block mt-0.5">
                      ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Entry</span>
                    <span className="font-bold text-[13px] text-slate-700 dark:text-slate-300 font-mono tabular block mt-0.5">
                      ₹{entryPrice.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                    </span>
                  </div>
                  <div className={`p-2 rounded-xl border ${isUp ? 'bg-emerald-50 dark:bg-emerald-500/[0.06] border-emerald-200/60 dark:border-emerald-500/15' : 'bg-rose-50 dark:bg-rose-500/[0.06] border-rose-200/60 dark:border-rose-500/15'}`}>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">ROI</span>
                    <span className={`font-black text-[13px] font-mono tabular flex items-center gap-0.5 mt-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isUp ? "+" : ""}{roi.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Row 3: Entry Date + Days Held + ML + Composite */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] mb-3 px-1">
                  {item.entryDate && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium">Entry:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{item.entryDate}</span>
                    </div>
                  )}
                  {daysHeld > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium">Held:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{daysHeld}d</span>
                    </div>
                  )}
                  {mlScore !== null && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Brain className="w-3 h-3 text-violet-400 shrink-0" />
                      <span className="font-medium">ML:</span>
                      <span className="font-bold text-violet-600 dark:text-violet-400 font-mono">{mlScore.toFixed(0)}%</span>
                    </div>
                  )}
                  {compositeScore !== null && (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <BarChart3 className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="font-medium">Score:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono">{compositeScore}</span>
                    </div>
                  )}
                </div>

                {/* Row 4: Target & Stop (only show if real data exists) */}
                {(targetPrice || stopPrice) && (
                  <div className="flex items-center justify-between text-[10px] font-mono px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] mb-3">
                    {stopPrice && stopPct && (
                      <span className="text-rose-500 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        SL ₹{stopPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({stopPct}%)
                      </span>
                    )}
                    {rrRatio && (
                      <span className="text-slate-500 font-bold">1:{rrRatio}</span>
                    )}
                    {targetPrice && targetPct && (
                      <span className="text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        T ₹{targetPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })} (+{targetPct}%)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Row 5: Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                <button
                  onClick={() => onOpenChart(sym)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer qs-btn-press"
                >
                  <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                  Chart
                </button>
                <button
                  onClick={() => onOpenBuyModal(sym, price, item.strategyName)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/25 transition-all cursor-pointer qs-btn-press"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Take Trade
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
