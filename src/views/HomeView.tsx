import React, { useState, useMemo } from "react";
import {
  Sparkles,
  HelpCircle,
  TrendingUp,
  Star,
  RefreshCw,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { ToBuySignal } from "../types";
import HeroCard from "../components/HeroCard";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import { formatINR } from "../lib/utils";

interface HomeViewProps {
  toBuySignals: ToBuySignal[];
  portfolioSymbols: string[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, price: number, strategy?: string) => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

// Built-in fallback / sample data matching the exact HTML spec
const fallbackToBuySignals = [
  { symbol: "WSTCSTPAPR", currentROI: 4.24, currentPrice: 637.25, entryPrice: 611.35, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 81, mlProbability: 77.0, action: "BUY", sector: "Paper" },
  { symbol: "WHEELS", currentROI: 3.19, currentPrice: 1512.80, entryPrice: 1466.10, entryDate: "2026-08-19", strategyName: "WyckoffSpring", compositeScore: 70, mlProbability: 73.6, action: "BUY", sector: "Auto Ancillary" },
  { symbol: "WELSPUNLIV", currentROI: 14.64, currentPrice: 189.22, entryPrice: 165.05, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 75, mlProbability: 73.2, action: "WAIT", sector: "Textiles" },
  { symbol: "UFLEX", currentROI: 10.74, currentPrice: 614.60, entryPrice: 555.00, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 82, mlProbability: 79.0, action: "WAIT", sector: "Packaging" },
  { symbol: "TORNTPHARM", currentROI: -1.78, currentPrice: 4896.50, entryPrice: 4985.00, entryDate: "2026-07-27", strategyName: "Decouple", compositeScore: 77, mlProbability: 70.0, action: "BUY_NOW", sector: "Pharma" },
  { symbol: "TIPSMUSIC", currentROI: -6.93, currentPrice: 650.95, entryPrice: 699.45, entryDate: "2026-07-20", strategyName: "WyckoffSpring", compositeScore: 75, mlProbability: 78.8, action: "BUY_NOW", sector: "Media" },
  { symbol: "TI", currentROI: 16.11, currentPrice: 575.65, entryPrice: 495.80, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 79, mlProbability: 71.7, action: "MISSED", sector: "Engineering" },
  { symbol: "TFCILTD", currentROI: 47.18, currentPrice: 130.99, entryPrice: 89.00, entryDate: "2026-07-27", strategyName: "Decouple", compositeScore: 81, mlProbability: 84.4, action: "MISSED", sector: "Finance" },
  { symbol: "SUNDRMFAST", currentROI: 12.45, currentPrice: 1228.00, entryPrice: 1092.00, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 84, mlProbability: 82.7, action: "WAIT", sector: "Auto Parts" },
  { symbol: "RKFORGE", currentROI: 11.73, currentPrice: 737.05, entryPrice: 659.70, entryDate: "2026-08-03", strategyName: "Alpha", compositeScore: 79, mlProbability: 70.6, action: "WAIT", sector: "Forgings" },
  { symbol: "RADICO", currentROI: 23.10, currentPrice: 4639.80, entryPrice: 3769.20, entryDate: "2026-06-15", strategyName: "Breakout", compositeScore: 74, mlProbability: 75.3, action: "MISSED", sector: "Beverages" },
  { symbol: "MOTHERSON", currentROI: 10.78, currentPrice: 169.38, entryPrice: 152.90, entryDate: "2026-08-03", strategyName: "Alpha", compositeScore: 76, mlProbability: 72.6, action: "WAIT", sector: "Auto Components" },
  { symbol: "MONARCH", currentROI: -1.20, currentPrice: 385.45, entryPrice: 390.15, entryDate: "2026-07-27", strategyName: "Breakout", compositeScore: 76, mlProbability: 73.5, action: "BUY_NOW", sector: "Capital Goods" },
  { symbol: "MEDANTA", currentROI: -0.21, currentPrice: 1409.70, entryPrice: 1412.60, entryDate: "2026-08-03", strategyName: "Breakout", compositeScore: 71, mlProbability: 71.1, action: "BUY_NOW", sector: "Healthcare" },
  { symbol: "MANINDS", currentROI: 17.83, currentPrice: 715.40, entryPrice: 607.15, entryDate: "2026-08-17", strategyName: "Breakout", compositeScore: 82, mlProbability: 79.4, action: "MISSED", sector: "Steel / Pipes" },
  { symbol: "GOODLUCK", currentROI: 10.31, currentPrice: 490.90, entryPrice: 445.00, entryDate: "2026-08-17", strategyName: "WyckoffSpring", compositeScore: 76, mlProbability: 87.5, action: "WAIT", sector: "Metals" },
  { symbol: "ENTERO", currentROI: 0.49, currentPrice: 1423.60, entryPrice: 1416.60, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 74, mlProbability: 72.5, action: "BUY_NOW", sector: "Healthcare" },
  { symbol: "DALMIASUG", currentROI: 16.89, currentPrice: 497.95, entryPrice: 426.00, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 81, mlProbability: 76.9, action: "MISSED", sector: "Sugar" },
  { symbol: "BELRISE", currentROI: -7.55, currentPrice: 231.77, entryPrice: 250.69, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 71, mlProbability: 71.4, action: "BUY_NOW", sector: "Auto Parts" },
  { symbol: "ACE", currentROI: 0.00, currentPrice: 1182.20, entryPrice: 1182.20, entryDate: "2026-08-17", strategyName: "Breakout", compositeScore: 83, mlProbability: 83.6, action: "BUY_NOW", sector: "Heavy Machinery" },
  { symbol: "VSSL", currentROI: 0.49, currentPrice: 348.70, entryPrice: 347.00, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 80, mlProbability: 74.6, action: "BUY_NOW", sector: "Metals" }
];

const sampleClosedTrades = [
  { symbol: "HAPPYFORGE", returnPct: 32.6, pnlLabel: "WIN", entryPrice: 1668, exitPrice: 2211.8, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "GLAXO", returnPct: 7.97, pnlLabel: "WIN", entryPrice: 2688, exitPrice: 2902.2, entryDate: "2026-08-17", exitDate: "2026-08-21", holdingDays: 4, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "ASIANENE", returnPct: 15.11, pnlLabel: "WIN", entryPrice: 408.55, exitPrice: 470.3, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "ALIVUS", returnPct: 14.21, pnlLabel: "WIN", entryPrice: 1182.8, exitPrice: 1350.9, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Alpha", exitReason: "MFE_TRAIL_L3" },
  { symbol: "DBOL", returnPct: 12.37, pnlLabel: "WIN", entryPrice: 116.71, exitPrice: 131.15, entryDate: "2026-08-10", exitDate: "2026-08-21", holdingDays: 11, strategyName: "WyckoffSpring", exitReason: "MFE_TRAIL_L3" },
  { symbol: "NETWEB", returnPct: -9.57, pnlLabel: "LOSS", entryPrice: 5601, exitPrice: 5065, entryDate: "2026-08-17", exitDate: "2026-08-19", holdingDays: 2, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" },
  { symbol: "ASTERDM", returnPct: -7.99, pnlLabel: "LOSS", entryPrice: 869.7, exitPrice: 800.2, entryDate: "2026-08-03", exitDate: "2026-08-19", holdingDays: 16, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" },
  { symbol: "JINDALSAW", returnPct: -7.89, pnlLabel: "LOSS", entryPrice: 291.65, exitPrice: 268.65, entryDate: "2026-08-17", exitDate: "2026-08-18", holdingDays: 1, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" },
  { symbol: "APOLLOPIPE", returnPct: -8.35, pnlLabel: "LOSS", entryPrice: 601.55, exitPrice: 551.3, entryDate: "2026-08-17", exitDate: "2026-08-18", holdingDays: 1, strategyName: "NR7", exitReason: "SMART_EARLY_STOP" },
  { symbol: "TDPOWERSYS", returnPct: 28.60, pnlLabel: "WIN", entryPrice: 1201.9, exitPrice: 1545.6, entryDate: "2026-08-05", exitDate: "2026-08-19", holdingDays: 14, strategyName: "WyckoffSpring", exitReason: "MFE_TRAIL_L4" },
  { symbol: "HEG", returnPct: 1.01, pnlLabel: "WIN", entryPrice: 701, exitPrice: 708.05, entryDate: "2026-08-10", exitDate: "2026-08-19", holdingDays: 9, strategyName: "Breakout", exitReason: "MFE_TRAIL_L4" },
  { symbol: "AEGISLOG", returnPct: 82.31, pnlLabel: "WIN", entryPrice: 759, exitPrice: 1383.7, entryDate: "2026-06-08", exitDate: "2026-07-07", holdingDays: 29, strategyName: "Alpha", exitReason: "MFE_TRAIL_L4" }
];

export default function HomeView({
  toBuySignals,
  portfolioSymbols,
  onOpenChart,
  onOpenBuyModal,
  onRefresh,
  isSyncing
}: HomeViewProps) {
  // Use incoming live API signals or fallback
  const rawList = toBuySignals && toBuySignals.length > 0 ? toBuySignals : (fallbackToBuySignals as any);

  // Active filter state
  const [filter, setFilter] = useState<"all" | "buy" | "wait" | "avoid">("all");
  const [starredSymbols, setStarredSymbols] = useState<Set<string>>(new Set());
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  const toggleStar = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  // Helper action metadata
  const getActionMeta = (action?: string) => {
    if (action === "BUY" || action === "BUY_NOW") {
      return { key: "buy", label: action === "BUY_NOW" ? "Buy now" : "Buy", bg: "bg-[#E5FBEA]", text: "text-[#1DA53E]", dot: "bg-[#30D158]" };
    }
    if (action === "WAIT") {
      return { key: "wait", label: "Extended", bg: "bg-[#FFF2DF]", text: "text-[#D97D00]", dot: "bg-[#FF9500]" };
    }
    return { key: "avoid", label: "Overextended", bg: "bg-[#FFEBEA]", text: "text-[#E0342A]", dot: "bg-[#FF453A]" };
  };

  // Filtered positions
  const filteredList = useMemo(() => {
    return rawList.filter((item: any) => {
      const act = (item.action || "BUY").toUpperCase();
      if (filter === "all") return true;
      if (filter === "buy") return act === "BUY" || act === "BUY_NOW";
      if (filter === "wait") return act === "WAIT";
      if (filter === "avoid") return act === "MISSED" || act === "AVOID";
      return true;
    });
  }, [rawList, filter]);

  // Counts
  const counts = useMemo(() => {
    let buyCount = 0, waitCount = 0, avoidCount = 0;
    rawList.forEach((item: any) => {
      const act = (item.action || "BUY").toUpperCase();
      if (act === "BUY" || act === "BUY_NOW") buyCount++;
      else if (act === "WAIT") waitCount++;
      else avoidCount++;
    });
    return { all: rawList.length, buy: buyCount, wait: waitCount, avoid: avoidCount };
  }, [rawList]);

  // Featured opportunity (First BUY / BUY_NOW item or first in list)
  const featuredItem = useMemo(() => {
    return rawList.find((s: any) => (s.action || "").toUpperCase().includes("BUY")) || rawList[0];
  }, [rawList]);

  const featuredMeta = getActionMeta(featuredItem?.action);
  const featuredScore = featuredItem?.compositeScore || (featuredItem?.mlProbability ? Math.round(featuredItem.mlProbability * (featuredItem.mlProbability <= 1 ? 100 : 1)) : 70);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. HERO — Gradient Portfolio Card (Wallet Style) */}
      <HeroCard
        eyebrow="TRACK RECORD · ALL TIME"
        bigNumber="67.7"
        bigLabel="% win rate"
        badge="2.58x"
        stats={[
          { value: "3,038", label: "CLOSED" },
          { value: "+10.4%", label: "AVG WIN", valueColor: "#8BF694" },
          { value: "2.5 WK", label: "AVG HOLD" }
        ]}
      />

      {/* 2. Confidence / Education Card */}
      <div className="rounded-[24px] p-4 sm:p-4.5 flex items-center gap-3.5 bg-gradient-to-br from-[#E4F8FC] to-[#E8F2FF] dark:from-[#0E2E36] dark:to-[#0F2942] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#40C8E0] to-[#0A84FF] text-white shadow-[0_6px_14px_-4px_rgba(10,132,255,0.5)]">
          <HelpCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <div className="text-[14.5px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight mb-0.5">
            New here? Just follow the color.
          </div>
          <div className="text-[12.5px] text-[#6B7079] dark:text-[#98989F] font-semibold leading-snug">
            🟢 Buy · 🟠 Wait for a dip · 🔴 Don't chase. Tap any card for the full story.
          </div>
        </div>
      </div>

      {/* 3. Act Now — Opportunity Card */}
      {featuredItem && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight">
                Act now
              </span>
              <span className="text-[12px] font-extrabold text-white bg-[#FF375F] rounded-full px-2.5 py-0.5 shadow-xs">
                {counts.buy}
              </span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isSyncing}
                className="text-[13px] font-bold text-[#0A84FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                Live Scan
              </button>
            )}
          </div>
          <p className="text-[13px] text-[#6B7079] dark:text-[#98989F] font-semibold -mt-2 mb-3.5">
            Fresh entries flagged today
          </p>

          <div
            onClick={() => setSelectedSheetItem(featuredItem)}
            className="relative overflow-hidden rounded-[26px] p-5 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_4px_16px_-4px_rgba(16,24,40,0.10)] hover:shadow-[0_8px_24px_-6px_rgba(16,24,40,0.15)] transition-all cursor-pointer qs-card-hover"
          >
            {/* Top right subtle glow */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[radial-gradient(circle,rgba(48,209,88,0.16),transparent_70%)]" />

            {/* Top row: Symbol info + price */}
            <div className="relative z-1 flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#FFD60A] to-[#FF9500] text-white flex items-center justify-center font-extrabold text-[18px] shadow-[0_8px_16px_-4px_rgba(255,149,0,0.45)]">
                  {featuredItem.symbol?.slice(0, 1) || "S"}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[19px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight">
                      {featuredItem.symbol}
                    </span>
                    <button
                      onClick={(e) => toggleStar(featuredItem.symbol, e)}
                      className="p-1 text-[#A2A6AE] hover:text-amber-400 cursor-pointer"
                    >
                      <Star className={`w-4 h-4 ${starredSymbols.has(featuredItem.symbol) ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                  </div>
                  <div className="text-[12.5px] text-[#6B7079] dark:text-[#98989F] font-semibold">
                    {featuredItem.strategyName || "Wyckoff Spring"} · {featuredItem.sector || "Diversified"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[19px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                  {formatINR(featuredItem.currentPrice || featuredItem.entryPrice || 0)}
                </div>
                <div className={`text-[13px] font-extrabold ${(featuredItem.currentROI ?? 0) >= 0 ? "text-[#30D158]" : "text-[#FF453A]"} tabular`}>
                  {(featuredItem.currentROI ?? 0) >= 0 ? "↑ " : "↓ "}{Math.abs(featuredItem.currentROI ?? 3.2).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Meter row */}
            <div className="relative z-1 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-[rgba(60,60,67,0.08)] dark:bg-[rgba(255,255,255,0.07)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(10, Math.min(100, featuredScore))}%`,
                      background: "linear-gradient(90deg, #FF9500, #30D158)"
                    }}
                  />
                </div>
                <div className="text-[13px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                  {featuredScore}/100
                </div>
              </div>
            </div>

            {/* Action pill row */}
            <div className="relative z-1 flex items-center gap-2 mb-4 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-extrabold px-3 py-1.5 rounded-[14px] ${featuredMeta.bg} ${featuredMeta.text}`}>
                <span className={`w-2 h-2 rounded-full ${featuredMeta.dot}`} />
                {featuredMeta.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#6B7079] dark:text-[#98989F] bg-[rgba(60,60,67,0.08)] dark:bg-[rgba(255,255,255,0.08)] px-3 py-1.5 rounded-[14px]">
                🤖 {featuredItem.mlProbability ? `${(featuredItem.mlProbability > 1 ? featuredItem.mlProbability : featuredItem.mlProbability * 100).toFixed(1)}%` : "73.6%"} confidence
              </span>
            </div>

            {/* CTA row */}
            <div className="relative z-1 flex gap-2.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onOpenChart(featuredItem.symbol)}
                className="flex-1 py-3 px-4 rounded-[16px] bg-[rgba(60,60,67,0.08)] dark:bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(60,60,67,0.12)] text-[#0B0D12] dark:text-[#F5F5F7] text-[14px] font-extrabold transition-colors cursor-pointer qs-btn-press text-center"
              >
                Chart
              </button>
              <button
                onClick={() => setSelectedSheetItem(featuredItem)}
                className="flex-1 py-3 px-4 rounded-[16px] bg-gradient-to-r from-[#0A84FF] to-[#5E5CE6] text-white text-[14px] font-extrabold shadow-[0_8px_18px_-6px_rgba(10,132,255,0.5)] hover:opacity-95 transition-opacity cursor-pointer qs-btn-press text-center"
              >
                View signal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Open Positions / Scanned Setups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[20px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight">
              Open positions
            </span>
            <span className="text-[12px] font-extrabold text-white bg-[#0A84FF] rounded-full px-2.5 py-0.5 shadow-xs">
              {counts.all}
            </span>
          </div>
        </div>

        {/* Filter chips scrollbar */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3.5">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 px-3.5 py-2 rounded-[18px] text-[13px] font-extrabold border transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "all"
                ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)]"
            }`}
          >
            All <span className="opacity-60 text-[11px] font-bold">{counts.all}</span>
          </button>

          <button
            onClick={() => setFilter("buy")}
            className={`shrink-0 px-3.5 py-2 rounded-[18px] text-[13px] font-extrabold border transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "buy"
                ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)]"
            }`}
          >
            🟢 Add now <span className="opacity-60 text-[11px] font-bold">{counts.buy}</span>
          </button>

          <button
            onClick={() => setFilter("wait")}
            className={`shrink-0 px-3.5 py-2 rounded-[18px] text-[13px] font-extrabold border transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "wait"
                ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)]"
            }`}
          >
            🟠 Extended <span className="opacity-60 text-[11px] font-bold">{counts.wait}</span>
          </button>

          <button
            onClick={() => setFilter("avoid")}
            className={`shrink-0 px-3.5 py-2 rounded-[18px] text-[13px] font-extrabold border transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "avoid"
                ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)]"
            }`}
          >
            🔴 Overextended <span className="opacity-60 text-[11px] font-bold">{counts.avoid}</span>
          </button>
        </div>

        {/* Position card rows */}
        <div className="space-y-2.5">
          {filteredList.map((t: any, idx: number) => {
            const meta = getActionMeta(t.action);
            const isUp = (t.currentROI ?? 0) >= 0;
            const days = t.daysAgo || (t.entryDate ? Math.max(1, Math.round((Date.now() - new Date(t.entryDate).getTime()) / (1000 * 60 * 60 * 24))) : 5);
            const isBought = portfolioSymbols.includes(t.symbol);

            return (
              <div
                key={`${t.symbol}-${idx}`}
                onClick={() => setSelectedSheetItem(t)}
                className="rounded-[20px] p-3.5 sm:p-4 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(16,24,40,0.10)] transition-all cursor-pointer flex items-center gap-3.5 qs-card-hover"
              >
                {/* Left Avatar with state gradient */}
                <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-extrabold text-[15px] text-white shrink-0 ${
                  meta.key === "buy" ? "avatar-buy" : meta.key === "wait" ? "avatar-wait" : "avatar-avoid"
                }`}>
                  {t.symbol?.slice(0, 1) || "S"}
                </div>

                {/* Middle Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[16px] text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight truncate">
                      {t.symbol}
                    </span>
                    {isBought && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#E5FBEA] text-[#1DA53E]">
                        Held
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#6B7079] dark:text-[#98989F] font-semibold truncate mt-0.5">
                    {t.strategyName || "Breakout"} · {days}d ago
                  </div>
                </div>

                {/* Right ROI & state tag */}
                <div className="text-right shrink-0">
                  <div className={`font-extrabold text-[15.5px] tabular ${isUp ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                    {isUp ? "+" : ""}{(t.currentROI ?? 0).toFixed(2)}%
                  </div>
                  <div className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-[8px] mt-0.5 inline-block ${meta.bg} ${meta.text}`}>
                    {meta.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Recently Closed Trades — Ticker Card Scroll */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[20px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight">
            Recently closed
          </div>
          <span className="text-[13px] font-bold text-[#0A84FF]">
            History
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {sampleClosedTrades.map((c, i) => {
            const isWin = c.returnPct >= 0;
            return (
              <div
                key={i}
                onClick={() => setSelectedSheetItem(c as any)}
                className={`shrink-0 w-[140px] rounded-[22px] p-4 text-white cursor-pointer qs-card-hover ${
                  isWin
                    ? "bg-gradient-to-br from-[#34D399] to-[#059669] shadow-[0_10px_20px_-8px_rgba(5,150,105,0.5)]"
                    : "bg-gradient-to-br from-[#64748B] to-[#475569] shadow-[0_10px_20px_-8px_rgba(71,85,105,0.4)]"
                }`}
              >
                <div className="font-extrabold text-[14px] truncate opacity-95 mb-1.5">
                  {c.symbol}
                </div>
                <div className="font-extrabold text-[22px] tracking-tight tabular leading-none">
                  {isWin ? "+" : ""}{c.returnPct.toFixed(1)}%
                </div>
                <div className="text-[11px] opacity-80 font-bold mt-2">
                  {c.holdingDays}d hold
                </div>
                <div className="inline-block mt-2 text-[10px] font-extrabold px-2 py-0.5 rounded-[8px] bg-white/25">
                  {c.pnlLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sheet Detail */}
      <BottomSheet
        isOpen={!!selectedSheetItem}
        onClose={() => setSelectedSheetItem(null)}
        item={selectedSheetItem}
        onOpenChart={onOpenChart}
        onOpenBuyModal={onOpenBuyModal}
        isBought={selectedSheetItem ? portfolioSymbols.includes(selectedSheetItem.symbol) : false}
      />
    </div>
  );
}
