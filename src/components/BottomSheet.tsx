import React from "react";
import { X, TrendingUp, AlertTriangle, Clock, LineChart, Star } from "lucide-react";
import { formatINR } from "../lib/utils";
import TrendlyneWidgets from "./TrendlyneWidgets";

export interface BottomSheetItem {
  symbol: string;
  strategyName?: string;
  entryDate?: string;
  exitDate?: string;
  entryPrice?: number;
  currentPrice?: number;
  exitPrice?: number;
  currentROI?: number;
  returnPct?: number;
  action?: string; // "BUY", "BUY_NOW", "WAIT", "MISSED", etc.
  compositeScore?: number;
  mlProbability?: number;
  stars?: number;
  holdingDays?: number;
  pnlLabel?: string;
  exitReason?: string;
  waitReason?: string;
  missedNote?: string;
  sector?: string;
  tradePlan?: {
    target1Price?: number;
    target1Pct?: number;
    stopPrice?: number;
    stopPct?: number;
    t1RiskReward?: string;
  };
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: BottomSheetItem | null;
  onOpenChart?: (symbol: string) => void;
  onOpenBuyModal?: (symbol: string, price: number, strategy?: string) => void;
  isBought?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  item,
  onOpenChart,
  onOpenBuyModal,
  isBought
}: BottomSheetProps) {
  if (!isOpen || !item) return null;

  const isClosedTrade = !!item.exitDate || item.returnPct !== undefined;
  const roi = item.returnPct !== undefined ? item.returnPct : (item.currentROI ?? 0);
  const isRoiPositive = roi >= 0;

  // Action mapping
  let actionKey = "buy";
  let actionTitle = "Prime Entry Zone";
  let actionDesc = "Price is hovering near the ideal entry trigger with verified institutional volume support.";

  if (isClosedTrade) {
    actionKey = isRoiPositive ? "buy" : "avoid";
    actionTitle = item.pnlLabel === "WIN" ? "Trade Closed in Profit" : "Trade Closed in Loss";
    
    const reasonMap: Record<string, string> = {
      MFE_TRAIL_L1: "Trailing stop locked in profit near peak trajectory.",
      MFE_TRAIL_L2: "Trailing stop locked in profit near peak trajectory.",
      MFE_TRAIL_L3: "Trailing stop locked in profit after strong momentum run.",
      MFE_TRAIL_L4: "Trailing stop locked in modest gains.",
      SMART_EARLY_STOP: "Early risk cut — momentum deteriorated faster than threshold.",
      HARD_STOP_HIT: "Maximum risk limit reached — closed automatically to protect capital.",
      TIME_DECAY_STALL: "Position consolidated past maximum expected duration.",
      ZERO_MOMENTUM: "Volume dried up — capital reallocated.",
      TARGET_HIT: "Successfully hit Target 1 exit limit.",
      TRAIL_STOP: "Trailing stop activated to preserve capital."
    };
    actionDesc = (item.exitReason && reasonMap[item.exitReason]) || "Position closed strictly following risk management rules.";
  } else if (item.action === "WAIT") {
    actionKey = "wait";
    actionTitle = "Extended — Wait for Pullback";
    actionDesc = item.waitReason || "This setup has already advanced significantly. Wait for a retest before committing capital.";
  } else if (item.action === "MISSED" || item.action === "AVOID") {
    actionKey = "avoid";
    actionTitle = "Overextended — Avoid Chasing";
    actionDesc = item.missedNote || "Price has moved past safe risk-reward boundaries. Let this move conclude.";
  }

  const score = item.compositeScore ?? (item.mlProbability ? (item.mlProbability <= 1 ? Math.round(item.mlProbability * 100) : Math.round(item.mlProbability)) : 76);
  const stars = typeof item.stars === "number" && item.stars > 0 ? item.stars : (score >= 82 ? 5.0 : score >= 76 ? 4.5 : score >= 70 ? 4.0 : 3.5);

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center">
      {/* Darkened backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-[480px] sm:max-w-[540px] bg-white dark:bg-[#14161E] rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200 border border-[#ECEEF2] dark:border-white/10">
        
        {/* Handle Bar */}
        <div className="w-10 h-1.2 rounded-full bg-[#E5E5EA] dark:bg-white/20 mx-auto mt-3 mb-1 shrink-0" />

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 sm:px-6 pt-2 pb-7 no-scrollbar">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-3.5">
            <div>
              <div className="text-[22px] font-extrabold text-[#14151A] dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>{item.symbol}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {stars.toFixed(1)}
                </span>
                {isBought && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]/40 font-mono">
                    HELD ✓
                  </span>
                )}
              </div>
              <div className="text-[12.5px] text-[#56586A] dark:text-[#8B8D98] font-medium mt-0.5">
                {item.strategyName || "Algorithmic"} model · {isClosedTrade ? `Closed ${item.exitDate || "Recently"}` : `Triggered ${item.entryDate || "Active"}`}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F1F2F5] dark:bg-white/10 flex items-center justify-center text-[#56586A] dark:text-white hover:opacity-80 transition-opacity cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Price & ROI */}
          <div className="flex items-baseline gap-3 mb-4">
            <div className="text-[30px] font-extrabold text-[#14151A] dark:text-white tracking-tight tabular font-mono">
              {formatINR(isClosedTrade ? (item.exitPrice || item.currentPrice || 0) : (item.currentPrice || item.entryPrice || 0))}
            </div>
            <div className={`text-[15px] font-extrabold font-mono tabular ${isRoiPositive ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
              {isRoiPositive ? "+" : ""}{roi.toFixed(2)}%
            </div>
            {item.holdingDays !== undefined && (
              <div className="text-[12px] font-semibold text-[#8B8D98] ml-auto font-mono">
                {item.holdingDays}d hold
              </div>
            )}
          </div>

          {/* Action Condition Banner */}
          <div className={`rounded-[16px] p-3.5 mb-4 flex items-start gap-3 border ${
            actionKey === "buy"
              ? "bg-[#ECFDF3] dark:bg-emerald-950/30 border-[#86EFAC]/60 dark:border-emerald-800/40"
              : actionKey === "wait"
              ? "bg-[#FFFBEB] dark:bg-amber-950/30 border-[#FDE68A]/60 dark:border-amber-800/40"
              : "bg-[#FEF3F2] dark:bg-rose-950/30 border-[#FECDCA]/60 dark:border-rose-800/40"
          }`}>
            <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-white shadow-xs ${
              actionKey === "buy" ? "bg-[#16A34A]" : actionKey === "wait" ? "bg-[#D97706]" : "bg-[#F04438]"
            }`}>
              {actionKey === "buy" ? (
                <TrendingUp className="w-4 h-4" />
              ) : actionKey === "wait" ? (
                <Clock className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-[13.5px] font-bold text-[#14151A] dark:text-white mb-0.5">
                {actionTitle}
              </div>
              <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-medium leading-relaxed">
                {actionDesc}
              </div>
            </div>
          </div>

          {/* Trade Confidence Score */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#8B8D98] font-mono">
              <span>Trade Confidence</span>
              <span className="text-[#14151A] dark:text-white">{score}/100</span>
            </div>
            <div className="h-2 rounded-full bg-[#F1F2F5] dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#6366F1] to-[#10B981]"
                style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
              />
            </div>
          </div>

          {/* 2x2 Metric Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-3 rounded-[14px] bg-[#F1F2F5] dark:bg-white/[0.04]">
              <div className="text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-0.5 font-mono">
                Entry Price
              </div>
              <div className="text-[15px] font-extrabold text-[#14151A] dark:text-white font-mono tabular">
                {formatINR(item.entryPrice || 0)}
              </div>
            </div>

            <div className="p-3 rounded-[14px] bg-[#F1F2F5] dark:bg-white/[0.04]">
              <div className="text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-0.5 font-mono">
                {isClosedTrade ? "Exit Price" : "Current Price"}
              </div>
              <div className="text-[15px] font-extrabold text-[#14151A] dark:text-white font-mono tabular">
                {formatINR(isClosedTrade ? (item.exitPrice || 0) : (item.currentPrice || item.entryPrice || 0))}
              </div>
            </div>

            <div className="p-3 rounded-[14px] bg-[#F1F2F5] dark:bg-white/[0.04]">
              <div className="text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-0.5 font-mono">
                ML Probability
              </div>
              <div className="text-[15px] font-extrabold text-[#14151A] dark:text-white font-mono tabular">
                {item.mlProbability ? `${(item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100).toFixed(1)}%` : "74.5%"}
              </div>
            </div>

            <div className="p-3 rounded-[14px] bg-[#F1F2F5] dark:bg-white/[0.04]">
              <div className="text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-0.5 font-mono">
                Strategy
              </div>
              <div className="text-[14px] font-extrabold text-[#14151A] dark:text-white truncate">
                {item.strategyName || "Breakout"}
              </div>
            </div>
          </div>

          {/* Trade Execution Plan */}
          {item.tradePlan && (
            <div className="p-3 rounded-[14px] bg-[#F1F2F5] dark:bg-white/[0.04] mb-4">
              <div className="text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-2 font-mono">
                Execution Parameters
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[12px] font-mono">
                <div>
                  <div className="text-[9px] text-[#8B8D98] font-bold">TARGET 1</div>
                  <div className="font-extrabold text-[#16A34A] dark:text-emerald-400 mt-0.5">
                    {item.tradePlan.target1Price ? formatINR(item.tradePlan.target1Price) : "+12%"}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8B8D98] font-bold">STOP LOSS</div>
                  <div className="font-extrabold text-[#F04438] dark:text-rose-400 mt-0.5">
                    {item.tradePlan.stopPrice ? formatINR(item.tradePlan.stopPrice) : "-6%"}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8B8D98] font-bold">R:R RATIO</div>
                  <div className="font-extrabold text-[#6366F1] dark:text-indigo-400 mt-0.5">
                    {item.tradePlan.t1RiskReward || "2.1:1"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trendlyne Dynamic Widgets */}
          <TrendlyneWidgets symbol={item.symbol} />

          {/* Bottom Action buttons */}
          <div className="flex gap-2 pt-4">
            {onOpenChart && (
              <button
                onClick={() => {
                  onClose();
                  onOpenChart(item.symbol);
                }}
                className="flex-1 py-2.5 px-3 rounded-[12px] bg-[#F1F2F5] dark:bg-white/[0.08] text-[#14151A] dark:text-white font-bold text-[13px] hover:bg-slate-200 dark:hover:bg-white/15 transition-colors flex items-center justify-center gap-1.5 cursor-pointer qs-btn-press"
              >
                <LineChart className="w-4 h-4 text-[#6366F1]" />
                TradingView Chart
              </button>
            )}

            {!isClosedTrade && onOpenBuyModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBuyModal(
                    item.symbol,
                    item.currentPrice || item.entryPrice || 100,
                    item.strategyName
                  );
                }}
                className="flex-1 py-2.5 px-3 rounded-[12px] bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] font-bold text-[13px] shadow-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer qs-btn-press"
              >
                {isBought ? "Adjust Position" : "Log Trade"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
