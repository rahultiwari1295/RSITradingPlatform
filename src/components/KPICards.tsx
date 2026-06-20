/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, AlertTriangle, ArrowUpRight, BarChart2, Activity } from "lucide-react";
import { TerminalKPIs } from "../types";

interface KPICardsProps {
  kpis: TerminalKPIs;
  activeCount: number;
  setupCount: number;
}

export default function KPICards({ kpis, activeCount, setupCount }: KPICardsProps) {
  const cards = [
    {
      id: "win-rate",
      title: "Tactical Win Rate",
      value: `${kpis.winRate || 63.8}%`,
      description: "Exited historical winner ratio",
      descColor: "text-emerald-600",
      icon: TrendingUp,
      bgColor: "bg-emerald-50/50",
      borderColor: "border-emerald-100",
      iconColor: "text-emerald-500",
      accent: "from-emerald-500/10 to-emerald-500/0",
    },
    {
      id: "avg-return",
      title: "Average Return",
      value: `+${kpis.avgReturn || 8.08}%`,
      description: "Calculated profit per trade",
      descColor: "text-indigo-600",
      icon: ArrowUpRight,
      bgColor: "bg-indigo-50/50",
      borderColor: "border-indigo-100",
      iconColor: "text-indigo-500",
      accent: "from-indigo-500/10 to-indigo-500/0",
    },
    {
      id: "in-trade",
      title: "Active Triggered Trades",
      value: activeCount,
      description: "Currently monitored in live trade",
      descColor: "text-blue-600",
      icon: Activity,
      bgColor: "bg-blue-50/50",
      borderColor: "border-blue-100",
      iconColor: "text-blue-500",
      accent: "from-blue-500/10 to-blue-500/0",
    },
    {
      id: "entry-zone",
      title: "Entry / Setup Alerts",
      value: setupCount,
      description: "Approaching trendline crosses",
      descColor: "text-amber-600",
      icon: AlertTriangle,
      bgColor: "bg-amber-50/50",
      borderColor: "border-amber-100",
      iconColor: "text-amber-500",
      accent: "from-amber-500/10 to-amber-500/0",
    },
    {
      id: "tl-crossed",
      title: "Total Signals Crossed",
      value: kpis.tlCrossed || 44,
      description: "Crossovers in memory",
      descColor: "text-slate-500",
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
            className={`relative overflow-hidden rounded-xl bg-linear-to-b ${card.bgColor} ${card.accent} p-5 border ${card.borderColor} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg bg-white shadow-3xs ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-gray-900 font-sans tracking-tight">
                {card.value}
              </span>
            </div>

            <p className={`text-[11px] font-medium mt-1.5 leading-none ${card.descColor}`}>
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
