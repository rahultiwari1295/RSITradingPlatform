/**
 * QuantSync Production API & VPS Endpoints
 * All endpoints use the permanent HTTPS domain: https://quantsync-api.duckdns.org:8000
 * Or relative Vercel proxy routes in production.
 */

export const VPS_BASE_URL = "https://quantsync-api.duckdns.org:8000";

export const API_ENDPOINTS = {
  // Candlestick Chart API
  chart: (symbol: string, limit = 250) => `/api/chart?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
  chartDirect: (symbol: string, limit = 250) => `${VPS_BASE_URL}/api/chart/${encodeURIComponent(symbol)}?limit=${limit}`,

  // Trendlyne Market Intelligence APIs
  intelSectors: (period: "day" | "week" = "day") => `/api/intel?type=sectors&period=${period}`,
  intelIndustries: (period: "day" | "week" = "day") => `/api/intel?type=industries&period=${period}`,
  intelIndices: (period: "day" | "week" = "day") => `/api/intel?type=indices&period=${period}`,
  intelNews: (limit = 50, stock?: string) => `/api/intel?type=news&limit=${limit}${stock ? `&stock=${encodeURIComponent(stock)}` : ""}`,
  intelStats: () => `/api/intel?type=stats`,

  // Direct VPS Intel Endpoints
  directIntelSectors: (period: "day" | "week" = "day") => `${VPS_BASE_URL}/api/intel/sectors?period=${period}`,
  directIntelIndustries: (period: "day" | "week" = "day") => `${VPS_BASE_URL}/api/intel/industries?period=${period}`,
  directIntelIndices: (period: "day" | "week" = "day") => `${VPS_BASE_URL}/api/intel/indices?period=${period}`,
  directIntelNews: (limit = 50, stock?: string) => `${VPS_BASE_URL}/api/intel/news?limit=${limit}${stock ? `&stock=${encodeURIComponent(stock)}` : ""}`,
  directIntelStats: () => `${VPS_BASE_URL}/api/intel/stats`,

  // Wix Terminal Data
  terminalData: (version: "v2" | "v3" = "v2") => `/api/terminal-data?version=${version}`,
  directTerminalDataV3: "https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalDataV3",
  directTerminalDataV2: "https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData",
};
