"""Holding health rules, shared by the blind test and the live endpoint.

verdict(candles, bench) -> dict with verdict in {'exit','protect','buy','hold'}, the reason and the key levels.
Candles: [{t,o,h,l,c,v}] oldest first, at least 260 sessions. Bench: {date: close} of NIFTY500.
Weekly trend = price against its 30-week average (150 sessions) and that average's 4-week slope.
Monthly trend = price against its 10-month average (210 sessions) and that average's 2-month slope.
Support = lowest low of the 60 sessions before the last 5 (the base under the price)."""
from __future__ import annotations


def sma(xs, n, end):
    """Average of xs[end-n+1 .. end]."""
    if end + 1 < n:
        return None
    return sum(xs[end - n + 1:end + 1]) / n


def verdict_at(cs, i, bench=None):
    """Verdict using only candles up to index i (inclusive)."""
    if i < 260:
        return None
    c = [x["c"] for x in cs]
    px = c[i]
    d50 = sma(c, 50, i)
    w30, w30p = sma(c, 150, i), sma(c, 150, i - 20)
    m10, m10p = sma(c, 210, i), sma(c, 210, i - 42)
    sup = min(x["l"] for x in cs[i - 65:i - 4])
    wk = "up" if px > w30 and w30 >= w30p else "down" if px < w30 and w30 < w30p else "flat"
    mo = "up" if px > m10 and m10 >= m10p else "down" if px < m10 and m10 < m10p else "flat"
    rs = None
    if bench:
        b0, b1 = bench.get(cs[i - 63]["t"]), bench.get(cs[i]["t"])
        if b0 and b1:
            rs = ((px / c[i - 63]) - (b1 / b0)) * 100
    broken = px < sup
    out = {"px": px, "d50": d50, "w30": w30, "m10": m10, "support": sup, "weekly": wk, "monthly": mo, "rs": rs, "broken": broken}
    if wk == "down" and mo == "down" and (broken or (rs is not None and rs < -10)):
        out["verdict"] = "exit"
    elif wk == "up" and mo == "up" and d50 * 0.98 <= px <= d50 * 1.03:
        out["verdict"] = "buy"
    elif wk == "down" or (mo == "up" and px < d50) or broken:
        out["verdict"] = "protect"
    else:
        out["verdict"] = "hold"
    return out
