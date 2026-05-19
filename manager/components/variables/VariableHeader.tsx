'use client';

import { Check, Pencil, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Props {
  variableId: string;
  initialKey: string;
  initialLabel: string;
  type: string;
  enumPreview: string;
  /** Server action — rename the variable's technical key + label. */
  renameAction: (
    variableId: string,
    nextKey: string,
    nextLabel: string,
  ) => Promise<void>;
}

/**
 * Header row of an existing variable in the variables list. Shows
 * `key — label [type]` by default and switches to two editable inputs on
 * pencil click. Surfaces a confirm prompt before saving because renaming
 * the key may break references in block payloads (the manager doesn't
 * auto-migrate them).
 */
export function VariableHeader({
  variableId,
  initialKey,
  initialLabel,
  type,
  enumPreview,
  renameAction,
}: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [keyInput, setKeyInput] = useState(initialKey);
  const [labelInput, setLabelInput] = useState(initialLabel);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setKeyInput(initialKey);
    setLabelInput(initialLabel);
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
  }
  function commit() {
    const nextKey = keyInput.trim();
    const nextLabel = labelInput.trim();
    if (!nextKey || !nextLabel) {
      toast.error('Clé et label requis.');
      return;
    }
    const keyChanged = nextKey !== initialKey;
    if (
      keyChanged &&
      !window.confirm(
        `Renommer la clé « ${initialKey} » → « ${nextKey} » ?\n\n` +
          `⚠ Les blocs qui référencent l'ancienne clé (conditions, formulaires, ` +
          `key points conditionnels, mapping Hubspot…) NE seront PAS mis à jour ` +
          `automatiquement. Tu devras corriger ces références manuellement après ` +
          `le renommage.`,
      )
    ) {
      return;
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
        toast.error(
          `Renommage échoué : ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  }

  if (!editing) {
    return (
      <>
        <code className="text-sm font-medium">{initialKey}</code>
        <span className="text-sm text-muted-foreground">— {initialLabel}</span>
        <span className="inline-flex h-5 items-center rounded bg-muted px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {type}
        </span>
        {type === 'enum' && enumPreview && (
          <span className="ml-2 text-xs text-muted-foreground">
            {enumPreview}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={startEdit}
          title="Renommer (clé + label)"
        >
          <Pencil className="h-3.5 w-3.5" />
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
      <span className="inline-flex h-5 items-center rounded bg-muted px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {type}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={commit}
        disabled={isPending}
        title="Enregistrer"
      >
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={cancel}
        disabled={isPending}
        title="Annuler"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
