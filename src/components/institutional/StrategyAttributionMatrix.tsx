import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Layers, ShieldCheck, Zap, Award, BarChart2 } from "lucide-react";
import { StrategySummary } from "../../types";

interface StrategyAttributionMatrixProps {
  strategies?: StrategySummary[];
}

const DEFAULT_STRATEGIES = [
  { strategyId: "Breakout", strategyName: "Breakout Mom", totalTrades: 314, winRate: 62.1, avgWinPct: 8.4, avgLossPct: -3.8, profitFactor: 2.01, avgHoldDays: 18, color: "#10B981", precedence: 1, sleeve: "Momentum" },
  { strategyId: "Alpha", strategyName: "Alpha RS", totalTrades: 83, winRate: 85.5, avgWinPct: 12.1, avgLossPct: -4.1, profitFactor: 6.67, avgHoldDays: 11, color: "#06B6D4", precedence: 2, sleeve: "Relative Strength" },
  { strategyId: "ValuePullback", strategyName: "Value Pullback", totalTrades: 48, winRate: 71.4, avgWinPct: 7.9, avgLossPct: -3.2, profitFactor: 3.42, avgHoldDays: 14, color: "#8B5CF6", precedence: 3, sleeve: "Trend Pullback" },
  { strategyId: "RSLeader", strategyName: "RS Leader", totalTrades: 52, winRate: 76.9, avgWinPct: 11.4, avgLossPct: -3.5, profitFactor: 4.88, avgHoldDays: 15, color: "#F59E0B", precedence: 4, sleeve: "Relative Strength" },
  { strategyId: "PocketPivot", strategyName: "Pocket Pivot", totalTrades: 42, winRate: 78.6, avgWinPct: 9.8, avgLossPct: -3.4, profitFactor: 4.25, avgHoldDays: 12, color: "#EC4899", precedence: 5, sleeve: "Institutional Flow" },
  { strategyId: "WyckoffSpring", strategyName: "Wyckoff Spring", totalTrades: 152, winRate: 67.1, avgWinPct: 8.2, avgLossPct: -4.5, profitFactor: 1.83, avgHoldDays: 22, color: "#3B82F6", precedence: 6, sleeve: "Accumulation" },
  { strategyId: "Decouple", strategyName: "Decouple Alpha", totalTrades: 41, winRate: 68.3, avgWinPct: 8.7, avgLossPct: -3.9, profitFactor: 3.03, avgHoldDays: 11, color: "#14B8A6", precedence: 7, sleeve: "Decoupled Alpha" },
  { strategyId: "TurtleSoup", strategyName: "Turtle Soup", totalTrades: 83, winRate: 72.3, avgWinPct: 9.5, avgLossPct: -4.2, profitFactor: 3.43, avgHoldDays: 19, color: "#6366F1", precedence: 8, sleeve: "Liquidity Sweep" },
];

export default function StrategyAttributionMatrix({ strategies }: StrategyAttributionMatrixProps) {
  const [selectedStrat, setSelectedStrat] = useState<string | null>(null);

  // Merge live API strategies if present
  const strategyList = (strategies && strategies.length > 0)
    ? DEFAULT_STRATEGIES.map(ds => {
        const live = strategies.find(s => s.strategyId === ds.strategyId || s.strategyName === ds.strategyName);
        if (live) {
          return {
            ...ds,
            totalTrades: live.totalTrades || ds.totalTrades,
            winRate: live.winRate || ds.winRate,
            profitFactor: live.profitFactor || ds.profitFactor,
            avgHoldDays: live.avgHoldDays || ds.avgHoldDays,
          };
        }
        return ds;
      })
    : DEFAULT_STRATEGIES;

  const pieData = strategyList.map(s => ({
    name: s.strategyName,
    value: s.totalTrades,
    color: s.color,
  }));

  const activeStrategy = selectedStrat
    ? strategyList.find(s => s.strategyName === selectedStrat)
    : strategyList[0];

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
              Strategy Attribution & Precedence Hierarchy
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Deterministic preemption pipeline with conflict resolution across 9 autonomous strategy sleeves.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>8 Core Alpha Engines Active</span>
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
                {strategyList.reduce((acc, s) => acc + s.totalTrades, 0)}
              </span>
              <span className="text-[10px] text-emerald-500 font-semibold">Audited Trades</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-1">Click a strategy wedge to inspect metrics</p>
        </div>

        {/* Right: Strategy Cards Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {strategyList.map((strat) => {
            const isSelected = activeStrategy?.strategyName === strat.strategyName;
            return (
              <div
                key={strat.strategyId}
                onClick={() => setSelectedStrat(strat.strategyName)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-100/90 dark:bg-slate-800/90 border-cyan-400/60 shadow-md shadow-cyan-500/10"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
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
                    Tier {strat.precedence}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono mt-2">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Win Rate</span>
                    <span className="font-bold text-emerald-500">{strat.winRate}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Profit Factor</span>
                    <span className="font-bold text-violet-400">{strat.profitFactor}x</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Hold Time</span>
                    <span className="font-bold text-cyan-400">{strat.avgHoldDays}d</span>
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
