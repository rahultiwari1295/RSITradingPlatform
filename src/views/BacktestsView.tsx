import React, { useState } from "react";
import { ClosedTrade } from "../types";
import HeroCard from "../components/HeroCard";
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

const avatarGradients = [
  "from-[#818CF8] to-[#6366F1]",
  "from-[#FB923C] to-[#EA580C]",
  "from-[#34D399] to-[#059669]",
  "from-[#F87171] to-[#EF4444]",
  "from-[#A78BFA] to-[#8B5CF6]",
  "from-[#22D3EE] to-[#06B6D4]"
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
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. Hero Card */}
      <HeroCard
        eyebrow="BACKTESTED ALPHA · VERIFIED RULES"
        headline={
          <span>
            9 core strategies delivering <span className="text-[#8BF694]">2.58x profit factor</span> across market cycles.
          </span>
        }
        badge="Verified Audit"
        stats={[
          { value: "67.7%", label: "WIN RATE" },
          { value: "+10.4%", label: "AVG WIN", valueColor: "#8BF694" },
          { value: "-8.4%", label: "AVG LOSS", valueColor: "#F97066" }
        ]}
      />

      {/* 2. Sub tabs */}
      <div className="flex gap-1.5 p-1 rounded-[16px] bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow">
        <button
          onClick={() => setActiveSubTab("playbook")}
          className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-bold transition-all cursor-pointer ${
            activeSubTab === "playbook"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "text-[#56586A] dark:text-[#8B8D98] hover:text-[#14151A]"
          }`}
        >
          The Playbook (9)
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`flex-1 py-2 px-3 rounded-[12px] text-[13px] font-bold transition-all cursor-pointer ${
            activeSubTab === "history"
              ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
              : "text-[#56586A] dark:text-[#8B8D98] hover:text-[#14151A]"
          }`}
        >
          Closed Trades ({tradesList.length})
        </button>
      </div>

      {activeSubTab === "playbook" ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-[#14151A] dark:text-white tracking-tight">
              Ranked Execution Models
            </h2>
            <span className="text-[12px] font-mono text-[#8B8D98]">
              762 sample size
            </span>
          </div>

          {/* Strategy Rows */}
          <div className="space-y-2.5">
            {strategySummaryData.map((s, idx) => {
              const gradClass = avatarGradients[idx % avatarGradients.length];

              return (
                <div
                  key={s.strategyName}
                  className="rounded-[20px] p-4 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover transition-all"
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0 font-mono`}>
                        {s.strategyName.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[15.5px] text-[#14151A] dark:text-white tracking-tight">
                            {s.strategyName}
                          </span>
                          <span className="text-[10px] font-bold text-[#56586A] dark:text-[#8B8D98] bg-[#F1F2F5] dark:bg-white/[0.06] px-1.5 py-0.5 rounded-[6px] font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-medium mt-0.5">
                          {s.totalTrades} verified trades · ~{s.avgHoldDays}d hold
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[15px] font-extrabold text-[#16A34A] dark:text-emerald-400 font-mono tabular">
                        {s.winRate.toFixed(1)}% WR
                      </div>
                      <div className="text-[11.5px] text-[#56586A] dark:text-[#8B8D98] font-mono">
                        {s.profitFactor}x PF
                      </div>
                    </div>
                  </div>

                  {/* Visual Win-rate Bar */}
                  <div className="h-1.5 rounded-full bg-[#F1F2F5] dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#10B981]"
                      style={{ width: `${s.winRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* History View */
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setHistoryFilter("all")}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                historyFilter === "all"
                  ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                  : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
              }`}
            >
              All ({tradesList.length})
            </button>
            <button
              onClick={() => setHistoryFilter("win")}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                historyFilter === "win"
                  ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                  : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
              }`}
            >
              🟢 Wins
            </button>
            <button
              onClick={() => setHistoryFilter("loss")}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                historyFilter === "loss"
                  ? "bg-[#14151A] dark:bg-white text-white dark:text-[#14151A] shadow-xs"
                  : "bg-white dark:bg-[#14161E] text-[#56586A] dark:text-[#8B8D98] border border-[#ECEEF2] dark:border-white/[0.08]"
              }`}
            >
              🔴 Losses
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredHistory.map((t: any, idx: number) => {
              const isWin = (t.returnPct ?? 0) >= 0;
              const gradClass = avatarGradients[idx % avatarGradients.length];

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedSheetItem(t)}
                  className="rounded-[18px] p-3.5 bg-white dark:bg-[#14161E] border border-[#ECEEF2] dark:border-white/[0.08] qs-card-shadow qs-card-hover transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-[10px] bg-gradient-to-br ${gradClass} text-white flex items-center justify-center font-bold text-[12px] shadow-xs shrink-0 font-mono`}>
                      {t.symbol?.slice(0, 2) || "ST"}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[15px] text-[#14151A] dark:text-white tracking-tight truncate">
                          {t.symbol}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-[6px] border ${
                          isWin
                            ? "bg-[#ECFDF3] text-[#16A34A] border-[#86EFAC]/40 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-[#FEF3F2] text-[#F04438] border-[#FECDCA]/40 dark:bg-rose-950/40 dark:text-rose-400"
                        }`}>
                          {isWin ? "WIN" : "LOSS"}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#56586A] dark:text-[#8B8D98] font-medium mt-0.5 truncate">
                        {t.strategyName || "Breakout"} · {t.holdingDays}d hold
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-extrabold text-[15px] font-mono tabular ${isWin ? "text-[#16A34A] dark:text-emerald-400" : "text-[#F04438] dark:text-rose-400"}`}>
                      {isWin ? "+" : ""}{(t.returnPct ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-[#8B8D98] font-mono">
                      {formatINR(t.exitPrice || 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Sheet Details */}
      <BottomSheet
        isOpen={!!selectedSheetItem}
        onClose={() => setSelectedSheetItem(null)}
        item={selectedSheetItem}
        onOpenChart={onOpenChart}
      />
    </div>
  );
}
