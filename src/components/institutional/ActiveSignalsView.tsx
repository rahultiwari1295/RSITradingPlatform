import React, { useState, useMemo } from "react";
import {
  Zap,
  Briefcase,
  Star,
  LineChart,
  ShoppingCart,
  Calendar,
  Clock,
  Brain,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal,
  Table,
  LayoutGrid,
} from "lucide-react";
import { ToBuySignal, InTradeTrade, ManualPortfolioTrade } from "../../types";

interface ActiveSignalsViewProps {
  toBuySignals: ToBuySignal[];
  inTradeTrades: InTradeTrade[];
  portfolio?: ManualPortfolioTrade[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, price: number, strategy?: string) => void;
  onOpenSellModal?: (trade: ManualPortfolioTrade) => void;
  initialFilter?: "ALL" | "FRESH_BUYS" | "RUNNING";
}

type MainFilter = "ALL" | "FRESH_BUYS" | "RUNNING";
type ViewMode = "cards" | "table";

const avatarGradients = [
  "from-indigo-500 to-violet-600",
  "from-emerald-400 to-teal-600",
  "from-cyan-400 to-blue-600",
  "from-orange-400 to-rose-500",
  "from-amber-400 to-orange-600",
  "from-pink-400 to-fuchsia-600",
];

export default function ActiveSignalsView({
  toBuySignals = [],
  inTradeTrades = [],
  portfolio = [],
  onOpenChart,
  onOpenBuyModal,
  onOpenSellModal,
  initialFilter = "ALL",
}: ActiveSignalsViewProps) {
  const [mainFilter, setMainFilter] = useState<MainFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [freshSubFilter, setFreshSubFilter] = useState<"ALL" | "BUY_NOW" | "WAIT">("ALL");

  const portfolioSymbols = useMemo(() => portfolio.map((p) => p.symbol), [portfolio]);

  // Combine unified item list
  // Tag each item with type: 'FRESH_BUY' or 'RUNNING_POSITION'
  const unifiedItems = useMemo(() => {
    const freshItems = toBuySignals.map((s) => ({
      ...s,
      _type: "FRESH_BUY" as const,
      sortScore: (s.mlProbability || 50) + (s.action === "BUY_NOW" ? 100 : 0),
    }));

    const runningItems = inTradeTrades.map((t) => ({
      ...t,
      _type: "RUNNING_POSITION" as const,
      sortScore: t.currentROI || 0,
    }));

    if (mainFilter === "FRESH_BUYS") {
      let list = freshItems;
      if (freshSubFilter === "BUY_NOW") {
        list = list.filter((i) => (i.action || "BUY_NOW").toUpperCase() === "BUY_NOW" || (i.action || "").toUpperCase() === "BUY");
      } else if (freshSubFilter === "WAIT") {
        list = list.filter((i) => (i.action || "").toUpperCase() === "WAIT");
      }
      return list;
    }

    if (mainFilter === "RUNNING") {
      return runningItems.sort((a, b) => (b.currentROI || 0) - (a.currentROI || 0));
    }

    // ALL: Fresh buys first (BUY NOW on top), then active running compounders
    return [...freshItems, ...runningItems];
  }, [toBuySignals, inTradeTrades, mainFilter, freshSubFilter]);

  // Apply search query
  const filtered = useMemo(() => {
    if (!search.trim()) return unifiedItems;
    const q = search.toLowerCase();
    return unifiedItems.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        (item.strategyName && item.strategyName.toLowerCase().includes(q)) ||
        (item.sector && item.sector.toLowerCase().includes(q))
    );
  }, [unifiedItems, search]);

  const buyNowCount = toBuySignals.filter(
    (s) => (s.action || "BUY_NOW").toUpperCase() === "BUY_NOW" || (s.action || "").toUpperCase() === "BUY"
  ).length;

  const runnerCount = inTradeTrades.filter((t) => (t.currentROI || 0) >= 10).length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* 1. Header Toolbar & Segmented Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xl">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setMainFilter("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              mainFilter === "ALL"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Active
            <span className="text-[10px] font-mono opacity-70">
              {toBuySignals.length + inTradeTrades.length}
            </span>
          </button>

          <button
            onClick={() => setMainFilter("FRESH_BUYS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              mainFilter === "FRESH_BUYS"
                ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Fresh Buys
            <span className="px-1.5 py-px rounded-md text-[10px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black">
              {toBuySignals.length}
            </span>
          </button>

          <button
            onClick={() => setMainFilter("RUNNING")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              mainFilter === "RUNNING"
                ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
            Active Runners
            <span className="px-1.5 py-px rounded-md text-[10px] font-mono bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-black">
              {inTradeTrades.length}
            </span>
          </button>
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center gap-2">
          {/* Fresh Buy Sub-filter */}
          {mainFilter === "FRESH_BUYS" && (
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/[0.04]">
              {(["ALL", "BUY_NOW", "WAIT"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setFreshSubFilter(sub)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    freshSubFilter === sub
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {sub === "BUY_NOW" ? "Buy Now" : sub === "ALL" ? "All" : "Wait"}
                </button>
              ))}
            </div>
          )}

          {/* Search box */}
          <div className="relative min-w-[140px] sm:min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* View toggle (desktop only) */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/[0.04]">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Informational Context Banner */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.04] text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {mainFilter === "FRESH_BUYS" ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong className="text-slate-900 dark:text-white">Fresh Buy Triggers:</strong> Algorithmic signals from the last 1–5 days. Click <strong>Take Trade</strong> to enter at current market price.
              </span>
            </>
          ) : mainFilter === "RUNNING" ? (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span>
                <strong className="text-slate-900 dark:text-white">Active Runners:</strong> Open positions being managed with trailing stop-losses. {runnerCount} runner{runnerCount !== 1 ? "s" : ""} up +10% or more.
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> active trades ({toBuySignals.length} fresh buy triggers + {inTradeTrades.length} running positions).
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3. Empty State */}
      {filtered.length === 0 && (
        <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] animate-fade-in">
          <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No matching trades found</p>
          <p className="text-xs text-slate-400 mt-0.5">Try changing your search term or filter selection.</p>
        </div>
      )}

      {/* 4. CARDS VIEW (Responsive grid for mobile & desktop) */}
      {viewMode === "cards" && filtered.length > 0 && (
        <div className="signal-grid">
          {filtered.map((item: any, idx) => {
            const isFresh = item._type === "FRESH_BUY";
            const sym = item.symbol;
            const price = Number(item.currentPrice || item.entryPrice || item.price || 0);
            const entryPrice = Number(item.entryPrice || price);
            const roi = Number(item.currentROI ?? (entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100 : 0));
            const isUp = roi >= 0;
            const stars = typeof item.stars === "number" ? item.stars : 4.0;
            const inPortfolio = portfolioSymbols.includes(sym);
            const gradClass = avatarGradients[idx % avatarGradients.length];

            // Days / Age
            const daysInTrade = item.holdingDays || (item.entryDate
              ? Math.max(1, Math.round((Date.now() - new Date(item.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
              : 1);

            // Scores
            const mlScore = item.mlProbability
              ? (item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100)
              : null;
            const compositeScore = item.compositeScore ?? null;

            // Action Badge rendering
            const renderBadge = () => {
              if (isFresh) {
                const act = (item.action || "BUY_NOW").toUpperCase();
                if (act === "BUY" || act === "BUY_NOW") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      BUY NOW
                    </span>
                  );
                }
                if (act === "WAIT") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      WAIT
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/25">
                    MISSED
                  </span>
                );
              }

              // Running Position Badges
              if (roi >= 25) {
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    🌟 COMPOUNDER
                  </span>
                );
              }
              if (roi >= 10) {
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                    ⚡ RUNNER
                  </span>
                );
              }
              if (roi >= 0) {
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]">
                    ACTIVE
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                  BUFFER
                </span>
              );
            };

            return (
              <div
                key={`${sym}-${item._type}-${idx}`}
                className={`qs-card p-4 flex flex-col justify-between animate-fade-in-up stagger-${Math.min(idx + 1, 10)}`}
              >
                <div>
                  {/* Row 1: Symbol + Strategy + Type Badge + Action Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[11px] shadow-sm shrink-0 font-mono`}>
                        {sym.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[14px] text-slate-900 dark:text-white tracking-tight truncate">
                            {sym}
                          </span>
                          {inPortfolio && (
                            <span className="px-1.5 py-px rounded-md text-[8px] font-extrabold uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                              Owned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            {item.strategyName || "Momentum"}
                          </span>
                          <span className="text-[10px] text-amber-500 flex items-center gap-0.5 font-semibold shrink-0">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {stars.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {renderBadge()}
                    </div>
                  </div>

                  {/* Row 2: Price Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {/* Current Price */}
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Current</span>
                      <span className="font-black text-[13px] text-slate-900 dark:text-white font-mono tabular block mt-0.5">
                        ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                      </span>
                    </div>

                    {/* Entry or Trigger Price */}
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                        {isFresh ? "Trigger" : "Entry"}
                      </span>
                      <span className="font-bold text-[13px] text-slate-700 dark:text-slate-300 font-mono tabular block mt-0.5">
                        ₹{entryPrice.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                      </span>
                    </div>

                    {/* % Metric: Slippage (Fresh) vs ROI (Running) */}
                    <div className={`p-2 rounded-xl border ${isUp ? 'bg-emerald-50 dark:bg-emerald-500/[0.06] border-emerald-200/60 dark:border-emerald-500/15' : 'bg-rose-50 dark:bg-rose-500/[0.06] border-rose-200/60 dark:border-rose-500/15'}`}>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                        {isFresh ? "Slippage" : "ROI"}
                      </span>
                      <span className={`font-black text-[13px] font-mono tabular flex items-center gap-0.5 mt-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isUp ? "+" : ""}{roi.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Metadata Details */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] mb-3 px-1">
                    {/* Date or Days */}
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium">{isFresh ? "Triggered:" : "In Trade:"}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                        {isFresh
                          ? (daysInTrade <= 1 ? "Today" : `${daysInTrade}d ago`)
                          : `${daysInTrade}d`}
                      </span>
                    </div>

                    {/* Sector or Trailing Status */}
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">{item.sector || "General"}</span>
                    </div>

                    {/* ML Score */}
                    {mlScore !== null && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Brain className="w-3 h-3 text-violet-400 shrink-0" />
                        <span className="font-medium">ML:</span>
                        <span className="font-bold text-violet-600 dark:text-violet-400 font-mono">{mlScore.toFixed(0)}%</span>
                      </div>
                    )}

                    {/* Composite Score */}
                    {compositeScore !== null && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <BarChart3 className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="font-medium">Score:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{compositeScore}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                  <button
                    onClick={() => onOpenChart(sym)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 transition-all cursor-pointer qs-btn-press"
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    <span>Chart</span>
                  </button>

                  {isFresh ? (
                    <button
                      onClick={() => onOpenBuyModal(sym, price, item.strategyName)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-sm shadow-emerald-500/25 qs-btn-press"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Take Trade</span>
                    </button>
                  ) : (
                    inPortfolio && onOpenSellModal ? (
                      <button
                        onClick={() => {
                          const userTrade = portfolio.find((p) => p.symbol === sym);
                          if (userTrade) onOpenSellModal(userTrade);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-sm shadow-amber-500/25 qs-btn-press"
                      >
                        <span>Sell Position</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenBuyModal(sym, price, item.strategyName)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-slate-200/80 hover:bg-slate-300 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-800 dark:text-white transition-all cursor-pointer qs-btn-press"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add Order</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. TABLE VIEW (For Desktop power users) */}
      {viewMode === "table" && filtered.length > 0 && (
        <div className="hidden md:block rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Trigger/Entry</th>
                  <th className="py-3 px-3">Current</th>
                  <th className="py-3 px-3">Move / ROI</th>
                  <th className="py-3 px-3">Age / Days</th>
                  <th className="py-3 px-3">ML Prob</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filtered.map((item: any, idx) => {
                  const isFresh = item._type === "FRESH_BUY";
                  const sym = item.symbol;
                  const price = Number(item.currentPrice || item.entryPrice || item.price || 0);
                  const entryPrice = Number(item.entryPrice || price);
                  const roi = Number(item.currentROI ?? (entryPrice > 0 ? ((price - entryPrice) / entryPrice) * 100 : 0));
                  const isUp = roi >= 0;
                  const daysInTrade = item.holdingDays || (item.entryDate
                    ? Math.max(1, Math.round((Date.now() - new Date(item.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
                    : 1);
                  const mlScore = item.mlProbability
                    ? (item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100)
                    : null;

                  return (
                    <tr key={`${sym}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{sym}</div>
                        <div className="text-[11px] text-slate-400">{item.strategyName || "Momentum"}</div>
                      </td>
                      <td className="py-3 px-3">
                        {isFresh ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Fresh Buy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        ₹{entryPrice.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-white">
                        ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-mono font-bold flex items-center gap-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isUp ? "+" : ""}{roi.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {isFresh ? `${daysInTrade}d ago` : `${daysInTrade}d`}
                      </td>
                      <td className="py-3 px-3 font-mono text-violet-600 dark:text-violet-400 font-bold">
                        {mlScore !== null ? `${mlScore.toFixed(0)}%` : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 font-bold">
                        {item.compositeScore ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenChart(sym)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="View Chart"
                          >
                            <LineChart className="w-3.5 h-3.5" />
                          </button>
                          {isFresh && (
                            <button
                              onClick={() => onOpenBuyModal(sym, price, item.strategyName)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-xs"
                            >
                              Buy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
