import React from "react";
import { getAvatarGradient, getSymbolInitials } from "../constants/theme";

interface SymbolAvatarProps {
  symbol: string;
  gradientIndex?: number;
  size?: number; // e.g. 44
  className?: string;
}

export default function SymbolAvatar({
  symbol,
  gradientIndex = 0,
  size = 44,
  className = ""
}: SymbolAvatarProps) {
  const initials = getSymbolInitials(symbol);
  const bgGradient = getAvatarGradient(gradientIndex);

  return (
    <div
      className={`rounded-[14px] flex items-center justify-center font-extrabold text-white text-[14px] select-none shrink-0 shadow-xs ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: bgGradient
      }}
    >
      {initials}
    </div>
  );
}
