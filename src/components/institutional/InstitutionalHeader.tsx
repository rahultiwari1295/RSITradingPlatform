import React, { useState, useEffect } from "react";
import { Clock, Cpu, Search, CheckCircle2, XCircle, BookOpen, Newspaper, Layers } from "lucide-react";

interface InstitutionalHeaderProps {
  // Active metrics
  activeCount: number;
  activeWinRate?: number;
  activeProfitFactor?: number;
  activeAvgReturn?: number;
  activeWinCount?: number;
  activeLossCount?: number;

  // Closed metrics
  closedCount: number;
  closedWinRate?: number;
  closedProfitFactor?: number;
  closedAvgReturn?: number;
  closedWinCount?: number;
  closedLossCount?: number;

  // Portfolio / Log count
  portfolioCount?: number;

  // Tab & search controls
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  signalsMode?: "active" | "closed";
  onSignalsModeChange?: (mode: "active" | "closed") => void;
  marketSubTab?: "news" | "sectors";
  onMarketSubTabChange?: (subTab: "news" | "sectors") => void;
  newsCount?: number;
  sectorsCount?: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lastSyncedAt?: string | null;
  engineVersion?: string;
}

export default function InstitutionalHeader({
  activeCount,
  activeWinRate = 0,
  activeProfitFactor = 0,
  activeAvgReturn = 0,
  activeWinCount = 0,
  activeLossCount = 0,
  closedCount,
  closedWinRate = 0,
  closedProfitFactor = 0,
  closedAvgReturn = 0,
  closedWinCount = 0,
  closedLossCount = 0,
  portfolioCount = 0,
  activeTab = "market",
  onTabChange,
  signalsMode = "active",
  onSignalsModeChange,
  marketSubTab = "news",
  onMarketSubTabChange,
  newsCount,
  sectorsCount,
  searchQuery,
  onSearchChange,
  engineVersion = "v2",
}: InstitutionalHeaderProps) {
  const isClosedMode = signalsMode === "closed";

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

  // Selected values based on signals mode
  const currentCount = isClosedMode ? closedCount : activeCount;
  const currentWinRate = isClosedMode ? closedWinRate : activeWinRate;
  const currentPF = isClosedMode ? closedProfitFactor : activeProfitFactor;
  const currentAvgReturn = isClosedMode ? closedAvgReturn : activeAvgReturn;
  const currentWins = isClosedMode ? closedWinCount : activeWinCount;
  const currentLosses = isClosedMode ? closedLossCount : activeLossCount;

  // 6 Main KPI Cards — strict clean layout with pure values
  const kpis = [
    {
      label: isClosedMode ? "CLOSED" : "ACTIVE",
      value: currentCount,
      color: "text-slate-900 dark:text-white",
    },
    {
      label: "WIN RATE",
      value: `${currentWinRate.toFixed(1)}%`,
      color: "text-cyan-600 dark:text-cyan-400",
    },
    {
      label: "PF",
      value: currentPF > 0 ? `${currentPF.toFixed(1)}x` : "—",
      color: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "AVG RETURN",
      value: `${currentAvgReturn >= 0 ? "+" : ""}${currentAvgReturn.toFixed(1)}%`,
      color: currentAvgReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
    },
    {
      label: "WIN COUNT",
      value: currentWins,
      color: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    {
      label: "LOSS COUNT",
      value: currentLosses,
      color: "text-rose-600 dark:text-rose-400",
      icon: XCircle,
    },
  ];

  return (
    <div className="animate-fade-in-up">
      {/* Precision Metal Header Container */}
      <div className="relative overflow-hidden rounded-2xl p-3 sm:p-4 transition-all duration-200 bg-gradient-to-b from-white via-[#f7f8fa] to-[#eaedf3] border border-[#cbd3df] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_16px_-2px_rgba(15,23,42,0.08)] dark:bg-gradient-to-br dark:from-slate-900 dark:via-[#0D1017] dark:to-slate-950 dark:border-white/[0.06] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)] text-slate-900 dark:text-white">
        {/* Top Control Bar: Left: Closed/Live Status & Time | Right: How to Use */}
        <div className={`flex items-center justify-between gap-2.5 ${(activeTab === "signals" || activeTab === "market") ? "pb-2.5 border-b border-slate-200/70 dark:border-white/[0.06]" : ""}`}>
          {/* Left: Status Badges (Closed / Time / V2) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live/Closed Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shadow-2xs">
              <span className={`w-1.5 h-1.5 rounded-full ${marketPhase.color} animate-pulse`} />
              {marketPhase.label}
            </span>

            {/* IST Clock */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-white/[0.06] shadow-2xs">
              <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              {istTime || "—"} IST
            </span>

            {/* Engine Tag */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              <Cpu className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Institutional
            </span>
          </div>

          {/* Right: How to Use button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onTabChange?.("overview")}
              title="Click to read the simple beginner guide: How we select stocks, daily 3:15 PM routine, paper trading, and exit rules."
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-tight transition-all cursor-pointer shadow-xs active:scale-95 ${
                activeTab === "overview"
                  ? "bg-indigo-600 text-white border border-indigo-600 shadow-indigo-500/25 ring-2 ring-indigo-500/30"
                  : "bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/90 dark:bg-white/[0.06] dark:hover:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-500/30"
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${activeTab === "overview" ? "text-white" : "text-indigo-600 dark:text-indigo-400"} shrink-0`} />
              <span>How to Use</span>
            </button>
          </div>
        </div>

        {/* ─── WHEN MARKET DESK IS ACTIVE: Show NEWS vs SECTOR ROTATION segmented switch ─── */}
        {activeTab === "market" && (
          <div className="flex items-center gap-2 pt-2.5">
            <button
              type="button"
              onClick={() => onMarketSubTabChange?.("news")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                marketSubTab === "news"
                  ? "bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-500/25 ring-2 ring-purple-500/30 dark:bg-purple-500 dark:text-white dark:border-purple-400"
                  : "bg-purple-50/80 hover:bg-purple-100 text-purple-900 border-purple-200/90 dark:bg-purple-950/40 dark:hover:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/50"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>NEWS</span>
              {typeof newsCount === "number" && (
                <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10.5px] font-bold ${
                  marketSubTab === "news" ? "bg-white/25 text-white dark:bg-black/20 dark:text-white" : "bg-purple-100/90 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300"
                }`}>
                  {newsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onMarketSubTabChange?.("sectors")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                marketSubTab === "sectors"
                  ? "bg-cyan-600 text-white border-cyan-700 shadow-sm shadow-cyan-500/25 ring-2 ring-cyan-500/30 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-400"
                  : "bg-cyan-50/80 hover:bg-cyan-100 text-cyan-900 border-cyan-200/90 dark:bg-cyan-950/40 dark:hover:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>SECTOR ROTATION</span>
              {typeof sectorsCount === "number" && (
                <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10.5px] font-bold ${
                  marketSubTab === "sectors" ? "bg-white/25 text-white dark:bg-black/20 dark:text-slate-950" : "bg-cyan-100/90 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300"
                }`}>
                  {sectorsCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ─── WHEN SIGNALS DESK IS ACTIVE: Show Sub-Toggle, Search & 6-Metric Ribbon ─── */}
        {activeTab === "signals" && (
          <>
            {/* Segmented Switch: Active Positions vs Closed Ledger */}
            <div className="flex items-center gap-2 pt-2.5">
              <button
                type="button"
                onClick={() => onSignalsModeChange?.("active")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  signalsMode === "active"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-500/30 dark:bg-emerald-500 dark:text-slate-950 dark:border-emerald-400"
                    : "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-200/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${signalsMode === "active" ? "bg-white animate-pulse" : "bg-emerald-500"}`} />
                <span>Active Signals</span>
                <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10.5px] font-bold ${
                  signalsMode === "active" ? "bg-white/25 text-white dark:bg-black/20 dark:text-slate-950" : "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                }`}>
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSignalsModeChange?.("closed")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  signalsMode === "closed"
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25 ring-2 ring-amber-500/30 dark:bg-amber-400 dark:text-slate-950 dark:border-amber-300"
                    : "bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-200/90 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${signalsMode === "closed" ? "bg-white" : "bg-amber-500"}`} />
                <span>Closed Ledger</span>
                <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10.5px] font-bold ${
                  signalsMode === "closed" ? "bg-white/25 text-white dark:bg-black/20 dark:text-slate-950" : "bg-amber-100/90 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                }`}>
                  {closedCount}
                </span>
              </button>
            </div>

            {/* Clean Search Bar */}
            <div className="relative w-full my-2.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={`Search ${signalsMode === "active" ? "active positions" : "closed trades"} by symbol or strategy...`}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-white/90 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] focus:bg-white text-xs text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-300/90 dark:border-white/[0.08] focus:border-cyan-500 dark:focus:border-cyan-400 outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Bottom: 6-Metric High-Precision Metallic Ribbon */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2 pt-2 border-t border-slate-300/70 dark:border-white/[0.06]">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.label}
                    className="flex flex-col justify-between p-2 sm:p-2.5 rounded-xl bg-white/85 dark:bg-white/[0.03] border border-slate-200/90 dark:border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-none hover:border-slate-300 dark:hover:border-white/[0.1] transition-all"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9.5px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 truncate">
                        {kpi.label}
                      </span>
                      {Icon && <Icon className={`w-3 h-3 ${kpi.color} opacity-80 shrink-0`} />}
                    </div>

                    <div className="mt-0.5">
                      <span className={`text-base sm:text-xl font-black font-mono tabular tracking-tight leading-none ${kpi.color}`}>
                        {kpi.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

