import React from "react";
import { Home, TrendingUp, Briefcase, BarChart3, Clock } from "lucide-react";

export type TabType = "home" | "signals" | "portfolio" | "backtest";

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
    { id: "home", label: "Desk", icon: Home },
    { id: "signals", label: "Signals", icon: TrendingUp },
    { id: "portfolio", label: "Portfolio", icon: Briefcase },
    { id: "backtest", label: "Playbook", icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/75 dark:bg-[#141416]/85 backdrop-blur-[24px] saturate-[180%] border-t border-[rgba(60,60,67,0.10)] dark:border-[rgba(255,255,255,0.08)] select-none transition-colors pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
      <div className="w-full max-w-[430px] md:max-w-2xl lg:max-w-4xl mx-auto flex items-center justify-around px-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 transition-all cursor-pointer qs-btn-press ${
                isActive ? "text-[#0A84FF] scale-105" : "text-[#A2A6AE] dark:text-[#636366] hover:text-[#6B7079] dark:hover:text-[#98989F]"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-6 h-6 transition-transform duration-200 ${isActive ? "stroke-[#0A84FF] stroke-[2.4]" : "stroke-current stroke-[2]"}`} />
                {item.id === "portfolio" && needsAttentionCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#FF453A] text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                    {needsAttentionCount}
                  </span>
                )}
              </div>
              <span className={`text-[10.5px] tracking-tight ${isActive ? "font-extrabold text-[#0A84FF]" : "font-semibold"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

