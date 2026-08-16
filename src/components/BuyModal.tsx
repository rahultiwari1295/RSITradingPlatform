import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { formatINR } from "../../constants/theme";

interface BuyModalProps {
  symbol: string;
  initialPrice: number;
  strategyName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { symbol: string; buyPrice: number; quantity: number; strategyName?: string }) => void;
}

export default function BuyModal({
  symbol,
  initialPrice,
  strategyName,
  isOpen,
  onClose,
  onSubmit
}: BuyModalProps) {
  const [price, setPrice] = useState<number | "">(initialPrice || "");
  const [qty, setQty] = useState<number | "">(10);

  if (!isOpen) return null;

  const total = Number(price || 0) * Number(qty || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || !qty) return;
    onSubmit({
      symbol,
      buyPrice: Number(price),
      quantity: Number(qty),
      strategyName
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[22px] border border-[#ECEEF2] dark:border-slate-800 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F6F7F9] dark:bg-slate-800 flex items-center justify-center text-[#56586A] dark:text-slate-300 hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-[14px] bg-[#14151A] text-white flex items-center justify-center font-extrabold text-sm">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#14151A] dark:text-slate-100">
              Mark {symbol} Bought
            </h3>
            <p className="text-[11.5px] text-[#8B8D98] font-semibold">
              Strategy: {strategyName || "Manual Trade"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-1 font-mono">
              Buy Price (INR)
            </label>
            <input
              type="number"
              step="0.05"
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[14px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#14151A] font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-1 font-mono">
              Quantity (Shares)
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[14px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#14151A] font-mono"
              required
            />
          </div>

          <div className="bg-[#ECFDF3] dark:bg-emerald-950/20 border border-[#86EFAC]/60 dark:border-emerald-800/40 rounded-[12px] p-3 flex justify-between items-center">
            <span className="text-[11px] font-bold text-[#16A34A] dark:text-emerald-400">Total Invested</span>
            <span className="text-[14px] font-extrabold text-[#16A34A] dark:text-emerald-300 font-mono">
              {formatINR(total)}
            </span>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-[12px] bg-[#F6F7F9] dark:bg-slate-800 text-[#56586A] dark:text-slate-300 font-bold text-[13px] hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-[12px] bg-[#14151A] dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-[13px] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10"
            >
              <Check className="w-4 h-4" /> Save Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
