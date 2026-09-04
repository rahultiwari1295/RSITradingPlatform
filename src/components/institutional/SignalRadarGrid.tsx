import React, { useState } from "react";
import {
  Zap,
  Star,
  LineChart,
  ShoppingCart,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { ToBuySignal } from "../../types";

interface SignalRadarGridProps {
  signals: ToBuySignal[];
  portfolioSymbols?: string[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, price: number, strategy?: string) => void;
}

export default function SignalRadarGrid({
  signals = [],
  portfolioSymbols = [],
  onOpenChart,
  onOpenBuyModal,
}: SignalRadarGridProps) {
  const [filterAction, setFilterAction] = useState<"ALL" | "BUY_NOW" | "RUNNER" | "WAIT">("ALL");

  const filtered = signals.filter((sig) => {
    if (filterAction === "ALL") return true;
    const action = sig.action || "BUY_NOW";
    if (filterAction === "BUY_NOW") return action === "BUY_NOW" || action === "BUY";
    if (filterAction === "RUNNER") return action === "RUNNER" || action === "PROFIT";
    if (filterAction === "WAIT") return action === "WAIT" || action === "HOLD";
    return true;
  });

  const getActionBadge = (action?: string) => {
    const act = (action || "BUY_NOW").toUpperCase();
    if (act.includes("BUY")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/40 shadow-xs shadow-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          BUY NOW
        </span>
      );
    }
    if (act.includes("RUNNER") || act.includes("PROFIT")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/40">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          RUNNER (+10%+)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/40">
        WAIT / PULLBACK
      </span>
    );
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/5">
      {/* Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Institutional Signal Radar
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {filtered.length} Dispatched
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time algorithmic trigger alerts with machine learning probability, risk scores, and execution targets.
          </p>
        </div>

        {/* Action Filter Pills */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
          {(["ALL", "BUY_NOW", "RUNNER", "WAIT"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setFilterAction(a)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterAction === a
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {a.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tactile Signal Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
          <Zap className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No active signals in this category</p>
          <p className="text-xs text-slate-400 mt-0.5">Check back during the 15:15 IST execution sweep.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item, idx) => {
            const sym = item.symbol;
            const price = item.currentPrice || item.entryPrice || item.price || 0;
            const score = item.compositeScore ?? 84;
            const stars = item.stars ?? 4.5;
            const inPortfolio = portfolioSymbols.includes(sym);
            const stopPrice = item.stopPrice || (price * 0.94);
            const targetPrice = item.target1Price || (price * 1.14);
            const stopPct = -Math.abs(item.stopPct || 6.0);
            const targetPct = +Math.abs(item.target1Pct || 14.0);

            return (
              <div
                key={`${sym}-${idx}`}
                className="group relative overflow-hidden rounded-2xl p-4 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 shadow-xs hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
              >
                {/* Top Row: Symbol, Star rating & Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                        {sym}
                      </span>
                      {inPortfolio && (
                        <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                          In Portfolio
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item.strategyName || "Momentum Breakout"}
                      </span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-xs font-semibold text-amber-500 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {stars.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {getActionBadge(item.action)}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.entryDate ? `⚡ ${item.entryDate.slice(5)}` : "Today"}
                    </span>
                  </div>
                </div>

                {/* Price & Telemetry Score Ribbon */}
                <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 font-mono mb-3">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">LTP</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">ML Prob</span>
                    <span className="font-bold text-violet-500 dark:text-violet-400 text-xs">
                      {item.mlProbability ? `${(item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100).toFixed(0)}%` : "76%"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Quality</span>
                    <span className="font-black text-emerald-500 text-xs">{score}/100</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Risk Grade</span>
                    <span className="font-bold text-cyan-500 text-xs">
                      {item.riskScore ? `${item.riskScore}/100` : "Low"}
                    </span>
                  </div>
                </div>

                {/* Execution Trade Plan: SL & Target */}
                <div className="flex items-center justify-between text-[11px] font-mono px-2 py-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/40 dark:border-white/5 mb-3">
                  <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1">
                    Stop: ₹{stopPrice.toFixed(1)} ({stopPct}%)
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                    T1: ₹{targetPrice.toFixed(1)} (+{targetPct}%)
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-slate-600 dark:text-slate-400 font-semibold">
                    1:2.3 R:R
                  </span>
                </div>

                {/* Action Buttons: Chart & Buy */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onOpenChart(sym)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                    Chart
                  </button>

                  <button
                    onClick={() => onOpenBuyModal(sym, price, item.strategyName)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-500/30 transition-all cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Take Trade
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
