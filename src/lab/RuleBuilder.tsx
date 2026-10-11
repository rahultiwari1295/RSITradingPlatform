import { Plus, X } from 'lucide-react';
import type { Catalog, Condition } from './types';
import { PRESETS, validCond } from './rules';

export function RuleBuilder({ cat, conds, onChange }: { cat: Catalog; conds: Condition[]; onChange: (c: Condition[]) => void }) {
  const set = (i: number, c: Condition) => onChange(conds.map((x, j) => (j === i ? c : x)));
  const groups = [...new Set(cat.features.map(f => f.group))];
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="chips" role="group" aria-label="Quick conditions">
        {PRESETS.map(p => <button key={p.label} className="chip" aria-pressed={false} onClick={() => conds.length < 12 && onChange([...conds, structuredClone(p.cond)])}>+ {p.label}</button>)}
      </div>
      {conds.map((c, i) => {
        const between = c.op === 'between', rhsField = c.r?.f != null;
        return (
          <div className="cond" key={i}>
            <select className="sel" aria-label="Field" value={c.l.f} onChange={e => set(i, { ...c, l: { f: e.target.value } })}>
              {groups.map(g => <optgroup key={g} label={g}>{cat.features.filter(f => f.group === g).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>)}
            </select>
            <select className="sel" aria-label="Condition" value={c.op} onChange={e => set(i, { ...c, op: e.target.value, r: e.target.value === 'between' ? { list: [0, 100] } : c.r?.list ? { c: 0 } : c.r })}>
              {cat.operators.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
            </select>
            {between ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1].map(k => <input key={k} className="inp num" inputMode="decimal" aria-label={k ? 'Upper' : 'Lower'} value={c.r?.list?.[k] ?? ''} onChange={e => { const l = [...(c.r?.list ?? [0, 0])]; l[k] = e.target.value === '' ? NaN : Number(e.target.value); set(i, { ...c, r: { list: l } }); }} />)}
              </div>
            ) : rhsField ? (
              <select className="sel" aria-label="Compare to" value={c.r!.f} onChange={e => set(i, { ...c, r: e.target.value === '__num' ? { c: 0 } : { f: e.target.value } })}>
                {cat.features.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}<option value="__num">A number…</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="inp num" inputMode="decimal" aria-label="Value" value={Number.isNaN(c.r?.c) ? '' : c.r?.c ?? ''} onChange={e => set(i, { ...c, r: { c: e.target.value === '' ? NaN : Number(e.target.value) } })} />
                <button className="btn sm ghost" title="Compare to another field" onClick={() => set(i, { ...c, r: { f: 'sma_50' } })}>Field</button>
              </div>
            )}
            <button className="x" aria-label="Remove condition" onClick={() => onChange(conds.filter((_, j) => j !== i))}><X size={16} /></button>
          </div>
        );
      })}
      <div><button className="btn sm" disabled={conds.length >= 12} onClick={() => onChange([...conds, { l: { f: 'rsi_14' }, op: '>', r: { c: 50 } }])}><Plus /> Add condition</button>
        {conds.length > 0 && !conds.every(validCond) && <span className="mute" style={{ marginLeft: 10, fontSize: 12.5 }}>Fill in every value to run</span>}</div>
    </div>
  );
}
