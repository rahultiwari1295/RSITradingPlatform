#!/usr/bin/env python3
"""Owner "edge" data builder for /rahul. Reads production data READ-ONLY and writes only Data/edge.db.

    edge_build.py daily      nightly build (all blobs + per-stock rows)
    edge_build.py backfill   one-time: bulk / block deal history from NSE (2023 onward), then a daily build

What it builds (each is one JSON blob in edge.db, plus one row per stock):
  regime     market gauge: share of liquid stocks above their 50 / 200-day average, index trend, FII / DII flow,
             and how past AI calls did under each gauge reading
  earnings   latest-quarter growth score + how price reacted to the result
  owners     promoter / FII / DII quarterly change, pledges, takeover-rule disclosures
  smart      bulk / block deal buyers scored by what happened after their past buys
  sectors    sector and industry strength, relative-strength rank 1-99 for every stock
  accum      delivery-based accumulation list
  scorecard  live track record of each engine
"""
import csv
import datetime as dt
import io
import json
import math
import os
import re
import sqlite3
import statistics
import sys
import time

import numpy as np

ROOT = os.environ.get("QS_ROOT", "/root/quantsync")
sys.path.insert(0, ROOT)
HIST, MASTER = f"{ROOT}/Data/stock_history.db", f"{ROOT}/Data/quantsync_master.db"
INTEL, FUND, EDGE = f"{ROOT}/Data/intel.db", f"{ROOT}/Data/fundamental_cache.db", f"{ROOT}/Data/edge.db"
SHADOW = "/root/alpha_lab/shadow"
MON = {m: i + 1 for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split())}
RED = {"sebi_order": "SEBI order", "rating_downgrade": "Credit rating cut", "auditor_exit": "Auditor resigned", "default": "Loan default",
       "fraud": "Fraud reported", "insolvency": "Insolvency case", "pledge_create": "Promoter pledge went up", "kmp_exit": "Top executive left",
       "litigation": "Court case", "disruption": "Operations disrupted"}


def ro(p):
    return sqlite3.connect(f"file:{p}?mode=ro", uri=True, timeout=60)


def r(x, n=1):
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return round(x, n) if math.isfinite(x) else None


def num(x):
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x) if math.isfinite(x) else None
    s = re.sub(r"[,%\s₹]", "", str(x))
    try:
        return float(s)
    except ValueError:
        return None


def clamp(x, a, b):
    return max(a, min(b, x))


def qkey(q):
    m = re.match(r"\s*([A-Za-z]{3})\w*\s+(\d{4})", str(q or ""))
    return (int(m.group(2)), MON[m.group(1).lower()]) if m and m.group(1).lower() in MON else None


def day(s):
    """Any of '2026-11-13', '13-Nov-2026', '13-NOV-2026 16:31:10' -> '2026-11-13'."""
    s = str(s or "").strip()
    if re.match(r"\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    m = re.match(r"(\d{1,2})-([A-Za-z]{3})-(\d{4})", s)
    if m and m.group(2).lower() in MON:
        return f"{m.group(3)}-{MON[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
    m = re.match(r"(\d{2})-(\d{2})-(\d{4})", s)
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""


# ------------------------------------------------------------------ prices
class Px:
    """Close / volume matrices aligned to the NIFTY500 calendar. C is forward-filled, RAW is not."""

    def __init__(self, hist):
        ix = [(str(k["t"])[:10], float(k["c"])) for k in json.loads(hist.execute("SELECT rawCandles FROM StockHistory WHERE symbol='NIFTY500'").fetchone()[0]) if not k.get("p")]
        ix = sorted({d: c for d, c in ix}.items())
        self.cal = [d for d, _ in ix]
        self.pos = {d: i for i, d in enumerate(self.cal)}
        self.idx = np.array([c for _, c in ix], dtype=np.float64)
        T = self.T = len(self.cal)
        syms, C, V = [], [], []
        for sym, raw in hist.execute("SELECT symbol, rawCandles FROM StockHistory ORDER BY rowid"):
            c, v = np.full(T, np.nan, np.float32), np.zeros(T, np.float32)
            try:
                ks = json.loads(raw or "[]")
            except ValueError:
                continue
            for k in ks:
                i = self.pos.get(str(k.get("t", ""))[:10])
                if i is None or k.get("p"):
                    continue
                try:
                    cc = float(k["c"])
                except (KeyError, TypeError, ValueError):
                    continue
                if cc > 0:
                    c[i], v[i] = cc, float(k.get("v") or 0)
            if np.isfinite(c).sum() >= 60:
                syms.append(sym); C.append(c); V.append(v)
        self.syms, self.row = syms, {s: i for i, s in enumerate(syms)}
        self.RAW, self.V = np.vstack(C), np.vstack(V)
        idx = np.where(np.isfinite(self.RAW), np.arange(T), 0)
        np.maximum.accumulate(idx, axis=1, out=idx)
        self.C = np.take_along_axis(self.RAW, idx, axis=1)                       # forward-filled (NaN before listing)
        self.last_i = idx[:, -1]
        cs = np.nancumsum(self.C.astype(np.float64), axis=1)
        cnt = np.cumsum(np.isfinite(self.C), axis=1)
        self._cs, self._cnt = cs, cnt

    def sma(self, n, t0):
        """Simple average of the last n closes for every day from t0 on. NaN where the stock has no full window."""
        a = (self._cs[:, t0:] - self._cs[:, t0 - n:-n]) / n
        ok = (self._cnt[:, t0:] - self._cnt[:, t0 - n:-n]) == n
        return np.where(ok, a, np.nan)

    def at(self, d, after=True):
        """Calendar index of date d (or the next session after it)."""
        if d in self.pos:
            return self.pos[d]
        import bisect
        i = bisect.bisect_left(self.cal, d)
        return i if after and i < self.T else (i - 1 if not after and i > 0 else None)


def build_stats(px, hist):
    T, C = px.T, px.C
    last = C[:, -1]
    ret = lambda k: np.where(C[:, -1 - k] > 0, last / C[:, -1 - k] - 1, np.nan) * 100 if T > k else np.full(len(last), np.nan)
    R = {k: ret(k) for k in (1, 5, 21, 63, 126, 189, 252)}
    tv = px.RAW[:, -20:] * px.V[:, -20:] / 1e7
    with np.errstate(all="ignore"):
        med_tv = np.nanmedian(np.where(tv > 0, tv, np.nan), axis=1)
        jump = np.nanmax(np.abs(C[:, -6:] / C[:, -7:-1] - 1), axis=1)
    cm = {x[0]: x for x in hist.execute("SELECT symbol, company_name, sector, industry, market_cap_cr, next_results_date FROM CompanyMaster")}
    eq = np.array([s in cm and bool(cm[s][2]) for s in px.syms])
    fresh = px.last_i >= T - 3
    liquid = eq & fresh & (last >= 20) & (med_tv >= 2.0) & ~(jump > 0.35)
    s50, s200 = px.sma(50, T - 260), px.sma(200, T - 260)
    s20 = px.sma(20, T - 260)
    raw_rs = 0.4 * R[63] + 0.2 * R[126] + 0.2 * R[189] + 0.2 * R[252]
    raw_rs = np.where(np.isfinite(raw_rs), raw_rs, np.where(np.isfinite(R[126]), 0.6 * R[63] + 0.4 * R[126], np.nan))
    rs = np.full(len(last), np.nan)
    ok = liquid & np.isfinite(raw_rs)
    order = np.argsort(raw_rs[ok])
    rk = np.empty(order.size)
    rk[order] = np.arange(order.size)
    rs[ok] = 1 + np.floor(rk / max(1, order.size) * 99)
    vol20 = px.V[:, -21:-1].mean(axis=1)
    return dict(R=R, last=last, liquid=liquid, eq=eq, fresh=fresh, s20=s20, s50=s50, s200=s200, rs=rs, cm=cm, med_tv=med_tv,
                vol_ratio=np.where(vol20 > 0, px.V[:, -1] / vol20, np.nan))


def trend_of(c, a20, a50, a200):
    if not all(math.isfinite(x) for x in (c, a50)):
        return ""
    if math.isfinite(a200):
        if c > a20 > a50 > a200:
            return "up"
        if c < a20 < a50 < a200:
            return "down"
        if c > a50 and c > a200:
            return "up-weak"
        if c < a50 and c < a200:
            return "down-weak"
        return "side"
    return "up-weak" if c > a50 else "down-weak"


# ------------------------------------------------------------------ regime
def regime_label(b50, above50, above200):
    if b50 is None:
        return "half"
    if b50 >= 55 and above50:
        return "full"
    if b50 < 30 or (b50 < 40 and not above200):
        return "none"
    return "half"


def build_regime(px, st, intel, master):
    T, L = px.T, st["liquid"]
    n = 250
    C = px.C[L, T - 260:]
    with np.errstate(all="ignore"):
        a50 = (C > st["s50"][L]) & np.isfinite(st["s50"][L])
        v50 = np.isfinite(st["s50"][L]).sum(axis=0)
        a200 = (C > st["s200"][L]) & np.isfinite(st["s200"][L])
        v200 = np.isfinite(st["s200"][L]).sum(axis=0)
        b50, b200 = a50.sum(axis=0) / np.maximum(1, v50) * 100, a200.sum(axis=0) / np.maximum(1, v200) * 100
    ix = px.idx
    i50 = np.array([ix[t - 49:t + 1].mean() for t in range(T - 260, T)])
    i200 = np.array([ix[t - 199:t + 1].mean() for t in range(T - 260, T)])
    series = []
    for k in range(260 - n, 260):
        t = T - 260 + k
        series.append({"d": px.cal[t], "b50": r(b50[k]), "b200": r(b200[k]), "idx": r(ix[t], 1),
                       "g": regime_label(float(b50[k]), ix[t] > i50[k], ix[t] > i200[k])})
    # new 52-week highs / lows today (on closes)
    w = px.C[L, -251:]
    with np.errstate(all="ignore"):
        hi, lo = int((w[:, -1] >= np.nanmax(w[:, :-1], axis=1)).sum()), int((w[:, -1] <= np.nanmin(w[:, :-1], axis=1)).sum())
    flows = [{"day": d, "who": w_, "net_cr": r(x, 0)} for d, w_, x in intel.execute("SELECT day, who, net_cr FROM flows ORDER BY day DESC LIMIT 20")]
    f5 = {w_: r(sum(f["net_cr"] or 0 for f in flows if f["who"] == w_ and f["day"] in sorted({f["day"] for f in flows})[-5:]), 0) for w_ in ("FII", "DII")}
    # how past AI calls did under each reading (reading taken the session BEFORE entry, so nothing is known in advance)
    g_at = {s["d"]: s["g"] for s in series}
    days = [s["d"] for s in series]
    ev = {}
    for eng, ed, ep, xp in master.execute("SELECT lower(engine_version), substr(entry_date,1,10), entry_price, exit_price FROM closed_trades WHERE entry_price>0 AND exit_price>0"):
        if ed not in g_at or days.index(ed) == 0:
            continue
        g = g_at[days[days.index(ed) - 1]]
        ev.setdefault(g, []).append((xp / ep - 1) * 100 - 0.45)
    evidence = {g: {"n": len(v), "avg": r(sum(v) / len(v), 2), "win": r(sum(x > 0 for x in v) / len(v) * 100, 0)} for g, v in ev.items()}
    cur = series[-1]
    return {"as_of": px.cal[-1], "gauge": cur["g"], "b50": cur["b50"], "b200": cur["b200"], "b50_wk": series[-6]["b50"], "universe": int(L.sum()),
            "index": {"last": r(ix[-1], 1), "above50": bool(ix[-1] > i50[-1]), "above200": bool(ix[-1] > i200[-1]),
                      "r5": r((ix[-1] / ix[-6] - 1) * 100, 2), "r21": r((ix[-1] / ix[-22] - 1) * 100, 2)},
            "highs": hi, "lows": lo, "flows": flows[:10], "flow5": f5, "series": series, "evidence": evidence}


# ------------------------------------------------------------------ earnings
def earnings_score(qs):
    rows = []
    for q in qs or []:
        k = qkey(q.get("quarter"))
        if k:
            rows.append((k, num(q.get("sales_cr")), num(q.get("net_profit_cr")), num(q.get("opm_pct")), q.get("quarter")))
    rows.sort()
    if len(rows) < 5:
        return None
    by = {x[0]: x for x in rows}

    def yoy(k):
        a, b = by.get(k), by.get((k[0] - 1, k[1]))
        if not a or not b or a[2] is None or b[2] is None or b[2] <= 0:
            return None
        return (a[2] / b[2] - 1) * 100
    L = rows[-1]
    Y = by.get((L[0][0] - 1, L[0][1]))
    if not Y or not L[1] or not Y[1] or Y[1] <= 0:
        return None
    sales = (L[1] / Y[1] - 1) * 100
    prof = yoy(L[0])
    turn = bool(Y[2] is not None and Y[2] <= 0 and L[2] is not None and L[2] > 0)
    opm = L[3] - Y[3] if L[3] is not None and Y[3] is not None else None
    prevs = [yoy(x[0]) for x in rows[-5:-1]]
    prev = prevs[-1]
    accel = prof - prev if prof is not None and prev is not None else None
    base = [p for p in prevs if p is not None]
    surprise = prof - sum(base) / len(base) if prof is not None and len(base) >= 2 else None
    s = 50 + clamp(sales, -30, 40) * 0.5
    s += 15 if turn else (clamp(prof, -60, 80) * 0.3 if prof is not None else (-15 if (L[2] or 0) <= 0 else 0))
    s += clamp(opm, -8, 8) * 1.5 if opm is not None else 0
    s += clamp(accel, -40, 40) * 0.15 if accel is not None else 0
    return {"quarter": L[4], "qk": L[0], "sales_cr": r(L[1], 0), "profit_cr": r(L[2], 0), "sales_yoy": r(sales), "profit_yoy": r(prof), "opm": r(L[3]),
            "opm_chg": r(opm), "prev_profit_yoy": r(prev), "accel": r(accel), "surprise": r(surprise), "turnaround": turn, "growth": int(round(clamp(s, 0, 100)))}


def build_earnings(px, st, fund, intel):
    today = px.cal[-1]
    meet = {}
    for sym, d in intel.execute("SELECT symbol, max(meeting_date) FROM meetings WHERE is_results=1 AND meeting_date<=? AND meeting_date>=date(?, '-75 day') GROUP BY 1", (today, today)):
        meet[sym] = d
    out, newest = {}, None
    rows = []
    for sym, js in fund.execute("SELECT symbol, data_json FROM stock_fundamentals"):
        try:
            e = earnings_score(json.loads(js).get("quarterly_performance"))
        except (ValueError, TypeError, AttributeError):
            e = None
        if e:
            rows.append((sym, e))
            newest = max(newest, e["qk"]) if newest else e["qk"]
    for sym, e in rows:
        i = px.row.get(sym)
        e["fresh"] = e.pop("qk") == newest
        if i is None:
            continue
        d = meet.get(sym)
        if d and e["fresh"]:
            t = px.at(d)
            if t is not None and 1 <= t:
                t1 = min(t + 1, px.T - 1)                                      # results often land after the close: use a 2-session window
                pre, post = px.C[i, t - 1], px.C[i, t1]
                if pre > 0 and post > 0:
                    v20 = px.V[i, max(0, t - 20):t].mean()
                    e.update(result_date=d, react=r((post / pre - 1) * 100), vol_x=r(max(px.V[i, t], px.V[i, t1]) / v20 if v20 else None),
                             since=r((px.C[i, -1] / post - 1) * 100) if t1 < px.T - 1 else 0.0, days=px.T - 1 - t1)
                    rs_ = 50 + clamp(e["react"], -10, 15) * 3 + clamp((e.get("vol_x") or 1) - 1, 0, 4) * 2
                    e["score"] = int(round(0.6 * e["growth"] + 0.4 * clamp(rs_, 0, 100)))
        e.setdefault("score", e["growth"])
        out[sym] = e
    lst = [dict(symbol=s, name=st["cm"][s][1], rs=r(st["rs"][px.row[s]], 0), **e) for s, e in out.items()
           if e["fresh"] and e.get("result_date") and st["liquid"][px.row[s]]]
    lst.sort(key=lambda x: -x["score"])
    return out, {"as_of": today, "quarter": next((e["quarter"] for e in out.values() if e["fresh"]), ""), "reported": len(lst),
                 "strong": [x for x in lst if x["score"] >= 68][:40], "weak": [x for x in lst if x["score"] <= 35][-25:][::-1]}


# ------------------------------------------------------------------ owners
def fetch_pledges(edge, today):
    """NSE pledge snapshot -> edge.pledge_snap. Returns {symbol: {...}}. Never raises."""
    try:
        from intel.net import Net
        norm = lambda n_: " ".join(re.sub(r"\b(limited|ltd|the|india|co|company|corporation|corp|inc|pvt|private)\b", " ", re.sub(r"[^a-z0-9 ]", " ", (n_ or "").lower())).split())
        names = {norm(nm): sym for sym, nm in ro(HIST).execute("SELECT symbol, company_name FROM CompanyMaster") if nm}
        data = Net().json("https://www.nseindia.com/api/corporate-pledgedata?index=equities", "nse")
        for x in data.get("data", []):
            sym = names.get(norm(x.get("comName")))
            tot, prom = num(x.get("percSharesPledged")), num(x.get("percPromoterHolding"))
            if not sym or tot is None or not prom or prom <= 0:
                continue
            pp = tot / prom * 100                                                # pledged shares as a share of what promoters hold
            if not 0 <= pp <= 100:
                continue
            edge.execute("INSERT OR REPLACE INTO pledge_snap VALUES (?,?,?,?,?)", (sym, today, pp, tot, day(x.get("broadcastDt"))))
        edge.commit()
    except Exception as e:                                                       # noqa: BLE001 - the build must go on without it
        print("pledges: skipped,", str(e)[:150], flush=True)
    out = {}
    for sym, d, pp, pt, bd in edge.execute("SELECT symbol, day, pct_promoter, pct_total, filed FROM pledge_snap ORDER BY symbol, day"):
        o = out.setdefault(sym, {"first": pp, "first_day": d})
        o.update(pct=r(pp), pct_total=r(pt), filed=bd, day=d)
    for o in out.values():
        o["chg"] = r(o["pct"] - o.pop("first")) if o["day"] != o["first_day"] else None
    return out


def build_owners(px, st, fund, intel, pledges):
    out = {}
    for sym, js in fund.execute("SELECT symbol, data_json FROM stock_fundamentals"):
        try:
            sp = json.loads(js).get("shareholding_pattern") or {}
        except ValueError:
            continue
        g = lambda k: sp.get(k) if isinstance(sp.get(k), dict) else {}
        p, f, d = g("Promoters"), g("FIIs"), g("DIIs")
        if not (p or f or d):
            continue
        for o_ in (p, f, d):                                                  # a "change" as big as the holding itself means last quarter was missing
            c_, h_ = num(o_.get("qoq_change")), num(o_.get("holding_pct"))
            if c_ is not None and (abs(c_) > 15 or (h_ is not None and abs(abs(c_) - h_) < 0.01 and h_ > 1)):
                o_["qoq_change"] = None
        out[sym] = {"quarter": p.get("quarter") or f.get("quarter") or d.get("quarter"), "promoter": r(p.get("holding_pct"), 2), "promoter_chg": r(p.get("qoq_change"), 2),
                    "fii": r(f.get("holding_pct"), 2), "fii_chg": r(f.get("qoq_change"), 2), "dii": r(d.get("holding_pct"), 2), "dii_chg": r(d.get("qoq_change"), 2)}
    for sym, p in pledges.items():
        out.setdefault(sym, {}).update(pledge=p["pct"], pledge_total=p["pct_total"], pledge_chg=p["chg"])
    ins = {}
    for sym, ts, typ, head, nj in intel.execute("SELECT symbol, ts, type, headline, numbers_json FROM events WHERE type IN ('insider_buy','insider_sell') AND symbol IS NOT NULL "
                                                "AND ts>=datetime('now','-45 day') ORDER BY ts DESC"):
        try:
            n_ = json.loads(nj or "{}")
        except ValueError:
            n_ = {}
        ins.setdefault(sym, []).append({"d": ts[:10], "side": "buy" if typ == "insider_buy" else "sell", "who": n_.get("person") or "", "cat": n_.get("category") or "",
                                        "value_cr": r(n_.get("value_cr"), 2), "pct_after": r(n_.get("pct_after"), 2), "text": head})
    for sym, v in ins.items():
        out.setdefault(sym, {})["insider"] = v[:6]

    def row(s):
        i = px.row[s]
        return dict(symbol=s, name=st["cm"][s][1], rs=r(st["rs"][i], 0), r21=r(st["R"][21][i]), **{k: v for k, v in out[s].items() if k != "insider"})
    liq = [s for s in out if s in px.row and st["liquid"][px.row[s]]]
    v = lambda s, k: out[s].get(k) or 0
    lists = {
        "promoter_up": sorted([row(s) for s in liq if v(s, "promoter_chg") >= 0.5], key=lambda x: -x["promoter_chg"])[:40],
        "promoter_down": sorted([row(s) for s in liq if v(s, "promoter_chg") <= -1.0], key=lambda x: x["promoter_chg"])[:40],
        "inst_up": sorted([row(s) for s in liq if v(s, "fii_chg") >= 0.5 and v(s, "dii_chg") >= 0.5], key=lambda x: -(x["fii_chg"] + x["dii_chg"]))[:40],
        "pledge_high": sorted([row(s) for s in liq if v(s, "pledge") >= 20], key=lambda x: -x["pledge"])[:40],
        "disclosures": sorted([dict(symbol=s, name=st["cm"][s][1], rs=r(st["rs"][px.row[s]], 0), **e) for s in liq for e in out[s].get("insider", [])[:2]], key=lambda x: x["d"], reverse=True)[:60],
    }
    return out, {"as_of": px.cal[-1], **lists}


# ------------------------------------------------------------------ smart money
def fetch_deals(edge, start, end, log=print):
    from intel.net import Net
    net, n = Net(), 0
    a = start
    while a <= end:
        b = min(end, (a.replace(day=1) + dt.timedelta(days=32)).replace(day=1) - dt.timedelta(days=1))
        for kind, opt in (("Bulk", "bulk_deals"), ("Block", "block_deals")):
            try:
                txt = net.get(f"https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType={opt}&from={a:%d-%m-%Y}&to={b:%d-%m-%Y}&csv=true", "nse").text
                rows = list(csv.reader(io.StringIO(txt.lstrip("\ufeff\u00ef\u00bb\u00bf"))))
            except Exception as e:                                               # noqa: BLE001
                log(f"deals {kind} {a:%Y-%m}: {str(e)[:120]}")
                continue
            for x in rows[1:]:
                if len(x) < 7:
                    continue
                d, sym, party = day(x[0]), x[1].strip().upper(), re.sub(r"\s+", " ", x[3].upper()).strip()
                q, p = num(x[5]), num(x[6])
                if not (d and sym and party and q and p):
                    continue
                side = "B" if x[4].strip().upper().startswith("B") else "S"
                n += edge.execute("INSERT OR IGNORE INTO deals_hist VALUES (?,?,?,?,?,?,?)", (d, sym, party, side, q, p, kind)).rowcount
        edge.commit()
        a = b + dt.timedelta(days=1)
    return n


def build_smart(px, st, edge):
    net = {}                                                                      # (date, symbol, party) -> [buy_cr, sell_cr]
    for d, sym, party, side, q, p in edge.execute("SELECT d, symbol, party, side, qty, price FROM deals_hist"):
        a = net.setdefault((d, sym, party), [0.0, 0.0])
        a[0 if side == "B" else 1] += q * p / 1e7
    T, ix = px.T, px.idx
    per, allx, recent = {}, [], []
    cut = px.cal[-22]
    for (d, sym, party), (b, s) in net.items():
        kept = b - s
        if kept < 1.0 or kept / (b + s) < 0.2:                                    # a real buy: kept at least Rs 1 crore and a fifth of what it traded
            continue
        i, t = px.row.get(sym), px.at(d)
        if i is None or t is None:
            continue
        e = t + 1                                                                 # the deal is public that evening: a follower gets in the next session
        rec = {"d": d, "symbol": sym, "cr": r(kept, 1)}
        for h in (20, 60):
            if e + h < T and px.C[i, e] > 0 and np.isfinite(px.C[i, e + h]):
                x = (px.C[i, e + h] / px.C[i, e] - 1) * 100 - (ix[e + h] / ix[e] - 1) * 100
                if abs(x) < 300:
                    rec[f"x{h}"] = x
        per.setdefault(party, []).append(rec)
        if "x60" in rec:
            allx.append(rec["x60"])
        if d >= cut:
            recent.append((party, rec, i))
    parties = {}
    for party, recs in per.items():
        x60 = [x["x60"] for x in recs if "x60" in x]
        if len(x60) < 8:
            continue
        avg = sum(x60) / len(x60)
        parties[party] = {"party": party, "buys": len(recs), "scored": len(x60), "avg60": r(avg), "med60": r(statistics.median(x60)),
                          "win": r(sum(x > 0 for x in x60) / len(x60) * 100, 0), "skill": r(avg * len(x60) / (len(x60) + 10)),
                          "avg20": r(statistics.mean([x["x20"] for x in recs if "x20" in x]) if any("x20" in x for x in recs) else None),
                          "last": max(x["d"] for x in recs)}
    top = sorted(parties.values(), key=lambda x: -x["skill"])
    good = {p["party"] for p in top if p["skill"] >= 3 and p["win"] >= 50}
    now = []
    for party, rec, i in sorted(recent, key=lambda x: x[1]["d"], reverse=True):
        if party in good and st["liquid"][i]:
            sym = rec["symbol"]
            now.append({"d": rec["d"], "symbol": sym, "name": st["cm"][sym][1] if sym in st["cm"] else sym, "party": party, "cr": rec["cr"], "skill": parties[party]["skill"],
                        "win": parties[party]["win"], "scored": parties[party]["scored"], "rs": r(st["rs"][i], 0),
                        "since": r((px.C[i, -1] / px.C[i, min(px.at(rec["d"]) + 1, T - 1)] - 1) * 100)})
    span = edge.execute("SELECT min(d), max(d), count(*) FROM deals_hist").fetchone()
    by_sym = {}
    for x in now:
        by_sym.setdefault(x["symbol"], []).append({k: x[k] for k in ("d", "party", "cr", "skill", "win", "scored")})
    return by_sym, {"as_of": px.cal[-1], "from": span[0], "to": span[1], "deals": span[2], "buys_scored": len(allx),
                    "all_avg60": r(sum(allx) / len(allx)) if allx else None, "all_win": r(sum(x > 0 for x in allx) / len(allx) * 100, 0) if allx else None,
                    "top": top[:40], "bottom": top[-15:][::-1] if len(top) > 30 else [], "now": now[:50], "followable": len(good)}


# ------------------------------------------------------------------ sectors, accumulation
def build_sectors(px, st):
    L, cm = st["liquid"], st["cm"]
    C, s50 = px.C[:, -1], st["s50"][:, -1]

    def group(col, min_n):
        g = {}
        for i, s in enumerate(px.syms):
            if L[i] and cm[s][col]:
                g.setdefault(cm[s][col], []).append(i)
        out = []
        for name, ii in g.items():
            if len(ii) < min_n:
                continue
            ii = np.array(ii)
            med = lambda k: r(np.nanmedian(st["R"][k][ii]))
            best = sorted(ii, key=lambda i: -(st["rs"][i] if np.isfinite(st["rs"][i]) else 0))[:6]
            out.append({"name": name, "n": len(ii), "r5": med(5), "r21": med(21), "r63": med(63), "rs": r(np.nanmean(st["rs"][ii]), 0),
                        "above50": r(float(np.mean(C[ii] > s50[ii])) * 100, 0), "top": [{"symbol": px.syms[i], "rs": r(st["rs"][i], 0), "r21": r(st["R"][21][i])} for i in best]})
        return sorted(out, key=lambda x: -(x["rs"] or 0))
    ind = group(3, 6)
    leaders = [{"symbol": px.syms[i], "name": cm[px.syms[i]][1], "rs": r(st["rs"][i], 0), "r21": r(st["R"][21][i]), "r63": r(st["R"][63][i]), "sector": cm[px.syms[i]][2]}
               for i in np.argsort(-np.nan_to_num(st["rs"], nan=-1))[:60] if L[i]]
    return {"as_of": px.cal[-1], "sectors": group(2, 5), "industries_top": ind[:15], "industries_bottom": ind[-10:][::-1], "leaders": leaders}


def build_accum(px, st, hist):
    by = {}
    for sym, d, pct, dq in hist.execute("SELECT symbol, trade_date, deliv_pct, deliv_qty FROM nse_delivery_history WHERE series='EQ' AND trade_date>=date('now','-70 day') ORDER BY symbol, trade_date"):
        by.setdefault(sym, []).append((pct or 0, dq or 0))
    per, lst = {}, []
    for sym, v in by.items():
        i = px.row.get(sym)
        if i is None or len(v) < 25:
            continue
        p5, p30 = sum(x[0] for x in v[-5:]) / 5, sum(x[0] for x in v[-35:-5]) / len(v[-35:-5])
        q5, q30 = sum(x[1] for x in v[-5:]) / 5, sum(x[1] for x in v[-35:-5]) / len(v[-35:-5])
        d = {"deliv5": r(p5), "deliv30": r(p30), "qty_x": r(q5 / q30 if q30 else None, 2)}
        per[sym] = d
        r10 = (px.C[i, -1] / px.C[i, -11] - 1) * 100
        if st["liquid"][i] and q30 and q5 / q30 >= 1.6 and p5 >= p30 + 4 and -4 <= r10 <= 7:
            lst.append(dict(symbol=sym, name=st["cm"][sym][1], rs=r(st["rs"][i], 0), r10=r(r10), **d))
    return per, {"as_of": px.cal[-1], "list": sorted(lst, key=lambda x: -x["qty_x"])[:40]}


# ------------------------------------------------------------------ warnings, scorecard
def build_warnings(px, st, intel, owners):
    today = px.cal[-1]
    real_today = dt.date.today().isoformat()
    w = {}
    add = lambda s, kind, level, text, d="": w.setdefault(s, []).append({"kind": kind, "level": level, "text": text, "d": d})
    for sym, d, purpose in intel.execute("SELECT symbol, min(meeting_date), max(purpose) FROM meetings WHERE is_results=1 AND meeting_date>=? AND meeting_date<=date(?, '+10 day') GROUP BY 1", (real_today, real_today)):
        n = (dt.date.fromisoformat(d) - dt.date.fromisoformat(real_today)).days
        add(sym, "results", "info", "Results today" if n == 0 else f"Results in {n} day{'s' if n != 1 else ''}", d)
    for sym, ts, typ, head in intel.execute(f"SELECT symbol, ts, type, headline FROM events WHERE symbol IS NOT NULL AND ts>=datetime('now','-14 day') AND type IN ({','.join('?' * len(RED))}) ORDER BY ts DESC", list(RED)):
        if not any(x["kind"] == typ for x in w.get(sym, [])):
            add(sym, typ, "bad", RED[typ], ts[:10])
    try:
        from intel.net import Net
        asm = Net().json("https://www.nseindia.com/api/reportASM", "nse")
        for term, lab in (("longterm", "long-term"), ("shortterm", "short-term")):
            for x in (asm.get(term) or {}).get("data", []):
                add(str(x.get("symbol", "")).upper(), "asm", "bad", f"On the exchange surveillance list ({lab}, {x.get('asmSurvIndicator') or 'stage n/a'})", day(x.get("asmTime")))
    except Exception as e:                                                       # noqa: BLE001
        print("asm: skipped,", str(e)[:120], flush=True)
    for sym, o in owners.items():
        if (o.get("pledge") or 0) >= 25:
            add(sym, "pledge", "bad", f"{o['pledge']:.0f}% of promoter shares are pledged")
        if (o.get("pledge_chg") or 0) >= 2:
            add(sym, "pledge_up", "bad", f"Promoter pledge rose {o['pledge_chg']:.1f} points")
        if (o.get("promoter_chg") or 0) <= -2:
            add(sym, "promoter_cut", "bad", f"Promoters cut their stake by {-o['promoter_chg']:.1f} points last quarter")
    return w


def _next_open(hist, sym, entry_date):
    """Open of the first session after entry_date (what a buyer who acted the next morning paid), or None."""
    r = hist.execute("SELECT rawCandles FROM StockHistory WHERE symbol=?", (sym,)).fetchone()
    if not r:
        return None
    try:
        ks = sorted((str(k["t"])[:10], k) for k in json.loads(r[0]) if not k.get("p"))
    except ValueError:
        return None
    for d, k in ks:
        if d > entry_date:
            o = num(k.get("o"))
            return o if o and o > 0 else None
    return None


def build_scorecard(master, today, hist=None):
    rows = master.execute("SELECT lower(engine_version), symbol, substr(entry_date,1,10), substr(exit_date,1,10), entry_price, exit_price, holding_days, exit_reason, upper(coalesce(origin,'')), strategy_id "
                          "FROM closed_trades WHERE entry_price>0 AND exit_price>0").fetchall()
    t = dt.date.fromisoformat(today)

    def stat(v):
        if not v:
            return {"n": 0}
        p = [x[0] for x in v]
        w_, l_ = [x for x in p if x > 0], [x for x in p if x <= 0]
        return {"n": len(p), "win": r(len(w_) / len(p) * 100, 0), "avg": r(sum(p) / len(p), 2), "total": r(sum(p), 1), "avg_win": r(sum(w_) / len(w_), 2) if w_ else None,
                "avg_loss": r(sum(l_) / len(l_), 2) if l_ else None, "best": r(max(p)), "worst": r(min(p)), "hold": r(sum(x[1] or 0 for x in v) / len(v), 0)}
    out = {}
    for eng in sorted({x[0] for x in rows}):
        tr = [((xp / ep - 1) * 100 - 0.45, hd, xd, sym, why) for e, sym, ed, xd, ep, xp, hd, why, org, strat in rows if e == eng]
        since = lambda n: [x for x in tr if x[2] >= (t - dt.timedelta(days=n)).isoformat()]
        months = {}
        for x in tr:
            months.setdefault(x[2][:7], []).append(x)
        live = [r_ for r_ in rows if r_[0] == eng and r_[8] == "LIVE"]
        live_pct = [((r_[5] / r_[4] - 1) * 100 - 0.45, r_[6], r_[3], r_[1], r_[7]) for r_ in live]
        nxt = []
        for r_ in live:
            o = _next_open(hist, r_[1], r_[2]) if hist is not None and r_[3] > r_[2] else None
            if o:
                nxt.append(((r_[5] / o - 1) * 100 - 0.45, r_[6], r_[3], r_[1], r_[7]))
        types = {}
        for r_ in rows:
            if r_[0] != eng:
                continue
            ed_ = r_[2]
            half = ed_[:4] + ("H1" if ed_[5:7] <= "06" else "H2")
            p_ = ((r_[5] / r_[4] - 1) * 100 - 0.45, r_[6], r_[3], r_[1], r_[7])
            t_ = types.setdefault(r_[9], {"all": [], "half": {}})
            t_["all"].append(p_)
            t_["half"].setdefault(half, []).append(p_)
        out[eng] = {"all": stat(tr), "d90": stat(since(90)), "d30": stat(since(30)), "first": min(x[2] for x in tr), "last": max(x[2] for x in tr),
                    "live": stat(live_pct), "live_first": min((r_[2] for r_ in live), default=None), "next_open": stat(nxt),
                    "types": [{"type": k, **stat(v["all"]), "half": {h: stat(l) for h, l in sorted(v["half"].items())}} for k, v in sorted(types.items())],
                    "months": [{"m": m, **stat(v)} for m, v in sorted(months.items())[-14:]],
                    "recent": [{"symbol": x[3], "exit": x[2], "pct": r(x[0]), "why": x[4]} for x in sorted(tr, key=lambda x: x[2], reverse=True)[:8]]}
    for eng, n, u in master.execute("SELECT lower(engine_version), count(*), avg((current_ltp/entry_price-1)*100) FROM active_trades WHERE status='OPEN' AND entry_price>0 AND current_ltp>0 GROUP BY 1"):
        out.setdefault(eng, {})["open"] = {"n": n, "avg": r(u, 2)}
    paper = {}
    for k, f in (("v10", f"{SHADOW}/v10/v10_summary.json"), ("v2exit", f"{SHADOW}/v2exit/summary.json")):
        try:
            paper[k] = json.load(open(f))
        except (OSError, ValueError):
            pass
    return {"as_of": today, "cost_pct": 0.45, "engines": out, "paper": paper}


# ------------------------------------------------------------------ main
def main(mode):
    t0 = time.time()
    edge = sqlite3.connect(EDGE, timeout=60)
    edge.executescript("""
        CREATE TABLE IF NOT EXISTS blobs (key TEXT PRIMARY KEY, built_at TEXT, body_json TEXT);
        CREATE TABLE IF NOT EXISTS stock (symbol TEXT PRIMARY KEY, body_json TEXT);
        CREATE TABLE IF NOT EXISTS deals_hist (d TEXT, symbol TEXT, party TEXT, side TEXT, qty REAL, price REAL, kind TEXT, PRIMARY KEY (d, symbol, party, side, qty, price, kind));
        CREATE TABLE IF NOT EXISTS pledge_snap (symbol TEXT, day TEXT, pct_promoter REAL, pct_total REAL, filed TEXT, PRIMARY KEY (symbol, day));
    """)
    today = dt.date.today()
    if mode == "backfill":
        print("deal history: +", fetch_deals(edge, dt.date(2023, 1, 1), today), flush=True)
    else:
        last = edge.execute("SELECT max(d) FROM deals_hist").fetchone()[0]
        start = dt.date.fromisoformat(last) - dt.timedelta(days=5) if last else today - dt.timedelta(days=40)
        try:
            print("deals: +", fetch_deals(edge, start, today), flush=True)
        except Exception as e:                                                   # noqa: BLE001
            print("deals: skipped,", str(e)[:150], flush=True)
    hist, master, intel, fund = ro(HIST), ro(MASTER), ro(INTEL), ro(FUND)
    px = Px(hist)
    st = build_stats(px, hist)
    asof = px.cal[-1]
    print(f"prices: {len(px.syms)} stocks x {px.T} days to {asof}, liquid {int(st['liquid'].sum())} ({time.time() - t0:.0f}s)", flush=True)
    blobs = {}
    blobs["regime"] = build_regime(px, st, intel, master)
    earn, blobs["earnings"] = build_earnings(px, st, fund, intel)
    own, blobs["owners"] = build_owners(px, st, fund, intel, fetch_pledges(edge, today.isoformat()))
    smart, blobs["smart"] = build_smart(px, st, edge)
    blobs["sectors"] = build_sectors(px, st)
    deliv, blobs["accum"] = build_accum(px, st, hist)
    warn = build_warnings(px, st, intel, own)
    blobs["scorecard"] = build_scorecard(master, asof, hist)
    sec_rank = {s["name"]: k + 1 for k, s in enumerate(blobs["sectors"]["sectors"])}
    now = dt.datetime.now().isoformat(timespec="seconds")
    edge.execute("DELETE FROM stock")
    n = 0
    for i, s in enumerate(px.syms):
        if not st["eq"][i]:
            continue
        cm, R = st["cm"][s], st["R"]
        body = {"symbol": s, "name": cm[1], "sector": cm[2], "industry": cm[3], "mcap_cr": r(cm[4], 0), "as_of": px.cal[int(px.last_i[i])], "close": r(st["last"][i], 2),
                "liquid": bool(st["liquid"][i]), "rs": r(st["rs"][i], 0), "r5": r(R[5][i]), "r21": r(R[21][i]), "r63": r(R[63][i]), "r126": r(R[126][i]), "r252": r(R[252][i]),
                "trend": trend_of(float(st["last"][i]), float(st["s20"][i, -1]), float(st["s50"][i, -1]), float(st["s200"][i, -1])),
                "sector_rank": sec_rank.get(cm[2]), "sectors": len(sec_rank), "earnings": earn.get(s), "owners": own.get(s), "delivery": deliv.get(s),
                "smart": smart.get(s), "warnings": warn.get(s, [])}
        edge.execute("INSERT INTO stock VALUES (?,?)", (s, json.dumps(body, separators=(",", ":"))))
        n += 1
    blobs["meta"] = {"built_at": now, "as_of": asof, "stocks": n, "seconds": round(time.time() - t0)}
    for k, v in blobs.items():
        edge.execute("INSERT OR REPLACE INTO blobs VALUES (?,?,?)", (k, now, json.dumps(v, separators=(",", ":"))))
    edge.commit()
    print(dt.datetime.now().strftime("%F %T"), f"edge built: {n} stocks, gauge {blobs['regime']['gauge']} (b50 {blobs['regime']['b50']}), "
          f"results {blobs['earnings']['reported']}, smart buyers {blobs['smart']['followable']}, {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "daily")
