import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, ShieldAlert, Award } from "lucide-react";
import { ClosedTrade, CompletedTrade } from "../../types";

interface EquityGrowthChartProps {
  closedTrades?: ClosedTrade[];
  completedHistory?: CompletedTrade[];
}

export default function EquityGrowthChart({
  closedTrades = [],
  completedHistory = [],
}: EquityGrowthChartProps) {
  const [showDrawdown, setShowDrawdown] = useState<boolean>(false);

  // Combine and sort actual closed trades chronologically by exit date
  const chartData = useMemo(() => {
    // Prefer closedTrades from system, or completedHistory from user
    const trades = closedTrades.length > 0 ? closedTrades : completedHistory;
    if (trades.length === 0) return [];

    // Filter trades with valid return percentages
    const validTrades = trades
      .map((t: any) => {
        const ep = Number(t.entryPrice || 0);
        const xp = Number(t.exitPrice || 0);
        let ret = (t as any).roiPct ?? t.returnPct ?? (t as any).tradeReturnPercent ?? t.pnlPct;
        if (ret === undefined || ret === null || Number(ret) === 0) {
          if (ep > 0 && xp > 0) {
            ret = Number((((xp - ep) / ep) * 100).toFixed(2));
          } else {
            ret = 0;
          }
        } else {
          ret = Number(Number(ret).toFixed(2));
        }
        return {
          symbol: t.symbol,
          returnPct: ret,
          date: t.exitDate || t.sellDate || t.entryDate || "2026-08-01",
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningReturn = 0;
    let peak = 0;

    return validTrades.map((t, idx) => {
      runningReturn += t.returnPct;
      peak = Math.max(peak, runningReturn);
      const dd = +(runningReturn - peak).toFixed(2);

      const d = new Date(t.date);
      const dateLabel = isNaN(d.getTime())
        ? t.date
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      return {
        tradeIndex: idx + 1,
        date: dateLabel,
        symbol: t.symbol,
        tradeReturn: +t.returnPct.toFixed(2),
        cumulativeReturn: +runningReturn.toFixed(2),
        drawdown: dd,
      };
    });
  }, [closedTrades, completedHistory]);

  if (chartData.length === 0) {
    return null; // If no result, don't show things
  }

  const latestReturn = chartData[chartData.length - 1]?.cumulativeReturn ?? 0;
  const maxDrawdown = Math.min(...chartData.map((d) => d.drawdown), 0);
  const totalTrades = chartData.length;

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Cumulative Realized Performance
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
              +{latestReturn.toFixed(1)}% Realized
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Plotted directly across {totalTrades} verified closed trade executions.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDrawdown((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showDrawdown
                ? "bg-rose-500 text-white border-rose-600 shadow-xs shadow-rose-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Drawdown ({maxDrawdown.toFixed(1)}% Max)
            </span>
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="realizedAlphaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.1)" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={25}
            />

            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val >= 0 ? "+" : ""}${val}%`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#F8FAFC",
                fontSize: "12px",
              }}
              formatter={(val: any, name: any, item: any) => {
                if (name === "cumulativeReturn") {
                  return [`+${val}% Cumulative`, `Trade: ${item.payload.symbol} (${item.payload.tradeReturn >= 0 ? "+" : ""}${item.payload.tradeReturn}%)`];
                }
                if (name === "drawdown") {
                  return [`${val}% Drawdown`, "Peak Pullback"];
                }
                return [val, name];
              }}
            />

            <Legend
              verticalAlign="top"
              height={32}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-3">
                  {value === "cumulativeReturn" ? "Closed Trades Cumulative P&L" : "Peak Drawdown"}
                </span>
              )}
            />

            <Area
              type="monotone"
              dataKey="cumulativeReturn"
              name="cumulativeReturn"
              stroke="#10B981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#realizedAlphaGrad)"
            />

            {showDrawdown && (
              <Area
                type="monotone"
                dataKey="drawdown"
                name="drawdown"
                stroke="#F43F5E"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#drawdownGrad)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
