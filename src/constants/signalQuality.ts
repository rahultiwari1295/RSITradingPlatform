export type SignalQualityTier = "ELITE" | "STRONG" | "WATCH" | "SKIP";

export interface SignalQualityInfo {
  tier: SignalQualityTier;
  label: string;           // "STRONG BUY" | "BUY" | "SPECULATIVE" | "IGNORE"
  allocationText: string;  // "Full position size" | "Standard position size" | "Half position size" | "Below quality threshold"
  bg: string;              // hex
  text: string;            // hex
  border: string;          // hex
  stars: number;
}

const TIERS: Record<SignalQualityTier, Omit<SignalQualityInfo, "tier">> = {
  ELITE:  { label: "STRONG BUY",  allocationText: "Full position size",     bg: "#ECFDF3", text: "#047857", border: "#10B981", stars: 5 },
  STRONG: { label: "BUY",         allocationText: "Standard position size", bg: "#E0F2FE", text: "#075985", border: "#0EA5E9", stars: 4 },
  WATCH:  { label: "SPECULATIVE", allocationText: "Half position size",     bg: "#FFFBEB", text: "#92400E", border: "#F59E0B", stars: 3.5 },
  SKIP:   { label: "IGNORE",      allocationText: "Below quality threshold",bg: "#FFF1F2", text: "#9F1239", border: "#F43F5E", stars: 3 },
};

export function getSignalQualityTier(signal: {
  compositeScore?: number;
  mlProbability?: number;
  riskScore?: number;
}): SignalQualityInfo {
  const comp = signal.compositeScore ?? 0;
  const ml = signal.mlProbability ?? 0;
  const risk = signal.riskScore ?? 100; // missing risk data should never look "safe"

  let tier: SignalQualityTier;
  if (comp >= 82 && ml >= 78 && risk <= 50) tier = "ELITE";
  else if (comp >= 75 && ml >= 68 && risk <= 60) tier = "STRONG";
  else if (comp >= 65 && ml >= 55) tier = "WATCH";
  else tier = "SKIP";

  return { tier, ...TIERS[tier] };
}

// Validation as requested:
(() => {
  const t1 = getSignalQualityTier({ compositeScore: 66, mlProbability: 70.2, riskScore: 26 });
  const t2 = getSignalQualityTier({ compositeScore: 81, mlProbability: 74.5, riskScore: 36 });
  if (t1.tier !== "WATCH" || t2.tier !== "STRONG") {
    console.warn("Signal quality validation failed", { t1: t1.tier, t2: t2.tier });
  }
})();
