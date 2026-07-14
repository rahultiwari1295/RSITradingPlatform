/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategySummary } from "../types";
import { Zap, TrendingUp, BarChart2 } from "lucide-react";

interface StrategyLeaderboardProps {
  strategies: StrategySummary[];
}

export default function StrategyLeaderboard({ strategies }: StrategyLeaderboardProps) {
  if (!strategies || strategies.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200/80 dark:border-slate-800 shadow-3xs overflow-hidden mt-4 sm:mt-6">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" />
        <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100 uppercase tracking-wide font-mono">Strategy Leaderboard</h3>
      </div>
      <div className="flex flex-col md:flex-row overflow-x-auto divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-slate-800 scrollbar-none">
        {strategies.map((strategy) => {
          const isHighConviction = strategy.profitFactor > 2.0;
          return (
            <div key={strategy.strategyId} className="flex-1 min-w-[240px] p-4 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight truncate">
                  {strategy.strategyName}
                </span>
                {isHighConviction && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded border border-amber-200/50 dark:border-amber-800/50">
                    Elite
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Win Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {strategy.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Profit Factor</span>
                  <span className={`font-bold text-sm ${isHighConviction ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {strategy.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Avg Return</span>
                  <span className={`font-bold text-xs ${strategy.avgReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {strategy.avgReturnPct >= 0 ? "+" : ""}{strategy.avgReturnPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Total Trades</span>
                  <span className="font-bold text-slate-700 dark:text-slate-400 text-xs font-mono">
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
