import React, { useState } from "react";
import { BarChart3, ArrowUpDown, Filter } from "lucide-react";
import HeroCard from "../components/HeroCard";
import { StrategySummary } from "../types";
import { getAvatarGradient } from "../constants/theme";

interface StrategiesViewProps {
  strategies: StrategySummary[];
  onSelectStrategy?: (strategyName: string) => void;
}

export default function StrategiesView({
  strategies,
  onSelectStrategy
}: StrategiesViewProps) {
  const [sortBy, setSortBy] = useState<"winrate" | "trades" | "pf">("winrate");

  // Summary metrics
  const totalTrades = strategies.reduce((acc, curr) => acc + (curr.totalTrades || 0), 0);
  const totalWins = strategies.reduce((acc, curr) => acc + (curr.wins || 0), 0);
  const blendedWinRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const bestPf = strategies.reduce((max, curr) => Math.max(max, curr.profitFactor || 0), 0);
  const topStrategy = [...strategies].sort((a, b) => (b.winRate || 0) - (a.winRate || 0))[0];

  // Sorted list
  const sortedStrategies = [...strategies].sort((a, b) => {
    if (sortBy === "winrate") {
      return (b.winRate || 0) - (a.winRate || 0);
    } else if (sortBy === "trades") {
      return (b.totalTrades || 0) - (a.totalTrades || 0);
    } else {
      return (b.profitFactor || 0) - (a.profitFactor || 0);
    }
  });

  return (
    <div className="w-full pb-6">
      {/* Top Row */}
      <div className="flex justify-between items-center mb-[18px]">
        <h1 className="text-[21px] text-[#14151A] dark:text-slate-100 font-bold tracking-[-0.4px]">
          Strategies
        </h1>
        <div className="w-[40px] h-[40px] rounded-[13px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 flex items-center justify-center text-[#14151A] dark:text-slate-200 shadow-3xs">
          <BarChart3 className="w-4 h-4" />
        </div>
      </div>

      {/* Hero Card */}
      <HeroCard
        eyebrow="All strategies"
        headline={
          <>
            {strategies.length} systems running,{" "}
            <b className="text-[#8BF694] font-bold">{blendedWinRate.toFixed(1)}% blended win rate</b>
          </>
        }
        stats={[
          { value: totalTrades.toString(), label: "Total trades" },
          { value: bestPf.toFixed(2), label: "Best PF" },
          {
            value: topStrategy ? topStrategy.strategyName : "None",
            label: "Top performer",
            valueColor: "#8BF694"
          }
        ]}
        className="mb-5"
      />

      {/* Section Head */}
      <div className="flex justify-between items-baseline mb-3.5 px-0.5">
        <div className="text-[16.5px] font-bold text-[#14151A] dark:text-slate-100 tracking-[-0.2px]">
          Ranked by {sortBy === "winrate" ? "win rate" : sortBy === "trades" ? "trade volume" : "profit factor"}
        </div>
        <button
          onClick={() => {
            if (sortBy === "winrate") setSortBy("pf");
            else if (sortBy === "pf") setSortBy("trades");
            else setSortBy("winrate");
          }}
          className="text-[12px] font-semibold text-[#56586A] dark:text-slate-400 hover:text-[#14151A] transition-colors flex items-center gap-1 cursor-pointer"
        >
          Sort: {sortBy === "winrate" ? "Win Rate ▾" : sortBy === "pf" ? "Profit Factor ▾" : "Trades ▾"}
        </button>
      </div>

      {/* Strategy Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedStrategies.map((strat, idx) => {
          const iconLetter = strat.strategyName.charAt(0).toUpperCase();
          const winRate = strat.winRate ?? 75;
          const bgGradient = getAvatarGradient(idx);

          return (
            <div
              key={strat.strategyId || strat.strategyName}
              onClick={() => onSelectStrategy && onSelectStrategy(strat.strategyName)}
              className="relative rounded-[18px] p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-[0_2px_12px_-4px_rgba(20,25,40,0.06)] flex items-center gap-3 transition-all hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] cursor-pointer"
            >
              {/* Rank Badge */}
              <div className="absolute -top-1.5 -left-1.5 w-[20px] h-[20px] rounded-full bg-[#14151A] dark:bg-indigo-600 text-white text-[9.5px] font-extrabold flex items-center justify-center shadow-xs">
                {idx + 1}
              </div>

              {/* Icon Square */}
              <div
                className="w-[40px] h-[40px] rounded-[13px] flex items-center justify-center text-white font-extrabold text-[15px] shrink-0 shadow-xs"
                style={{ background: bgGradient }}
              >
                {iconLetter}
              </div>

              {/* Mid Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[#14151A] dark:text-slate-100 truncate">
                  {strat.strategyName}
                </div>
                <div className="text-[11px] text-[#8B8D98] font-semibold mt-0.5 truncate">
                  {strat.description || `Quant setup · ${strat.avgHoldDays || 30}d avg hold`}
                </div>
              </div>

              {/* Right Stats */}
              <div className="text-right shrink-0">
                <div className="text-[15px] font-extrabold text-[#16A34A] font-mono">
                  {winRate.toFixed(1)}%
                </div>
                <div className="text-[10px] text-[#B3B5C0] font-semibold mt-0.5 font-mono">
                  {strat.totalTrades} trades
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
