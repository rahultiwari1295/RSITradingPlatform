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
  bigNumber = "67.7",
  bigLabel = "% win rate",
  badge = "2.58x",
  stats,
  className = "",
  variant = "wallet"
}: HeroCardProps) {
  if (variant === "dark") {
    return (
      <div
        className={`relative overflow-hidden rounded-[26px] p-5 text-white select-none shadow-[0_12px_32px_-8px_rgba(20,21,26,0.35)] ${className}`}
        style={{
          background: "linear-gradient(150deg, #14151A 0%, #23253A 100%)"
        }}
      >
        <div
          className="pointer-events-none absolute -top-[50px] -right-[50px] w-[150px] h-[150px] rounded-full blur-[10px]"
          style={{ background: "radial-gradient(circle, rgba(139, 246, 148, 0.28) 0%, transparent 70%)" }}
        />

        <div className="text-[11px] font-bold text-[#8B8D98] uppercase tracking-[1px] mb-1.5 font-mono">
          {eyebrow}
        </div>

        <div className="text-[17px] sm:text-[18.5px] font-bold text-white leading-[1.3] tracking-[-0.3px] max-w-[360px]">
          {headline}
        </div>

        <div className="flex items-center gap-5 sm:gap-7 mt-3.5 pt-3 border-t border-white/10">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col">
              <div
                className="text-[17px] font-extrabold tracking-tight font-mono"
                style={{ color: stat.valueColor || "#FFFFFF" }}
              >
                {stat.value}
              </div>
              <div className="text-[10px] text-[#8B8D98] font-semibold mt-0.5 uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[30px] sm:rounded-[32px] p-5 sm:p-6 text-white select-none shadow-[0_20px_40px_-12px_rgba(108,92,231,0.45)] ${className}`}
      style={{
        background: "linear-gradient(135deg, #6C5CE7 0%, #A855F7 45%, #EC4899 100%)"
      }}
    >
      {/* Glow blobs overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: "radial-gradient(60% 50% at 90% -10%, rgba(255,255,255,0.35), transparent 60%), radial-gradient(50% 40% at -10% 110%, rgba(255,255,255,0.15), transparent 60%)"
        }}
      />

      <div className="relative z-1 flex justify-between items-start">
        <div>
          <div className="text-[12px] font-extrabold text-white/85 uppercase tracking-wider mb-1.5">
            {eyebrow}
          </div>
          {headline ? (
            <div className="text-[19px] sm:text-[22px] font-extrabold text-white tracking-tight leading-snug">
              {headline}
            </div>
          ) : (
            <div className="text-[34px] sm:text-[40px] font-extrabold text-white tracking-tight leading-none flex items-baseline gap-1.5 tabular">
              {bigNumber}
              <span className="text-[18px] sm:text-[20px] font-bold text-white/85">
                {bigLabel}
              </span>
            </div>
          )}
        </div>

        {badge && (
          <div className="bg-white/20 hover:bg-white/25 transition-colors backdrop-blur-md rounded-full px-3 py-1.5 text-[12.5px] font-extrabold text-white flex items-center gap-1.5 shadow-xs shrink-0">
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
            {badge}
          </div>
        )}
      </div>

      {/* Hero Stats */}
      <div className="relative z-1 flex items-center gap-0 mt-5 pt-1">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`flex-1 ${
              idx > 0 ? "border-l border-white/25 pl-3 sm:pl-4 ml-3 sm:ml-4" : ""
            }`}
          >
            <div className="text-[18px] sm:text-[20px] font-extrabold text-white tracking-tight tabular leading-tight font-mono">
              {stat.value}
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-white/80 font-bold mt-0.5 uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

