import React, { useState, useEffect } from "react";
import { X, Check, PieChart } from "lucide-react";
import { formatINR } from "../../constants/theme";

interface SellModalProps {
  trade: {
    tradeId?: string;
    symbol: string;
    buyPrice: number;
    quantity?: number;
    currentPrice?: number | null;
    strategyName?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { tradeId?: string; symbol: string; sellPrice: number; sellQuantity: number }) => void;
}

export default function SellModal({
  trade,
  isOpen,
  onClose,
  onSubmit
}: SellModalProps) {
  const [sellPrice, setSellPrice] = useState<number | "">("");
  const [sellQty, setSellQty] = useState<number | "">("");

  useEffect(() => {
    if (trade) {
      setSellPrice(trade.currentPrice || trade.buyPrice || "");
      setSellQty(trade.quantity || 1);
    }
  }, [trade]);

  if (!isOpen || !trade) return null;

  const totalHoldingQty = trade.quantity || 1;
  const buyPrice = trade.buyPrice || 0;
  const numQty = Number(sellQty || 0);
  const numSellPrice = Number(sellPrice || 0);
  const totalCost = buyPrice * numQty;
  const totalReceived = numSellPrice * numQty;
  const realizedPnL = totalReceived - totalCost;
  const realizedRoiPct = totalCost > 0 ? (realizedPnL / totalCost) * 100 : 0;
  const isProfit = realizedPnL >= 0;

  const handleSetPercentQty = (fraction: number) => {
    const calculated = Math.max(1, Math.round(totalHoldingQty * fraction));
    setSellQty(calculated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellPrice || !sellQty) return;
    onSubmit({
      tradeId: trade.tradeId,
      symbol: trade.symbol,
      sellPrice: Number(sellPrice),
      sellQuantity: Number(sellQty)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[22px] border border-[#ECEEF2] dark:border-slate-800 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F6F7F9] dark:bg-slate-800 flex items-center justify-center text-[#56586A] dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-[14px] bg-[#F04438] text-white flex items-center justify-center font-extrabold text-sm">
            {trade.symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#14151A] dark:text-slate-100">
              Exit {trade.symbol}
            </h3>
            <p className="text-[11.5px] text-[#8B8D98] font-semibold">
              Bought at {formatINR(trade.buyPrice)} · Total {totalHoldingQty} shares
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-1 font-mono">
              Exit Price (INR)
            </label>
            <input
              type="number"
              step="0.05"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[14px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#F04438] font-mono"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider font-mono">
                Quantity to Exit
              </label>
              <span className="text-[10px] text-[#8B8D98] font-mono">
                Max: {totalHoldingQty}
              </span>
            </div>
            
            {/* Quick Partial Exit Buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => handleSetPercentQty(0.25)}
                className="py-1 rounded-[8px] bg-[#F1F2F5] dark:bg-slate-800 text-[11px] font-bold text-[#56586A] dark:text-slate-300 hover:bg-[#EEF0FE] hover:text-[#6366F1] transition-colors cursor-pointer"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handleSetPercentQty(0.50)}
                className="py-1 rounded-[8px] bg-[#F1F2F5] dark:bg-slate-800 text-[11px] font-bold text-[#56586A] dark:text-slate-300 hover:bg-[#EEF0FE] hover:text-[#6366F1] transition-colors cursor-pointer"
              >
                50% (Half)
              </button>
              <button
                type="button"
                onClick={() => handleSetPercentQty(0.75)}
                className="py-1 rounded-[8px] bg-[#F1F2F5] dark:bg-slate-800 text-[11px] font-bold text-[#56586A] dark:text-slate-300 hover:bg-[#EEF0FE] hover:text-[#6366F1] transition-colors cursor-pointer"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => handleSetPercentQty(1.0)}
                className="py-1 rounded-[8px] bg-[#F1F2F5] dark:bg-slate-800 text-[11px] font-bold text-[#56586A] dark:text-slate-300 hover:bg-[#EEF0FE] hover:text-[#6366F1] transition-colors cursor-pointer"
              >
                100% (All)
              </button>
            </div>

            <input
              type="number"
              min="1"
              max={totalHoldingQty}
              value={sellQty}
              onChange={(e) => setSellQty(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[14px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#F04438] font-mono"
              required
            />
          </div>

          <div
            className={`rounded-[12px] p-3 flex justify-between items-center border ${
              isProfit
                ? "bg-[#ECFDF3] dark:bg-emerald-950/20 border-[#86EFAC]/60 text-[#16A34A]"
                : "bg-[#FEF3F2] dark:bg-rose-950/20 border-[#FECDCA]/60 text-[#F04438]"
            }`}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block font-mono">
                Realized P&L
              </span>
              <span className="text-[13px] font-bold">
                {isProfit ? "+" : ""}{formatINR(realizedPnL)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider block font-mono">
                Return
              </span>
              <span className="text-[14px] font-extrabold font-mono">
                {isProfit ? "+" : ""}{realizedRoiPct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-[12px] bg-[#F6F7F9] dark:bg-slate-800 text-[#56586A] dark:text-slate-300 font-bold text-[13px] hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-[12px] bg-[#F04438] text-white font-bold text-[13px] hover:bg-[#d9382d] transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 qs-btn-press cursor-pointer"
            >
              <Check className="w-4 h-4" /> Confirm Exit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
