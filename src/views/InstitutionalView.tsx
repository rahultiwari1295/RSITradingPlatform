import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Zap,
  Briefcase,
  Layers,
  History,
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "signals" | "positions" | "strategies" | "history"
  >("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter signals and positions based on search query
  const filteredSignals = useMemo(() => {
    if (!searchQuery) return toBuySignals;
    const q = searchQuery.toLowerCase();
    return toBuySignals.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        (s.strategyName && s.strategyName.toLowerCase().includes(q))
    );
  }, [toBuySignals, searchQuery]);

  const filteredInTrade = useMemo(() => {
    if (!searchQuery) return inTradeTrades;
    const q = searchQuery.toLowerCase();
    return inTradeTrades.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        (t.strategyName && t.strategyName.toLowerCase().includes(q))
    );
  }, [inTradeTrades, searchQuery]);

  // Aggregate stats from live KPIs or actual closedTrades data (zero fake fallbacks)
  const nClosed = kpis?.totalTradesClosed ?? kpis?.totalTrades ?? closedTrades.length;
  const wins = closedTrades.filter((t) => (t.returnPct ?? 0) >= 0);
  const winRate = kpis?.winRate ?? (closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0);
  const profitFactor = kpis?.profitFactor ?? 0;
  const totalReturn = kpis?.totalReturnPct ?? closedTrades.reduce((acc, t) => acc + (t.returnPct || 0), 0);

  const portfolioSymbols = useMemo(() => portfolio.map((p) => p.symbol), [portfolio]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Terminal Header with Live Real-time Status & Verified KPIs */}
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

      {/* 2. Apple iOS Segmented Sub-Navigation Pills */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-md shadow-slate-900/5">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("signals")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "signals"
                ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Signal Radar ({filteredSignals.length})
          </button>

          <button
            onClick={() => setActiveTab("positions")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "positions"
                ? "bg-cyan-500 text-white shadow-xs shadow-cyan-500/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Active Book ({filteredInTrade.length})
          </button>

          <button
            onClick={() => setActiveTab("strategies")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "strategies"
                ? "bg-violet-500 text-white shadow-xs shadow-violet-500/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Strategies ({strategies.length})
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "bg-amber-500 text-white shadow-xs shadow-amber-500/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Closed History ({closedTrades.length})
          </button>
        </div>
      </div>

      {/* 3. Conditional Tab Content Render */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Signal Radar Grid: Tactile, intuitive cards with actual prices and trade plan */}
          <SignalRadarGrid
            signals={filteredSignals}
            portfolioSymbols={portfolioSymbols}
            onOpenChart={onOpenChart}
            onOpenBuyModal={onOpenBuyModal}
          />

          {/* Active Positions Book: Live open positions with real engine status and P&L */}
          <ActivePositionsBook
            inTradeTrades={filteredInTrade}
            portfolio={portfolio}
            onOpenChart={onOpenChart}
            onOpenSellModal={onOpenSellModal}
          />

          {/* Real Cumulative Equity Curve: Plotted only from verified closed trades */}
          {(closedTrades.length > 0 || completedHistory.length > 0) && (
            <EquityGrowthChart
              closedTrades={closedTrades}
              completedHistory={completedHistory}
            />
          )}

          {/* Real Strategy Attribution: Audited track record from live strategySummary */}
          {strategies.length > 0 && (
            <StrategyAttributionMatrix strategies={strategies} />
          )}
        </div>
      )}

      {activeTab === "signals" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <SignalRadarGrid
            signals={filteredSignals}
            portfolioSymbols={portfolioSymbols}
            onOpenChart={onOpenChart}
            onOpenBuyModal={onOpenBuyModal}
          />
        </div>
      )}

      {activeTab === "positions" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <ActivePositionsBook
            inTradeTrades={filteredInTrade}
            portfolio={portfolio}
            onOpenChart={onOpenChart}
            onOpenSellModal={onOpenSellModal}
          />
        </div>
      )}

      {activeTab === "strategies" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {strategies.length > 0 ? (
            <StrategyAttributionMatrix strategies={strategies} />
          ) : (
            <div className="rounded-3xl p-8 text-center bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xl">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No strategy track record available</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
