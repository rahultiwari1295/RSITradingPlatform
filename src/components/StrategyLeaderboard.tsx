/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategySummary } from "../types";
import { Zap } from "lucide-react";

interface StrategyLeaderboardProps {
  strategies: StrategySummary[];
}

export default function StrategyLeaderboard({ strategies }: StrategyLeaderboardProps) {
  if (!strategies || strategies.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200/80 dark:border-slate-800 shadow-3xs overflow-hidden mt-3 sm:mt-4">
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <h3 className="font-bold text-[11px] sm:text-xs text-gray-900 dark:text-slate-100 uppercase tracking-wide font-mono">Strategy Performance</h3>
      </div>
      <div className="flex overflow-x-auto divide-x divide-gray-100 dark:divide-slate-800 scrollbar-none snap-x">
        {strategies.map((strategy) => {
          const isHighConviction = strategy.profitFactor > 2.0;
          return (
            <div key={strategy.strategyId} className="flex-none w-[200px] sm:flex-1 sm:min-w-[220px] p-3 snap-start hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm tracking-tight truncate pr-2">
                  {strategy.strategyName}
                </span>
                {isHighConviction && (
                  <span className="px-1 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded border border-amber-200/50 dark:border-amber-800/50 shrink-0">
                    Elite
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-mono tracking-wider">Win Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                    {strategy.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-mono tracking-wider">Profit Factor</span>
                  <span className={`font-bold text-xs sm:text-sm ${isHighConviction ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {strategy.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-mono tracking-wider">Avg Return</span>
                  <span className={`font-bold text-xs ${strategy.avgReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {strategy.avgReturnPct >= 0 ? "+" : ""}{strategy.avgReturnPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-mono tracking-wider">Total Trades</span>
                  <span className="font-bold text-slate-700 dark:text-slate-400 text-[10px] sm:text-xs font-mono">
                    {strategy.totalTrades}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
