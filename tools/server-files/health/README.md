# Holding health (Portfolio → Health), deployed 15 Nov 2026

| File | On the server | What it does |
|---|---|---|
| owner_health.py | api/owner_health.py (mounted in server.py) | GET /api/owner/health, POST /api/owner/marks, GET /api/owner/gtt, POST /api/owner/gtt/place, POST /api/owner/gtt/cancel. Owner-only (404 otherwise); place and cancel need the trade code. |
| owner_gtt.py | scripts/owner_gtt.py | Cron 09:12, 12:12, 15:12 and 16:20 on weekdays: saves every broker's open GTTs and records an alert (Telegram if a chat id is set) for any GTT that would sell shares not held, or more than held. Never cancels anything. |
| blind_test.py, health_rules.py | research/health/ | The blind test of the verdict rules (read-only). |

Also changed: api/owner_edge.py, where the Angel GTT create path is now `/gtt-service/rest/secure/angelbroking/gtt/v1/createRule` (from the official SmartAPI Python SDK).
Backup before the change: backup/health_20261115_*.

Blind test (liquid NSE stocks, a verdict every 21 sessions, return against NIFTY500):

| Verdict | 6 months vs market, 2019-22 / 2023-26 | Fell 20%+ within 3 months |
|---|---|---|
| Exit | +2.7% / +1.9% | 26% / 25% |
| Protect | +2.8% / +3.2% | 22% / 21% |
| Hold | +7.7% / +4.5% | 22% / 22% |
| Buy-more zone | +6.0% / +4.9% | 19% / 18% |

Exit is weaker than Hold in both periods, but only modestly. Buy-more zones fell hard less often; their returns were about the same as Hold. A stricter exit rule (support broken and 10+ points behind the market) did not separate better. Delisted stocks are missing from the price list, which flatters the weak groups.

Not yet run against a real account: the GTT list, place and cancel calls for all three brokers.
