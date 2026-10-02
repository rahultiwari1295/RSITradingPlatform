export type SignalStatusKey =
  | "best_buy"
  | "good_buy"
  | "late_buy"
  | "missed"
  | "skip"
  | "closed";

export interface SignalStatusInfo {
  key: SignalStatusKey;
  label: string; // 1-word status: "BEST", "GOOD", "LATE", "MISSED", "SKIP", "CLOSED"
  badgeClass: string;
  dotColor: string;
  actionGuidance: string; // "Ideal time to enter", "Little late to buy - don't enter", etc.
  tooltip: string;
  conditionDescription: string;
}

/**
 * Evaluates the status of an alert based on holding days and return percentage:
 * - BEST: Fresh signal (≤ 3 days) and hasn't increased much (≤ 3%).
 * - GOOD: Fresh signal (≤ 3 days) with healthy moderate gain (+3% to +5%).
 * - LATE: 4+ days old OR gain is +5% to +7% ("Little late, higher risk of pullback").
 * - MISSED: Stock has already surged +7%+ ("Big rally, do NOT chase now").
 * - SKIP: Old signal (6+ days) with stagnant movement (<2%) or testing stop loss ("Skip entering").
 */
export function getSignalStatus(
  mode: "active" | "closed",
  holdingDays: number = 1,
  returnPct: number = 0
): SignalStatusInfo {
  if (mode === "closed") {
    return {
      key: "closed",
      label: "CLOSED",
      badgeClass:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      dotColor: "bg-slate-400",
      actionGuidance: "Position already completed and archived.",
      tooltip: "Trade is completed and archived.",
      conditionDescription: "Completed trade",
    };
  }

  // 1. MISSED: Stock has already surged +7% or more from entry
  if (returnPct >= 7.0) {
    return {
      key: "missed",
      label: "MISSED",
      badgeClass:
        "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700/60",
      dotColor: "bg-purple-500",
      actionGuidance: "Do NOT enter. The big move has already happened!",
      tooltip: "Already rallied +7%+. Great system win, but do not chase now.",
      conditionDescription: "Gain > +7% (Already surged)",
    };
  }

  // 2. SKIP: Old signal (6+ days) that is stagnant (<2%), or deep pullback
  if ((holdingDays >= 6 && returnPct < 2.0) || returnPct <= -3.5) {
    return {
      key: "skip",
      label: "SKIP",
      badgeClass:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      dotColor: "bg-slate-500",
      actionGuidance: "Do NOT enter. Stagnant or testing stop loss.",
      tooltip: "Signal is too old (6+ days) or stagnant. Better to skip.",
      conditionDescription: "Days ≥ 6 with gain < 2%, or near stop loss",
    };
  }

  // 3. LATE: 4+ days old, or price moved up between +5% and +7%
  if ((holdingDays >= 4 && returnPct >= 3.0) || returnPct >= 5.0) {
    return {
      key: "late_buy",
      label: "LATE",
      badgeClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700/60",
      dotColor: "bg-amber-500",
      actionGuidance: "Little late to buy. High risk of pullback; do not chase.",
      tooltip: "Already ran 4+ days or +5%+. Pullback risk is higher.",
      conditionDescription: "Days ≥ 4 or Gain between +5% and +7%",
    };
  }

  // 4. BEST: Fresh signal (1-3 days) and price hasn't increased much (<= +3%)
  if (holdingDays <= 3 && returnPct <= 3.0) {
    return {
      key: "best_buy",
      label: "BEST",
      badgeClass:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60",
      dotColor: "bg-emerald-500",
      actionGuidance: "Ideal time to enter! Lowest risk, highest upside.",
      tooltip: "Fresh signal (≤3 days) and under +3% gain. Ideal entry window!",
      conditionDescription: "Days ≤ 3 and Gain ≤ +3%",
    };
  }

  // 5. GOOD: Fresh signal up moderately (+3% to +5%)
  if (holdingDays <= 3 && returnPct > 3.0 && returnPct < 5.0) {
    return {
      key: "good_buy",
      label: "GOOD",
      badgeClass:
        "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-700/60",
      dotColor: "bg-teal-500",
      actionGuidance: "Safe to enter. Momentum is strong and active.",
      tooltip: "Recent signal up +3% to +5%. Good risk-reward.",
      conditionDescription: "Days ≤ 3 and Gain between +3% and +5%",
    };
  }

  // Fallback for older days with moderate return
  if (holdingDays >= 4) {
    return {
      key: "late_buy",
      label: "LATE",
      badgeClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700/60",
      dotColor: "bg-amber-500",
      actionGuidance: "Little late to buy. Risk is elevated.",
      tooltip: "Signal is aging. Wait for fresh breakout.",
      conditionDescription: "Days ≥ 4",
    };
  }

  return {
    key: "good_buy",
    label: "GOOD",
    badgeClass:
      "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-700/60",
    dotColor: "bg-teal-500",
    actionGuidance: "Good to enter.",
    tooltip: "Active signal within acceptable range.",
    conditionDescription: "Active entry range",
  };
}

export interface ActionTagInfo {
  label: "GOOD TO BUY" | "DONT ENTER NOW" | "SKIP OLD CALL";
  bg: string;
  color: string;
  border: string;
  tooltip: string;
  badgeClass?: string;
}

export function getActionTagInfo(
  mode: "active" | "closed",
  holdingDays: number = 1,
  returnPct: number = 0
): ActionTagInfo {
  const status = getSignalStatus(mode, holdingDays, returnPct);
  // Stagnant old call (6+ days) or near stop loss -> SKIP OLD CALL
  if (status.key === "skip") {
    return {
      label: "SKIP OLD CALL",
      bg: "rgba(239, 68, 68, 0.12)",
      color: "var(--apple-red, #F87171)",
      border: "rgba(239, 68, 68, 0.32)",
      tooltip: "Signal is stagnant (6+ days) or testing stop loss. Skip this old call.",
      badgeClass: "tag-skip-call",
    };
  }
  // Aging or price already surged (+5%+ or 4+ days) -> DONT ENTER NOW
  if (status.key === "late_buy" || status.key === "missed") {
    return {
      label: "DONT ENTER NOW",
      bg: "rgba(245, 158, 11, 0.12)",
      color: "var(--apple-gold, #F59E0B)",
      border: "rgba(245, 158, 11, 0.32)",
      tooltip: "High risk of pullback (+5%+ gain or 4+ days old). Do not enter now.",
      badgeClass: "tag-dont-enter",
    };
  }
  // Fresh breakout within safe entry zone -> GOOD TO BUY
  return {
    label: "GOOD TO BUY",
    bg: "rgba(16, 185, 129, 0.12)",
    color: "var(--apple-green, #34D399)",
    border: "rgba(16, 185, 129, 0.32)",
    tooltip: "Fresh breakout structure within ideal low-risk entry window.",
    badgeClass: "tag-good-buy",
  };
}

export const SIGNAL_STATUS_DECISION_TABLE = [
  {
    status: "BEST",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60",
    dotColor: "bg-emerald-500",
    condition: "Signal age is ≤ 3 days AND price gained ≤ 3%",
    simpleMeaning: "Stock just broke out and hasn't run away yet.",
    userAction: "✅ Ideal to Enter! Highest reward-to-risk ratio.",
  },
  {
    status: "GOOD",
    badgeClass:
      "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-700/60",
    dotColor: "bg-teal-500",
    condition: "Signal age is ≤ 3 days AND price gained +3% to +5%",
    simpleMeaning: "Healthy momentum has started, strong buyer volume.",
    userAction: "👍 Safe to Enter. Strong momentum with room to run.",
  },
  {
    status: "LATE",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700/60",
    dotColor: "bg-amber-500",
    condition: "Signal age is ≥ 4 days OR price already gained +5% to +7%",
    simpleMeaning: "Stock already moved up significantly from signal price.",
    userAction: "⚠️ Do NOT Enter (or keep size very small). Risk of pullback is high.",
  },
  {
    status: "MISSED",
    badgeClass:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700/60",
    dotColor: "bg-purple-500",
    condition: "Price already gained > +7% from signal price",
    simpleMeaning: "The rally succeeded and the stock reached near target.",
    userAction: "🚫 Do NOT Chase! The train has left the station. Wait for next signal.",
  },
  {
    status: "SKIP",
    badgeClass:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    dotColor: "bg-slate-500",
    condition: "Signal age is ≥ 6 days with < 2% gain, or testing stop loss",
    simpleMeaning: "The stock is stalled, consolidating, or weak.",
    userAction: "⏭️ Skip Entering. Don't lock up money in stagnant stocks.",
  },
];
