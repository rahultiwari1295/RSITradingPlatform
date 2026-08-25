import React from "react";
import { TrendingUp } from "lucide-react";

export interface HeroStat {
  value: string | number;
  label: string;
  valueColor?: string;
}

interface HeroCardProps {
  eyebrow: string;
  headline?: React.ReactNode;
  bigNumber?: string;
  bigLabel?: string;
  badge?: string;
  stats: HeroStat[];
  className?: string;
  variant?: "wallet" | "dark";
}

export default function HeroCard({
  eyebrow,
  headline,
  bigNumber,
  bigLabel,
  badge,
  stats,
  className = ""
}: HeroCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[24px] p-5 sm:p-5.5 text-white select-none shadow-[0_12px_32px_-8px_rgba(20,21,26,0.32)] border border-white/[0.08] ${className}`}
      style={{
        background: "linear-gradient(150deg, #14151A 0%, #1E2030 50%, #23253A 100%)"
      }}
    >
      {/* Top right subtle satin glow blob */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full blur-[24px]"
        style={{ background: "radial-gradient(circle, rgba(139, 246, 148, 0.22) 0%, transparent 70%)" }}
      />

      <div className="relative z-1 flex justify-between items-start">
        <div>
          <div className="text-[10.5px] font-bold text-[#8B8D98] uppercase tracking-[1.2px] mb-1.5 font-mono">
            {eyebrow}
          </div>

          {headline ? (
            <div className="text-[18px] sm:text-[19.5px] font-bold text-white tracking-tight leading-[1.3] max-w-[340px]">
              {headline}
            </div>
          ) : (
            <div className="text-[32px] sm:text-[36px] font-extrabold text-white tracking-tight leading-none flex items-baseline gap-1.5 tabular font-mono">
              {bigNumber}
              {bigLabel && (
                <span className="text-[15px] sm:text-[16px] font-bold text-[#8B8D98]">
                  {bigLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {badge && (
          <div className="bg-white/10 hover:bg-white/15 transition-colors border border-white/15 backdrop-blur-md rounded-full px-2.5 py-1 text-[11.5px] font-extrabold text-[#8BF694] flex items-center gap-1 shadow-xs shrink-0 font-mono">
            <TrendingUp className="w-3 h-3 stroke-[2.5]" />
            {badge}
          </div>
        )}
      </div>

      {/* Hero Stats */}
      <div className="relative z-1 flex items-center gap-0 mt-4 pt-3 border-t border-white/[0.08]">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`flex-1 ${
              idx > 0 ? "border-l border-white/10 pl-3.5 sm:pl-4 ml-3.5 sm:ml-4" : ""
            }`}
          >
            <div
              className="text-[17px] sm:text-[18.5px] font-extrabold tracking-tight tabular leading-tight font-mono"
              style={{ color: stat.valueColor || "#FFFFFF" }}
            >
              {stat.value}
            </div>
            <div className="text-[9.5px] sm:text-[10px] text-[#8B8D98] font-bold mt-0.5 uppercase tracking-wider font-mono">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


