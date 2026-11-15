#!/bin/sh
# Copy public/ to a temp folder and patch ONLY the copy so every owner screen works with invented data.
# Nothing under public/ is changed. Run again after each edit to refresh the copy.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../../public"
OUT="${1:-${TMPDIR:-/tmp}/rahul-preview}"
OUT="${OUT%/}"
mkdir -p "$OUT"
rsync -a --delete "$SRC/" "$OUT/"
cp "$HERE/sample_owner.json" "$OUT/sample_owner.json"
python3 - "$OUT" "$HERE" <<'PY'
import sys
out, here = sys.argv[1], sys.argv[2]
p = out + "/rahul/core.js"
s = open(p).read()
a = "export const isOwner = () => String(auth.user?.email || '').toLowerCase() === OWNER;"
assert a in s, "isOwner line not found"
s = s.replace(a, "export const isOwner = () => true; /* PREVIEW ONLY */")
i = s.index("export async function ownerApi(path) {")
j = s.index("let ownedP = null, ownedT = 0;")
s = s[:i] + open(here + "/mock_api.js").read() + "\n" + s[j:]
open(p, "w").write(s)
PY
echo "Preview copy ready in $OUT"
echo "Start it with: python3 $HERE/serve.py $OUT"
