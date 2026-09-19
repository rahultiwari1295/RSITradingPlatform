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
import { ManualPortfolioTrade, CompletedTrade, UserTrade, ClosedTrade, InTradeTrade } from "../types";
import HeroCard from "../components/HeroCard";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import { formatINR } from "../lib/utils";

interface PortfolioViewProps {
  portfolio?: ManualPortfolioTrade[];
  userTrades?: UserTrade[];
  completedHistory?: CompletedTrade[];
  closedTrades?: ClosedTrade[];
  inTradeTrades?: InTradeTrade[];
  onOpenAddModal?: () => void;
  onOpenBuyModal?: (symbol: string, currentPrice: number, strategyName?: string) => void;
  onOpenSellModal: (trade: any) => void;
  onOpenChart: (symbol: string) => void;
  onDeleteCompletedTrade?: (tradeIdOrIndex: string | number) => void;
  onDeleteTrade?: (tradeId: string) => void;
  onSelectStock?: (stock: any) => void;
  onBack?: () => void;
}

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
  inTradeTrades,
  onOpenAddModal,
  onOpenBuyModal,
  onOpenSellModal,
  onOpenChart,
  onDeleteCompletedTrade,
  onDeleteTrade,
  onSelectStock,
  onBack,
}: PortfolioViewProps) {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  const rawHoldings = portfolio || (userTrades as any) || [];
  const activeHoldings = rawHoldings;
  const historyList = completedHistory || (closedTrades as any) || [];

  // Lookup map of active in-trade signals
  const activeSignalMap = useMemo(() => {
    const map = new Map<string, InTradeTrade>();
    (inTradeTrades || []).forEach(t => {
      if (t.symbol) {
        map.set(t.symbol.toUpperCase().trim(), t);
      }
    });
    return map;
  }, [inTradeTrades]);

  // Aggregate stats with live LTP sync from active signals
  const { totalInvested, totalCurrentValue, totalUnrealizedPnL, returnPct } = useMemo(() => {
    let invested = 0;
    let currentVal = 0;

    activeHoldings.forEach((trade: any) => {
      const sym = (trade.symbol || "").toUpperCase().trim();
      const activeMatch = activeSignalMap.get(sym);
      const buyPrice = Number(trade.buyPrice || 0);
      const qty = Number(trade.quantity || 1);
      invested += buyPrice * qty;

      if (activeMatch) {
        const curPrice = Number(activeMatch.currentPrice || activeMatch.entryPrice || trade.currentPrice || buyPrice);
        currentVal += curPrice * qty;
      } else {
        const curPrice = Number(trade.currentPrice || buyPrice);
        currentVal += curPrice * qty;
      }
    });

    const pnl = currentVal - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return {
      totalInvested: invested,
      totalCurrentValue: currentVal,
      totalUnrealizedPnL: pnl,
      returnPct: pct
    };
  }, [activeHoldings, activeSignalMap]);

  const handleAddClick = () => {
    if (onOpenAddModal) onOpenAddModal();
    else if (onOpenBuyModal) onOpenBuyModal("WSTCSTPAPR", 637.25, "Breakout");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Back Button */}
      {onBack && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--s2)",
              border: "1px solid var(--line)",
              color: "var(--accent)",
              padding: "6px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Back to Home
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Paper Portfolio Desk
          </span>
        </div>
      )}
      
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
          Closed Realized ({historyList.length})
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
                Log a trade or click "Log Paper Trade" on any scanned setup.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeHoldings.map((holding: any, idx: number) => {
                const sym = (holding.symbol || "").toUpperCase().trim();
                const activeMatch = activeSignalMap.get(sym);
                const isSignalActive = !!activeMatch;

                const buy = Number(holding.buyPrice || 0);
                const qty = Number(holding.quantity || 1);
                const invested = buy * qty;

                // Sync live LTP directly from active signals page
                const cur = isSignalActive
                  ? Number(activeMatch.currentPrice || activeMatch.entryPrice || holding.currentPrice || buy)
                  : undefined;

                const currentVal = cur !== undefined ? cur * qty : undefined;
                const pnl = cur !== undefined ? currentVal! - invested : undefined;
                const roi = (cur !== undefined && buy > 0) ? ((cur - buy) / buy) * 100 : undefined;
                const isUp = roi !== undefined ? roi >= 0 : false;
                const gradClass = avatarGradients[idx % avatarGradients.length];

                const handleCardClick = () => {
                  const itemData = {
                    ...holding,
                    symbol: sym,
                    currentPrice: cur || holding.currentPrice || buy,
                    entryPrice: buy,
                    strategyName: activeMatch?.strategyName || holding.strategyName
                  };
                  if (onSelectStock) {
                    onSelectStock(itemData);
                  } else {
                    setSelectedSheetItem(itemData as any);
                  }
                };

                return (
                  <div
                    key={holding.tradeId || holding.id || idx}
                    onClick={handleCardClick}
                    className="rounded-[22px] p-4 sm:p-5 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover transition-all cursor-pointer"
                  >
                    {/* Top Header: Unclipped Stock Symbol, Badges & Return */}
                    <div className="flex items-start justify-between gap-3 mb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-[14px] bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-black text-[14px] shadow-xs shrink-0 font-mono tracking-wider`}>
                          {sym.slice(0, 2) || "ST"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Stock name is boldly emphasized and NEVER truncated */}
                            <span className="font-mono font-black text-[17px] sm:text-[18px] text-[#14151A] dark:text-white tracking-tight shrink-0">
                              {sym}
                            </span>
                            <span className="text-[10px] font-bold text-[#56586A] dark:text-[#8B8D98] bg-[#F1F2F5] dark:bg-white/[0.08] px-2 py-0.5 rounded-[6px] font-mono shrink-0">
                              {qty} QTY
                            </span>
                            {isSignalActive ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-[5px] font-mono shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-[5px] font-mono shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-semibold mt-1">
                            {activeMatch?.strategyName || holding.strategyName || "Institutional Momentum"}
                          </div>
                        </div>
                      </div>

                      {/* Right Header: Live PnL or Exit Required Notice */}
                      <div className="text-right shrink-0">
                        {isSignalActive && pnl !== undefined && roi !== undefined ? (
                          <>
                            <div className={`text-[16px] font-black font-mono tabular ${isUp ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                              {isUp ? "+" : ""}{formatINR(pnl)}
                            </div>
                            <div className={`text-[12px] font-bold font-mono tabular ${isUp ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                              {isUp ? "+" : ""}{roi.toFixed(2)}%
                            </div>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold font-mono uppercase tracking-wide">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            Exit Needed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Financials / Pricing Grid: Clear, unclipped figures */}
                    <div className="grid grid-cols-3 gap-2 bg-[#F6F7F9] dark:bg-white/[0.03] rounded-[14px] p-3 mb-3 text-[11px] font-mono border border-slate-200/60 dark:border-white/[0.04]">
                      <div>
                        <span className="text-[#8B8D98] block text-[9.5px] uppercase font-bold">Bought Price</span>
                        <span className="font-extrabold text-[#14151A] dark:text-white mt-0.5 block">{formatINR(buy)}</span>
                      </div>
                      <div>
                        <span className="text-[#8B8D98] block text-[9.5px] uppercase font-bold">Invested</span>
                        <span className="font-extrabold text-[#14151A] dark:text-white mt-0.5 block">{formatINR(invested)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#8B8D98] block text-[9.5px] uppercase font-bold">
                          {isSignalActive ? "Live LTP" : "Status"}
                        </span>
                        {isSignalActive && cur !== undefined ? (
                          <span className="font-extrabold text-[#14151A] dark:text-white mt-0.5 block">{formatINR(cur)}</span>
                        ) : (
                          <span className="font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block">Signal Inactive</span>
                        )}
                      </div>
                    </div>

                    {/* Prominent, readable warning banner when inactive */}
                    {!isSignalActive && (
                      <div className="rounded-[14px] p-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 mb-3 text-xs leading-relaxed">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Signal is no more in active state.</span> Please log an exit to close your trade and protect capital.
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenChart(holding.symbol)}
                        className="flex-1 py-2.5 px-3 rounded-[12px] bg-[#F1F2F5] dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-[#14151A] dark:text-white text-[12px] font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        <LineChart className="w-3.5 h-3.5 text-[#6366F1]" />
                        Chart
                      </button>
                      <button
                        onClick={() => onOpenSellModal({
                          ...holding,
                          symbol: sym,
                          currentPrice: cur !== undefined ? cur : (holding.currentPrice || buy),
                          buyPrice: buy,
                          quantity: qty
                        })}
                        className={`flex-1 py-2.5 px-3 rounded-[12px] text-white text-[12px] font-extrabold shadow-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                          !isSignalActive
                            ? "bg-[#F04438] hover:bg-red-700 ring-2 ring-rose-500/20"
                            : "bg-[#F04438] hover:bg-red-600"
                        }`}
                      >
                        {!isSignalActive ? "Log Exit (Close Trade)" : "Log Exit"}
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
              {historyList.length} Recorded
            </span>
          </div>

          {historyList.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#14161E] rounded-[22px] border border-[#ECEEF2] dark:border-white/[0.08]">
              <Clock className="w-8 h-8 text-[#8B8D98] mx-auto mb-2 opacity-50" />
              <div className="text-[14px] font-bold text-[#14151A] dark:text-white">
                No closed paper trades yet
              </div>
              <div className="text-[12px] text-[#8B8D98] mt-1">
                When you exit an open position, your entered close price and realized P&L will be saved here.
              </div>
            </div>
          ) : (
            historyList.map((c: any, idx: number) => {
              const ret = c.returnPct ?? c.pnlPct ?? 0;
              const isWin = ret >= 0;
              const exitP = c.sellPrice || c.exitPrice || 0;
              const buyP = c.buyPrice || c.entryPrice || 0;
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
                      {c.quantity && (
                        <span className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-[5px]">
                          {c.quantity} Qty
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-medium mt-0.5">
                      {c.sellDate ? `Exited ${c.sellDate}` : c.exitDate ? `Exited ${c.exitDate}` : "Realized"}
                      {buyP > 0 && ` · Entry: ${formatINR(buyP)}`}
                      {c.holdDays || c.holdingDays ? ` · ${c.holdDays || c.holdingDays}d hold` : ""}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <div>
                      <div className={`font-extrabold text-[15px] font-mono tabular ${isWin ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                        {isWin ? "+" : ""}{ret.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-[#8B8D98] font-mono">
                        Exit: {formatINR(exitP)}
                      </div>
                      {c.pnl !== undefined && (
                        <div className={`text-[10px] font-mono font-bold ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {c.pnl >= 0 ? "+" : ""}{formatINR(c.pnl)}
                        </div>
                      )}
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
            })
          )}
        </div>
      )}

      {/* Bottom Sheet Modal */}
      <BottomSheet
        isOpen={!!selectedSheetItem}
        onClose={() => setSelectedSheetItem(null)}
        item={selectedSheetItem}
        onOpenChart={onOpenChart}
        onOpenBuyModal={onOpenBuyModal}
        onOpenSellModal={onOpenSellModal ? (item) => {
          onOpenSellModal({
            ...item,
            buyPrice: item.entryPrice || item.buyPrice,
            quantity: item.quantity || item.shares || 1
          });
        } : undefined}
        isBought={true}
      />
    </div>
  );
}
