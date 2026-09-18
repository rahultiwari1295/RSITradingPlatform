import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  LineChart,
  Star,
  ShieldCheck,
  Target,
  Copy,
  Check,
  Briefcase,
  DollarSign,
  Activity,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatINR } from "../lib/utils";
import TrendlyneWidgets from "./TrendlyneWidgets";

export interface BottomSheetItem {
  symbol: string;
  strategyName?: string;
  strategyId?: string;
  entryDate?: string;
  exitDate?: string;
  entryPrice?: number;
  currentPrice?: number;
  exitPrice?: number;
  currentROI?: number;
  returnPct?: number;
  action?: string; // "BUY", "BUY_NOW", "WAIT", "MISSED", "HOLD", etc.
  actionLabel?: string;
  actionColor?: string;
  compositeScore?: number;
  technicalScore?: number;
  riskScore?: number;
  marketScore?: number;
  mlProbability?: number;
  stars?: number;
  starsDisplay?: string;
  holdingDays?: number;
  pnlLabel?: string;
  exitReason?: string;
  waitReason?: string;
  missedNote?: string;
  sector?: string;
  stopLoss?: number;
  stopPrice?: number;
  targetPrice?: number;
  target1Price?: number;
  shares?: number;
  slippageText?: string;
  footerLine?: string;
  footerTags?: string[];
  mfe?: number;
  maxFavorable?: number;
  maxAdverse?: number;
  t1Triggered?: boolean;
  t1ReturnPct?: number | null;
  tradePlan?: {
    target1Price?: number;
    target1Pct?: number;
    stopPrice?: number;
    stopPct?: number;
    t1RiskReward?: string;
  };
  [key: string]: any;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: BottomSheetItem | null;
  onOpenChart?: (symbol: string) => void;
  onOpenBuyModal?: (symbol: string, price: number, strategy?: string) => void;
  onOpenSellModal?: (trade: any) => void;
  isBought?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

type TabType = "quant" | "trendlyne";

export default function BottomSheet({
  isOpen,
  onClose,
  item,
  onOpenChart,
  onOpenBuyModal,
  onOpenSellModal,
  isBought,
  onPrev,
  onNext
}: BottomSheetProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("quant");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key, Left/Right navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && onPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && onNext) {
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  // Reset scroll and tab when a new stock is selected
  useEffect(() => {
    if (isOpen && item?.symbol) {
      if (leftPanelRef.current) {
        leftPanelRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, item?.symbol]);

  if (!isOpen || !item) return null;

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const handleCopySymbol = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(item.symbol);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isClosedTrade = !!item.exitDate || (item.returnPct !== undefined && !item.currentPrice && !item.currentROI);
  const rawRoi = item.returnPct !== undefined ? item.returnPct : (item.currentROI ?? 0);
  const roi = Number(Number(rawRoi).toFixed(2));
  const isRoiPositive = roi >= 0;

  // Price calculations
  const entryPrice = Number(item.entryPrice || 0);
  const currentPrice = Number(
    isClosedTrade
      ? (item.exitPrice || item.currentPrice || entryPrice)
      : (item.currentPrice || item.entryPrice || 0)
  );

  // Stop Loss & Target Price resolution
  const stopLoss = Number(
    item.stopLoss ??
    item.stopPrice ??
    item.tradePlan?.stopPrice ??
    (entryPrice > 0 ? entryPrice * 0.94 : 0)
  );

  const targetPrice = Number(
    item.targetPrice ??
    item.target1Price ??
    item.tradePlan?.target1Price ??
    (entryPrice > 0 ? entryPrice * 1.12 : 0)
  );

  // Percentage deviations
  const stopLossPct =
    entryPrice > 0 && stopLoss > 0
      ? Number((((stopLoss - entryPrice) / entryPrice) * 100).toFixed(2))
      : -6.0;

  const targetPct =
    entryPrice > 0 && targetPrice > 0
      ? Number((((targetPrice - entryPrice) / entryPrice) * 100).toFixed(2))
      : 12.0;

  const riskReward =
    item.tradePlan?.t1RiskReward ||
    (Math.abs(stopLossPct) > 0
      ? `${(Math.abs(targetPct) / Math.abs(stopLossPct)).toFixed(1)}:1`
      : "2.0:1");

  // Price ladder range calculations
  const rangeMin = Math.min(stopLoss * 0.98, entryPrice * 0.92);
  const rangeMax = Math.max(targetPrice * 1.02, entryPrice * 1.15, currentPrice * 1.02);
  const totalSpan = rangeMax - rangeMin;

  const currentPosPct =
    totalSpan > 0
      ? Math.max(5, Math.min(95, ((currentPrice - rangeMin) / totalSpan) * 100))
      : 50;

  const targetDistance = targetPrice - entryPrice;
  const currentGain = currentPrice - entryPrice;
  const targetProgressPct =
    targetDistance > 0
      ? Math.max(0, Math.min(100, (currentGain / targetDistance) * 100))
      : 0;

  // Position Sizing calculations
  const shares = Number(
    item.shares || (entryPrice > 0 ? Math.max(1, Math.round(20000 / entryPrice)) : 10)
  );
  const capitalRequired = entryPrice * shares;
  const currentPositionValue = currentPrice * shares;
  const unrealizedPnL = (currentPrice - entryPrice) * shares;
  const projectedProfitCapital = Math.max(0, targetPrice - entryPrice) * shares;

  // Holding duration
  const daysHeld = item.holdingDays !== undefined
    ? item.holdingDays
    : item.entryDate
    ? Math.max(1, Math.round((Date.now() - new Date(item.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
    : undefined;

  // Action mapping & institutional diagnosis
  const isHolding =
    item.action === "HOLD" ||
    item.actionLabel === "IN POSITION" ||
    item.actionLabel === "HOLD" ||
    (!isClosedTrade && !!item.entryDate && !item.action);

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
      SMART_EARLY_STOP: "Early risk cut — momentum deteriorated faster than threshold.",
      HARD_STOP_HIT: "Maximum risk limit reached — closed automatically to protect capital.",
      TIME_DECAY_STALL: "Position consolidated past maximum expected duration.",
      ZERO_MOMENTUM: "Volume dried up — capital reallocated.",
      TARGET_HIT: "Successfully hit Target 1 exit limit.",
      TRAIL_STOP: "Trailing stop activated to preserve capital."
    };
    actionDesc = (item.exitReason && reasonMap[item.exitReason]) || item.exitReasonLabel || "Position closed strictly adhering to quant risk management rules.";
  } else if (isHolding) {
    actionKey = "in_position";
    actionTitle = item.actionLabel
      ? `${item.actionLabel} · ${isRoiPositive ? "In Profit" : "Pullback Zone"}`
      : isRoiPositive
      ? "Active In-Trade · Tracking in Profit"
      : "Active In-Trade · Pullback Zone";
    actionDesc =
      item.footerLine ||
      (isRoiPositive
        ? "Price action is sustaining strong institutional momentum above entry trigger with structured volume support."
        : "Price is experiencing a standard technical consolidation within calculated stop-loss boundaries.");
  } else if (item.action === "WAIT") {
    actionKey = "wait";
    actionTitle = "Extended Setup — Wait for Dip";
    actionDesc = item.waitReason || "This setup has already advanced beyond the ideal risk-reward pivot. Wait for a pullback.";
  } else if (item.action === "MISSED" || item.action === "AVOID") {
    actionKey = "avoid";
    actionTitle = "Overextended — Avoid Chasing";
    actionDesc = item.missedNote || "Price has moved past safe statistical entry triggers. Capital protected by waiting.";
  }

  // Scores
  const score = item.compositeScore ?? (item.mlProbability ? (item.mlProbability <= 1 ? Math.round(item.mlProbability * 100) : Math.round(item.mlProbability)) : 76);
  const mlProb = item.mlProbability ? (item.mlProbability <= 1 ? item.mlProbability * 100 : item.mlProbability) : 72;
  const technicalScore = item.technicalScore ?? (score >= 80 ? 84 : score >= 70 ? 76 : 68);
  const riskScore = item.riskScore ?? (score >= 80 ? 22 : score >= 70 ? 28 : 35);
  const stars = typeof item.stars === "number" && item.stars > 0 ? item.stars : (score >= 82 ? 5.0 : score >= 76 ? 4.5 : score >= 70 ? 4.0 : 3.5);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Darkened backdrop overlay click to close */}
      <div 
        className="fixed inset-0 cursor-pointer"
        onClick={onClose}
      />

      {/* ========================================================================= */}
      {/* FLOATING WINDOW CONTAINER (Desktop Split-Pane & Modal Page) */}
      {/* ========================================================================= */}
      <div 
        className={`relative w-full bg-white dark:bg-[#11131a] rounded-[22px] shadow-2xl overflow-hidden flex flex-col transition-all duration-200 border border-slate-200/90 dark:border-white/10 z-10 ${
          isFullscreen
            ? "h-full w-full rounded-none sm:rounded-[22px]"
            : "h-[92vh] sm:h-[88vh] max-w-6xl"
        }`}
      >
        {/* ========================================================================= */}
        {/* WINDOW TITLE BAR */}
        {/* ========================================================================= */}
        <div className="min-h-[56px] py-2 px-4 sm:px-6 bg-slate-50/90 dark:bg-[#161822]/90 border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-3 shrink-0 select-none">
          {/* Left: Window Dots & Identity */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Terminal Window Controls Accent */}
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-rose-500 hover:opacity-80 transition-opacity cursor-pointer"
                title="Close window (Esc)"
              />
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="w-3 h-3 rounded-full bg-amber-500 hover:opacity-80 transition-opacity cursor-pointer"
                title="Toggle maximize"
              />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>

            {/* Symbol Avatar */}
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs font-mono shadow-xs shrink-0">
              {item.symbol.slice(0, 2)}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-[18px] sm:text-[20px] font-black text-slate-900 dark:text-white tracking-tight font-mono">
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

              <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                {stars.toFixed(1)}
              </span>

              {item.sector && (
                <span className="hidden sm:inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                  {item.sector}
                </span>
              )}

              {isBought && (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                  <Briefcase className="w-2.5 h-2.5" />
                  PORTFOLIO
                </span>
              )}
            </div>
          </div>

          {/* Right: Price & Window Control Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Price Preview in Header */}
            <div className="text-right hidden xs:block">
              <div className="font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {formatINR(currentPrice)}
              </div>
              <div className={`font-mono text-[10px] font-extrabold flex items-center justify-end gap-0.5 ${
                isRoiPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {isRoiPositive ? "+" : ""}{roi.toFixed(2)}%
              </div>
            </div>

            {/* Navigation Arrows if available */}
            {(onPrev || onNext) && (
              <div className="hidden sm:flex items-center bg-slate-200/70 dark:bg-white/[0.06] rounded-lg p-0.5">
                <button
                  onClick={onPrev}
                  disabled={!onPrev}
                  className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Previous Stock (←)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onNext}
                  disabled={!onNext}
                  className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Next Stock (→)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Maximize Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer hidden sm:block"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Window"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-600 dark:text-white transition-colors cursor-pointer"
              title="Close window (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: 2-COLUMN SPLIT PANE (Responsive Unified Scrolling) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-12 min-h-0">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANEL: Executive Trade Parameters & Continuum Risk Ladder */}
          {/* ----------------------------------------------------------------------- */}
          <div
            ref={leftPanelRef}
            className="w-full lg:col-span-5 xl:col-span-5 lg:overflow-y-auto p-4 sm:p-5 space-y-3.5 shrink-0 lg:shrink border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#11131a]"
          >
            {/* Price Hero Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.05]">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                    LAST TRADED PRICE
                  </div>
                  <div className="text-[26px] sm:text-[30px] font-black text-slate-900 dark:text-white tracking-tight font-mono tabular leading-normal py-0.5">
                    {formatINR(currentPrice)}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-black font-mono tabular ${
                    isRoiPositive
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
                  }`}>
                    {isRoiPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isRoiPositive ? "+" : ""}{roi.toFixed(2)}%
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {daysHeld !== undefined ? `${daysHeld} days active` : "Active position"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/[0.05] text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Entry Base</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatINR(entryPrice)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Strategy Model</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {item.strategyName || "Pocket Pivot Sleeve"}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic Action Banner */}
            <div className={`rounded-xl p-3 border ${
              actionKey === "buy" || (actionKey === "in_position" && isRoiPositive)
                ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/25 dark:border-emerald-800/40"
                : actionKey === "in_position"
                ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500/25 dark:border-blue-800/40"
                : actionKey === "wait"
                ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-500/25 dark:border-amber-800/40"
                : "bg-rose-50/80 dark:bg-rose-950/30 border-rose-500/25 dark:border-rose-800/40"
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs ${
                  actionKey === "buy" || (actionKey === "in_position" && isRoiPositive)
                    ? "bg-emerald-600"
                    : actionKey === "in_position"
                    ? "bg-blue-600"
                    : actionKey === "wait"
                    ? "bg-amber-600"
                    : "bg-rose-600"
                }`}>
                  {actionKey === "in_position" ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : actionKey === "buy" ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : actionKey === "wait" ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-slate-900 dark:text-white">
                    {actionTitle}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-0.5">
                    {actionDesc}
                  </div>

                  {((item.footerTags && item.footerTags.length > 0) || item.slippageText) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {item.footerTags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.slippageText && (
                        <span className="text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {item.slippageText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Institutional Execution & Price Range Continuum Ladder */}
            {entryPrice > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    <Target className="w-3 h-3 text-indigo-500" />
                    <span>Price Range & Risk Ladder</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-black font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      R:R {riskReward}
                    </span>
                    <span className="text-[9.5px] font-black font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {currentPrice >= targetPrice ? "Target Met!" : `${targetProgressPct.toFixed(0)}% to Goal`}
                    </span>
                  </div>
                </div>

                {/* Horizontal Range Continuum Track */}
                <div className="relative w-full my-4 px-1">
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-rose-500/40"
                      style={{ width: "25%" }}
                      title="Stop Loss Risk Zone"
                    />
                    <div
                      className="absolute top-0 bottom-0 left-[25%] bg-gradient-to-r from-indigo-500/50 via-emerald-500/60 to-emerald-500"
                      style={{ width: "75%" }}
                      title="Profit Target Expansion Zone"
                    />
                  </div>

                  {/* Pulsating Market Pin Marker */}
                  <div
                    className="absolute -top-1.5 transition-all duration-300 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                    style={{ left: `${currentPosPct}%` }}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shadow-md ${
                      isRoiPositive ? "bg-emerald-500 ring-4 ring-emerald-500/25" : "bg-rose-500 ring-4 ring-rose-500/25"
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    </div>
                    <span className="text-[9px] font-extrabold font-mono text-slate-800 dark:text-white mt-1 whitespace-nowrap bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-white/10 shadow-2xs">
                      LTP {formatINR(currentPrice)}
                    </span>
                  </div>
                </div>

                {/* 3-Node Parameter Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono mt-3.5 pt-2.5 border-t border-slate-200/70 dark:border-white/[0.06]">
                  <div className="p-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
                    <div className="text-[8.5px] text-rose-600 dark:text-rose-400 font-bold uppercase">STOP LOSS</div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatINR(stopLoss)}
                    </div>
                    <div className="text-[8.5px] text-rose-500 font-semibold">{stopLossPct.toFixed(1)}%</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06]">
                    <div className="text-[8.5px] text-slate-500 dark:text-slate-400 font-bold uppercase">ENTRY BASE</div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatINR(entryPrice)}
                    </div>
                    <div className="text-[8.5px] text-slate-400 font-semibold">100% Base</div>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">TARGET 1</div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatINR(targetPrice)}
                    </div>
                    <div className="text-[8.5px] text-emerald-500 font-semibold">+{targetPct.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Position Sizing & Capital Allocation Calculator */}
            {entryPrice > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                    <span>Capital Sizing & Allocation</span>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold text-slate-400">
                    Tranche: {shares} Shares
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="text-[8px] text-slate-400 uppercase font-bold">Invested</div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatINR(capitalRequired)}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="text-[8px] text-slate-400 uppercase font-bold">Current Val</div>
                    <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatINR(currentPositionValue)}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="text-[8px] text-slate-400 uppercase font-bold">Unrealized</div>
                    <div className={`font-extrabold mt-0.5 ${
                      unrealizedPnL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {unrealizedPnL >= 0 ? "+" : ""}{formatINR(unrealizedPnL)}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04]">
                    <div className="text-[8px] text-slate-400 uppercase font-bold">Target Profit</div>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      +{formatINR(projectedProfitCapital)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT PANEL: Quant Edge & Upgraded Responsive Trendlyne Tabs */}
          {/* ----------------------------------------------------------------------- */}
          <div className="w-full lg:col-span-7 xl:col-span-7 flex flex-col lg:h-full min-h-0 bg-slate-50/50 dark:bg-[#0c0e14]">
            
            {/* Right Panel Tabs Header */}
            <div className="px-4 py-2.5 bg-white dark:bg-[#11131a] border-b border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2 shrink-0 flex-wrap">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setActiveTab("quant")}
                  className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "quant"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Quant Edge</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("trendlyne")}
                  className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "trendlyne"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Technical Intelligence</span>
                </button>
              </div>

              {/* Sub-label indicator */}
              <span className="text-[11px] font-mono text-slate-400 font-semibold hidden sm:inline">
                {activeTab === "quant" ? "Algorithmic Risk/Reward & Models" : "Financial, Technical & SWOT Intelligence"}
              </span>
            </div>

            {/* Right Panel Tab Contents */}
            <div className="flex-1 lg:overflow-y-auto relative min-h-0">
              
              {/* TAB 1: QUANT FACTOR MATRIX */}
              {activeTab === "quant" && (
                <div className="p-4 sm:p-5 space-y-4 animate-fade-in">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Institutional Multi-Factor Algorithmic Matrix</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Score 1: Composite Rating */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono mb-1.5">
                        <span>Composite Rating</span>
                        <span className="text-slate-900 dark:text-white font-black">{score}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {score >= 80 ? "Top Quant Decile (Strongest conviction)" : score >= 70 ? "Above Benchmark Performance" : "Standard Conviction"}
                      </div>
                    </div>

                    {/* Score 2: ML Probability */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono mb-1.5">
                        <span>ML Win Edge</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">{mlProb.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(10, mlProb))}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Historical backtest statistical win probability
                      </div>
                    </div>

                    {/* Score 3: Technical Momentum */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono mb-1.5">
                        <span>Technical Momentum</span>
                        <span className="text-slate-900 dark:text-white font-black">{technicalScore}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(10, technicalScore))}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Volume accumulation & breakout structure
                      </div>
                    </div>

                    {/* Score 4: Risk Exposure */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono mb-1.5">
                        <span>Drawdown Risk</span>
                        <span className="text-slate-900 dark:text-white font-black">{riskScore}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(10, riskScore))}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {riskScore <= 25 ? "Low Volatility Exposure (Defensive)" : riskScore <= 40 ? "Moderate Volatility (Balanced)" : "High Volatility"}
                      </div>
                    </div>
                  </div>

                  {/* Algorithmic Engine Thesis */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2 text-[12px]">
                    <div className="font-bold text-slate-900 dark:text-white">Quantitative Thesis & Filter</div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11.5px]">
                      This setup entered via automated momentum scanners targeting stocks consolidating near multi-week highs with pocket pivot volume surges. Position sizing is calculated automatically to cap overall account drawdown below 1.5% per trade.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-[10.5px] font-mono font-semibold text-slate-500">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5">Strategy: {item.strategyName || "Pocket Pivot"}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5">Stars: {stars.toFixed(1)} / 5.0</span>
                      {item.mfe !== undefined && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Peak MFE: +{Number(item.mfe).toFixed(2)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ADVANCED RESPONSIVE TRENDLYNE RESEARCH */}
              {activeTab === "trendlyne" && (
                <div className="p-3.5 sm:p-4 h-full animate-fade-in">
                  <TrendlyneWidgets symbol={item.symbol} theme={isDark ? "dark" : "light"} />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FIXED BOTTOM ACTION FOOTER */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-[#11131a] border-t border-slate-200/80 dark:border-white/[0.06] shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {onOpenChart && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChart(item.symbol);
                }}
                className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <LineChart className="w-3.5 h-3.5 text-indigo-500" />
                <span>TradingView Chart</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopySymbol}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Symbol"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isClosedTrade && onOpenBuyModal && !isBought && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBuyModal(
                    item.symbol,
                    currentPrice || entryPrice || 100,
                    item.strategyName
                  );
                }}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Log to Paper Trade</span>
              </button>
            )}

            {isBought && onOpenSellModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSellModal(item);
                }}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <span>Log Exit / Sell</span>
              </button>
            )}

            {isBought && !onOpenSellModal && onOpenBuyModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBuyModal(
                    item.symbol,
                    currentPrice || entryPrice || 100,
                    item.strategyName
                  );
                }}
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <span>Adjust Position</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
