/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, ArrowUpRight, Activity, AlertTriangle, Coins, Target } from "lucide-react";

interface KPICardsProps {
  winRate: number;
  avgReturn: number;
  profitFactor: number;
  openCount: number;
  closedCount: number;
  toBuyCount: number;
}

export default function KPICards({
  winRate,
  avgReturn,
  profitFactor,
  openCount,
  closedCount,
  toBuyCount,
}: KPICardsProps) {
  const isHighConviction = profitFactor > 2.0;

  const cards = [
    {
      id: "win-rate",
      title: "Global Win Rate",
      value: `${winRate.toFixed(1)}%`,
      description: `Across all trades`,
      descColor: "text-emerald-700 dark:text-emerald-400 font-bold",
      icon: Target,
      bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
      borderColor: "border-emerald-100 dark:border-emerald-900/30",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      accent: "from-emerald-500/10 to-emerald-500/0",
    },
    {
      id: "avg-return",
      title: "Average Return",
      value: `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(2)}%`,
      description: `Expectancy per trade`,
      descColor: avgReturn >= 0 ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-rose-600 dark:text-rose-405 font-semibold",
      icon: ArrowUpRight,
      bgColor: avgReturn >= 0 ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-rose-50/30 dark:bg-rose-950/15",
      borderColor: avgReturn >= 0 ? "border-indigo-100 dark:border-indigo-900/30" : "border-rose-100 dark:border-rose-900/30",
      iconColor: avgReturn >= 0 ? "text-indigo-500 dark:text-indigo-400" : "text-rose-500 dark:text-rose-450",
      accent: avgReturn >= 0 ? "from-indigo-500/10 to-indigo-500/0" : "from-rose-500/10 to-rose-500/0",
    },
    {
      id: "profit-factor",
      title: "Profit Factor",
      value: profitFactor.toFixed(2),
      description: isHighConviction ? "Exceptional Edge" : "Steady Edge",
      descColor: isHighConviction ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-semibold",
      icon: TrendingUp,
      bgColor: isHighConviction ? "bg-amber-50/50 dark:bg-amber-950/20" : "bg-emerald-50/50 dark:bg-emerald-950/20",
      borderColor: isHighConviction ? "border-amber-300 dark:border-amber-700/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] dark:shadow-[0_0_15px_rgba(251,191,36,0.05)]" : "border-emerald-100 dark:border-emerald-900/30",
      iconColor: isHighConviction ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400",
      accent: isHighConviction ? "from-amber-500/15 to-amber-500/0" : "from-emerald-500/10 to-emerald-500/0",
    },
    {
      id: "active-trades",
      title: "Active Trades",
      value: `${openCount}`,
      description: `Historical closed: ${closedCount}`,
      descColor: "text-blue-600 dark:text-blue-400 font-semibold",
      icon: Activity,
      bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
      borderColor: "border-blue-100 dark:border-blue-900/30",
      iconColor: "text-blue-500 dark:text-blue-400",
      accent: "from-blue-500/10 to-blue-500/0",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={`kpi-card-${card.id}`}
            className={`relative overflow-hidden rounded-xl bg-linear-to-b ${card.bgColor} ${card.accent} p-2.5 sm:p-3 border ${card.borderColor} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs`}
          >
            <div className="flex items-center justify-between mb-1 sm:mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider font-mono truncate">
                {card.title}
              </span>
              <div className={`p-1 rounded-sm bg-white dark:bg-slate-800 shadow-3xs shrink-0 ${card.iconColor}`}>
                <Icon className={`w-3 h-3`} />
              </div>
            </div>
            
            <div className="flex items-baseline">
              <span className="text-lg sm:text-xl font-bold text-gray-950 dark:text-slate-50 font-sans tracking-tight leading-none">
                {card.value}
              </span>
            </div>

            <p className={`text-[9px] sm:text-[10px] mt-1 leading-none truncate ${card.descColor}`}>
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
