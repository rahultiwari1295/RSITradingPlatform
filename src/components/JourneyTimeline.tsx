import React from "react";
import { formatINR } from "../constants/theme";

interface JourneyTimelineProps {
  entryDate: string;
  entryPrice: number;
  exitDate?: string;
  exitPrice?: number;
  daysHeld?: number;
  isWin: boolean;
  className?: string;
}

export default function JourneyTimeline({
  entryDate,
  entryPrice,
  exitDate = "Aug 10",
  exitPrice = 0,
  daysHeld = 35,
  isWin,
  className = ""
}: JourneyTimelineProps) {
  const lineGradient = isWin
    ? "linear-gradient(90deg, #6366F1 0%, #16A34A 100%)"
    : "linear-gradient(90deg, #6366F1 0%, #F04438 100%)";

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Horizontal Connected Line with End Dots */}
      <div className="flex items-center w-full my-2">
        <div className="w-[7px] h-[7px] rounded-full bg-[#6366F1] shrink-0" />
        <div
          className="flex-1 h-[2px]"
          style={{ background: lineGradient }}
        />
        <div
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ background: isWin ? "#16A34A" : "#F04438" }}
        />
      </div>

      {/* Details Row under the Line */}
      <div className="flex items-start justify-between mt-1 text-[12px]">
        {/* Entry Details */}
        <div className="flex flex-col items-start">
          <span className="font-bold text-[#14151A] dark:text-slate-100">
            {entryDate}
          </span>
          <span className="text-[11.5px] text-[#56586A] dark:text-slate-400 font-medium font-mono mt-0.5">
            {formatINR(entryPrice)}
          </span>
        </div>

        {/* Days Held in Center */}
        <div className="text-[11px] font-semibold text-[#14151A] dark:text-slate-200 mt-1">
          {daysHeld} days held
        </div>

        {/* Exit Details */}
        <div className="flex flex-col items-end text-right">
          <span className="font-bold text-[#14151A] dark:text-slate-100">
            {exitDate}
          </span>
          <span className="text-[11.5px] text-[#56586A] dark:text-slate-400 font-medium font-mono mt-0.5">
            {formatINR(exitPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}

