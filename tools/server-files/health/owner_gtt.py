#!/usr/bin/env python3
"""Check the GTTs (sell triggers) left at each broker against what is held there.

    owner_gtt.py run     refresh the saved GTT list from Angel, Kite and Dhan; record an alert for every GTT that would sell
                         shares no longer held (sold by hand) or more shares than are held. Telegram only if
                         config.json owner_alerts.chat_id is set. Nothing is ever cancelled here.
    owner_gtt.py dry     print the list and the problems, save nothing
"""
from __future__ import annotations

import datetime as dt
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path[:0] = [os.path.join(ROOT, "api"), os.path.join(ROOT, "scripts"), ROOT]


def run(dry=False):
    import owner_health as H
    if not dry:
        errs = H.refresh_gtts()
        for b, m in errs.items():
            print(dt.datetime.now().strftime("%F %T"), b, "list failed:", m, flush=True)
    v = H.gtt_view()
    bad = [g for g in v["items"] if g["state"] in ("orphan", "too_big")]
    now = dt.datetime.now().isoformat(timespec="seconds")
    print(now, f"{len(v['items'])} GTTs saved, {len(bad)} problems", flush=True)
    for g in bad:
        print("   ", g["broker"], g["symbol"], g["state"], "gtt qty", g["qty"], "held", g["held"], flush=True)
    if dry or not bad:
        return
    own = sqlite3.connect(os.path.join(ROOT, "Data", "owner.db"), timeout=30)
    own.execute("CREATE TABLE IF NOT EXISTS alert_sent (key TEXT PRIMARY KEY, ts TEXT, kind TEXT, symbol TEXT, text TEXT, sent INTEGER)")
    out = []
    for g in bad:
        trig = ", ".join(f"₹{t:,.2f}" for t in g["triggers"])
        text = (f"{g['symbol']}: a {g['broker']} GTT will sell {g['qty']:g} at {trig}, but you hold none there. Cancel it in Portfolio → Health → Protection."
                if g["state"] == "orphan" else
                f"{g['symbol']}: a {g['broker']} GTT will sell {g['qty']:g} at {trig}, but you hold only {g['held']:g} there. Cancel or replace it.")
        key = f"gtt|{g['broker']}|{g['id']}|{g['state']}"
        if not own.execute("SELECT 1 FROM alert_sent WHERE key=?", (key,)).fetchone():
            out.append((key, g["symbol"], text))
    sent = 0
    if out:
        try:
            import owner_alerts as A
            c = A.cfg()
            chat = (c.get("owner_alerts") or {}).get("chat_id")
            if chat:
                sent = int(bool(A.tg("sendMessage", {"chat_id": chat, "text": ("QuantSync, GTT check\n\n" + "\n\n".join("⚠️ " + t for _, _, t in out))[:3900],
                                                      "disable_web_page_preview": "true"}, c).get("ok")))
        except Exception as e:  # noqa: BLE001
            print("telegram failed:", str(e)[:150], flush=True)
    for key, sym, text in out:
        own.execute("INSERT OR IGNORE INTO alert_sent VALUES (?,?,?,?,?,?)", (key, now, "gtt", sym, text, sent))
    own.commit()


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode in ("run", "dry"):
        run(dry=(mode == "dry"))
    else:
        print(__doc__)
