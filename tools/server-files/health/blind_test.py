"""Blind test of the holding verdicts on 8 years of NSE daily prices. Read-only.
Every 21 sessions, every liquid stock gets a verdict from past data only. Then we look 63 and 126 sessions ahead:
return against NIFTY500, and the chance of a fall of 20% or more from that day. Two separate periods."""
import json, sqlite3, sys, collections
sys.path.insert(0, sys.argv[1] if len(sys.argv) > 1 else ".")
from health_rules import verdict_at

db = sqlite3.connect("file:/root/quantsync/Data/stock_history.db?mode=ro", uri=True)
bench_c = [k for k in json.loads(db.execute("SELECT rawCandles FROM StockHistory WHERE symbol='NIFTY500'").fetchone()[0]) if not k.get("p")]
bench = {k["t"][:10]: k["c"] for k in bench_c}
dates = [k["t"][:10] for k in bench_c]
sample = set(dates[260::21])

res = collections.defaultdict(list)   # (period, verdict) -> [(rel63, rel126, dd63)]
n_st = 0
for sym, raw in db.execute("SELECT symbol, rawCandles FROM StockHistory WHERE candleCount >= 600"):
    if sym.startswith("NIFTY"):
        continue
    cs = [k for k in json.loads(raw) if not k.get("p")]
    for k in cs:
        k["t"] = k["t"][:10]
    n_st += 1
    for i in range(260, len(cs) - 126):
        d = cs[i]["t"]
        if d not in sample:
            continue
        turn = sum(x["c"] * (x.get("v") or 0) for x in cs[i - 20:i]) / 20
        if turn < 2e7 or cs[i]["c"] < 20:      # skip illiquid (under ₹2 cr a day) and penny stocks
            continue
        v = verdict_at(cs, i, bench)
        b0, b63, b126 = bench.get(d), bench.get(cs[i + 63]["t"]), bench.get(cs[i + 126]["t"])
        if not (v and b0 and b63 and b126):
            continue
        px = cs[i]["c"]
        r63 = (cs[i + 63]["c"] / px - b63 / b0) * 100
        r126 = (cs[i + 126]["c"] / px - b126 / b0) * 100
        dd = min(x["l"] for x in cs[i + 1:i + 64]) / px - 1
        per = "A 2019-22" if d < "2023-01-01" else "B 2023-26"
        res[(per, v["verdict"])].append((r63, r126, dd <= -0.20))

print("stocks", n_st)
for per in ("A 2019-22", "B 2023-26"):
    print("\n" + per)
    print(f"{'verdict':8} {'n':>7} {'vs N500 3m':>11} {'median':>8} {'vs N500 6m':>11} {'fell 20%+ in 3m':>16}")
    for vd in ("exit", "protect", "hold", "buy"):
        L = res[(per, vd)]
        if not L:
            continue
        a = sorted(x[0] for x in L)
        print(f"{vd:8} {len(L):7d} {sum(a)/len(a):+10.2f}% {a[len(a)//2]:+7.2f}% {sum(x[1] for x in L)/len(L):+10.2f}% {sum(x[2] for x in L)/len(L)*100:15.1f}%")
