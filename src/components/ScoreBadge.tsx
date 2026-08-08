/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";

interface ScoreBadgeProps {
  compositeScore?: number;
  technicalScore?: number;
  riskScore?: number;
  confidence?: number;
  compact?: boolean;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800/50", ring: "ring-amber-400/30" };
  if (score >= 65) return { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/50", ring: "ring-emerald-400/30" };
  if (score >= 50) return { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800/50", ring: "ring-blue-400/30" };
  if (score >= 35) return { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800/50", ring: "ring-orange-400/30" };
  return { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800/50", ring: "ring-rose-400/30" };
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Elite";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Good";
  if (score >= 35) return "Fair";
  return "Weak";
};

const getRiskLabel = (score: number) => {
  if (score <= 25) return { label: "Low", color: "text-emerald-600 dark:text-emerald-400" };
  if (score <= 50) return { label: "Med", color: "text-amber-600 dark:text-amber-400" };
  return { label: "High", color: "text-rose-600 dark:text-rose-400" };
};

export default function ScoreBadge({ compositeScore, technicalScore, riskScore, confidence, compact }: ScoreBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (compositeScore == null && technicalScore == null) {
    return null;
  }

  const primaryScore = compositeScore ?? technicalScore ?? 0;
  const colors = getScoreColor(primaryScore);
  const label = getScoreLabel(primaryScore);
  const risk = riskScore != null ? getRiskLabel(riskScore) : null;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${colors.bg} ${colors.text} border ${colors.border}`}>
        {Math.round(primaryScore)}
      </span>
    );
  }

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold font-mono border transition-all cursor-pointer hover:ring-2 ${colors.bg} ${colors.text} ${colors.border} ${colors.ring}`}
      >
        <span className="text-xs font-black">{Math.round(primaryScore)}</span>
        <span className="text-[9px] font-semibold opacity-75">{label}</span>
      </button>

      {showDetails && (
        <div className="absolute top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 p-2.5 min-w-[140px] text-left" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1.5 font-mono text-[10px]">
            {compositeScore != null && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-slate-400">Composite</span>
                <span className={`font-bold ${getScoreColor(compositeScore).text}`}>{Math.round(compositeScore)}</span>
              </div>
            )}
            {technicalScore != null && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-slate-400">Technical</span>
                <span className={`font-bold ${getScoreColor(technicalScore).text}`}>{Math.round(technicalScore)}</span>
              </div>
            )}
            {risk && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-slate-400">Risk</span>
                <span className={`font-bold ${risk.color}`}>{Math.round(riskScore!)} ({risk.label})</span>
              </div>
            )}
            {confidence != null && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-slate-400">Confidence</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{Math.round(confidence)}%</span>
              </div>
            )}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-800 text-[9px] text-gray-400 dark:text-slate-500 text-center">
            Click anywhere to close
          </div>
        </div>
      )}
    </div>
  );
}
