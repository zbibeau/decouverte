'use client';

import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  /** Name of the hidden input that server actions read via FormData. */
  name: string;
  /** Initial mapping (from DB). */
  initial?: Record<string, unknown>;
  /**
   * When provided, keys are locked to this list (variable is enum/boolean)
   * and the user can only edit the Hubspot labels. Rows are pre-filled with
   * existing initial[k] values when available.
   */
  lockedKeys?: string[];
}

/**
 * Edits a flat `Record<string,string>` mapping as dynamic key/value rows.
 * Output shape (hidden input) is a JSON object so server actions keep their
 * FormData contract unchanged.
 *
 * When `lockedKeys` is set, the key column is disabled and the row set is
 * fixed — this mirrors enum/boolean variables where the key space is already
 * known from the variable definition.
 */
export function ValueMapInput({ name, initial = {}, lockedKeys }: Props) {
  // Keep an ordered pair list for stable rendering; serialise as object on submit.
  const initialRows = useMemo<Array<[string, string]>>(() => {
    if (lockedKeys) {
      return lockedKeys.map((k) => [k, String(initial?.[k] ?? '')]);
    }
    return Object.entries(initial ?? {}).map(
      ([k, v]) => [k, v == null ? '' : String(v)] as [string, string],
    );
  }, [initial, lockedKeys]);

  const [rows, setRows] = useState<Array<[string, string]>>(initialRows);

  function updateKey(i: number, k: string) {
    setRows((rs) => rs.map((r, j) => (j === i ? [k, r[1]] : r)));
  }
  function updateValue(i: number, v: string) {
    setRows((rs) => rs.map((r, j) => (j === i ? [r[0], v] : r)));
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }
  function add() {
    setRows((rs) => [...rs, ['', '']]);
  }

  const serialised = JSON.stringify(
    Object.fromEntries(rows.filter(([k]) => k.length > 0)),
  );

  const isLocked = Boolean(lockedKeys);

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map(([k, v], i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="clé variable"
                value={k}
                disabled={isLocked}
                onChange={(e) => updateKey(i, e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="label Hubspot"
                value={v}
                onChange={(e) => updateValue(i, e.target.value)}
                className="h-8 text-xs"
              />
              {!isLocked && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  title="Supprimer cette correspondance"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {!isLocked && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter
        </Button>
      )}
      <input type="hidden" name={name} value={serialised} />
    </div>
  );
}
