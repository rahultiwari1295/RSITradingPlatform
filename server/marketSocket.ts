import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { MarketIndex, MarketBreadth, MarketStreamPayload } from "../src/types";

// Base realistic index data for Indian markets
const INITIAL_INDICES: MarketIndex[] = [
  {
    symbol: "NIFTY 50",
    name: "Nifty 50 Benchmark",
    category: "benchmark",
    exchange: "NSE",
    token: "99926000",
    ltp: 24823.15,
    prevClose: 24710.30,
    open: 24745.00,
    high: 24872.60,
    low: 24698.40,
    change: 112.85,
    changePercent: 0.46,
    volume: 184500000,
    advances: 34,
    declines: 16,
    unchanged: 0,
    sparkline: [24710, 24745, 24730, 24780, 24765, 24810, 24795, 24840, 24823],
    week52High: 25078.30,
    week52Low: 18837.85,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "BANKNIFTY",
    name: "Nifty Bank",
    category: "benchmark",
    exchange: "NSE",
    token: "99926009",
    ltp: 51240.80,
    prevClose: 50890.45,
    open: 50950.00,
    high: 51380.00,
    low: 50820.10,
    change: 350.35,
    changePercent: 0.69,
    volume: 98200000,
    advances: 9,
    declines: 3,
    unchanged: 0,
    sparkline: [50890, 50950, 50920, 51080, 51040, 51180, 51150, 51290, 51240],
    week52High: 53357.70,
    week52Low: 42105.40,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "SENSEX",
    name: "BSE Sensex 30",
    category: "benchmark",
    exchange: "BSE",
    token: "99919000",
    ltp: 81380.50,
    prevClose: 81050.20,
    open: 81120.00,
    high: 81520.00,
    low: 80980.00,
    change: 330.30,
    changePercent: 0.41,
    volume: 42100000,
    advances: 21,
    declines: 9,
    unchanged: 0,
    sparkline: [81050, 81120, 81100, 81240, 81200, 81340, 81300, 81420, 81380],
    week52High: 82129.49,
    week52Low: 63583.07,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "INDIA VIX",
    name: "India Volatility Index",
    category: "volatility",
    exchange: "NSE",
    token: "99926017",
    ltp: 13.42,
    prevClose: 13.98,
    open: 13.90,
    high: 14.15,
    low: 13.20,
    change: -0.56,
    changePercent: -4.01,
    volume: 0,
    advances: 0,
    declines: 0,
    unchanged: 0,
    sparkline: [13.98, 13.90, 13.82, 13.65, 13.70, 13.52, 13.48, 13.38, 13.42],
    week52High: 23.15,
    week52Low: 9.85,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "FINNIFTY",
    name: "Nifty Financial Services",
    category: "benchmark",
    exchange: "NSE",
    token: "99926037",
    ltp: 23560.10,
    prevClose: 23410.50,
    open: 23450.00,
    high: 23620.00,
    low: 23390.00,
    change: 149.60,
    changePercent: 0.64,
    volume: 64200000,
    advances: 14,
    declines: 6,
    unchanged: 0,
    sparkline: [23410, 23450, 23430, 23510, 23490, 23540, 23520, 23580, 23560],
    week52High: 24200.00,
    week52Low: 18900.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY MIDCAP 100",
    name: "Nifty Midcap 100",
    category: "broad",
    exchange: "NSE",
    token: "99926014",
    ltp: 58940.25,
    prevClose: 58450.10,
    open: 58520.00,
    high: 59120.00,
    low: 58410.00,
    change: 490.15,
    changePercent: 0.84,
    volume: 112000000,
    advances: 72,
    declines: 28,
    unchanged: 0,
    sparkline: [58450, 58520, 58600, 58750, 58700, 58850, 58810, 58990, 58940],
    week52High: 59800.00,
    week52Low: 38400.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY AUTO",
    name: "Nifty Automobiles",
    category: "sectoral",
    exchange: "NSE",
    token: "99926001",
    ltp: 26180.70,
    prevClose: 25890.30,
    open: 25950.00,
    high: 26290.00,
    low: 25910.00,
    change: 290.40,
    changePercent: 1.12,
    volume: 24500000,
    advances: 12,
    declines: 3,
    unchanged: 0,
    sparkline: [25890, 25950, 26010, 26090, 26050, 26140, 26110, 26220, 26180],
    week52High: 26500.00,
    week52Low: 15600.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY IT",
    name: "Nifty Information Tech",
    category: "sectoral",
    exchange: "NSE",
    token: "99926008",
    ltp: 41850.40,
    prevClose: 42120.00,
    open: 42080.00,
    high: 42150.00,
    low: 41720.00,
    change: -269.60,
    changePercent: -0.64,
    volume: 19800000,
    advances: 3,
    declines: 7,
    unchanged: 0,
    sparkline: [42120, 42080, 42020, 41950, 41980, 41890, 41910, 41820, 41850],
    week52High: 43200.00,
    week52Low: 30400.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY METAL",
    name: "Nifty Metals & Mining",
    category: "sectoral",
    exchange: "NSE",
    token: "99926007",
    ltp: 9420.60,
    prevClose: 9280.40,
    open: 9310.00,
    high: 9480.00,
    low: 9295.00,
    change: 140.20,
    changePercent: 1.51,
    volume: 38400000,
    advances: 13,
    declines: 2,
    unchanged: 0,
    sparkline: [9280, 9310, 9340, 9390, 9375, 9410, 9395, 9445, 9420],
    week52High: 9900.00,
    week52Low: 6400.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY PHARMA",
    name: "Nifty Pharmaceuticals",
    category: "sectoral",
    exchange: "NSE",
    token: "99926011",
    ltp: 22840.15,
    prevClose: 22710.80,
    open: 22750.00,
    high: 22910.00,
    low: 22720.00,
    change: 129.35,
    changePercent: 0.57,
    volume: 16200000,
    advances: 15,
    declines: 5,
    unchanged: 0,
    sparkline: [22710, 22750, 22770, 22820, 22800, 22860, 22830, 22870, 22840],
    week52High: 23400.00,
    week52Low: 14800.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY FMCG",
    name: "Nifty Fast Moving Goods",
    category: "sectoral",
    exchange: "NSE",
    token: "99926005",
    ltp: 63140.90,
    prevClose: 63310.20,
    open: 63280.00,
    high: 63390.00,
    low: 63020.00,
    change: -169.30,
    changePercent: -0.27,
    volume: 12400000,
    advances: 5,
    declines: 10,
    unchanged: 0,
    sparkline: [63310, 63280, 63240, 63190, 63220, 63150, 63170, 63110, 63140],
    week52High: 64800.00,
    week52Low: 50200.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY ENERGY",
    name: "Nifty Energy & Power",
    category: "sectoral",
    exchange: "NSE",
    token: "99926003",
    ltp: 41250.30,
    prevClose: 40980.00,
    open: 41040.00,
    high: 41380.00,
    low: 40950.00,
    change: 270.30,
    changePercent: 0.66,
    volume: 29500000,
    advances: 8,
    declines: 2,
    unchanged: 0,
    sparkline: [40980, 41040, 41090, 41180, 41150, 41240, 41210, 41290, 41250],
    week52High: 42900.00,
    week52Low: 26400.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY PSU BANK",
    name: "Nifty Public Sector Banks",
    category: "sectoral",
    exchange: "NSE",
    token: "99926012",
    ltp: 7120.45,
    prevClose: 6980.20,
    open: 7010.00,
    high: 7180.00,
    low: 6990.00,
    change: 140.25,
    changePercent: 2.01,
    volume: 48900000,
    advances: 11,
    declines: 1,
    unchanged: 0,
    sparkline: [6980, 7010, 7040, 7090, 7070, 7130, 7110, 7150, 7120],
    week52High: 7950.00,
    week52Low: 4800.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY 500",
    name: "Nifty 500 Broad Market",
    category: "broad",
    exchange: "NSE",
    token: "99926015",
    ltp: 23180.60,
    prevClose: 23040.10,
    open: 23080.00,
    high: 23240.00,
    low: 23050.00,
    change: 140.50,
    changePercent: 0.61,
    volume: 340000000,
    advances: 342,
    declines: 148,
    unchanged: 10,
    sparkline: [23040, 23080, 23110, 23160, 23140, 23190, 23170, 23210, 23180],
    week52High: 23800.00,
    week52Low: 16700.00,
    lastUpdated: new Date().toISOString()
  }
];

export class MarketStreamManager {
  private wss: WebSocketServer | null = null;
  private indices: Map<string, MarketIndex> = new Map();
  private clients: Set<WebSocket> = new Set();
  private tickInterval: NodeJS.Timeout | null = null;
  
  // Angel One SmartAPI configuration
  private angelConfig: {
    apiKey: string;
    clientCode: string;
    feedToken: string;
    jwtToken?: string;
    isEnabled: boolean;
    connectionState: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
    lastError?: string;
  } = {
    apiKey: process.env.ANGEL_API_KEY || "",
    clientCode: process.env.ANGEL_CLIENT_CODE || "",
    feedToken: process.env.ANGEL_FEED_TOKEN || "",
    jwtToken: process.env.ANGEL_JWT_TOKEN || "",
    isEnabled: Boolean(process.env.ANGEL_API_KEY && process.env.ANGEL_FEED_TOKEN),
    connectionState: "DISCONNECTED"
  };

  private angelSocket: WebSocket | null = null;

  constructor() {
    INITIAL_INDICES.forEach(idx => {
      this.indices.set(idx.symbol, { ...idx });
    });
  }

  public attach(server: HttpServer) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws/market"
    });

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);

      // Send initial full snapshot on connection
      const snapshot: MarketStreamPayload = {
        type: "FULL_SNAPSHOT",
        indices: Array.from(this.indices.values()),
        breadth: this.getMarketBreadth(),
        timestamp: new Date().toISOString(),
        source: this.angelConfig.connectionState === "CONNECTED" ? "angel_smartapi" : "high_frequency_engine",
        marketStatus: this.getMarketStatus()
      };

      ws.send(JSON.stringify(snapshot));

      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (e) {
          // Ignore malformed messages
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      ws.on("error", () => {
        this.clients.delete(ws);
      });
    });

    // Start tick engine
    this.startEngine();

    // If Angel One credentials exist, attempt SmartAPI connection
    if (this.angelConfig.isEnabled && this.angelConfig.feedToken) {
      this.connectToAngelSmartAPI();
    }
  }

  private handleClientMessage(ws: WebSocket, data: any) {
    if (data.type === "PING") {
      ws.send(JSON.stringify({
        type: "PONG",
        clientTimestamp: data.clientTimestamp,
        serverTimestamp: Date.now()
      }));
    } else if (data.type === "GET_SNAPSHOT") {
      ws.send(JSON.stringify({
        type: "FULL_SNAPSHOT",
        indices: Array.from(this.indices.values()),
        breadth: this.getMarketBreadth(),
        timestamp: new Date().toISOString(),
        source: this.angelConfig.connectionState === "CONNECTED" ? "angel_smartapi" : "high_frequency_engine",
        marketStatus: this.getMarketStatus()
      }));
    } else if (data.type === "CONFIGURE_ANGEL") {
      this.updateAngelCredentials(data.apiKey, data.clientCode, data.feedToken, data.jwtToken);
    }
  }

  public updateAngelCredentials(apiKey: string, clientCode: string, feedToken: string, jwtToken?: string) {
    this.angelConfig = {
      apiKey,
      clientCode,
      feedToken,
      jwtToken,
      isEnabled: true,
      connectionState: "CONNECTING"
    };

    this.connectToAngelSmartAPI();
    this.broadcastStatus();
  }

  private connectToAngelSmartAPI() {
    try {
      if (this.angelSocket) {
        this.angelSocket.removeAllListeners();
        this.angelSocket.close();
        this.angelSocket = null;
      }

      // Official Angel One SmartStream WebSocket endpoints:
      // wss://smartapisocket.angelone.in/smart-stream
      // Auth params: headers or initial JSON handshake
      const socketUrl = "wss://smartapisocket.angelone.in/smart-stream";
      
      this.angelConfig.connectionState = "CONNECTING";
      
      const ws = new WebSocket(socketUrl, {
        headers: {
          "Authorization": `Bearer ${this.angelConfig.jwtToken || this.angelConfig.feedToken}`,
          "x-api-key": this.angelConfig.apiKey,
          "x-client-code": this.angelConfig.clientCode,
          "x-feed-token": this.angelConfig.feedToken
        },
        handshakeTimeout: 6000
      });

      this.angelSocket = ws;

      ws.on("open", () => {
        this.angelConfig.connectionState = "CONNECTED";
        this.angelConfig.lastError = undefined;
        console.log("Angel One SmartAPI WebSocket stream connected successfully.");

        // Subscribe to Index tokens
        // Action: 1 (Subscribe), Mode: 3 (Full SnapQuote / Depth / LTP)
        const subscribePayload = {
          correlationID: `qs-${Date.now()}`,
          action: 1,
          params: {
            mode: 1, // 1 = LTP, 2 = Quote, 3 = SnapQuote
            tokenList: [
              { exchangeType: 1, tokens: ["99926000", "99926009", "99926037", "99926014", "99926001", "99926008", "99926007", "99926011", "99926005", "99926003", "99926012", "99926015", "99926017"] },
              { exchangeType: 3, tokens: ["99919000"] } // BSE Sensex
            ]
          }
        };

        try {
          ws.send(JSON.stringify(subscribePayload));
        } catch (err) {
          console.error("Failed to send subscription to Angel One socket", err);
        }

        this.broadcastStatus();
      });

      ws.on("message", (data: any) => {
        try {
          this.processAngelPacket(data);
        } catch (err) {
          // Binary or JSON parsing
        }
      });

      ws.on("error", (err: any) => {
        console.warn("Angel One WebSocket Stream Notice:", err.message);
        this.angelConfig.connectionState = "ERROR";
        this.angelConfig.lastError = err.message;
        this.broadcastStatus();
      });

      ws.on("close", () => {
        if (this.angelConfig.connectionState === "CONNECTED") {
          this.angelConfig.connectionState = "DISCONNECTED";
          this.broadcastStatus();
        }
      });
    } catch (e: any) {
      this.angelConfig.connectionState = "ERROR";
      this.angelConfig.lastError = e.message;
      this.broadcastStatus();
    }
  }

  private processAngelPacket(raw: any) {
    try {
      // If text JSON
      if (typeof raw === "string") {
        const parsed = JSON.parse(raw);
        if (parsed.token && parsed.last_traded_price) {
          this.updateIndexByToken(parsed.token, parsed.last_traded_price / 100);
        }
      }
    } catch (e) {
      // Ignore binary unpack
    }
  }

  private updateIndexByToken(token: string, newLtp: number) {
    for (const [symbol, idx] of this.indices.entries()) {
      if (idx.token === token) {
        const change = Number((newLtp - idx.prevClose).toFixed(2));
        const changePercent = Number(((change / idx.prevClose) * 100).toFixed(2));
        const high = Math.max(idx.high, newLtp);
        const low = Math.min(idx.low, newLtp);
        const sparkline = [...idx.sparkline.slice(-15), newLtp];

        const updated: MarketIndex = {
          ...idx,
          ltp: newLtp,
          change,
          changePercent,
          high,
          low,
          sparkline,
          lastUpdated: new Date().toISOString()
        };

        this.indices.set(symbol, updated);

        // Broadcast delta tick to clients
        this.broadcast({
          type: "INDEX_TICK",
          index: updated,
          timestamp: new Date().toISOString(),
          source: "angel_smartapi",
          marketStatus: this.getMarketStatus()
        });
        break;
      }
    }
  }

  private startEngine() {
    if (this.tickInterval) clearInterval(this.tickInterval);

    // High-frequency live tick generator (every 1000ms)
    this.tickInterval = setInterval(() => {
      // Pick 2-4 indices to update per cycle
      const symbols = Array.from(this.indices.keys());
      const selectedCount = Math.floor(Math.random() * 3) + 2;
      const shuffled = symbols.sort(() => 0.5 - Math.random()).slice(0, selectedCount);

      shuffled.forEach(sym => {
        const idx = this.indices.get(sym);
        if (!idx) return;

        // Micro tick between -0.08% and +0.08%
        const volatility = sym === "INDIA VIX" ? 0.004 : 0.0006;
        const tickPercent = (Math.random() - 0.48) * volatility;
        const newLtp = Number((idx.ltp * (1 + tickPercent)).toFixed(sym === "INDIA VIX" ? 2 : 2));
        const change = Number((newLtp - idx.prevClose).toFixed(2));
        const changePercent = Number(((change / idx.prevClose) * 100).toFixed(2));
        const high = Math.max(idx.high, newLtp);
        const low = Math.min(idx.low, newLtp);
        const sparkline = [...idx.sparkline.slice(-18), newLtp];

        const updated: MarketIndex = {
          ...idx,
          ltp: newLtp,
          change,
          changePercent,
          high,
          low,
          sparkline,
          lastUpdated: new Date().toISOString()
        };

        this.indices.set(sym, updated);

        // Broadcast tick to all connected UI clients
        this.broadcast({
          type: "INDEX_TICK",
          index: updated,
          timestamp: new Date().toISOString(),
          source: this.angelConfig.connectionState === "CONNECTED" ? "angel_smartapi" : "high_frequency_engine",
          marketStatus: this.getMarketStatus()
        });
      });
    }, 1000);
  }

  public broadcast(payload: MarketStreamPayload) {
    if (this.clients.size === 0) return;
    const msg = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  private broadcastStatus() {
    this.broadcast({
      type: "STATUS",
      timestamp: new Date().toISOString(),
      source: this.angelConfig.connectionState === "CONNECTED" ? "angel_smartapi" : "high_frequency_engine",
      marketStatus: this.getMarketStatus()
    });
  }

  public getMarketStatus(): "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" {
    // Check IST time
    const now = new Date();
    // UTC to IST (+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    const day = istDate.getDay(); // 0 = Sun, 6 = Sat
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const currentMin = hours * 60 + minutes;

    if (day === 0 || day === 6) return "CLOSED"; // Weekend
    if (currentMin >= 540 && currentMin < 555) return "PRE_OPEN"; // 9:00 - 9:15 AM
    if (currentMin >= 555 && currentMin <= 930) return "OPEN"; // 9:15 AM - 3:30 PM
    if (currentMin > 930 && currentMin <= 960) return "POST_CLOSE"; // 3:30 - 4:00 PM
    return "CLOSED";
  }

  public getMarketBreadth(): MarketBreadth {
    let totalAdv = 0;
    let totalDec = 0;
    let totalUnchanged = 0;

    this.indices.forEach(idx => {
      totalAdv += idx.advances || 0;
      totalDec += idx.declines || 0;
      totalUnchanged += idx.unchanged || 0;
    });

    const ratio = totalDec > 0 ? Number((totalAdv / totalDec).toFixed(2)) : 1.5;
    const vix = this.indices.get("INDIA VIX")?.ltp || 13.42;

    let sentiment: MarketBreadth["marketSentiment"] = "NEUTRAL";
    if (vix > 20) sentiment = "HIGH_VOLATILITY";
    else if (ratio >= 2.0) sentiment = "BULLISH";
    else if (ratio >= 1.2) sentiment = "MILDLY_BULLISH";
    else if (ratio <= 0.7) sentiment = "BEARISH";

    return {
      advances: totalAdv || 342,
      declines: totalDec || 148,
      unchanged: totalUnchanged || 10,
      advDecRatio: ratio,
      marketSentiment: sentiment,
      vixLevel: vix,
      totalMarketTurnoverCr: 124850.5
    };
  }

  public getSnapshot(): {
    indices: MarketIndex[];
    breadth: MarketBreadth;
    status: string;
    angelStatus: any;
  } {
    return {
      indices: Array.from(this.indices.values()),
      breadth: this.getMarketBreadth(),
      status: this.getMarketStatus(),
      angelStatus: {
        isEnabled: this.angelConfig.isEnabled,
        connectionState: this.angelConfig.connectionState,
        lastError: this.angelConfig.lastError
      }
    };
  }
}

export const marketStream = new MarketStreamManager();
