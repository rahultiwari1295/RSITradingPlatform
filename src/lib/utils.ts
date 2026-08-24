export function cn(...classes: (string | undefined | null | boolean | Record<string, boolean>)[]) {
  const result: string[] = [];
  for (const c of classes) {
    if (!c) continue;
    if (typeof c === "string") {
      result.push(c);
    } else if (typeof c === "object") {
      for (const [key, value] of Object.entries(c)) {
        if (value) result.push(key);
      }
    }
  }
  return result.join(" ");
}

export function formatINR(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: val % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0
  }).format(val);
}

export function formatPercent(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return "0.0%";
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}
