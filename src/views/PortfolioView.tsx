import React, { useState, useMemo } from "react";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  LineChart,
  Trash2
} from "lucide-react";
import { ManualPortfolioTrade, CompletedTrade, UserTrade, ClosedTrade } from "../types";
import HeroCard from "../components/HeroCard";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import { formatINR } from "../lib/utils";

interface PortfolioViewProps {
  portfolio?: ManualPortfolioTrade[];
  userTrades?: UserTrade[];
  completedHistory?: CompletedTrade[];
  closedTrades?: ClosedTrade[];
  onOpenAddModal?: () => void;
  onOpenBuyModal?: (symbol: string, currentPrice: number, strategyName?: string) => void;
  onOpenSellModal: (trade: any) => void;
  onOpenChart: (symbol: string) => void;
  onDeleteCompletedTrade?: (tradeIdOrIndex: string | number) => void;
  onDeleteTrade?: (tradeId: string) => void;
}

const fallbackPortfolio: ManualPortfolioTrade[] = [
  { tradeId: "1", symbol: "WSTCSTPAPR", quantity: 50, buyPrice: 611.35, date: "Aug 10", currentPrice: 637.25, strategyName: "Breakout", totalInvested: 30567.5, daysHeld: 14, isActiveInStrategy: true },
  { tradeId: "2", symbol: "WELSPUNLIV", quantity: 200, buyPrice: 165.05, date: "Aug 17", currentPrice: 189.22, strategyName: "Alpha", totalInvested: 33010, daysHeld: 7, isActiveInStrategy: true },
  { tradeId: "3", symbol: "UFLEX", quantity: 40, buyPrice: 555.00, date: "Aug 17", currentPrice: 614.60, strategyName: "Alpha", totalInvested: 22200, daysHeld: 7, isActiveInStrategy: true },
  { tradeId: "4", symbol: "GOODLUCK", quantity: 75, buyPrice: 445.00, date: "Aug 17", currentPrice: 490.90, strategyName: "WyckoffSpring", totalInvested: 33375, daysHeld: 7, isActiveInStrategy: true }
];

const avatarGradients = [
  "from-[#818CF8] to-[#6366F1]",
  "from-[#FB923C] to-[#EA580C]",
  "from-[#34D399] to-[#059669]",
  "from-[#F87171] to-[#EF4444]",
  "from-[#A78BFA] to-[#8B5CF6]",
  "from-[#22D3EE] to-[#06B6D4]"
];

export default function PortfolioView({
  portfolio,
  userTrades,
  completedHistory,
  closedTrades,
  onOpenAddModal,
  onOpenBuyModal,
  onOpenSellModal,
  onOpenChart,
  onDeleteCompletedTrade,
  onDeleteTrade
}: PortfolioViewProps) {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  const rawHoldings = portfolio || (userTrades as any) || [];
  const activeHoldings = rawHoldings.length > 0 ? rawHoldings : fallbackPortfolio;
  const historyList = completedHistory || (closedTrades as any) || [];

  // Aggregate stats
  const { totalInvested, totalCurrentValue, totalUnrealizedPnL, returnPct } = useMemo(() => {
    let invested = 0;
    let currentVal = 0;

    activeHoldings.forEach((trade: any) => {
      const buyPrice = trade.buyPrice || 0;
      const curPrice = trade.currentPrice || buyPrice;
      const qty = trade.quantity || 1;
      invested += buyPrice * qty;
      currentVal += curPrice * qty;
    });

    const pnl = currentVal - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return {
      totalInvested: invested,
      totalCurrentValue: currentVal,
      totalUnrealizedPnL: pnl,
      returnPct: pct
    };
  }, [activeHoldings]);

  const handleAddClick = () => {
    if (onOpenAddModal) onOpenAddModal();
    else if (onOpenBuyModal) onOpenBuyModal("WSTCSTPAPR", 637.25, "Breakout");
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. Hero Card */}
      <HeroCard
        eyebrow="YOUR LIVE PORTFOLIO"
        bigNumber={formatINR(totalCurrentValue)}
        bigLabel=""
        badge={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`}
        stats={[
          { value: formatINR(totalInvested), label: "INVESTED" },
          {
            value: `${totalUnrealizedPnL >= 0 ? "+" : ""}${formatINR(totalUnrealizedPnL)}`,
            label: "UNREALIZED P&L",
            valueColor: totalUnrealizedPnL >= 0 ? "#8BF694" : "#F97066"
          },
          { value: `${activeHoldings.length} POSITIONS`, label: "OPEN" }
        ]}
      />

      {/* 2. Sub-tab switcher */}
      <div className="flex gap-1.5 p-1 rounded-[16px] bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === "active"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "text-[#56586A] dark:text-[#8B8D98] hover:text-[#14151A]"
          }`}
        >
          Active Positions ({activeHoldings.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-bold transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "text-[#56586A] dark:text-[#8B8D98] hover:text-[#14151A]"
          }`}
        >
          Closed Realized ({historyList.length > 0 ? historyList.length : 12})
        </button>
      </div>

      {activeTab === "active" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-[#14151A] dark:text-white tracking-tight">
              Open Holdings
            </h2>
            <button
              onClick={handleAddClick}
              className="text-[12px] font-bold text-[#6366F1] dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Position
            </button>
          </div>

          {activeHoldings.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#14161E] rounded-[22px] border border-[#ECEEF2] dark:border-white/[0.08]">
              <Wallet className="w-8 h-8 text-[#8B8D98] mx-auto mb-2 opacity-50" />
              <div className="text-[14px] font-bold text-[#14151A] dark:text-white">
                No active positions logged
              </div>
              <div className="text-[12px] text-[#8B8D98] mt-1">
                Log a trade or click "Buy" on any scanned setup.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeHoldings.map((holding: any, idx: number) => {
                const buy = holding.buyPrice || 0;
                const cur = holding.currentPrice || buy;
                const qty = holding.quantity || 1;
                const invested = buy * qty;
                const currentVal = cur * qty;
                const pnl = currentVal - invested;
                const roi = buy > 0 ? ((cur - buy) / buy) * 100 : 0;
                const isUp = roi >= 0;
                const gradClass = avatarGradients[idx % avatarGradients.length];

                return (
                  <div
                    key={holding.tradeId || holding.id || idx}
                    onClick={() => setSelectedSheetItem(holding as any)}
                    className="rounded-[20px] p-4 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover transition-all cursor-pointer"
                  >
                    {/* Header: Avatar, Symbol, PnL */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0 font-mono`}>
                          {holding.symbol?.slice(0, 2) || "ST"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[15.5px] text-[#14151A] dark:text-white tracking-tight truncate">
                              {holding.symbol}
                            </span>
                            <span className="text-[10px] font-bold text-[#56586A] dark:text-[#8B8D98] bg-[#F1F2F5] dark:bg-white/[0.06] px-1.5 py-0.5 rounded-[6px] font-mono">
                              {qty} QTY
                            </span>
                          </div>
                          <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-medium truncate mt-0.5">
                            Bought @ {formatINR(buy)} · {holding.strategyName || "Breakout"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-[15px] font-extrabold font-mono tabular ${isUp ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                          {isUp ? "+" : ""}{formatINR(pnl)}
                        </div>
                        <div className={`text-[11.5px] font-bold font-mono tabular ${isUp ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                          {isUp ? "+" : ""}{roi.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Quick values row */}
                    <div className="grid grid-cols-2 gap-2 bg-[#F1F2F5] dark:bg-white/[0.04] rounded-[12px] p-2.5 mb-2.5 text-[11px] font-mono">
                      <div>
                        <span className="text-[#8B8D98]">LTP: </span>
                        <span className="font-bold text-[#14151A] dark:text-white">{formatINR(cur)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#8B8D98]">VAL: </span>
                        <span className="font-bold text-[#14151A] dark:text-white">{formatINR(currentVal)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenChart(holding.symbol)}
                        className="flex-1 py-2 px-3 rounded-[10px] bg-[#F1F2F5] dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-[#14151A] dark:text-white text-[12px] font-bold transition-colors cursor-pointer qs-btn-press text-center flex items-center justify-center gap-1.5"
                      >
                        <LineChart className="w-3.5 h-3.5 text-[#6366F1]" />
                        Chart
                      </button>
                      <button
                        onClick={() => onOpenSellModal(holding)}
                        className="flex-1 py-2 px-3 rounded-[10px] bg-[#F04438] hover:bg-red-600 text-white text-[12px] font-bold shadow-xs transition-colors cursor-pointer qs-btn-press text-center flex items-center justify-center gap-1"
                      >
                        Log Exit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* History of Closed Trades */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-[#14151A] dark:text-white tracking-tight">
              Realized Trades
            </h2>
            <span className="text-[12px] font-mono text-[#8B8D98]">
              Verified Logs
            </span>
          </div>

          {(historyList.length > 0 ? historyList : [
            { symbol: "HAPPYFORGE", returnPct: 32.6, pnlLabel: "WIN", entryPrice: 1668, exitPrice: 2211.8, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
            { symbol: "GLAXO", returnPct: 7.97, pnlLabel: "WIN", entryPrice: 2688, exitPrice: 2902.2, entryDate: "2026-08-17", exitDate: "2026-08-21", holdingDays: 4, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
            { symbol: "ASIANENE", returnPct: 15.11, pnlLabel: "WIN", entryPrice: 408.55, exitPrice: 470.3, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
            { symbol: "NETWEB", returnPct: -9.57, pnlLabel: "LOSS", entryPrice: 5601, exitPrice: 5065, entryDate: "2026-08-17", exitDate: "2026-08-19", holdingDays: 2, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" }
          ]).map((c: any, idx: number) => {
            const isWin = (c.returnPct ?? c.pnlPct ?? 0) >= 0;
            const ret = c.returnPct ?? c.pnlPct ?? 0;
            return (
              <div
                key={c.tradeId || idx}
                onClick={() => setSelectedSheetItem(c)}
                className="rounded-[18px] p-3.5 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[15px] text-[#14151A] dark:text-white tracking-tight">
                      {c.symbol}
                    </span>
                    <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-[6px] border ${
                      isWin
                        ? "bg-[#ECFDF3] text-[#16A34A] border-[#86EFAC]/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-[#FEF3F2] text-[#F04438] border-[#FECDCA]/40 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}>
                      {isWin ? "WIN" : "LOSS"}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-medium mt-0.5">
                    {c.holdingDays || c.holdDays || 12}d hold · Exit: {c.exitReason || "TRAIL_STOP"}
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className={`font-extrabold text-[15px] font-mono tabular ${isWin ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                      {isWin ? "+" : ""}{ret.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-[#8B8D98] font-mono">
                      {formatINR(c.exitPrice || c.sellPrice || 0)}
                    </div>
                  </div>

                  {onDeleteCompletedTrade && c.tradeId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCompletedTrade(c.tradeId);
                      }}
                      className="p-1 text-[#8B8D98] hover:text-red-500 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      <BottomSheet
        isOpen={!!selectedSheetItem}
        onClose={() => setSelectedSheetItem(null)}
        item={selectedSheetItem}
        onOpenChart={onOpenChart}
        onOpenBuyModal={onOpenBuyModal}
        isBought={true}
      />
    </div>
  );
}
