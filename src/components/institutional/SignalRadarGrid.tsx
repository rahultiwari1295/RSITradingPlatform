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
            const price = Number(item.currentPrice || item.entryPrice || item.price || 0);
            const entryPrice = Number(item.entryPrice || price);
            const roi = item.currentROI ?? (entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100 : 0);
            const stars = typeof item.stars === "number" ? item.stars : 4.0;
            const inPortfolio = portfolioSymbols.includes(sym);

            // Target & Stop Loss Plan (using real engine parameters or sensible default swing metrics)
            const targetPct = item.target1Pct ? Math.abs(item.target1Pct) : 12.0;
            const stopPct = item.stopPct ? -Math.abs(item.stopPct) : -4.5;
            const targetPrice = item.target1Price || (price * (1 + targetPct / 100));
            const stopPrice = item.stopPrice || (price * (1 + stopPct / 100));
            const rrRatio = (Math.abs(targetPct) / Math.max(0.1, Math.abs(stopPct))).toFixed(1);

            // Confluence & Reasoning tags (directly from API)
            const tags: string[] = Array.isArray(item.footerTags) && item.footerTags.length > 0
              ? item.footerTags
              : [
                  item.slippageText || (roi >= 0 ? `+${roi.toFixed(1)}% at entry` : `${roi.toFixed(1)}%`),
                  item.mlProbability ? `🤖 ML ${(item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100).toFixed(0)}%` : null,
                  item.technicalScore ? `📈 Tech Score ${item.technicalScore}` : null,
                ].filter(Boolean) as string[];

            return (
              <div
                key={`${sym}-${idx}`}
                className="group relative overflow-hidden rounded-2xl p-4 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-white/5 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 shadow-xs hover:shadow-lg hover:shadow-emerald-500/5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Symbol, Strategy, Rating & Action Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                          {sym}
                        </span>
                        {inPortfolio && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                            Holding
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {item.strategyName || "Momentum Setup"}
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
                      {item.entryDate && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.entryDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Current Status Ribbon */}
                  <div className="flex items-baseline justify-between p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 font-mono mb-2.5">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block font-sans font-semibold">Live Price (LTP)</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase block font-sans font-semibold">Entry Status</span>
                      <span className={`text-xs font-bold ${roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {item.slippageText || `${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
                      </span>
                    </div>
                  </div>

                  {/* Trade Setup: Target & Stop Loss with 1:X R:R */}
                  <div className="flex items-center justify-between text-[11px] font-mono px-2.5 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/40 dark:border-white/5 mb-2.5">
                    <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1 font-semibold">
                      Stop ₹{stopPrice.toLocaleString("en-IN", { maximumFractionDigits: 1 })} ({stopPct}%)
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 font-bold">|</span>
                    <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      Target ₹{targetPrice.toLocaleString("en-IN", { maximumFractionDigits: 1 })} (+{targetPct}%)
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 font-bold">|</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">
                      1:{rrRatio} R:R
                    </span>
                  </div>

                  {/* Confluence Tags from Real API Data */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons: Chart & Take Trade */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => onOpenChart(sym)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Open live chart in TradingView"
                  >
                    <LineChart className="w-3.5 h-3.5 text-cyan-500" />
                    Chart
                  </button>

                  <button
                    onClick={() => onOpenBuyModal(sym, price, item.strategyName)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-500/30 transition-all cursor-pointer"
                    title="Add to portfolio or execute trade"
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
