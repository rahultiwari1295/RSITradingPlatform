/**
 * QuantSync Master Design Tokens & System Constants
 */

export const QSColors = {
  // Base surfaces
  pageBackground: "#FAFAFC",
  cardBackground: "#FFFFFF",
  cardBorder: "#ECEEF2",

  // Hero card (dark surface)
  heroGradientTop: "#14151A",
  heroGradientBottom: "#23253A",
  heroGlow: "rgba(139, 246, 148, 0.3)",
  heroTextPrimary: "#FFFFFF",
  heroTextSecondary: "#8B8D98",
  heroAccentMint: "#8BF694",
  heroAccentRed: "#F97066",

  // Text
  textPrimary: "#14151A",
  textSecondary: "#56586A",
  textTertiary: "#8B8D98",
  textMuted: "#B3B5C0",

  // Semantic
  positiveText: "#16A34A",
  positiveBg: "#ECFDF3",
  positiveBorder: "#86EFAC",

  negativeText: "#F04438",
  negativeBg: "#FEF3F2",
  negativeBorder: "#FECDCA",
  negativeTextDark: "#7A271A",
  negativeTextMid: "#B42318",

  accentIndigo: "#6366F1",
  accentIndigoBg: "#EEF0FE",
  accentIndigoLt: "#818CF8",

  divider: "#F1F2F5",
  buttonDark: "#14151A",
  buttonDarkText: "#FFFFFF",
};

export const AvatarGradients = [
  ["#818CF8", "#6366F1"], // 0: indigo
  ["#FB923C", "#EA580C"], // 1: orange
  ["#F87171", "#EF4444"], // 2: red
  ["#34D399", "#059669"], // 3: green
  ["#A78BFA", "#8B5CF6"], // 4: violet
  ["#22D3EE", "#06B6D4"], // 5: cyan
];

export function getAvatarGradient(index: number): string {
  const pair = AvatarGradients[Math.abs(index) % AvatarGradients.length];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

export function getSymbolInitials(symbol: string): string {
  if (!symbol) return "ST";
  const cleaned = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2);
  }
  return cleaned.padEnd(2, "X");
}

export function formatINR(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "Rs 0.00";
  return `Rs ${val.toLocaleString("en-IN", {
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "0.0%";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}
