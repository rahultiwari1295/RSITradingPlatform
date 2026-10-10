# QuantSync demo: locked launch film

`locked/` holds the approved scroll-driven intro (hero, floating cards, DNA ring, honest odds, CTA).
It is approved by Rahul and must not change by accident.

- It runs inside its own shadow root with its own colour tokens, so app CSS cannot touch it and it cannot touch the app.
- `locked/MANIFEST.sha256` stores a hash of each file. `build.py` refuses to build if any locked file differs.
- To change the intro on purpose: edit `locked/*`, then run `python3 lock_intro.py`, then `python3 build.py`, and say so in the commit message.
- App work happens only in `src/` (`app.css`, `app.js`, `shell.html`, `head.html`).

Build: `python3 build.py` writes `index.html` (the single file published as the artifact).
