// Pure formatters (no React) so they can be unit-tested.
export const pct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`);
export const plainPct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${v.toFixed(d)}%`);
export const inr = (v: number | null | undefined) => (v == null ? '—' : '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
export const tone = (v: number | null | undefined) => (v == null ? 'mute' : v >= 0 ? 'up' : 'down');
export const shortDate = (s: string | null | undefined) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
export const count = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-IN'));
