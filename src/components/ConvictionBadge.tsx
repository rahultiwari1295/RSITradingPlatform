/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Zap } from "lucide-react";

interface ConvictionBadgeProps {
  strategyName?: string;
  alsoTriggeredBy?: string[];
  compact?: boolean;
}

export default function ConvictionBadge({ strategyName, alsoTriggeredBy, compact = false }: ConvictionBadgeProps) {
  const name = strategyName || "Unknown Strategy";
  const hasConviction = alsoTriggeredBy && alsoTriggeredBy.length > 0;
  
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">
        {name}
      </span>
      {hasConviction && (
        <div className="relative group inline-block w-max">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300/50 dark:border-amber-700/50 shadow-[0_0_8px_rgba(251,191,36,0.3)] dark:shadow-[0_0_8px_rgba(251,191,36,0.15)] cursor-help transition-all group-hover:scale-105">
            <Zap className="w-2.5 h-2.5" />
            {alsoTriggeredBy.length + 1}x<span className="hidden sm:inline"> Conviction</span>
          </span>
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:flex flex-col w-max max-w-[200px] bg-slate-900 dark:bg-slate-800 text-slate-100 text-[10px] p-2 rounded shadow-xl border border-slate-700 z-50">
            <span className="font-bold text-slate-300 mb-1 border-b border-slate-700 pb-1">Aligned Strategies:</span>
            <span className="text-emerald-400">• {name}</span>
            {alsoTriggeredBy.map((s, i) => (
              <span key={i}>• {s}</span>
            ))}
            <div className="absolute left-4 top-full w-2 h-2 bg-slate-900 dark:bg-slate-800 border-b border-r border-slate-700 transform rotate-45 -translate-y-1"></div>
          </div>
        </div>
      )}
    </div>
  );
}
