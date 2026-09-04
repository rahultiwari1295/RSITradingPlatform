import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { Layers, Award } from "lucide-react";
import { StrategySummary } from "../../types";

interface StrategyAttributionMatrixProps {
  strategies?: StrategySummary[];
}

const STRATEGY_COLORS = [
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#8B5CF6", // Violet
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#14B8A6", // Teal
  "#6366F1", // Indigo
];

export default function StrategyAttributionMatrix({ strategies = [] }: StrategyAttributionMatrixProps) {
  const [selectedStrat, setSelectedStrat] = useState<string | null>(null);

  // If no real strategies are returned, don't show mock data
  if (!strategies || strategies.length === 0) {
    return null;
  }

  const strategyList = strategies.map((s, idx) => ({
    ...s,
    color: STRATEGY_COLORS[idx % STRATEGY_COLORS.length],
  }));

  const pieData = strategyList.map(s => ({
    name: s.strategyName,
    value: s.totalTrades || 1,
    color: s.color,
  }));

  const activeStrategy = selectedStrat
    ? strategyList.find(s => s.strategyName === selectedStrat)
    : strategyList[0];

  const totalAuditedTrades = strategyList.reduce((acc, s) => acc + (s.totalTrades || 0), 0);

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Strategy Performance Breakdown
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audited production track record across all active trading models.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>{strategyList.length} Active Strategy Models</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  onClick={(entry) => setSelectedStrat(entry.name)}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="rgba(0,0,0,0.2)"
                      className="cursor-pointer transition-transform hover:scale-105"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: any) => [`${val} trades`, name]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Total Sample</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalAuditedTrades}
              </span>
              <span className="text-[10px] text-emerald-500 font-semibold">Closed Trades</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-1">Select a strategy wedge to inspect</p>
        </div>

        {/* Right: Strategy Cards Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {strategyList.map((strat) => {
            const isSelected = activeStrategy?.strategyName === strat.strategyName;
            return (
              <div
                key={strat.strategyId}
                onClick={() => setSelectedStrat(strat.strategyName)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-100/90 dark:bg-slate-800/90 border-cyan-400/60 shadow-md shadow-cyan-500/10"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: strat.color }}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {strat.strategyName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold">
                    {strat.totalTrades} trades
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-[11px] font-mono mt-1 pt-1.5 border-t border-slate-200/50 dark:border-white/5">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Win Rate</span>
                    <span className="font-bold text-emerald-500">{strat.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Profit Factor</span>
                    <span className="font-bold text-violet-400">{strat.profitFactor}x</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Avg Win</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+{strat.avgWinPct}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Hold</span>
                    <span className="font-bold text-cyan-500">{strat.avgHoldDays}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
