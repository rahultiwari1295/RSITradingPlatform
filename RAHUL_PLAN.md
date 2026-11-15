# /rahul — plan, version 2

15 Nov 2026. Nothing here is built yet. The full coding detail is in `RAHUL_IMPLEMENTATION_SPEC.md`.

## What the tests decided

| Idea | Result | In the plan? |
|---|---|---|
| Most profit comes from about 1 call in 10 | Holds | Yes: show every call, track skipped calls |
| Follow the AI exit | Holds (stocks did nothing after exits) | Yes |
| Do not buy an open call that is below its entry | Holds in both periods (27% and 30% won) | Yes |
| Grades or a gate by call type | Failed the blind test (C beat A afterwards) | No |
| "Already ran" calls are bad | Weak; they still won 47–60% | Label only |
| Sell early if below entry; move stop to entry | No gain | No |
| Patterns page predicts calls | 0 of 213 "near" rows became a call in 14 days (7 weeks of history) | Moved under More |
| Market gauge sizes | Not blind-tested | Shown as information only |

## Your decisions

- Every call is shown. No cash limit.
- News is the home page.
- Trade-book import for the follow tracker.
- No coding until you say so.

## Phases

| Release | Phase | What you get | Needs from you |
|---|---|---|---|
| A | 0 | Fake-data test set-up (not visible on the site) | — |
| A | 1 | News as home with a "2 to sell · 3 new calls" strip; tabs News, Calls, Portfolio, More; no big headlines | — |
| A | 2 | Calls page: Sell card, then "Buy today", "Still open to buy", "Below entry"; Buy buttons on the cards | — |
| B | 3 | "Did you follow the AI" tracker, with import of your broker trade-book file | One export file from each broker; approve deploy, 2 tables, 1 cron job |
| B | 4 | Portfolio header (AI part vs non-AI part) and clean-up list for non-AI holdings | — |
| C | 5 | Live-only track record, call-type table (information), real fill prices | Approve deploy and 1 cron job |
| C | 6 | Weekly report | Approve 1 cron job; private Telegram chat if you want it sent |
| C | 7 | Fixes: SILVERBEES price, phantom activity rows, four others | — |
| D | 8 | Buy several calls with one trade code | Blocked until you place one order and one stop-loss yourself |

## Known limits

- The clean-up groups in phase 4 are my judgement, not a tested rule. The page will say so.
- Broker trade-book and stop-loss requests are written from memory of the brokers' formats and must be checked against their documentation.
- The trade-book file column names are a starting list. The importer needs one real file from each broker to be tested.
- The Patterns finding rests on 7 weeks of history.
