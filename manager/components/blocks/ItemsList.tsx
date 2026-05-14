'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Item {
  text: string;
}

export function ItemsList({
  items,
  onChange,
  placeholder,
}: {
  items: Item[];
  onChange: (next: Item[]) => void;
  placeholder?: string;
}) {
  function update(idx: number, patch: Partial<Item>) {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }
  function add() {
    onChange([...items, { text: '' }]);
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <Input
            value={item.text}
            onChange={(e) => update(idx, { text: e.target.value })}
            placeholder={placeholder ?? 'Point…'}
            className="h-8 flex-1 text-xs"
          />
          <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} title="Monter">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => move(idx, 1)}
            disabled={idx === items.length - 1}
            title="Descendre"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => remove(idx)} title="Supprimer">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" />
        Ajouter un point
      </Button>
    </div>
  );
}
