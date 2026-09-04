import React from "react";
import { Gauge, Shield, PieChart, Coins } from "lucide-react";

interface Sleeve {
  name: string;
  strategyGroup: string;
  targetPct: number;
  currentPct: number;
  color: string;
  status: "OPTIMAL" | "OVERWEIGHT" | "UNDERWEIGHT";
}

const SLEEVES: Sleeve[] = [
  { name: "Momentum Breakout", strategyGroup: "Breakout, GapExpansion, Donchian", targetPct: 35, currentPct: 28, color: "#10B981", status: "OPTIMAL" },
  { name: "Relative Strength Leader", strategyGroup: "Alpha RS, RSLeader", targetPct: 25, currentPct: 22, color: "#06B6D4", status: "OPTIMAL" },
  { name: "Structural Value Pullback", strategyGroup: "ValuePullback, WyckoffSpring", targetPct: 25, currentPct: 20, color: "#8B5CF6", status: "OPTIMAL" },
  { name: "Institutional Pocket Pivot", strategyGroup: "PocketPivot, Decouple", targetPct: 15, currentPct: 10, color: "#F59E0B", status: "OPTIMAL" },
];

export default function SleeveCapacityGauges() {
  const totalAllocated = SLEEVES.reduce((acc, s) => acc + s.currentPct, 0);
  const cashBuffer = Math.max(0, 100 - totalAllocated);

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Gauge className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Sleeve Capacity & Risk Budget Allocation
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dynamic capital allocation across uncorrelated quantitative sleeves with automated anti-crowding limits.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
            {totalAllocated}% Deployed
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
            {cashBuffer}% Cash Buffer
          </span>
        </div>
      </div>

      {/* Grid of Sleeves */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SLEEVES.map((sleeve) => {
          const utilPct = (sleeve.currentPct / sleeve.targetPct) * 100;

          return (
            <div
              key={sleeve.name}
              className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {sleeve.name}
                  </span>
                  <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.2 rounded-full">
                    {sleeve.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-3">
                  {sleeve.strategyGroup}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-500">Utilization</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {sleeve.currentPct}% <span className="text-slate-400 font-normal">/ {sleeve.targetPct}% max</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, utilPct)}%`,
                      backgroundColor: sleeve.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
