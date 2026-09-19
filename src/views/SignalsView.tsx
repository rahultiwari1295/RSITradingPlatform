import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Star,
  LineChart,
  ArrowRight
} from "lucide-react";
import HeroCard from "../components/HeroCard";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import InstitutionalPatternChart from "../components/charts/InstitutionalPatternChart";
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

const avatarGradients = [
  "from-[#818CF8] to-[#6366F1]",
  "from-[#FB923C] to-[#EA580C]",
  "from-[#34D399] to-[#059669]",
  "from-[#F87171] to-[#EF4444]",
  "from-[#A78BFA] to-[#8B5CF6]",
  "from-[#22D3EE] to-[#06B6D4]"
];

export default function SignalsView({
  signals = [],
  portfolioSymbols = [],
  onOpenChart,
  onOpenBuyModal,
  onRefresh,
  isSyncing = false
}: SignalsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<HealthFilterType>("ALL");
  const [sortBy, setSortBy] = useState<"date" | "roi" | "name">("date");
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  const rawSignals = Array.isArray(signals) ? signals : [];

  // Processed signals with health calculation
  const processedTrades = useMemo(() => {
    return rawSignals.map((trade: any, idx: number) => {
      const roi = trade.currentROI ?? 0;
      const days = trade.holdingDays || (trade.entryDate ? Math.max(1, Math.round((Date.now() - new Date(trade.entryDate).getTime()) / (1000 * 60 * 60 * 24))) : 12);
      
      let health: "HEALTHY" | "WATCH" | "EXIT_RISK" = "HEALTHY";
      if (roi <= -4.0) health = "EXIT_RISK";
      else if (roi < 0 && days > 20) health = "WATCH";
      else if (roi >= 6.0) health = "HEALTHY";
      
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

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. Hero Card */}
      <HeroCard
        eyebrow="ACTIVE SIGNALS · SCANNING LIVE"
        headline={
          <span>
            Tracking <span className="text-[#8BF694]">{processedTrades.length} setups</span> with trailing stop logic.
          </span>
        }
        badge="Live Terminal"
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

      {/* 2. Search & Sort Controls */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active symbols or strategies..."
            className="w-full bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] rounded-[14px] px-3.5 py-2.5 text-[13px] text-[#14151A] dark:text-white placeholder-[#8B8D98] font-medium outline-hidden focus:border-[#6366F1] transition-colors qs-card-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B8D98] font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => setSortBy(prev => prev === "roi" ? "date" : prev === "date" ? "name" : "roi")}
          className="px-3.5 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] rounded-[14px] flex items-center gap-1.5 text-[12px] font-bold text-[#56586A] dark:text-[#8B8D98] qs-card-shadow hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="capitalize">{sortBy}</span>
        </button>
      </div>

      {/* 3. Health Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setHealthFilter("ALL")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
            healthFilter === "ALL"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
          }`}
        >
          All <span className="opacity-60 font-mono text-[10.5px]">{processedTrades.length}</span>
        </button>

        <button
          onClick={() => setHealthFilter("HEALTHY")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
            healthFilter === "HEALTHY"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
          }`}
        >
          🟢 Healthy <span className="opacity-60 font-mono text-[10.5px]">{healthyCount}</span>
        </button>

        <button
          onClick={() => setHealthFilter("WATCH")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
            healthFilter === "WATCH"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
          }`}
        >
          🟠 Watch <span className="opacity-60 font-mono text-[10.5px]">{watchCount}</span>
        </button>

        <button
          onClick={() => setHealthFilter("EXIT_RISK")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
            healthFilter === "EXIT_RISK"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
          }`}
        >
          🔴 Exit Risk <span className="opacity-60 font-mono text-[10.5px]">{exitRiskCount}</span>
        </button>
      </div>

      {/* 4. Active Signals List */}
      <div className="space-y-2.5">
        {filteredSignals.length === 0 ? (
          <div className="rounded-[20px] p-8 text-center bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow">
            <div className="text-[15px] font-bold text-[#14151A] dark:text-white mb-1">
              No Active Signals
            </div>
            <div className="text-[12.5px] text-[#8B8D98] max-w-sm mx-auto">
              {searchQuery || healthFilter !== "ALL"
                ? "No active trades match your search query or filter."
                : "No in-trade positions are currently being tracked. New signals will appear here when triggered."}
            </div>
          </div>
        ) : (
          filteredSignals.map((t: any, idx: number) => {
          const isUp = t.roi >= 0;
          const isBought = portfolioSymbols.includes(t.symbol);
          const gradClass = avatarGradients[idx % avatarGradients.length];
          const daysHeld = t.days || 1;
          const currentPrice = Number(t.currentPrice || t.entryPrice || 100);
          const entryPrice = Number(t.entryPrice || currentPrice);
          const stopPrice = Number(t.stopLoss || t.stop || entryPrice * 0.92);
          const targetPrice = Number(t.targetPrice || t.target || entryPrice * 1.15);
          const pivotPrice = Number(t.pivot || entryPrice * 0.98);
          const baseFloor = Number(t.baseFloor || stopPrice * 0.94);

          // Status tag
          let tagLabel = "BUY", tagBg = "rgba(16, 185, 129, 0.12)", tagColor = "#10B981", tagBorder = "rgba(16, 185, 129, 0.35)";
          if (t.roi >= 7.0) {
            tagLabel = "MISSED"; tagBg = "rgba(168, 85, 247, 0.12)"; tagColor = "#A855F7"; tagBorder = "rgba(168, 85, 247, 0.35)";
          } else if ((daysHeld >= 6 && t.roi < 2.0) || t.roi <= -3.5) {
            tagLabel = "SKIPPED"; tagBg = "rgba(148, 163, 184, 0.14)"; tagColor = "#94A3B8"; tagBorder = "rgba(148, 163, 184, 0.35)";
          } else if ((daysHeld >= 4 && t.roi >= 3.0) || t.roi >= 5.0) {
            tagLabel = "LATE"; tagBg = "rgba(245, 158, 11, 0.12)"; tagColor = "#F59E0B"; tagBorder = "rgba(245, 158, 11, 0.35)";
          }

          const patternName = t.strategyName || t.patternName || "Stage 2 Base 📐";
          const cleanPattern = patternName.replace(/📐|🚀|📦/g, "").trim();

          return (
            <div
              key={`${t.symbol}-${idx}`}
              onClick={() => setSelectedSheetItem(t)}
              className="rounded-[20px] p-4 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover transition-all cursor-pointer"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0 font-mono`}>
                    {t.symbol?.slice(0, 2) || "ST"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-[15px] text-[#14151A] dark:text-white tracking-tight">
                        {t.symbol}
                      </span>
                      <span className="text-[#F59E0B] text-xs font-bold tracking-tighter">
                        ★★★★★
                      </span>
                      {isBought && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]/40 font-mono">
                          HELD
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-semibold truncate mt-0.5">
                      {patternName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBuyModal(t.symbol, currentPrice, patternName);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F1F2F5] dark:bg-white/[0.08] text-[#6366F1] dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    + ADD
                  </button>
                  <div className={`text-[14px] font-extrabold font-mono tabular ${isUp ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                    {isUp ? "+" : ""}{t.roi.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Clean Signal Date line with Status Tag */}
              <div className="text-[11px] text-[#8B8D98] mb-3 flex items-center gap-2 flex-wrap">
                <div>
                  <span>Signal Date : </span>
                  <span className="font-semibold text-[#14151A] dark:text-white font-mono">
                    {t.entryDate || "2026-09-18"}
                  </span>
                  <span> ( {daysHeld} {daysHeld === 1 ? "Day" : "Days"} )</span>
                </div>
                <span
                  style={{
                    background: tagBg,
                    color: tagColor,
                    border: `1px solid ${tagBorder}`,
                  }}
                  className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider"
                >
                  {tagLabel}
                </span>
              </div>

              {/* Institutional Breakout Pattern Chart */}
              <div className="mb-3">
                <InstitutionalPatternChart
                  symbol={t.symbol}
                  name={t.name}
                  sector={t.sector || "Diversified"}
                  stage={patternName}
                  patternName={cleanPattern}
                  breakoutDate={t.entryDate || "2026-09-18"}
                  pivotPrice={pivotPrice}
                  entryPrice={entryPrice}
                  stopPrice={stopPrice}
                  targetPrice={targetPrice}
                  currentPrice={currentPrice}
                  baseFloor={baseFloor}
                  baseLengthStr={t.baseWeeks || "98.4 wks"}
                  handleLengthStr={patternName.includes("Base") || patternName.includes("Cup") ? "54.4 wks" : undefined}
                  breakoutVolumeMultiplier={Number(t.breakoutVol || 4.85)}
                  closeInRange={0.82}
                  rsRating={Number(t.rsRating || t.compositeScore || 91)}
                  seed={t.seed || (idx * 37 + 101)}
                  showOverviewGrid={true}
                />
              </div>

              {/* 4 Small Boxes in sequence: Stop | Entry | Current | Target */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-[#F8F9FB] dark:bg-white/[0.03] rounded-xl p-2 text-center border border-[#ECEEF2] dark:border-white/[0.05]">
                  <div className="text-[10px] uppercase font-bold text-[#8B8D98]">Stop</div>
                  <div className="text-xs font-bold text-rose-500 font-mono mt-0.5">{formatINR(stopPrice)}</div>
                </div>
                <div className="bg-[#F8F9FB] dark:bg-white/[0.03] rounded-xl p-2 text-center border border-[#ECEEF2] dark:border-white/[0.05]">
                  <div className="text-[10px] uppercase font-bold text-[#8B8D98]">Entry</div>
                  <div className="text-xs font-bold text-[#14151A] dark:text-white font-mono mt-0.5">{formatINR(entryPrice)}</div>
                </div>
                <div className="bg-[#F8F9FB] dark:bg-white/[0.03] rounded-xl p-2 text-center border border-[#ECEEF2] dark:border-white/[0.05]">
                  <div className="text-[10px] uppercase font-bold text-[#8B8D98]">Current</div>
                  <div className="text-xs font-bold text-[#6366F1] font-mono mt-0.5">{formatINR(currentPrice)}</div>
                </div>
                <div className="bg-[#F8F9FB] dark:bg-white/[0.03] rounded-xl p-2 text-center border border-[#ECEEF2] dark:border-white/[0.05]">
                  <div className="text-[10px] uppercase font-bold text-[#8B8D98]">Target</div>
                  <div className="text-xs font-bold text-emerald-500 font-mono mt-0.5">{formatINR(targetPrice)}</div>
                </div>
              </div>

              {/* Action Buttons row */}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onOpenChart(t.symbol)}
                  className="flex-1 py-2 px-3 rounded-[10px] bg-[#F1F2F5] dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-[#14151A] dark:text-white text-[12px] font-bold transition-colors cursor-pointer qs-btn-press text-center flex items-center justify-center gap-1.5"
                >
                  <LineChart className="w-3.5 h-3.5 text-[#6366F1]" />
                  Chart
                </button>
                <button
                  onClick={() => setSelectedSheetItem(t)}
                  className="flex-1 py-2 px-3 rounded-[10px] bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] text-[12px] font-bold hover:opacity-90 transition-opacity cursor-pointer qs-btn-press text-center flex items-center justify-center gap-1"
                >
                  Details
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        }))}
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
