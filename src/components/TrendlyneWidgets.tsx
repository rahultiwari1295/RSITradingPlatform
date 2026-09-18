import React, { useState } from "react";
import {
  Activity,
  CheckSquare,
  ShieldAlert,
  RotateCw,
  LayoutGrid,
  Maximize2,
  Minimize2
} from "lucide-react";

interface TrendlyneWidgetsProps {
  symbol: string;
  theme?: "light" | "dark";
}

type WidgetType = "financial" | "technical" | "swot" | "split";

export default function TrendlyneWidgets({ symbol, theme = "dark" }: TrendlyneWidgetsProps) {
  // Default is Financial as requested
  const [activeWidget, setActiveWidget] = useState<WidgetType>("financial");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Clean symbol of any exchange prefixes (e.g. NSE:VIJAYA -> VIJAYA)
  const cleanSymbol = (symbol || "").trim().toUpperCase().replace(/^(BSE|NSE):/i, "");

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setLoading(false), 800);
  };

  // Order: 1. Financial (DVM Checklist), 2. Technical, 3. SWOT
  const widgetDefinitions = [
    {
      id: "financial" as const,
      label: "Financial Analysis (DVM Checklist)",
      shortLabel: "Financial",
      icon: CheckSquare,
      color: "text-emerald-500",
      bgBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description: "Durability, Valuation & Financial Momentum institutional diagnostic checklist",
      url: `https://trendlyne.com/web-widget/checklist-widget/Poppins/${cleanSymbol}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`,
      // Generous vertical view area so the entire checklist is completely displayed
      defaultHeight: 900,
      expandedHeight: 1250,
    },
    {
      id: "technical" as const,
      label: "Technical Analysis",
      shortLabel: "Technical",
      icon: Activity,
      color: "text-indigo-500",
      bgBadge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      description: "Momentum, Moving Averages, RSI, MACD & Trend Strength indicators",
      url: `https://trendlyne.com/web-widget/technical-widget/Poppins/${cleanSymbol}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`,
      defaultHeight: 660,
      expandedHeight: 950,
    },
    {
      id: "swot" as const,
      label: "SWOT Insights",
      shortLabel: "SWOT",
      icon: ShieldAlert,
      color: "text-amber-500",
      bgBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      description: "Fundamental Strengths, Weaknesses, Opportunities & Threat vectors",
      url: `https://trendlyne.com/web-widget/swot-widget/Poppins/${cleanSymbol}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`,
      defaultHeight: 620,
      expandedHeight: 900,
    },
  ];

  if (!cleanSymbol) return null;

  return (
    <div className="w-full flex flex-col h-full space-y-3">
      {/* 1. Sub-Header Controls: Widget Switcher, Expand & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
        {/* Segmented Selector Buttons: Financial -> Technical -> SWOT -> Dual View */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.04] overflow-x-auto max-w-full">
          {widgetDefinitions.map((w) => {
            const Icon = w.icon;
            const isActive = activeWidget === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveWidget(w.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${w.color}`} />
                <span>{w.shortLabel}</span>
              </button>
            );
          })}

          {/* Side-by-Side Dual View for Desktop Screens */}
          <button
            type="button"
            onClick={() => setActiveWidget("split")}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeWidget === "split"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Side-by-side Financial Checklist and Technical view"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-violet-500" />
            <span>Dual View</span>
          </button>
        </div>

        {/* Right Tools: Expand Vertical View & Refresh */}
        <div className="flex items-center gap-2">
          {/* Vertical Height Expander Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse to standard height" : "Expand view height for full checklist"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3 h-3 text-emerald-500" />
                <span className="hidden sm:inline">Standard View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-emerald-500" />
                <span className="hidden sm:inline">Expand Height</span>
              </>
            )}
          </button>

          {/* Refresh Widget Data */}
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
              loading ? "animate-spin text-indigo-500" : ""
            }`}
            title="Refresh Widget Data"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Responsive Widget Surface */}
      <div key={`${cleanSymbol}-${refreshKey}-${activeWidget}-${isExpanded}`} className="w-full flex-1">
        {/* SINGLE WIDGET VIEW (Adaptive full responsive frame with generous vertical space) */}
        {activeWidget !== "split" && (
          <div className="w-full flex flex-col space-y-2">
            {(() => {
              const current = widgetDefinitions.find((w) => w.id === activeWidget) || widgetDefinitions[0];
              const Icon = current.icon;
              const targetHeight = isExpanded ? current.expandedHeight : current.defaultHeight;

              return (
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#151722] overflow-hidden shadow-xs flex flex-col">
                  {/* Top Bar with Description & Status */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1 rounded-md bg-white dark:bg-white/10 shadow-2xs shrink-0">
                        <Icon className={`w-3.5 h-3.5 ${current.color}`} />
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                          {current.label}
                        </span>
                        <span className="hidden md:inline text-[11px] text-slate-400">
                          {current.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full border ${current.bgBadge}`}>
                        LIVE FEED
                      </span>
                    </div>
                  </div>

                  {/* Expanded vertical container allowing complete display of checklist data */}
                  <div
                    className="w-full bg-white relative transition-all duration-200"
                    style={{
                      height: `${targetHeight}px`,
                      minHeight: `${targetHeight}px`,
                    }}
                  >
                    <iframe
                      src={current.url}
                      title={`${current.label} for ${cleanSymbol}`}
                      className="w-full h-full border-0"
                      style={{ width: "100%", height: "100%" }}
                      scrolling="yes"
                      loading="lazy"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* SPLIT / DUAL VIEW (Financial Checklist & Technical Analysis side-by-side with full height) */}
        {activeWidget === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 w-full">
            {/* Left: Financial Checklist */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#151722] overflow-hidden shadow-xs flex flex-col">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Financial Checklist (DVM)</span>
                </div>
                <span className="text-[9.5px] font-bold font-mono text-slate-400">Diagnostic</span>
              </div>
              <div
                className="w-full bg-white relative"
                style={{
                  height: `${isExpanded ? 1250 : 900}px`,
                  minHeight: `${isExpanded ? 1250 : 900}px`,
                }}
              >
                <iframe
                  src={widgetDefinitions[0].url}
                  title={`Financial Checklist for ${cleanSymbol}`}
                  className="w-full h-full border-0"
                  style={{ width: "100%", height: "100%" }}
                  scrolling="yes"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Right: Technical Analysis */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#151722] overflow-hidden shadow-xs flex flex-col">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Technical Analysis</span>
                </div>
                <span className="text-[9.5px] font-bold font-mono text-slate-400">NSE:{cleanSymbol}</span>
              </div>
              <div
                className="w-full bg-white relative"
                style={{
                  height: `${isExpanded ? 1250 : 900}px`,
                  minHeight: `${isExpanded ? 1250 : 900}px`,
                }}
              >
                <iframe
                  src={widgetDefinitions[1].url}
                  title={`Technical Analysis for ${cleanSymbol}`}
                  className="w-full h-full border-0"
                  style={{ width: "100%", height: "100%" }}
                  scrolling="yes"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
