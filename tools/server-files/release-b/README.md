# Release B server files (not yet deployed)

- `owner_follow.py` -> `/root/quantsync/scripts/owner_follow.py` (new)
- `owner_edge.py`   -> `/root/quantsync/api/owner_edge.py` (the existing file plus two endpoints: `POST /api/owner/fills/import`, `GET /api/owner/follow`)
- New tables in `Data/owner.db`: `fills` (created by the import endpoint or the script), `follow` (created by the script)
- New cron line: `20 20 * * 1-5 cd /root/quantsync && timeout 120 venv/bin/python3 scripts/owner_follow.py run >> logs/owner_follow.log 2>&1`

Deploy order: back up, upload both files, `python3 -m py_compile`, restart `quantsync-api`, run the script once, then push the app.
