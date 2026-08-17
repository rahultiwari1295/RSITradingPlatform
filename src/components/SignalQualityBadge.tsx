import React from "react";
import { Star, StarHalf } from "lucide-react";
import { getSignalQualityTier } from "../constants/signalQuality";

export interface SignalQualityBadgeProps {
  signal: {
    compositeScore?: number;
    mlProbability?: number;
    riskScore?: number;
  };
  className?: string;
}

export default function SignalQualityBadge({ signal, className = "" }: SignalQualityBadgeProps) {
  const badge = getSignalQualityTier(signal);
  const totalStars = 5;

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      title={`${badge.label} - ${badge.allocationText}`}
    >
      {[...Array(totalStars)].map((_, i) => {
        const isFilled = i < Math.floor(badge.stars);
        const isHalf = !isFilled && i < badge.stars;

        if (isFilled) {
          return <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />;
        } else if (isHalf) {
          return <StarHalf key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />;
        } else {
          return <Star key={i} className="w-2.5 h-2.5 text-slate-200 dark:text-slate-700" />;
        }
      })}
    </div>
  );
}
