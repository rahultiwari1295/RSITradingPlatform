import type { ReactNode } from 'react';
import { Empty } from '../ui';

export function EmptyOrRows<T>({ items, empty, render }: { items: T[]; empty: string; render: (t: T) => ReactNode }) {
  return <div className="rows">{items.length === 0 ? <Empty title={empty} /> : items.map(render)}</div>;
}
