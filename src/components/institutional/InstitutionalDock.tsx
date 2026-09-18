import React from "react";
import { Compass, Zap, Briefcase } from "lucide-react";

export type DockTabId = "market" | "signals" | "paper" | "overview";

interface InstitutionalDockProps {
  activeTab: DockTabId;
  onTabChange: (tab: DockTabId) => void;
  activeSignalsCount?: number;
  closedTradesCount?: number;
  portfolioCount?: number;
}

export const InstitutionalDock: React.FC<InstitutionalDockProps> = ({
  activeTab,
  onTabChange,
  activeSignalsCount = 0,
  portfolioCount = 0,
}) => {
  const dockItems: {
    id: "market" | "signals" | "paper";
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | null;
    countColor?: string;
    pulseDot?: boolean;
    activeGlow: string;
    activeText: string;
  }[] = [
    {
      id: "market",
      label: "Market",
      sublabel: "News & Sectors",
      icon: Compass,
      count: null,
      pulseDot: false,
      activeGlow: "from-indigo-600 via-blue-600 to-cyan-600 shadow-cyan-500/25",
      activeText: "text-cyan-600 dark:text-cyan-400",
    },
    {
      id: "signals",
      label: "Signals",
      sublabel: "Active & Closed",
      icon: Zap,
      count: activeSignalsCount > 0 ? activeSignalsCount : null,
      countColor: "bg-emerald-500 text-white",
      pulseDot: activeSignalsCount > 0,
      activeGlow: "from-emerald-600 via-teal-600 to-cyan-600 shadow-emerald-500/25",
      activeText: "text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "paper",
      label: "Paper Desk",
      sublabel: "Simulated P&L",
      icon: Briefcase,
      count: portfolioCount > 0 ? portfolioCount : null,
      countColor: "bg-indigo-500 text-white",
      pulseDot: false,
      activeGlow: "from-violet-600 via-indigo-600 to-blue-600 shadow-indigo-500/25",
      activeText: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <div className="fixed bottom-3 sm:bottom-5 left-0 right-0 z-40 pointer-events-none flex justify-center px-3 sm:px-4">
      <nav
        aria-label="Institutional Navigation Dock"
        className="pointer-events-auto relative flex items-center justify-between gap-1 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-2xl border border-slate-300/90 dark:border-white/[0.12] shadow-[0_12px_36px_-6px_rgba(15,23,42,0.16),0_4px_16px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.7),0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] w-full max-w-[400px] select-none transition-all pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        {dockItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 px-2 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 group ${
                isActive
                  ? "bg-slate-900 dark:bg-white/[0.1] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`p-1 rounded-lg transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover:scale-105"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive
                        ? "text-cyan-300 dark:text-cyan-400 stroke-[2.4]"
                        : "stroke-[1.8]"
                    }`}
                  />
                </div>

                {/* Micro notification / count badge */}
                {item.count !== null && item.count !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2.5 px-1.5 py-0.2 rounded-full font-mono text-[9.5px] font-black leading-tight shadow-xs ${
                      item.countColor || "bg-emerald-500 text-white"
                    } ${item.pulseDot ? "ring-2 ring-emerald-500/30" : ""}`}
                  >
                    {item.count}
                  </span>
                )}
              </div>

              {/* Label */}
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[11px] sm:text-[11.5px] tracking-tight font-extrabold transition-colors ${
                    isActive
                      ? "text-white dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {item.label}
                </span>
                {item.pulseDot && !item.count && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>

              {/* Active Indicator Micro-glow bar */}
              {isActive && (
                <span
                  className={`absolute -bottom-0.5 w-6 h-0.5 rounded-full bg-gradient-to-r ${item.activeGlow}`}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default InstitutionalDock;
