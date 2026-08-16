import React from "react";
import { TrendingUp, Briefcase, Sliders, LineChart, Layers } from "lucide-react";

export type TabType = "signals" | "strategies" | "portfolio" | "backtest";

interface BottomNavBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  needsAttentionCount?: number;
}

export default function BottomNavBar({
  activeTab,
  onSelectTab,
  needsAttentionCount = 0
}: BottomNavBarProps) {
  const items: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "signals", label: "Signals", icon: TrendingUp },
    { id: "strategies", label: "Strategies", icon: Layers },
    { id: "portfolio", label: "Portfolio", icon: Briefcase },
    { id: "backtest", label: "Backtests", icon: LineChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[84px] sm:h-[90px] pt-2 pb-[20px] sm:pb-[22px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-[#ECEEF2] dark:border-slate-800 z-50 flex items-center justify-around select-none transition-colors">
      <div className="w-full max-w-lg mx-auto flex items-center justify-around px-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isActive ? "text-[#14151A] dark:text-slate-100 font-bold" : "text-[#B3B5C0] dark:text-slate-500 font-medium"
              }`}
            >
              <div
                className={`w-[36px] h-[34px] rounded-[12px] flex items-center justify-center relative transition-all ${
                  isActive ? "bg-[#F1F2F5] dark:bg-slate-800 shadow-3xs" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#14151A] dark:text-slate-100" : "text-[#B3B5C0] dark:text-slate-500"}`} />
                {item.id === "portfolio" && needsAttentionCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F04438] text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                    {needsAttentionCount}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
