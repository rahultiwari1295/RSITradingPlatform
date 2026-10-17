/* Writes the ready-made screens as rule JSON for the server (quantsync-lab/lab/screens_def.json).
   Run after editing screens in public/app/js/sample.js:  node scripts/gen-screens-def.mjs <output.json> */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public/app/js');
globalThis.window = globalThis;
const { SCREENS } = await import(path.join(root, 'sample.js'));
const { parse } = await import(path.join(root, 'query.js'));
const { LOCAL_CATALOG } = await import(path.join(root, 'fields.js'));
const out = [], bad = [];
for (const s of SCREENS) {
  const q = parse(s.query, LOCAL_CATALOG);
  if (q.errors.length || !q.conds.length) { bad.push(s.id); continue; }
  out.push({ id: s.id, name: s.name, tf: s.tf, col: s.col, needs: s.needs || '', rule: { v: 1, [q.mode]: q.conds } });
}
fs.writeFileSync(process.argv[2] || 'screens_def.json', JSON.stringify(out));
console.log(out.length, 'screens written;', bad.length, 'skipped', bad);
