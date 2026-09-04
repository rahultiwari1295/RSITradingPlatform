import React from "react";
import { LayoutGrid, Sparkles } from "lucide-react";

export type UIMode = "old" | "new";

interface UIModeSwitchProps {
  mode: UIMode;
  onChange: (mode: UIMode) => void;
}

export default function UIModeSwitch({ mode, onChange }: UIModeSwitchProps) {
  return (
    <div
      role="group"
      aria-label="UI Mode Selector"
      className="relative flex items-center p-0.5 sm:p-1 rounded-full bg-slate-200/70 dark:bg-slate-800/80 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-inner"
    >
      {/* Classic (Old) Switch Button */}
      <button
        type="button"
        onClick={() => onChange("old")}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          mode === "old"
            ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-xs scale-[1.02]"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
        title="Switch to Classic Editorial Fintech UI"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Classic</span>
        <span className="text-[10px] opacity-70 font-normal hidden sm:inline">(Old)</span>
      </button>

      {/* Institutional (New) Switch Button */}
      <button
        type="button"
        onClick={() => onChange("new")}
        className={`relative z-10 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          mode === "new"
            ? "text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-xs shadow-emerald-500/25 scale-[1.02]"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
        title="Switch to Institutional iOS Trading Terminal (Gold Data Charts)"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span>Institutional</span>
        <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded-full bg-amber-400/30 text-amber-200 border border-amber-300/40">
          New
        </span>
      </button>
    </div>
  );
}
