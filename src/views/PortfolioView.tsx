import React, { useState, useMemo } from "react";
import {
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  Trophy,
  SlidersHorizontal,
  Trash2,
  PieChart,
  Plus
} from "lucide-react";
import HeroCard from "../components/HeroCard";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import { ManualPortfolioTrade, CompletedTrade } from "../types";
import { formatINR } from "../lib/utils";

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
  const [tradeToDelete, setTradeToDelete] = useState<{ item: CompletedTrade; index: number } | null>(null);
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  // Partition active holdings into needs-attention (untracked) vs healthy
  const untrackedTrades = portfolio.filter(p => !p.isActiveInStrategy);
  const healthyTrades = portfolio.filter(p => p.isActiveInStrategy);

  const totalActiveCount = portfolio.length;
  const trackedCount = healthyTrades.length;
  const untrackedCount = untrackedTrades.length;

  const totalInvested = portfolio.reduce((acc, p) => acc + (p.totalInvested || ((p.buyPrice || 0) * (p.quantity || 1))), 0);

  // Capital Allocation by Strategy
  const capitalAllocation = useMemo(() => {
    if (totalInvested === 0) return { totalInvested: 0, strategies: [] };

    const map: Record<string, number> = {};
    portfolio.forEach(p => {
      const strat = p.strategyName || "Breakout";
      const amt = p.totalInvested || ((p.buyPrice || 0) * (p.quantity || 1));
      map[strat] = (map[strat] || 0) + amt;
    });

    const colors = ["#0A84FF", "#30D158", "#FF9500", "#5E5CE6", "#FF375F", "#40C8E0"];
    const strategies = Object.entries(map).map(([name, amount], idx) => {
      const pct = (amount / totalInvested) * 100;
      return {
        name,
        amount,
        pct,
        color: colors[idx % colors.length]
      };
    }).sort((a, b) => b.amount - a.amount);

    return { totalInvested, strategies };
  }, [portfolio, totalInvested]);

  // Historical metrics
  const historyMetrics = useMemo(() => {
    const totalTrades = completedHistory.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winningTrades: [],
        losingTrades: [],
        winRate: 0,
        totalRealizedPnl: 0,
        totalInvested: 0,
        avgReturnPct: 0
      };
    }

    const winningTrades = completedHistory.filter(t => (t.pnl ?? 0) > 0);
    const losingTrades = completedHistory.filter(t => (t.pnl ?? 0) < 0);
    const winRate = (winningTrades.length / totalTrades) * 100;
    const totalRealizedPnl = completedHistory.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
    const totalInv = completedHistory.reduce((acc, t) => acc + (t.totalInvested || ((t.buyPrice ?? 0) * (t.quantity ?? 1))), 0);
    const avgReturnPct = completedHistory.reduce((acc, t) => acc + (t.pnlPct ?? 0), 0) / totalTrades;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalRealizedPnl,
      totalInvested: totalInv,
      avgReturnPct
    };
  }, [completedHistory]);

  const filteredHistory = useMemo(() => {
    return completedHistory.filter(item => {
      if (historyFilter === "WINNERS" && (item.pnl ?? 0) <= 0) return false;
      if (historyFilter === "LOSERS" && (item.pnl ?? 0) >= 0) return false;
      if (historySearch) {
        const q = historySearch.toLowerCase();
        return item.symbol.toLowerCase().includes(q) || (item.strategyName && item.strategyName.toLowerCase().includes(q));
      }
      return true;
    });
  }, [completedHistory, historyFilter, historySearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Sub-Tab Navigator & Action Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex gap-1.5 p-1 rounded-[16px] bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-xs">
          <button
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-extrabold transition-all cursor-pointer ${
              !showHistory
                ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] shadow-xs"
                : "text-[#6B7079] dark:text-[#98989F] hover:text-[#0B0D12]"
            }`}
          >
            Active Holdings ({totalActiveCount})
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-extrabold transition-all cursor-pointer ${
              showHistory
                ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] shadow-xs"
                : "text-[#6B7079] dark:text-[#98989F] hover:text-[#0B0D12]"
            }`}
          >
            Closed History ({completedHistory.length})
          </button>
        </div>

        {!showHistory && (
          <button
            onClick={onOpenAddModal}
            className="w-10 h-10 rounded-[14px] bg-[#0A84FF] hover:bg-[#0071E3] text-white flex items-center justify-center font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            title="Add Position"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {showHistory ? (
        /* Trade History View */
        <div className="space-y-5">
          <HeroCard
            eyebrow="REALIZED PERFORMANCE"
            bigNumber={formatINR(historyMetrics.totalRealizedPnl)}
            bigLabel="realized P&L"
            badge={`${historyMetrics.winRate.toFixed(0)}% Win Rate`}
            stats={[
              {
                value: `${historyMetrics.winningTrades.length}W · ${historyMetrics.losingTrades.length}L`,
                label: "WIN / LOSS",
                valueColor: "#8BF694"
              },
              {
                value: `${historyMetrics.avgReturnPct >= 0 ? "+" : ""}${historyMetrics.avgReturnPct.toFixed(1)}%`,
                label: "AVG RETURN",
                valueColor: historyMetrics.avgReturnPct >= 0 ? "#8BF694" : "#F97066"
              },
              {
                value: formatINR(historyMetrics.totalInvested),
                label: "DEPLOYED",
                valueColor: "#FFFFFF"
              }
            ]}
          />

          {/* Search & Filter */}
          <div className="flex gap-2">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="🔍 Search closed trade..."
              className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] rounded-[16px] px-3.5 py-2 text-[13px] text-[#0B0D12] dark:text-[#F5F5F7] placeholder-[#A2A6AE] font-semibold outline-hidden focus:border-[#0A84FF] shadow-xs"
            />
            <div className="flex gap-1">
              {(["ALL", "WINNERS", "LOSERS"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryFilter(tab)}
                  className={`px-3 py-1.5 rounded-[14px] text-[12px] font-extrabold border transition-all cursor-pointer ${
                    historyFilter === tab
                      ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                      : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)]"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab === "WINNERS" ? "Wins" : "Losses"}
                </button>
              ))}
            </div>
          </div>

          {/* List of Closed Trades */}
          <div className="space-y-2.5">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#1C1C1E] rounded-[20px] border border-[rgba(60,60,67,0.10)] text-[#A2A6AE] text-[13px] font-semibold">
                No closed trades found.
              </div>
            ) : (
              filteredHistory.map((item, idx) => {
                const isProfit = (item.pnl ?? 0) >= 0;
                return (
                  <div
                    key={`${item.tradeId || item.symbol}-${idx}`}
                    onClick={() => setSelectedSheetItem(item)}
                    className="rounded-[20px] p-3.5 sm:p-4 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(16,24,40,0.10)] transition-all cursor-pointer flex items-center gap-3.5 qs-card-hover"
                  >
                    <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-extrabold text-[15px] text-white shrink-0 ${
                      isProfit ? "avatar-buy" : "avatar-avoid"
                    }`}>
                      {item.symbol?.slice(0, 1) || "S"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-[16px] text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight truncate">
                        {item.symbol}
                      </div>
                      <div className="text-[12px] text-[#6B7079] dark:text-[#98989F] font-semibold truncate mt-0.5">
                        {item.strategyName || "Breakout"} · {item.quantity} sh · {item.holdDays || 10}d
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-extrabold text-[15.5px] tabular ${isProfit ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                        {isProfit ? "+" : ""}{formatINR(item.pnl)}
                      </div>
                      <div className="text-[11px] font-semibold text-[#A2A6AE] dark:text-[#636366] tabular mt-0.5">
                        {item.pnlPct >= 0 ? "+" : ""}{(item.pnlPct ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Active Holdings View */
        <div className="space-y-5">
          {/* Hero Card */}
          <HeroCard
            eyebrow="WALLET & ALLOCATION"
            bigNumber={formatINR(totalInvested)}
            bigLabel="invested capital"
            badge={`${totalActiveCount} Stocks`}
            stats={[
              { value: totalActiveCount, label: "TOTAL ASSETS" },
              { value: trackedCount, label: "SYSTEM TRACKED", valueColor: "#8BF694" },
              { value: untrackedCount, label: "NOT TRACKED", valueColor: untrackedCount > 0 ? "#F97066" : "#FFFFFF" }
            ]}
          />

          {/* Capital Allocation Segment Bar */}
          {capitalAllocation.strategies.length > 0 && (
            <div className="rounded-[22px] p-4 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-xs">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[13px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7]">
                  Capital by strategy
                </span>
                <span className="text-[11.5px] font-mono font-extrabold text-[#6B7079] dark:text-[#98989F]">
                  {formatINR(capitalAllocation.totalInvested)}
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-[rgba(60,60,67,0.08)] dark:bg-[rgba(255,255,255,0.07)] overflow-hidden flex mb-2.5">
                {capitalAllocation.strategies.map((s) => (
                  <div
                    key={s.name}
                    className="h-full transition-all"
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {capitalAllocation.strategies.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-[#F2F3F7] dark:bg-[#2C2C2E] text-[11px] font-bold"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[#0B0D12] dark:text-[#F5F5F7]">{s.name}</span>
                    <span className="text-[#0A84FF] tabular">{s.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Needs Exit Alert */}
          {untrackedCount > 0 && (
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-[18px] bg-[#FFEBEA] dark:bg-[#3A1719] border border-[rgba(255,69,58,0.25)]">
                <div className="text-[13.5px] font-extrabold text-[#E0342A] dark:text-[#FF453A]">
                  ⚠️ Strategy moved on from {untrackedCount} trades
                </div>
                <div className="text-[11.5px] text-[#A8201A] dark:text-[#FF6961] font-semibold mt-0.5">
                  Review and mark as sold to balance your wallet
                </div>
              </div>

              {untrackedTrades.map((pos) => {
                const invested = pos.totalInvested || ((pos.buyPrice || 0) * (pos.quantity || 1));
                return (
                  <div
                    key={pos.tradeId || pos.symbol}
                    className="rounded-[20px] p-3.5 sm:p-4 bg-white dark:bg-[#1C1C1E] border border-[#FF9500]/30 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-[14px] avatar-avoid flex items-center justify-center font-extrabold text-[15px] text-white">
                        {pos.symbol?.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-extrabold text-[16px] text-[#0B0D12] dark:text-[#F5F5F7]">
                          {pos.symbol}
                        </div>
                        <div className="text-[11.5px] text-[#6B7079] dark:text-[#98989F] font-semibold mt-0.5">
                          {pos.quantity || 1} shares · {formatINR(invested)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenSellModal(pos)}
                      className="px-3.5 py-1.5 rounded-[12px] bg-[#FF453A] text-white text-[12px] font-extrabold shadow-xs hover:bg-[#d9382d] active:scale-95 transition-all cursor-pointer"
                    >
                      Mark Sold
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section: Actively Tracked Holdings */}
          <div className="space-y-2.5">
            <h2 className="text-[17px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight">
              Open Positions ({trackedCount})
            </h2>

            {trackedCount === 0 && untrackedCount === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#1C1C1E] rounded-[22px] border border-[rgba(60,60,67,0.10)] text-[#A2A6AE] text-[13px] font-semibold">
                No active positions in your portfolio yet.
              </div>
            ) : (
              healthyTrades.map((pos, idx) => {
                const invested = pos.totalInvested || ((pos.buyPrice || 0) * (pos.quantity || 1));
                return (
                  <div
                    key={pos.tradeId || pos.symbol}
                    onClick={() => setSelectedSheetItem(pos)}
                    className="rounded-[20px] p-3.5 sm:p-4 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(16,24,40,0.10)] transition-all cursor-pointer flex items-center justify-between gap-3 qs-card-hover"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-[14px] avatar-buy flex items-center justify-center font-extrabold text-[15px] text-white shrink-0">
                        {pos.symbol?.slice(0, 1) || "S"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-[16px] text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight truncate">
                          {pos.symbol}
                        </div>
                        <div className="text-[12px] text-[#6B7079] dark:text-[#98989F] font-semibold truncate mt-0.5">
                          {pos.strategyName || "Breakout"} · {pos.quantity || 1} shares · {pos.daysHeld || 14}d
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <div className="font-extrabold text-[15.5px] text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                          {formatINR(invested)}
                        </div>
                        <div className="text-[11px] font-semibold text-[#A2A6AE] dark:text-[#6366F1] tabular mt-0.5">
                          @{formatINR(pos.buyPrice || 0)}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSellModal(pos);
                        }}
                        className="px-3 py-1.5 rounded-[12px] bg-[#F2F3F7] dark:bg-[#2C2C2E] hover:bg-[#E5E6EB] text-[#0B0D12] dark:text-[#F5F5F7] text-[12px] font-extrabold transition-all cursor-pointer"
                      >
                        Exit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Interactive Bottom Sheet Detail */}
      <BottomSheet
        isOpen={!!selectedSheetItem}
        onClose={() => setSelectedSheetItem(null)}
        item={selectedSheetItem}
        onOpenChart={onOpenChart}
        isBought={true}
      />
    </div>
  );
}
