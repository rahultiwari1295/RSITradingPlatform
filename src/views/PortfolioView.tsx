import React, { useState, useMemo } from "react";
import {
  Plus,
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  Trophy,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle
} from "lucide-react";
import HeroCard from "../components/HeroCard";
import StatusPill from "../components/StatusPill";
import SymbolAvatar from "../components/SymbolAvatar";
import { ManualPortfolioTrade, CompletedTrade } from "../types";
import { formatINR, formatPercent } from "../constants/theme";

interface PortfolioViewProps {
  portfolio: ManualPortfolioTrade[];
  completedHistory?: CompletedTrade[];
  onOpenAddModal: () => void;
  onOpenSellModal: (trade: ManualPortfolioTrade) => void;
  onOpenChart: (symbol: string) => void;
  onDeleteCompletedTrade?: (tradeIndexOrId: number | string) => void;
}

export default function PortfolioView({
  portfolio,
  completedHistory = [],
  onOpenAddModal,
  onOpenSellModal,
  onOpenChart,
  onDeleteCompletedTrade
}: PortfolioViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "WINNERS" | "LOSERS">("ALL");
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<"date" | "pnl" | "roi" | "hold">("date");
  const [tradeToDelete, setTradeToDelete] = useState<{ item: CompletedTrade; index: number } | null>(null);


  // Partition active holdings into needs-attention (untracked) vs healthy (still on system's radar)
  const untrackedTrades = portfolio.filter(p => !p.isActiveInStrategy);
  const healthyTrades = portfolio.filter(p => p.isActiveInStrategy);

  const totalActiveCount = portfolio.length;
  const trackedCount = healthyTrades.length;
  const untrackedCount = untrackedTrades.length;

  // Compute rich historical metrics
  const historyMetrics = useMemo(() => {
    const totalTrades = completedHistory.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winningTrades: [],
        losingTrades: [],
        breakevenTrades: [],
        winRate: 0,
        totalRealizedPnl: 0,
        totalInvested: 0,
        totalReceived: 0,
        totalRoiPct: 0,
        avgReturnPct: 0,
        avgHoldDays: 0,
        profitFactor: 0,
        bestTrade: null,
        worstTrade: null
      };
    }

    const winningTrades = completedHistory.filter(t => (t.pnl ?? 0) > 0);
    const losingTrades = completedHistory.filter(t => (t.pnl ?? 0) < 0);
    const breakevenTrades = completedHistory.filter(t => (t.pnl ?? 0) === 0);

    const winRate = (winningTrades.length / totalTrades) * 100;
    const totalRealizedPnl = completedHistory.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
    const totalInvested = completedHistory.reduce((acc, t) => acc + (t.totalInvested || ((t.buyPrice ?? 0) * (t.quantity ?? 1))), 0);
    const totalReceived = completedHistory.reduce((acc, t) => acc + (t.totalReceived || ((t.sellPrice ?? 0) * (t.quantity ?? 1))), 0);
    const totalRoiPct = totalInvested > 0 ? (totalRealizedPnl / totalInvested) * 100 : 0;
    const avgReturnPct = completedHistory.reduce((acc, t) => acc + (t.pnlPct ?? 0), 0) / totalTrades;
    const avgHoldDays = Math.round(completedHistory.reduce((acc, t) => acc + (t.holdDays ?? 0), 0) / totalTrades);

    const totalWinsAmount = winningTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
    const totalLossesAmount = Math.abs(losingTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0));
    const profitFactor = totalLossesAmount > 0 ? totalWinsAmount / totalLossesAmount : totalWinsAmount > 0 ? 99.9 : 0;

    const sortedByRoi = [...completedHistory].sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0));
    const bestTrade = sortedByRoi[0] || null;
    const worstTrade = sortedByRoi[sortedByRoi.length - 1] || null;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      breakevenTrades,
      winRate,
      totalRealizedPnl,
      totalInvested,
      totalReceived,
      totalRoiPct,
      avgReturnPct,
      avgHoldDays,
      profitFactor,
      bestTrade,
      worstTrade
    };
  }, [completedHistory]);

  // Filtered and sorted trade history list
  const filteredHistory = useMemo(() => {
    return completedHistory
      .filter(item => {
        if (historyFilter === "WINNERS" && (item.pnl ?? 0) <= 0) return false;
        if (historyFilter === "LOSERS" && (item.pnl ?? 0) >= 0) return false;
        if (historySearch) {
          const q = historySearch.toLowerCase();
          return (
            item.symbol.toLowerCase().includes(q) ||
            (item.strategyName && item.strategyName.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (historySort === "pnl") return (b.pnl ?? 0) - (a.pnl ?? 0);
        if (historySort === "roi") return (b.pnlPct ?? 0) - (a.pnlPct ?? 0);
        if (historySort === "hold") return (b.holdDays ?? 0) - (a.holdDays ?? 0);
        return 0; // Default order is chronological/insertion
      });
  }, [completedHistory, historyFilter, historySearch, historySort]);

  return (
    <div className="w-full pb-6">
      {/* Top Header Row with History Toggle & Add Button */}
      <div className="flex justify-between items-center mb-[18px]">
        <div>
          <h1 className="text-[21px] text-[#14151A] dark:text-slate-100 font-bold tracking-[-0.4px]">
            {showHistory ? "Trade History" : "My Portfolio"}
          </h1>
          <p className="text-[12px] font-semibold text-[#8B8D98] dark:text-slate-400 mt-0.5">
            {showHistory
              ? `Realized P&L & performance across ${completedHistory.length} closed trades`
              : `${totalActiveCount} active positions currently in wallet`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* History / Active Toggle Pill */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-2 rounded-[13px] border text-[12px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs active:scale-95 ${
              showHistory
                ? "bg-[#14151A] text-white border-[#14151A] dark:bg-slate-100 dark:text-slate-900"
                : "bg-white dark:bg-slate-900 text-[#56586A] dark:text-slate-300 border-[#ECEEF2] dark:border-slate-800 hover:bg-[#F6F7F9] dark:hover:bg-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{showHistory ? "View Active" : `History (${completedHistory.length})`}</span>
          </button>

          {/* Add Position Button */}
          {!showHistory && (
            <button
              onClick={onOpenAddModal}
              className="w-[40px] h-[40px] rounded-[13px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 flex items-center justify-center text-[#14151A] dark:text-slate-200 text-[18px] font-bold shadow-3xs hover:bg-[#F6F7F9] dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
              title="Add Position"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Conditionally Render History View or Active Portfolio View */}
      {showHistory ? (
        <div>
          {/* Hero Card for History */}
          <HeroCard
            eyebrow="REALIZED PERFORMANCE"
            glowColor={historyMetrics.totalRealizedPnl >= 0 ? "mint" : "red"}
            headline={
              historyMetrics.totalTrades === 0 ? (
                <>No closed trades recorded in history yet</>
              ) : historyMetrics.totalRealizedPnl >= 0 ? (
                <>
                  Realized profit of{" "}
                  <b className="text-[#8BF694] font-bold">
                    +{formatINR(historyMetrics.totalRealizedPnl)}
                  </b>{" "}
                  across {historyMetrics.totalTrades} closed trades
                </>
              ) : (
                <>
                  Realized drawdown of{" "}
                  <b className="text-[#F97066] font-bold">
                    {formatINR(historyMetrics.totalRealizedPnl)}
                  </b>{" "}
                  across {historyMetrics.totalTrades} closed trades
                </>
              )
            }
            stats={[
              {
                value: `${historyMetrics.winRate.toFixed(1)}%`,
                label: `Win Rate (${historyMetrics.winningTrades.length}W · ${historyMetrics.losingTrades.length}L)`,
                valueColor: historyMetrics.winRate >= 50 ? "#8BF694" : "#F97066"
              },
              {
                value: `${historyMetrics.avgReturnPct >= 0 ? "+" : ""}${historyMetrics.avgReturnPct.toFixed(1)}%`,
                label: "Avg ROI / Trade",
                valueColor: historyMetrics.avgReturnPct >= 0 ? "#8BF694" : "#F97066"
              },
              {
                value: formatINR(historyMetrics.totalInvested),
                label: "Capital Deployed",
                valueColor: "#FFFFFF"
              }
            ]}
            className="mb-4 shadow-lg"
          />

          {/* 4 Executive KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
            {/* KPI 1: Realized PnL */}
            <div className="rounded-[16px] p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-3xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-[#8B8D98] font-mono tracking-wider">
                  Total Realized P&L
                </span>
                {historyMetrics.totalRealizedPnl >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-[#F04438]" />
                )}
              </div>
              <div>
                <div
                  className={`text-[17px] sm:text-[19px] font-extrabold font-mono tracking-tight ${
                    historyMetrics.totalRealizedPnl >= 0 ? "text-[#16A34A]" : "text-[#F04438]"
                  }`}
                >
                  {historyMetrics.totalRealizedPnl >= 0 ? "+" : ""}
                  {formatINR(historyMetrics.totalRealizedPnl)}
                </div>
                <div className="text-[10.5px] font-semibold text-[#8B8D98] mt-0.5 font-mono">
                  ROI: {historyMetrics.totalRoiPct >= 0 ? "+" : ""}
                  {historyMetrics.totalRoiPct.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* KPI 2: Win/Loss Ratio */}
            <div className="rounded-[16px] p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-3xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-[#8B8D98] font-mono tracking-wider">
                  Win / Loss Record
                </span>
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <div className="text-[17px] sm:text-[19px] font-extrabold text-[#14151A] dark:text-slate-100 font-mono tracking-tight">
                  {historyMetrics.winningTrades.length}W &ndash; {historyMetrics.losingTrades.length}L
                </div>
                <div className="text-[10.5px] font-semibold text-[#8B8D98] mt-0.5 flex items-center gap-1 font-mono">
                  <span>Factor: {historyMetrics.profitFactor.toFixed(2)}x</span>
                  <span>&bull;</span>
                  <span className="text-[#6366F1] font-bold">{historyMetrics.winRate.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Turnover & Capital */}
            <div className="rounded-[16px] p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-3xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-[#8B8D98] font-mono tracking-wider">
                  Total Received
                </span>
                <Wallet className="w-3.5 h-3.5 text-[#6366F1]" />
              </div>
              <div>
                <div className="text-[17px] sm:text-[19px] font-extrabold text-[#14151A] dark:text-slate-100 font-mono tracking-tight">
                  {formatINR(historyMetrics.totalReceived)}
                </div>
                <div className="text-[10.5px] font-semibold text-[#8B8D98] mt-0.5 font-mono">
                  Deployed: {formatINR(historyMetrics.totalInvested)}
                </div>
              </div>
            </div>

            {/* KPI 4: Holding & Outlier */}
            <div className="rounded-[16px] p-3 sm:p-3.5 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-3xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-[#8B8D98] font-mono tracking-wider">
                  Avg Holding & Best
                </span>
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <div className="text-[17px] sm:text-[19px] font-extrabold text-[#14151A] dark:text-slate-100 tracking-tight font-mono">
                  {historyMetrics.avgHoldDays} days
                </div>
                <div className="text-[10.5px] font-semibold text-[#16A34A] mt-0.5 font-mono truncate">
                  Best: {historyMetrics.bestTrade ? `${historyMetrics.bestTrade.symbol} (+${(historyMetrics.bestTrade.pnlPct ?? 0).toFixed(1)}%)` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Sort controls for History */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="🔍 Search closed trade symbol or strategy..."
                className="w-full bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 rounded-[12px] px-3 py-2 text-[12.5px] text-[#14151A] dark:text-slate-100 placeholder-[#B3B5C0] font-semibold shadow-3xs outline-hidden focus:border-[#6366F1]"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (historySort === "date") setHistorySort("pnl");
                else if (historySort === "pnl") setHistorySort("roi");
                else if (historySort === "roi") setHistorySort("hold");
                else setHistorySort("date");
              }}
              className="px-3 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 rounded-[12px] flex items-center gap-1.5 text-[11.5px] font-bold text-[#56586A] dark:text-slate-300 shadow-3xs hover:bg-[#F6F7F9] cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#6366F1]" />
              <span className="hidden sm:inline font-mono">
                {historySort === "date" ? "Recent" : historySort === "pnl" ? "P&L" : historySort === "roi" ? "ROI %" : "Held"}
              </span>
            </button>
          </div>

          {/* Filter Pills for History */}
          <div className="flex items-center gap-2 mb-4">
            {(["ALL", "WINNERS", "LOSERS"] as const).map((tab) => {
              const isActive = historyFilter === tab;
              const label = tab === "ALL" ? "All Trades" : tab === "WINNERS" ? "Winners" : "Losers";
              const count = tab === "ALL" ? historyMetrics.totalTrades : tab === "WINNERS" ? historyMetrics.winningTrades.length : historyMetrics.losingTrades.length;

              return (
                <button
                  key={tab}
                  onClick={() => setHistoryFilter(tab)}
                  className={`px-3 py-1.5 rounded-[16px] text-[11.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#14151A] text-white border border-[#14151A] dark:bg-slate-100 dark:text-slate-900 shadow-3xs"
                      : "bg-white dark:bg-slate-900 text-[#56586A] dark:text-slate-300 border border-[#ECEEF2] dark:border-slate-800 hover:bg-[#F6F7F9]"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-slate-900"
                        : "bg-[#F1F2F5] dark:bg-slate-800 text-[#6366F1]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Completed Trades List */}
          {filteredHistory.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[20px] border border-[#ECEEF2] dark:border-slate-800 text-[#8B8D98] text-[13px] font-semibold shadow-3xs">
              No completed trades match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredHistory.map((item, idx) => {
                const isProfit = (item.pnl ?? 0) >= 0;
                const invested = item.totalInvested || (item.buyPrice * item.quantity);
                const received = item.totalReceived || (item.sellPrice * item.quantity);

                return (
                  <div
                    key={`${item.tradeId || item.symbol}-${idx}`}
                    onClick={() => onOpenChart(item.symbol)}
                    className="rounded-[18px] p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-[0_2px_10px_-4px_rgba(20,25,40,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Symbol + Avatar + Status Pill */}
                      <div className="flex justify-between items-start mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <SymbolAvatar symbol={item.symbol} gradientIndex={idx} size={38} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[15.5px] font-extrabold text-[#14151A] dark:text-slate-100 tracking-tight group-hover:text-[#6366F1] transition-colors">
                                {item.symbol}
                              </span>
                              <ExternalLink className="w-3 h-3 text-[#8B8D98] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-[11.5px] text-[#8B8D98] font-semibold mt-0.5">
                              {item.strategyName || "Swing setup"} &bull; {item.quantity} shares
                            </div>
                          </div>
                        </div>

                        {/* Outcome Pill & Delete Action */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full font-mono ${
                              isProfit
                                ? "bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC] dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {isProfit ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isProfit ? "PROFIT" : "LOSS"}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTradeToDelete({ item, index: idx });
                            }}
                            className="p-1.5 rounded-[8px] text-[#8B8D98] hover:text-[#F04438] hover:bg-[#FEF3F2] dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete this trade record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Realized PnL & ROI Banner */}
                      <div className="flex justify-between items-center py-1.5 px-3 rounded-[10px] bg-[#FAFAFC] dark:bg-slate-800/60 border border-[#F1F2F5] dark:border-slate-800 mb-2.5">
                        <div>
                          <div className="text-[9.5px] uppercase font-bold text-[#8B8D98] font-mono tracking-wider">
                            Realized Return
                          </div>
                          <div
                            className={`text-[15px] font-extrabold font-mono tracking-tight ${
                              isProfit ? "text-[#16A34A]" : "text-[#F04438]"
                            }`}
                          >
                            {isProfit ? "+" : ""}
                            {formatINR(item.pnl)} ({item.pnlPct >= 0 ? "+" : ""}{(item.pnlPct ?? 0).toFixed(2)}%)
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9.5px] uppercase font-bold text-[#8B8D98] font-mono tracking-wider">
                            Holding Time
                          </div>
                          <div className="text-[12.5px] font-bold text-[#14151A] dark:text-slate-200 font-mono">
                            {item.holdDays || 10} days
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trade Price & Dates Breakdown */}
                    <div className="pt-2 border-t border-[#F1F2F5] dark:border-slate-800 text-[11px] font-mono text-[#56586A] dark:text-slate-400 flex items-center justify-between">
                      <div>
                        <span className="text-[#8B8D98]">Bought: </span>
                        <span className="font-bold text-[#14151A] dark:text-slate-200">{formatINR(item.buyPrice)}</span>
                        {item.buyDate && <span className="text-[#8B8D98] ml-1">({item.buyDate})</span>}
                      </div>

                      <div className="text-[#D0D2D8] font-bold">&rarr;</div>

                      <div>
                        <span className="text-[#8B8D98]">Sold: </span>
                        <span className="font-bold text-[#14151A] dark:text-slate-200">{formatINR(item.sellPrice)}</span>
                        {item.sellDate && <span className="text-[#8B8D98] ml-1">({item.sellDate})</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Hero Card for Active Portfolio */}
          <HeroCard
            eyebrow="Portfolio health"
            glowColor={untrackedCount > 0 ? "red" : "mint"}
            headline={
              untrackedCount > 0 ? (
                <>
                  {trackedCount} holdings still tracked,{" "}
                  <b className="text-[#F97066] font-bold">{untrackedCount} need your attention</b>
                </>
              ) : (
                <>
                  All {trackedCount} holdings are{" "}
                  <b className="text-[#8BF694] font-bold">healthy & active</b>
                </>
              )
            }
            stats={[
              { value: totalActiveCount, label: "Total holdings" },
              { value: trackedCount, label: "System tracked", valueColor: "#8BF694" },
              {
                value: untrackedCount,
                label: "Not tracked",
                valueColor: untrackedCount > 0 ? "#F97066" : "#FFFFFF"
              }
            ]}
            className="mb-5 shadow-lg"
          />

          {/* SECTION 1: Needs Attention / Untracked Section */}
          {untrackedCount > 0 && (
            <div className="mb-6">
              {/* Exit Section Alert Banner */}
              <div className="rounded-[16px] p-3.5 sm:p-4 bg-[#FEF3F2] dark:bg-rose-950/30 border border-[#FECDCA] dark:border-rose-900/50 mb-3.5 select-none">
                <div className="text-[13.5px] font-extrabold text-[#7A271A] dark:text-rose-300">
                  Below trades no longer exist in active trades
                </div>
                <div className="text-[11.5px] text-[#B42318] dark:text-rose-400 font-semibold mt-0.5">
                  The strategy has moved on &mdash; please review and exit manually
                </div>
              </div>

              {/* Needs-Exit Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {untrackedTrades.map((pos) => {
                  const invested = pos.totalInvested || (pos.buyPrice * (pos.quantity || 1));
                  const heldDays = pos.daysHeld || 10;

                  return (
                    <div
                      key={pos.tradeId || pos.symbol}
                      className="rounded-[18px] p-4 bg-white dark:bg-slate-900 border-[1.5px] border-[#FECDCA] dark:border-rose-900/60 shadow-[0_2px_12px_-4px_rgba(20,25,40,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] transition-all cursor-pointer flex flex-col justify-between"
                      onClick={() => onOpenChart(pos.symbol)}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[15.5px] font-bold text-[#14151A] dark:text-slate-100">
                              {pos.symbol}
                            </div>
                            <div className="text-[11.5px] text-[#8B8D98] font-semibold mt-0.5">
                              {pos.quantity || 1} {pos.quantity === 1 ? "share" : "shares"} &middot; bought {pos.date || "recently"}
                            </div>
                          </div>
                          <StatusPill text="EXIT" tone="NegativeSolid" />
                        </div>

                        <div className="h-[1px] bg-[#F1F2F5] dark:bg-slate-800 my-2.5" />
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div className="flex items-center gap-3.5">
                          <div>
                            <div className="text-[9.5px] text-[#56586A] dark:text-slate-400 font-bold uppercase tracking-[0.3px] font-mono">
                              Invested
                            </div>
                            <div className="text-[13.5px] text-[#14151A] dark:text-slate-100 font-bold mt-0.5 font-mono">
                              {formatINR(invested)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9.5px] text-[#56586A] dark:text-slate-400 font-bold uppercase tracking-[0.3px] font-mono">
                              Held for
                            </div>
                            <div className="text-[13.5px] text-[#14151A] dark:text-slate-100 font-bold mt-0.5">
                              {heldDays} days
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSellModal(pos);
                          }}
                          className="px-3 py-1.5 rounded-[10px] bg-[#F04438] hover:bg-[#d9382d] text-white text-[11.5px] font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                        >
                          Mark as sold
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: Still on system's radar / Healthy holdings */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-0.5">
              <div className="w-2 h-2 rounded-full bg-[#16A34A] ring-4 ring-emerald-100 dark:ring-emerald-950/40" />
              <div className="text-[13.5px] font-bold text-[#14151A] dark:text-slate-100">
                Still on the system&rsquo;s radar
              </div>
              <div className="text-[11px] font-bold text-[#16A34A] bg-[#ECFDF3] dark:bg-emerald-950/50 px-2 py-0.5 rounded-[8px] font-mono">
                {trackedCount}
              </div>
            </div>

            {healthyTrades.length === 0 ? (
              <div className="p-8 text-center rounded-[20px] bg-white dark:bg-slate-900 border border-[#ECEEF2] text-[#8B8D98] text-xs">
                No active holdings currently on the radar. Tap + to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {healthyTrades.map((pos) => {
                  const invested = pos.totalInvested || (pos.buyPrice * (pos.quantity || 1));
                  const currentRoi = pos.currentROI ?? 0;
                  const isPositive = currentRoi >= 0;
                  const currentTotal = pos.currentPrice ? pos.currentPrice * (pos.quantity || 1) : invested * (1 + currentRoi / 100);
                  const pnlDelta = currentTotal - invested;
                  const heldDays = pos.daysHeld || 13;

                  return (
                    <div
                      key={pos.tradeId || pos.symbol}
                      className="rounded-[18px] p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-[0_2px_12px_-4px_rgba(20,25,40,0.06)] transition-all hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] cursor-pointer flex flex-col justify-between"
                      onClick={() => onOpenChart(pos.symbol)}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[15.5px] font-bold text-[#14151A] dark:text-slate-100">
                              {pos.symbol}
                            </div>
                            <div className="text-[11.5px] text-[#8B8D98] font-semibold mt-0.5">
                              {pos.quantity || 1} {pos.quantity === 1 ? "share" : "shares"} &middot; bought {pos.date || "recently"}
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-[15px] font-extrabold flex items-center justify-end gap-1 font-mono ${
                                isPositive ? "text-[#16A34A]" : "text-[#F04438]"
                              }`}
                            >
                              <span>{isPositive ? "▲" : "▼"}</span>
                              <span>{formatPercent(currentRoi)}</span>
                            </div>
                            <div className="text-[11px] text-[#8B8D98] font-semibold mt-0.5 font-mono">
                              held {heldDays}d
                            </div>
                          </div>
                        </div>

                        <div className="h-[1px] bg-[#F1F2F5] dark:bg-slate-800 my-2.5" />
                      </div>

                      {/* Invested -> PnL and Action Button */}
                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div>
                            <div className="text-[9.5px] text-[#56586A] dark:text-slate-400 font-bold uppercase tracking-[0.3px] font-mono">
                              Invested
                            </div>
                            <div className="text-[13.5px] font-bold text-[#14151A] dark:text-slate-100 font-mono mt-0.5">
                              {formatINR(invested)}
                            </div>
                          </div>

                          <div className="text-[#D0D2D8] font-bold text-xs select-none">
                            &rarr;
                          </div>

                          <div>
                            <div className="text-[9.5px] text-[#56586A] dark:text-slate-400 font-bold uppercase tracking-[0.3px] font-mono">
                              PnL
                            </div>
                            <div
                              className={`text-[13.5px] font-extrabold font-mono mt-0.5 ${
                                isPositive ? "text-[#16A34A]" : "text-[#F04438]"
                              }`}
                            >
                              {isPositive ? "" : "-"}{formatINR(Math.abs(pnlDelta))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSellModal(pos);
                          }}
                          className="px-3 py-1.5 rounded-[10px] bg-[#F6F7F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#56586A] dark:text-slate-200 text-[11.5px] font-bold transition-colors cursor-pointer shrink-0"
                        >
                          Mark as sold
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation Modal for Deleting Completed Trade Record */}
      {tradeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[22px] border border-[#ECEEF2] dark:border-slate-800 p-5 sm:p-6 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#FEF3F2] dark:bg-rose-950/60 border border-[#FECDCA] dark:border-rose-900/50 flex items-center justify-center text-[#F04438] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-extrabold text-[#14151A] dark:text-slate-100">
                  Delete Trade Record?
                </h3>
                <p className="text-[12px] text-[#8B8D98] font-semibold">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-[#FAFAFC] dark:bg-slate-800/60 rounded-[14px] p-3.5 border border-[#ECEEF2] dark:border-slate-700/60 mb-4 space-y-2 text-[12px] font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#8B8D98]">Symbol:</span>
                <span className="font-extrabold text-[#14151A] dark:text-slate-100 text-[13px]">{tradeToDelete.item.symbol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8B8D98]">Strategy:</span>
                <span className="font-semibold text-[#56586A] dark:text-slate-300">{tradeToDelete.item.strategyName || "Swing setup"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8B8D98]">Entry &rarr; Exit:</span>
                <span className="font-bold text-[#14151A] dark:text-slate-200">
                  {formatINR(tradeToDelete.item.buyPrice)} &rarr; {formatINR(tradeToDelete.item.sellPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#ECEEF2] dark:border-slate-700/50">
                <span className="text-[#8B8D98]">Realized P&L:</span>
                <span className={`font-bold ${(tradeToDelete.item.pnl ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#F04438]"}`}>
                  {(tradeToDelete.item.pnl ?? 0) >= 0 ? "+" : ""}{formatINR(tradeToDelete.item.pnl)} ({(tradeToDelete.item.pnlPct ?? 0) >= 0 ? "+" : ""}{(tradeToDelete.item.pnlPct ?? 0).toFixed(2)}%)
                </span>
              </div>
            </div>

            <p className="text-[11.5px] text-[#8B8D98] font-semibold mb-5 leading-relaxed">
              Deleting this record will permanently remove it from your history and automatically update your total Realized P&L, Win Rate, and ROI metrics.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setTradeToDelete(null)}
                className="px-4 py-2 rounded-[10px] bg-[#F1F2F5] dark:bg-slate-800 text-[#56586A] dark:text-slate-300 font-bold text-[12.5px] hover:bg-[#E5E7EB] dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onDeleteCompletedTrade) {
                    onDeleteCompletedTrade(tradeToDelete.item.tradeId || tradeToDelete.index);
                  }
                  setTradeToDelete(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#F04438] hover:bg-[#D92D20] text-white font-bold text-[12.5px] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
