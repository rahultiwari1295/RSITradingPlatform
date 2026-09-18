import type { SectorAnalysisItem, MarketInsightItem } from "../types";

export const FALLBACK_INDIAN_SECTORS: SectorAnalysisItem[] = [
  {
    id: "psu-banks",
    name: "PSU Banks",
    category: "sector",
    dayChangeP: 2.84,
    weekChangeP: 6.42,
    monthChangeP: 11.2,
    yearChangeP: 44.5,
    marketCapCr: 1542000,
    advances: 10,
    declines: 2,
    unchanged: 0,
    totalStocks: 12,
    pe: 8.4,
    pb: 1.15,
    trend: "VERY_BULLISH",
    topGainers: [
      { symbol: "SBIN", name: "State Bank of India", changeP: 3.45, ltp: 842.15 },
      { symbol: "PNB", name: "Punjab National Bank", changeP: 4.12, ltp: 118.5 },
      { symbol: "CANBK", name: "Canara Bank", changeP: 2.95, ltp: 112.4 }
    ],
    topDraggers: [
      { symbol: "CENTRALBK", name: "Central Bank of India", changeP: -0.45, ltp: 62.1 }
    ],
    sparkline: [2.1, 2.3, 2.0, 2.4, 2.7, 2.65, 2.84],
    activeSignalsCount: 1,
    activeSignals: ["SBIN"]
  },
  {
    id: "capital-goods",
    name: "Capital Goods & Infra",
    category: "sector",
    dayChangeP: 1.95,
    weekChangeP: 5.18,
    monthChangeP: 8.9,
    yearChangeP: 52.8,
    marketCapCr: 2180000,
    advances: 24,
    declines: 6,
    unchanged: 2,
    totalStocks: 32,
    pe: 42.1,
    pb: 5.8,
    trend: "BREAKOUT",
    topGainers: [
      { symbol: "BHEL", name: "Bharat Heavy Electricals", changeP: 4.82, ltp: 294.6 },
      { symbol: "LT", name: "Larsen & Toubro", changeP: 2.15, ltp: 3710.0 },
      { symbol: "SIEMENS", name: "Siemens India", changeP: 2.4, ltp: 6940.5 }
    ],
    topDraggers: [
      { symbol: "THERMAX", name: "Thermax Ltd", changeP: -0.85, ltp: 4890.0 }
    ],
    sparkline: [1.2, 1.4, 1.35, 1.6, 1.8, 1.75, 1.95],
    activeSignalsCount: 2,
    activeSignals: ["BHEL", "LT"]
  },
  {
    id: "defence-aerospace",
    name: "Defence & Aerospace",
    category: "industry",
    dayChangeP: 2.45,
    weekChangeP: 7.85,
    monthChangeP: 14.3,
    yearChangeP: 88.2,
    marketCapCr: 795000,
    advances: 8,
    declines: 1,
    unchanged: 0,
    totalStocks: 9,
    pe: 38.5,
    pb: 7.2,
    trend: "VERY_BULLISH",
    topGainers: [
      { symbol: "HAL", name: "Hindustan Aeronautics", changeP: 3.65, ltp: 4820.0 },
      { symbol: "BEL", name: "Bharat Electronics", changeP: 2.85, ltp: 312.4 },
      { symbol: "MAZDOCK", name: "Mazagon Dock Shipbuilders", changeP: 4.15, ltp: 4560.0 }
    ],
    topDraggers: [
      { symbol: "ASTRAMICRO", name: "Astra Microwave", changeP: -0.2, ltp: 912.0 }
    ],
    sparkline: [1.5, 1.8, 1.6, 2.1, 2.3, 2.2, 2.45],
    activeSignalsCount: 1,
    activeSignals: ["BEL"]
  },
  {
    id: "auto-components",
    name: "Automobiles & EV",
    category: "sector",
    dayChangeP: 1.48,
    weekChangeP: 3.25,
    monthChangeP: 6.7,
    yearChangeP: 38.4,
    marketCapCr: 1820000,
    advances: 18,
    declines: 4,
    unchanged: 1,
    totalStocks: 23,
    pe: 26.2,
    pb: 4.1,
    trend: "BULLISH",
    topGainers: [
      { symbol: "M&M", name: "Mahindra & Mahindra", changeP: 2.75, ltp: 2985.0 },
      { symbol: "TATAMOTORS", name: "Tata Motors", changeP: 1.9, ltp: 1045.5 },
      { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", changeP: 1.65, ltp: 9840.0 }
    ],
    topDraggers: [
      { symbol: "EICHERMOT", name: "Eicher Motors", changeP: -0.6, ltp: 4820.0 }
    ],
    sparkline: [0.8, 1.0, 1.1, 1.25, 1.4, 1.35, 1.48],
    activeSignalsCount: 0,
    activeSignals: []
  },
  {
    id: "pharma-healthcare",
    name: "Pharma & Diagnostics",
    category: "sector",
    dayChangeP: 1.12,
    weekChangeP: 4.15,
    monthChangeP: 7.4,
    yearChangeP: 42.1,
    marketCapCr: 1650000,
    advances: 21,
    declines: 7,
    unchanged: 2,
    totalStocks: 30,
    pe: 34.8,
    pb: 4.9,
    trend: "BULLISH",
    topGainers: [
      { symbol: "VIJAYA", name: "Vijaya Diagnostic", changeP: 2.85, ltp: 894.2 },
      { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", changeP: 1.85, ltp: 1785.0 },
      { symbol: "CIPLA", name: "Cipla Ltd", changeP: 1.4, ltp: 1610.0 }
    ],
    topDraggers: [
      { symbol: "AUROPHARMA", name: "Aurobindo Pharma", changeP: -1.1, ltp: 1420.0 }
    ],
    sparkline: [0.6, 0.75, 0.9, 0.85, 1.05, 1.0, 1.12],
    activeSignalsCount: 1,
    activeSignals: ["VIJAYA"]
  },
  {
    id: "power-energy",
    name: "Power & Green Energy",
    category: "sector",
    dayChangeP: 1.72,
    weekChangeP: 4.9,
    monthChangeP: 9.8,
    yearChangeP: 68.4,
    marketCapCr: 1420000,
    advances: 15,
    declines: 3,
    unchanged: 1,
    totalStocks: 19,
    pe: 22.4,
    pb: 3.2,
    trend: "BULLISH",
    topGainers: [
      { symbol: "NTPC", name: "NTPC Ltd", changeP: 2.45, ltp: 418.0 },
      { symbol: "POWERGRID", name: "Power Grid Corp", changeP: 1.85, ltp: 342.5 },
      { symbol: "TATAPOWER", name: "Tata Power", changeP: 2.1, ltp: 452.0 }
    ],
    topDraggers: [
      { symbol: "SUZLON", name: "Suzlon Energy", changeP: -0.75, ltp: 74.2 }
    ],
    sparkline: [1.1, 1.3, 1.25, 1.5, 1.6, 1.65, 1.72],
    activeSignalsCount: 1,
    activeSignals: ["TATAPOWER"]
  },
  {
    id: "metals-mining",
    name: "Metals & Mining",
    category: "sector",
    dayChangeP: 0.85,
    weekChangeP: 2.95,
    monthChangeP: 5.1,
    yearChangeP: 31.2,
    marketCapCr: 1210000,
    advances: 11,
    declines: 5,
    unchanged: 0,
    totalStocks: 16,
    pe: 14.8,
    pb: 2.1,
    trend: "NEUTRAL",
    topGainers: [
      { symbol: "TATASTEEL", name: "Tata Steel", changeP: 1.75, ltp: 156.4 },
      { symbol: "HINDALCO", name: "Hindalco Industries", changeP: 1.45, ltp: 692.0 }
    ],
    topDraggers: [
      { symbol: "VEDL", name: "Vedanta Ltd", changeP: -0.65, ltp: 472.0 }
    ],
    sparkline: [0.3, 0.45, 0.4, 0.6, 0.7, 0.75, 0.85],
    activeSignalsCount: 0,
    activeSignals: []
  },
  {
    id: "realty",
    name: "Real Estate & Housing",
    category: "sector",
    dayChangeP: 1.35,
    weekChangeP: 4.85,
    monthChangeP: 9.1,
    yearChangeP: 61.4,
    marketCapCr: 680000,
    advances: 12,
    declines: 3,
    unchanged: 0,
    totalStocks: 15,
    pe: 46.2,
    pb: 4.4,
    trend: "BULLISH",
    topGainers: [
      { symbol: "DLF", name: "DLF Ltd", changeP: 2.1, ltp: 885.0 },
      { symbol: "GODREJPROP", name: "Godrej Properties", changeP: 1.85, ltp: 3120.0 }
    ],
    topDraggers: [
      { symbol: "OBEROIRLTY", name: "Oberoi Realty", changeP: -0.4, ltp: 1840.0 }
    ],
    sparkline: [0.7, 0.9, 0.85, 1.1, 1.25, 1.2, 1.35],
    activeSignalsCount: 0,
    activeSignals: []
  },
  {
    id: "telecom-cables",
    name: "Telecom & Optical Cables",
    category: "industry",
    dayChangeP: 2.15,
    weekChangeP: 5.75,
    monthChangeP: 10.4,
    yearChangeP: 48.9,
    marketCapCr: 840000,
    advances: 7,
    declines: 2,
    unchanged: 0,
    totalStocks: 9,
    pe: 36.1,
    pb: 4.2,
    trend: "BREAKOUT",
    topGainers: [
      { symbol: "BHARTIARTL", name: "Bharti Airtel", changeP: 2.45, ltp: 1612.0 },
      { symbol: "HFCL", name: "HFCL Ltd", changeP: 3.85, ltp: 142.5 }
    ],
    topDraggers: [
      { symbol: "IDEA", name: "Vodafone Idea", changeP: -1.2, ltp: 9.85 }
    ],
    sparkline: [1.2, 1.4, 1.6, 1.75, 1.95, 2.05, 2.15],
    activeSignalsCount: 1,
    activeSignals: ["HFCL"]
  },
  {
    id: "chemicals-fertilizers",
    name: "Specialty Chemicals",
    category: "sector",
    dayChangeP: 0.92,
    weekChangeP: 3.1,
    monthChangeP: 4.8,
    yearChangeP: 21.5,
    marketCapCr: 720000,
    advances: 14,
    declines: 6,
    unchanged: 1,
    totalStocks: 21,
    pe: 38.2,
    pb: 4.7,
    trend: "BULLISH",
    topGainers: [
      { symbol: "DEEPAKNTR", name: "Deepak Nitrite", changeP: 2.15, ltp: 2910.0 },
      { symbol: "SRF", name: "SRF Ltd", changeP: 1.6, ltp: 2480.0 }
    ],
    topDraggers: [
      { symbol: "AARTIIND", name: "Aarti Industries", changeP: -0.55, ltp: 585.0 }
    ],
    sparkline: [0.4, 0.55, 0.5, 0.7, 0.85, 0.8, 0.92],
    activeSignalsCount: 0,
    activeSignals: []
  },
  {
    id: "fmcg",
    name: "Fast Moving Consumer Goods",
    category: "sector",
    dayChangeP: 0.28,
    weekChangeP: 1.15,
    monthChangeP: 2.8,
    yearChangeP: 18.2,
    marketCapCr: 2450000,
    advances: 9,
    declines: 6,
    unchanged: 1,
    totalStocks: 16,
    pe: 54.2,
    pb: 11.2,
    trend: "NEUTRAL",
    topGainers: [
      { symbol: "ITC", name: "ITC Ltd", changeP: 1.1, ltp: 512.0 },
      { symbol: "MARICO", name: "Marico Ltd", changeP: 0.85, ltp: 665.0 }
    ],
    topDraggers: [
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", changeP: -0.45, ltp: 2790.0 }
    ],
    sparkline: [0.1, 0.15, 0.1, 0.2, 0.25, 0.3, 0.28],
    activeSignalsCount: 0,
    activeSignals: []
  },
  {
    id: "it-tech",
    name: "IT & Software Services",
    category: "sector",
    dayChangeP: -0.42,
    weekChangeP: 1.85,
    monthChangeP: 3.4,
    yearChangeP: 24.6,
    marketCapCr: 2850000,
    advances: 8,
    declines: 14,
    unchanged: 1,
    totalStocks: 23,
    pe: 31.5,
    pb: 7.8,
    trend: "NEUTRAL",
    topGainers: [
      { symbol: "COFORGE", name: "Coforge Ltd", changeP: 1.65, ltp: 6840.0 },
      { symbol: "PERSISTENT", name: "Persistent Systems", changeP: 1.2, ltp: 5120.0 }
    ],
    topDraggers: [
      { symbol: "INFY", name: "Infosys Ltd", changeP: -0.95, ltp: 1845.0 },
      { symbol: "TCS", name: "Tata Consultancy Services", changeP: -0.55, ltp: 4310.0 }
    ],
    sparkline: [0.2, 0.1, -0.2, -0.15, -0.3, -0.4, -0.42],
    activeSignalsCount: 0,
    activeSignals: []
  }
];

export const FALLBACK_MARKET_INSIGHTS: MarketInsightItem[] = [
  {
    id: "insight-bhel-order",
    headline: "BHEL secures massive ₹6,100 Crore EPC thermal power contract from NTPC",
    summary: "Bharat Heavy Electricals bags commercial contract for 2x800 MW supercritical expansion project with complete boiler, turbine generator and emission controls.",
    symbol: "BHEL",
    companyName: "Bharat Heavy Electricals",
    category: "ORDER_WIN",
    sentiment: "VERY_BULLISH",
    timeAgo: "24m ago",
    timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    impactScore: 92,
    priceImpactEst: "+4% to +7%",
    source: "BSE Filing / Trendlyne",
    tags: ["Order Win", "Capital Goods", "PSU"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-bel-defence",
    headline: "Bharat Electronics signs ₹1,150 Crore contract with Indian Armed Forces",
    summary: "BEL confirms domestic orders for multi-beam radars, advanced acoustic sensors, and electronic warfare software suites with delivery scheduled across 24 months.",
    symbol: "BEL",
    companyName: "Bharat Electronics",
    category: "ORDER_WIN",
    sentiment: "VERY_BULLISH",
    timeAgo: "1h ago",
    timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    impactScore: 88,
    priceImpactEst: "+3% to +5%",
    source: "NSE Announcement",
    tags: ["Defence", "Radar Systems", "Make In India"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-vijaya-expansion",
    headline: "Vijaya Diagnostic expands into 18 new hubs; reports 24% YoY volume surge",
    summary: "Specialized integrated pathology and radiology chain accelerates Tier-2 expansion with margin-accretive high-end MRI/PET-CT installations.",
    symbol: "VIJAYA",
    companyName: "Vijaya Diagnostic Centre",
    category: "EXPANSION",
    sentiment: "BULLISH",
    timeAgo: "2h ago",
    timestamp: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    impactScore: 82,
    priceImpactEst: "+2% to +4%",
    source: "Investor Presentation",
    tags: ["Diagnostics", "Healthcare", "Midcap Growth"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-hal-exports",
    headline: "HAL gets cabinet nod for 240 AL-31FP aero-engines valued at ₹26,000 Crore",
    summary: "Ministry of Defence sanctions full manufacturing package for Sukhoi-30MKI fighter aircraft engines with over 54% indigenous component integration.",
    symbol: "HAL",
    companyName: "Hindustan Aeronautics",
    category: "ORDER_WIN",
    sentiment: "VERY_BULLISH",
    timeAgo: "3h ago",
    timestamp: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    impactScore: 95,
    priceImpactEst: "+5% to +8%",
    source: "PIB / BSE",
    tags: ["Defence", "Aerospace", "Government Cleared"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-sbin-brokerage",
    headline: "Global Brokerages hike SBI target to ₹1,020; cite credit growth & ROA expansion",
    summary: "Morgan Stanley and Nomura maintain Overweight rating highlighting pristine asset quality, GNPA dropping below 2.15%, and strong retail corporate disbursement pipeline.",
    symbol: "SBIN",
    companyName: "State Bank of India",
    category: "UPGRADE",
    sentiment: "BULLISH",
    timeAgo: "4h ago",
    timestamp: new Date(Date.now() - 250 * 60 * 1000).toISOString(),
    impactScore: 84,
    priceImpactEst: "+2.5% to +4.5%",
    source: "Brokerage Note",
    tags: ["Banking", "Target Upgrade", "PSU Giant"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-tatapower-renewables",
    headline: "Tata Power Renewable Energy signs 400 MW solar-wind hybrid PPA with MSEDCL",
    summary: "Long-term 25-year Power Purchase Agreement signed at tariff of ₹3.24/kWh with commissioning timeline pegged at 24 months in Maharashtra.",
    symbol: "TATAPOWER",
    companyName: "Tata Power Company",
    category: "EXPANSION",
    sentiment: "BULLISH",
    timeAgo: "5h ago",
    timestamp: new Date(Date.now() - 310 * 60 * 1000).toISOString(),
    impactScore: 79,
    priceImpactEst: "+1.5% to +3%",
    source: "Exchange Filing",
    tags: ["Green Energy", "Solar", "Tata Group"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-hfcl-us-expansion",
    headline: "HFCL commences shipment of 5G optical cables to North American tier-1 telco",
    summary: "Company scales up international order execution under US BEAD (Broadband Equity Access & Deployment) federal incentive framework.",
    symbol: "HFCL",
    companyName: "HFCL Ltd",
    category: "ORDER_WIN",
    sentiment: "BULLISH",
    timeAgo: "6h ago",
    timestamp: new Date(Date.now() - 380 * 60 * 1000).toISOString(),
    impactScore: 81,
    priceImpactEst: "+3% to +6%",
    source: "NSE Disclosure",
    tags: ["Telecom", "5G Exports", "Make in India"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-tcs-ai-partnership",
    headline: "TCS expands partnership with Google Cloud to deploy enterprise GenAI suites",
    summary: "Multi-year deal targets banking and manufacturing clients to migrate legacy core architectures to cloud-native AI agents with 35,000 certified engineers.",
    symbol: "TCS",
    companyName: "Tata Consultancy Services",
    category: "EXPANSION",
    sentiment: "NEUTRAL",
    timeAgo: "7h ago",
    timestamp: new Date(Date.now() - 440 * 60 * 1000).toISOString(),
    impactScore: 72,
    priceImpactEst: "+0.5% to +1.5%",
    source: "Press Release",
    tags: ["IT Services", "GenAI", "Cloud"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-sunpharma-usfda",
    headline: "Sun Pharma receives USFDA EIR for Halol facility with zero 483 observations",
    summary: "Establishment Inspection Report clears key manufacturing unit for generic injectables and dermatological therapies, lifting long-standing regulatory overhang.",
    symbol: "SUNPHARMA",
    companyName: "Sun Pharmaceutical",
    category: "REGULATORY",
    sentiment: "VERY_BULLISH",
    timeAgo: "8h ago",
    timestamp: new Date(Date.now() - 500 * 60 * 1000).toISOString(),
    impactScore: 89,
    priceImpactEst: "+3% to +5%",
    source: "USFDA / BSE",
    tags: ["Pharma", "USFDA EIR", "Overhang Cleared"],
    isMatchingActiveSignal: false
  },
  {
    id: "insight-blockdeal-m-and-m",
    headline: "Block Deal: Large institutional fund picks up 1.2% equity in Mahindra & Mahindra",
    summary: "1.45 Crore shares change hands in multiple tranches on NSE at average price of ₹2,940, indicating sustained institutional accumulation in utility vehicles.",
    symbol: "M&M",
    companyName: "Mahindra & Mahindra",
    category: "BLOCK_DEAL",
    sentiment: "BULLISH",
    timeAgo: "9h ago",
    timestamp: new Date(Date.now() - 560 * 60 * 1000).toISOString(),
    impactScore: 78,
    priceImpactEst: "+1.5% to +2.5%",
    source: "NSE Bulk/Block",
    tags: ["Block Deal", "Auto OEM", "Institutional Buying"],
    isMatchingActiveSignal: false
  }
];
