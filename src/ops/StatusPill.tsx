// Drafted by local model ornith:9b; undefined-status guard added in review.
import React from "react";

export type Tone = "good" | "warn" | "bad" | "info" | "muted";

export function toneFor(status: string): Tone {
  const s = String(status ?? "").trim().toUpperCase();
  if (["OK", "FRESH", "ACTIVE", "APPROVED", "SUCCESS", "ON"].includes(s)) return "good";
  if (["PARTIAL", "STALE", "PAUSED", "HOLD", "RUNNING", "QUEUED", "STARTED"].includes(s)) return "warn";
  if (["FAILED", "FAIL", "MISSING", "DEAD", "OFF", "REJECT", "REJECTED"].includes(s)) return "bad";
  if (["PENDING", "INFO"].includes(s)) return "info";
  return "muted";
}

const COLORS: Record<Tone, string> = {
  good: "var(--ops-good, #1f9d55)", warn: "var(--ops-warn, #c77700)", bad: "var(--ops-bad, #d33a2c)",
  info: "var(--ops-info, #2f6fd6)", muted: "var(--ops-muted, #7b8294)",
};

export default function StatusPill({ status, label, tone }: { status: string; label?: string; tone?: Tone }) {
  const color = COLORS[tone ?? toneFor(status)];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      lineHeight: 1.5, whiteSpace: "nowrap", color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: color }} />
      {label ?? status}
    </span>
  );
}
