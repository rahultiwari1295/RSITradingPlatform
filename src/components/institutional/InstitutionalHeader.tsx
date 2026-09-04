import React, { useState, useEffect } from "react";
import { Activity, Clock, Cpu, Search } from "lucide-react";

interface InstitutionalHeaderProps {
  activeCount: number;
  toBuyCount: number;
  closedCount: number;
  winRate: number;
  profitFactor: number;
  totalReturn: number;
  lastSyncedAt?: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function InstitutionalHeader({
  activeCount,
  toBuyCount,
  closedCount,
  winRate,
  profitFactor,
  totalReturn,
  lastSyncedAt,
  searchQuery,
  onSearchChange,
}: InstitutionalHeaderProps) {
  const [istTime, setIstTime] = useState<string>("");
  const [marketPhase, setMarketPhase] = useState<{ label: string; color: string }>({
    label: "LIVE",
    color: "bg-emerald-400",
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istString = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setIstTime(istString);

      const istHour = Number(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })
      );
      const istMinute = Number(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", minute: "numeric" })
      );
      const totalMinutes = istHour * 60 + istMinute;
      const day = now.getDay();
      const isWeekday = day >= 1 && day <= 5;

      if (!isWeekday) {
        setMarketPhase({ label: "WEEKEND", color: "bg-slate-400" });
      } else if (totalMinutes >= 555 && totalMinutes < 930) {
        setMarketPhase({ label: "LIVE", color: "bg-emerald-400" });
      } else if (totalMinutes >= 930 && totalMinutes < 960) {
        setMarketPhase({ label: "CLOSING", color: "bg-amber-400" });
      } else {
        setMarketPhase({ label: "CLOSED", color: "bg-slate-400" });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const kpiItems = [
    { label: "Signals", value: toBuyCount, color: "text-amber-500 dark:text-amber-400" },
    { label: "Active", value: activeCount, color: "text-emerald-500 dark:text-emerald-400" },
    { label: "Win Rate", value: winRate > 0 ? `${winRate.toFixed(0)}%` : "—", color: "text-cyan-500 dark:text-cyan-400" },
    { label: "PF", value: profitFactor > 0 ? `${profitFactor.toFixed(1)}x` : "—", color: "text-violet-500 dark:text-violet-400" },
    { label: "Return", value: totalReturn !== 0 ? `${totalReturn > 0 ? "+" : ""}${Math.round(totalReturn)}%` : "—", color: totalReturn >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400" },
    { label: "Closed", value: closedCount > 0 ? closedCount : "—", color: "text-slate-600 dark:text-slate-300" },
  ];

  return (
    <div className="space-y-3 animate-fade-in-up">
      {/* Compact Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-[#0D1017] to-slate-950 text-white border border-white/[0.06]" style={{ boxShadow: '0 4px 24px -4px rgba(0,0,0,0.3)' }}>
        {/* Subtle ambient glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top row: Status + Time + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                <span className={`w-1.5 h-1.5 rounded-full ${marketPhase.color} animate-pulse`} />
                {marketPhase.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.06] text-slate-300 border border-white/[0.06]">
                <Clock className="w-3 h-3 text-cyan-400" />
                {istTime || "—"} IST
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                <Cpu className="w-3 h-3" />
                Engine Active
              </span>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search symbol..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] focus:bg-white/[0.12] text-xs text-white placeholder:text-slate-500 border border-white/[0.06] focus:border-cyan-400/40 outline-none transition-all"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-lg sm:text-xl font-black tracking-tight mb-0.5">
            QuantSync Trading Terminal
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">
            Real-time algorithmic signals with ML scoring & automated trailing stops
          </p>

          {/* KPI Ribbon — Compact horizontal pills */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            {kpiItems.map((kpi) => (
              <div
                key={kpi.label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">{kpi.label}</span>
                <span className={`text-sm font-black font-mono tabular ${kpi.color}`}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
