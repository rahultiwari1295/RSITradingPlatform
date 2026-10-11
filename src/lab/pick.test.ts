import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRows, exitGate, pickOptions } from './pick';
import type { Enhancement } from './types';

const st = (trades: number, wr: number, avg: number) => ({ trades, wins: Math.round(trades * wr / 100), losses: trades - Math.round(trades * wr / 100), win_rate: wr, avg_ret: avg });
const res = (gates: Record<string, ReturnType<typeof st>>, over: Partial<NonNullable<Enhancement['result']>> = {}): NonNullable<Enhancement['result']> => ({
  status: 'done', edge_found: true, plain: st(6580, 40.5, 0.4), drivers: [], leak: { passed: true },
  gates: Object.fromEntries(Object.entries(gates).map(([g, x]) => [g, { All: x, months: [], lift: 0, z: 0 }])) as never, ...over });

test('two options when a relaxed version keeps clearly more results', () => {
  const o = pickOptions(res({ '50': st(3000, 44, 0.9), '70': st(1200, 49, 1.4), '90': st(300, 55, 2.2) }));
  assert.deepEqual(o.map(x => [x.kind, x.gate]), [['quality', 90], ['volume', 50]]);
});
test('one winner when only one version beats the original', () => {
  const o = pickOptions(res({ '50': st(5000, 40.6, 0.5), '90': st(300, 55, 2.2) }));
  assert.deepEqual(o.map(x => [x.kind, x.gate]), [['winner', 90]]);
});
test('nothing offered when no clear edge, a failed leak check, too few results or no real lift', () => {
  assert.deepEqual(pickOptions(res({ '90': st(300, 55, 2.2) }, { edge_found: false })), []);
  assert.deepEqual(pickOptions(res({ '90': st(300, 55, 2.2) }, { leak: { passed: false } })), []);
  assert.deepEqual(pickOptions(res({ '90': st(12, 90, 5) })), []);
  assert.deepEqual(pickOptions(res({ '90': st(300, 40.9, 2) })), []);
  assert.deepEqual(pickOptions(res({ '90': st(300, 55, 0.2) })), []);
  assert.deepEqual(pickOptions(null), []);
});
test('before/after rows', () => {
  const rows = compareRows(st(6580, 40.5, 0.4), st(300, 55, 2.2));
  assert.deepEqual(rows.map(r => [r.label, r.before, r.after, r.better]), [
    ['Win rate', '40.5%', '55.0%', true], ['Average per result', '+0.40%', '+2.20%', true], ['Total results', '6,580', '300', null]]);
  assert.equal(compareRows(st(10, 60, -1), st(8, 50, -2))[0].better, false);
});
test('exit uses the gate in use, else the best option', () => {
  assert.equal(exitGate(70, [{ gate: 90, kind: 'winner', title: '', blurb: '' }]), 70);
  assert.equal(exitGate(null, [{ gate: 90, kind: 'winner', title: '', blurb: '' }]), 90);
  assert.equal(exitGate(null, []), null);
});
