import React, { useState, useMemo } from "react";
import { History, LayoutGrid, Table } from "lucide-react";
import { ClosedTrade } from "../../types";
import QuantSyncAlertCard from "./QuantSyncAlertCard";
import StockDetailPage from "./StockDetailPage";
import { BottomSheetItem } from "../BottomSheet";

interface ClosedTradesLedgerProps {
  closedTrades: ClosedTrade[];
  onOpenChart: (symbol: string) => void;
  onSelectStock?: (item: BottomSheetItem, allItems: BottomSheetItem[], index: number) => void;
}

export default function ClosedTradesLedger({
  closedTrades = [],
  onOpenChart,
  onSelectStock,
}: ClosedTradesLedgerProps) {
  const [filter, setFilter] = useState<"ALL" | "WIN" | "LOSS">("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  // Accurately compute return percentage and win/loss from entryPrice & exitPrice
  const sanitizedTrades = useMemo(() => {
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
      const isWin = ret >= 0;
      return {
        ...t,
        entryPrice: ep,
        exitPrice: xp,
        returnPct: ret,
        isWin,
        pnlLabel: isWin ? "WIN" : "LOSS",
      };
    });
  }, [closedTrades]);

  const winCount = sanitizedTrades.filter((t) => t.isWin).length;
  const lossCount = sanitizedTrades.length - winCount;
  const winRate = sanitizedTrades.length > 0 ? (winCount / sanitizedTrades.length) * 100 : 0;

  const filteredTrades = useMemo(() => {
    return sanitizedTrades.filter((t) => {
      if (filter === "WIN" && !t.isWin) return false;
      if (filter === "LOSS" && t.isWin) return false;
      return true;
    });
  }, [sanitizedTrades, filter]);

  const formatClosedTradeToSheetItem = (trade: any): BottomSheetItem => {
    const ep = Number(trade.entryPrice || 0);
    const xp = Number(trade.exitPrice || 0);
    const ret = Number(trade.returnPct ?? 0);
    const days = trade.holdingDays || trade.holdDays || 1;

    return {
      ...trade,
      symbol: trade.symbol,
      strategyName: trade.strategyName || "INSTITUTIONAL POCKET PIVOT · SLEEVE 2",
      entryDate: trade.entryDate,
      exitDate: trade.exitDate,
      entryPrice: ep,
      exitPrice: xp,
      currentPrice: xp,
      returnPct: ret,
      currentROI: ret,
      holdingDays: days,
      exitReason: trade.exitReason,
      pnlLabel: ret >= 0 ? "WIN" : "LOSS",
      sector: trade.sector,
      stopLoss: trade.stopLoss,
      targetPrice: trade.targetPrice,
      tradePlan: {
        target1Price: trade.targetPrice,
        stopPrice: trade.stopLoss,
      },
    };
  };

  const handleTradeSelect = (trade: any, index: number) => {
    const item = formatClosedTradeToSheetItem(trade);
    if (onSelectStock) {
      const allItems = filteredTrades.map(formatClosedTradeToSheetItem);
      onSelectStock(item, allItems, index);
    } else {
      setSelectedSheetItem(item);
    }
  };

  if (!closedTrades || closedTrades.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] animate-fade-in">
        <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No closed trades yet</p>
        <p className="text-xs text-slate-400 mt-0.5">Completed exits will appear here automatically.</p>
      </div>
    );
  }

  // Standalone Full Page Stock Dossier View
  if (selectedSheetItem) {
    const currentIndex = filteredTrades.findIndex((t) => t.symbol === selectedSheetItem.symbol);
    return (
      <StockDetailPage
        item={selectedSheetItem}
        sourceListTitle={`Closed Trades (${sanitizedTrades.length} Stocks)`}
        onBack={() => setSelectedSheetItem(null)}
        onPrev={
          currentIndex > 0
            ? () => setSelectedSheetItem(formatClosedTradeToSheetItem(filteredTrades[currentIndex - 1]))
            : undefined
        }
        onNext={
          currentIndex >= 0 && currentIndex < filteredTrades.length - 1
            ? () => setSelectedSheetItem(formatClosedTradeToSheetItem(filteredTrades[currentIndex + 1]))
            : undefined
        }
        currentIndex={currentIndex >= 0 ? currentIndex : undefined}
        totalCount={filteredTrades.length}
        onOpenChart={onOpenChart}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="p-1.5 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/15">
            <History className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Closed Trades
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            {winRate.toFixed(0)}% Win Rate ({winCount}W / {lossCount}L)
          </span>
        </div>

        {/* Controls: Filter & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04]">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === "ALL" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              All ({closedTrades.length})
            </button>
            <button
              onClick={() => setFilter("WIN")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === "WIN" ? "bg-emerald-500 text-white shadow-xs" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Wins ({winCount})
            </button>
            <button
              onClick={() => setFilter("LOSS")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === "LOSS" ? "bg-rose-500 text-white shadow-xs" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Losses ({lossCount})
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.04]">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards View (Super Reactive Grid) */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
          {filteredTrades.map((trade, idx) => {
            const ret = Number(trade.returnPct ?? (trade as any).tradeReturnPercent ?? 0);
            const ep = Number(trade.entryPrice || 0);
            const xp = Number(trade.exitPrice || 0);
            const days = (trade as any).holdingDays || (trade as any).holdDays || 1;

            return (
              <QuantSyncAlertCard
                key={`${trade.symbol}-${idx}`}
                mode="closed"
                symbol={trade.symbol}
                strategyName={trade.strategyName || "INSTITUTIONAL POCKET PIVOT · SLEEVE 2"}
                entryPrice={ep}
                exitOrCurrentPrice={xp}
                returnPct={ret}
                holdingDays={days}
                entryDate={trade.entryDate}
                exitDate={trade.exitDate}
                exitReason={trade.exitReason}
                onOpenChart={onOpenChart}
                onClick={() => handleTradeSelect(trade, idx)}
              />
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-3">Entry</th>
                  <th className="py-3 px-3">Exit</th>
                  <th className="py-3 px-3">Return</th>
                  <th className="py-3 px-3">Exit Reason</th>
                  <th className="py-3 px-3">Days</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredTrades.map((trade, idx) => {
                  const ret = Number(trade.returnPct ?? (trade as any).tradeReturnPercent ?? 0);
                  const isWin = ret >= 0;
                  const ep = Number(trade.entryPrice || 0);
                  const xp = Number(trade.exitPrice || 0);
                  const days = (trade as any).holdingDays || (trade as any).holdDays || 1;

                  return (
                    <tr
                      key={`${trade.symbol}-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => handleTradeSelect(trade, idx)}
                      title="Click to view institutional dossier"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                            {trade.symbol}
                          </span>
                          <span className={`px-1.5 py-px rounded-md text-[8px] font-extrabold uppercase border ${
                            isWin
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                          }`}>
                            {isWin ? "WIN" : "LOSS"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          {trade.strategyName || "Algo"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                        ₹{ep.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 font-sans block">{trade.entryDate}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        ₹{xp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        {trade.exitDate && <span className="text-[10px] text-slate-400 font-sans block">{trade.exitDate}</span>}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={`font-black text-xs ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isWin ? "+" : "−"}{Math.abs(ret).toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        {String(trade.exitReason || "TARGET_HIT").replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {days}d
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTradeSelect(trade, idx);
                            }}
                            className="px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-[10px] font-bold text-violet-700 dark:text-violet-300 border border-violet-500/20 transition-colors cursor-pointer"
                            title="View Overview"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChart(trade.symbol);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-[10px] font-bold text-slate-900 dark:text-white transition-colors cursor-pointer"
                            title="View Chart"
                          >
                            Chart
                          </button>
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
