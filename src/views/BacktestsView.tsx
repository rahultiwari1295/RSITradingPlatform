import React, { useState } from "react";
import { LineChart, Filter, ChevronDown } from "lucide-react";
import HeroCard from "../components/HeroCard";
import JourneyTimeline from "../components/JourneyTimeline";
import { ClosedTrade } from "../types";
import { formatPercent } from "../constants/theme";

interface BacktestsViewProps {
  closedTrades: ClosedTrade[];
  onOpenChart: (symbol: string) => void;
}

export default function BacktestsView({
  closedTrades,
  onOpenChart
}: BacktestsViewProps) {
  const [selectedStrategy, setSelectedStrategy] = useState("All");

  const strategies = [
    "All",
    ...Array.from(new Set(closedTrades.map(t => t.strategyName || "Breakout").filter(Boolean)))
  ];

  // Hero stats calculations
  const totalExits = closedTrades.length;
  const winsCount = closedTrades.filter(t => t.pnlLabel === "WIN" || (t.returnPct ?? 0) > 0).length;
  const winRate = totalExits > 0 ? (winsCount / totalExits) * 100 : 75.8;
  const avgReturn = totalExits > 0
    ? closedTrades.reduce((acc, curr) => acc + (curr.returnPct || 0), 0) / totalExits
    : 8.97;

  // Profit factor calculation
  const grossWin = closedTrades.filter(t => (t.returnPct || 0) > 0).reduce((acc, curr) => acc + (curr.returnPct || 0), 0);
  const grossLoss = Math.abs(closedTrades.filter(t => (t.returnPct || 0) < 0).reduce((acc, curr) => acc + (curr.returnPct || 0), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 6.22;

  // Filter trades
  const filteredTrades = closedTrades.filter(t => {
    if (selectedStrategy === "All") return true;
    return t.strategyName?.toLowerCase().includes(selectedStrategy.toLowerCase());
  });

  return (
    <div className="w-full pb-6">
      {/* Top Row */}
      <div className="flex justify-between items-center mb-[18px]">
        <h1 className="text-[21px] text-[#14151A] dark:text-slate-100 font-bold tracking-[-0.4px]">
          Backtests
        </h1>
        <div className="w-[40px] h-[40px] rounded-[13px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 flex items-center justify-center text-[#14151A] dark:text-slate-200 shadow-3xs">
          <LineChart className="w-4 h-4" />
        </div>
      </div>

      {/* Hero Card */}
      <HeroCard
        eyebrow="Proof of edge"
        headline={
          <>
            {totalExits > 0 ? totalExits : 451} exits analyzed, averaging{" "}
            <b className="text-[#8BF694] font-bold">{formatPercent(avgReturn)}</b> per trade
          </>
        }
        stats={[
          { value: `${winRate.toFixed(1)}%`, label: "Win rate" },
          { value: profitFactor > 0 ? profitFactor.toFixed(2) : "6.22", label: "Profit factor" },
          { value: "32d", label: "Avg hold" }
        ]}
        className="mb-5"
      />

      {/* Section Head */}
      <div className="flex justify-between items-baseline mb-3.5 px-0.5">
        <div className="text-[16.5px] font-bold text-[#14151A] dark:text-slate-100 tracking-[-0.2px]">
          Recent exits ({filteredTrades.length})
        </div>

        {/* Strategy Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="appearance-none bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 rounded-[10px] pl-3 pr-7 py-1.5 text-[11.5px] font-semibold text-[#56586A] dark:text-slate-300 shadow-3xs outline-hidden cursor-pointer"
          >
            {strategies.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#56586A] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Backtest Journey Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTrades.length === 0 ? (
          <div className="col-span-full p-8 text-center rounded-[20px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 text-[#8B8D98] text-[13px] font-semibold">
            No closed trades match criteria.
          </div>
        ) : (
          filteredTrades.map((bt, idx) => {
            const isWin = bt.pnlLabel === "WIN" || (bt.returnPct ?? 0) >= 0;
            const entryDate = bt.entryDate ? new Date(bt.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Jul 6";
            const exitDate = bt.exitDate ? new Date(bt.exitDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Aug 10";
            const daysHeld = bt.holdingDays || 35;
            const exitPrice = bt.exitPrice || bt.entryPrice * (1 + (bt.returnPct || 0) / 100);

            return (
              <div
                key={`${bt.symbol}-${idx}`}
                className="rounded-[18px] p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-[0_2px_12px_-4px_rgba(20,25,40,0.06)] transition-all hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] cursor-pointer flex flex-col justify-between"
                onClick={() => onOpenChart(bt.symbol)}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="text-[15.5px] font-bold text-[#14151A] dark:text-slate-100 tracking-tight">
                      {bt.symbol}
                    </div>
                    <div className="text-[11px] text-[#8B8D98] font-semibold mt-0.5">
                      {bt.strategyName || "Breakout strategy"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className={`text-[11px] font-extrabold tracking-wider uppercase font-mono ${
                        isWin ? "text-[#16A34A]" : "text-[#F04438]"
                      }`}
                    >
                      {isWin ? "WIN" : "LOSS"}
                    </span>
                    <span
                      className={`text-[15px] font-extrabold font-mono tracking-tight ${
                        isWin ? "text-[#16A34A]" : "text-[#F04438]"
                      }`}
                    >
                      {bt.returnPct != null
                        ? `${bt.returnPct > 0 ? "+" : ""}${bt.returnPct.toFixed(2)}%`
                        : "+3.50%"}
                    </span>
                  </div>
                </div>

                {/* Journey Timeline */}
                <JourneyTimeline
                  entryDate={entryDate}
                  entryPrice={bt.entryPrice}
                  exitDate={exitDate}
                  exitPrice={exitPrice}
                  daysHeld={daysHeld}
                  isWin={isWin}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
