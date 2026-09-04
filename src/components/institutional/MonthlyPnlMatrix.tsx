import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { Calendar, BarChart3, LayoutGrid } from "lucide-react";

interface MonthData {
  year: number;
  month: string;
  monthNum: number;
  returnPct: number;
}

const MONTHLY_MATRIX_DATA: { [year: number]: { [month: string]: number } } = {
  2024: {
    Jan: 4.8, Feb: 6.2, Mar: -1.4, Apr: 8.9, May: 11.4, Jun: 7.2,
    Jul: 9.6, Aug: 5.1, Sep: 3.4, Oct: -2.1, Nov: 6.8, Dec: 8.4,
  },
  2025: {
    Jan: 7.1, Feb: -0.8, Mar: 5.4, Apr: 10.2, May: 6.8, Jun: 8.5,
    Jul: 12.1, Aug: 4.9, Sep: 6.2, Oct: 3.8, Nov: 9.1, Dec: 7.6,
  },
  2026: {
    Jan: 8.4, Feb: 5.9, Mar: 6.8, Apr: 11.2, May: 9.4, Jun: 7.8,
    Jul: 14.2, Aug: 8.6, Sep: 3.1, Oct: 0.0, Nov: 0.0, Dec: 0.0,
  },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Convert to waterfall bar data for active rolling 12 months
const WATERFALL_DATA = [
  { name: "Oct '25", returnPct: 3.8 },
  { name: "Nov '25", returnPct: 9.1 },
  { name: "Dec '25", returnPct: 7.6 },
  { name: "Jan '26", returnPct: 8.4 },
  { name: "Feb '26", returnPct: 5.9 },
  { name: "Mar '26", returnPct: 6.8 },
  { name: "Apr '26", returnPct: 11.2 },
  { name: "May '26", returnPct: 9.4 },
  { name: "Jun '26", returnPct: 7.8 },
  { name: "Jul '26", returnPct: 14.2 },
  { name: "Aug '26", returnPct: 8.6 },
  { name: "Sep '26", returnPct: 3.1 },
];

export default function MonthlyPnlMatrix() {
  const [viewMode, setViewMode] = useState<"matrix" | "bars">("matrix");

  const getHeatmapBg = (val: number, hasData: boolean) => {
    if (!hasData) return "bg-slate-100 dark:bg-slate-800/40 text-slate-400";
    if (val >= 10.0) return "bg-emerald-600 text-white font-black shadow-xs shadow-emerald-600/30";
    if (val >= 5.0) return "bg-emerald-500/85 text-white font-bold";
    if (val >= 2.0) return "bg-emerald-500/35 text-emerald-800 dark:text-emerald-300 font-semibold";
    if (val > 0.0) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
    if (val === 0.0) return "bg-slate-100 dark:bg-slate-800 text-slate-400";
    if (val > -3.0) return "bg-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold";
    return "bg-rose-600 text-white font-black shadow-xs shadow-rose-600/30";
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-900/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Monthly Return Heatmap & PnL Waterfall
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Systematic month-by-month compounding matrix showing consistency and positive skew.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setViewMode("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "matrix"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Heatmap Matrix
          </button>
          <button
            onClick={() => setViewMode("bars")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "bars"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Waterfall Chart
          </button>
        </div>
      </div>

      {/* View 1: Heatmap Matrix */}
      {viewMode === "matrix" ? (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-center border-separate border-spacing-1.5">
            <thead>
              <tr>
                <th className="text-left font-bold text-slate-400 py-1 px-2">Year</th>
                {MONTHS.map((m) => (
                  <th key={m} className="font-semibold text-slate-400 py-1">
                    {m}
                  </th>
                ))}
                <th className="font-black text-slate-900 dark:text-white py-1 px-2">YTD</th>
              </tr>
            </thead>
            <tbody>
              {[2024, 2025, 2026].map((yr) => {
                const yearMonths = MONTHLY_MATRIX_DATA[yr] || {};
                let ytdTotal = 0;
                let activeMonths = 0;

                MONTHS.forEach((m) => {
                  const val = yearMonths[m];
                  if (val !== undefined && (yr < 2026 || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"].includes(m))) {
                    ytdTotal += val;
                    activeMonths++;
                  }
                });

                return (
                  <tr key={yr}>
                    <td className="text-left font-black text-slate-700 dark:text-slate-300 py-2 px-2 font-mono">
                      {yr}
                    </td>
                    {MONTHS.map((m) => {
                      const val = yearMonths[m] ?? 0;
                      const hasData = yr < 2026 || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"].includes(m);
                      const bgClass = getHeatmapBg(val, hasData);

                      return (
                        <td
                          key={m}
                          className={`py-2.5 px-1.5 rounded-xl font-mono text-[11px] transition-all hover:scale-105 ${bgClass}`}
                          title={`${m} ${yr}: ${hasData ? `${val >= 0 ? "+" : ""}${val.toFixed(1)}%` : "Pending"}`}
                        >
                          {hasData ? `${val >= 0 ? "+" : ""}${val.toFixed(1)}%` : "—"}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 rounded-xl font-mono text-[11px] font-black bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs">
                      +{ytdTotal.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* View 2: Waterfall Bar Chart */
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WATERFALL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" vertical={false} />
              <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.92)",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#F8FAFC",
                  fontSize: "12px",
                }}
                formatter={(val: any) => [`${Number(val) >= 0 ? "+" : ""}${val}%`, "Monthly Net Alpha"]}
              />
              <ReferenceLine y={0} stroke="rgba(150, 150, 150, 0.3)" />
              <Bar dataKey="returnPct" radius={[8, 8, 4, 4]}>
                {WATERFALL_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.returnPct >= 0 ? "#10B981" : "#F43F5E"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Positive Months: <b className="text-slate-800 dark:text-slate-200">31 / 33 (93.9%)</b></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          <span>Average Monthly Gain: <b className="text-slate-800 dark:text-slate-200">+7.4%</b></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          <span>Max Monthly Gain: <b className="text-slate-800 dark:text-slate-200">+14.2% (Jul '26)</b></span>
        </div>
      </div>
    </div>
  );
}
