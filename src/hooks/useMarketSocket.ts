import { useState, useEffect, useCallback } from "react";
import type { MarketIndex, MarketBreadth, SheetStockQuote } from "../types";

export interface UseMarketSocketReturn {
  indices: MarketIndex[];
  breadth: MarketBreadth | null;
  sheetQuotes: SheetStockQuote[];
  marketStatus: "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE";
  isRefreshing: boolean;
  refreshData: () => Promise<void>;
}

export function useMarketSocket(): UseMarketSocketReturn {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [sheetQuotes, setSheetQuotes] = useState<SheetStockQuote[]>([]);
  const [marketStatus, setMarketStatus] = useState<"OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE">("OPEN");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // REST snapshot fetch
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [resIndices, resSheets] = await Promise.all([
        fetch("/api/market/indices"),
        fetch("/api/sheets/quotes")
      ]);

      if (resIndices.ok) {
        const data = await resIndices.json();
        if (data.success && Array.isArray(data.indices)) {
          setIndices(data.indices);
          if (data.breadth) setBreadth(data.breadth);
          if (data.status) setMarketStatus(data.status);
        }
      }

      if (resSheets.ok) {
        const sData = await resSheets.json();
        if (sData.success && Array.isArray(sData.quotes)) {
          setSheetQuotes(sData.quotes);
        }
      }
    } catch (err) {
      console.warn("Market snapshot fetch failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    refreshData();

    // Clean background polling every 10 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshData]);

  return {
    indices,
    breadth,
    sheetQuotes,
    marketStatus,
    isRefreshing,
    refreshData
  };
}

