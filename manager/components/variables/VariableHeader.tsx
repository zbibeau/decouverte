'use client';

import { Check, Pencil, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUnsavedChangesWarning } from '@/lib/useUnsavedChangesWarning';

interface Props {
  variableId: string;
  initialKey: string;
  initialLabel: string;
  type: string;
  enumPreview: string;
  /** Server action — rename the variable's technical key + label. */
  renameAction: (variableId: string, nextKey: string, nextLabel: string) => Promise<void>;
}

/**
 * Header row of an existing variable in the variables list. Shows
 * `key — label [type]` by default and switches to two editable inputs on
 * pencil click. Surfaces a confirm prompt before saving because renaming
 * the key may break references in block payloads (the manager doesn't
 * auto-migrate them).
 */
export function VariableHeader({ variableId, initialKey, initialLabel, type, enumPreview, renameAction }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [keyInput, setKeyInput] = useState(initialKey);
  const [labelInput, setLabelInput] = useState(initialLabel);
  const [isPending, startTransition] = useTransition();

  // Warn on tab-close / refresh while the rename form is open AND a field
  // actually changed (no false positive on merely opening the editor).
  useUnsavedChangesWarning(editing && (keyInput.trim() !== initialKey || labelInput.trim() !== initialLabel));

  function startEdit() {
    setKeyInput(initialKey);
    setLabelInput(initialLabel);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
  }
  async function commit() {
    const nextKey = keyInput.trim();
    const nextLabel = labelInput.trim();
    if (!nextKey || !nextLabel) {
      toast.error('Clé et label requis.');
      return;
    }
    const keyChanged = nextKey !== initialKey;
    if (keyChanged) {
      const ok = await confirm({
        title: `Renommer « ${initialKey} » → « ${nextKey} » ?`,
        message:
          "Les blocs qui référencent l'ancienne clé (conditions, formulaires, key points conditionnels, mapping Hubspot…) NE seront PAS mis à jour automatiquement. Tu devras corriger ces références manuellement après le renommage.",
        confirmLabel: 'Renommer',
        destructive: true,
      });
      if (!ok) return;
    }
    startTransition(async () => {
      try {
        await renameAction(variableId, nextKey, nextLabel);
        toast.success(
          keyChanged
            ? `Variable renommée : « ${initialKey} » → « ${nextKey} ».`
            : `Label mis à jour : « ${nextLabel} ».`,
        );
        setEditing(false);
      } catch (err) {
        toast.error(`Renommage échoué : ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  if (!editing) {
    return (
      <>
        <code className="text-sm font-medium">{initialKey}</code>
        <span className="text-muted-foreground text-sm">— {initialLabel}</span>
        <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded px-2 text-[10px] font-medium uppercase tracking-wide">
          {type}
        </span>
        {type === 'enum' && enumPreview && <span className="text-muted-foreground ml-2 text-xs">{enumPreview}</span>}
        <Button variant="ghost" size="sm" onClick={startEdit} title="Renommer (clé + label)">
          <Pencil className="size-3.5" />
        </Button>
      </>
    );
  }

  return (
    <>
      <Input
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        placeholder="cleTechnique"
        className="h-8 w-40 font-mono text-xs"
      />
      <Input
        value={labelInput}
        onChange={(e) => setLabelInput(e.target.value)}
        placeholder="Label visible"
        className="h-8 flex-1 text-xs"
      />
      <span className="bg-muted text-muted-foreground inline-flex h-5 items-center rounded px-2 text-[10px] font-medium uppercase tracking-wide">
        {type}
      </span>
      <Button variant="ghost" size="sm" onClick={commit} disabled={isPending} title="Enregistrer">
        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      </Button>
      <Button variant="ghost" size="sm" onClick={cancel} disabled={isPending} title="Annuler">
        <X className="size-3.5" />
      </Button>
    </>
  );
}
