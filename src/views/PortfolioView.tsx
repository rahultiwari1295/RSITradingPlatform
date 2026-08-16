import React, { useState } from "react";
import { Plus, History, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import HeroCard from "../components/HeroCard";
import StatusPill from "../components/StatusPill";
import { ManualPortfolioTrade, CompletedTrade } from "../types";
import { formatINR, formatPercent } from "../constants/theme";

interface PortfolioViewProps {
  portfolio: ManualPortfolioTrade[];
  completedHistory?: CompletedTrade[];
  onOpenAddModal: () => void;
  onOpenSellModal: (trade: ManualPortfolioTrade) => void;
  onOpenChart: (symbol: string) => void;
}

export default function PortfolioView({
  portfolio,
  completedHistory = [],
  onOpenAddModal,
  onOpenSellModal,
  onOpenChart
}: PortfolioViewProps) {
  const [showHistory, setShowHistory] = useState(false);

  // Partition holdings into needs-attention (untracked) vs healthy (still on system's radar)
  const untrackedTrades = portfolio.filter(p => !p.isActiveInStrategy);
  const healthyTrades = portfolio.filter(p => p.isActiveInStrategy);

  const totalCount = portfolio.length;
  const trackedCount = healthyTrades.length;
  const untrackedCount = untrackedTrades.length;

  return (
    <div className="w-full pb-6">
      {/* Top Row */}
      <div className="flex justify-between items-center mb-[20px]">
        <h1 className="text-[21px] text-[#14151A] dark:text-slate-100 font-bold tracking-[-0.4px]">
          My portfolio
        </h1>
        <div className="flex items-center gap-2">
          {completedHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-2 rounded-[13px] border text-[12px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showHistory
                  ? "bg-[#14151A] text-white border-[#14151A]"
                  : "bg-white dark:bg-slate-900 text-[#56586A] dark:text-slate-300 border-[#ECEEF2] dark:border-slate-800"
              }`}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
          )}
          <button
            onClick={onOpenAddModal}
            className="w-[40px] h-[40px] rounded-[13px] bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 flex items-center justify-center text-[#14151A] dark:text-slate-200 text-[18px] font-bold shadow-3xs hover:bg-[#F6F7F9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Add Position"
          >
            +
          </button>
        </div>
      </div>

      {/* Hero Card */}
      <HeroCard
        eyebrow="Portfolio health"
        glowColor={untrackedCount > 0 ? "red" : "mint"}
        headline={
          untrackedCount > 0 ? (
            <>
              {trackedCount} holdings still tracked,{" "}
              <b className="text-[#F97066] font-bold">{untrackedCount} need your attention</b>
            </>
          ) : (
            <>
              All {trackedCount} holdings are{" "}
              <b className="text-[#8BF694] font-bold">healthy & active</b>
            </>
          )
        }
        stats={[
          { value: totalCount, label: "Total holdings" },
          { value: trackedCount, label: "System tracked", valueColor: "#8BF694" },
          {
            value: untrackedCount,
            label: "Not tracked",
            valueColor: untrackedCount > 0 ? "#F97066" : "#FFFFFF"
          }
        ]}
        className="mb-5"
      />

      {/* History View or Main Portfolio List */}
      {showHistory ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2 px-1">
            <h2 className="text-[16px] font-bold text-[#14151A] dark:text-slate-100">
              Completed Trade History ({completedHistory.length})
            </h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-[12px] font-bold text-[#6366F1]"
            >
              Back to Active
            </button>
          </div>

          {completedHistory.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-[20px] border border-[#ECEEF2] text-[#8B8D98] text-xs">
              No completed trades recorded yet.
            </div>
          ) : (
            completedHistory.map((item, idx) => {
              const isProfit = item.pnl >= 0;
              return (
                <div
                  key={`${item.tradeId || item.symbol}-${idx}`}
                  className="rounded-[20px] p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-3xs"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-[15px] font-bold text-[#14151A] dark:text-slate-100">
                        {item.symbol}
                      </div>
                      <div className="text-[11px] text-[#8B8D98] font-semibold">
                        {item.quantity} shares &middot; {item.strategyName || "Manual Trade"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[15px] font-extrabold font-mono ${isProfit ? "text-[#16A34A]" : "text-[#F04438]"}`}>
                        {isProfit ? "+" : ""}{formatINR(item.pnl)} ({item.pnlPct >= 0 ? "+" : ""}{item.pnlPct.toFixed(2)}%)
                      </div>
                      <div className="text-[10px] text-[#8B8D98] font-mono">
                        Held {item.holdDays || 10} days
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-[#56586A] dark:text-slate-400 pt-2 border-t border-[#F1F2F5] dark:border-slate-800">
                    <span>Bought: {formatINR(item.buyPrice)}</span>
                    <span>Sold: {formatINR(item.sellPrice)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <>
          {/* SECTION 1: Needs Attention / Untracked Section */}
          {untrackedCount > 0 && (
            <div className="mb-6">
              {/* Exit Section Alert Banner */}
              <div className="rounded-[16px] p-3.5 sm:p-4 bg-[#FEF3F2] dark:bg-rose-950/30 border border-[#FECDCA] dark:border-rose-900/50 mb-3.5 select-none">
                <div className="text-[13.5px] font-extrabold text-[#7A271A] dark:text-rose-300">
                  Below trades no longer exist in active trades
                </div>
                <div className="text-[11.5px] text-[#B42318] dark:text-rose-400 font-semibold mt-0.5">
                  The strategy has moved on &mdash; please review and exit manually
                </div>
              </div>

              {/* Needs-Exit Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {untrackedTrades.map((pos) => {
                  const invested = pos.totalInvested || (pos.buyPrice * (pos.quantity || 1));
                  const heldDays = pos.daysHeld || 10;

                  return (
                    <div
                      key={pos.tradeId || pos.symbol}
                      className="rounded-[18px] p-4 bg-white dark:bg-slate-900 border-[1.5px] border-[#FECDCA] dark:border-rose-900/60 shadow-[0_2px_12px_-4px_rgba(20,25,40,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] transition-all cursor-pointer flex flex-col justify-between"
                      onClick={() => onOpenChart(pos.symbol)}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[15.5px] font-bold text-[#14151A] dark:text-slate-100">
                              {pos.symbol}
                            </div>
                            <div className="text-[11.5px] text-[#8B8D98] font-semibold mt-0.5">
                              {pos.quantity || 1} {pos.quantity === 1 ? "share" : "shares"} &middot; bought {pos.date || "recently"}
                            </div>
                          </div>
                          <StatusPill text="EXIT" tone="NegativeSolid" />
                        </div>

                        <div className="h-[1px] bg-[#F1F2F5] dark:bg-slate-800 my-2.5" />
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div className="flex items-center gap-3.5">
                          <div>
                            <div className="text-[9.5px] text-[#B3B5C0] font-bold uppercase tracking-[0.3px] font-mono">
                              Invested
                            </div>
                            <div className="text-[13.5px] text-[#14151A] dark:text-slate-100 font-bold mt-0.5 font-mono">
                              {formatINR(invested)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9.5px] text-[#B3B5C0] font-bold uppercase tracking-[0.3px] font-mono">
                              Held for
                            </div>
                            <div className="text-[13.5px] text-[#14151A] dark:text-slate-100 font-bold mt-0.5">
                              {heldDays} days
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSellModal(pos);
                          }}
                          className="px-3 py-1.5 rounded-[10px] bg-[#F04438] hover:bg-[#d9382d] text-white text-[11.5px] font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                        >
                          Mark as sold
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: Still on system's radar / Healthy holdings */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-0.5">
              <div className="w-2 h-2 rounded-full bg-[#16A34A] ring-4 ring-emerald-100 dark:ring-emerald-950/40" />
              <div className="text-[13.5px] font-bold text-[#14151A] dark:text-slate-100">
                Still on the system&rsquo;s radar
              </div>
              <div className="text-[11px] font-bold text-[#16A34A] bg-[#ECFDF3] dark:bg-emerald-950/50 px-2 py-0.5 rounded-[8px] font-mono">
                {trackedCount}
              </div>
            </div>

            {healthyTrades.length === 0 ? (
              <div className="p-8 text-center rounded-[20px] bg-white dark:bg-slate-900 border border-[#ECEEF2] text-[#8B8D98] text-xs">
                No active holdings currently on the radar. Tap + to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {healthyTrades.map((pos) => {
                  const invested = pos.totalInvested || (pos.buyPrice * (pos.quantity || 1));
                  const currentRoi = pos.currentROI ?? 0;
                  const isPositive = currentRoi >= 0;
                  const currentTotal = pos.currentPrice ? pos.currentPrice * (pos.quantity || 1) : invested * (1 + currentRoi / 100);
                  const pnlDelta = currentTotal - invested;
                  const heldDays = pos.daysHeld || 13;

                  return (
                    <div
                      key={pos.tradeId || pos.symbol}
                      className="rounded-[18px] p-4 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 shadow-[0_2px_12px_-4px_rgba(20,25,40,0.06)] transition-all hover:shadow-[0_4px_16px_-4px_rgba(20,25,40,0.10)] cursor-pointer flex flex-col justify-between"
                      onClick={() => onOpenChart(pos.symbol)}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[15.5px] font-bold text-[#14151A] dark:text-slate-100">
                              {pos.symbol}
                            </div>
                            <div className="text-[11.5px] text-[#8B8D98] font-semibold mt-0.5">
                              {pos.quantity || 1} {pos.quantity === 1 ? "share" : "shares"} &middot; bought {pos.date || "recently"}
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-[15px] font-extrabold flex items-center justify-end gap-1 font-mono ${
                                isPositive ? "text-[#16A34A]" : "text-[#F04438]"
                              }`}
                            >
                              <span>{isPositive ? "▲" : "▼"}</span>
                              <span>{formatPercent(currentRoi)}</span>
                            </div>
                            <div className="text-[11px] text-[#8B8D98] font-semibold mt-0.5 font-mono">
                              held {heldDays}d
                            </div>
                          </div>
                        </div>

                        <div className="h-[1px] bg-[#F1F2F5] dark:bg-slate-800 my-2.5" />
                      </div>

                      {/* Invested -> PnL and Action Button */}
                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div>
                            <div className="text-[9.5px] text-[#B3B5C0] font-bold uppercase tracking-[0.3px] font-mono">
                              Invested
                            </div>
                            <div className="text-[13.5px] font-bold text-[#14151A] dark:text-slate-100 font-mono mt-0.5">
                              {formatINR(invested)}
                            </div>
                          </div>

                          <div className="text-[#D0D2D8] font-bold text-xs select-none">
                            &rarr;
                          </div>

                          <div>
                            <div className="text-[9.5px] text-[#B3B5C0] font-bold uppercase tracking-[0.3px] font-mono">
                              PnL
                            </div>
                            <div
                              className={`text-[13.5px] font-extrabold font-mono mt-0.5 ${
                                isPositive ? "text-[#16A34A]" : "text-[#F04438]"
                              }`}
                            >
                              {isPositive ? "" : "-"}{formatINR(Math.abs(pnlDelta))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSellModal(pos);
                          }}
                          className="px-3 py-1.5 rounded-[10px] bg-[#F6F7F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#56586A] dark:text-slate-200 text-[11.5px] font-bold transition-colors cursor-pointer shrink-0"
                        >
                          Mark as sold
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
