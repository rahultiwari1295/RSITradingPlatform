/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "light" | "dark";
  interval?: "D" | "W" | "M" | "60";
  showHeader?: boolean;
}

export default function TradingViewWidget({
  symbol,
  theme = "light",
  interval = "D",
  showHeader = false
}: TradingViewWidgetProps) {
  // TradingView embed URL with interval and indicator parameters
  const iframeSrc = `https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=${interval}&theme=${theme}&style=1&timezone=Asia/Kolkata&locale=en&hide_side_toolbar=0&studies=%5B%22RSI%40tv-basicstudies%22%2C%22MASimple%40tv-basicstudies%22%5D&toolbarbg=${theme === "dark" ? "0f172a" : "f8f9fb"}`;

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-slate-950 overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/90 dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-gray-700 dark:text-slate-200">
              {symbol} &bull; {interval === "D" ? "Daily" : interval === "W" ? "Weekly" : interval === "M" ? "Monthly" : "60m"} Chart
            </span>
          </div>
          <a
            href={`https://www.tradingview.com/chart/qvyqZrhQ/?symbol=${symbol}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline font-semibold"
          >
            TradingView Web &rarr;
          </a>
        </div>
      )}
      <div className="flex-1 w-full h-full relative" id="tradingview-embed-container">
        <iframe
          id={`tradingview-iframe-${symbol}-${interval}`}
          key={`${symbol}-${interval}-${theme}`}
          title={`TradingView Chart for ${symbol}`}
          src={iframeSrc}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}

