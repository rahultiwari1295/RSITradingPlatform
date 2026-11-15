#!/usr/bin/env python3
"""Save the day's real fill prices from each connected broker into owner.db `fills` (src 'api').

    owner_fills.py run        read today's trade list from Angel, Kite and Dhan (read-only calls) and save new fills
    owner_fills.py dry        same, but only print what would be saved

The brokers only list the CURRENT day's trades, so this runs after the close (cron 15:45 and 16:10) and once more is harmless:
a trade that is already saved is skipped. Older history comes from the trade-book import in /rahul.

Kite and Dhan field names are from their official documentation. Angel's getTradeBook field names are NOT in a page I could read,
so the Angel reader accepts several spellings and prints the field names it saw the first time it finds trades.
Only delivery (CNC) equity trades are kept.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import sqlite3
import sys

ROOT = os.environ.get("QS_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path[:0] = [os.path.join(ROOT, "api"), ROOT]
OWNER = os.environ.get("QS_OWNER_DB", os.path.join(ROOT, "Data", "owner.db"))

SCHEMA = """CREATE TABLE IF NOT EXISTS fills (broker TEXT, trade_id TEXT, d TEXT, ts TEXT, symbol TEXT, side TEXT CHECK (side IN ('BUY','SELL')),
            qty REAL, price REAL, src TEXT, PRIMARY KEY (broker, trade_id))"""


def sym_of(s):
    return str(s or "").upper().replace("-EQ", "").replace("-BE", "").strip()


def pick(d, *names):
    for n in names:
        if d.get(n) not in (None, ""):
            return d[n]
    return None


def fnum(x):
    try:
        return float(str(x).replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def angel(OP, today):
    cfg = OP._cfg()
    url = OP.ANGEL_API + "/order/v1/getTradeBook"
    r = OP._call(url, cfg, OP._token(cfg))
    if not r.get("status"):
        r = OP._call(url, cfg, OP._token(cfg, force=True))
    if not r.get("status"):
        raise RuntimeError(f"Angel trade book failed: {r.get('message')}")
    data = r.get("data") or []
    rows = []
    for t in data:
        if str(pick(t, "producttype", "product") or "").upper() not in ("DELIVERY", "CNC"):
            continue
        if str(pick(t, "exchange") or "NSE").upper() not in ("NSE", "BSE"):
            continue
        side = str(pick(t, "transactiontype", "transaction_type") or "").upper()
        qty, px = fnum(pick(t, "fillsize", "filledshares", "quantity")), fnum(pick(t, "fillprice", "tradeprice", "price"))
        tid = str(pick(t, "fillid", "tradeid", "trade_id") or "")
        ts = str(pick(t, "filltime", "fill_time") or "")
        if not tid:
            tid = hashlib.sha1(f"{pick(t, 'orderid')}|{ts}|{qty}|{px}".encode()).hexdigest()[:16]
        rows.append(("Angel", tid, today, f"{today} {ts}".strip(), sym_of(pick(t, "tradingsymbol", "symbolname")), side, qty, px, "api"))
    return rows, (sorted(data[0].keys()) if data else [])


def kite(OP, today):
    h = OP._kite_headers()
    if not h:
        return None, "not connected today"
    r = OP._http("https://api.kite.trade/trades", h)
    if r.get("_error"):
        raise RuntimeError(f"Kite trades failed: {r['_error']}")
    rows = []
    for t in r.get("data") or []:
        if str(t.get("product", "")).upper() != "CNC" or str(t.get("exchange", "NSE")).upper() not in ("NSE", "BSE"):
            continue
        ts = str(t.get("fill_timestamp") or t.get("exchange_timestamp") or "")
        rows.append(("Kite", str(t.get("trade_id")), ts[:10] or today, ts, sym_of(t.get("tradingsymbol")), str(t.get("transaction_type", "")).upper(),
                     fnum(t.get("quantity")), fnum(t.get("average_price")), "api"))
    return rows, None


def dhan(OP, today):
    a = OP._dhan_auth()
    if not a:
        return None, "not connected today"
    r = OP._http("https://api.dhan.co/v2/trades", {"access-token": a[0], "client-id": a[1], "Accept": "application/json", "Content-Type": "application/json"})
    if isinstance(r, dict) and r.get("_error"):
        raise RuntimeError(f"Dhan trades failed: {r['_error']}")
    rows = []
    for t in (r if isinstance(r, list) else r.get("data") or []):
        if str(t.get("productType", "")).upper() != "CNC" or not str(t.get("exchangeSegment", "NSE_EQ")).upper().endswith("_EQ"):
            continue
        ts = str(t.get("exchangeTime") or t.get("updateTime") or "")
        tid = str(t.get("exchangeTradeId") or "") or hashlib.sha1(f"{t.get('orderId')}|{ts}|{t.get('tradedQuantity')}|{t.get('tradedPrice')}".encode()).hexdigest()[:16]
        rows.append(("Dhan", tid, ts[:10] or today, ts, sym_of(t.get("tradingSymbol")), str(t.get("transactionType", "")).upper(),
                     fnum(t.get("tradedQuantity")), fnum(t.get("tradedPrice")), "api"))
    return rows, None


def run(dry=False):
    import owner_portfolio as OP
    today = dt.date.today().isoformat()
    own = sqlite3.connect(OWNER, timeout=60)
    own.execute(SCHEMA)
    total_new = 0
    for name, fn in (("Angel", angel), ("Kite", kite), ("Dhan", dhan)):
        try:
            rows, extra = fn(OP, today)
        except Exception as e:                                                       # noqa: BLE001
            print(dt.datetime.now().strftime("%F %T"), name, "failed:", str(e)[:160], flush=True)
            continue
        if rows is None:
            print(dt.datetime.now().strftime("%F %T"), name, "skipped:", extra, flush=True)
            continue
        rows = [r for r in rows if r[4] and r[5] in ("BUY", "SELL") and r[6] > 0 and r[7] > 0]
        if name == "Angel" and extra and not os.path.exists(os.path.join(ROOT, "logs", ".angel_tradebook_keys")):
            print("Angel trade book fields seen:", extra, flush=True)
            try:
                open(os.path.join(ROOT, "logs", ".angel_tradebook_keys"), "w").write(",".join(extra))
            except OSError:
                pass
        new = 0
        if not dry:
            before = own.total_changes
            own.executemany("INSERT OR IGNORE INTO fills VALUES (?,?,?,?,?,?,?,?,?)", rows)
            own.commit()
            new = own.total_changes - before
        total_new += new
        print(dt.datetime.now().strftime("%F %T"), name, f"{len(rows)} delivery trades today, {new} new" + (" (dry run)" if dry else ""), flush=True)
        if dry:
            for r in rows[:5]:
                print("   ", r[4], r[5], r[6], r[7])
    return total_new


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode in ("run", "dry"):
        run(dry=(mode == "dry"))
    else:
        print(__doc__)
