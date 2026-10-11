import { Plus, Trash2, FolderPlus } from 'lucide-react';
import type { Catalog, Condition } from './types';
import { isGroup, newCond, type Group, type Mode, type Node } from './rules';

const MAX_CONDS = 12;

function FieldSelect({ cat, value, onChange, label, withNumber }: { cat: Catalog; value: string; onChange: (v: string) => void; label: string; withNumber?: boolean }) {
  const groups = [...new Set(cat.features.map(f => f.group))];
  return (
    <select className="sel" aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
      {withNumber && <option value="__num">A number…</option>}
      {groups.map(g => <optgroup key={g} label={g}>{cat.features.filter(f => f.group === g).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>)}
    </select>
  );
}

function CondRow({ cat, c, onChange, onRemove }: { cat: Catalog; c: Condition; onChange: (c: Condition) => void; onRemove: () => void }) {
  const noRhs = c.op === 'is_true', between = c.op === 'between', rhsField = c.r?.f != null;
  const feat = cat.features.find(f => f.key === c.l.f);
  const ops = cat.operators.filter(o => feat?.kind === 'bool' ? ['is_true', '==', '!='].includes(o.op) : o.op !== 'is_true');
  const setOp = (op: string) => onChange({ ...c, op, r: op === 'is_true' ? undefined : op === 'between' ? { list: [0, 100] } : c.r?.list || !c.r ? { c: 0 } : c.r });
  return (
    <div className="cond">
      <div className="cond-main">
        <FieldSelect cat={cat} label="Indicator" value={c.l.f!} onChange={v => {
          const bool = cat.features.find(f => f.key === v)?.kind === 'bool';
          onChange({ ...c, l: { f: v }, ...(bool ? { op: 'is_true', r: undefined } : c.op === 'is_true' ? { op: '>', r: { c: 0 } } : {}) });
        }} />
        <select className="sel" aria-label="Condition" value={c.op} onChange={e => setOp(e.target.value)}>
          {ops.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
        </select>
        {!noRhs && (between ? (
          <div className="pair">
            {[0, 1].map(k => <input key={k} className="inp num" inputMode="decimal" aria-label={k ? 'Upper' : 'Lower'} value={c.r?.list?.[k] ?? ''}
              onChange={e => { const l = [...(c.r?.list ?? [0, 0])]; l[k] = e.target.value === '' ? NaN : Number(e.target.value); onChange({ ...c, r: { list: l } }); }} />)}
          </div>
        ) : rhsField
          ? <FieldSelect cat={cat} label="Compare to" value={c.r!.f!} onChange={v => onChange({ ...c, r: { f: v } })} />
          : <input className="inp num" inputMode="decimal" aria-label="Value" value={Number.isNaN(c.r?.c) ? '' : c.r?.c ?? ''}
            onChange={e => onChange({ ...c, r: { c: e.target.value === '' ? NaN : Number(e.target.value) } })} />)}
        {!noRhs && !between && (
          <button className="swap" onClick={() => onChange({ ...c, r: rhsField ? { c: 0 } : { f: c.l.f === 'close' ? 'sma_50' : 'close' } })}>
            {rhsField ? 'Use a number instead' : 'Compare with another indicator instead'}
          </button>)}
      </div>
      <button className="x" aria-label="Remove condition" onClick={onRemove}><Trash2 size={16} /></button>
    </div>
  );
}

const MODES: { v: Mode; label: string }[] = [{ v: 'all', label: 'All' }, { v: 'any', label: 'Any' }];

export function GroupEditor({ cat, g, onChange, onRemove, depth = 0, used }: {
  cat: Catalog; g: Group; onChange: (g: Group) => void; onRemove?: () => void; depth?: number; used: number;
}) {
  const set = (i: number, n: Node) => onChange({ ...g, items: g.items.map((x, j) => (j === i ? n : x)) });
  const del = (i: number) => onChange({ ...g, items: g.items.filter((_, j) => j !== i) });
  const connector = g.mode === 'all' ? 'AND' : 'OR';
  return (
    <div className={`grp${depth ? ' nested' : ''}`}>
      <div className="grp-h">
        <span className="grp-t">Match</span>
        <div className="seg sm" role="group" aria-label="Match all or any">
          {MODES.map(m => <button key={m.v} aria-pressed={g.mode === m.v} onClick={() => onChange({ ...g, mode: m.v })}>{m.label}</button>)}
        </div>
        <span className="grp-t">of these</span>
        {onRemove && <button className="x" aria-label="Remove group" onClick={onRemove}><Trash2 size={16} /></button>}
      </div>
      <div className="grp-b">
        {g.items.map((n, i) => (
          <div key={i}>
            {i > 0 && <div className="and"><span>{connector}</span></div>}
            {isGroup(n)
              ? <GroupEditor cat={cat} g={n} depth={depth + 1} used={used} onChange={x => set(i, x)} onRemove={() => del(i)} />
              : <CondRow cat={cat} c={n} onChange={x => set(i, x)} onRemove={() => del(i)} />}
          </div>
        ))}
        {g.items.length === 0 && <p className="mute" style={{ fontSize: 13, margin: 0 }}>No conditions yet. Add one below.</p>}
      </div>
      <div className="grp-f">
        <button className="btn sm" disabled={used >= MAX_CONDS} onClick={() => onChange({ ...g, items: [...g.items, newCond()] })}><Plus /> Condition</button>
        {depth < 2 && <button className="btn sm ghost" disabled={used >= MAX_CONDS} onClick={() => onChange({ ...g, items: [...g.items, { mode: g.mode === 'all' ? 'any' : 'all', items: [newCond()] }] })}><FolderPlus /> Group</button>}
      </div>
    </div>
  );
}
