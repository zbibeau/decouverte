'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Option = { value: string; label: string };

interface Props {
  /** Name of the hidden input that server actions read via FormData. */
  name: string;
  /** Initial rows (from DB). */
  initial?: Option[];
}

/**
 * Edits a list of `{value, label}` options as dynamic rows. Renders a hidden
 * input (JSON-serialised) so existing server actions (`createVariable`,
 * `updateVariableOptions`) keep their FormData contract unchanged.
 */
export function OptionsListInput({ name, initial = [] }: Props) {
  const [rows, setRows] = useState<Option[]>(initial);

  function update(i: number, patch: Partial<Option>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }
  function add() {
    setRows((rs) => [...rs, { value: '', label: '' }]);
  }

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="value (ex: small)"
                value={r.value}
                onChange={(e) => update(i, { value: e.target.value })}
                className="h-8 text-xs"
              />
              <Input
                placeholder="label affiché (ex: Petit)"
                value={r.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(i)}
                title="Supprimer cette option"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une option
      </Button>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
    </div>
  );
}
