import React, { useState } from "react";
import { ClosedTrade } from "../types";
import BottomSheet, { BottomSheetItem } from "../components/BottomSheet";
import { formatINR } from "../lib/utils";

interface BacktestsViewProps {
  closedTrades: ClosedTrade[];
  onOpenChart?: (symbol: string) => void;
}

const strategySummaryData = [
  { strategyName: "HyperCoil", totalTrades: 4, winRate: 100, avgReturnPct: 2.24, profitFactor: 99, avgHoldDays: 40 },
  { strategyName: "Snapback", totalTrades: 29, winRate: 96.6, avgReturnPct: 13.66, profitFactor: 51.54, avgHoldDays: 10 },
  { strategyName: "Alpha", totalTrades: 83, winRate: 85.5, avgReturnPct: 9.92, profitFactor: 6.67, avgHoldDays: 11 },
  { strategyName: "TurtleSoup", totalTrades: 83, winRate: 72.3, avgReturnPct: 5.90, profitFactor: 3.43, avgHoldDays: 19 },
  { strategyName: "Decouple", totalTrades: 41, winRate: 68.3, avgReturnPct: 5.31, profitFactor: 3.03, avgHoldDays: 11 },
  { strategyName: "WyckoffSpring", totalTrades: 152, winRate: 67.1, avgReturnPct: 2.38, profitFactor: 1.83, avgHoldDays: 22 },
  { strategyName: "Breakout", totalTrades: 314, winRate: 62.1, avgReturnPct: 2.97, profitFactor: 2.01, avgHoldDays: 18 },
  { strategyName: "DipBuyer", totalTrades: 7, winRate: 57.1, avgReturnPct: 5.29, profitFactor: 2.63, avgHoldDays: 9 },
  { strategyName: "NR7", totalTrades: 49, winRate: 49.0, avgReturnPct: 0.15, profitFactor: 1.03, avgHoldDays: 17 }
];

const stratGradients = [
  ["#0A84FF", "#5E5CE6"],
  ["#AF52DE", "#FF375F"],
  ["#FF9500", "#FFD60A"],
  ["#30D158", "#40C8E0"],
  ["#FF375F", "#FF9500"],
  ["#5E5CE6", "#AF52DE"],
  ["#40C8E0", "#0A84FF"],
  ["#FFD60A", "#FF9500"],
  ["#30D158", "#0A84FF"]
];

const fallbackClosedTrades = [
  { symbol: "HAPPYFORGE", returnPct: 32.6, pnlLabel: "WIN", entryPrice: 1668, exitPrice: 2211.8, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "GLAXO", returnPct: 7.97, pnlLabel: "WIN", entryPrice: 2688, exitPrice: 2902.2, entryDate: "2026-08-17", exitDate: "2026-08-21", holdingDays: 4, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "ASIANENE", returnPct: 15.11, pnlLabel: "WIN", entryPrice: 408.55, exitPrice: 470.3, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Breakout", exitReason: "MFE_TRAIL_L3" },
  { symbol: "ALIVUS", returnPct: 14.21, pnlLabel: "WIN", entryPrice: 1182.8, exitPrice: 1350.9, entryDate: "2026-08-03", exitDate: "2026-08-21", holdingDays: 18, strategyName: "Alpha", exitReason: "MFE_TRAIL_L3" },
  { symbol: "DBOL", returnPct: 12.37, pnlLabel: "WIN", entryPrice: 116.71, exitPrice: 131.15, entryDate: "2026-08-10", exitDate: "2026-08-21", holdingDays: 11, strategyName: "WyckoffSpring", exitReason: "MFE_TRAIL_L3" },
  { symbol: "NETWEB", returnPct: -9.57, pnlLabel: "LOSS", entryPrice: 5601, exitPrice: 5065, entryDate: "2026-08-17", exitDate: "2026-08-19", holdingDays: 2, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" },
  { symbol: "ASTERDM", returnPct: -7.99, pnlLabel: "LOSS", entryPrice: 869.7, exitPrice: 800.2, entryDate: "2026-08-03", exitDate: "2026-08-19", holdingDays: 16, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" },
  { symbol: "JINDALSAW", returnPct: -7.89, pnlLabel: "LOSS", entryPrice: 291.65, exitPrice: 268.65, entryDate: "2026-08-17", exitDate: "2026-08-18", holdingDays: 1, strategyName: "Breakout", exitReason: "SMART_EARLY_STOP" },
  { symbol: "APOLLOPIPE", returnPct: -8.35, pnlLabel: "LOSS", entryPrice: 601.55, exitPrice: 551.3, entryDate: "2026-08-17", exitDate: "2026-08-18", holdingDays: 1, strategyName: "NR7", exitReason: "SMART_EARLY_STOP" },
  { symbol: "TDPOWERSYS", returnPct: 28.60, pnlLabel: "WIN", entryPrice: 1201.9, exitPrice: 1545.6, entryDate: "2026-08-05", exitDate: "2026-08-19", holdingDays: 14, strategyName: "WyckoffSpring", exitReason: "MFE_TRAIL_L4" },
  { symbol: "HEG", returnPct: 1.01, pnlLabel: "WIN", entryPrice: 701, exitPrice: 708.05, entryDate: "2026-08-10", exitDate: "2026-08-19", holdingDays: 9, strategyName: "Breakout", exitReason: "MFE_TRAIL_L4" },
  { symbol: "AEGISLOG", returnPct: 82.31, pnlLabel: "WIN", entryPrice: 759, exitPrice: 1383.7, entryDate: "2026-06-08", exitDate: "2026-07-07", holdingDays: 29, strategyName: "Alpha", exitReason: "MFE_TRAIL_L4" }
];

export default function BacktestsView({
  closedTrades,
  onOpenChart
}: BacktestsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"playbook" | "history">("playbook");
  const [historyFilter, setHistoryFilter] = useState<"all" | "win" | "loss">("all");
  const [selectedSheetItem, setSelectedSheetItem] = useState<BottomSheetItem | null>(null);

  const tradesList = closedTrades && closedTrades.length > 0 ? closedTrades : (fallbackClosedTrades as any);

  const filteredHistory = tradesList.filter((t: any) => {
    const isWin = (t.returnPct ?? 0) >= 0 || t.pnlLabel === "WIN";
    if (historyFilter === "all") return true;
    if (historyFilter === "win") return isWin;
    if (historyFilter === "loss") return !isWin;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Sub tabs: Playbook vs Closed History */}
      <div className="flex gap-2 p-1 rounded-[16px] bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <button
          onClick={() => setActiveSubTab("playbook")}
          className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-extrabold transition-all cursor-pointer ${
            activeSubTab === "playbook"
              ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] shadow-xs"
              : "text-[#6B7079] dark:text-[#98989F] hover:text-[#0B0D12]"
          }`}
        >
          The Playbook
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-extrabold transition-all cursor-pointer ${
            activeSubTab === "history"
              ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] shadow-xs"
              : "text-[#6B7079] dark:text-[#98989F] hover:text-[#0B0D12]"
          }`}
        >
          Closed Trades ({tradesList.length})
        </button>
      </div>

      {activeSubTab === "playbook" ? (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-[24px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight">
              The playbook
            </h1>
            <p className="text-[13.5px] text-[#6B7079] dark:text-[#98989F] font-semibold mt-0.5">
              9 strategies ranked by real performance across 762 trades
            </p>
          </div>

          {/* Record Card — 2.58x Profit Factor */}
          <div className="rounded-[26px] p-5 sm:p-6 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_4px_16px_-4px_rgba(16,24,40,0.10)]">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[38px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight tabular leading-none">
                2.58
              </span>
              <span className="text-[18px] font-bold text-[#A2A6AE] dark:text-[#636366]">
                x
              </span>
            </div>
            <p className="text-[13px] text-[#6B7079] dark:text-[#98989F] font-semibold mb-4">
              Profit factor — every ₹1 lost, ₹2.58 made back
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-[16px] bg-[#E8F2FF] dark:bg-[#0F2942]">
                <div className="text-[18px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                  67.7%
                </div>
                <div className="text-[10.5px] font-bold text-[#6B7079] dark:text-[#98989F] uppercase tracking-wide mt-0.5">
                  WIN RATE
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#E5FBEA] dark:bg-[#0E2C17]">
                <div className="text-[18px] font-extrabold text-[#1DA53E] tabular">
                  +10.4%
                </div>
                <div className="text-[10.5px] font-bold text-[#6B7079] dark:text-[#98989F] uppercase tracking-wide mt-0.5">
                  AVG WIN
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#FFE9EF] dark:bg-[#3A1622]">
                <div className="text-[18px] font-extrabold text-[#FF375F] tabular">
                  -8.4%
                </div>
                <div className="text-[10.5px] font-bold text-[#6B7079] dark:text-[#98989F] uppercase tracking-wide mt-0.5">
                  AVG LOSS
                </div>
              </div>
            </div>
          </div>

          {/* Ranked Strategy Rows */}
          <div className="space-y-3">
            {strategySummaryData.map((s, idx) => {
              const grad = stratGradients[idx % stratGradients.length];

              return (
                <div
                  key={s.strategyName}
                  className="rounded-[20px] p-4 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.08)] transition-all qs-card-hover"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: grad[0] }}
                      />
                      <span className="text-[15.5px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7]">
                        {s.strategyName}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#A2A6AE] dark:text-[#636366] bg-[rgba(60,60,67,0.08)] dark:bg-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded-[8px]">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div>
                      <div className="text-[16px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                        {s.winRate}%
                      </div>
                      <div className="text-[10px] font-bold text-[#A2A6AE] dark:text-[#636366] uppercase tracking-wide">
                        Win rate
                      </div>
                    </div>

                    <div>
                      <div className="text-[16px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                        {s.profitFactor >= 10 ? "99+" : `${s.profitFactor.toFixed(2)}x`}
                      </div>
                      <div className="text-[10px] font-bold text-[#A2A6AE] dark:text-[#636366] uppercase tracking-wide">
                        Profit factor
                      </div>
                    </div>

                    <div>
                      <div className="text-[16px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                        {s.totalTrades}
                      </div>
                      <div className="text-[10px] font-bold text-[#A2A6AE] dark:text-[#636366] uppercase tracking-wide">
                        Trades
                      </div>
                    </div>

                    <div>
                      <div className="text-[16px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tabular">
                        {s.avgHoldDays}d
                      </div>
                      <div className="text-[10px] font-bold text-[#A2A6AE] dark:text-[#636366] uppercase tracking-wide">
                        Hold
                      </div>
                    </div>
                  </div>

                  {/* Colored progress bar */}
                  <div className="h-2 rounded-full bg-[rgba(60,60,67,0.08)] dark:bg-[rgba(255,255,255,0.07)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${s.winRate}%`,
                        background: `linear-gradient(90deg, ${grad[0]}, ${grad[1]})`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* History View */
        <div className="space-y-4">
          <div>
            <h1 className="text-[24px] font-extrabold text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight">
              Closed trades
            </h1>
            <p className="text-[13.5px] text-[#6B7079] dark:text-[#98989F] font-semibold mt-0.5">
              Most recent first · 3,038 all-time records
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            <button
              onClick={() => setHistoryFilter("all")}
              className={`px-3.5 py-1.5 rounded-[16px] text-[13px] font-extrabold border transition-all cursor-pointer ${
                historyFilter === "all"
                  ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                  : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHistoryFilter("win")}
              className={`px-3.5 py-1.5 rounded-[16px] text-[13px] font-extrabold border transition-all cursor-pointer ${
                historyFilter === "win"
                  ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                  : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)]"
              }`}
            >
              🟢 Wins
            </button>
            <button
              onClick={() => setHistoryFilter("loss")}
              className={`px-3.5 py-1.5 rounded-[16px] text-[13px] font-extrabold border transition-all cursor-pointer ${
                historyFilter === "loss"
                  ? "bg-[#0B0D12] dark:bg-[#F5F5F7] text-white dark:text-[#0B0D12] border-transparent shadow-xs"
                  : "bg-white dark:bg-[#1C1C1E] text-[#6B7079] dark:text-[#98989F] border-[rgba(60,60,67,0.10)]"
              }`}
            >
              🔴 Losses
            </button>
          </div>

          {/* Closed trade list */}
          <div className="space-y-2.5">
            {filteredHistory.map((t: any, idx: number) => {
              const isUp = (t.returnPct ?? 0) >= 0;
              return (
                <div
                  key={`${t.symbol}-${idx}`}
                  onClick={() => setSelectedSheetItem(t)}
                  className="rounded-[20px] p-3.5 sm:p-4 bg-white dark:bg-[#1C1C1E] border border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(16,24,40,0.10)] transition-all cursor-pointer flex items-center gap-3.5 qs-card-hover"
                >
                  <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-extrabold text-[15px] text-white shrink-0 ${
                    isUp ? "avatar-buy" : "avatar-avoid"
                  }`}>
                    {t.symbol?.slice(0, 1) || "S"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[16px] text-[#0B0D12] dark:text-[#F5F5F7] tracking-tight truncate">
                      {t.symbol}
                    </div>
                    <div className="text-[12px] text-[#6B7079] dark:text-[#98989F] font-semibold truncate mt-0.5">
                      {t.strategyName || "Breakout"} · {t.holdingDays || 10}d · {t.exitDate || "Closed"}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-extrabold text-[15.5px] tabular ${isUp ? "text-[#30D158]" : "text-[#FF453A]"}`}>
                      {isUp ? "+" : ""}{(t.returnPct ?? 0).toFixed(2)}%
                    </div>
                    <div className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-[8px] mt-0.5 inline-block ${
                      isUp ? "bg-[#E5FBEA] text-[#1DA53E]" : "bg-[#FFEBEA] text-[#E0342A]"
                    }`}>
                      {t.pnlLabel || (isUp ? "WIN" : "LOSS")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedSheetItem}
        onClose={() => setSelectedSheetItem(null)}
        item={selectedSheetItem}
        onOpenChart={onOpenChart}
      />
    </div>
  );
}
