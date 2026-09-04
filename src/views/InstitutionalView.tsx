import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Zap,
  Briefcase,
  Layers,
  History,
  TrendingUp,
  Target,
  Brain,
} from "lucide-react";
import {
  ToBuySignal,
  InTradeTrade,
  ClosedTrade,
  StrategySummary,
  ManualPortfolioTrade,
  CompletedTrade,
  TerminalKPIs,
  TotalSummary,
} from "../types";

import InstitutionalHeader from "../components/institutional/InstitutionalHeader";
import EquityGrowthChart from "../components/institutional/EquityGrowthChart";
import StrategyAttributionMatrix from "../components/institutional/StrategyAttributionMatrix";
import SignalRadarGrid from "../components/institutional/SignalRadarGrid";
import ActivePositionsBook from "../components/institutional/ActivePositionsBook";
import ClosedTradesLedger from "../components/institutional/ClosedTradesLedger";

interface InstitutionalViewProps {
  toBuySignals: ToBuySignal[];
  inTradeTrades: InTradeTrade[];
  closedTrades: ClosedTrade[];
  strategies: StrategySummary[];
  portfolio: ManualPortfolioTrade[];
  completedHistory: CompletedTrade[];
  kpis?: TerminalKPIs | null;
  totalSummary?: TotalSummary | null;
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, price: number, strategy?: string) => void;
  onOpenSellModal?: (trade: ManualPortfolioTrade) => void;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
}

type TabKey = "overview" | "signals" | "positions" | "strategies" | "history";

const tabs: { key: TabKey; label: string; icon: React.ElementType; color: string; activeColor: string }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-slate-900 dark:bg-white text-white dark:text-slate-950" },
  { key: "signals", label: "Signals", icon: Zap, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25" },
  { key: "positions", label: "Active", icon: Briefcase, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-cyan-500 text-white shadow-sm shadow-cyan-500/25" },
  { key: "strategies", label: "Strategies", icon: Layers, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-violet-500 text-white shadow-sm shadow-violet-500/25" },
  { key: "history", label: "Closed", icon: History, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-amber-500 text-white shadow-sm shadow-amber-500/25" },
];

export default function InstitutionalView({
  toBuySignals = [],
  inTradeTrades = [],
  closedTrades = [],
  strategies = [],
  portfolio = [],
  completedHistory = [],
  kpis,
  totalSummary,
  onOpenChart,
  onOpenBuyModal,
  onOpenSellModal,
  lastSyncedAt,
  isSyncing = false,
}: InstitutionalViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter signals and positions based on search query
  const filteredSignals = useMemo(() => {
    if (!searchQuery) return toBuySignals;
    const q = searchQuery.toLowerCase();
    return toBuySignals.filter(
      (s) => s.symbol.toLowerCase().includes(q) || (s.strategyName && s.strategyName.toLowerCase().includes(q))
    );
  }, [toBuySignals, searchQuery]);

  const filteredInTrade = useMemo(() => {
    if (!searchQuery) return inTradeTrades;
    const q = searchQuery.toLowerCase();
    return inTradeTrades.filter(
      (t) => t.symbol.toLowerCase().includes(q) || (t.strategyName && t.strategyName.toLowerCase().includes(q))
    );
  }, [inTradeTrades, searchQuery]);

  // Aggregate stats from live data
  const nClosed = (kpis as any)?.totalTradesClosed ?? (kpis as any)?.totalTrades ?? closedTrades.length;
  const wins = closedTrades.filter((t) => (t.returnPct ?? 0) >= 0);
  const winRate = (kpis as any)?.winRate ?? (closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0);
  const profitFactor = (kpis as any)?.profitFactor ?? 0;
  const totalReturn = (kpis as any)?.totalReturnPct ?? closedTrades.reduce((acc, t) => acc + (t.returnPct || 0), 0);

  const portfolioSymbols = useMemo(() => portfolio.map((p) => p.symbol), [portfolio]);

  // Compute tab-specific banner stats
  const avgInTradeROI = filteredInTrade.length > 0
    ? filteredInTrade.reduce((acc, t) => acc + (t.currentROI || 0), 0) / filteredInTrade.length
    : 0;
  const compounders = filteredInTrade.filter(t => (t.currentROI || 0) >= 25).length;

  // Buy-count from signals
  const buyNowCount = filteredSignals.filter(s => {
    const act = (s.action || "BUY_NOW").toUpperCase();
    return act === "BUY" || act === "BUY_NOW";
  }).length;

  const avgMLSignals = filteredSignals.length > 0
    ? filteredSignals.reduce((acc, s) => {
        const ml = s.mlProbability ? (s.mlProbability > 1 ? s.mlProbability : s.mlProbability * 100) : 0;
        return acc + ml;
      }, 0) / filteredSignals.length
    : 0;

  // Tab info banner content
  const getTabBanner = (): { icon: React.ElementType; text: string; color: string } | null => {
    switch (activeTab) {
      case "signals":
        if (filteredSignals.length === 0) return null;
        return {
          icon: Zap,
          text: `${filteredSignals.length} signals dispatched · ${buyNowCount} BUY NOW${avgMLSignals > 0 ? ` · ML avg ${avgMLSignals.toFixed(0)}%` : ""}`,
          color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/15",
        };
      case "positions":
        if (filteredInTrade.length === 0) return null;
        return {
          icon: TrendingUp,
          text: `${filteredInTrade.length} positions · Avg ROI ${avgInTradeROI >= 0 ? "+" : ""}${avgInTradeROI.toFixed(1)}%${compounders > 0 ? ` · ${compounders} compounder${compounders > 1 ? "s" : ""}` : ""}`,
          color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/15",
        };
      case "history":
        if (closedTrades.length === 0) return null;
        return {
          icon: Target,
          text: `${closedTrades.length} closed · ${winRate.toFixed(0)}% win rate${totalReturn ? ` · ${totalReturn > 0 ? "+" : ""}${Math.round(totalReturn)}% total return` : ""}`,
          color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/15",
        };
      case "strategies":
        if (strategies.length === 0) return null;
        return {
          icon: Brain,
          text: `${strategies.length} active strategies tracked with audited performance`,
          color: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/15",
        };
      default:
        return null;
    }
  };

  const banner = getTabBanner();

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* 1. Header with KPIs */}
      <InstitutionalHeader
        activeCount={inTradeTrades.length}
        toBuyCount={toBuySignals.length}
        closedCount={nClosed}
        winRate={winRate}
        profitFactor={profitFactor}
        totalReturn={totalReturn}
        lastSyncedAt={lastSyncedAt}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. Tab Navigation */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-white/[0.06]" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {tabs.map(({ key, label, icon: Icon, color, activeColor }) => {
            const count = key === "signals" ? filteredSignals.length
              : key === "positions" ? filteredInTrade.length
              : key === "strategies" ? strategies.length
              : key === "history" ? closedTrades.length
              : null;

            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap qs-btn-press ${
                  activeTab === key ? activeColor : `${color} hover:text-slate-900 dark:hover:text-white`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count !== null && count > 0 && (
                  <span className={`text-[10px] font-mono ${activeTab === key ? "opacity-70" : "opacity-50"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Info Banner */}
      {banner && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold animate-fade-in ${banner.color}`}>
          <banner.icon className="w-3.5 h-3.5 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      {/* 4. Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Signal Radar (condensed preview) */}
          <SignalRadarGrid
            signals={filteredSignals}
            portfolioSymbols={portfolioSymbols}
            onOpenChart={onOpenChart}
            onOpenBuyModal={onOpenBuyModal}
          />

          {/* Active Positions */}
          <ActivePositionsBook
            inTradeTrades={filteredInTrade}
            portfolio={portfolio}
            onOpenChart={onOpenChart}
            onOpenSellModal={onOpenSellModal}
          />

          {/* Equity Curve */}
          {(closedTrades.length > 0 || completedHistory.length > 0) && (
            <EquityGrowthChart
              closedTrades={closedTrades}
              completedHistory={completedHistory}
            />
          )}

          {/* Strategy Attribution */}
          {strategies.length > 0 && (
            <StrategyAttributionMatrix strategies={strategies} />
          )}
        </div>
      )}

      {activeTab === "signals" && (
        <div className="animate-fade-in-up">
          <SignalRadarGrid
            signals={filteredSignals}
            portfolioSymbols={portfolioSymbols}
            onOpenChart={onOpenChart}
            onOpenBuyModal={onOpenBuyModal}
          />
        </div>
      )}

      {activeTab === "positions" && (
        <div className="animate-fade-in-up">
          <ActivePositionsBook
            inTradeTrades={filteredInTrade}
            portfolio={portfolio}
            onOpenChart={onOpenChart}
            onOpenSellModal={onOpenSellModal}
          />
        </div>
      )}

      {activeTab === "strategies" && (
        <div className="animate-fade-in-up">
          {strategies.length > 0 ? (
            <StrategyAttributionMatrix strategies={strategies} />
          ) : (
            <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06]">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No strategy data available</p>
              <p className="text-xs text-slate-400 mt-0.5">Strategy performance will appear after trades are processed.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in-up">
          <ClosedTradesLedger
            closedTrades={closedTrades}
            onOpenChart={onOpenChart}
          />
          {(closedTrades.length > 0 || completedHistory.length > 0) && (
            <EquityGrowthChart
              closedTrades={closedTrades}
              completedHistory={completedHistory}
            />
          )}
        </div>
      )}
    </div>
  );
}
