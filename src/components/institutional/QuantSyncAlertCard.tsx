import React from "react";
import { LineChart, ExternalLink } from "lucide-react";
import { getSignalStatus } from "../../lib/signalStatus";

export interface QuantSyncAlertCardProps {
  mode: "active" | "closed";
  symbol: string;
  strategyName?: string;
  entryPrice: number;
  exitOrCurrentPrice: number;
  returnPct: number;
  holdingDays?: number;
  entryDate?: string;
  exitDate?: string;
  exitReason?: string;
  onOpenChart: (symbol: string) => void;
  onOpenSellModal?: () => void;
  onOpenBuyModal?: () => void;
  isBought?: boolean;
  onClick?: () => void;
}

export default function QuantSyncAlertCard({
  mode,
  symbol,
  strategyName = "INSTITUTIONAL POCKET PIVOT · SLEEVE 2",
  entryPrice,
  exitOrCurrentPrice,
  returnPct,
  holdingDays = 1,
  entryDate,
  exitDate,
  exitReason,
  onOpenChart,
  onOpenSellModal,
  onOpenBuyModal,
  isBought,
  onClick,
}: QuantSyncAlertCardProps) {
  const isWin = returnPct >= 0;
  const absReturn = Math.abs(returnPct);
  const formattedReturn = `${isWin ? "+" : "−"}${absReturn.toFixed(2)}%`;

  // Format Strategy display text
  const cleanStrategy = (strategyName || "INSTITUTIONAL POCKET PIVOT · SLEEVE 2")
    .toUpperCase()
    .trim();

  // Currency Formatter
  const formatINR = (val: number) => {
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Compact Date Formatter: DD/MM (e.g. 01/02 or 24/06)
  const formatCompactDate = (dStr?: string) => {
    if (!dStr) return "";
    if (/^\d{2}\/\d{2}/.test(dStr)) return dStr.slice(0, 5);
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return "";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}`;
    } catch {
      return "";
    }
  };

  const entryDateFormatted = formatCompactDate(entryDate);
  const exitDateFormatted = formatCompactDate(exitDate);
  const statusInfo = getSignalStatus(mode, holdingDays, returnPct);

  return (
    <div
      onClick={onClick}
      className={`card brushed-titanium-card group relative w-full rounded-[14px] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 select-none p-3 sm:p-3.5 ${
        onClick ? "cursor-pointer hover:border-slate-400/70 dark:hover:border-white/20 active:scale-[0.99]" : ""
      }`}
      style={{
        fontFamily: "'Manrope', sans-serif",
      }}
      title={onClick ? "Click to view institutional dossier" : undefined}
    >
      {/* 1. Row Top: Strategy Name on Left & Status Badge + Buy + Chart on Right */}
      <div className="row-top flex items-center justify-between gap-2 mb-1 sm:mb-1.5">
        <span
          className="brand text-[9px] sm:text-[9.5px] font-bold tracking-[0.05em] text-slate-600 dark:text-[#9a9aa4] uppercase truncate max-w-[42%] sm:max-w-[48%]"
          title={cleanStrategy}
        >
          {cleanStrategy}
        </span>

        {/* Right Items: 1-Word Status Badge (e.g. LATE, BEST) + Buy + Chart */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1-Word Status Badge placed just before ADD and CHART */}
          {mode === "active" && (
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider border shadow-2xs whitespace-nowrap ${statusInfo.badgeClass}`}
              title={statusInfo.tooltip}
            >
              {statusInfo.label}
            </span>
          )}

          {/* Add to Paper Trade Button */}
          {mode === "active" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenBuyModal) {
                  onOpenBuyModal();
                } else {
                  onOpenChart(symbol);
                }
              }}
              className="px-2 py-0.5 rounded-md bg-emerald-600/10 hover:bg-emerald-600/20 active:scale-95 text-[#0a6e3a] dark:text-emerald-400 border border-emerald-600/25 dark:border-emerald-500/20 text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              title={`Add ${symbol} to Paper Trade`}
            >
              ADD
            </button>
          )}

          {/* Exit Button (if bought) */}
          {mode === "active" && onOpenSellModal && isBought && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSellModal();
              }}
              className="px-2 py-0.5 rounded-md bg-red-600/10 hover:bg-red-600/20 active:scale-95 text-[#8a1f1f] dark:text-rose-400 border border-red-600/25 dark:border-rose-500/20 text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              title={`Exit position for ${symbol}`}
            >
              EXIT
            </button>
          )}

          {/* Chart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChart(symbol);
            }}
            className="px-2 py-0.5 rounded-md bg-white/80 hover:bg-white text-slate-800 border border-slate-300/80 shadow-2xs dark:bg-white/10 dark:hover:bg-white/15 dark:text-[#f0f0f2] dark:border-white/10 active:scale-95 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            title={`Open ${symbol} in TradingView`}
          >
            <LineChart className="w-3 h-3 text-[#0a6e3a] dark:text-emerald-400" />
            <span>CHART</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </button>
        </div>
      </div>

      {/* 2. Mid: Symbol and Percent on the same line */}
      <div className="mid flex items-baseline justify-between gap-2.5 my-1">
        <h3
          className="sym text-[18px] sm:text-[20px] font-black tracking-tight leading-tight truncate text-slate-900 dark:text-[#f0f0f2]"
          title={symbol}
        >
          {symbol}
        </h3>

        <div
          className={`hero text-[19px] sm:text-[21px] font-extrabold tracking-tight leading-tight text-right font-mono shrink-0 ${
            isWin
              ? "text-[#0a6e3a] dark:text-emerald-400"
              : "text-[#a02424] dark:text-rose-400"
          }`}
          style={{
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {formattedReturn}
        </div>
      </div>

      {/* 3. Subtle metallic progress track */}
      <div className="my-1.5 w-full">
        <div className="h-[3px] w-full rounded-full overflow-hidden flex bg-slate-300/60 shadow-inner dark:bg-white/[0.1]">
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "9999px",
              background: isWin
                ? "linear-gradient(90deg, #17a955, #0a6e3a)"
                : "linear-gradient(90deg, #c9412c, #a02424)",
            }}
          />
        </div>
      </div>

      {/* 4. Foot: Clean 2-Line Bilateral Signal Date ( Day Old ) & Current Grid */}
      <div className="foot pt-1.5 sm:pt-2 border-t border-slate-300/70 shadow-[0_1px_0_rgba(255,255,255,0.8)] dark:border-white/[0.08] dark:shadow-none flex items-baseline justify-between gap-3">
        {/* Left: Signal Date (X Day Old) (e.g. 04/09 @ ₹591.10) */}
        <div className="text-left">
          <div
            className="text-[9px] font-bold tracking-[0.05em] uppercase flex items-center gap-1 text-slate-500 dark:text-[#9a9aa4]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span>SIGNAL DATE</span>
            {mode === "active" && (
              <span className="text-[9px] font-bold font-mono text-slate-600 dark:text-[#a1a1aa] whitespace-nowrap">
                ({holdingDays} Day Old)
              </span>
            )}
          </div>
          <div className="text-[12.5px] sm:text-[13px] font-bold font-mono text-slate-900 dark:text-[#f0f0f2] mt-0.5">
            {entryDateFormatted ? `${entryDateFormatted} @ ` : ""}{formatINR(entryPrice)}
          </div>
        </div>

        {/* Right: CURRENT (e.g. ₹82.23) */}
        <div className="text-right">
          <div
            className="text-[9px] font-bold tracking-[0.06em] uppercase text-slate-500 dark:text-[#9a9aa4]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {mode === "closed" ? "EXIT" : "CURRENT"}
          </div>
          <div className="text-[12.5px] sm:text-[13px] font-bold font-mono text-slate-900 dark:text-[#f0f0f2] mt-0.5">
            {mode === "closed" && exitDateFormatted ? `${exitDateFormatted} @ ` : ""}{formatINR(exitOrCurrentPrice)}
          </div>
        </div>
      </div>
    </div>
  );
}

