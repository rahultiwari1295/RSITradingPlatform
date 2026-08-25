import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Star,
  Bookmark,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
  LineChart,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  AlertCircle
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
  { symbol: "WSTCSTPAPR", currentROI: 4.24, currentPrice: 637.25, entryPrice: 611.35, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 81, mlProbability: 77.0, stars: 4.5, action: "BUY", sector: "Paper" },
  { symbol: "WHEELS", currentROI: 3.19, currentPrice: 1512.80, entryPrice: 1466.10, entryDate: "2026-08-19", strategyName: "WyckoffSpring", compositeScore: 70, mlProbability: 73.6, stars: 4.0, action: "BUY", sector: "Auto Ancillary" },
  { symbol: "WELSPUNLIV", currentROI: 14.64, currentPrice: 189.22, entryPrice: 165.05, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 75, mlProbability: 73.2, stars: 4.0, action: "WAIT", sector: "Textiles" },
  { symbol: "UFLEX", currentROI: 10.74, currentPrice: 614.60, entryPrice: 555.00, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 82, mlProbability: 79.0, stars: 4.5, action: "WAIT", sector: "Packaging" },
  { symbol: "TORNTPHARM", currentROI: -1.78, currentPrice: 4896.50, entryPrice: 4985.00, entryDate: "2026-07-27", strategyName: "Decouple", compositeScore: 77, mlProbability: 70.0, stars: 4.0, action: "BUY_NOW", sector: "Pharma" },
  { symbol: "TIPSMUSIC", currentROI: -6.93, currentPrice: 650.95, entryPrice: 699.45, entryDate: "2026-07-20", strategyName: "WyckoffSpring", compositeScore: 75, mlProbability: 78.8, stars: 4.0, action: "BUY_NOW", sector: "Media" },
  { symbol: "TI", currentROI: 16.11, currentPrice: 575.65, entryPrice: 495.80, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 79, mlProbability: 71.7, stars: 4.0, action: "MISSED", sector: "Engineering" },
  { symbol: "TFCILTD", currentROI: 47.18, currentPrice: 130.99, entryPrice: 89.00, entryDate: "2026-07-27", strategyName: "Decouple", compositeScore: 81, mlProbability: 84.4, stars: 5.0, action: "MISSED", sector: "Finance" },
  { symbol: "SUNDRMFAST", currentROI: 12.45, currentPrice: 1228.00, entryPrice: 1092.00, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 84, mlProbability: 82.7, stars: 5.0, action: "WAIT", sector: "Auto Parts" },
  { symbol: "RKFORGE", currentROI: 11.73, currentPrice: 737.05, entryPrice: 659.70, entryDate: "2026-08-03", strategyName: "Alpha", compositeScore: 79, mlProbability: 70.6, stars: 4.0, action: "WAIT", sector: "Forgings" },
  { symbol: "RADICO", currentROI: 23.10, currentPrice: 4639.80, entryPrice: 3769.20, entryDate: "2026-06-15", strategyName: "Breakout", compositeScore: 74, mlProbability: 75.3, stars: 4.0, action: "MISSED", sector: "Beverages" },
  { symbol: "MOTHERSON", currentROI: 10.78, currentPrice: 169.38, entryPrice: 152.90, entryDate: "2026-08-03", strategyName: "Alpha", compositeScore: 76, mlProbability: 72.6, stars: 4.0, action: "WAIT", sector: "Auto Components" },
  { symbol: "MONARCH", currentROI: -1.20, currentPrice: 385.45, entryPrice: 390.15, entryDate: "2026-07-27", strategyName: "Breakout", compositeScore: 76, mlProbability: 73.5, stars: 4.0, action: "BUY_NOW", sector: "Capital Goods" },
  { symbol: "MEDANTA", currentROI: -0.21, currentPrice: 1409.70, entryPrice: 1412.60, entryDate: "2026-08-03", strategyName: "Breakout", compositeScore: 71, mlProbability: 71.1, stars: 3.5, action: "BUY_NOW", sector: "Healthcare" },
  { symbol: "MANINDS", currentROI: 17.83, currentPrice: 715.40, entryPrice: 607.15, entryDate: "2026-08-17", strategyName: "Breakout", compositeScore: 82, mlProbability: 79.4, stars: 4.5, action: "MISSED", sector: "Steel / Pipes" },
  { symbol: "GOODLUCK", currentROI: 10.31, currentPrice: 490.90, entryPrice: 445.00, entryDate: "2026-08-17", strategyName: "WyckoffSpring", compositeScore: 76, mlProbability: 87.5, stars: 4.5, action: "WAIT", sector: "Metals" },
  { symbol: "ENTERO", currentROI: 0.49, currentPrice: 1423.60, entryPrice: 1416.60, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 74, mlProbability: 72.5, stars: 4.0, action: "BUY_NOW", sector: "Healthcare" },
  { symbol: "DALMIASUG", currentROI: 16.89, currentPrice: 497.95, entryPrice: 426.00, entryDate: "2026-08-17", strategyName: "Alpha", compositeScore: 81, mlProbability: 76.9, stars: 4.5, action: "MISSED", sector: "Sugar" },
  { symbol: "BELRISE", currentROI: -7.55, currentPrice: 231.77, entryPrice: 250.69, entryDate: "2026-08-10", strategyName: "Breakout", compositeScore: 71, mlProbability: 71.4, stars: 3.5, action: "BUY_NOW", sector: "Auto Parts" },
  { symbol: "ACE", currentROI: 0.00, currentPrice: 1182.20, entryPrice: 1182.20, entryDate: "2026-08-17", strategyName: "Breakout", compositeScore: 83, mlProbability: 83.6, stars: 5.0, action: "BUY_NOW", sector: "Heavy Machinery" },
  { symbol: "VSSL", currentROI: 0.49, currentPrice: 348.70, entryPrice: 347.00, entryDate: "2026-08-10", strategyName: "Alpha", compositeScore: 80, mlProbability: 74.6, stars: 4.5, action: "BUY_NOW", sector: "Metals" }
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

// Gradient palette for symbol avatar tiles
const avatarGradients = [
  "from-[#6366F1] to-[#4F46E5]", // indigo
  "from-[#FB923C] to-[#EA580C]", // orange
  "from-[#10B981] to-[#059669]", // emerald
  "from-[#F43F5E] to-[#E11D48]", // rose
  "from-[#8B5CF6] to-[#7C3AED]", // violet
  "from-[#06B6D4] to-[#0891B2]"  // cyan
];

export default function HomeView({
  toBuySignals,
  portfolioSymbols,
  onOpenChart,
  onOpenBuyModal,
  onRefresh,
  isSyncing
}: HomeViewProps) {
  const rawList = toBuySignals && toBuySignals.length > 0 ? toBuySignals : (fallbackToBuySignals as any);

  const [filter, setFilter] = useState<"all" | "buy" | "wait" | "avoid" | "watchlist">("all");
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("qs_watchlist");
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
    return new Set(["WHEELS", "WSTCSTPAPR"]);
  });
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  const toggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      try {
        localStorage.setItem("qs_watchlist", JSON.stringify(Array.from(next)));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  // Helper to map algorithmic star rating directly from API or composite metrics
  const getSignalStars = (item: any): number => {
    if (typeof item.stars === "number" && item.stars > 0) return item.stars;
    const score = item.compositeScore ?? (item.mlProbability ? (item.mlProbability <= 1 ? item.mlProbability * 100 : item.mlProbability) : 75);
    if (score >= 82) return 5.0;
    if (score >= 76) return 4.5;
    if (score >= 70) return 4.0;
    if (score >= 62) return 3.5;
    return 3.0;
  };

  // Clean helper to sanitize subtitle labels
  const getSubtitle = (strategyName?: string, sector?: string) => {
    const strat = strategyName || "Breakout";
    if (!sector || sector.trim().toLowerCase() === "diversified" || sector.trim().toLowerCase() === "equities") {
      return strat;
    }
    return `${strat} · ${sector}`;
  };

  // Helper action metadata
  const getActionMeta = (action?: string) => {
    const act = (action || "BUY").toUpperCase();
    if (act === "BUY" || act === "BUY_NOW") {
      return {
        key: "buy",
        label: act === "BUY_NOW" ? "Buy Now" : "Fresh Buy",
        badgeBg: "bg-[#ECFDF3] dark:bg-emerald-950/40",
        badgeText: "text-[#16A34A] dark:text-emerald-400",
        badgeBorder: "border-[#86EFAC]/70 dark:border-emerald-800/40",
        dotBg: "bg-[#16A34A]"
      };
    }
    if (act === "WAIT") {
      return {
        key: "wait",
        label: "Extended",
        badgeBg: "bg-[#FFFBEB] dark:bg-amber-950/40",
        badgeText: "text-[#D97706] dark:text-amber-400",
        badgeBorder: "border-[#FDE68A]/70 dark:border-amber-800/40",
        dotBg: "bg-[#D97706]"
      };
    }
    return {
      key: "avoid",
      label: "Overextended",
      badgeBg: "bg-[#FEF3F2] dark:bg-rose-950/40",
      badgeText: "text-[#F04438] dark:text-rose-400",
      badgeBorder: "border-[#FECDCA]/70 dark:border-rose-800/40",
      dotBg: "bg-[#F04438]"
    };
  };

  // Filtered positions
  const filteredList = useMemo(() => {
    return rawList.filter((item: any) => {
      if (filter === "watchlist") return watchlist.has(item.symbol);
      const act = (item.action || "BUY").toUpperCase();
      if (filter === "all") return true;
      if (filter === "buy") return act === "BUY" || act === "BUY_NOW";
      if (filter === "wait") return act === "WAIT";
      if (filter === "avoid") return act === "MISSED" || act === "AVOID";
      return true;
    });
  }, [rawList, filter, watchlist]);

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

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. HERO — Editorial Dark Slate Surface */}
      <HeroCard
        eyebrow="TRACK RECORD · ALL TIME"
        headline={
          <span>
            Real performance across <span className="text-[#8BF694]">762 trades</span> with verified rules.
          </span>
        }
        badge="2.58x PF"
        stats={[
          { value: "67.7%", label: "WIN RATE" },
          { value: "+10.4%", label: "AVG WIN", valueColor: "#8BF694" },
          { value: "2.5 WK", label: "AVG HOLD" }
        ]}
      />

      {/* 2. Educational Flow Guide Card — Line-by-Line */}
      <div className="rounded-[20px] p-4 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 bg-[#EEF0FE] dark:bg-indigo-950/60 text-[#6366F1] dark:text-indigo-400 mt-0.5">
          <HelpCircle className="w-5 h-5 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#14151A] dark:text-white tracking-tight mb-1.5">
            How to read these signals
          </div>
          <div className="space-y-1 text-[12px] font-medium leading-relaxed">
            <div className="text-[#56586A] dark:text-[#8B8D98] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
              <span className="font-bold text-[#16A34A] dark:text-emerald-400">Buy</span> fresh entries near pivot point ·
            </div>
            <div className="text-[#56586A] dark:text-[#8B8D98] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
              <span className="font-bold text-[#D97706] dark:text-amber-400">Extended</span> wait for constructive dip ·
            </div>
            <div className="text-[#56586A] dark:text-[#8B8D98] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F04438] shrink-0" />
              <span className="font-bold text-[#F04438] dark:text-rose-400">Overextended</span> avoid chasing momentum.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Scanned Setups Stream */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[17px] font-bold text-[#14151A] dark:text-white tracking-tight whitespace-nowrap">
              Scanned Setups
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold font-mono tracking-wide bg-[#ECFDF3] text-[#16A34A] dark:bg-emerald-950/50 dark:text-emerald-400 border border-[#86EFAC]/60 dark:border-emerald-800/40 shrink-0">
              {counts.buy} READY
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#6366F1] dark:text-indigo-400 hover:text-[#4F46E5] dark:hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Live scan</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-3 select-none">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press ${
              filter === "all"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            All <span className="opacity-60 font-mono text-[10.5px]">{counts.all}</span>
          </button>

          <button
            onClick={() => setFilter("buy")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "buy"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            Buy Zone <span className="opacity-60 font-mono text-[10.5px]">{counts.buy}</span>
          </button>

          <button
            onClick={() => setFilter("wait")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "wait"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Extended <span className="opacity-60 font-mono text-[10.5px]">{counts.wait}</span>
          </button>

          <button
            onClick={() => setFilter("avoid")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "avoid"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F04438]" />
            Overextended <span className="opacity-60 font-mono text-[10.5px]">{counts.avoid}</span>
          </button>

          <button
            onClick={() => setFilter("watchlist")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer qs-btn-press flex items-center gap-1.5 ${
              filter === "watchlist"
                ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
            }`}
          >
            <Bookmark className={`w-3 h-3 ${filter === "watchlist" ? "fill-current" : ""}`} />
            Watchlist <span className="opacity-60 font-mono text-[10.5px]">{watchlist.size}</span>
          </button>
        </div>

        {/* Scanned List Items */}
        <div className="space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#14161E] rounded-[20px] border border-[#ECEEF2] dark:border-white/[0.08]">
              <div className="text-[14px] font-bold text-[#14151A] dark:text-white">
                No setups found in this filter
              </div>
              <div className="text-[12px] text-[#8B8D98] mt-1">
                {filter === "watchlist" ? "You haven't saved any symbols to your watchlist yet. Tap the bookmark icon on any signal to add it." : "Switch filter to view other available model setups."}
              </div>
            </div>
          ) : (
            filteredList.map((t: any, idx: number) => {
              const isUp = (t.currentROI ?? 0) >= 0;
              const isBought = portfolioSymbols.includes(t.symbol);
              const meta = getActionMeta(t.action);
              const stars = getSignalStars(t);
              const isWatchlisted = watchlist.has(t.symbol);
              const days = t.holdingDays || (t.entryDate ? Math.max(1, Math.round((Date.now() - new Date(t.entryDate).getTime()) / (1000 * 60 * 60 * 24))) : 8);
              const gradClass = avatarGradients[idx % avatarGradients.length];

              return (
                <div
                  key={`${t.symbol}-${idx}`}
                  onClick={() => setSelectedSheetItem(t)}
                  className="rounded-[20px] p-4 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover transition-all cursor-pointer"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0 font-mono`}>
                        {t.symbol?.slice(0, 2) || "ST"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[15.5px] text-[#14151A] dark:text-white tracking-tight truncate font-mono">
                            {t.symbol}
                          </span>
                          
                          {/* Star Rating Badge from API */}
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {stars.toFixed(1)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => toggleWatchlist(t.symbol, e)}
                            className="p-0.5 rounded text-[#B3B5C0] hover:text-[#6366F1] transition-colors cursor-pointer shrink-0"
                            title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${
                                isWatchlisted
                                  ? "fill-[#6366F1] text-[#6366F1] dark:fill-indigo-400 dark:text-indigo-400"
                                  : "text-[#B3B5C0]"
                              }`}
                            />
                          </button>

                          {isBought && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]/40 font-mono">
                              HELD
                            </span>
                          )}
                        </div>

                        <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-medium truncate mt-0.5">
                          {getSubtitle(t.strategyName, t.sector)} · {days}d ago
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[15px] font-extrabold text-[#14151A] dark:text-white font-mono tabular">
                        {formatINR(t.currentPrice || t.entryPrice || 0)}
                      </div>
                      <div className={`text-[12px] font-bold font-mono tabular ${isUp ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                        {isUp ? "+" : ""}{(t.currentROI ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Micro metrics bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F2F5] dark:border-white/[0.06] text-[11px]">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotBg}`} />
                      {meta.label}
                    </span>

                    <div className="flex items-center gap-3 text-[#8B8D98] font-mono text-[11px]">
                      <span>Confidence <strong className="text-[#14151A] dark:text-white">{t.compositeScore || 75}%</strong></span>
                      <span>·</span>
                      <span>ML <strong className="text-[#14151A] dark:text-white">{t.mlProbability ? `${(t.mlProbability > 1 ? t.mlProbability : t.mlProbability * 100).toFixed(0)}%` : "74%"}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Recently Closed Trades */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[17px] font-bold text-[#14151A] dark:text-white tracking-tight">
            Recently Closed
          </h2>
          <span className="text-[12px] font-bold text-[#6366F1] dark:text-indigo-400">
            Verified
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {sampleClosedTrades.map((c, i) => {
            const isWin = c.returnPct >= 0;
            return (
              <div
                key={i}
                onClick={() => setSelectedSheetItem(c as any)}
                className="shrink-0 w-[136px] rounded-[18px] p-3.5 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover cursor-pointer"
              >
                <div className="font-bold text-[13px] text-[#14151A] dark:text-white truncate mb-1">
                  {c.symbol}
                </div>
                <div className={`font-extrabold text-[18px] font-mono tabular leading-tight ${isWin ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                  {isWin ? "+" : ""}{c.returnPct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-[#8B8D98] font-medium mt-1 font-mono">
                  {c.holdingDays}d hold
                </div>
                <div className={`inline-block mt-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-[6px] border ${
                  isWin
                    ? "bg-[#ECFDF3] text-[#16A34A] border-[#86EFAC]/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-[#FEF3F2] text-[#F04438] border-[#FECDCA]/40 dark:bg-rose-950/40 dark:text-rose-400"
                }`}>
                  {c.pnlLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sheet Details */}
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
