import React, { useState } from "react";
import { Activity, CheckSquare, ShieldAlert, Sparkles, ExternalLink } from "lucide-react";

interface TrendlyneWidgetsProps {
  symbol: string;
  theme?: "light" | "dark";
}

export default function TrendlyneWidgets({ symbol }: TrendlyneWidgetsProps) {
  const [activeWidgetTab, setActiveWidgetTab] = useState<"all" | "technical" | "checklist" | "swot">("all");
  
  // Clean symbol of any exchange prefixes (e.g. NSE:GOKUL -> GOKUL)
  const cleanSymbol = (symbol || "").trim().toUpperCase().replace(/^(BSE|NSE):/i, "");

  const widgetConfigs = [
    {
      id: "technical",
      label: "Technical Analysis",
      icon: Activity,
      url: `https://trendlyne.com/web-widget/technical-widget/Poppins/${cleanSymbol}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`,
      height: "300px",
    },
    {
      id: "checklist",
      label: "DVM Checklist",
      icon: CheckSquare,
      url: `https://trendlyne.com/web-widget/checklist-widget/Poppins/${cleanSymbol}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`,
      height: "260px",
    },
    {
      id: "swot",
      label: "SWOT Insights",
      icon: ShieldAlert,
      url: `https://trendlyne.com/web-widget/swot-widget/Poppins/${cleanSymbol}/?posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E`,
      height: "280px",
    },
  ];

  if (!cleanSymbol) return null;

  return (
    <div className="w-full mt-4 pt-4 border-t border-[#ECEEF2] dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-[#14151A] dark:text-white leading-tight">
              Trendlyne Intelligence &middot; {cleanSymbol}
            </h4>
            <p className="text-[10.5px] text-[#8B8D98] font-medium">
              Technical, DVM checklist & SWOT analytics
            </p>
          </div>
        </div>

        <a
          href={`https://trendlyne.com/equity/${cleanSymbol}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-[#6366F1] hover:underline flex items-center gap-1 shrink-0"
        >
          Trendlyne
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Widget Tabs */}
      <div className="flex gap-1.5 p-1 rounded-[12px] bg-[#F1F2F5] dark:bg-white/[0.06] mb-3 text-[11px] font-bold overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveWidgetTab("all")}
          className={`px-2.5 py-1 rounded-[9px] transition-all shrink-0 cursor-pointer ${
            activeWidgetTab === "all"
              ? "bg-white dark:bg-[#14161E] text-[#14151A] dark:text-white shadow-xs font-extrabold"
              : "text-[#56586A] dark:text-[#8B8D98] hover:text-[#14151A]"
          }`}
        >
          All Insights
        </button>
        {widgetConfigs.map((w) => {
          const Icon = w.icon;
          const isActive = activeWidgetTab === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setActiveWidgetTab(w.id as any)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[9px] transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-[#14161E] text-[#14151A] dark:text-white shadow-xs font-extrabold"
                  : "text-[#56586A] dark:text-[#8B8D98] hover:text-[#14151A]"
              }`}
            >
              <Icon className="w-3 h-3" />
              {w.label.replace(" Analysis", "").replace(" Insights", "")}
            </button>
          );
        })}
      </div>

      {/* Widgets Container */}
      <div key={`${cleanSymbol}-${activeWidgetTab}`} className="space-y-3.5">
        {widgetConfigs
          .filter((w) => activeWidgetTab === "all" || activeWidgetTab === w.id)
          .map((w) => (
            <div
              key={w.id}
              className="rounded-[16px] border border-[#ECEEF2] dark:border-white/10 bg-white dark:bg-[#1A1D27] p-2.5 overflow-hidden shadow-2xs"
            >
              <div className="flex items-center gap-1.5 px-1 mb-2 text-[11.5px] font-bold text-[#14151A] dark:text-white">
                <w.icon className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>{w.label}</span>
              </div>
              <div className="w-full overflow-hidden rounded-lg bg-white">
                <iframe
                  src={w.url}
                  title={`Trendlyne ${w.label} for ${cleanSymbol}`}
                  style={{ width: "100%", height: w.height, border: "none", display: "block" }}
                  loading="lazy"
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
