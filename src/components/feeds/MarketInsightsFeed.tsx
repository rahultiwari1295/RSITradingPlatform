import React, { useState } from "react";
import {
  Newspaper,
  Flame,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  LineChart,
  Filter,
  CheckCircle,
  Tag
} from "lucide-react";
import type { MarketInsightItem } from "../../types";

interface MarketInsightsFeedProps {
  insights: MarketInsightItem[];
  onOpenChart?: (symbol: string) => void;
  isLoading?: boolean;
}

export const MarketInsightsFeed: React.FC<MarketInsightsFeedProps> = ({
  insights,
  onOpenChart,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = [
    { id: "ALL", label: "All News" },
    { id: "MATCHING", label: "🔥 In Your Signals" },
    { id: "ORDER_WIN", label: "Order Wins" },
    { id: "EXPANSION", label: "Capacity & PPA" },
    { id: "UPGRADE", label: "Target Upgrades" },
    { id: "REGULATORY", label: "USFDA & Approvals" },
    { id: "BLOCK_DEAL", label: "Block Deals" },
  ];

  const filteredInsights = insights.filter((item) => {
    if (selectedCategory === "MATCHING" && !item.isMatchingActiveSignal) return false;
    if (
      selectedCategory !== "ALL" &&
      selectedCategory !== "MATCHING" &&
      item.category !== selectedCategory
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSym = item.symbol.toLowerCase().includes(q);
      const matchComp = item.companyName.toLowerCase().includes(q);
      const matchHead = item.headline.toLowerCase().includes(q);
      return matchSym || matchComp || matchHead;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-sm shadow-purple-500/30">
            <Newspaper className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                News &amp; Catalysts
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/80 dark:border-purple-700/50">
                Live Feed
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Exchange filings, high-value procurement contracts, block deals, and analyst upgrades
            </p>
          </div>
        </div>
      </div>

      {/* Category Pills (Mobile-first horizontal scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                  : "bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.06] hover:border-slate-300"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Cards Stream */}
      {filteredInsights.length > 0 ? (
        <div className="space-y-3">
          {filteredInsights.map((item) => {
            const isVeryBullish = item.sentiment === "VERY_BULLISH";
            const isCaution = item.sentiment === "CAUTION";

            return (
              <div
                key={item.id}
                className={`group rounded-2xl p-4 transition-all duration-200 bg-white/95 dark:bg-slate-900/80 border ${
                  item.isMatchingActiveSignal
                    ? "border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-transparent shadow-sm shadow-amber-500/10"
                    : "border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
                }`}
              >
                {/* Top Row: Symbol, Category Tag, Matching Alert, Time */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenChart?.(item.symbol)}
                      className="font-mono text-sm font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {item.symbol}
                    </button>

                    <span className="text-[11px] text-slate-400">· {item.companyName}</span>

                    {/* Active Signal Match Badge */}
                    {item.isMatchingActiveSignal && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        <Flame className="w-3 h-3 text-amber-600" />
                        In Your Active Signals
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[10.5px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{item.timeAgo}</span>
                  </div>
                </div>

                {/* Headline */}
                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors mb-1.5">
                  {item.headline}
                </h4>

                {/* Summary */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {item.summary}
                </p>

                {/* Footer Metrics & Actions */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* Sentiment Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isVeryBullish
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : isCaution
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>{item.sentiment.replace("_", " ")}</span>
                    </span>

                    {/* Impact Estimate */}
                    {item.priceImpactEst && (
                      <span className="text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Est: {item.priceImpactEst}
                      </span>
                    )}

                    {/* Impact Score */}
                    <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
                      Impact Score: {item.impactScore}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenChart?.(item.symbol)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      <LineChart className="w-3.5 h-3.5" />
                      <span>Chart</span>
                    </button>

                    <span className="text-[10px] text-slate-400">
                      {item.source}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] space-y-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No news matching this filter
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try switching to "All News" or clear your search term.
          </p>
        </div>
      )}
    </div>
  );
};
