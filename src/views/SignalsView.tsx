import React, { useState } from "react";
import { Bell, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import HeroCard from "../components/HeroCard";
import SymbolAvatar from "../components/SymbolAvatar";
import GrowthBar from "../components/GrowthBar";
import { InTradeTrade } from "../types";
import { formatPercent } from "../constants/theme";

interface SignalsViewProps {
  signals: InTradeTrade[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, currentPrice: number, strategyName?: string) => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

export default function SignalsView({
  signals,
  onOpenChart,
  onOpenBuyModal,
  onRefresh,
  isSyncing = false
}: SignalsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("All strategies");
  const [sortBy, setSortBy] = useState<"date" | "roi" | "holding" | "name">("date");

  // Extract unique strategies for pills
  const strategyList = [
    "All strategies",
    ...Array.from(new Set(signals.map(s => s.strategyName || "Breakout").filter(Boolean)))
  ];

  // Calculations for Hero
  const totalCount = signals.length;
  const inProfitCount = signals.filter(s => (s.currentROI ?? 0) >= 0).length;
  const inDrawdownCount = signals.filter(s => (s.currentROI ?? 0) < 0).length;
  const avgFloatingRoi = totalCount > 0
    ? signals.reduce((acc, curr) => acc + (curr.currentROI ?? 0), 0) / totalCount
    : 0;

  const getTime = (dateStr?: string) => {
    if (!dateStr) return 0;
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Filtered & Sorted signals (Default: entry date latest to oldest)
  const filteredSignals = signals.filter(s => {
    const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.sector && s.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.strategyName && s.strategyName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStrategy = selectedStrategy === "All strategies" || s.strategyName === selectedStrategy;
    return matchesSearch && matchesStrategy;
  }).sort((a, b) => {
    if (sortBy === "date") {
      const timeDiff = getTime(b.entryDate) - getTime(a.entryDate);
      if (timeDiff !== 0) return timeDiff;
      return (b.currentROI ?? 0) - (a.currentROI ?? 0);
    } else if (sortBy === "roi") {
      return (b.currentROI ?? 0) - (a.currentROI ?? 0);
    } else if (sortBy === "holding") {
      return (b.holdingDays || 0) - (a.holdingDays || 0);
    } else {
      return a.symbol.localeCompare(b.symbol);
    }
  });

  return (
    <div className="w-full pb-6">
      {/* Top Row */}
      <div className="flex justify-between items-center mb-[18px]">
        <h1 className="text-[21px] text-[#14151A] dark:text-slate-100 font-bold tracking-[-0.4px]">
          Signals
        </h1>
        <button
          onClick={onRefresh}
          className={`w-[40px] h-[40px] rounded-[13px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 flex items-center justify-center text-[#14151A] dark:text-slate-200 shadow-3xs hover:bg-[#F6F7F9] dark:hover:bg-slate-800 transition-colors ${
            isSyncing ? "animate-spin" : ""
          }`}
          title="Refresh Signals"
        >
          <Bell className="w-4 h-4 text-[#14151A] dark:text-slate-200" />
        </button>
      </div>

      {/* Hero Card */}
      <HeroCard
        eyebrow="Live scan"
        headline={
          <>
            {totalCount} active signals across{" "}
            <b className="text-[#8BF694] font-bold">10 strategies</b>
          </>
        }
        stats={[
          { value: inProfitCount, label: "In profit" },
          { value: inDrawdownCount, label: "In drawdown" },
          {
            value: formatPercent(avgFloatingRoi),
            label: "Avg floating ROI",
            valueColor: avgFloatingRoi >= 0 ? "#8BF694" : "#F97066"
          }
        ]}
        className="mb-5"
      />

      {/* Search Row */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search symbol..."
            className="w-full bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 rounded-[13px] px-3.5 py-[11px] text-[13px] text-[#14151A] dark:text-slate-100 placeholder-[#B3B5C0] font-semibold shadow-3xs outline-hidden focus:border-[#14151A] dark:focus:border-slate-600 transition-colors"
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
          onClick={() => {
            if (sortBy === "date") setSortBy("roi");
            else if (sortBy === "roi") setSortBy("holding");
            else if (sortBy === "holding") setSortBy("name");
            else setSortBy("date");
          }}
          className="w-[42px] h-[42px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 rounded-[13px] flex items-center justify-center text-[#56586A] dark:text-slate-300 shadow-3xs hover:bg-[#F6F7F9] transition-colors"
          title={`Sort: ${sortBy.toUpperCase()}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Strategy Pill Row */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-[18px] no-scrollbar">
        {strategyList.map((strat) => {
          const isActive = selectedStrategy === strat;
          return (
            <button
              key={strat}
              onClick={() => setSelectedStrategy(strat)}
              className={`shrink-0 px-3.5 py-2 rounded-[20px] text-[12px] font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#14151A] text-white border border-[#14151A] dark:bg-slate-100 dark:text-slate-900 shadow-3xs"
                  : "bg-white dark:bg-slate-900 text-[#56586A] dark:text-slate-300 border border-[#ECEEF2] dark:border-slate-800 hover:bg-[#F6F7F9] dark:hover:bg-slate-800"
              }`}
            >
              {strat}
            </button>
          );
        })}
      </div>

      {/* Section Head */}
      <div className="flex justify-between items-baseline mb-3.5 px-0.5">
        <div className="text-[16.5px] font-bold text-[#14151A] dark:text-slate-100 tracking-[-0.2px]">
          {filteredSignals.length} signals
        </div>
        <button
          onClick={() => {
            if (sortBy === "date") setSortBy("roi");
            else if (sortBy === "roi") setSortBy("holding");
            else if (sortBy === "holding") setSortBy("name");
            else setSortBy("date");
          }}
          className="text-[12px] font-semibold text-[#56586A] dark:text-slate-400 hover:text-[#14151A] transition-colors flex items-center gap-1 cursor-pointer"
        >
          Sort: {sortBy === "date" ? "Entry Date ↓" : sortBy === "roi" ? "ROI ↓" : sortBy === "holding" ? "Holding ↓" : "Symbol A-Z"}
        </button>
      </div>

      {/* Signal Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredSignals.length === 0 ? (
          <div className="col-span-full p-8 text-center rounded-[20px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 text-[#8B8D98] text-[13px] font-semibold">
            No signals match the selected filters.
          </div>
        ) : (
          filteredSignals.map((signal, idx) => {
            const isPositive = (signal.currentROI ?? 0) >= 0;
            const holdingDays = signal.holdingDays || 
              (signal.entryDate ? Math.max(1, Math.round((Date.now() - new Date(signal.entryDate).getTime()) / (1000 * 60 * 60 * 24))) : 30);

            return (
              <div
                key={`${signal.symbol}-${idx}`}
                className="rounded-[18px] p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-[0_2px_12px_-4px_rgba(20,25,40,0.06)] transition-all hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] cursor-pointer flex flex-col justify-between"
                onClick={() => onOpenChart(signal.symbol)}
              >
                <div>
                  {/* Top Section */}
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <SymbolAvatar symbol={signal.symbol} gradientIndex={idx} size={40} />
                      <div>
                        <div className="text-[15.5px] font-bold text-[#14151A] dark:text-slate-100 tracking-[-0.2px]">
                          {signal.symbol}
                        </div>
                        <div className="text-[11px] text-[#8B8D98] font-semibold mt-0.5 flex items-center gap-1.5">
                          <span>{signal.strategyName || "Breakout"}</span>
                          {signal.alsoTriggeredBy && signal.alsoTriggeredBy.length > 0 && (
                            <span className="text-[9px] font-bold text-[#6366F1] bg-[#EEF0FE] dark:bg-indigo-950/50 px-1.5 py-0.5 rounded-[6px]">
                              +{signal.alsoTriggeredBy.length} conf
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-[15px] font-extrabold font-mono tracking-tight ${
                          isPositive ? "text-[#16A34A]" : "text-[#F04438]"
                        }`}
                      >
                        {formatPercent(signal.currentROI)}
                      </div>
                      <div className="text-[10px] text-[#8B8D98] font-semibold text-right mt-0.5 font-mono">
                        unrealized
                      </div>
                    </div>
                  </div>

                  {/* Growth Bar */}
                  <div className="mb-2.5">
                    <GrowthBar
                      entryPrice={signal.entryPrice}
                      currentPrice={signal.currentPrice}
                    />
                  </div>
                </div>

                {/* Card Footer */}
                <div
                  className="flex justify-between items-center pt-2 border-t border-[#F1F2F5] dark:border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col">
                    <div className="text-[9.5px] text-[#B3B5C0] font-bold uppercase tracking-[0.3px] font-mono">
                      Holding
                    </div>
                    <div className="text-[12.5px] text-[#14151A] dark:text-slate-100 font-bold mt-0.5">
                      {holdingDays} days
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="text-[9.5px] text-[#B3B5C0] font-bold uppercase tracking-[0.3px] font-mono">
                      Target 1
                    </div>
                    <div
                      className={`text-[12.5px] font-bold mt-0.5 ${
                        signal.t1Triggered ? "text-[#16A34A]" : "text-[#B3B5C0]"
                      }`}
                    >
                      {signal.t1Triggered ? "Hit ✓" : "Not hit"}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenBuyModal(signal.symbol, signal.currentPrice || signal.entryPrice, signal.strategyName)}
                    className="px-3.5 py-1.5 rounded-[10px] bg-[#14151A] dark:bg-slate-100 text-white dark:text-slate-900 text-[11.5px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    Mark bought
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
