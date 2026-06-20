/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, AlertTriangle, ArrowUpRight, BarChart2, Activity, ShieldCheck } from "lucide-react";
import { TerminalKPIs } from "../types";

interface KPICardsProps {
  kpis: TerminalKPIs;
  activeCount: number;
  setupCount: number;
}

export default function KPICards({ kpis, activeCount, setupCount }: KPICardsProps) {
  // Safe defaults based on structure
  const winRate = kpis.winRate !== undefined ? kpis.winRate : 25.5;
  const winRateStrong = kpis.winRateStrong !== undefined ? kpis.winRateStrong : 27.8;
  const avgReturn = kpis.avgReturn !== undefined ? kpis.avgReturn : -1.51;
  const expectancy = kpis.expectancy !== undefined ? kpis.expectancy : -1.51;
  const totalSignals = kpis.totalSignals !== undefined ? kpis.totalSignals : 1174;
  const closedTrades = kpis.closedTrades !== undefined ? kpis.closedTrades : 1125;
  const openTrades = kpis.openTrades !== undefined ? kpis.openTrades : 49;
  const setupCountVal = kpis.setupCount !== undefined ? kpis.setupCount : setupCount;
  const watchingCount = kpis.watchingCount !== undefined ? kpis.watchingCount : 36;
  const inTradeCountVal = kpis.inTradeCount !== undefined ? kpis.inTradeCount : activeCount;

  const cards = [
    {
      id: "win-rate",
      title: "Tactical Win Rate",
      value: `${winRate.toFixed(1)}%`,
      description: `Strong Setups WR: ${winRateStrong.toFixed(1)}%`,
      descColor: "text-emerald-700 font-bold",
      icon: TrendingUp,
      bgColor: "bg-emerald-50/50",
      borderColor: "border-emerald-100",
      iconColor: "text-emerald-500",
      accent: "from-emerald-500/10 to-emerald-500/0",
    },
    {
      id: "avg-return",
      title: "Average Return",
      value: `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%`,
      description: `Expectancy: ${expectancy.toFixed(2)}%`,
      descColor: avgReturn >= 0 ? "text-emerald-700 font-semibold" : "text-rose-600 font-semibold",
      icon: ArrowUpRight,
      bgColor: avgReturn >= 0 ? "bg-indigo-50/50" : "bg-rose-50/30",
      borderColor: avgReturn >= 0 ? "border-indigo-100" : "border-rose-100",
      iconColor: avgReturn >= 0 ? "text-indigo-500" : "text-rose-500",
      accent: avgReturn >= 0 ? "from-indigo-500/10 to-indigo-500/0" : "from-rose-500/10 to-rose-500/0",
    },
    {
      id: "in-trade",
      title: "Active Core Trades",
      value: inTradeCountVal,
      description: `Open: ${openTrades} | Closed: ${closedTrades}`,
      descColor: "text-blue-600 font-semibold",
      icon: Activity,
      bgColor: "bg-blue-50/50",
      borderColor: "border-blue-100",
      iconColor: "text-blue-500",
      accent: "from-blue-500/10 to-blue-500/0",
    },
    {
      id: "entry-zone",
      title: "Near Setup Alerts",
      value: setupCountVal,
      description: `Watching: ${watchingCount} Stocks`,
      descColor: "text-amber-700 font-semibold",
      icon: AlertTriangle,
      bgColor: "bg-amber-50/50",
      borderColor: "border-amber-100",
      iconColor: "text-amber-500",
      accent: "from-amber-500/10 to-amber-500/0",
    },
    {
      id: "total-signals",
      title: "Total Algo Signals",
      value: totalSignals,
      description: "Live Wix Signal Stream",
      descColor: "text-slate-500 font-medium",
      icon: BarChart2,
      bgColor: "bg-slate-50/50",
      borderColor: "border-slate-200/80",
      iconColor: "text-slate-500",
      accent: "from-slate-500/10 to-slate-500/0",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={`kpi-card-${card.id}`}
            className={`relative overflow-hidden rounded-xl bg-linear-to-b ${card.bgColor} ${card.accent} p-4 sm:p-5 border ${card.borderColor} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                {card.title}
              </span>
              <div className="p-1.5 rounded-lg bg-white shadow-3xs text-gray-500">
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-gray-900 font-sans tracking-tight">
                {card.value}
              </span>
            </div>

            <p className={`text-[11px] mt-1.5 leading-none ${card.descColor}`}>
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
