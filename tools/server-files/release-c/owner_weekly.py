#!/usr/bin/env python3
"""Weekly report for the owner: calls made, calls taken, results, exits, and one thing to fix. Reads owner.db `follow`
(built by owner_follow.py) and broker data; writes owner.db `weekly`. Sends a private Telegram message only when
config.json owner_alerts.chat_id is set (never to the public or admin channel).

    owner_weekly.py run [YYYY-MM-DD]     build the report for the Monday-Friday week just ended (or the week containing that date)
    owner_weekly.py dry [YYYY-MM-DD]     print the report, save and send nothing
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sqlite3
import sys

ROOT = os.environ.get("QS_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OWNER = os.environ.get("QS_OWNER_DB", os.path.join(ROOT, "Data", "owner.db"))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

SCHEMA = "CREATE TABLE IF NOT EXISTS weekly (week TEXT PRIMARY KEY, built_at TEXT, body_json TEXT, text TEXT, sent INTEGER)"


def week_of(ref: dt.date):
    if ref.weekday() < 5:                       # a weekday: report the week before; Saturday or Sunday: this week
        ref = ref - dt.timedelta(days=ref.weekday() + 1)
    mon = ref - dt.timedelta(days=ref.weekday())
    return mon, mon + dt.timedelta(days=4)


def avg(v):
    v = [x for x in v if x is not None]
    return round(sum(v) / len(v), 2) if v else None


def sp(x, d=1):
    return "—" if x is None else f"{x:+.{d}f}%"


def build(ref: dt.date):
    mon, fri = week_of(ref)
    a, b = mon.isoformat(), fri.isoformat()
    own = sqlite3.connect(OWNER, timeout=60)
    own.row_factory = sqlite3.Row
    try:
        rows = [dict(r) for r in own.execute("SELECT * FROM follow")]
    except sqlite3.Error:
        rows = []
    made = [r for r in rows if a <= r["call_date"] <= b and r["state"] in ("taken", "late", "skipped")]
    took = [r for r in made if r["state"] in ("taken", "late")]
    skipped = [r for r in made if r["state"] == "skipped"]
    closed = [r for r in rows if r["exit_date"] and a <= r["exit_date"] <= b and r["state"] != "untracked"]
    closed_took = [r for r in closed if r["state"] in ("taken", "late")]
    ex = [r for r in closed if r["state"] in ("taken", "late", "held_before")]
    followed = [r for r in ex if r["exit_lag"] is not None and -1 <= r["exit_lag"] <= 2]
    mine = [r for r in closed_took if r["your_result"] is not None]
    best = max(mine, key=lambda r: r["your_result"], default=None)
    worst = min(mine, key=lambda r: r["your_result"], default=None)

    # portfolio value over the week, from the daily holdings snapshots
    val = {}
    try:
        for d, v in own.execute("SELECT snap_date, SUM(qty*ltp) FROM broker_holdings_daily GROUP BY snap_date"):
            val[d] = v
    except sqlite3.Error:
        pass
    before = [d for d in val if d < a]
    inside = [d for d in val if a <= d <= b]
    change = None
    if inside:
        start = val[max(before)] if before else val[min(inside)]
        end = val[max(inside)]
        change = (end - start, (end / start - 1) * 100 if start else None)

    # still holding after an AI exit
    held = {r[0] for r in own.execute("SELECT symbol FROM broker_last WHERE qty>0")} if _has(own, "broker_last") else set()
    stuck = sorted({r["symbol"] for r in rows if r["exit_date"] and r["exit_date"] >= (ref - dt.timedelta(days=14)).isoformat() and r["state"] in ("taken", "late", "held_before")
                    and r["sold_date"] is None and r["symbol"] in held})

    if stuck:
        fix = f"Sell {', '.join(stuck[:4])}: the AI exited and you still hold {'it' if len(stuck) == 1 else 'them'}."
    elif len(skipped) >= 2:
        fix = f"You skipped {len(skipped)} calls this week. Most of the profit comes from about 1 call in 10."
    elif any(r["zone"] == "below" for r in took):
        fix = "You bought a call below its entry. Those have won about 3 in 10. Wait for the price to get back above the entry."
    elif sum(r["state"] == "late" for r in took) >= 2:
        fix = "You bought several calls late. The first three sessions are when the call is best."
    else:
        fix = "Nothing to fix this week."

    lines = [f"Week {mon.strftime('%d %b')} to {fri.strftime('%d %b')}"]
    if not rows or not made and not closed:
        lines.append("No tracked calls this week.")
    else:
        lines.append(f"Calls made: {len(made)}. You took {len(took)}, skipped {len(skipped)}.")
        if closed_took:
            lines.append(f"Closed this week that you took: {len(closed_took)}. Your average {sp(avg([r['your_result'] if r['your_result'] is not None else r['call_result'] for r in closed_took]))}, the AI's {sp(avg([r['call_result'] for r in closed_took]))}.")
        if ex:
            lines.append(f"AI exits: {len(ex)}. You followed {len(followed)} within 2 days.")
        if best and worst and best is not worst:
            lines.append(f"Best: {best['symbol']} {sp(best['your_result'])}. Worst: {worst['symbol']} {sp(worst['your_result'])}.")
    if change:
        lines.append(f"Portfolio value {'+' if change[0] >= 0 else '−'}₹{abs(change[0]):,.0f}" + (f" ({sp(change[1])})" if change[1] is not None else "") + " over the week.")
    try:
        no_fills = own.execute("SELECT count(*) FROM fills").fetchone()[0] == 0
    except sqlite3.Error:
        no_fills = True
    if no_fills and made:
        lines.append("Note: calls bought at a broker whose trade book you have not imported show as skipped.")
    lines.append("To fix: " + fix)
    body = {"week": a, "from": a, "to": b, "calls_made": len(made), "taken": len(took), "skipped": len(skipped), "closed_taken": len(closed_took),
            "exits": len(ex), "exits_followed": len(followed), "value_change": change[0] if change else None, "fix": fix}
    return a, body, "\n".join(lines)


def _has(c, t):
    return bool(c.execute("SELECT 1 FROM sqlite_master WHERE name=?", (t,)).fetchone())


def run(dry=False, ref=None):
    ref = ref or dt.date.today()
    week, body, text = build(ref)
    print(text, flush=True)
    if dry:
        return
    own = sqlite3.connect(OWNER, timeout=60)
    own.execute(SCHEMA)
    sent = 0
    try:
        import owner_alerts as A
        c = A.cfg()
        chat = (c.get("owner_alerts") or {}).get("chat_id")
        if chat:
            sent = int(bool(A.tg("sendMessage", {"chat_id": chat, "text": "QuantSync, your week\n\n" + text, "disable_web_page_preview": "true"}, c).get("ok")))
    except Exception as e:                                                       # noqa: BLE001
        print("telegram failed:", str(e)[:150], flush=True)
    own.execute("INSERT OR REPLACE INTO weekly VALUES (?,?,?,?,?)", (week, dt.datetime.now().isoformat(timespec="seconds"), json.dumps(body), text, sent))
    own.commit()
    print(dt.datetime.now().strftime("%F %T"), f"weekly {week} saved, telegram {'sent' if sent else 'not sent'}", flush=True)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode in ("run", "dry"):
        run(dry=(mode == "dry"), ref=dt.date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else None)
    else:
        print(__doc__)
