import { useState, useEffect, useRef, useCallback } from "react";
import type { MarketIndex, MarketBreadth, MarketStreamPayload, SheetStockQuote, GoogleSheetConfig } from "../types";

export interface UseMarketSocketReturn {
  indices: MarketIndex[];
  breadth: MarketBreadth | null;
  sheetQuotes: SheetStockQuote[];
  sheetConfig: GoogleSheetConfig | null;
  isSheetSyncing: boolean;
  marketStatus: "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE";
  source: "angel_smartapi" | "high_frequency_engine" | "google_sheets";
  connectionState: "CONNECTED" | "CONNECTING" | "DISCONNECTED";
  latencyMs: number;
  lastTickTime: string | null;
  configureAngel: (apiKey: string, clientCode: string, feedToken: string, jwtToken?: string) => Promise<boolean>;
  updateSheetConfig: (config: Partial<GoogleSheetConfig>) => Promise<boolean>;
  syncSheetNow: () => Promise<boolean>;
  reconnect: () => void;
  angelStatus: {
    isEnabled: boolean;
    connectionState: string;
    lastError?: string;
  };
}

export function useMarketSocket(): UseMarketSocketReturn {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [sheetQuotes, setSheetQuotes] = useState<SheetStockQuote[]>([]);
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(null);
  const [isSheetSyncing, setIsSheetSyncing] = useState<boolean>(false);
  const [marketStatus, setMarketStatus] = useState<"OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE">("OPEN");
  const [source, setSource] = useState<"angel_smartapi" | "high_frequency_engine" | "google_sheets">("high_frequency_engine");
  const [connectionState, setConnectionState] = useState<"CONNECTED" | "CONNECTING" | "DISCONNECTED">("CONNECTING");
  const [latencyMs, setLatencyMs] = useState<number>(24);
  const [lastTickTime, setLastTickTime] = useState<string | null>(null);
  const [angelStatus, setAngelStatus] = useState<{
    isEnabled: boolean;
    connectionState: string;
    lastError?: string;
  }>({
    isEnabled: false,
    connectionState: "DISCONNECTED"
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial REST fetch for instant paint
  const fetchSnapshot = useCallback(async () => {
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
          if (data.angelStatus) setAngelStatus(data.angelStatus);
        }
      }

      if (resSheets.ok) {
        const sData = await resSheets.json();
        if (sData.success && Array.isArray(sData.quotes)) {
          setSheetQuotes(sData.quotes);
          if (sData.config) setSheetConfig(sData.config);
        }
      }
    } catch (err) {
      console.warn("Market snapshot fallback failed:", err);
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState("CONNECTING");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/market`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("CONNECTED");
        // Start ping heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "PING",
              clientTimestamp: Date.now()
            }));
          }
        }, 4000);
      };

      ws.onmessage = (event) => {
        try {
          const payload: MarketStreamPayload = JSON.parse(event.data);

          if (payload.type === "FULL_SNAPSHOT" && payload.indices) {
            setIndices(payload.indices);
            if (payload.breadth) setBreadth(payload.breadth);
            if (payload.marketStatus) setMarketStatus(payload.marketStatus);
            if (payload.source) setSource(payload.source);
            setLastTickTime(new Date().toLocaleTimeString());
          } else if (payload.type === "INDEX_TICK" && payload.index) {
            const updatedIndex = payload.index;
            setIndices(prev => {
              const idx = prev.findIndex(i => i.symbol === updatedIndex.symbol);
              if (idx === -1) return [...prev, updatedIndex];
              const copy = [...prev];
              copy[idx] = updatedIndex;
              return copy;
            });
            if (payload.source) setSource(payload.source);
            if (payload.marketStatus) setMarketStatus(payload.marketStatus);
            setLastTickTime(new Date().toLocaleTimeString());
          } else if (payload.type === "SHEETS_UPDATED" && Array.isArray(payload.sheetQuotes)) {
            setSheetQuotes(payload.sheetQuotes);
            setLastTickTime(new Date().toLocaleTimeString());
          } else if (payload.type === "PONG") {
            const sent = (payload as any).clientTimestamp;
            if (sent) {
              const rtt = Date.now() - sent;
              setLatencyMs(Math.max(4, rtt));
            }
          } else if (payload.type === "STATUS") {
            if (payload.source) setSource(payload.source);
            if (payload.marketStatus) setMarketStatus(payload.marketStatus);
          }
        } catch (e) {
          // Ignore JSON errors
        }
      };

      ws.onclose = () => {
        setConnectionState("DISCONNECTED");
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Auto-reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setConnectionState("DISCONNECTED");
      };
    } catch (err) {
      console.warn("WebSocket initialization error:", err);
      setConnectionState("DISCONNECTED");
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect, fetchSnapshot]);

  const configureAngel = async (apiKey: string, clientCode: string, feedToken: string, jwtToken?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/market/configure-angel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, clientCode, feedToken, jwtToken })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status) setAngelStatus(data.status);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "CONFIGURE_ANGEL",
            apiKey,
            clientCode,
            feedToken,
            jwtToken
          }));
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("Configure Angel API error:", e);
      return false;
    }
  };

  const updateSheetConfig = async (config: Partial<GoogleSheetConfig>): Promise<boolean> => {
    try {
      const res = await fetch("/api/sheets/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) setSheetConfig(data.config);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Update sheet config error:", e);
      return false;
    }
  };

  const syncSheetNow = async (): Promise<boolean> => {
    setIsSheetSyncing(true);
    try {
      const res = await fetch("/api/sheets/sync-now", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.quotes) setSheetQuotes(data.quotes);
        if (data.config) setSheetConfig(data.config);
        setIsSheetSyncing(false);
        return data.success;
      }
      setIsSheetSyncing(false);
      return false;
    } catch (e) {
      console.error("Sync sheet now error:", e);
      setIsSheetSyncing(false);
      return false;
    }
  };

  const reconnect = () => {
    connect();
  };

  return {
    indices,
    breadth,
    sheetQuotes,
    sheetConfig,
    isSheetSyncing,
    marketStatus,
    source,
    connectionState,
    latencyMs,
    lastTickTime,
    configureAngel,
    updateSheetConfig,
    syncSheetNow,
    reconnect,
    angelStatus
  };
}
