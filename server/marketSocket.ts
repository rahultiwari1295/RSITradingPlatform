import type { MarketIndex, MarketBreadth } from "../src/types";

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
    ltp: 22890.30,
    prevClose: 22760.10,
    open: 22790.00,
    high: 22940.00,
    low: 22750.50,
    change: 130.20,
    changePercent: 0.57,
    volume: 45000000,
    advances: 14,
    declines: 6,
    unchanged: 0,
    sparkline: [22760, 22790, 22780, 22830, 22810, 22860, 22840, 22910, 22890],
    week52High: 23800.00,
    week52Low: 19100.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY MIDCAP 100",
    name: "Nifty Midcap 100",
    category: "broad",
    exchange: "NSE",
    token: "99926014",
    ltp: 57420.10,
    prevClose: 56980.40,
    open: 57050.00,
    high: 57550.00,
    low: 57010.00,
    change: 439.70,
    changePercent: 0.77,
    volume: 87000000,
    advances: 68,
    declines: 32,
    unchanged: 0,
    sparkline: [56980, 57050, 57120, 57250, 57200, 57340, 57300, 57450, 57420],
    week52High: 58900.00,
    week52Low: 38200.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY SMALLCAP 100",
    name: "Nifty Smallcap 100",
    category: "broad",
    exchange: "NSE",
    token: "99926001",
    ltp: 18450.60,
    prevClose: 18320.00,
    open: 18360.00,
    high: 18510.00,
    low: 18330.00,
    change: 130.60,
    changePercent: 0.71,
    volume: 64000000,
    advances: 62,
    declines: 38,
    unchanged: 0,
    sparkline: [18320, 18360, 18350, 18410, 18390, 18440, 18420, 18470, 18450],
    week52High: 19400.00,
    week52Low: 11900.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY IT",
    name: "Nifty IT Sector",
    category: "sectoral",
    exchange: "NSE",
    token: "99926008",
    ltp: 41280.90,
    prevClose: 41650.00,
    open: 41500.00,
    high: 41620.00,
    low: 41150.00,
    change: -369.10,
    changePercent: -0.89,
    volume: 24000000,
    advances: 2,
    declines: 8,
    unchanged: 0,
    sparkline: [41650, 41500, 41420, 41380, 41410, 41320, 41250, 41300, 41280],
    week52High: 43200.00,
    week52Low: 29800.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY AUTO",
    name: "Nifty Automobiles",
    category: "sectoral",
    exchange: "NSE",
    token: "99926007",
    ltp: 25480.30,
    prevClose: 25210.00,
    open: 25280.00,
    high: 25540.00,
    low: 25250.00,
    change: 270.30,
    changePercent: 1.07,
    volume: 31000000,
    advances: 12,
    declines: 3,
    unchanged: 0,
    sparkline: [25210, 25280, 25310, 25390, 25370, 25440, 25410, 25500, 25480],
    week52High: 26100.00,
    week52Low: 15400.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY PHARMA",
    name: "Nifty Pharmaceuticals",
    category: "sectoral",
    exchange: "NSE",
    token: "99926011",
    ltp: 21940.50,
    prevClose: 21810.00,
    open: 21850.00,
    high: 22020.00,
    low: 21830.00,
    change: 130.50,
    changePercent: 0.60,
    volume: 19000000,
    advances: 14,
    declines: 6,
    unchanged: 0,
    sparkline: [21810, 21850, 21890, 21910, 21900, 21950, 21930, 21970, 21940],
    week52High: 22800.00,
    week52Low: 14600.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY FMCG",
    name: "Nifty Fast Moving Consumer Goods",
    category: "sectoral",
    exchange: "NSE",
    token: "99926005",
    ltp: 62410.20,
    prevClose: 62180.00,
    open: 62220.00,
    high: 62510.00,
    low: 62150.00,
    change: 230.20,
    changePercent: 0.37,
    volume: 16000000,
    advances: 10,
    declines: 5,
    unchanged: 0,
    sparkline: [62180, 62220, 62270, 62320, 62300, 62380, 62350, 62440, 62410],
    week52High: 64100.00,
    week52Low: 51200.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY METAL",
    name: "Nifty Metals & Mining",
    category: "sectoral",
    exchange: "NSE",
    token: "99926003",
    ltp: 9180.75,
    prevClose: 9090.00,
    open: 9110.00,
    high: 9230.00,
    low: 9095.00,
    change: 90.75,
    changePercent: 1.00,
    volume: 48000000,
    advances: 11,
    declines: 4,
    unchanged: 0,
    sparkline: [9090, 9110, 9130, 9160, 9145, 9190, 9170, 9210, 9180],
    week52High: 10100.00,
    week52Low: 6400.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY REALTY",
    name: "Nifty Realty",
    category: "sectoral",
    exchange: "NSE",
    token: "99926012",
    ltp: 1045.30,
    prevClose: 1032.00,
    open: 1035.00,
    high: 1052.00,
    low: 1031.00,
    change: 13.30,
    changePercent: 1.29,
    volume: 28000000,
    advances: 8,
    declines: 2,
    unchanged: 0,
    sparkline: [1032, 1035, 1038, 1042, 1040, 1046, 1043, 1048, 1045],
    week52High: 1140.00,
    week52Low: 520.00,
    lastUpdated: new Date().toISOString()
  },
  {
    symbol: "NIFTY ENERGY",
    name: "Nifty Energy & Oil",
    category: "sectoral",
    exchange: "NSE",
    token: "99926015",
    ltp: 39820.40,
    prevClose: 39650.00,
    open: 39700.00,
    high: 39950.00,
    low: 39620.00,
    change: 170.40,
    changePercent: 0.43,
    volume: 52000000,
    advances: 7,
    declines: 3,
    unchanged: 0,
    sparkline: [39650, 39700, 39740, 39790, 39760, 39840, 39810, 39860, 39820],
    week52High: 41800.00,
    week52Low: 26400.00,
    lastUpdated: new Date().toISOString()
  }
];

class MarketDataManager {
  private indices: Map<string, MarketIndex> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;

  constructor() {
    INITIAL_INDICES.forEach(idx => {
      this.indices.set(idx.symbol, { ...idx });
    });
    this.startEngine();
  }

  private startEngine() {
    if (this.tickInterval) clearInterval(this.tickInterval);

    // Live tick generator for realistic index price movement
    this.tickInterval = setInterval(() => {
      const symbols = Array.from(this.indices.keys());
      const selectedCount = Math.floor(Math.random() * 3) + 2;
      const shuffled = symbols.sort(() => 0.5 - Math.random()).slice(0, selectedCount);

      shuffled.forEach(sym => {
        const idx = this.indices.get(sym);
        if (!idx) return;

        const volatility = sym === "INDIA VIX" ? 0.004 : 0.0006;
        const tickPercent = (Math.random() - 0.48) * volatility;
        const newLtp = Number((idx.ltp * (1 + tickPercent)).toFixed(2));
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
      });
    }, 2500);
  }

  public getMarketStatus(): "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
    const day = istDate.getDay();
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const currentMin = hours * 60 + minutes;

    if (day === 0 || day === 6) return "CLOSED";
    if (currentMin >= 540 && currentMin < 555) return "PRE_OPEN";
    if (currentMin >= 555 && currentMin <= 930) return "OPEN";
    if (currentMin > 930 && currentMin <= 960) return "POST_CLOSE";
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
  } {
    return {
      indices: Array.from(this.indices.values()),
      breadth: this.getMarketBreadth(),
      status: this.getMarketStatus()
    };
  }
}

export const marketStream = new MarketDataManager();
