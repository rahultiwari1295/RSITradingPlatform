import React from "react";
import { X, ChevronLeft, ChevronRight, ShoppingCart, ExternalLink } from "lucide-react";
import TradingViewWidget from "../TradingViewWidget";
import { formatINR, formatPercent } from "../../constants/theme";

interface ChartModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onMarkBought?: (symbol: string) => void;
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
  tradeDetails,
  darkMode = false
}: ChartModalProps) {
  if (!isOpen || !symbol) return null;

  const roi = tradeDetails?.currentROI ?? 0;
  const isPositive = roi >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[24px] border border-[#ECEEF2] dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-[#ECEEF2] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#14151A] dark:bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm font-mono shadow-xs">
              {symbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-[#14151A] dark:text-slate-100 tracking-tight">
                  {symbol}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[6px] bg-[#EEF0FE] text-[#6366F1] uppercase">
                  BSE / NSE
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#8B8D98] font-semibold mt-0.5">
                <span>{tradeDetails?.strategyName || "Algorithmic Setup"}</span>
                {tradeDetails?.currentPrice && (
                  <>
                    <span>&middot;</span>
                    <span className="text-[#14151A] dark:text-slate-200 font-mono font-bold">
                      {formatINR(tradeDetails.currentPrice)}
                    </span>
                  </>
                )}
                {tradeDetails?.currentROI !== undefined && (
                  <>
                    <span>&middot;</span>
                    <span className={`font-mono font-bold ${isPositive ? "text-[#16A34A]" : "text-[#F04438]"}`}>
                      {formatPercent(tradeDetails.currentROI)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrev && onNext && (
              <div className="flex items-center bg-[#F1F2F5] dark:bg-slate-800 rounded-[10px] p-0.5 border border-[#ECEEF2] dark:border-slate-700">
                <button
                  onClick={onPrev}
                  className="p-1.5 rounded-[8px] text-[#56586A] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title="Previous Stock"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onNext}
                  className="p-1.5 rounded-[8px] text-[#56586A] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title="Next Stock"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {onMarkBought && (
              <button
                onClick={() => onMarkBought(symbol)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#14151A] text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Mark Bought
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F6F7F9] dark:bg-slate-800 flex items-center justify-center text-[#56586A] dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded TradingView Chart Container */}
        <div className="flex-1 w-full min-h-[420px] sm:min-h-[500px] bg-slate-900 relative">
          <TradingViewWidget symbol={symbol} theme={darkMode ? "dark" : "light"} />
        </div>
      </div>
    </div>
  );
}
