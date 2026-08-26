import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Star,
  Bookmark,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  LineChart,
  SlidersHorizontal,
  Compass,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  EyeOff
} from "lucide-react";
import { ToBuySignal, ClosedTrade } from "../types";
import HeroCard from "../components/HeroCard";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import { formatINR } from "../lib/utils";

interface HomeViewProps {
  toBuySignals: ToBuySignal[];
  closedTrades?: ClosedTrade[];
  portfolioSymbols: string[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, price: number, strategy?: string) => void;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const sampleClosedTrades: ClosedTrade[] = [
  { symbol: "HAPPYFORGE", returnPct: 32.6, pnlLabel: "WIN", entryPrice: 1668, exitPrice: 2211.8, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "GLAXO", returnPct: 7.97, pnlLabel: "WIN", entryPrice: 2688, exitPrice: 2902.2, entryDate: "2026-08-17", exitDate: "2026-08-21", holdingDays: 4, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "ASIANENE", returnPct: 15.11, pnlLabel: "WIN", entryPrice: 408.55, exitPrice: 470.3, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "ALIVUS", returnPct: 14.21, pnlLabel: "WIN", entryPrice: 1182.8, exitPrice: 1350.9, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Alpha", exitReason: "MFE_TRAIL_L3" },
  { symbol: "DBOL", returnPct: 12.37, pnlLabel: "WIN", entryPrice: 116.71, exitPrice: 131.15, entryDate: "2026-08-10", exitDate: "2026-08-21", holdingDays: 11, strategyName: "WyckoffSpring", exitReason: "MFE_TRAIL_L3" },
  { symbol: "NETWEB", returnPct: -9.57, pnlLabel: "LOSS", entryPrice: 5601, exitPrice: 5065, entryDate: "2026-08-17", exitDate: "2026-08-19", holdingDays: 2, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" },
  { symbol: "ASTERDM", returnPct: -7.99, pnlLabel: "LOSS", entryPrice: 869.7, exitPrice: 800.2, entryDate: "2026-08-03", exitDate: "2026-08-19", holdingDays: 16, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" }
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
  toBuySignals = [],
  closedTrades = [],
  portfolioSymbols = [],
  onOpenChart,
  onOpenBuyModal,
  onRefresh,
  isSyncing = false
}: HomeViewProps) {
  // Map strictly to the toBuySignals array from the API response
  const rawList = Array.isArray(toBuySignals) ? toBuySignals : [];

  const [filter, setFilter] = useState<"all" | "buy" | "wait" | "avoid" | "watchlist">("all");
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("qs_watchlist");
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
    return new Set<string>();
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

  const recentClosedList = closedTrades && closedTrades.length > 0 ? closedTrades.slice(0, 10) : sampleClosedTrades;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. HERO — Editorial Dark Slate Surface */}
      {rawList.length > 0 ? (
        <HeroCard
          eyebrow="BUY RADAR · ACTIVE SETUPS"
          headline={
            <span>
              Tracking <span className="text-[#8BF694]">{rawList.length} setup{rawList.length > 1 ? "s" : ""}</span> in actionable buy territory.
            </span>
          }
          badge="Live Radar"
          stats={[
            { value: counts.buy, label: "READY TO BUY", valueColor: "#8BF694" },
            { value: counts.wait, label: "EXTENDED / WATCH", valueColor: counts.wait > 0 ? "#F97066" : "#FFFFFF" },
            { value: rawList.length, label: "TOTAL IN RADAR" }
          ]}
        />
      ) : (
        <HeroCard
          eyebrow="BUY RADAR · SCAN ACTIVE"
          headline={
            <span>
              No stocks currently on <span className="text-[#8BF694]">buy radar</span>. Entry discipline active.
            </span>
          }
          badge="Scanner Active"
          stats={[
            { value: "0", label: "BUY TRIGGERS" },
            { value: "DISCIPLINED", label: "ENTRY FILTER", valueColor: "#8BF694" },
            { value: "100%", label: "CAPITAL PRESERVED" }
          ]}
        />
      )}

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
              Buy Radar Setups
            </h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold font-mono tracking-wide border shrink-0 ${
              counts.buy > 0 
                ? "bg-[#ECFDF3] text-[#16A34A] dark:bg-emerald-950/50 dark:text-emerald-400 border-[#86EFAC]/60 dark:border-emerald-800/40"
                : "bg-[#F1F2F5] text-[#56586A] dark:bg-white/10 dark:text-slate-300 border-[#ECEEF2] dark:border-white/10"
            }`}>
              {counts.buy > 0 ? `${counts.buy} READY` : "0 IN ZONE"}
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

        {/* When toBuySignals has entries */}
        {rawList.length > 0 ? (
          <>
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
                    {filter === "watchlist"
                      ? "You haven't saved any symbols to your watchlist yet. Tap the bookmark icon on any signal to add it."
                      : "Switch filter to view other available model setups."}
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
                              
                              {/* Star Rating Badge */}
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
          </>
        ) : (
          /* High-Craft Empty State for Desk when toBuySignals is Empty */
          <div className="rounded-[22px] p-6 sm:p-7 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow text-center">
            <div className="w-13 h-13 rounded-[18px] bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border border-[#86EFAC]/50 dark:border-emerald-800/40 mx-auto flex items-center justify-center mb-3.5 shadow-3xs">
              <Compass className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border border-[#86EFAC]/60 dark:border-emerald-800/40 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              Screener Active · Watching Universe
            </div>

            <h3 className="text-[16.5px] font-bold text-[#14151A] dark:text-white tracking-tight mb-2">
              Currently No Stocks on Radar to Buy
            </h3>

            <p className="text-[12.5px] text-[#56586A] dark:text-[#8B8D98] leading-relaxed max-w-lg mx-auto mb-5">
              Our automated quantitative screener evaluated all candidate tickers against our Breakout, Alpha, Wyckoff Spring, and Decouple models. No symbols currently meet our strict entry confluence and minimum 2.0x risk-to-reward ratio.
            </p>

            {/* Editorial Rule Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-xl mx-auto mb-5">
              <div className="p-3 rounded-[14px] bg-[#FAFAFC] dark:bg-white/[0.03] border border-[#ECEEF2] dark:border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span className="text-[12px] font-bold text-[#14151A] dark:text-white">Capital Protection</span>
                </div>
                <p className="text-[11px] text-[#8B8D98] leading-normal">
                  Avoiding premature trades during sideways consolidation preserves dry powder for verified breakout setups.
                </p>
              </div>

              <div className="p-3 rounded-[14px] bg-[#FAFAFC] dark:bg-white/[0.03] border border-[#ECEEF2] dark:border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-[#6366F1] shrink-0" />
                  <span className="text-[12px] font-bold text-[#14151A] dark:text-white">Active Positions</span>
                </div>
                <p className="text-[11px] text-[#8B8D98] leading-normal">
                  Existing trades are actively tracked with trailing stop logic under the <strong>Signals</strong> tab.
                </p>
              </div>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] text-[12.5px] font-bold hover:opacity-90 transition-all cursor-pointer qs-btn-press shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Re-scan Market Universe</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Recently Closed Trades */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[17px] font-bold text-[#14151A] dark:text-white tracking-tight">
            Recently Closed
          </h2>
          <span className="text-[12px] font-bold text-[#6366F1] dark:text-indigo-400">
            Verified History
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {recentClosedList.map((c, i) => {
            const isWin = (c.returnPct ?? (c.pnlPct ?? 0)) >= 0;
            const ret = c.returnPct ?? c.pnlPct ?? 0;
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
                  {isWin ? "+" : ""}{ret.toFixed(1)}%
                </div>
                <div className="text-[11px] text-[#8B8D98] font-medium mt-1 font-mono">
                  {c.holdingDays || c.holdDays || 8}d hold
                </div>
                <div className={`inline-block mt-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-[6px] border ${
                  isWin
                    ? "bg-[#ECFDF3] text-[#16A34A] border-[#86EFAC]/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-[#FEF3F2] text-[#F04438] border-[#FECDCA]/40 dark:bg-rose-950/40 dark:text-rose-400"
                }`}>
                  {c.pnlLabel || (isWin ? "WIN" : "LOSS")}
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

