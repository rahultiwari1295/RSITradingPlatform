/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, ArrowUpRight, Activity, AlertTriangle, Cpu } from "lucide-react";

interface KPICardsProps {
  winRate: number;
  winRateStrong: number;
  avgReturn: number;
  openCount: number;
  closedCount: number;
  toBuyCount: number;
  stocksProcessed: number;
}

export default function KPICards({
  winRate,
  winRateStrong,
  avgReturn,
  openCount,
  closedCount,
  toBuyCount,
  stocksProcessed,
}: KPICardsProps) {
  const cards = [
    {
      id: "win-rate",
      title: "Tactical Win Rate",
      value: `${winRate.toFixed(1)}%`,
      description: `Strong WR: ${winRateStrong.toFixed(1)}%`,
      descColor: "text-emerald-700 dark:text-emerald-400 font-bold",
      icon: TrendingUp,
      bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
      borderColor: "border-emerald-100 dark:border-emerald-900/30",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      accent: "from-emerald-500/10 to-emerald-500/0",
    },
    {
      id: "avg-return",
      title: "Average Return",
      value: `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%`,
      description: `Expectancy: ${avgReturn.toFixed(2)}%`,
      descColor: avgReturn >= 0 ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-rose-600 dark:text-rose-405 font-semibold",
      icon: ArrowUpRight,
      bgColor: avgReturn >= 0 ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-rose-50/30 dark:bg-rose-950/15",
      borderColor: avgReturn >= 0 ? "border-indigo-100 dark:border-indigo-900/30" : "border-rose-100 dark:border-rose-900/30",
      iconColor: avgReturn >= 0 ? "text-indigo-500 dark:text-indigo-400" : "text-rose-500 dark:text-rose-450",
      accent: avgReturn >= 0 ? "from-indigo-500/10 to-indigo-500/0" : "from-rose-500/10 to-rose-500/0",
    },
    {
      id: "active-trades",
      title: "Active Trades",
      value: `${openCount}`,
      description: `Open: ${openCount} | Closed: ${closedCount}`,
      descColor: "text-blue-600 dark:text-blue-400 font-semibold",
      icon: Activity,
      bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
      borderColor: "border-blue-100 dark:border-blue-900/30",
      iconColor: "text-blue-500 dark:text-blue-400",
      accent: "from-blue-500/10 to-blue-500/0",
    },
    {
      id: "near-setups",
      title: "Near Setups",
      value: `${toBuyCount}`,
      description: `Signals Found: ${toBuyCount}`,
      descColor: "text-amber-700 dark:text-amber-400 font-semibold",
      icon: AlertTriangle,
      bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
      borderColor: "border-amber-100 dark:border-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-450",
      accent: "from-amber-500/10 to-amber-500/0",
    },
    {
      id: "stocks-processed",
      title: "Stocks Processed",
      value: `${stocksProcessed}`,
      description: "Active Algo Scan Range",
      descColor: "text-slate-500 dark:text-slate-400 font-medium",
      icon: Cpu,
      bgColor: "bg-slate-50/50 dark:bg-slate-900/40",
      borderColor: "border-slate-200/80 dark:border-slate-800",
      iconColor: "text-indigo-500 dark:text-indigo-400",
      accent: "from-slate-500/10 to-slate-500/0",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSpanned = card.id === "stocks-processed";
        return (
          <div
            key={card.id}
            id={`kpi-card-${card.id}`}
            className={`relative overflow-hidden rounded-xl bg-linear-to-b ${card.bgColor} ${card.accent} p-3 sm:p-4 border ${card.borderColor} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${
              isSpanned ? "col-span-2 lg:col-span-1" : "col-span-1"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider font-mono truncate">
                {card.title}
              </span>
              <div className="p-1 rounded-sm bg-white dark:bg-slate-800 shadow-3xs text-gray-500 shrink-0">
                <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
              </div>
            </div>
            
            <div className="flex items-baseline">
              <span className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-slate-50 font-sans tracking-tight leading-none">
                {card.value}
              </span>
            </div>

            <p className={`text-[10px] sm:text-[11px] mt-1.5 leading-none truncate ${card.descColor}`}>
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
