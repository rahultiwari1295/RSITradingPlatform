/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TerminalKPIs {
  totalSignals: number;
  toBuy: number;
  inTrade: number;
  closedTradeCount: number;
  stocksProcessed: number;
}

export interface ToBuySignal {
  symbol: string;
  type: string;
  date: string;
  price: number;
  rsiGap: number;
  barsSinceP2: number;
  p1Bi: number;
  p2Bi: number;
  tlSlope: number;
  tlValueAtCross: number;
  rsiGapMarginVsGate: number;
  maturityMarginVsGate: number;
  rsiHeadroomToOverbought: number;
  rsiHeadroomFromOversold: number;
  strategy: string;
  entryBlocked: boolean;
  blockReasons: string[];
  configIndex: number;
  isLive: boolean;
  sector: string;
  relativeStrength4W: number;
  relativeStrength12W: number;
  relativeStrength24W: number;
  niftyAbove200EMA: number;
  niftyDistanceFrom200EMA: number;
  distanceFrom50EMA: number;
  closeAbove200EMA: number;
  distanceFrom200EMA: number;
  atrPercent: number;
  bollingerWidth: number;
  rankScore: number;
  rankGrade: string;
  mlProbability: number;
  mlGrade: string;
  mlAction: string;
  mlRaw: number;
}

export interface InTradeTrade {
  symbol: string;
  sector: string;
  entryDate: string;
  entryPrice: number;
  entryRSI: number;
  exitReason: string | null;
  mfe: number;
  maxFavorable: number;
  maxAdverse: number;
  t1Triggered: boolean;
  t1ReturnPct: number | null;
  configIndex: number;
  mlProbability: number;
  mlGrade: string;
  mlAction: string;
  mlRaw: number;
  currentPrice: number;
  currentROI: number;
  lastUpdated: string;
}

export interface ClosedTrade {
  symbol: string;
  sector: string;
  entryDate: string;
  entryPrice: number;
  entryRSI: number;
  exitReason: string;
  mfe: number;
  maxFavorable: number;
  maxAdverse: number;
  t1Triggered: boolean;
  t1ReturnPct: number | null;
  configIndex: number;
  mlProbability: number;
  mlGrade: string;
  mlAction: string;
  mlRaw: number;
  exitDate: string;
  exitPrice: number;
  returnPct: number;
  pnlLabel: "WIN" | "LOSS" | string;
}

export interface TerminalDataResponse {
  success: boolean;
  generatedAt: string;
  kpis: TerminalKPIs;
  toBuySignals: ToBuySignal[];
  inTradeTrades: InTradeTrade[];
  portfolio: InTradeTrade[];
  closedTrades: ClosedTrade[];
  source?: "live" | "failed";
  error?: string;
}
