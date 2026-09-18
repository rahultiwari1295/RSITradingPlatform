import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  InTradeTrade,
  SectorAnalysisItem,
  MarketInsightItem,
  FeedsDataResponse
} from "../types";
import { SectorRotationHeatmap } from "../components/feeds/SectorRotationHeatmap";
import { MarketInsightsFeed } from "../components/feeds/MarketInsightsFeed";
import { BottomSheetItem } from "../components/BottomSheet";
import {
  FALLBACK_INDIAN_SECTORS,
  FALLBACK_MARKET_INSIGHTS
} from "../data/feedsFallback";

interface FeedsViewProps {
  inTradeTrades?: InTradeTrade[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal?: (symbol: string, price: number, strategy?: string) => void;
  onSelectStock?: (item: BottomSheetItem, allItems: BottomSheetItem[], idx: number) => void;
  onNavigateToActive?: () => void;
  marketSubTab?: "news" | "sectors";
  onCountsUpdate?: (news: number, sectors: number) => void;
}

// Client-side persistent device ID helper
function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem("trendlyne_device_id");
    if (!devId) {
      devId = "device_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
      localStorage.setItem("trendlyne_device_id", devId);
    }
    return devId;
  } catch {
    return "browser_client_" + Date.now();
  }
}

// Local cache retrieval helper to guarantee 0ms paint on mobile
function getInitialSectors(): SectorAnalysisItem[] {
  try {
    const raw = localStorage.getItem("quantsync_feeds_cache_sectors");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore error
  }
  return FALLBACK_INDIAN_SECTORS;
}

function getInitialInsights(): MarketInsightItem[] {
  try {
    const raw = localStorage.getItem("quantsync_feeds_cache_insights");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore error
  }
  return FALLBACK_MARKET_INSIGHTS;
}

export const FeedsView: React.FC<FeedsViewProps> = ({
  inTradeTrades = [],
  onOpenChart,
  marketSubTab = "news",
  onCountsUpdate,
}) => {
  const [timeframe, setTimeframe] = useState<"day" | "week">("day");
  // Instant initial data so mobile never opens to a blank/empty view
  const [sectors, setSectors] = useState<SectorAnalysisItem[]>(getInitialSectors);
  const [insights, setInsights] = useState<MarketInsightItem[]>(getInitialInsights);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Keep a stable ref for onCountsUpdate to prevent infinite re-render loops on mobile
  const onCountsUpdateRef = useRef(onCountsUpdate);
  useEffect(() => {
    onCountsUpdateRef.current = onCountsUpdate;
  }, [onCountsUpdate]);

  // Derive stable string of active symbols to avoid re-triggering on object identity changes
  const activeSymbolsStr = inTradeTrades.map((t) => t.symbol).sort().join(",");

  const fetchFeedsData = useCallback(async () => {
    setIsLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(
        `/api/feeds/overview?timeframe=${timeframe}&deviceId=${deviceId}&symbols=${encodeURIComponent(
          activeSymbolsStr
        )}`
      );

      if (res.ok) {
        const data: FeedsDataResponse = await res.json();
        if (data.success) {
          const s = data.sectors && data.sectors.length > 0 ? data.sectors : FALLBACK_INDIAN_SECTORS;
          const i = data.insights && data.insights.length > 0 ? data.insights : FALLBACK_MARKET_INSIGHTS;
          
          setSectors(s);
          setInsights(i);
          
          // Persist in local storage for instant mobile reload
          try {
            localStorage.setItem("quantsync_feeds_cache_sectors", JSON.stringify(s));
            localStorage.setItem("quantsync_feeds_cache_insights", JSON.stringify(i));
          } catch {
            // Ignore quota errors
          }

          onCountsUpdateRef.current?.(i.length, s.length);
        }
      }
    } catch (err) {
      console.warn("Feeds overview network issue, retained offline/cached dataset:", err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, activeSymbolsStr]);

  // Initial counts report on mount
  useEffect(() => {
    onCountsUpdateRef.current?.(insights.length, sectors.length);
  }, []); // Run once on mount

  useEffect(() => {
    fetchFeedsData();
  }, [fetchFeedsData]);

  const handleTimeframeChange = (tf: "day" | "week") => {
    setTimeframe(tf);
  };

  return (
    <div className="space-y-4 animate-fade-in-up pb-16">
      {/* ─── ONLY 2 DESKS: NEWS & SECTOR ROTATION ─── */}
      {marketSubTab === "news" && (
        <MarketInsightsFeed
          insights={insights}
          onOpenChart={onOpenChart}
          isLoading={isLoading}
        />
      )}

      {marketSubTab === "sectors" && (
        <SectorRotationHeatmap
          sectors={sectors}
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          onOpenChart={onOpenChart}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default FeedsView;
