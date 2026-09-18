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
    icon: React.ComponentType<{ className?: string }>;
    count?: number | null;
    activeIconColor: string;
    badgeColor: string;
  }[] = [
    {
      id: "market",
      label: "Market",
      icon: Compass,
      count: null,
      activeIconColor: "text-cyan-400 dark:text-cyan-300",
      badgeColor: "bg-cyan-500 text-white",
    },
    {
      id: "signals",
      label: "Signals",
      icon: Zap,
      count: activeSignalsCount > 0 ? activeSignalsCount : null,
      activeIconColor: "text-emerald-400 dark:text-emerald-300",
      badgeColor: "bg-emerald-500 text-slate-950",
    },
    {
      id: "paper",
      label: "Paper",
      icon: Briefcase,
      count: portfolioCount > 0 ? portfolioCount : null,
      activeIconColor: "text-indigo-400 dark:text-indigo-300",
      badgeColor: "bg-indigo-500 text-white",
    },
  ];

  return (
    <aside
      aria-label="Bottom Navigation Capsule"
      className="fixed bottom-3.5 sm:bottom-5 left-0 right-0 z-40 pointer-events-none flex justify-center px-4"
    >
      <nav
        aria-label="Institutional Navigation Dock"
        className="pointer-events-auto relative flex items-center gap-1 p-1 rounded-full bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-[0_10px_28px_-4px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_14px_36px_-4px_rgba(0,0,0,0.65),0_3px_12px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] select-none transition-all max-w-fit"
      >
        {dockItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              id={`dock-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex items-center justify-center gap-1.5 h-9 sm:h-9.5 px-3 sm:px-3.5 rounded-full text-[11.5px] font-bold tracking-tight transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? "bg-slate-900 dark:bg-white/[0.12] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.04]"
              }`}
            >
              {/* Icon */}
              <Icon
                className={`w-4 h-4 transition-all duration-200 ${
                  isActive
                    ? `${item.activeIconColor} stroke-[2.4] scale-105`
                    : "text-slate-500 dark:text-slate-400 stroke-[1.9]"
                }`}
              />

              {/* Tab Title */}
              <span className="whitespace-nowrap select-none">
                {item.label}
              </span>

              {/* Dynamic Micro-Badge */}
              {item.count !== null && item.count !== undefined && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full font-mono text-[9px] font-black leading-none shadow-xs transition-transform ${
                    item.badgeColor
                  } ${isActive ? "scale-105" : "opacity-90"}`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default InstitutionalDock;
