// Drafted by local model ornith:9b; "No data" bar height fixed in review (text was clipped at 10px).
import React from "react";

export default function StackedBar({
  parts,
  height = 10,
  onSelect,
}: {
  parts: { key: string; value: number; color: string; label: string }[];
  height?: number;
  onSelect?: (key: string) => void;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const positive = parts.filter((p) => p.value > 0);

  if (total === 0) {
    return (
      <div style={{ width: "100%", minHeight: Math.max(height, 22), borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
        background: "color-mix(in srgb, currentColor 10%, transparent)", fontSize: 12, opacity: 0.7 }}>No data</div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", width: "100%", height, borderRadius: 999, overflow: "hidden", gap: 2 }}>
        {positive.map((p) => (
          <div key={p.key} title={`${p.label}: ${p.value}`} onClick={() => onSelect?.(p.key)}
            style={{ flex: p.value, background: p.color, cursor: onSelect ? "pointer" : "default" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, marginTop: 6 }}>
        {positive.map((p) => (
          <button key={p.key} type="button" onClick={() => onSelect?.(p.key)}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 0, border: "none", background: "transparent", color: "inherit", cursor: onSelect ? "pointer" : "default", font: "inherit" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: p.color }} />
            {p.label} {p.value}
          </button>
        ))}
      </div>
    </div>
  );
}
