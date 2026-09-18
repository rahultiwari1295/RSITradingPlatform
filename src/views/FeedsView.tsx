import React, { useState, useEffect, useCallback } from "react";
import type {
  InTradeTrade,
  SectorAnalysisItem,
  MarketInsightItem,
  FeedsDataResponse
} from "../types";
import { SectorRotationHeatmap } from "../components/feeds/SectorRotationHeatmap";
import { MarketInsightsFeed } from "../components/feeds/MarketInsightsFeed";
import { BottomSheetItem } from "../components/BottomSheet";

interface FeedsViewProps {
  inTradeTrades?: InTradeTrade[];
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal?: (symbol: string, price: number, strategy?: string) => void;
  onSelectStock?: (item: BottomSheetItem, allItems: BottomSheetItem[], idx: number) => void;
  onNavigateToActive?: () => void;
  marketSubTab?: "news" | "sectors";
  onCountsUpdate?: (news: number, sectors: number) => void;
}

// Client-side persistent device ID helper to satisfy anti-blocking requirements
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

export const FeedsView: React.FC<FeedsViewProps> = ({
  inTradeTrades = [],
  onOpenChart,
  marketSubTab = "news",
  onCountsUpdate,
}) => {
  const [timeframe, setTimeframe] = useState<"day" | "week">("day");
  const [sectors, setSectors] = useState<SectorAnalysisItem[]>([]);
  const [insights, setInsights] = useState<MarketInsightItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFeedsData = useCallback(async () => {
    setIsLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const activeSymbols = inTradeTrades.map((t) => t.symbol).join(",");

      const res = await fetch(
        `/api/feeds/overview?timeframe=${timeframe}&deviceId=${deviceId}&symbols=${encodeURIComponent(
          activeSymbols
        )}`,
        {
          headers: {
            "x-device-id": deviceId,
          },
        }
      );

      if (res.ok) {
        const data: FeedsDataResponse = await res.json();
        if (data.success) {
          const s = data.sectors || [];
          const i = data.insights || [];
          setSectors(s);
          setInsights(i);
          onCountsUpdate?.(i.length, s.length);
        }
      }
    } catch (err) {
      console.error("Failed to load feeds overview:", err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, inTradeTrades, onCountsUpdate]);

  useEffect(() => {
    fetchFeedsData();
  }, [fetchFeedsData]);

  const handleTimeframeChange = (tf: "day" | "week") => {
    setTimeframe(tf);
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
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
