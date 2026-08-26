import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Gauge
} from "lucide-react";
import HeroCard, { HeroStat } from "../components/HeroCard";
import SymbolAvatar from "../components/SymbolAvatar";
import type { MarketIndex } from "../types";
import type { UseMarketSocketReturn } from "../hooks/useMarketSocket";

interface MarketViewProps {
  marketSocket: UseMarketSocketReturn;
  onOpenChart?: (symbol: string) => void;
}

export default function MarketView({ marketSocket, onOpenChart }: MarketViewProps) {
  const {
    indices,
    breadth,
    marketStatus,
    refreshData,
    isRefreshing
  } = marketSocket;

  const [activeCategory, setActiveCategory] = useState<"all" | "benchmark" | "sectoral" | "broad">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "gainers" | "losers" | "alphabetical">("default");

  // Filtered & sorted indices
  const filteredIndices = useMemo(() => {
    let result = [...indices];

    if (activeCategory !== "all") {
      result = result.filter(idx => idx.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(idx =>
        idx.symbol.toLowerCase().includes(q) ||
        idx.name.toLowerCase().includes(q)
      );
    }

    if (sortBy === "gainers") {
      result.sort((a, b) => b.changePercent - a.changePercent);
    } else if (sortBy === "losers") {
      result.sort((a, b) => a.changePercent - b.changePercent);
    } else if (sortBy === "alphabetical") {
      result.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return result;
  }, [indices, activeCategory, searchQuery, sortBy]);

  // Major benchmarks for hero tiles
  const benchmarkIndices = useMemo(() => {
    const majorSymbols = ["NIFTY 50", "BANKNIFTY", "SENSEX", "INDIA VIX", "FINNIFTY", "NIFTY MIDCAP 100"];
    return majorSymbols
      .map(sym => indices.find(i => i.symbol === sym))
      .filter(Boolean) as MarketIndex[];
  }, [indices]);

  // Hero headline configuration
  const advCount = breadth?.advances || 342;
  const decCount = breadth?.declines || 148;
  const isAdvancing = advCount >= decCount;

  const heroHeadline = (
    <span>
      Indian Market Indices & Sectoral Breadth are{" "}
      <span className={isAdvancing ? "text-[#8BF694]" : "text-[#F97066]"}>
        {isAdvancing ? "Bullish & Active" : "Consolidating"}
      </span>.
    </span>
  );

  const heroStats: HeroStat[] = [
    {
      value: `${indices.length} Indices`,
      label: "Tracked Feeds",
      valueColor: "#8BF694"
    },
    {
      value: `${advCount} : ${decCount}`,
      label: "Adv / Dec Ratio",
      valueColor: isAdvancing ? "#8BF694" : "#F97066"
    },
    {
      value: `${breadth?.vixLevel ? breadth.vixLevel.toFixed(2) : "13.42"}`,
      label: "India VIX",
      valueColor: (breadth?.vixLevel || 13.42) < 18 ? "#8BF694" : "#F97066"
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      
      {/* 1. Dark Hero Card (Once per screen per Design System) */}
      <HeroCard
        eyebrow="MARKET OVERVIEW & INDICES"
        headline={heroHeadline}
        badge={marketStatus === "OPEN" ? "NSE LIVE" : `MKT ${marketStatus}`}
        stats={heroStats}
      />

      {/* 2. Major Benchmarks Grid (Key Index Tiles) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[16.5px] font-bold text-[#14151A] dark:text-white tracking-tight">
            Key Benchmarks
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshData && refreshData()}
              disabled={isRefreshing}
              title="Refresh market rates"
              className="p-1 rounded-[8px] bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/10 text-[#56586A] dark:text-slate-300 hover:text-[#6366F1] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#6366F1]" : ""}`} />
            </button>
            <span className="text-[11px] font-bold text-[#8B8D98] font-mono">
              {benchmarkIndices.length} ACTIVE FEEDS
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {benchmarkIndices.map((idx, i) => {
            const isPos = idx.change >= 0;
            const rangePct = idx.high > idx.low
              ? Math.min(100, Math.max(0, ((idx.ltp - idx.low) / (idx.high - idx.low)) * 100))
              : 50;

            return (
              <div
                key={idx.symbol}
                onClick={() => onOpenChart && onOpenChart(idx.symbol.replace(/\s+/g, ""))}
                className="bg-white dark:bg-[#14161E] rounded-[22px] p-4 border border-[#ECEEF2] dark:border-white/[0.08] shadow-3xs hover:border-[#6366F1]/30 transition-all cursor-pointer qs-btn-press"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <SymbolAvatar symbol={idx.symbol} gradientIndex={i} size={36} />
                    <div>
                      <div className="text-[14.5px] font-bold text-[#14151A] dark:text-white tracking-tight leading-none">
                        {idx.symbol}
                      </div>
                      <div className="text-[11px] text-[#8B8D98] mt-0.5">
                        {idx.name}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono flex items-center gap-0.5 ${
                      isPos
                        ? "bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]/40"
                        : "bg-[#FEF3F2] text-[#F04438] border border-[#FECDCA]/40"
                    }`}
                  >
                    {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isPos ? "+" : ""}{idx.changePercent.toFixed(2)}%
                  </span>
                </div>

                {/* Price & Change */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-[22px] font-extrabold text-[#14151A] dark:text-white font-mono tracking-tight tabular">
                    ₹{idx.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[12px] font-bold font-mono ${isPos ? "text-[#16A34A]" : "text-[#F04438]"}`}>
                    {isPos ? "+" : ""}{idx.change.toFixed(2)}
                  </div>
                </div>

                {/* Day Range Progress Bar */}
                <div className="mt-3 pt-2.5 border-t border-[#F1F2F5] dark:border-white/[0.06]">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-[#8B8D98] font-mono mb-1">
                    <span>L: ₹{idx.low.toFixed(1)}</span>
                    <span className="text-[#56586A] dark:text-slate-400">Day Range ({rangePct.toFixed(0)}%)</span>
                    <span>H: ₹{idx.high.toFixed(1)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#F1F2F5] dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPos ? "bg-gradient-to-r from-[#86EFAC] to-[#16A34A]" : "bg-gradient-to-r from-[#FECDCA] to-[#F04438]"
                      }`}
                      style={{ width: `${rangePct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Market Breadth & Sentiment Radar */}
      {breadth && (
        <div className="bg-white dark:bg-[#14161E] rounded-[22px] p-4 sm:p-5 border border-[#ECEEF2] dark:border-white/[0.08] shadow-3xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#6366F1]" />
              <h3 className="text-[15px] font-bold text-[#14151A] dark:text-white tracking-tight">
                Market Breadth & Sentiment
              </h3>
            </div>
            <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#EEF0FE] text-[#6366F1] dark:bg-indigo-950/40 dark:text-indigo-300">
              {breadth.marketSentiment.replace("_", " ")}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11.5px] font-bold font-mono mb-1.5">
              <span className="text-[#16A34A] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> {breadth.advances} Advancing
              </span>
              <span className="text-[#8B8D98]">
                Ratio {breadth.advDecRatio}:1
              </span>
              <span className="text-[#F04438] flex items-center gap-1">
                {breadth.declines} Declining <TrendingDown className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-[#F1F2F5] dark:bg-white/10 flex overflow-hidden">
              <div
                className="h-full bg-[#16A34A] transition-all duration-500"
                style={{ width: `${(breadth.advances / (breadth.advances + breadth.declines)) * 100}%` }}
              />
              <div
                className="h-full bg-[#F04438] transition-all duration-500"
                style={{ width: `${(breadth.declines / (breadth.advances + breadth.declines)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Sectoral & Broad Indices List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h2 className="text-[16.5px] font-bold text-[#14151A] dark:text-white tracking-tight">
            Sectoral & Broad Indices
          </h2>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8B8D98] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, symbol, sector..."
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/10 text-[12px] text-[#14151A] dark:text-white focus:outline-none focus:border-[#6366F1]"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer shrink-0 ${
              activeCategory === "all"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            All Indices ({indices.length})
          </button>
          <button
            onClick={() => setActiveCategory("benchmark")}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer shrink-0 ${
              activeCategory === "benchmark"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setActiveCategory("sectoral")}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer shrink-0 ${
              activeCategory === "sectoral"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            Sectoral ({indices.filter(i => i.category === "sectoral").length})
          </button>
          <button
            onClick={() => setActiveCategory("broad")}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer shrink-0 ${
              activeCategory === "broad"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            Broad Market
          </button>

          {/* Sort Selector */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-[#8B8D98]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 rounded-[10px] bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/10 text-[11.5px] font-bold text-[#14151A] dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="gainers">Top Gainers</option>
              <option value="losers">Top Losers</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        </div>

        {/* INDICES LIST */}
        <div className="space-y-2.5">
          {filteredIndices.map((idx, i) => {
            const isPos = idx.change >= 0;

            return (
              <div
                key={idx.symbol}
                onClick={() => onOpenChart && onOpenChart(idx.symbol.replace(/\s+/g, ""))}
                className="bg-white dark:bg-[#14161E] rounded-[20px] p-3.5 sm:p-4 border border-[#ECEEF2] dark:border-white/[0.08] shadow-3xs hover:border-[#6366F1]/30 transition-all flex items-center justify-between gap-3 cursor-pointer qs-btn-press"
              >
                {/* Left: Avatar & Symbol Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <SymbolAvatar symbol={idx.symbol} gradientIndex={i} size={40} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-[#14151A] dark:text-white tracking-tight truncate">
                        {idx.symbol}
                      </span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-[6px] bg-[#F1F2F5] dark:bg-white/10 text-[#56586A] dark:text-slate-300 font-mono">
                        {idx.exchange}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#8B8D98] truncate">
                      {idx.name}
                    </div>
                  </div>
                </div>

                {/* Right: LTP & Percentage */}
                <div className="text-right shrink-0">
                  <div className="text-[16px] sm:text-[17px] font-extrabold text-[#14151A] dark:text-white font-mono tracking-tight tabular">
                    ₹{idx.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`inline-flex items-center gap-0.5 text-[11.5px] font-bold font-mono ${
                      isPos ? "text-[#16A34A]" : "text-[#F04438]"
                    }`}
                  >
                    {isPos ? "+" : ""}{idx.changePercent.toFixed(2)}% ({isPos ? "+" : ""}{idx.change.toFixed(1)})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
