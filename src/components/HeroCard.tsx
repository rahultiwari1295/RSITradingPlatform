import React from "react";

export interface HeroStat {
  value: string | number;
  label: string;
  valueColor?: string; // e.g. '#8bf694' | '#f97066' | '#ffffff'
}

interface HeroCardProps {
  eyebrow: string;
  headline: React.ReactNode;
  stats: HeroStat[];
  className?: string;
  glowColor?: "mint" | "red";
}

export default function HeroCard({
  eyebrow,
  headline,
  stats,
  className = "",
  glowColor = "mint"
}: HeroCardProps) {
  const glowStyle = glowColor === "red"
    ? "radial-gradient(circle, rgba(249, 112, 102, 0.3) 0%, transparent 70%)"
    : "radial-gradient(circle, rgba(139, 246, 148, 0.3) 0%, transparent 70%)";

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] p-[20px] sm:p-[22px] text-white select-none ${className}`}
      style={{
        background: "linear-gradient(150deg, #14151A 0%, #23253A 100%)"
      }}
    >
      {/* Top right radial glow blob */}
      <div
        className="pointer-events-none absolute -top-[60px] -right-[60px] w-[180px] h-[180px] rounded-full blur-[10px]"
        style={{ background: glowStyle }}
      />

      {/* Eyebrow */}
      <div className="text-[10.5px] font-bold text-[#8B8D98] uppercase tracking-[1px] mb-2 font-mono">
        {eyebrow}
      </div>

      {/* Headline */}
      <div className="text-[18px] sm:text-[19px] font-bold text-white leading-[1.35] tracking-[-0.3px] max-w-[320px]">
        {headline}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-5 sm:gap-6 mt-[18px]">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex flex-col">
            <div
              className="text-[17px] sm:text-[18px] font-extrabold tracking-tight"
              style={{ color: stat.valueColor || "#FFFFFF" }}
            >
              {stat.value}
            </div>
            <div className="text-[10px] text-[#8B8D98] font-semibold mt-0.5 font-sans">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
