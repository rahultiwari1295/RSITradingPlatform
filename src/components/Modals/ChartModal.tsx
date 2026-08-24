import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  ExternalLink,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";
import TradingViewWidget from "../TradingViewWidget";
import { formatINR, formatPercent } from "../../constants/theme";

interface ChartModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onMarkBought?: (symbol: string) => void;
  isBought?: boolean;
  tradeDetails?: {
    currentPrice?: number;
    entryPrice?: number;
    currentROI?: number;
    strategyName?: string;
  };
  darkMode?: boolean;
}

export default function ChartModal({
  symbol,
  isOpen,
  onClose,
  onPrev,
  onNext,
  onMarkBought,
  isBought = false,
  tradeDetails,
  darkMode = false
}: ChartModalProps) {
  const [interval, setInterval] = useState<"D" | "W" | "M" | "60">("D");
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Keyboard navigation support: Esc to close, Left/Right for stocks
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen || !symbol) return null;

  const roi = tradeDetails?.currentROI ?? 0;
  const isPositive = roi >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-2">
      <div
        className={`w-full bg-white dark:bg-slate-950 flex flex-col transition-all duration-200 overflow-hidden shadow-2xl ${
          isFullscreen
            ? "h-full w-full rounded-none sm:rounded-[20px] border-0 sm:border border-slate-800"
            : "h-[92vh] w-[95vw] max-w-6xl rounded-[20px] border border-slate-800"
        }`}
      >
        {/* Modal Top Control Header */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-[#ECEEF2] dark:border-slate-800 gap-2 shrink-0">
          {/* Symbol, Name, Badges & Price */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] bg-[#14151A] dark:bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm font-mono shadow-xs shrink-0">
              {symbol.slice(0, 2)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[17px] sm:text-[19px] font-extrabold text-[#14151A] dark:text-slate-100 tracking-tight">
                  BSE:{symbol}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-[6px] bg-[#EEF0FE] text-[#6366F1] uppercase">
                  Cash Market
                </span>
                {tradeDetails?.strategyName && (
                  <span className="text-[10.5px] font-bold text-[#8B8D98] hidden md:inline">
                    &bull; {tradeDetails.strategyName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11.5px] font-mono mt-0.5">
                {tradeDetails?.currentPrice && (
                  <span className="font-extrabold text-[#14151A] dark:text-slate-100 text-[13px]">
                    {formatINR(tradeDetails.currentPrice)}
                  </span>
                )}

                {tradeDetails?.currentROI !== undefined && (
                  <span
                    className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.2 rounded-[6px] ${
                      isPositive
                        ? "bg-[#ECFDF3] text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatPercent(tradeDetails.currentROI)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Timeframe interval selector pills */}
          <div className="flex items-center bg-[#F1F2F5] dark:bg-slate-800/80 p-0.5 rounded-[12px] border border-[#ECEEF2] dark:border-slate-700/60">
            {(
              [
                { key: "D", label: "Daily" },
                { key: "W", label: "Weekly" },
                { key: "M", label: "Monthly" },
                { key: "60", label: "60m" }
              ] as const
            ).map((tf) => (
              <button
                key={tf.key}
                onClick={() => setInterval(tf.key)}
                className={`px-2.5 sm:px-3 py-1 rounded-[9px] text-[11px] font-bold transition-all cursor-pointer font-mono ${
                  interval === tf.key
                    ? "bg-white dark:bg-slate-700 text-[#14151A] dark:text-white shadow-3xs"
                    : "text-[#56586A] dark:text-slate-400 hover:text-[#14151A] dark:hover:text-white"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Prev / Next Stock */}
            {onPrev && onNext && (
              <div className="flex items-center bg-[#F1F2F5] dark:bg-slate-800 rounded-[10px] p-0.5 border border-[#ECEEF2] dark:border-slate-700">
                <button
                  onClick={onPrev}
                  className="p-1.5 rounded-[8px] text-[#56586A] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Previous Stock (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onNext}
                  className="p-1.5 rounded-[8px] text-[#56586A] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Next Stock (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TradingView Web Direct Link */}
            <a
              href={`https://www.tradingview.com/chart/?symbol=BSE:${symbol}`}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[11px] font-bold text-[#6366F1] bg-[#EEF0FE] dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
              title="Open chart in full TradingView browser tab"
            >
              <span>TradingView</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Mark Bought CTA */}
            {onMarkBought && (
              isBought ? (
                <button
                  onClick={() => onMarkBought(symbol)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] border border-[#16A34A] dark:border-emerald-500/80 bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 text-[11.5px] font-bold hover:bg-[#dcfce7] transition-colors cursor-pointer"
                >
                  <span>Bought</span>
                  <span>✓</span>
                </button>
              ) : (
                <button
                  onClick={() => onMarkBought(symbol)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#14151A] dark:bg-slate-100 text-white dark:text-slate-900 text-[11.5px] font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-3xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark Bought</span>
                </button>
              )
            )}

            {/* Fullscreen / Compact Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:flex w-8 h-8 rounded-[10px] bg-[#F6F7F9] dark:bg-slate-800 items-center justify-center text-[#56586A] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Maximize to Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F6F7F9] dark:bg-slate-800 flex items-center justify-center text-[#56586A] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-3xs"
              title="Close Chart (Esc)"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Embedded Full-Height TradingView Chart Container */}
        <div className="flex-1 w-full h-[calc(100vh-65px)] bg-slate-950 relative">
          <TradingViewWidget
            symbol={symbol}
            interval={interval}
            theme={darkMode ? "dark" : "light"}
          />
        </div>
      </div>
    </div>
  );
}

