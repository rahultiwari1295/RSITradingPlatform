import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Check,
  AlertTriangle,
  Zap,
  Bot,
  TrendingUp,
  X,
  ArrowLeft,
  Bell,
  SlidersHorizontal,
  Star,
  StarHalf,
  Sparkles
} from 'lucide-react';
import HeroCard from '../components/HeroCard';
import SymbolAvatar from '../components/SymbolAvatar';
import GrowthBar from '../components/GrowthBar';
import { ToBuySignal } from '../types';
import { formatINR, formatPercent } from '../constants/theme';

interface HomeViewProps {
  toBuySignals?: ToBuySignal[];
  signals?: any[]; // legacy fallback
  portfolioSymbols?: string[];
  onOpenChart?: (symbol: string) => void;
  onMarkBought?: (symbol: string, price: number, strategyName?: string) => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

export type ActionType = "ALL" | "BUY_NOW" | "BUY" | "WAIT" | "MISSED";

export default function HomeView({
  toBuySignals: propToBuySignals = [],
  signals: legacySignals = [],
  portfolioSymbols = [],
  onOpenChart,
  onMarkBought,
  onRefresh,
  isSyncing = false
}: HomeViewProps) {
  const [activeFilter, setActiveFilter] = useState<ActionType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"action" | "score" | "roi" | "symbol">("action");
  const [boughtStatus, setBoughtStatus] = useState<Record<string, boolean>>({});
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string | null>(null);

  // Fallback demo items matching backend schema if API is empty
  const fallbackSignals: ToBuySignal[] = useMemo(() => [
    {
      symbol: "ACE",
      currentROI: 0.0,
      currentPrice: 1182.20,
      entryPrice: 1182.20,
      entryDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
      strategyName: "Breakout setup",
      sector: "Diversified",
      compositeScore: 83,
      mlProbability: 83.6,
      riskScore: 40,
      technicalScore: 94,
      stars: 3.5,
      starsDisplay: "★★★½☆",
      action: "BUY_NOW",
      actionLabel: "BUY NOW",
      actionColor: "green",
      slippageText: "0.0% slippage",
      footerLine: "⚡ 6d ago  •  🤖 ML 83.6%  •  📈 Tech Grade 94"
    },
    {
      symbol: "WHEELS",
      currentROI: 2.9,
      currentPrice: 1508.00,
      entryPrice: 1466.10,
      entryDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      strategyName: "Wyckoff spring",
      sector: "Auto Ancillary",
      compositeScore: 75,
      mlProbability: 73.6,
      riskScore: 48,
      technicalScore: 74,
      stars: 3.0,
      starsDisplay: "★★★☆☆",
      action: "BUY",
      actionLabel: "BUY",
      actionColor: "amber",
      slippageText: "+2.9% slippage",
      footerLine: "⚡ 4d ago  •  🤖 ML 73.6%  •  📈 Tech Grade 74"
    },
    {
      symbol: "WELSPUNLIV",
      currentROI: 14.6,
      currentPrice: 189.22,
      entryPrice: 165.05,
      entryDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      strategyName: "Alpha leader RS",
      sector: "Textiles",
      compositeScore: 88,
      mlProbability: 85.2,
      riskScore: 35,
      technicalScore: 91,
      stars: 4.5,
      starsDisplay: "★★★★½",
      action: "WAIT",
      actionLabel: "WAIT",
      actionColor: "orange",
      waitReason: "Already up 14.6% from entry ₹165.05 — wait for pullback",
      slippageText: "+14.6% slippage",
      footerLine: "⚡ 2d ago  •  🤖 ML 85.2%  •  📈 Tech Grade 91"
    },
    {
      symbol: "MANINDS",
      currentROI: 17.8,
      currentPrice: 715.40,
      entryPrice: 607.15,
      entryDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      strategyName: "Breakout setup",
      sector: "Industrial",
      compositeScore: 78,
      mlProbability: 71.4,
      riskScore: 55,
      technicalScore: 80,
      stars: 3.5,
      starsDisplay: "★★★½☆",
      action: "MISSED",
      actionLabel: "MISSED",
      actionColor: "red",
      missedNote: "Entry ₹607.15 · don't chase",
      slippageText: "+17.8% slippage",
      footerLine: "⚡ 5d ago  •  🤖 ML 71.4%  •  📈 Tech Grade 80"
    }
  ], []);

  // Normalize source signals
  const rawList: ToBuySignal[] = (propToBuySignals && propToBuySignals.length > 0)
    ? propToBuySignals
    : (legacySignals && legacySignals.length > 0)
      ? legacySignals.map(s => ({
          ...s,
          action: (s.currentROI ?? 0) > 16 ? "MISSED" : (s.currentROI ?? 0) > 8 ? "WAIT" : (s.currentROI ?? 0) <= 2 ? "BUY_NOW" : "BUY",
          actionLabel: (s.currentROI ?? 0) > 16 ? "MISSED" : (s.currentROI ?? 0) > 8 ? "WAIT" : (s.currentROI ?? 0) <= 2 ? "BUY NOW" : "BUY",
          stars: s.stars ?? 3.5,
          starsDisplay: s.starsDisplay ?? "★★★½☆",
          technicalScore: s.technicalScore ?? s.compositeScore ?? 80
        }))
      : fallbackSignals;

  // Processed signals with normalized action, dates and scores
  const processedSignals = useMemo(() => {
    return rawList.map((s, idx) => {
      const id = `tobuy-${s.symbol}-${idx}`;
      const symbol = s.symbol;
      const currentPrice = s.currentPrice ?? s.price ?? s.entryPrice ?? 0;
      const entryPrice = s.entryPrice ?? s.price ?? currentPrice;
      const roi = s.currentROI !== undefined ? s.currentROI : (entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0);

      // Determine normalized action
      let normalizedAction: "BUY_NOW" | "BUY" | "WAIT" | "MISSED" = "BUY_NOW";
      const rawAction = (s.action || s.actionLabel || "").toUpperCase().replace(/[\s_]/g, "");
      if (rawAction.includes("BUYNOW")) normalizedAction = "BUY_NOW";
      else if (rawAction === "BUY") normalizedAction = "BUY";
      else if (rawAction.includes("WAIT")) normalizedAction = "WAIT";
      else if (rawAction.includes("MISSED") || rawAction.includes("IGNORE")) normalizedAction = "MISSED";
      else {
        if (roi > 15) normalizedAction = "MISSED";
        else if (roi > 7) normalizedAction = "WAIT";
        else if (roi <= 2.5) normalizedAction = "BUY_NOW";
        else normalizedAction = "BUY";
      }

      // Safe calendar days calculation
      let daysAgo = 0;
      if (s.entryDate || s.date) {
        const dateStr = (s.entryDate || s.date)!.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
          const entryLocal = new Date(year, month - 1, day);
          const todayLocal = new Date();
          todayLocal.setHours(0, 0, 0, 0);
          const diffMs = todayLocal.getTime() - entryLocal.getTime();
          daysAgo = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      const stars = s.stars !== undefined ? s.stars : 3.5;
      const mlProbability = s.mlProbability !== undefined ? s.mlProbability : 75.0;
      const techScore = s.technicalScore ?? s.compositeScore ?? 80;
      const strategy = s.strategyName || "Breakout setup";
      const waitReason = s.waitReason || `Already up ${Math.abs(roi).toFixed(1)}% from entry ${formatINR(entryPrice)} — wait for pullback`;
      const missedNote = s.missedNote || `Entry ${formatINR(entryPrice)} · don't chase`;

      return {
        id,
        raw: s,
        symbol,
        currentPrice,
        entryPrice,
        roi,
        normalizedAction,
        daysAgo,
        entryDate: s.entryDate || s.date || new Date().toISOString(),
        stars,
        mlProbability,
        techScore,
        strategy,
        sector: s.sector || "Diversified",
        waitReason,
        missedNote,
        gradientIdx: idx
      };
    });
  }, [rawList]);

  // Filter & Search
  const filteredSignals = useMemo(() => {
    return processedSignals.filter(s => {
      const matchesFilter = activeFilter === "ALL" || s.normalizedAction === activeFilter;
      const matchesSearch = !searchQuery || 
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sector.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === "action") {
        const order = { "BUY_NOW": 0, "BUY": 1, "WAIT": 2, "MISSED": 3 };
        return order[a.normalizedAction] - order[b.normalizedAction] || b.mlProbability - a.mlProbability;
      } else if (sortBy === "score") {
        return b.mlProbability - a.mlProbability;
      } else if (sortBy === "roi") {
        return b.roi - a.roi;
      } else {
        return a.symbol.localeCompare(b.symbol);
      }
    });
  }, [processedSignals, activeFilter, searchQuery, sortBy]);

  // Group by day for timeline
  const groupedByDay = useMemo(() => {
    const groups: Record<number, typeof filteredSignals> = {};
    filteredSignals.forEach(s => {
      if (!groups[s.daysAgo]) groups[s.daysAgo] = [];
      groups[s.daysAgo].push(s);
    });
    return groups;
  }, [filteredSignals]);

  const sortedDayKeys = useMemo(() => {
    return Object.keys(groupedByDay).map(Number).sort((a, b) => a - b);
  }, [groupedByDay]);

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const getDayInfo = (daysAgo: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    const day = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : WEEKDAYS[d.getDay()];
    const date = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    return { day, date };
  };

  // Metrics for HeroCard
  const totalCount = processedSignals.length;
  const buyNowCount = processedSignals.filter(s => s.normalizedAction === "BUY_NOW").length;
  const highMlCount = processedSignals.filter(s => s.mlProbability >= 80).length;
  const avgMlProb = totalCount > 0
    ? processedSignals.reduce((acc, curr) => acc + curr.mlProbability, 0) / totalCount
    : 0;

  const handleToggleBought = (id: string, symbol: string, entryPrice: number, strategy: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = !!boughtStatus[id] || portfolioSymbols.includes(symbol);
    setBoughtStatus(prev => ({ ...prev, [id]: !current }));

    if (!current && onMarkBought) {
      onMarkBought(symbol, entryPrice, strategy);
    }
  };

  const isSignalBought = (id: string, symbol: string) => {
    if (boughtStatus[id] !== undefined) return boughtStatus[id];
    return portfolioSymbols.includes(symbol);
  };

  const handleCardClick = (symbol: string) => {
    if (onOpenChart) {
      onOpenChart(symbol);
    } else {
      setSelectedChartSymbol(symbol);
    }
  };

  const renderStars = (stars: number) => {
    const totalStars = 5;
    return (
      <div className="flex items-center gap-0.5" title={`${stars} / 5 Stars`}>
        {[...Array(totalStars)].map((_, i) => {
          const isFilled = i < Math.floor(stars);
          const isHalf = !isFilled && i < stars;
          if (isFilled) {
            return <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />;
          } else if (isHalf) {
            return <StarHalf key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />;
          } else {
            return <Star key={i} className="w-3 h-3 text-slate-200 dark:text-slate-700" />;
          }
        })}
        <span className="text-[11.5px] font-bold text-[#56586A] dark:text-slate-400 ml-1 font-mono">
          {stars.toFixed(1)}
        </span>
      </div>
    );
  };

  const renderActionBadge = (action: "BUY_NOW" | "BUY" | "WAIT" | "MISSED") => {
    switch (action) {
      case "BUY_NOW":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC] shadow-3xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            BUY NOW
          </span>
        );
      case "BUY":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] shadow-3xs dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
            BUY
          </span>
        );
      case "WAIT":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5] shadow-3xs dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800">
            <span className="w-2 h-2 rounded-full bg-[#C2410C]"></span>
            WAIT
          </span>
        );
      case "MISSED":
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full whitespace-nowrap bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] shadow-3xs dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900">
            <X className="w-3 h-3 stroke-[3]" />
            MISSED
          </span>
        );
    }
  };

  const getActionCount = (act: ActionType) => {
    if (act === "ALL") return processedSignals.length;
    return processedSignals.filter(s => s.normalizedAction === act).length;
  };

  return (
    <div className="w-full pb-8">
      {/* Top Header Row with Refresh Bell */}
      <div className="flex justify-between items-center mb-[18px]">
        <div>
          <h1 className="text-[21px] text-[#14151A] dark:text-slate-100 font-bold tracking-[-0.4px]">
            Signal Log
          </h1>
          <p className="text-[12px] font-semibold text-[#8B8D98] dark:text-slate-400 mt-0.5">
            Real-time scanner & execution queue
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className={`w-[40px] h-[40px] rounded-[13px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 flex items-center justify-center text-[#14151A] dark:text-slate-200 shadow-3xs hover:bg-[#F6F7F9] dark:hover:bg-slate-800 transition-all cursor-pointer ${
              isSyncing ? "animate-spin" : ""
            }`}
            title="Refresh Setups"
          >
            <Bell className="w-4 h-4 text-[#14151A] dark:text-slate-200" />
          </button>
        )}
      </div>

      {/* Signature QuantSync Dark Hero Card with Mint Glow */}
      <HeroCard
        eyebrow="TODAY'S RADAR"
        headline={
          <>
            {totalCount} active setups across{" "}
            <b className="text-[#8BF694] font-bold">{buyNowCount} in Buy Now zone</b>
          </>
        }
        stats={[
          { value: buyNowCount, label: "Buy Now", valueColor: "#8BF694" },
          { value: highMlCount, label: "ML > 80%", valueColor: "#818CF8" },
          {
            value: `${avgMlProb.toFixed(1)}%`,
            label: "Avg Confidence",
            valueColor: "#FFFFFF"
          }
        ]}
        className="mb-5 shadow-lg"
      />

      {/* Search & Sort Controls */}
      <div className="flex gap-2 mb-3.5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search symbol, strategy, sector..."
            className="w-full bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 rounded-[14px] px-3.5 py-[11px] text-[13px] text-[#14151A] dark:text-slate-100 placeholder-[#B3B5C0] font-semibold shadow-3xs outline-hidden focus:border-[#6366F1] dark:focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => {
            if (sortBy === "action") setSortBy("score");
            else if (sortBy === "score") setSortBy("roi");
            else if (sortBy === "roi") setSortBy("symbol");
            else setSortBy("action");
          }}
          className="px-3 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 rounded-[14px] flex items-center gap-1.5 text-[12px] font-bold text-[#56586A] dark:text-slate-300 shadow-3xs hover:bg-[#F6F7F9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Sort by: ${sortBy.toUpperCase()}`}
        >
          <SlidersHorizontal className="w-4 h-4 text-[#6366F1]" />
          <span className="hidden sm:inline font-mono">
            {sortBy === "action" ? "Action" : sortBy === "score" ? "ML Score" : sortBy === "roi" ? "ROI" : "A-Z"}
          </span>
        </button>
      </div>

      {/* Action Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
        {(["ALL", "BUY_NOW", "BUY", "WAIT", "MISSED"] as ActionType[]).map((tab) => {
          const isActive = activeFilter === tab;
          const label = tab === "ALL" ? "All Setups" : tab === "BUY_NOW" ? "Buy Now" : tab === "BUY" ? "Buy" : tab === "WAIT" ? "Wait" : "Missed";
          const count = getActionCount(tab);

          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`shrink-0 px-3.5 py-2 rounded-[20px] text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-[#14151A] text-white border border-[#14151A] dark:bg-slate-100 dark:text-slate-900 shadow-3xs scale-[1.02]"
                  : "bg-white dark:bg-slate-900 text-[#56586A] dark:text-slate-300 border border-[#ECEEF2] dark:border-slate-800 hover:bg-[#F6F7F9] dark:hover:bg-slate-800"
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-mono font-extrabold ${
                  isActive
                    ? "bg-white/20 text-white dark:bg-black/15 dark:text-slate-900"
                    : "bg-[#F1F2F5] dark:bg-slate-800 text-[#6366F1] dark:text-indigo-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Signal Cards Container */}
      {filteredSignals.length === 0 ? (
        <div className="p-12 text-center rounded-[20px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 text-[#8B8D98] text-[13.5px] font-semibold shadow-3xs">
          No trade setups match the selected criteria.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDayKeys.map((dk) => {
            const rows = groupedByDay[dk];
            const info = getDayInfo(dk);

            return (
              <div key={dk}>
                {/* Date Row Header */}
                <div className="flex items-center gap-3 mb-3.5 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[13.5px] text-[#14151A] dark:text-slate-100">
                      {info.day}
                    </span>
                    <span className="text-[13px] font-semibold text-[#8B8D98] dark:text-slate-400">
                      • {info.date}
                    </span>
                  </div>
                  <div className="flex-1 h-[1px] bg-[#ECEEF2] dark:bg-slate-800"></div>
                  <span className="text-[11px] font-mono font-bold text-[#6366F1] bg-[#EEF0FE] dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    {rows.length} {rows.length === 1 ? "setup" : "setups"}
                  </span>
                </div>

                {/* Cards List in Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {rows.map((s) => {
                    const bought = isSignalBought(s.id, s.symbol);
                    const isMissed = s.normalizedAction === "MISSED";
                    const isWait = s.normalizedAction === "WAIT";
                    const isBuyOrBuyNow = s.normalizedAction === "BUY_NOW" || s.normalizedAction === "BUY";
                    const isPositiveROI = s.roi >= 0;

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleCardClick(s.symbol)}
                        className={`rounded-[18px] p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-[0_2px_8px_-2px_rgba(20,25,40,0.05)] hover:shadow-[0_4px_16px_-2px_rgba(20,25,40,0.10)] transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                          isMissed ? "opacity-80" : ""
                        }`}
                      >
                        <div>
                          {/* Card Top: Symbol Avatar, Name & Action Badge */}
                          <div className="flex justify-between items-start mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <SymbolAvatar symbol={s.symbol} gradientIndex={s.gradientIdx} size={38} />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[15.5px] font-extrabold text-[#14151A] dark:text-slate-100 tracking-tight group-hover:text-[#6366F1] transition-colors">
                                    {s.symbol}
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-[#8B8D98] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[11.5px] text-[#8B8D98] font-semibold mt-0.5">
                                  {s.strategy}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              {renderActionBadge(s.normalizedAction)}
                            </div>
                          </div>

                          {/* Mid Row: Stars Rating & Current ROI */}
                          <div className="flex justify-between items-center py-1.5 px-2.5 rounded-[10px] bg-[#FAFAFC] dark:bg-slate-800/60 border border-[#F1F2F5] dark:border-slate-800 mb-2.5">
                            <div>
                              <div className="text-[9.5px] uppercase font-bold text-[#8B8D98] tracking-wider mb-0.5">
                                Conviction Rating
                              </div>
                              {renderStars(s.stars)}
                            </div>

                            <div className="text-right">
                              <div className="text-[9.5px] uppercase font-bold text-[#8B8D98] tracking-wider mb-0.5">
                                Floating ROI
                              </div>
                              <div
                                className={`text-[14.5px] font-extrabold font-mono tracking-tight ${
                                  isPositiveROI ? "text-[#16A34A]" : "text-[#F04438]"
                                }`}
                              >
                                {formatPercent(s.roi)}
                              </div>
                            </div>
                          </div>

                          {/* Growth / Price Progress Bar */}
                          <div className="mb-2.5">
                            <GrowthBar
                              entryPrice={s.entryPrice}
                              currentPrice={s.currentPrice}
                            />
                          </div>
                        </div>

                        {/* Card Bottom: Conditional UI per Action Type */}
                        <div>
                          {/* For BUY NOW & BUY: Detailed Metrics + Mark bought button in one single horizontal line */}
                          {isBuyOrBuyNow && (
                            <div
                              className="flex items-center justify-between pt-2 border-t border-[#F1F2F5] dark:border-slate-800 mt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold flex-wrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#EEF0FE] text-[#6366F1] dark:bg-indigo-950/60 dark:text-indigo-300">
                                  <Bot className="w-3 h-3" />
                                  ML {s.mlProbability.toFixed(1)}%
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#ECFDF3] text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <TrendingUp className="w-3 h-3" />
                                  Tech {s.techScore}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#8B8D98] dark:text-slate-400">
                                  <Zap className="w-3 h-3 text-[#8B8D98]" />
                                  {s.daysAgo === 0 ? "Today" : `${s.daysAgo}d ago`}
                                </span>
                              </div>

                              <button
                                onClick={(e) => handleToggleBought(s.id, s.symbol, s.entryPrice, s.strategy, e)}
                                className={`shrink-0 text-[11.5px] font-bold px-2.5 py-1 rounded-[8px] border transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-3xs ${
                                  bought
                                    ? "bg-[#ECFDF3] text-[#16A34A] border-[#86EFAC] dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
                                    : "bg-[#F1F2F5] text-[#424453] hover:bg-[#E5E7EB] hover:text-[#14151A] border-[#E2E4E9] dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                                }`}
                              >
                                {bought ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>Bought</span>
                                  </>
                                ) : (
                                  <span>Mark bought</span>
                                )}
                              </button>
                            </div>
                          )}

                          {/* For WAIT: Vivid Pullback Warning Callout Banner */}
                          {isWait && (
                            <div className="mt-1.5 p-2 bg-[#FFF7ED] text-[#C2410C] dark:bg-orange-950/60 dark:text-orange-300 text-[11px] font-semibold rounded-[10px] flex items-center gap-1.5 border border-[#FFEDD5] dark:border-orange-900/60 shadow-3xs">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#EA580C]" />
                              <span className="leading-snug">{s.waitReason}</span>
                            </div>
                          )}

                          {/* For MISSED: Don't chase footnote */}
                          {isMissed && (
                            <div className="mt-1.5 p-1.5 px-2 bg-[#FEF2F2] text-[#B91C1C] dark:bg-rose-950/50 dark:text-rose-300 text-[11px] font-semibold rounded-[8px] flex items-center justify-between border border-[#FECACA] dark:border-rose-900/50">
                              <span>{s.missedNote}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-[#DC2626]">
                                Extended
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP MODAL: Interactive TradingView Chart */}
      {selectedChartSymbol && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[22px] border border-[#ECEEF2] dark:border-slate-800 shadow-2xl overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 border-b border-[#ECEEF2] dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedChartSymbol(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#14151A] text-white hover:bg-[#23253A] font-bold text-[12px] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="font-extrabold text-[16px] text-[#14151A] dark:text-slate-100 flex items-center gap-2">
                <span>BSE:{selectedChartSymbol}</span>
                <span className="text-[11px] font-bold bg-[#EEF0FE] text-[#6366F1] px-2 py-0.5 rounded-full">
                  Live Terminal
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-5 flex flex-col gap-4">
              <div className="border border-[#ECEEF2] dark:border-slate-800 rounded-[16px] p-3.5 bg-white dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-[13.5px] text-[#14151A] dark:text-slate-100">
                    BSE:{selectedChartSymbol} Interactive Chart
                  </span>
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=BSE:${selectedChartSymbol}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#6366F1] font-bold text-[11.5px] flex items-center gap-1 hover:underline"
                  >
                    <span>Full Screen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="rounded-[12px] overflow-hidden border border-[#ECEEF2] dark:border-slate-800 h-[360px] bg-[#F8F9FB] dark:bg-slate-950">
                  <iframe
                    src={`https://s.tradingview.com/widgetembed/?symbol=BSE:${selectedChartSymbol}&interval=D&theme=light&style=1&timezone=Asia/Kolkata&locale=en&hide_side_toolbar=0&studies=%5B%22RSI%40tv-basicstudies%22%2C%22MASimple%40tv-basicstudies%22%5D&toolbarbg=f8f9fb`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    title={`TradingView Chart for BSE:${selectedChartSymbol}`}
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
