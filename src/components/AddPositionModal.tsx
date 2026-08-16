import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { formatINR } from "../../constants/theme";

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    symbol: string;
    buyPrice: number;
    quantity: number;
    strategyName?: string;
    date?: string;
  }) => void;
}

export default function AddPositionModal({
  isOpen,
  onClose,
  onSubmit
}: AddPositionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [buyPrice, setBuyPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">(10);
  const [strategyName, setStrategyName] = useState("Breakout");

  if (!isOpen) return null;

  const total = Number(buyPrice || 0) * Number(quantity || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !buyPrice || !quantity) return;
    
    onSubmit({
      symbol: symbol.toUpperCase().trim(),
      buyPrice: Number(buyPrice),
      quantity: Number(quantity),
      strategyName,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    });
    
    setSymbol("");
    setBuyPrice("");
    setQuantity(10);
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

        <h3 className="text-[18px] font-bold text-[#14151A] dark:text-slate-100 mb-1">
          Add Portfolio Position
        </h3>
        <p className="text-[12px] text-[#8B8D98] font-semibold mb-4">
          Manually track a stock position in your portfolio
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-1 font-mono">
              Symbol (e.g. RELIANCE, TATASTEEL)
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="SYMBOL"
              className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[14px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#14151A] font-mono uppercase"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-1 font-mono">
                Buy Price
              </label>
              <input
                type="number"
                step="0.05"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[14px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#14151A] font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-1 font-mono">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="10"
                className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[14px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#14151A] font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8B8D98] uppercase tracking-wider mb-1 font-mono">
              Strategy Setup
            </label>
            <select
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              className="w-full bg-[#F6F7F9] dark:bg-slate-800 border border-[#ECEEF2] dark:border-slate-700 rounded-[12px] px-3.5 py-2.5 text-[13px] font-bold text-[#14151A] dark:text-slate-100 outline-hidden focus:border-[#14151A]"
            >
              <option value="Breakout">Breakout</option>
              <option value="Decouple">Decouple</option>
              <option value="Alpha">Alpha</option>
              <option value="Snapback">Snapback</option>
              <option value="HyperSqueeze">HyperSqueeze</option>
              <option value="Explosion">Explosion</option>
              <option value="BearTrap">BearTrap</option>
              <option value="DipBuyer">DipBuyer</option>
              <option value="Discretionary">Discretionary</option>
            </select>
          </div>

          <div className="bg-[#F1F2F5] dark:bg-slate-800 rounded-[12px] p-3 flex justify-between items-center">
            <span className="text-[11px] font-bold text-[#56586A] dark:text-slate-300">Total Invested</span>
            <span className="text-[14px] font-extrabold text-[#14151A] dark:text-slate-100 font-mono">
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
              className="flex-1 py-3 rounded-[12px] bg-[#14151A] dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-[13px] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
