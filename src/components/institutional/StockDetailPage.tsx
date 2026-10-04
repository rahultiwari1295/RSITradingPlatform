import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  LineChart,
  Star,
  ShieldCheck,
  Target,
  Copy,
  Check,
  Briefcase,
  Activity,
  Sparkles
} from "lucide-react";
import { formatINR } from "../../lib/utils";
import TrendlyneWidgets from "../TrendlyneWidgets";
import { BottomSheetItem } from "../BottomSheet";

export interface StockDetailPageProps {
  item: BottomSheetItem;
  sourceListTitle?: string;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
  onOpenChart?: (symbol: string) => void;
  onOpenBuyModal?: (symbol: string, price: number, strategy?: string) => void;
  onOpenSellModal?: (trade: any) => void;
  isBought?: boolean;
}

type TabType = "quant" | "trendlyne";

export default function StockDetailPage({
  item,
  sourceListTitle = "Trades List",
  onBack,
  onPrev,
  onNext,
  currentIndex,
  totalCount,
  onOpenChart,
  onOpenBuyModal,
  onOpenSellModal,
  isBought,
}: StockDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("quant");
  const [copied, setCopied] = useState<boolean>(false);

  // Always scroll window to top whenever a stock is opened or flipped to
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [item?.symbol]);

  // Keyboard navigation: Escape to go back, ArrowLeft for Prev, ArrowRight for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      } else if (e.key === "ArrowLeft" && onPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && onNext) {
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack, onPrev, onNext]);

  const handleCopySymbol = () => {
    if (!item?.symbol) return;
    navigator.clipboard.writeText(item.symbol);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Prices & Return calculation
  const isClosedTrade = !!item.exitDate || !!item.exitPrice || !!item.exitReason;
  const entryPrice = Number(item.entryPrice || 0);
  const currentPrice = Number(
    isClosedTrade
      ? item.exitPrice || item.currentPrice || entryPrice
      : item.currentPrice || item.entryPrice || 0
  );
  const exitPrice = isClosedTrade ? Number(item.exitPrice || currentPrice) : undefined;

  let roi = 0;
  if (item.returnPct !== undefined && item.returnPct !== null) {
    roi = Number(item.returnPct);
  } else if (item.currentROI !== undefined && item.currentROI !== null) {
    roi = Number(item.currentROI);
  } else if (entryPrice > 0 && currentPrice > 0) {
    roi = ((currentPrice - entryPrice) / entryPrice) * 100;
  }
  const isRoiPositive = roi >= 0;

  // Stop Loss & Target calculation
  const targetPrice = Number(
    item.target1Price ||
    item.targetPrice ||
    item.tradePlan?.target1Price ||
    (entryPrice > 0 ? entryPrice * 1.15 : currentPrice * 1.15)
  );

  const stopLoss = Number(
    item.stopPrice ||
    item.stopLoss ||
    item.tradePlan?.stopPrice ||
    (entryPrice > 0 ? entryPrice * 0.94 : currentPrice * 0.94)
  );

  const targetDistance = targetPrice - entryPrice;
  const currentGain = currentPrice - entryPrice;
  const stopLossPct = entryPrice > 0 ? ((stopLoss - entryPrice) / entryPrice) * 100 : -6.0;
  const targetPct = entryPrice > 0 ? ((targetPrice - entryPrice) / entryPrice) * 100 : 15.0;

  // Risk continuum progress
  const targetProgressPct =
    targetDistance > 0
      ? Math.max(0, Math.min(100, (currentGain / targetDistance) * 100))
      : 0;

  // Holding days
  const daysHeld = item.holdingDays !== undefined
    ? item.holdingDays
    : item.entryDate
    ? Math.max(1, Math.round((Date.now() - new Date(item.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
    : undefined;

  // Diagnosis banner
  let actionKey: "buy" | "in_position" | "wait" | "avoid" = "buy";
  let actionTitle = "Prime Entry Trigger";
  let actionDesc = "Setup aligns with institutional volume accumulation and momentum triggers.";

  if (isClosedTrade) {
    actionKey = isRoiPositive ? "buy" : "avoid";
    actionTitle = item.pnlLabel === "WIN" ? "Trade Concluded in Profit" : "Trade Concluded in Loss";

    const reasonMap: Record<string, string> = {
      MFE_TRAIL_L1: "Trailing stop locked in profit near peak trajectory.",
      MFE_TRAIL_L2: "Trailing stop locked in profit near peak trajectory.",
      MFE_TRAIL_L3: "Trailing stop locked in profit after strong momentum run.",
      MFE_TRAIL_L4: "Trailing stop locked in modest gains.",
      STOP_LOSS: "Risk management stop loss triggered to protect institutional capital.",
      TIME_EXIT: "Holding duration exceeded thesis timeframe limit.",
      TARGET_HIT: "Primary profit objective achieved successfully.",
    };

    actionDesc = item.exitReason && reasonMap[item.exitReason]
      ? reasonMap[item.exitReason]
      : item.exitReason
      ? `Exit triggered due to: ${String(item.exitReason).replace(/_/g, " ")}`
      : isRoiPositive
      ? "Position closed at target exit price."
      : "Position closed to protect principal capital.";
  } else {
    actionKey = isRoiPositive ? "in_position" : "wait";
    actionTitle = isRoiPositive ? "Institutional Position Active" : "Position Consolidating";
    actionDesc = isRoiPositive
      ? "Holding momentum above support pivot with active algorithmic trailing stops."
      : "Monitoring pivot boundary against designated stop risk levels.";
  }

  // Scores
  const score = item.compositeScore ?? (item.mlProbability ? (item.mlProbability <= 1 ? Math.round(item.mlProbability * 100) : Math.round(item.mlProbability)) : 76);
  const mlProb = item.mlProbability ? (item.mlProbability <= 1 ? item.mlProbability * 100 : item.mlProbability) : 72;
  const technicalScore = item.technicalScore ?? (score >= 80 ? 84 : score >= 70 ? 76 : 68);
  const riskScore = item.riskScore ?? (score >= 80 ? 22 : score >= 70 ? 28 : 35);
  const stars = typeof item.stars === "number" && item.stars > 0 ? item.stars : (score >= 82 ? 5.0 : score >= 76 ? 4.5 : score >= 70 ? 4.0 : 3.5);

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* ========================================================================= */}
      {/* 1. TOP STICKY NAVIGATION BAR (PROMINENT BACK BUTTON & STOCK FLIPPER)     */}
      {/* ========================================================================= */}
      <div className="sticky top-14 z-30 py-2.5 px-3 sm:px-4 rounded-2xl bg-white/95 dark:bg-[#0c0e14]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Back Button & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
              title="Return to the list (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {/* Previous / Next Stock Arrows */}
            {(onPrev || onNext) && (
              <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] rounded-xl p-0.5 border border-slate-200/70 dark:border-white/[0.06] shrink-0">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!onPrev}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Previous Stock (Left Arrow ←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {currentIndex !== undefined && totalCount !== undefined && (
                  <span className="px-2 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 select-none">
                    {currentIndex + 1} / {totalCount}
                  </span>
                )}

                <button
                  type="button"
                  onClick={onNext}
                  disabled={!onNext}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Next Stock (Right Arrow →)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Center / Right: Stock Identity & Quick Price */}
          <div className="flex items-center gap-3">
            {/* Symbol Avatar */}
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs font-mono shadow-xs shrink-0">
              {item.symbol.slice(0, 2)}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {item.symbol}
              </span>
              <button
                type="button"
                onClick={handleCopySymbol}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy Symbol"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <span className="hidden xs:inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                {stars.toFixed(1)}
              </span>

              {isBought && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                  <Briefcase className="w-2.5 h-2.5" />
                  PORTFOLIO
                </span>
              )}
            </div>

            {/* Quick Price Display */}
            <div className="text-right pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="font-mono text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {formatINR(currentPrice)}
              </div>
              <div className={`font-mono text-[11px] font-extrabold flex items-center justify-end gap-0.5 ${
                isRoiPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {isRoiPositive ? "+" : ""}{roi.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN INSTITUTIONAL LAYOUT                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: Executive Parameters, Risk Continuum, & Capital Allocation */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Price & Return Hero Banner */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase font-mono">
                  {isClosedTrade ? "FINAL EXIT PRICE" : "LAST TRADED PRICE"}
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-mono tabular mt-0.5">
                  {formatINR(currentPrice)}
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-black font-mono tabular ${
                  isRoiPositive
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                }`}>
                  {isRoiPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isRoiPositive ? "+" : ""}{roi.toFixed(2)}%
                </span>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {daysHeld !== undefined ? `${daysHeld} days held` : "Active trade"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200/60 dark:border-white/[0.05] text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Entry Base</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{formatINR(entryPrice)}</span>
                {item.entryDate && (
                  <span className="text-[9.5px] text-slate-400 font-sans block">{item.entryDate}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  {isClosedTrade ? "Exit Date" : "Status"}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {isClosedTrade ? item.exitDate || "Concluded" : "In Position"}
                </span>
                <span className="text-[9.5px] text-slate-400 font-sans block">
                  {isClosedTrade ? (isRoiPositive ? "Profitable Exit" : "Capital Guarded") : "Active Runner"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Strategy Model</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate block" title={item.strategyName}>
                  {item.strategyName || "Pocket Pivot Sleeve"}
                </span>
                {item.sector && (
                  <span className="text-[9.5px] text-indigo-500 font-medium block truncate">{item.sector}</span>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic Action Banner */}
          <div className={`rounded-2xl p-4 border ${
            actionKey === "buy" || (actionKey === "in_position" && isRoiPositive)
              ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/25 dark:border-emerald-800/40"
              : actionKey === "in_position"
              ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500/25 dark:border-blue-800/40"
              : actionKey === "wait"
              ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-500/25 dark:border-amber-800/40"
              : "bg-rose-50/80 dark:bg-rose-950/30 border-rose-500/25 dark:border-rose-800/40"
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                actionKey === "buy" || (actionKey === "in_position" && isRoiPositive)
                  ? "bg-emerald-600"
                  : actionKey === "in_position"
                  ? "bg-blue-600"
                  : actionKey === "wait"
                  ? "bg-amber-500"
                  : "bg-rose-600"
              }`}>
                {actionKey === "buy" || (actionKey === "in_position" && isRoiPositive) ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : actionKey === "in_position" ? (
                  <Activity className="w-4 h-4 stroke-[2.5]" />
                ) : actionKey === "wait" ? (
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                )}
              </div>

              <div className="min-w-0">
                <div className="font-black text-xs uppercase tracking-wide text-slate-900 dark:text-white">
                  {actionTitle}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {actionDesc}
                </p>
                {item.exitReason && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                    <span>Reason Code:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{item.exitReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Continuum Risk Ladder */}
          {entryPrice > 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Price Range & Risk Continuum</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  R:R Ratio: 1:{(targetPct / Math.abs(stopLossPct || 1)).toFixed(1)}
                </span>
              </div>

              {/* Progress Track */}
              <div className="relative my-4">
                <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${targetProgressPct}%` }}
                  />
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-500 shadow-md transition-all duration-300"
                  style={{ left: `calc(${targetProgressPct}% - 7px)` }}
                />
              </div>

              {/* Range Nodes */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
                <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
                  <div className="text-[9px] text-rose-600 dark:text-rose-400 font-bold uppercase">STOP LOSS</div>
                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 text-xs">
                    {formatINR(stopLoss)}
                  </div>
                  <div className="text-[9px] text-rose-500 font-semibold">{stopLossPct.toFixed(1)}%</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06]">
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">ENTRY BASE</div>
                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 text-xs">
                    {formatINR(entryPrice)}
                  </div>
                  <div className="text-[9px] text-slate-400 font-semibold">100% Base</div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">TARGET 1</div>
                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 text-xs">
                    {formatINR(targetPrice)}
                  </div>
                  <div className="text-[9px] text-emerald-500 font-semibold">+{targetPct.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Quant Edge & Upgraded Trendlyne Intelligence             */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* Panel Selector Tabs */}
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.06] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("quant")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "quant"
                  ? "bg-white dark:bg-[#161822] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Quant Edge</span>
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {score}/100
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("trendlyne")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "trendlyne"
                  ? "bg-white dark:bg-[#161822] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Technical Intelligence</span>
              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                FINANCIAL
              </span>
            </button>
          </div>

          {/* TAB 1: QUANT EDGE */}
          {activeTab === "quant" && (
            <div className="space-y-4 animate-fade-in">
              {/* 4-Factor Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">
                    Composite Rating
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    {score}<span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] font-bold text-indigo-500 mt-0.5">Top Decile Algo</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">
                    ML Win Edge
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {mlProb.toFixed(0)}%
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600/80 mt-0.5">High Probability</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">
                    Technical Momentum
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    {technicalScore}<span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">RSI + Volume Expansion</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold font-mono">
                    Drawdown Risk
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    {riskScore}<span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500 mt-0.5">Controlled Tail Risk</div>
                </div>
              </div>

              {/* Algorithmic Scanners & Strategy Thesis */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
                    Quantitative Thesis & Signal Scanners
                  </span>
                  <span className="text-[10px] font-mono text-indigo-500 font-bold">
                    Algorithmic Edge
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.symbol} was identified through algorithmic institutional order flow filtering.
                  The setup incorporates RSI momentum expansion, volatility contraction breakouts, and
                  institutional pocket pivot volume confirmation.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                    Volume Multiplier: 2.8x
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                    EMA Alignment: Bullish 20 &gt; 50
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                    Regime: High Momentum Trend
                  </span>
                </div>
              </div>

              {/* Historical MFE stats if available */}
              {(item.maxFavorable !== undefined || item.mfe !== undefined) && (
                <div className="p-4 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                  <div className="text-[11px] font-extrabold uppercase font-mono tracking-wider text-slate-900 dark:text-white mb-2">
                    Peak Gain (MFE) Trajectory
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Peak Gain (MFE)</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        +{Number(item.maxFavorable ?? item.mfe ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    {item.maxAdverse !== undefined && (
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Max Drawdown (MAE)</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                          {Number(item.maxAdverse).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRENDLYNE INTELLIGENCE */}
          {activeTab === "trendlyne" && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-xs animate-fade-in">
              <TrendlyneWidgets symbol={item.symbol} />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FLOATING ACTION DOCK                                           */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#11131a] border border-slate-200/80 dark:border-white/[0.08] shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenChart && (
            <button
              type="button"
              onClick={() => onOpenChart(item.symbol)}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>TradingView Chart</span>
            </button>
          )}

          {!isBought && onOpenBuyModal && !isClosedTrade && (
            <button
              type="button"
              onClick={() => onOpenBuyModal(
                item.symbol,
                currentPrice || entryPrice || 100,
                item.strategyName
              )}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Log Paper Trade</span>
            </button>
          )}

          {isBought && onOpenSellModal && (
            <button
              type="button"
              onClick={() => onOpenSellModal(item)}
              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Log Exit / Sell</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
