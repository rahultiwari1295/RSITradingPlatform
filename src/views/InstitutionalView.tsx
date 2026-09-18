import React, { useState, useMemo, useCallback } from "react";
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
import InstitutionalDock, { DockTabId } from "../components/institutional/InstitutionalDock";
import EquityGrowthChart from "../components/institutional/EquityGrowthChart";
import StrategyAttributionMatrix from "../components/institutional/StrategyAttributionMatrix";
import ClosedTradesLedger from "../components/institutional/ClosedTradesLedger";
import ActivePositionsBook from "../components/institutional/ActivePositionsBook";
import PortfolioView from "./PortfolioView";
import OverviewSystemGuide from "../components/institutional/OverviewSystemGuide";
import StockDetailPage from "../components/institutional/StockDetailPage";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import FeedsView from "./FeedsView";

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
  onDeleteCompletedTrade?: (tradeIdOrIndex: string | number) => void;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  engineVersion?: string;
  toBuySignals?: any[]; // optional backward compatibility, not rendered
  user?: any;
  onOpenAuthModal?: (mode: "signin" | "signup") => void;
}

type TabKey = DockTabId;

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
  onDeleteCompletedTrade,
  lastSyncedAt,
  isSyncing = false,
  engineVersion = "v2",
  user,
  onOpenAuthModal,
}: InstitutionalViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("market");
  const [signalsMode, setSignalsMode] = useState<"active" | "closed">("active");
  const [marketSubTab, setMarketSubTab] = useState<"news" | "sectors">("news");
  const [marketCounts, setMarketCounts] = useState<{ news: number; sectors: number }>({ news: 10, sectors: 12 });

  const handleMarketCountsUpdate = useCallback((news: number, sectors: number) => {
    setMarketCounts((prev) => {
      if (prev.news === news && prev.sectors === sectors) return prev;
      return { news, sectors };
    });
  }, []);
  const [overviewSubTab, setOverviewSubTab] = useState<"guide" | "live">("guide");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);
  const [selectedStockDetail, setSelectedStockDetail] = useState<{
    item: BottomSheetItem;
    sourceTitle: string;
    itemsList: BottomSheetItem[];
    currentIndex: number;
  } | null>(null);

  const openStockDetailPage = (
    item: BottomSheetItem,
    sourceTitle: string,
    itemsList: BottomSheetItem[],
    currentIndex: number
  ) => {
    setSelectedStockDetail({
      item,
      sourceTitle,
      itemsList,
      currentIndex,
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const formatPosToSheetItem = (pos: InTradeTrade): BottomSheetItem => {
    const ep = Number(pos.entryPrice || 0);
    const lp = Number(pos.currentPrice || ep);
    const roi = Number(pos.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
    const calcDays = pos.entryDate
      ? Math.max(1, Math.round((Date.now() - new Date(pos.entryDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const days = Number(pos.holdingDays || calcDays);

    return {
      ...pos,
      symbol: pos.symbol,
      strategyName: pos.strategyName || "INSTITUTIONAL POCKET PIVOT · SLEEVE 2",
      entryDate: pos.entryDate,
      entryPrice: ep,
      currentPrice: lp,
      currentROI: roi,
      holdingDays: days,
      sector: pos.sector,
      compositeScore: pos.compositeScore,
      technicalScore: pos.technicalScore,
      riskScore: pos.riskScore,
      mlProbability: pos.mlProbability,
      stars: pos.stars,
      action: pos.action || "HOLD",
      actionLabel: pos.actionLabel || "IN POSITION",
      actionColor: pos.actionColor || "blue",
      slippageText: pos.slippageText,
      footerLine: pos.footerLine,
      footerTags: pos.footerTags,
      stopLoss: pos.stopLoss ?? pos.stopPrice,
      targetPrice: pos.targetPrice ?? pos.target1Price,
      shares: pos.shares,
      tradePlan: {
        target1Price: pos.targetPrice ?? pos.target1Price,
        stopPrice: pos.stopLoss ?? pos.stopPrice,
        t1RiskReward: pos.t1RiskReward,
      },
    };
  };

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

  // Filter closedTrades based on search query
  const filteredClosed = useMemo(() => {
    if (!searchQuery) return sanitizedClosed;
    const q = searchQuery.toLowerCase();
    return sanitizedClosed.filter(
      (t) => t.symbol.toLowerCase().includes(q) || (t.strategyName && t.strategyName.toLowerCase().includes(q))
    );
  }, [sanitizedClosed, searchQuery]);

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

  // Dedicated Full New Page View for Stocks (eliminates all scroll issues in 263-stock ledger)
  if (selectedStockDetail) {
    const isBought = portfolio.some((p) => p.symbol === selectedStockDetail.item.symbol);
    return (
      <div className="space-y-4 pb-28 sm:pb-32 animate-fade-in">
        <StockDetailPage
          item={selectedStockDetail.item}
          sourceListTitle={selectedStockDetail.sourceTitle}
          onBack={() => {
            setSelectedStockDetail(null);
          }}
          onPrev={
            selectedStockDetail.currentIndex > 0
              ? () => {
                  const prevIdx = selectedStockDetail.currentIndex - 1;
                  setSelectedStockDetail({
                    ...selectedStockDetail,
                    item: selectedStockDetail.itemsList[prevIdx],
                    currentIndex: prevIdx,
                  });
                }
              : undefined
          }
          onNext={
            selectedStockDetail.currentIndex < selectedStockDetail.itemsList.length - 1
              ? () => {
                  const nextIdx = selectedStockDetail.currentIndex + 1;
                  setSelectedStockDetail({
                    ...selectedStockDetail,
                    item: selectedStockDetail.itemsList[nextIdx],
                    currentIndex: nextIdx,
                  });
                }
              : undefined
          }
          currentIndex={selectedStockDetail.currentIndex}
          totalCount={selectedStockDetail.itemsList.length}
          onOpenChart={onOpenChart}
          onOpenBuyModal={onOpenBuyModal}
          onOpenSellModal={
            onOpenSellModal
              ? (item) => {
                  const userPos = portfolio.find((p) => p.symbol === item.symbol);
                  if (userPos) onOpenSellModal(userPos);
                }
              : undefined
          }
          isBought={isBought}
        />

        {/* Floating Bottom Dock */}
        <InstitutionalDock
          activeTab={activeTab}
          onTabChange={(tab) => {
            setSelectedStockDetail(null);
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          activeSignalsCount={inTradeTrades.length}
          closedTradesCount={sanitizedClosed.length}
          portfolioCount={portfolio.length}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 sm:pb-32 animate-fade-in">
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
        signalsMode={signalsMode}
        onSignalsModeChange={setSignalsMode}
        marketSubTab={marketSubTab}
        onMarketSubTabChange={setMarketSubTab}
        newsCount={marketCounts.news}
        sectorsCount={marketCounts.sectors}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
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

            <button
              onClick={() => setActiveTab("market")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-all cursor-pointer"
            >
              <span>← Return to Terminal</span>
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
                    onClick={() => {
                      setActiveTab("signals");
                      setSignalsMode("active");
                    }}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Positions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {topRunners.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topRunners.map((item, idx) => {
                      const sym = item.symbol;
                      const ep = Number(item.entryPrice || 0);
                      const lp = Number(item.currentPrice || ep);
                      const roi = Number(item.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
                      const isUp = roi >= 0;
                      const days = item.holdingDays || 1;

                      return (
                        <div
                          key={sym}
                          onClick={() =>
                            openStockDetailPage(
                              formatPosToSheetItem(item),
                              "Top Active Runners",
                              topRunners.map(formatPosToSheetItem),
                              idx
                            )
                          }
                          className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-100 dark:border-white/[0.04] flex items-center justify-between transition-all cursor-pointer group hover:border-slate-300 dark:hover:border-white/10"
                          title="Click to view institutional dossier"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{sym}</span>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChart(sym);
                              }}
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

      {/* ─── TAB 1: MARKET (NEWS & SECTOR ROTATION) ─── */}
      {activeTab === "market" && (
        <FeedsView
          inTradeTrades={inTradeTrades}
          onOpenChart={onOpenChart}
          onOpenBuyModal={onOpenBuyModal}
          marketSubTab={marketSubTab}
          onCountsUpdate={handleMarketCountsUpdate}
          onNavigateToActive={() => {
            setActiveTab("signals");
            setSignalsMode("active");
          }}
        />
      )}

      {/* ─── TAB 2: SIGNALS (ACTIVE STRATEGY POSITIONS OR CLOSED AUDITED LEDGER) ─── */}
      {activeTab === "signals" && (
        <div className="animate-fade-in-up space-y-6">
          {signalsMode === "active" ? (
            <ActivePositionsBook
              inTradeTrades={filteredInTrade}
              portfolio={portfolio}
              onOpenChart={onOpenChart}
              onOpenSellModal={onOpenSellModal}
              onOpenBuyModal={onOpenBuyModal}
              onSelectStock={(item, allItems, idx) =>
                openStockDetailPage(
                  item,
                  `Active Strategy Positions (${filteredInTrade.length} Stocks)`,
                  allItems,
                  idx
                )
              }
            />
          ) : (
            <div className="space-y-6">
              <ClosedTradesLedger
                closedTrades={filteredClosed}
                onOpenChart={onOpenChart}
                onSelectStock={(item, allItems, idx) =>
                  openStockDetailPage(
                    item,
                    `Closed Trades (${filteredClosed.length} Stocks)`,
                    allItems,
                    idx
                  )
                }
              />
              {(sanitizedClosed.length > 0 || completedHistory.length > 0) && (
                <EquityGrowthChart
                  closedTrades={sanitizedClosed}
                  completedHistory={completedHistory}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: PAPER DESK (USER'S PERSONAL TRADES & SIMULATED P&L) ─── */}
      {activeTab === "paper" && (
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
              inTradeTrades={inTradeTrades}
              onOpenBuyModal={onOpenBuyModal}
              onOpenSellModal={(trade) => onOpenSellModal && onOpenSellModal(trade)}
              onOpenChart={onOpenChart}
              onDeleteCompletedTrade={onDeleteCompletedTrade}
              onSelectStock={(item) => {
                const sym = (item.symbol || "").toUpperCase().trim();
                const activeMatch = inTradeTrades.find(t => (t.symbol || "").toUpperCase().trim() === sym);
                const ep = Number(item.buyPrice || item.entryPrice || activeMatch?.entryPrice || 0);
                const lp = Number(item.currentPrice || activeMatch?.currentPrice || ep);
                const roi = Number(item.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
                const sheetItem: BottomSheetItem = {
                  ...activeMatch,
                  ...item,
                  symbol: sym,
                  entryPrice: ep,
                  currentPrice: lp,
                  currentROI: roi,
                  strategyName: activeMatch?.strategyName || item.strategyName || "Institutional Momentum",
                  action: activeMatch ? "HOLD" : undefined,
                  actionLabel: activeMatch ? "IN POSITION" : undefined
                };
                openStockDetailPage(sheetItem, "Paper Portfolio", [sheetItem], 0);
              }}
            />
          )}
        </div>
      )}

      {/* Institutional Stock Overview Dossier */}
      <BottomSheet
        isOpen={!!selectedSheetItem}
        onClose={() => setSelectedSheetItem(null)}
        item={selectedSheetItem}
        onOpenChart={onOpenChart}
        onOpenBuyModal={onOpenBuyModal}
        onOpenSellModal={onOpenSellModal ? (item) => {
          const userPos = portfolio.find((p) => p.symbol === item.symbol);
          if (userPos) onOpenSellModal(userPos);
        } : undefined}
        isBought={!!portfolio.some((p) => p.symbol === selectedSheetItem?.symbol)}
      />

      {/* Floating Bottom Navigation Dock */}
      <InstitutionalDock
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        activeSignalsCount={inTradeTrades.length}
        closedTradesCount={sanitizedClosed.length}
        portfolioCount={portfolio.length}
      />
    </div>
  );
}
