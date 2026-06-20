/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  symbol: string;
}

export default function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-sm font-semibold text-gray-700">
            BSE:{symbol} - Weekly Chart
          </span>
        </div>
        <a
          href={`https://www.tradingview.com/chart/?symbol=BSE:${symbol}`}
          target="_blank"
          referrerPolicy="no-referrer"
          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
        >
          Full Chart &rarr;
        </a>
      </div>
      <div className="flex-1 w-full relative min-h-[360px]" id="tradingview-embed-container">
        <iframe
          id={`tradingview-iframe-${symbol}`}
          title={`TradingView Chart for ${symbol}`}
          src={`https://s.tradingview.com/widgetembed/?symbol=BSE:${symbol}&interval=W&theme=light&style=1&timezone=Asia/Kolkata&locale=en`}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
