from __future__ import annotations

import numpy as np
import pandas as pd

MIN_TRADES_SHOWN = 30  # win rate is not published below this many closed trades


def _clean_num(v, ndigits=2):
    if v is None or not np.isfinite(v):
        return None
    return round(float(v), ndigits)


def summarize(t: pd.DataFrame) -> dict:
    c = t[~t["is_open"]].copy() if len(t) else t
    if len(c):
        c = c[np.isfinite(c["ret_pct"])]
    n = len(c)
    if n == 0:
        return {"trades": 0, "wins": 0, "losses": 0, "win_rate": None, "avg_ret": None, "median_ret": None,
                "profit_factor": None, "max_dd": None, "avg_bars": None, "best": None, "worst": None}
    r = c["ret_pct"].to_numpy()
    w, ls = r[r > 0], r[r <= 0]
    eq = np.cumsum(c.sort_values("exit_date")["ret_pct"].to_numpy())
    diff = eq - np.maximum.accumulate(np.concatenate([[0], eq]))[1:]
    dd = float(diff.min()) if len(diff) and np.isfinite(diff.min()) else None
    pf = float(w.sum() / -ls.sum()) if ls.sum() < 0 and np.isfinite(w.sum() / -ls.sum()) else None
    return {"trades": n, "wins": int(len(w)), "losses": int(len(ls)),
            "win_rate": _clean_num(len(w) / n * 100, 1),
            "avg_ret": _clean_num(r.mean(), 2),
            "median_ret": _clean_num(np.median(r), 2),
            "profit_factor": _clean_num(pf, 2),
            "max_dd": _clean_num(dd, 2),
            "avg_bars": _clean_num(c["bars"].mean(), 1),
            "best": _clean_num(r.max(), 2),
            "worst": _clean_num(r.min(), 2)}


def by_year(t: pd.DataFrame, years: list[int]) -> dict:
    out = {"All": summarize(t[t["entry_date"] >= pd.Timestamp(f"{min(years)}-01-01")] if len(t) else t)}
    for y in years:
        m = t["entry_date"].dt.year == y if len(t) else []
        out[str(y)] = summarize(t[m] if len(t) else t)
    return out


def monthly_counts(t: pd.DataFrame) -> list[dict]:
    if not len(t):
        return []
    g = t.groupby(t["entry_date"].dt.strftime("%Y-%m"))["ret_pct"]
    return [{"month": k, "trades": int(len(v)), "win_rate": round(float((v > 0).mean() * 100), 1)} for k, v in g]
