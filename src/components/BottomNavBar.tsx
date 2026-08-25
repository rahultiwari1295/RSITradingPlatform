import React from "react";
import { Home, Activity, TrendingUp, Briefcase, BarChart3 } from "lucide-react";

export type TabType = "home" | "market" | "signals" | "portfolio" | "backtest";

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
    { id: "market", label: "Market", icon: Activity },
    { id: "signals", label: "Signals", icon: TrendingUp },
    { id: "portfolio", label: "Portfolio", icon: Briefcase },
    { id: "backtest", label: "Playbook", icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-[#14161E]/90 backdrop-blur-md border-t border-[#ECEEF2] dark:border-white/[0.08] select-none transition-colors pb-[max(12px,env(safe-area-inset-bottom))] pt-2.5">
      <div className="w-full max-w-[430px] md:max-w-2xl lg:max-w-4xl mx-auto flex items-center justify-around px-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 transition-all cursor-pointer qs-btn-press ${
                isActive ? "text-[#14151A] dark:text-white" : "text-[#8B8D98] hover:text-[#56586A] dark:hover:text-slate-300"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <div className={`p-1.5 rounded-[12px] transition-colors ${isActive ? "bg-[#F1F2F5] dark:bg-white/10" : ""}`}>
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                </div>
                {item.id === "portfolio" && needsAttentionCount > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-4 h-4 rounded-full bg-[#F04438] text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs font-mono">
                    {needsAttentionCount}
                  </span>
                )}
              </div>
              <span className={`text-[11px] tracking-tight ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
