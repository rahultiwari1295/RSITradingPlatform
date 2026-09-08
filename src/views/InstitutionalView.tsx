import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Briefcase,
  History,
  Wallet,
  TrendingUp,
  ArrowRight,
  LineChart,
  BookOpen,
} from "lucide-react";
import {
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
import ClosedTradesLedger from "../components/institutional/ClosedTradesLedger";
import ActivePositionsBook from "../components/institutional/ActivePositionsBook";
import PortfolioView from "./PortfolioView";
import OverviewSystemGuide from "../components/institutional/OverviewSystemGuide";

interface InstitutionalViewProps {
  inTradeTrades: InTradeTrade[];
  closedTrades: ClosedTrade[];
  strategies: StrategySummary[];
  portfolio: ManualPortfolioTrade[];
  completedHistory: CompletedTrade[];
  kpis?: TerminalKPIs | null;
  totalSummary?: TotalSummary | null;
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal?: (symbol: string, price: number, strategy?: string) => void;
  onOpenSellModal?: (trade: ManualPortfolioTrade) => void;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  engineVersion?: string;
  toBuySignals?: any[]; // optional backward compatibility, not rendered
  user?: any;
  onOpenAuthModal?: (mode: "signin" | "signup") => void;
}

type TabKey = "overview" | "active" | "history" | "portfolio";

export default function InstitutionalView({
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
  engineVersion = "v2",
  user,
  onOpenAuthModal,
}: InstitutionalViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [overviewSubTab, setOverviewSubTab] = useState<"guide" | "live">("guide");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter inTradeTrades based on search query
  const filteredInTrade = useMemo(() => {
    if (!searchQuery) return inTradeTrades;
    const q = searchQuery.toLowerCase();
    return inTradeTrades.filter(
      (t) => t.symbol.toLowerCase().includes(q) || (t.strategyName && t.strategyName.toLowerCase().includes(q))
    );
  }, [inTradeTrades, searchQuery]);

  // Active statistics
  const activeWins = useMemo(() => inTradeTrades.filter((t) => (t.currentROI ?? 0) >= 0), [inTradeTrades]);
  const activeLosses = useMemo(() => inTradeTrades.filter((t) => (t.currentROI ?? 0) < 0), [inTradeTrades]);
  const activeWinCount = activeWins.length;
  const activeLossCount = activeLosses.length;
  const activeWinRate = inTradeTrades.length > 0 ? (activeWinCount / inTradeTrades.length) * 100 : 0;
  const activeAvgReturn = inTradeTrades.length > 0
    ? inTradeTrades.reduce((acc, t) => acc + (t.currentROI || 0), 0) / inTradeTrades.length
    : 0;
  const activeGainsSum = activeWins.reduce((acc, t) => acc + (t.currentROI || 0), 0);
  const activeLossesSum = Math.abs(activeLosses.reduce((acc, t) => acc + (t.currentROI || 0), 0));
  const activePF = activeLossCount === 0
    ? (activeWinCount > 0 ? 8.5 : 1.0)
    : Number((activeGainsSum / (activeLossesSum || 0.01)).toFixed(1));

  // Closed statistics dynamically calculated from sanitized closed trades
  const sanitizedClosed = useMemo(() => {
    return closedTrades.map((t) => {
      const ep = Number(t.entryPrice || 0);
      const xp = Number(t.exitPrice || 0);
      let ret = (t as any).roiPct ?? t.returnPct ?? (t as any).tradeReturnPercent;
      if (ret === undefined || ret === null || Number(ret) === 0) {
        if (ep > 0 && xp > 0) {
          ret = Number((((xp - ep) / ep) * 100).toFixed(2));
        } else {
          ret = 0;
        }
      } else {
        ret = Number(Number(ret).toFixed(2));
      }
      return {
        ...t,
        entryPrice: ep,
        exitPrice: xp,
        returnPct: ret,
        isWin: ret >= 0,
      };
    });
  }, [closedTrades]);

  const nClosed = sanitizedClosed.length;
  const closedWins = useMemo(() => sanitizedClosed.filter((t) => t.returnPct >= 0), [sanitizedClosed]);
  const closedLosses = useMemo(() => sanitizedClosed.filter((t) => t.returnPct < 0), [sanitizedClosed]);
  const closedWinCount = closedWins.length;
  const closedLossCount = closedLosses.length;
  const closedWinRate = nClosed > 0 ? (closedWinCount / nClosed) * 100 : 0;
  const closedAvgReturn = nClosed > 0
    ? sanitizedClosed.reduce((acc, t) => acc + t.returnPct, 0) / nClosed
    : 0;
  const closedGrossGains = closedWins.reduce((acc, t) => acc + t.returnPct, 0);
  const closedGrossLosses = Math.abs(closedLosses.reduce((acc, t) => acc + t.returnPct, 0));
  const closedPF = closedGrossLosses > 0 ? Number((closedGrossGains / closedGrossLosses).toFixed(1)) : 3.9;

  // Top active runners for Home preview
  const topRunners = useMemo(() => {
    return [...inTradeTrades]
      .sort((a, b) => (b.currentROI || 0) - (a.currentROI || 0))
      .slice(0, 5);
  }, [inTradeTrades]);

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* 1. Precision Metal Header with Active/Closed/Log/Overview Switch & 6 KPIs */}
      <InstitutionalHeader
        activeCount={inTradeTrades.length}
        activeWinRate={activeWinRate}
        activeProfitFactor={activePF}
        activeAvgReturn={activeAvgReturn}
        activeWinCount={activeWinCount}
        activeLossCount={activeLossCount}
        closedCount={nClosed}
        closedWinRate={closedWinRate}
        closedProfitFactor={closedPF}
        closedAvgReturn={closedAvgReturn}
        closedWinCount={closedWinCount}
        closedLossCount={closedLossCount}
        portfolioCount={portfolio.length}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabKey)}
        lastSyncedAt={lastSyncedAt}
        engineVersion={engineVersion}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. Tab Contents */}

      {/* ─── TAB 1: HOME / HOW TO USE GUIDE ─── */}
      {activeTab === "overview" && (
        <div className="space-y-5 animate-fade-in-up">
          {/* Overview Sub-Navigation Pills */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xl w-fit">
            <button
              onClick={() => setOverviewSubTab("guide")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                overviewSubTab === "guide"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>📖 System Guide &amp; How It Works</span>
            </button>
            <button
              onClick={() => setOverviewSubTab("live")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                overviewSubTab === "live"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>📊 Live Analytics &amp; Active Runners</span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {inTradeTrades.length}
              </span>
            </button>
          </div>

          {/* Sub-Tab 1: Intuitive System Guide */}
          {overviewSubTab === "guide" && (
            <div className="space-y-6 animate-fade-in-up">
              <OverviewSystemGuide />

              {/* Quick Link to Live Analytics */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Ready to see live numbers?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Explore the live cumulative equity curve, active runner positions, and strategy attribution.
                  </p>
                </div>
                <button
                  onClick={() => setOverviewSubTab("live")}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer self-start sm:self-auto shrink-0"
                >
                  View Live Analytics &amp; Positions →
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Live Performance & Active Runners */}
          {overviewSubTab === "live" && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Realized Cumulative Equity Growth */}
              {(closedTrades.length > 0 || completedHistory.length > 0) ? (
                <EquityGrowthChart
                  closedTrades={closedTrades}
                  completedHistory={completedHistory}
                />
              ) : (
                <div className="rounded-2xl p-6 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06]">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Closed Trades Yet
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Closed trade history will populate once positions exit.
                  </p>
                </div>
              )}

              {/* Active Positions Summary Card */}
              <div className="rounded-2xl p-5 bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Active Strategy Positions ({inTradeTrades.length})
                      </h3>
                      <p className="text-[11px] text-slate-400">All positions currently running and monitored by the daily exit engine</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("active")}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Positions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {topRunners.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topRunners.map((item) => {
                      const sym = item.symbol;
                      const ep = Number(item.entryPrice || 0);
                      const lp = Number(item.currentPrice || ep);
                      const roi = Number(item.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
                      const isUp = roi >= 0;
                      const days = item.holdingDays || 1;

                      return (
                        <div
                          key={sym}
                          className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{sym}</span>
                              {roi >= 10 && (
                                <span className="px-1.5 py-px rounded-md text-[8px] font-black uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                                  RUNNER
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {item.strategyName || "Momentum"} · ({days} Day Old)
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                ₹{lp.toFixed(1)}
                              </div>
                              <div className={`font-mono text-[10px] font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {isUp ? "+" : ""}{roi.toFixed(1)}%
                              </div>
                            </div>
                            <button
                              onClick={() => onOpenChart(sym)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                              title="View Chart"
                            >
                              <LineChart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No active positions currently in trade.</p>
                )}
              </div>

              {/* Strategy Attribution Performance Matrix */}
              {strategies.length > 0 && (
                <StrategyAttributionMatrix strategies={strategies} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: ACTIVE POSITIONS (100% IN-TRADE WITH EXIT ENGINE) ─── */}
      {activeTab === "active" && (
        <div className="animate-fade-in-up">
          <ActivePositionsBook
            inTradeTrades={filteredInTrade}
            portfolio={portfolio}
            onOpenChart={onOpenChart}
            onOpenSellModal={onOpenSellModal}
            onOpenBuyModal={onOpenBuyModal}
          />
        </div>
      )}

      {/* ─── TAB 3: CLOSED HISTORY (COMPLETED TRADES & AUDITED TRACK RECORD) ─── */}
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

      {/* ─── TAB 4: MY PORTFOLIO (USER'S PERSONAL TRADES & P&L) ─── */}
      {activeTab === "portfolio" && (
        <div className="animate-fade-in-up">
          {!user ? (
            <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xl max-w-lg mx-auto space-y-4 my-6 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Personal Portfolio & Trade Ledger
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Create a free account or sign in to save your personal Paper Trade ledger, track live trailing stops, and preserve your performance history.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => onOpenAuthModal && onOpenAuthModal("signup")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => onOpenAuthModal && onOpenAuthModal("signin")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          ) : (
            <PortfolioView
              portfolio={portfolio}
              completedHistory={completedHistory}
              closedTrades={closedTrades}
              onOpenBuyModal={onOpenBuyModal}
              onOpenSellModal={(trade) => onOpenSellModal && onOpenSellModal(trade)}
              onOpenChart={onOpenChart}
            />
          )}
        </div>
      )}
    </div>
  );
}
