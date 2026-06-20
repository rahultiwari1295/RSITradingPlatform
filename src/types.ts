/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EntryStrength = "STRONG" | "MEDIUM" | "WEAK";

export type TradeState = "ACTIVE" | "EXITED" | "SETUP" | "WATCHING" | "DORMANT";

export interface TradeRecord {
  _id: string;
  _owner?: string;
  _createdDate?: string;
  _updatedDate?: string;
  symbol: string;
  title: string;
  tradeId: string;
  signalType: string;
  signalDate: string;
  entryStrength: EntryStrength;
  telegramSent: boolean;
  t1Price: number | null;
  t1Date: string | null;
  t1Triggered: boolean;
  currentLtp?: number;
  ltp?: number;
  entryPrice: number;
  entryScore: number;
  tradeState: TradeState;
  currentRoi: number | null;
  entryBarsSinceP2: number;
  t1ReturnPct: number | null;
  purchased: boolean;
  purchasePrice?: number;
  purchaseQty?: number;
  purchasedDate?: string;
  exitPrice: number | null;
  exitDate: string | null;
  exitReason: string | null;
  tradeReturnPct: number | null;
  mfeHighWater: number;
  maxFavorablePct: number;
  maxAdversePct: number;
  entryRsiGap: number;
}

export interface TerminalKPIs {
  inEntryZone: number;
  tlCrossed: number;
  inTrade: number;
  winRate: number;
  avgReturn: number;
}

export interface TerminalDataResponse {
  success: boolean;
  kpis: TerminalKPIs;
  tableData: TradeRecord[];
  source?: "live" | "failed";
  error?: string;
}

export interface UpcomingStock {
  symbol: string;
  tradeState: "SETUP" | "WATCHING";
  tradeStateScore: number;
  quality: "STRONG" | "MEDIUM" | "WEAK" | string;
  ltp?: number;
}
