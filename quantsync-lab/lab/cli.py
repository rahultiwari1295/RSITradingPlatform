"""python -m lab.cli cook|live|seed-flagship ..."""
from __future__ import annotations

import argparse
import json
import sys
import time

from . import db, service, store
from .config import load_config


def main(argv=None):
    ap = argparse.ArgumentParser(prog="qslab")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cook"); c.add_argument("--tf", choices=["1D", "1W", "all"], default="all")
    sub.add_parser("live")
    s = sub.add_parser("seed-flagship"); s.add_argument("name"); s.add_argument("--tf", default="1D"); s.add_argument("file", help="JSON with entry/exit")
    a = ap.parse_args(argv)
    cfg = load_config(); db.migrate(cfg)
    run = cfg.run_dir; run.mkdir(parents=True, exist_ok=True)
    if a.cmd == "cook":
        lock = run / "cook.lock"; lock.write_text(str(time.time()))
        try:
            for tf in (["1D", "1W"] if a.tf == "all" else [a.tf]):
                print(json.dumps(store.cook(cfg, tf)))
        finally:
            lock.unlink(missing_ok=True)
        con = db.connect(cfg); print("live rows:", service.update_live(cfg, con))
    elif a.cmd == "live":
        print("live rows:", service.update_live(cfg, db.connect(cfg)))
    else:
        d = json.load(open(a.file)); con = db.connect(cfg)
        print(service.create_strategy(con, cfg, None, a.name, a.tf, d["entry"], d.get("exit"), kind="flagship", visibility="public"))


if __name__ == "__main__":
    sys.exit(main())
