import React from "react";
import { formatINR } from "../constants/theme";

interface GrowthBarProps {
  entryPrice: number;
  currentPrice: number;
  maxFavorablePrice?: number;
  className?: string;
}

export default function GrowthBar({
  entryPrice,
  currentPrice,
  className = ""
}: GrowthBarProps) {
  const isPositive = currentPrice >= entryPrice;
  const roiPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
  
  // Calculate visual fill fraction
  // For positive: map 0% to 100% ROI nicely from 15% to 100% width
  // For negative: min width 10%
  let fillWidth = 10;
  if (isPositive) {
    fillWidth = Math.min(100, Math.max(15, Math.min(100, 15 + roiPct * 0.85)));
  } else {
    fillWidth = Math.max(10, Math.min(40, 12 + Math.abs(roiPct)));
  }

  const fillGradient = isPositive
    ? "linear-gradient(90deg, #86EFAC 0%, #16A34A 100%)"
    : "linear-gradient(90deg, #FCA5A5 0%, #F04438 100%)";

  return (
    <div className={`w-full ${className}`}>
      {/* Labels */}
      <div className="flex justify-between items-center text-[10px] text-[#B3B5C0] font-semibold mb-[5px] font-mono">
        <span>Entry {formatINR(entryPrice)}</span>
        <span>Now {formatINR(currentPrice)}</span>
      </div>

      {/* Track */}
      <div className="h-[8px] rounded-[6px] bg-[#F1F2F5] dark:bg-slate-800 overflow-hidden w-full relative">
        <div
          className="h-full rounded-[6px] transition-all duration-500 ease-out"
          style={{
            width: `${fillWidth}%`,
            background: fillGradient
          }}
        />
      </div>
    </div>
  );
}
