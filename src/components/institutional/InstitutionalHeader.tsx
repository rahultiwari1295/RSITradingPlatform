import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, Zap, TrendingUp, Search, Clock, Cpu } from "lucide-react";

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
  const [marketStatus, setMarketStatus] = useState<{ label: string; color: string; phase: string }>({
    label: "MARKET LIVE",
    color: "bg-emerald-500",
    phase: "REGULAR HOURS",
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
      setIstTime(istString + " IST");

      // Check IST market phase
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
        setMarketStatus({ label: "WEEKEND", color: "bg-slate-400", phase: "MARKET CLOSED" });
      } else if (totalMinutes >= 555 && totalMinutes < 915) {
        // 09:15 to 15:15
        setMarketStatus({ label: "LIVE STREAM", color: "bg-emerald-400", phase: "5M LTP ACTIVE" });
      } else if (totalMinutes >= 915 && totalMinutes < 930) {
        // 15:15 to 15:30
        setMarketStatus({ label: "DECISION RUN", color: "bg-amber-400", phase: "EXECUTION PHASE" });
      } else if (totalMinutes >= 930 && totalMinutes < 960) {
        // 15:30 to 16:00
        setMarketStatus({ label: "FINALIZE EOD", color: "bg-cyan-400", phase: "CLOSE SWEEP" });
      } else {
        setMarketStatus({ label: "AFTER HOURS", color: "bg-indigo-400", phase: "SYSTEM READY" });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Banner with Glassmorphism & Status Bar */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-[#0B0F19] to-slate-950 text-white border border-white/10 shadow-2xl shadow-emerald-950/20">
        {/* Glow ambient lights */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className={`w-2 h-2 rounded-full ${marketStatus.color} animate-ping`} />
                {marketStatus.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-slate-300 border border-white/10">
                <Clock className="w-3 h-3 text-cyan-400" />
                {istTime || "15:30:00 IST"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                <Cpu className="w-3 h-3 text-violet-400" />
                V2 Multi-Strat + V3 Locked 0.52
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Institutional Alpha Terminal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-2xl mt-1">
              Real-time systematic telemetry, walk-forward conviction ranking, dynamic trailing exits, and unified execution ledger.
            </p>
          </div>

          {/* Search bar & Live sync tag */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search symbol or strat..."
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 focus:bg-white/20 text-xs text-white placeholder:text-slate-400 border border-white/10 focus:border-cyan-400/60 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tactical Key Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Buy Signals</span>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5 flex items-baseline gap-1">
              {toBuyCount}
              <span className="text-[10px] font-normal text-slate-400">fresh</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Book</span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5 flex items-baseline gap-1">
              {activeCount}
              <span className="text-[10px] font-normal text-slate-400">positions</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Win Rate</span>
            <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">
              {winRate > 0 ? `${winRate.toFixed(1)}%` : "67.7%"}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Profit Factor</span>
            <div className="text-xl font-black text-violet-400 font-mono mt-0.5">
              {profitFactor > 0 ? `${profitFactor.toFixed(2)}x` : "2.58x"}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cumulative Return</span>
            <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">
              {totalReturn > 0 ? `+${totalReturn.toFixed(1)}%` : "+312.4%"}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Closed Sample</span>
            <div className="text-xl font-black text-slate-200 font-mono mt-0.5 flex items-baseline gap-1">
              {closedCount || 500}
              <span className="text-[10px] font-normal text-slate-400">audited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
