"""Did the owner follow the AI calls? Builds the owner.db table `follow`: one row per AI call (closed and open), with
what the owner did about it. Reads quantsync_master.db and stock_history.db read-only; writes only owner.db.

    venv/bin/python3 scripts/owner_follow.py run

States: taken (bought within 3 sessions of the call), late (4 to 10 sessions), skipped, held_before (already held the stock
and bought no more), untracked (the call is older than the first broker record we have).
Buy and sell evidence, in order of trust: fills (imported trade book or broker trade list), order_log (orders sent from
/rahul), broker_moves (changes spotted between broker refreshes, a weaker signal).
Env QS_ROOT / QS_OWNER_DB point the script at another folder or a copy of owner.db (used for tests).
"""
from __future__ import annotations

import bisect
import datetime as dt
import json
import os
import sqlite3
import sys
import time
from collections import defaultdict

ROOT = os.environ.get("QS_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MASTER, HIST = f"{ROOT}/Data/quantsync_master.db", f"{ROOT}/Data/stock_history.db"
OWNER = os.environ.get("QS_OWNER_DB", f"{ROOT}/Data/owner.db")
COST = 0.45
TAKEN_WITHIN, LATE_WITHIN, SELL_LOOKAHEAD = 3, 10, 40

SCHEMA = """
CREATE TABLE IF NOT EXISTS fills (
  broker TEXT, trade_id TEXT, d TEXT, ts TEXT, symbol TEXT, side TEXT CHECK (side IN ('BUY','SELL')),
  qty REAL, price REAL, src TEXT,
  PRIMARY KEY (broker, trade_id));
CREATE TABLE IF NOT EXISTS follow (
  call_id TEXT PRIMARY KEY, engine TEXT, strategy TEXT, symbol TEXT,
  call_date TEXT, call_entry REAL, exit_date TEXT, call_exit REAL, call_result REAL,
  state TEXT,
  your_date TEXT, your_price REAL, your_qty REAL, zone TEXT,
  sold_date TEXT, sold_price REAL, exit_lag INTEGER,
  your_result REAL, source TEXT,
  built_at TEXT);
"""


def ro(p):
    return sqlite3.connect(f"file:{p}?mode=ro", uri=True, timeout=60)


def sessions(hist):
    r = hist.execute("SELECT rawCandles FROM StockHistory WHERE symbol='NIFTY500'").fetchone()
    ks = json.loads(r[0]) if r else []
    return sorted({str(k["t"])[:10] for k in ks if not k.get("p")})


def zone_of(price, entry):
    g = (price / entry - 1) * 100
    return "ran" if g > 2 else "below" if g < -1 else "near"


def clean_moves(moves):
    """moves: [(ts, source, symbol, kind, qty, avg_price, price)]. A buy and a sell of the same quantity in the same stock and
    broker within 2 days are a settlement artefact, not trades: drop both (closest pair first)."""
    buys = lambda k: k in ("bought", "added")
    day = lambda m: dt.date.fromisoformat(m[0][:10])
    live = list(moves)
    pairs = sorted(((abs((day(a) - day(b)).days), i, j) for i, a in enumerate(moves) for j, b in enumerate(moves)
                    if i < j and a[1] == b[1] and a[2] == b[2] and buys(a[3]) != buys(b[3]) and abs(a[4] - b[4]) < 1e-9 and abs((day(a) - day(b)).days) <= 2))
    gone = set()
    for _, i, j in pairs:
        if i not in gone and j not in gone:
            gone.update((i, j))
    return [m for k, m in enumerate(live) if k not in gone]


def build(log=print):
    t0 = time.time()
    own = sqlite3.connect(OWNER, timeout=60)
    own.executescript(SCHEMA)
    master, hist = ro(MASTER), ro(HIST)
    cal = sessions(hist)
    if not cal:
        raise SystemExit("no session calendar")
    pos = lambda d: bisect.bisect_left(cal, d)                       # index of the first session on or after d
    sess_gap = lambda a, b: pos(b) - pos(a)

    # ---- evidence, by symbol
    fills = defaultdict(list)                                         # symbol -> [(d, side, qty, price)]
    for d, sym, side, qty, price in own.execute("SELECT d, symbol, side, qty, price FROM fills"):
        fills[sym].append((d, side, qty, price))
    orders = defaultdict(list)
    try:
        for ts, sym, side, qty, otype, price, ref in own.execute("SELECT ts, symbol, side, qty, order_type, price, ref_price FROM order_log WHERE status='sent' AND order_type IN ('LIMIT','MARKET')"):
            orders[sym].append((ts[:10], side, qty, price if otype == "LIMIT" and price else ref))
    except sqlite3.Error:
        pass
    moves_raw = []
    try:
        moves_raw = [(ts, src, sym, kind, qty, avg, px) for ts, src, sym, kind, qty, avg, px in own.execute("SELECT ts, source, symbol, kind, qty, avg_price, price FROM broker_moves")]
    except sqlite3.Error:
        pass
    moves = defaultdict(list)
    for ts, src, sym, kind, qty, avg, px in clean_moves(moves_raw):
        side = "BUY" if kind in ("bought", "added") else "SELL"
        moves[sym].append((ts[:10], side, qty, avg if side == "BUY" and avg else px))
    snaps = defaultdict(dict)                                         # symbol -> {snap_date: total qty}
    try:
        for d, sym, qty in own.execute("SELECT snap_date, symbol, SUM(qty) FROM broker_holdings_daily GROUP BY snap_date, symbol"):
            snaps[sym][d] = qty
    except sqlite3.Error:
        pass

    firsts = [x for x in (own.execute("SELECT min(d) FROM fills").fetchone()[0],
                          own.execute("SELECT min(snap_date) FROM broker_holdings_daily").fetchone()[0],
                          own.execute("SELECT min(substr(ts,1,10)) FROM order_log").fetchone()[0]) if x]
    track_from = min(firsts) if firsts else None
    log(f"track from {track_from}, sessions to {cal[-1]}, fills {sum(map(len, fills.values()))}, orders {sum(map(len, orders.values()))}, moves {sum(map(len, moves.values()))}")

    def evidence(sym, side, d0, d1):
        """First day in [d0, d1] with a `side` record, best source first. Returns (date, volume-weighted price, qty, source) or None."""
        for name, book in (("fills", fills), ("orders", orders), ("snapshots", moves)):
            rows = [r for r in book.get(sym, []) if r[1] == side and d0 <= r[0] <= d1]
            if rows:
                day = min(r[0] for r in rows)
                same = [r for r in rows if r[0] == day]
                q = sum(r[2] for r in same)
                px = sum(r[2] * r[3] for r in same) / q if q else same[0][3]
                return day, px, q, name
        return None

    def held_before(sym, d):
        net = 0.0
        for fd, side, qty, _ in fills.get(sym, []):
            if fd < d:
                net += qty if side == "BUY" else -qty
        if fills.get(sym) and net > 0.5:
            return True
        prior = [k for k in snaps.get(sym, {}) if k < d]
        return bool(prior) and snaps[sym][max(prior)] > 0

    # ---- calls
    calls = []
    for tid, eng, sym, strat, ed, xd, ep, xp in master.execute(
            "SELECT trade_id, lower(engine_version), symbol, strategy_id, substr(entry_date,1,10), substr(exit_date,1,10), entry_price, exit_price FROM closed_trades WHERE entry_price>0 AND exit_price>0"):
        calls.append((tid, eng, sym, strat, ed, ep, xd, xp))
    for tid, eng, sym, strat, ed, ep in master.execute(
            "SELECT trade_id, lower(engine_version), symbol, strategy_id, substr(entry_date,1,10), entry_price FROM active_trades WHERE status='OPEN' AND entry_price>0"):
        calls.append((tid, eng, sym, strat, ed, ep, None, None))

    now = time.strftime("%Y-%m-%dT%H:%M:%S")
    out = []
    for tid, eng, sym, strat, ed, ep, xd, xp in calls:
        res = round((xp / ep - 1) * 100 - COST, 2) if xp else None
        row = dict(call_id=tid, engine=eng, strategy=strat, symbol=sym, call_date=ed, call_entry=ep, exit_date=xd, call_exit=xp, call_result=res, state="untracked",
                   your_date=None, your_price=None, your_qty=None, zone=None, sold_date=None, sold_price=None, exit_lag=None, your_result=None, source=None, built_at=now)
        if track_from and ed >= track_from and ed <= cal[-1]:
            i = pos(ed)
            end_taken = cal[min(i + TAKEN_WITHIN, len(cal) - 1)]
            end_late = cal[min(i + LATE_WITHIN, len(cal) - 1)]
            buy = evidence(sym, "BUY", ed, end_late)
            if buy:
                late = buy[0] > end_taken
                row.update(state="late" if late else "taken", your_date=buy[0], your_price=round(buy[1], 2), your_qty=buy[2], zone=zone_of(buy[1], ep), source=buy[3])
            elif held_before(sym, ed):
                row.update(state="held_before")
            else:
                row.update(state="skipped")
            if xd and row["state"] in ("taken", "late", "held_before"):
                start = cal[max(pos(xd) - 1, 0)]
                stop = cal[min(pos(xd) + SELL_LOOKAHEAD, len(cal) - 1)]
                sell = evidence(sym, "SELL", start, stop)
                if sell:
                    row.update(sold_date=sell[0], sold_price=round(sell[1], 2), exit_lag=sess_gap(xd, sell[0]))
                    if row["your_price"]:
                        row["your_result"] = round((sell[1] / row["your_price"] - 1) * 100 - COST, 2)
        out.append(row)

    cols = list(out[0].keys()) if out else []
    own.execute("BEGIN")
    own.execute("DELETE FROM follow")
    own.executemany(f"INSERT INTO follow ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})", [tuple(r[c] for c in cols) for r in out])
    own.commit()
    by = defaultdict(int)
    for r in out:
        by[r["state"]] += 1
    log(f"follow: {len(out)} calls {dict(by)} in {time.time() - t0:.1f}s")
    return {"calls": len(out), "states": dict(by), "track_from": track_from}


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "run":
        print(dt.datetime.now().strftime("%F %T"), json.dumps(build()), flush=True)
    else:
        print(__doc__)
