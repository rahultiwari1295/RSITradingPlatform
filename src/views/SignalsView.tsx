import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Star
} from "lucide-react";
import HeroCard from "../components/HeroCard";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import { InTradeTrade } from "../types";
import { formatINR } from "../lib/utils";

interface SignalsViewProps {
  signals: InTradeTrade[];
  portfolioSymbols?: string[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, currentPrice: number, strategyName?: string) => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

export type HealthFilterType = "ALL" | "HEALTHY" | "WATCH" | "EXIT_RISK";

const fallbackSignals = [
  { symbol: "WSTCSTPAPR", currentROI: 4.24, currentPrice: 637.25, entryPrice: 611.35, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 81, mlProbability: 77.0, action: "BUY" },
  { symbol: "WHEELS", currentROI: 3.19, currentPrice: 1512.8, entryPrice: 1466.1, entryDate: "2026-08-19", strategyName: "WyckoffSpring", compositeScore: 70, mlProbability: 73.6, action: "BUY" },
  { symbol: "WELSPUNLIV", currentROI: 14.64, currentPrice: 189.22, entryPrice: 165.05, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 75, mlProbability: 73.2, action: "WAIT" },
  { symbol: "UFLEX", currentROI: 10.74, currentPrice: 614.6, entryPrice: 555, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 82, mlProbability: 79.0, action: "WAIT" },
  { symbol: "TORNTPHARM", currentROI: -1.78, currentPrice: 4896.5, entryPrice: 4985, entryDate: "2026-07-27", strategyName: "Decouple", compositeScore: 77, mlProbability: 70.0, action: "BUY_NOW" },
  { symbol: "TIPSMUSIC", currentROI: -6.93, currentPrice: 650.95, entryPrice: 699.45, entryDate: "2026-07-20", strategyName: "WyckoffSpring", compositeScore: 75, mlProbability: 78.8, action: "BUY_NOW" },
  { symbol: "TI", currentROI: 16.11, currentPrice: 575.65, entryPrice: 495.8, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 79, mlProbability: 71.7, action: "MISSED" },
  { symbol: "TFCILTD", currentROI: 47.18, currentPrice: 130.99, entryPrice: 89, entryDate: "2026-07-27", strategyName: "Decouple", compositeScore: 81, mlProbability: 84.4, action: "MISSED" },
  { symbol: "SUNDRMFAST", currentROI: 12.45, currentPrice: 1228, entryPrice: 1092, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 84, mlProbability: 82.7, action: "WAIT" },
  { symbol: "RKFORGE", currentROI: 11.73, currentPrice: 737.05, entryPrice: 659.7, entryDate: "2026-08-03", strategyName: "Alpha", compositeScore: 79, mlProbability: 70.6, action: "WAIT" },
  { symbol: "RADICO", currentROI: 23.1, currentPrice: 4639.8, entryPrice: 3769.2, entryDate: "2026-06-15", strategyName: "Breakout", compositeScore: 74, mlProbability: 75.3, action: "MISSED" },
  { symbol: "MOTHERSON", currentROI: 10.78, currentPrice: 169.38, entryPrice: 152.9, entryDate: "2026-08-03", strategyName: "Alpha", compositeScore: 76, mlProbability: 72.6, action: "WAIT" },
  { symbol: "MONARCH", currentROI: -1.2, currentPrice: 385.45, entryPrice: 390.15, entryDate: "2026-07-27", strategyName: "Breakout", compositeScore: 76, mlProbability: 73.5, action: "BUY_NOW" },
  { symbol: "MEDANTA", currentROI: -0.21, currentPrice: 1409.7, entryPrice: 1412.6, entryDate: "2026-08-03", strategyName: "Breakout", compositeScore: 71, mlProbability: 71.1, action: "BUY_NOW" },
  { symbol: "MANINDS", currentROI: 17.83, currentPrice: 715.4, entryPrice: 607.15, entryDate: "2026-08-17", strategyName: "Breakout", compositeScore: 82, mlProbability: 79.4, action: "MISSED" },
  { symbol: "GOODLUCK", currentROI: 10.31, currentPrice: 490.9, entryPrice: 445, entryDate: "2026-08-17", strategyName: "WyckoffSpring", compositeScore: 76, mlProbability: 87.5, action: "WAIT" },
  { symbol: "ENTERO", currentROI: 0.49, currentPrice: 1423.6, entryPrice: 1416.6, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 74, mlProbability: 72.5, action: "BUY_NOW" },
  { symbol: "DALMIASUG", currentROI: 16.89, currentPrice: 497.95, entryPrice: 426, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 81, mlProbability: 76.9, action: "MISSED" },
  { symbol: "BELRISE", currentROI: -7.55, currentPrice: 231.77, entryPrice: 250.69, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 71, mlProbability: 71.4, action: "BUY_NOW" },
  { symbol: "ACE", currentROI: 0, currentPrice: 1182.2, entryPrice: 1182.2, entryDate: "2026-08-17", strategyName: "Breakout", compositeScore: 83, mlProbability: 83.6, action: "BUY_NOW" },
  { symbol: "VSSL", currentROI: 0.49, currentPrice: 348.7, entryPrice: 347, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 80, mlProbability: 74.6, action: "BUY_NOW" }
];

export default function SignalsView({
  signals,
  portfolioSymbols = [],
  onOpenChart,
  onOpenBuyModal,
  onRefresh,
  isSyncing = false
}: SignalsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthFilterType>("ALL");
  const [sortBy, setSortBy] = useState<"roi" | "date" | "name">("roi");
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  const rawSignals = signals && signals.length > 0 ? signals : (fallbackSignals as any);

  // Processed signals with health calculation
  const processedTrades = useMemo(() => {
    return rawSignals.map((trade: any, idx: number) => {
      const roi = trade.currentROI ?? 0;
      const days = trade.holdingDays || (trade.entryDate ? Math.max(1, Math.round((Date.now() - new Date(trade.entryDate).getTime()) / (1000 * 60 * 60 * 24))) : 12);
      
      let health: "HEALTHY" | "WATCH" | "EXIT_RISK" = "HEALTHY";
      if (roi <= -4.0) health = "EXIT_RISK";
      else if (roi < 0 && days > 20) health = "WATCH";
      else if (roi >= 8.0) health = "HEALTHY";
      
      const act = (trade.action || (roi >= 10 ? "WAIT" : roi < -3 ? "BUY_NOW" : "BUY")).toUpperCase();

      return {
        ...trade,
        idx,
        roi,
        days,
        health,
        action: act
      };
    });
  }, [rawSignals]);

  const healthyCount = processedTrades.filter((t: any) => t.health === "HEALTHY").length;
  const watchCount = processedTrades.filter((t: any) => t.health === "WATCH").length;
  const exitRiskCount = processedTrades.filter((t: any) => t.health === "EXIT_RISK").length;
  const avgFloatingRoi = processedTrades.length > 0
    ? processedTrades.reduce((acc: number, curr: any) => acc + curr.roi, 0) / processedTrades.length
    : 0;

  const filteredSignals = useMemo(() => {
    return processedTrades.filter((s: any) => {
      const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.strategyName && s.strategyName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesHealth = healthFilter === "ALL" || s.health === healthFilter;
      return matchesSearch && matchesHealth;
    }).sort((a: any, b: any) => {
      if (sortBy === "roi") return b.roi - a.roi;
      if (sortBy === "name") return a.symbol.localeCompare(b.symbol);
      return new Date(b.entryDate || 0).getTime() - new Date(a.entryDate || 0).getTime();
    });
  }, [processedTrades, searchQuery, healthFilter, sortBy]);

  const getAvatarClass = (roi: number) => {
    if (roi >= 4) return "avatar-buy";
    if (roi >= 0) return "avatar-wait";
    return "avatar-avoid";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Hero Card */}
      <HeroCard
        eyebrow="ACTIVE SCAN · LIVE RUNNING"
        bigNumber={processedTrades.length.toString()}
        bigLabel="running signals"
        badge="+2.58x"
        stats={[
          { value: healthyCount, label: "HEALTHY", valueColor: "#8BF694" },
          { value: watchCount + exitRiskCount, label: "WATCH / RISK", valueColor: watchCount + exitRiskCount > 0 ? "#F97066" : "#FFFFFF" },
          {
            value: `${avgFloatingRoi >= 0 ? "+" : ""}${avgFloatingRoi.toFixed(1)}%`,
            label: "AVG RETURN",
            valueColor: avgFloatingRoi >= 0 ? "#8BF694" : "#F97066"
          }
        ]}
      />

      {/* 2. Controls & Search Bar */}
      <div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search signal or strategy..."
              className="w-full bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px] px-3.5 py-2.5 text-[13px] text-[#0B0D12] dark:text-[#F5F5F7] placeholder-[#A2A6AE] font-semibold outline-hidden focus:border-[#0A84FF] transition-colors shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setSortBy(prev => prev === "roi" ? "date" : prev === "date" ? "name" : "roi")}
            className="px-3.5 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px] flex items-center gap-1.5 text-[12px] font-extrabold text-[#6B7079] dark:text-[#98989F] shadow-xs hover:bg-[#F2F3F7] dark:hover:bg-[#2C2C2E] cursor-pointer"
            title={`Sort: ${sortBy.toUpperCase()}`}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#0A84FF]" />
            <span className="font-mono uppercase">{sortBy}</span>
          </button>
        </div>

        {/* Health Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "ALL", label: "All Active", count: processedTrades.length },
            { id: "HEALTHY", label: "🟢 Healthy", count: healthyCount },
            { id: "WATCH", label: "🟠 Watch", count: watchCount },
            { id: "EXIT_RISK", label: "🔴 Exit Risk", count: exitRiskCount }
          ].map((h) => {
            const isActive = healthFilter === h.id;

            return (
              <button
                key={h.id}
                onClick={() => setHealthFilter(h.id as HealthFilterType)}
                className={`shrink-0 px-3.5 py-1.5 rounded-[18px] text-[12.5px] font-extrabold border transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                    : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)]"
                }`}
              >
                <span>{h.label}</span>
                <span className="text-[11px] font-bold opacity-65">{h.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Signal Card Rows */}
      <div className="space-y-2.5">
        {filteredSignals.length === 0 ? (
          <div className="p-8 text-center rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] text-[#A2A6AE] text-[13px] font-semibold">
            No active signals match the selected criteria.
          </div>
        ) : (
          filteredSignals.map((signal: any, idx: number) => {
            const isUp = signal.roi >= 0;
            const isBought = portfolioSymbols.includes(signal.symbol);
            const avatarClass = getAvatarClass(signal.roi);

            return (
              <div
                key={`${signal.symbol}-${idx}`}
                onClick={() => setSelectedSheetItem(signal)}
                className="rounded-[20px] p-3.5 sm:p-4 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(16,24,40,0.10)] transition-all cursor-pointer flex items-center gap-3.5 qs-card-hover"
              >
                {/* Left avatar with gradient */}
                <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-extrabold text-[15px] text-white shrink-0 ${avatarClass}`}>
                  {signal.symbol?.slice(0, 1) || "S"}
                </div>

                {/* Middle Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[16px] text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight truncate">
                      {signal.symbol}
                    </span>
                    {isBought && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#E5FBEA] text-[#1DA53E]">
                        Held
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#6B7079] dark:text-[#98989F] font-semibold truncate mt-0.5">
                    {signal.strategyName || "Alpha"} · {signal.days}d hold
                  </div>
                </div>

                {/* Right ROI & action tag */}
                <div className="text-right shrink-0">
                  <div className={`font-extrabold text-[15.5px] tabular ${isUp ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                    {isUp ? "+" : ""}{signal.roi.toFixed(2)}%
                  </div>
                  <div className="text-[11px] font-semibold text-[#A2A6AE] dark:text-[#636366] tabular mt-0.5">
                    {formatINR(signal.currentPrice || signal.entryPrice || 0)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sheet Modal */}
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
