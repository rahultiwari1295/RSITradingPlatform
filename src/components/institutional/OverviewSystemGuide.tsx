import React, { useState } from "react";
import { SIGNAL_STATUS_DECISION_TABLE } from "../../lib/signalStatus";
import {
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Clock,
  CalendarDays,
  ArrowDown,
  Layers,
  Cpu,
  Award,
  Zap,
  Target,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Briefcase,
  HelpCircle,
  BarChart3,
  Check,
} from "lucide-react";

export default function OverviewSystemGuide() {
  // All dropdowns collapsed initially by default
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    setOpenItems({
      basics: true,
      selection: true,
      routine: true,
      performance: true,
      protection: true,
      paperTrading: true,
      exits: true,
    });
  };

  const collapseAll = () => {
    setOpenItems({});
  };

  const allOpen =
    Boolean(
      openItems.basics &&
      openItems.selection &&
      openItems.routine &&
      openItems.performance &&
      openItems.protection &&
      openItems.paperTrading &&
      openItems.exits
    );

  return (
    <div className="space-y-4">
      {/* ─── COMPACT TOP INTRO BAR ─── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#1e1e2f] text-white border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" />
            QuantSync Interactive Guide
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            Everything You Need to Know in Simple Language
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Click any question below to expand and learn how QuantSync selects stocks, manages risk, and lets you track your paper trade returns.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={allOpen ? collapseAll : expandAll}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-white/10"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>{allOpen ? "Collapse All" : "Expand All"}</span>
          </button>
        </div>
      </div>

      {/* ─── ACCORDION 0: APP BASICS & SIGNAL STATUSES ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden transition-all">
        <button
          onClick={() => toggleItem("basics")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  How to use the app? (The 3 Pages &amp; Card Statuses)
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono">
                  Start Here
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Active vs Closed vs Paper Trade pages, and what each card status (Best Buy, Late to Buy, Missed) means
              </p>
            </div>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {openItems.basics ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openItems.basics && (
          <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 animate-fade-in space-y-6">
            {/* Quick Golden Rule Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/40 border border-emerald-300/80 dark:border-emerald-500/30 shadow-xs flex items-start gap-3">
              <span className="text-xl shrink-0 leading-none mt-0.5">💡</span>
              <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                <strong className="text-emerald-700 dark:text-emerald-400 text-[13px] block mb-0.5">
                  The Simple Golden Rule of Entering Signals:
                </strong>
                If a stock card says <strong className="text-emerald-700 dark:text-emerald-400 font-black">Best Buy</strong> or <strong className="text-teal-700 dark:text-teal-400 font-black">Good to Buy</strong>, it is in the sweet spot to enter. If it says <strong className="text-amber-700 dark:text-amber-400 font-black">Late to Buy</strong> or <strong className="text-purple-700 dark:text-purple-400 font-black">Missed</strong>, do NOT enter or chase—the stock has already surged. Wait patiently for the next fresh signal!
              </div>
            </div>

            {/* PART 1: The 3 Pages Explained */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black font-mono shadow-xs">
                  1
                </span>
                <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  The 3 Main Pages (Tabs in Top-Right Header)
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Active */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-300/80 dark:border-emerald-500/30 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        1. Active Page
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-mono">
                      Live Signals
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    This is your live market watchlist. It displays all stock trade signals that are currently active in the market right now. You can check live prices, current returns, how many days the stock has been held, and its color-coded status tag telling you if it is safe to enter.
                  </p>
                </div>

                {/* Closed */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        2. Closed Page
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-mono">
                      Past 500 Trades
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    This is our complete audited record of the past 500 finished trades. Every single completed signal is transparently recorded with the exact entry date, buy price, exit date, sell price, holding duration, and net rupee profit/loss so you can verify the system&#39;s track record.
                  </p>
                </div>

                {/* Paper Trade */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-300/80 dark:border-indigo-500/30 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        3. Paper Trade
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 font-mono">
                      Practice Sandbox
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    This is your personal virtual practice notebook. Whenever you see a signal you like on the Active page, tap the green <strong>BUY</strong> button. It adds the stock here so you can practice risk-free, see personal profit/loss, and build confidence before using real capital.
                  </p>
                </div>
              </div>
            </div>

            {/* PART 2: What Each Card Status Means (In Simple Paragraphs) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black font-mono shadow-xs">
                    2
                  </span>
                  <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    What Each Card Status Means (Written in Simple Words)
                  </h5>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  Shown in card footer as: SIGNAL DATE ( STATUS )
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                In every stock card footer, we tell you whether to enter or avoid. Here is what each status means:
              </p>

              <div className="space-y-3">
                {/* 1. Best Buy */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-300/80 dark:border-emerald-500/30 shadow-2xs flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="shrink-0 sm:w-36">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Best Buy
                    </span>
                    <div className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      Age: 1 to 3 days | Gain ≤ 3%
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-w-0">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">
                      Ideal time to buy! Lowest risk, highest upside.
                    </strong>
                    The stock has just triggered an institutional breakout within the last 1 to 3 trading sessions and has not yet moved up by more than 3% from the entry price. This is the sweet spot because you enter right at the base price with minimum downside risk.
                  </div>
                </div>

                {/* 2. Good to Buy */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-teal-300/80 dark:border-teal-500/30 shadow-2xs flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="shrink-0 sm:w-36">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-300 dark:border-teal-700/60 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      Good to Buy
                    </span>
                    <div className="text-[10.5px] font-bold text-teal-700 dark:text-teal-400 mt-1">
                      Age: 1 to 3 days | Gain +3% to +5%
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-w-0">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">
                      Safe and good to enter. Momentum is confirmed.
                    </strong>
                    The signal is recent and the stock has started moving up nicely with healthy buyer volume. There is still ample upside runway remaining before reaching target levels.
                  </div>
                </div>

                {/* 3. Late to Buy */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-amber-300/80 dark:border-amber-500/30 shadow-2xs flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="shrink-0 sm:w-36">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Late to Buy
                    </span>
                    <div className="text-[10.5px] font-bold text-amber-700 dark:text-amber-400 mt-1">
                      Age: 4+ days | Gain +5% to +7%
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-w-0">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">
                      Little late to enter. High risk of a short-term pullback.
                    </strong>
                    The stock has already spent 4 or more days in the trade or already surged +5% to +7% from entry. Entering now means buying near the top of the initial swing where short-term profit-taking can pull the price back. We recommend you do NOT enter or keep your position size very small.
                  </div>
                </div>

                {/* 4. Missed */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-purple-300/80 dark:border-purple-500/30 shadow-2xs flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="shrink-0 sm:w-36">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Missed
                    </span>
                    <div className="text-[10.5px] font-bold text-purple-700 dark:text-purple-400 mt-1">
                      Gain &gt; +7% (Big Rally)
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-w-0">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">
                      Do NOT enter or chase! The move has already completed.
                    </strong>
                    The stock has already surged past +7% and is approaching the target zone. While this is a wonderful win for traders who entered early, entering now is dangerous because the train has already left the station. Wait calmly for the next fresh signal.
                  </div>
                </div>

                {/* 5. Skip */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-300/80 dark:border-slate-700 shadow-2xs flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="shrink-0 sm:w-36">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      Skip
                    </span>
                    <div className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                      Age: 6+ days | Stagnant &lt; 2%
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-w-0">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">
                      Skip entering. Do not lock capital in stalled stocks.
                    </strong>
                    The stock has been open for 6 or more trading sessions without meaningful upward movement, or is hovering close to its stop-loss line. Rather than risking your money on a stagnant stock, skip it and focus on high-conviction fresh breakouts.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── ACCORDION 1: HOW WE SELECT STOCKS ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden transition-all">
        <button
          onClick={() => toggleItem("selection")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  How do we select stocks?
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  1,300+ NSE Stocks to Top 8%
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                The 5-stage automated screening and machine-learning conviction funnel
              </p>
            </div>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {openItems.selection ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openItems.selection && (
          <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 animate-fade-in">
            {/* Header intro */}
            <div className="max-w-3xl mx-auto mb-4 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3">
              <span className="font-semibold">
                🔗 <strong>The Automated Selection Pipeline:</strong> Stocks move step-by-step through 6 linked stages before an alert is issued.
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-600 text-white shrink-0 font-mono">
                6 Linked Stages
              </span>
            </div>

            {/* Continuous Linked Stepper Pipeline */}
            <div className="max-w-3xl mx-auto relative pl-10 sm:pl-12 space-y-6 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-6 before:w-1 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-emerald-500 before:rounded-full">
              
              {/* STAGE 1 */}
              <div className="relative">
                {/* Step Number Node */}
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  1
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-indigo-400/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        1. Scan 1,300+ NSE Liquid Cash Stocks
                      </h5>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Universe
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      100% of Liquid Cash Market
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    The engine begins by indexing the entire liquid cash equities market on the National Stock Exchange every single trading day.
                  </p>
                </div>
              </div>

              {/* STAGE 2 */}
              <div className="relative">
                {/* Step Number Node */}
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-amber-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  2
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-amber-200/80 dark:border-amber-500/20 shadow-xs hover:border-amber-400/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        2. Quantitative Filters (Weak Stocks Removed)
                      </h5>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        Trash Filter
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-black text-amber-600 dark:text-amber-400">
                      ~92% Automatically Filtered
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Hard quantitative gates eliminate illiquid penny stocks (&lt; ₹50), low volume traps (&lt; ₹1 Cr daily turnover), circuit-limit manipulators, and structural downtrends. Only clean liquid charts advance.
                  </p>
                </div>
              </div>

              {/* STAGE 3 */}
              <div className="relative">
                {/* Step Number Node */}
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  3
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs hover:border-indigo-400/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        3. Trigger 3 Institutional Setup Engines
                      </h5>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                        Pattern Models
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Strategy Triggers
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.04]">
                      <div className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                        🏦 Pocket Pivot
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        Quiet Accumulation
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Institutional volume spikes inside tight constructive bases before retail notices.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.04]">
                      <div className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 uppercase">
                        💪 Relative Strength
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        Market Leaders
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Stocks showing persistent outperformance against the benchmark Nifty 50.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.04]">
                      <div className="text-[11px] font-black text-violet-600 dark:text-violet-400 uppercase">
                        🚀 Alpha Momentum
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        Explosive Breakout
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        High volume velocity breaking cleanly through multi-week consolidation resistance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 4 */}
              <div className="relative">
                {/* Step Number Node */}
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-purple-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  4
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-purple-200/80 dark:border-purple-500/20 shadow-xs hover:border-purple-400/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        4. AI / ML Engine: Deep Setup Analysis
                      </h5>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-500/20 text-purple-700 dark:text-purple-300">
                        Multi-Factor Scoring
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                      6 Core Dimensions
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-2.5 leading-relaxed">
                    The machine learning model cross-examines qualifying setups across 6 distinct quantitative factors to verify institutional conviction:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/[0.03] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      1. Market Context
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/[0.03] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      2. Volume &amp; Momentum
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/[0.03] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      3. Trend Quality
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/[0.03] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      4. Historical Patterns
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/[0.03] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      5. Setup Behaviour
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/[0.03] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      6. Outcome Patterns
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 5 */}
              <div className="relative">
                {/* Step Number Node */}
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  5
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        5. ML Conviction Score (Accept Top ~8% Only)
                      </h5>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        Final Gate
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Highest Probability Setups
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                    <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 flex items-start gap-2.5">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Lower Quality Setups
                          </span>
                          <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-rose-500/20 text-rose-600 dark:text-rose-400">
                            ❌ DISCARDED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                          False breakouts, low relative volume, and noisy overhead resistance are rejected automatically.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            High Quality Conviction
                          </span>
                          <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            ✅ ACCEPTED (TOP 8%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                          Only setups meeting top ML statistical edge thresholds qualify to become live actionable alerts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 6 */}
              <div className="relative">
                {/* Step Number Node */}
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  6
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/40 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                        🎯
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                            6. Final Trade Alert (Generated at 3:15 PM IST)
                          </h5>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-600 text-white font-mono">
                            Ready to Trade
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          Delivered directly into the <strong>Active</strong> tab right before market close with verified Entry Price, Stop Loss, and automated Trailing Stop rules.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white uppercase shrink-0 self-start sm:self-center">
                      ~1 to 2 / Day
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ─── ACCORDION 2: HOW DO I USE THIS APP IN 5 MINUTES A DAY? ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden transition-all">
        <button
          onClick={() => toggleItem("routine")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  How do I use this app in 5 minutes a day?
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                  3-Step Routine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                No complex charting or full-time screen sitting required
              </p>
            </div>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {openItems.routine ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openItems.routine && (
          <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 animate-fade-in">
            <div className="max-w-3xl mx-auto mb-4 p-3 rounded-xl bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-500/20 text-xs text-cyan-950 dark:text-cyan-200 flex items-center justify-between gap-3">
              <span className="font-semibold">
                ⏱️ <strong>Simple Daily Habit:</strong> You don&apos;t need to watch computer screens all day. Just 5 minutes at 3:15 PM is all it takes!
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-600 text-white shrink-0 font-mono">
                Just 3 Steps
              </span>
            </div>

            {/* Continuous Linked Stepper */}
            <div className="max-w-3xl mx-auto relative pl-10 sm:pl-12 space-y-6 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-6 before:w-1 before:bg-gradient-to-b before:from-cyan-500 before:via-indigo-500 before:to-emerald-500 before:rounded-full">
              
              {/* STEP 1 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-cyan-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  1
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-cyan-200/80 dark:border-cyan-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      1. Open App at 3:15 PM (Takes 1 Minute)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      Market Close Alarm
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Set a quick reminder on your phone for <strong>3:15 PM</strong> (just 15 minutes before the stock market closes). Open this app and look at the <strong>Active</strong> tab. If the computer found a great stock today, it will be sitting right there waiting for you. If there is no stock, you are done for the day!
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  2
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      2. Click &quot;BUY&quot; to Practice (Takes 10 Seconds)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      100% Free Practice
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Simply tap the green <strong>BUY</strong> button on the card. You don&apos;t need to risk any real money. The app immediately saves it in your personal <strong>Paper Trade notebook</strong> at the exact current price so you can watch how it performs like a game.
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  3
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      3. Let the App Tell You When to Sell (Zero Guesswork)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Automatic Alert
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    You never have to guess or stress about when to sell. The app watches the stock every day. When it reaches peak profit or needs to exit, the app clearly highlights it. You just sell and collect your profit in the <strong>Closed</strong> tab!
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ─── ACCORDION 3: WHAT RETURNS & CONSISTENCY SHOULD I EXPECT? ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden transition-all">
        <button
          onClick={() => toggleItem("performance")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  What returns &amp; consistency should I expect?
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Audited Ledger · Latest 500 Records
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Verified performance metrics across the system&apos;s latest 500 closed trade records (All statutory fees deducted)
              </p>
            </div>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {openItems.performance ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openItems.performance && (
          <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 space-y-5 animate-fade-in">
            <div className="max-w-3xl mx-auto p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-500/20 text-xs text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-3">
              <span className="font-semibold">
                📊 <strong>Real Verified Track Record:</strong> Tested across 500 completed trades with all taxes and broker fees already deducted.
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-600 text-white shrink-0 font-mono">
                500 Closed Trades
              </span>
            </div>

            {/* Continuous Linked Stepper */}
            <div className="max-w-3xl mx-auto relative pl-10 sm:pl-12 space-y-6 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-6 before:w-1 before:bg-gradient-to-b before:from-emerald-500 before:via-indigo-500 before:to-purple-500 before:rounded-full">
              
              {/* STEP 1 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  1
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      1. You Win 8 Out of Every 10 Weeks (82.1% Win Rate)
                    </h5>
                    <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                      82.1% Green Weeks
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    In simple words: out of every 10 weeks of trading, roughly <strong>8 weeks end with a positive profit</strong>. You don&apos;t have to suffer long painful losing months.
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  2
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      2. For Every ₹1 Lost, You Make ₹4.48 (Profit Factor 4.48)
                    </h5>
                    <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
                      ₹4.48 : ₹1 Ratio
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Think of this like a shop: when a good trade works, you make an average of <strong>+₹5,979</strong>. But when a trade doesn&apos;t work, the safety net cuts it instantly so you only lose around <strong>-₹769</strong>. The big wins easily beat the tiny losses!
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cyan-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-cyan-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  3
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-cyan-200/80 dark:border-cyan-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      3. Money Held for Just 5 to 7 Days (Never Stuck)
                    </h5>
                    <span className="text-sm font-mono font-black text-cyan-600 dark:text-cyan-400">
                      Avg 7 Days
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Your money is never locked up for months or years. Most trades finish in just <strong>5 trading days</strong> (about one calendar week). You quickly bank the profit and your money is ready for the next opportunity.
                  </p>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-purple-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  4
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-purple-200/80 dark:border-purple-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      4. 100% Transparent Proof in the &quot;Closed&quot; Tab
                    </h5>
                    <span className="text-sm font-mono font-black text-purple-600 dark:text-purple-400">
                      500 Real Records
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Nothing is hidden or imaginary. Every single one of the <strong>500 past trades</strong> is listed right inside the <strong>Closed</strong> tab. Anyone can click and see the exact stock name, buying date, selling date, and exact rupee profit made.
                  </p>
                </div>
              </div>

            </div>

            {/* Quick Summary Box */}
            <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-slate-300">
                  💰 <strong>Real Performance Result:</strong> ₹3 Lakh starting capital grew to <strong>₹9.70 Lakh (+222.8% net)</strong> across these 500 trades after all statutory expenses.
                </span>
                <span className="font-mono font-black text-emerald-400 shrink-0 text-sm">
                  +222.8% Total Net Gain
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── ACCORDION 4: HOW DOES THE SYSTEM PROTECT CAPITAL IN CHOPPY/BEAR MARKETS? ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden transition-all">
        <button
          onClick={() => toggleItem("protection")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  How does the system protect capital in choppy or bear markets?
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  Max Drawdown 2.86%
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Why maximum drawdown was contained to just 2.86% over multi-year market cycles
              </p>
            </div>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {openItems.protection ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openItems.protection && (
          <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 space-y-5 animate-fade-in">
            <div className="max-w-3xl mx-auto p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-500/20 text-xs text-purple-950 dark:text-purple-200 flex items-center justify-between gap-3">
              <span className="font-semibold">
                🛡️ <strong>Safety-First Protection:</strong> Why your money was protected with only a tiny 2.86% dip during market crashes.
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-600 text-white shrink-0 font-mono">
                3 Shield Layers
              </span>
            </div>

            {/* Continuous Linked Stepper */}
            <div className="max-w-3xl mx-auto relative pl-10 sm:pl-12 space-y-6 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-6 before:w-1 before:bg-gradient-to-b before:from-purple-500 before:via-indigo-500 before:to-emerald-500 before:rounded-full">
              
              {/* STEP 1 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-purple-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  1
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-purple-200/80 dark:border-purple-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      1. Sitting in Safe Cash During Rainstorms (Zero Forced Trades)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                      Cash Shield
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    When the weather outside is bad and heavy rain starts falling, you stay safely inside the house. In the same way, when the stock market is falling, our computer system refuses to buy anything and keeps 100% of your money safe in cash. Doing nothing on stormy days saves fortunes!
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  2
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      2. Automatic Seatbelt on Every Trade (Tiny 3% Safety Net)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Emergency Stop
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Just like wearing a seatbelt while driving in a car, every single stock alert comes with an automatic safety net (stop-loss). If a stock drops just 3% or 4%, the system tells you to get out immediately so a small scratch never becomes a deep wound.
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  3
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      3. Never Praying or Hoping (Pulling Weeds, Growing Flowers)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Disciplined Logic
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Most beginners lose all their savings because they hold onto losing stocks for months, hoping and praying they will bounce back. Our computer has zero emotions: bad stocks are cut instantly, while healthy winning stocks are allowed to run and bring home big profits.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ─── ACCORDION 5: WHAT IS PAPER TRADING? ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden transition-all">
        <button
          onClick={() => toggleItem("paperTrading")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  What is Paper Trading?
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Track What You Bought &amp; Exits
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Track what you purchased from signals, know which ones to exit, and see how much you made
              </p>
            </div>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {openItems.paperTrading ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openItems.paperTrading && (
          <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 space-y-5 animate-fade-in">
            <div className="max-w-3xl mx-auto p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 flex items-center justify-between gap-3">
              <span className="font-semibold">
                📝 <strong>Zero-Risk Practice Game:</strong> Test every single stock signal with virtual money until you are 100% confident.
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-600 text-white shrink-0 font-mono">
                100% Free Practice
              </span>
            </div>

            {/* Continuous Linked Stepper */}
            <div className="max-w-3xl mx-auto relative pl-10 sm:pl-12 space-y-6 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-6 before:w-1 before:bg-gradient-to-b before:from-amber-500 before:via-indigo-500 before:to-emerald-500 before:rounded-full">
              
              {/* STEP 1 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-amber-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  1
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-amber-200/80 dark:border-amber-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      1. Understand What You Purchased (Your Practice Diary)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      Step 1: Practice Buy
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    Whenever you see a stock in the <strong>Active</strong> tab, just tap the green <strong>&quot;BUY&quot;</strong> button. The app writes it into your personal practice diary with the exact buying price and time. You get to play with live market prices without risking a single rupee of your real hard-earned money!
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  2
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      2. Know Exactly Which Ones to Exit (Zero Confusion)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Step 2: Follow Alerts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    You don&apos;t need to worry about when to sell. The <strong>Paper Trade</strong> tab watches all your stocks automatically. When a stock hits its profit target or needs to exit, the app turns on a clear alert so you know exactly which stock to sell and when.
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  3
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      3. See How Much Money You Made (Build Full Confidence)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Step 3: Track Profits
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    When you exit, the app automatically counts your total rupees made, your percentage win, and your overall win rate. You get to see your virtual piggy bank grow with real market signals, so you feel 100% confident in the strategy before ever making a real investment!
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ─── ACCORDION 6: HOW DO EXITS AND STOP-LOSSES WORK? ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden transition-all">
        <button
          onClick={() => toggleItem("exits")}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  How do exits and trailing stop-losses work?
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  Automated Rule Exits
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Eliminating emotional hesitation and locking in profits systematically
              </p>
            </div>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {openItems.exits ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {openItems.exits && (
          <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 space-y-5 animate-fade-in">
            <div className="max-w-3xl mx-auto p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-500/20 text-xs text-rose-950 dark:text-rose-200 flex items-center justify-between gap-3">
              <span className="font-semibold">
                🎯 <strong>Effortless Selling Rules:</strong> How profits are automatically locked in without emotional stress or second-guessing.
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white shrink-0 font-mono">
                3 Exit Rules
              </span>
            </div>

            {/* Continuous Linked Stepper */}
            <div className="max-w-3xl mx-auto relative pl-10 sm:pl-12 space-y-6 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-6 before:w-1 before:bg-gradient-to-b before:from-rose-500 before:via-amber-500 before:to-emerald-500 before:rounded-full">
              
              {/* STEP 1 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-rose-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  1
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-rose-200/80 dark:border-rose-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      1. Safety Cushion from Day One (Initial 3% Stop-Loss)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                      Cushion Set
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    The minute a trade starts, an automatic safety net is placed right below it. If the stock immediately starts dropping, you get an alert to exit with just a tiny 3% or 4% cut. You never have to worry about a stock crashing 20% or 30% while you are asleep.
                  </p>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-amber-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  2
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-amber-200/80 dark:border-amber-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      2. Moving the Floor Up (Guaranteed Profit Lock)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      Ratcheting Up
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    As the stock gains speed and moves up (+5%, +10%, +15%), the system slides the safety floor upwards behind it. Once the stock is up +8%, your safety floor is now higher than your buying price. At that point, you literally cannot lose money on the trade!
                  </p>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="relative">
                <div className="absolute -left-10 sm:-left-12 top-2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-emerald-500/30 ring-4 ring-white dark:ring-slate-900 z-10 font-mono">
                  3
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      3. Ringing the Cash Register (Exit &amp; Bank Profit)
                    </h5>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Bank Profit
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    When the stock gets tired or touches its trailing safety level, the system triggers the exit signal. You sell the stock, bank your profit safely into your balance, and the trade moves into the <strong>Closed</strong> tab as a completed winning trade.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
