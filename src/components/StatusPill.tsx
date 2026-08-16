import React from "react";

export type PillTone = "Positive" | "Negative" | "NegativeSolid" | "Neutral" | "Indigo";

interface StatusPillProps {
  text: string;
  tone?: PillTone;
  className?: string;
  onClick?: () => void;
}

export default function StatusPill({
  text,
  tone = "Neutral",
  className = "",
  onClick
}: StatusPillProps) {
  let styleClasses = "bg-[#F6F7F9] text-[#56586A]";

  switch (tone) {
    case "Positive":
      styleClasses = "bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]/40";
      break;
    case "Negative":
      styleClasses = "bg-[#FEF3F2] text-[#F04438] border border-[#FECDCA]/60";
      break;
    case "NegativeSolid":
      styleClasses = "bg-[#F04438] text-white shadow-xs";
      break;
    case "Indigo":
      styleClasses = "bg-[#EEF0FE] text-[#6366F1]";
      break;
    case "Neutral":
    default:
      styleClasses = "bg-[#F6F7F9] dark:bg-slate-800 text-[#56586A] dark:text-slate-300";
      break;
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center justify-center font-bold text-[10px] uppercase tracking-wider px-[10px] py-[3.5px] rounded-[8px] select-none ${styleClasses} ${className}`}
    >
      {text}
    </span>
  );
}
