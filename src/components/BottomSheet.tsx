import React from "react";
import { X, TrendingUp, AlertTriangle, Clock, Bot, LineChart, CheckCircle2, ShieldAlert } from "lucide-react";
import { formatINR } from "../lib/utils";

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
  let actionTitle = "Good entry right now";
  let actionDesc = "Price has pulled back near the flagged entry — this is where the strategy expects you to step in.";

  if (isClosedTrade) {
    actionKey = isRoiPositive ? "buy" : "avoid";
    actionTitle = item.pnlLabel === "WIN" ? "Trade closed in profit" : "Trade closed in loss";
    
    const reasonMap: Record<string, string> = {
      MFE_TRAIL_L1: "Trailing stop locked in profit near the peak.",
      MFE_TRAIL_L2: "Trailing stop locked in profit near the peak.",
      MFE_TRAIL_L3: "Trailing stop locked in profit after a strong run.",
      MFE_TRAIL_L4: "Trailing stop locked in a modest profit.",
      SMART_EARLY_STOP: "Cut early — the setup weakened faster than expected.",
      HARD_STOP_HIT: "Hit the maximum loss limit and closed automatically.",
      TIME_DECAY_STALL: "Held too long without progress, so it was closed.",
      ZERO_MOMENTUM: "Momentum faded — closed to free up capital.",
      TARGET_HIT: "Reached strategy Target 1 successfully.",
      TRAIL_STOP: "Trailing stop hit to protect gains."
    };
    actionDesc = (item.exitReason && reasonMap[item.exitReason]) || "Position closed per strategy risk management rules.";
  } else if (item.action === "WAIT") {
    actionKey = "wait";
    actionTitle = "Extended — wait for a dip";
    actionDesc = item.waitReason || "This trade has already run up. Chasing here means paying more for the same risk. Wait for a pullback.";
  } else if (item.action === "MISSED") {
    actionKey = "avoid";
    actionTitle = "Overextended — don't chase";
    actionDesc = item.missedNote || "The move has gone well beyond a normal entry range. Entering now means poor risk-to-reward.";
  }

  const score = item.compositeScore ?? (item.mlProbability ? Math.round(item.mlProbability * 100) : 75);
  const scoreGradient = score >= 80 
    ? "linear-gradient(90deg, #30D158, #0ABF6B)"
    : score >= 65
    ? "linear-gradient(90deg, #FF9500, #FFD60A)"
    : "linear-gradient(90deg, #FF453A, #FF375F)";

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center">
      {/* Darkened backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-[440px] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-300 border border-black/5 dark:border-white/10">
        
        {/* Handle Bar */}
        <div className="w-10 h-1.5 rounded-full bg-[#E5E5EA] dark:bg-[#38383A] mx-auto mt-3.5 mb-1 shrink-0" />

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 sm:px-6 pt-2 pb-8 no-scrollbar">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-[26px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight flex items-center gap-2">
                {item.symbol}
                {isBought && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E5FBEA] text-[#1DA53E] border border-[#30D158]/30">
                    Holding ✓
                  </span>
                )}
              </div>
              <div className="text-[13px] text-[#6B7079] dark:text-[#98989F] font-semibold mt-0.5">
                {item.strategyName || "Algorithmic"} strategy · {isClosedTrade ? `Closed ${item.exitDate || "Recently"}` : `Entered ${item.entryDate || "Active"}`}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F2F3F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#6B7079] dark:text-[#98989F] hover:text-[#0B0D12] dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Price & ROI Hero */}
          <div className="flex items-baseline gap-3 mb-5">
            <div className="text-[32px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight tabular">
              {formatINR(isClosedTrade ? (item.exitPrice || item.currentPrice || 0) : (item.currentPrice || item.entryPrice || 0))}
            </div>
            <div className={`text-[16px] font-extrabold tabular ${isRoiPositive ? "text-[#30D158]" : "text-[#FF453A]"}`}>
              {isRoiPositive ? "↑ +" : "↓ "}{Math.abs(roi).toFixed(2)}%
            </div>
            {item.holdingDays !== undefined && (
              <div className="text-[12.5px] font-semibold text-[#A2A6AE] dark:text-[#636366] ml-auto">
                {item.holdingDays}d hold
              </div>
            )}
          </div>

          {/* State Banner */}
          <div className={`rounded-[20px] p-4 mb-5 flex items-start gap-3.5 border ${
            actionKey === "buy"
              ? "bg-gradient-to-br from-[#E5FBEA] to-[#E4F8FC] dark:from-[#0E2C17] dark:to-[#0E2E36] border-[#30D158]/20"
              : actionKey === "wait"
              ? "bg-gradient-to-br from-[#FFF2DF] to-[#FFE9EF] dark:from-[#3A2A0C] dark:to-[#3A1622] border-[#FF9500]/20"
              : "bg-gradient-to-br from-[#FFEBEA] to-[#FFE9EF] dark:from-[#3A1512] dark:to-[#3A1622] border-[#FF453A]/20"
          }`}>
            <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 text-white shadow-xs ${
              actionKey === "buy" ? "bg-[#30D158]" : actionKey === "wait" ? "bg-[#FF9500]" : "bg-[#FF453A]"
            }`}>
              {actionKey === "buy" ? (
                <TrendingUp className="w-5 h-5" />
              ) : actionKey === "wait" ? (
                <Clock className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-[14.5px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] mb-0.5">
                {actionTitle}
              </div>
              <div className="text-[12.5px] text-[#6B7079] dark:text-[#98989F] font-semibold leading-relaxed">
                {actionDesc}
              </div>
            </div>
          </div>

          {/* Conviction Score */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A2A6AE] dark:text-[#636366]">
                Conviction Score
              </span>
              <span className="text-[14px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                {score}/100
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(10, score))}%`,
                  background: scoreGradient
                }}
              />
            </div>
          </div>

          {/* 2x2 Metric Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="p-3.5 rounded-[16px] bg-[#E8F2FF] dark:bg-[#0F2942]">
              <div className="text-[10.5px] font-bold text-[#6B7079] dark:text-[#98989F] uppercase tracking-wide mb-1">
                Entry Price
              </div>
              <div className="text-[16px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                {formatINR(item.entryPrice || 0)}
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#E5FBEA] dark:bg-[#0E2C17]">
              <div className="text-[10.5px] font-bold text-[#6B7079] dark:text-[#98989F] uppercase tracking-wide mb-1">
                {isClosedTrade ? "Exit Price" : "Current Price"}
              </div>
              <div className="text-[16px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                {formatINR(isClosedTrade ? (item.exitPrice || 0) : (item.currentPrice || item.entryPrice || 0))}
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#F4E9FB] dark:bg-[#2B1E3B]">
              <div className="text-[10.5px] font-bold text-[#6B7079] dark:text-[#98989F] uppercase tracking-wide mb-1">
                ML Confidence
              </div>
              <div className="text-[16px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                {item.mlProbability ? `${(item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100).toFixed(1)}%` : "78.5%"}
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#FFF2DF] dark:bg-[#3A2A0C]">
              <div className="text-[10.5px] font-bold text-[#6B7079] dark:text-[#98989F] uppercase tracking-wide mb-1">
                Strategy
              </div>
              <div className="text-[14.5px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] truncate">
                {item.strategyName || "Breakout"}
              </div>
            </div>
          </div>

          {/* Engine Trade Plan Targets if available */}
          {item.tradePlan && (
            <div className="p-3 rounded-[16px] bg-[#F2F3F7] dark:bg-[#2C2C2E] mb-5">
              <div className="text-[10.5px] font-bold text-[#A2A6AE] uppercase tracking-wider mb-2">
                Trade Execution Plan
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[12px] font-mono">
                <div>
                  <div className="text-[9.5px] text-[#6B7079] font-bold">TARGET 1</div>
                  <div className="font-extrabold text-[#30D158] mt-0.5">
                    {item.tradePlan.target1Price ? formatINR(item.tradePlan.target1Price) : "+12%"}
                  </div>
                </div>
                <div>
                  <div className="text-[9.5px] text-[#6B7079] font-bold">STOP LOSS</div>
                  <div className="font-extrabold text-[#FF453A] mt-0.5">
                    {item.tradePlan.stopPrice ? formatINR(item.tradePlan.stopPrice) : "-6%"}
                  </div>
                </div>
                <div>
                  <div className="text-[9.5px] text-[#6B7079] font-bold">T1 R:R</div>
                  <div className="font-extrabold text-[#5E5CE6] mt-0.5">
                    {item.tradePlan.t1RiskReward || "2.1:1"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Why this reading Section */}
          <div className="mb-6">
            <div className="text-[13.5px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] mb-3">
              Why this reading
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#5E5CE6] mt-1.5 shrink-0" />
                <div className="text-[13px] text-[#6B7079] dark:text-[#98989F] font-medium leading-relaxed">
                  <strong className="text-[#0B0D12] dark:text-[#F5F5F7] font-bold">{item.strategyName || "Algorithm"}</strong> looks for institutional volume spikes & pattern breakouts — triggered on {item.entryDate || "recent session"}.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#30D158] mt-1.5 shrink-0" />
                <div className="text-[13px] text-[#6B7079] dark:text-[#98989F] font-medium leading-relaxed">
                  Conviction of <strong className="text-[#0B0D12] dark:text-[#F5F5F7] font-bold">{score}/100</strong> combines machine-learning pattern recognition with relative sector momentum.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  actionKey === "buy" ? "bg-[#30D158]" : actionKey === "wait" ? "bg-[#FF9500]" : "bg-[#FF453A]"
                }`} />
                <div className="text-[13px] text-[#6B7079] dark:text-[#98989F] font-medium leading-relaxed">
                  {actionDesc}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex gap-2.5 pt-2">
            {onOpenChart && (
              <button
                onClick={() => {
                  onClose();
                  onOpenChart(item.symbol);
                }}
                className="flex-1 py-3 px-4 rounded-[16px] bg-[#F2F3F7] dark:bg-[#2C2C2E] text-[#0B0D12] dark:text-[#F5F5F7] font-extrabold text-[14px] hover:bg-[#E5E5EA] transition-all flex items-center justify-center gap-1.5 cursor-pointer qs-btn-press"
              >
                <LineChart className="w-4 h-4 text-[#0A84FF]" />
                Chart
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
                className="flex-1 py-3 px-4 rounded-[16px] bg-gradient-to-r from-[#0A84FF] to-[#5E5CE6] text-white font-extrabold text-[14px] shadow-[0_8px_18px_-6px_rgba(10,132,255,0.5)] hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer qs-btn-press"
              >
                {isBought ? "Adjust Position" : "Buy / Add Trade"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
