/**
 * setupEngine.ts — the single source of truth for "which breakout setups are actionable".
 *
 * Both the Radar screen and (until it is retired) the Pattern screen use this module, so the
 * two can never disagree about what counts as a Buy zone, a Retest, a Radar setup or a Runner.
 *
 * Pipeline (identical to the Pattern screen it was extracted from):
 *   1. merge the scanner sources and de-duplicate by symbol
 *   2. validity: needs a pivot, target not already hit, not FAILED / BEARISH / AVOID
 *   3. live prices (optional)
 *   4. ML quality gate: low-edge patterns are hidden
 *   5. classify by distance from the pivot (timeframe-aware)
 */

export type Timeframe = "DAILY" | "WEEKLY" | "MONTHLY";
export type TimeframeFilter = "ALL" | Timeframe;
export type TradeType = "RETEST" | "BUY_ZONE" | "RADAR" | "RUNNER";

// Scanner rows are loosely typed on purpose: the API adds fields over time.
export type SetupRow = Record<string, any>;
export type TaggedSetup = SetupRow & { _tradeType: TradeType };

/** Radar = below the pivot by at most this many percent. */
export const RADAR_MAX_BELOW_PCT = 3; // same 3% as the backend NEAR_BREAKOUT stage

export const PATTERN_OPTIONS: { id: string; label: string }[] = [
  { id: "BREAKOUT_RALLY", label: "Breakout Rally" },
  { id: "HORIZONTAL_RANGE", label: "Horizontal Base" },
  { id: "PULLBACK", label: "50-EMA Dip" },
  { id: "DOUBLE_BOTTOM", label: "Double Bottom (W)" },
  { id: "VCP_SQUEEZE", label: "VCP Squeeze" },
  { id: "TRIANGLE", label: "Triangle / Wedge" },
  { id: "CUP_HANDLE", label: "Cup & Handle" },
  { id: "INV_HEAD_SHOULDERS", label: "Inv. Head & Shoulders" },
];

export const MCAP_OPTIONS = [
  { id: "ALL", label: "All Caps" },
  { id: "Large-Cap", label: "Large Cap" },
  { id: "Mid-Cap", label: "Mid Cap" },
  { id: "Small-Cap", label: "Small Cap" },
  { id: "Micro-Cap", label: "Micro Cap" },
];

// ── Extracted verbatim from ScreenerScreen.tsx ────────────────────────────────

export function normalizePatternId(rawType?: string): string {
  if (!rawType) return "OTHER";
  const s = rawType.toLowerCase();
  if (s.includes("breakout rally") || s.includes("volume breakout") || s.includes("flag")) return "BREAKOUT_RALLY";
  if (s.includes("double bottom") || s.includes("double") || s.includes("w-reversal")) return "DOUBLE_BOTTOM";
  if (s.includes("horizontal") || s.includes("rectangle") || s.includes("box") || s.includes("multi_year") || s.includes("multi-year") || s.includes("saucer") || s.includes("darvas")) return "HORIZONTAL_RANGE";
  if (s.includes("pullback") || s.includes("50-day") || s.includes("ema")) return "PULLBACK";
  if (s.includes("volatility") || s.includes("vcp") || s.includes("squeeze")) return "VCP_SQUEEZE";
  if (s.includes("triangle") || s.includes("wedge")) return "TRIANGLE";
  if (s.includes("cup") || s.includes("handle")) return "CUP_HANDLE";
  if (s.includes("head") || s.includes("ihns")) return "INV_HEAD_SHOULDERS";
  return "OTHER";
}

export function getBreakoutClassification(s: any) {
  const cmp = Number(s.curr_price || 0);
  const brk = Number(s.breakout_level || 0);
  const tgt = Number(s.target_1 || 0);
  const sl = Number(s.stop_loss || 0);
  const hasPivot = brk > 0;
  const diffPct = hasPivot ? ((cmp - brk) / brk) * 100 : 0;
  const diffAbs = Math.abs(diffPct);
  const targetGainPct = (tgt > 0 && cmp > 0) ? ((tgt - cmp) / cmp * 100) : null;
  const tf = (s.timeframe || "DAILY").toUpperCase();

  // Buy Zone Thresholds under Option B
  const buyZoneLimit = tf === "MONTHLY" ? 10.0 : tf === "WEEKLY" ? 6.5 : 4.5;

  const isTargetHit = s.lifecycle_state === "TARGET_ACHIEVED" ||
    String(s.action_title || "").includes("Target Achieved") ||
    String(s.stage || "").includes("Target Achieved") ||
    s.stance === "NEUTRAL" ||
    (tgt > 0 && cmp >= tgt && brk > 0 && tgt > brk);

  let executionState: "BUY_ZONE" | "RETEST" | "EXTENDED" | "SUBMERGED" | "TARGET_ACHIEVED" = "BUY_ZONE";

  if (isTargetHit) {
    executionState = "TARGET_ACHIEVED";
  } else if (diffPct >= -1.8 && diffPct <= 1.2 && (s.breakout_status === "SUCCESS" || s.breakout_status === "POST_BREAKOUT" || Number(s.days_since_breakout || 0) >= 1)) {
    executionState = "RETEST";
  } else if (diffPct >= 0 && diffPct <= buyZoneLimit) {
    executionState = "BUY_ZONE";
  } else if (diffPct > buyZoneLimit) {
    executionState = "EXTENDED";
  } else {
    // Slipped below pivot floor (diffPct < -1.8%)
    executionState = "SUBMERGED";
  }

  // Compatibility flags
  const isGoodToBuy = executionState === "BUY_ZONE" || executionState === "RETEST";
  const isMissed = executionState === "EXTENDED";
  const isSkip = executionState === "SUBMERGED";

  let status: "BUY" | "MISSED" | "SKIP" | "TARGET_ACHIEVED" = "BUY";
  if (isTargetHit) status = "TARGET_ACHIEVED";
  else if (executionState === "EXTENDED") status = "MISSED";
  else if (executionState === "SUBMERGED") status = "SKIP";

  return {
    hasPivot,
    cmp,
    brk,
    tgt,
    sl,
    diffPct,
    diffAbs,
    targetGainPct,
    executionState,
    status,
    isGoodToBuy,
    isMissed,
    isSkip,
    isTargetHit
  };
}

export function matchesMcap(s: any, filter: string) {
  if (filter === "ALL") return true;
  const raw = (s.mcap_tier || "").toLowerCase();
  if (filter === "Large-Cap") return raw.includes("large");
  if (filter === "Mid-Cap") return raw.includes("mid");
  if (filter === "Small-Cap") return raw.includes("small");
  if (filter === "Micro-Cap") return raw.includes("micro");
  return true;
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export type Classification = ReturnType<typeof getBreakoutClassification>;

/** Merge scanner sources, first occurrence of a symbol wins. */
export function mergeSetupPool(...lists: Array<SetupRow[] | undefined | null>): SetupRow[] {
  const seen = new Set<string>();
  const out: SetupRow[] = [];
  for (const list of lists) {
    for (const s of list || []) {
      const sym = String((s && s.symbol) || "").toUpperCase();
      if (sym && !seen.has(sym)) {
        seen.add(sym);
        out.push(s);
      }
    }
  }
  return out;
}

/** Step 2: a setup must have a pivot, must not have hit its target, and must not be failed / bearish / avoid. */
export function isActionableSetup(s: SetupRow): boolean {
  const cmp = Number(s.curr_price || 0);
  const tgt = Number(s.target_1 || 0);
  const brk = Number(s.breakout_level || 0);
  if (!brk || brk <= 0 || !(cmp > 0)) return false;
  if (tgt > 0 && cmp >= tgt) return false;
  if (s.breakout_status === "FAILED") return false;
  if (s.stance === "BEARISH") return false;
  if (s.action && typeof s.action === "string" && s.action.toUpperCase().includes("AVOID")) return false;
  return true;
}

/** Step 3: overlay live prices (keyed by upper-case symbol). */
export function applyLivePrices(
  list: SetupRow[],
  livePrices?: Record<string, { price: number; change_pct?: number }> | null
): SetupRow[] {
  if (!livePrices || Object.keys(livePrices).length === 0) return list;
  return list.map((s) => {
    const live = livePrices[String(s.symbol || "").toUpperCase()];
    if (live && live.price > 0 && live.price !== s.curr_price) return { ...s, curr_price: live.price };
    return s;
  });
}

export type MlGate = { pattern_type: string; post_win_rate?: number; survival_verdict?: string; [k: string]: any };

export function buildMlGatesMap(data?: { gates?: MlGate[] } | null): Record<string, MlGate> {
  const map: Record<string, MlGate> = {};
  for (const g of data?.gates || []) {
    map[g.pattern_type] = g;
    map[String(g.pattern_type).replace(/_/g, " ").toUpperCase()] = g;
  }
  return map;
}

export function patternCode(s: SetupRow): string {
  return String(s.pattern_type || "").split("·")[0].trim().toUpperCase().replace(/[\s\-&]+/g, "_");
}

/** Step 4: true when the ML quality gate says this pattern has no edge. */
export function isLowEdge(s: SetupRow, gates: Record<string, MlGate>): boolean {
  const code = patternCode(s);
  if (!code) return false;
  const gate =
    gates[code] ||
    Object.values(gates).find((g) => code.includes(g.pattern_type) || (g.pattern_type && g.pattern_type.includes(code)));
  if (gate && (gate.survival_verdict === "PURGE" || Number(gate.post_win_rate) < 40)) return true;
  return code === "DOUBLE_BOTTOM" || code === "BULL_FLAG";
}

export interface SetupGroups {
  retest: TaggedSetup[];
  buyZone: TaggedSetup[];
  radar: TaggedSetup[];
  runners: TaggedSetup[];
}

/** Step 5: sort every actionable setup into exactly one group, each group already in its natural order. */
export function classifySetups(list: SetupRow[]): SetupGroups {
  const g: SetupGroups = { retest: [], buyZone: [], radar: [], runners: [] };
  for (const s of list) {
    const c = getBreakoutClassification(s);
    if (c.executionState === "RETEST") g.retest.push({ ...s, _tradeType: "RETEST" });
    else if (c.executionState === "BUY_ZONE") g.buyZone.push({ ...s, _tradeType: "BUY_ZONE" });
    else if (c.cmp < c.brk && c.diffAbs <= RADAR_MAX_BELOW_PCT) g.radar.push({ ...s, _tradeType: "RADAR" });
    else if (c.executionState === "EXTENDED") g.runners.push({ ...s, _tradeType: "RUNNER" });
  }
  const diff = (s: SetupRow) => getBreakoutClassification(s).diffPct;
  const dist = (s: SetupRow) => getBreakoutClassification(s).diffAbs;
  g.retest.sort((a, b) => dist(a) - dist(b)); // closest to the pivot first
  g.buyZone.sort((a, b) => diff(a) - diff(b)); // freshest (closest above the pivot) first
  g.radar.sort((a, b) => dist(a) - dist(b)); // closest to the trigger first
  g.runners.sort((a, b) => diff(b) - diff(a)); // biggest gainers first
  return g;
}

export interface SetupFilters {
  timeframe: TimeframeFilter;
  pattern: string; // "ALL" or a PATTERN_OPTIONS id
  mcap: string; // "ALL" or a MCAP_OPTIONS id
  sector: string; // "" = any
  fnoOnly: boolean;
  minScore: number;
  query: string;
}

export const DEFAULT_FILTERS: SetupFilters = {
  timeframe: "ALL",
  pattern: "ALL",
  mcap: "ALL",
  sector: "",
  fnoOnly: false,
  minScore: 0,
  query: "",
};

export function applySetupFilters<T extends SetupRow>(list: T[], f: SetupFilters): T[] {
  const q = f.query.trim().toLowerCase();
  return list.filter((s) => {
    if (f.timeframe !== "ALL" && String(s.timeframe || "DAILY").toUpperCase() !== f.timeframe) return false;
    if (f.pattern !== "ALL" && normalizePatternId(s.pattern_type) !== f.pattern) return false;
    if (f.mcap !== "ALL" && !matchesMcap(s, f.mcap)) return false;
    if (f.sector && s.sector !== f.sector) return false;
    if (f.fnoOnly && !(Number(s.is_fno) === 1 || s.is_fno === true)) return false;
    if (f.minScore > 0 && Number(s.dna_score || 0) < f.minScore) return false;
    if (q && !`${s.symbol || ""} ${s.company_name || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export type SortKey = "default" | "dna_score" | "rsi" | "volume_ratio";

/** Re-order a list by a user-chosen key. "default" keeps the group's natural order. */
export function sortSetups<T extends SetupRow>(list: T[], key: SortKey | string): T[] {
  const num = (v: any) => Number(v) || 0;
  const by = (get: (s: T) => number) => list.slice().sort((a, b) => get(b) - get(a));
  if (key === "dna_score") return by((s) => num(s.dna_score));
  if (key === "rsi") return by((s) => num(s.rsi));
  if (key === "volume_ratio") return by((s) => num(s.volume_ratio_20d));
  return list;
}

/** Price you would actually pay: the pivot for a Radar setup (buy-stop), the market price otherwise. */
export function entryPriceFor(s: SetupRow): number {
  const cmp = Number(s.curr_price || 0);
  const bk = Number(s.breakout_level || 0);
  return s._tradeType === "RADAR" && bk > 0 ? bk : cmp;
}

/** Reward/risk measured from the real entry price. Falls back to the server value only when levels are missing. */
export function rewardRisk(s: SetupRow): number {
  const ent = entryPriceFor(s);
  const sl = Number(s.stop_loss || 0);
  const tg = Number(s.target_1 || 0);
  if (ent > 0 && sl > 0 && tg > 0 && ent > sl && tg > ent) return (tg - ent) / (ent - sl);
  return Number(s.risk_reward_ratio || 0) > 0 ? Number(s.risk_reward_ratio) : 0;
}

export function timeframeLabel(tf?: string): string {
  const t = String(tf || "DAILY").toUpperCase();
  return t === "MONTHLY" ? "1M" : t === "WEEKLY" ? "1W" : "1D";
}

/** The most recent trading day (IST) for which a scan should exist: weekends skipped, today counts after 18:30 IST. */
export function expectedMarketClose(now: number = Date.now()): string {
  const ist = new Date(now + 19800000);
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const weekday = (x: Date) => x.getUTCDay() !== 0 && x.getUTCDay() !== 6;
  if (!(weekday(d) && minutes >= 1110)) {
    do {
      d.setUTCDate(d.getUTCDate() - 1);
    } while (!weekday(d));
  }
  return d.toISOString().slice(0, 10);
}

// ── Closed trades ledger ──────────────────────────────────────────────────────

/** Drops impossible 1-2 day gains of 25%+ that come from legacy test runs. */
export function sanitizeClosedRecords(records: SetupRow[]): SetupRow[] {
  return (records || []).filter((c) => {
    const bars = Number(c.holding_bars || 1);
    const pnl = Math.abs(Number(c.realized_pnl_pct || 0));
    return !(bars <= 2 && pnl > 25);
  });
}

export function closedTradeView(c: SetupRow) {
  const isWin = c.outcome_status === "TARGET_HIT" || !!c.is_win;
  const isLoss = c.outcome_status === "STOP_HIT";
  const pnl = Number(c.realized_pnl_pct || 0);
  const pivot = Number(c.pivot_price || 0);
  return {
    isWin,
    isLoss,
    pnl,
    pivot,
    exitPrice: pivot > 0 && pnl !== 0 ? pivot * (1 + pnl / 100) : Number(c.target_price || pivot),
    peakRun: Number(c.max_gain_pct || c.realized_pnl_pct || 0),
    days: Number(c.holding_bars || 1),
    pattern: String(c.pattern_name || c.pattern_type || "Setup").split("·")[0].trim(),
  };
}
