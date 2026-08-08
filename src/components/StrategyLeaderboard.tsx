/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { StrategySummary } from "../types";
import { Zap, ChevronDown, ChevronUp, Award, Filter } from "lucide-react";

interface StrategyLeaderboardProps {
  strategies: StrategySummary[];
  selectedStrategy?: string;
  onSelectStrategy?: (strategyName: string) => void;
}

export default function StrategyLeaderboard({ strategies, selectedStrategy, onSelectStrategy }: StrategyLeaderboardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!strategies || strategies.length === 0) return null;

  // Calculate top strategy for preview
  const topStrategy = [...strategies].sort((a, b) => b.profitFactor - a.profitFactor)[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200/80 dark:border-slate-800/80 shadow-3xs overflow-hidden my-3 transition-all duration-200">
      {/* Slim Header Bar (Always Visible) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/90 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase font-mono tracking-tight truncate">
              Strategy Performance
            </h3>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {strategies.length} Quantitative Models
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isExpanded && topStrategy && (
            <div className="hidden xs:flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 pr-1">
              <span>Top: <strong className="text-slate-800 dark:text-slate-200">{topStrategy.strategyName.split(" ")[0]}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">({topStrategy.winRate.toFixed(0)}% WR)</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all border shadow-2xs ${
              isExpanded 
                ? "bg-indigo-600 text-white border-indigo-600" 
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-gray-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <span>{isExpanded ? "Collapse" : "Expand Cards"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Vertical Cards Layout */}
      {isExpanded && (
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-mono text-xs text-slate-500 dark:text-slate-400 pb-1">
            <span>INSTITUTIONAL MODEL BREAKDOWN</span>
            {selectedStrategy && selectedStrategy !== "ALL" && (
              <button
                onClick={() => onSelectStrategy && onSelectStrategy("ALL")}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Reset Filter ({selectedStrategy})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {strategies.map((strategy) => {
              const isHighConviction = strategy.profitFactor > 2.0;
              const isSelected = selectedStrategy === strategy.strategyName;

              return (
                <div
                  key={strategy.strategyId}
                  onClick={() => onSelectStrategy && onSelectStrategy(strategy.strategyName)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 shadow-sm"
                      : "bg-white dark:bg-slate-900 border-gray-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white font-mono tracking-tight">
                          {strategy.strategyName}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {strategy.strategyId}
                        </span>
                      </div>

                      {isHighConviction ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1 shrink-0">
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>Elite</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Progress Bar for Win Rate */}
                    <div className="my-2.5">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Win Rate</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {strategy.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, strategy.winRate)}%` }} 
                        />
                      </div>
                    </div>

                    {/* Grid of Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-gray-100 dark:border-slate-800/80 font-mono text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block">Profit Factor</span>
                        <span className={`font-bold ${isHighConviction ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-200"}`}>
                          {strategy.profitFactor.toFixed(2)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block">Avg Return</span>
                        <span className={`font-bold ${strategy.avgReturnPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                          {strategy.avgReturnPct >= 0 ? "+" : ""}{strategy.avgReturnPct.toFixed(2)}%
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block">Total Trades</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {strategy.totalTrades} <span className="text-[10px] text-slate-400">({strategy.wins}W/{strategy.losses}L)</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 uppercase block">Avg Hold</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          ~{strategy.avgHoldDays || 1}d
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Action Footer */}
                  <div className="mt-2 pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {isSelected ? "Filter Applied" : "Tap to Filter Trades"}
                    </span>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center gap-1 ${
                        isSelected 
                          ? "bg-indigo-600 text-white" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
                      }`}
                    >
                      <Filter className="w-3 h-3" />
                      <span>{isSelected ? "Active" : "Filter"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
