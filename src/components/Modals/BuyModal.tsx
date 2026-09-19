import React, { useState, useEffect } from "react";
import { X, Check, ShieldCheck, Plus, Minus, Briefcase } from "lucide-react";
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
  onSubmit,
}: BuyModalProps) {
  const [price, setPrice] = useState<number | "">(initialPrice || "");
  const [qty, setQty] = useState<number>(10);

  // Sync state every time modal opens or target stock changes
  useEffect(() => {
    if (isOpen) {
      setPrice(initialPrice > 0 ? initialPrice : "");
      setQty(10);
    }
  }, [isOpen, initialPrice, symbol]);

  if (!isOpen) return null;

  const numPrice = Number(price || 0);
  const numQty = Number(qty || 0);
  const total = numPrice * numQty;

  const handleQuickQty = (amount: number) => {
    setQty(amount);
  };

  const handleQuickCapital = (targetCapital: number) => {
    if (numPrice > 0) {
      const calculatedQty = Math.max(1, Math.round(targetCapital / numPrice));
      setQty(calculatedQty);
    }
  };

  const handleStepQty = (delta: number) => {
    setQty((prev) => Math.max(1, (prev || 0) + delta));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || !qty || numPrice <= 0 || numQty <= 0) return;
    onSubmit({
      symbol,
      buyPrice: Number(price),
      quantity: Number(qty),
      strategyName,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#12141E] rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white animate-scale-in select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-indigo-500/20">
            {symbol ? symbol.slice(0, 2).toUpperCase() : "QS"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                {symbol}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Paper Trade
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {strategyName || "Institutional Breakout Setup"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entry Price Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                Entry Price (₹)
              </label>
              {initialPrice > 0 && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  Ref: ₹{initialPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-hidden focus:border-indigo-500 dark:focus:border-indigo-400 font-mono transition-colors"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Position Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                Quantity (Shares)
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {qty} shares
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepQty(-5)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer shrink-0"
                title="Decrease 5 shares"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm font-bold text-center text-slate-900 dark:text-white outline-hidden focus:border-indigo-500 dark:focus:border-indigo-400 font-mono transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => handleStepQty(5)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer shrink-0"
                title="Increase 5 shares"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Share Pills */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">Shares:</span>
              {[10, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickQty(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    qty === preset
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Quick Capital Sizing */}
            <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">Capital:</span>
              {[
                { label: "₹25K", val: 25000 },
                { label: "₹50K", val: 50000 },
                { label: "₹1 Lakh", val: 100000 },
              ].map((cap) => (
                <button
                  key={cap.label}
                  type="button"
                  onClick={() => handleQuickCapital(cap.val)}
                  className="px-2 py-1 rounded-lg text-[10.5px] font-bold font-mono bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all cursor-pointer"
                >
                  {cap.label}
                </button>
              ))}
            </div>
          </div>

          {/* Allocation Summary Card */}
          <div className="rounded-2xl p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-transparent border border-emerald-500/20 dark:border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Simulated Capital</span>
              </div>
              <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                {formatINR(total)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10.5px] text-emerald-700/80 dark:text-emerald-400/80 font-medium mt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Zero financial risk · Tracks live real-time returns</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Paper Trade</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
