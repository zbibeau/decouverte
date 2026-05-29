'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import type { NavbarVariantMeta } from './editor-types';
import { useNavbarVariantCreate } from './NavbarVariantCreateContext';

interface Props {
  value: string | undefined;
  onChange: (key: string | undefined) => void;
  variants?: NavbarVariantMeta[];
}

/** Sentinel option value that switches the picker into "create" mode. */
const NEW_SENTINEL = '__new__';

/**
 * Navbar-variant picker fed from `parcours.navbar_variants`. When an editor
 * host exposes a create callback (via NavbarVariantCreateContext), the dropdown
 * gains a « + Nouvelle navbar… » option that swaps to an inline name input —
 * same gesture as the chapter SectionPicker — creating + selecting the variant
 * without leaving the block. Without that context (isolated / library preview)
 * it stays a plain select.
 */
export function NavbarVariantSelect({ value, onChange, variants }: Props) {
  const onCreate = useNavbarVariantCreate();
  // Just-created variants, shown optimistically until the server refresh
  // re-flows the canonical `variants` prop. Merged + deduped by key below.
  const [extra, setExtra] = useState<NavbarVariantMeta[]>([]);
  const [mode, setMode] = useState<'select' | 'custom'>('select');
  const [draftName, setDraftName] = useState('');
  const [creating, setCreating] = useState(false);

  const byKey = new Map<string, NavbarVariantMeta>();
  for (const v of variants ?? []) byKey.set(v.key, v);
  for (const v of extra) if (!byKey.has(v.key)) byKey.set(v.key, v);
  const merged = [...byKey.values()];
  const currentMissing = !!value && !merged.some((v) => v.key === value);

  async function confirmCreate() {
    const title = draftName.trim();
    if (!title || !onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(title);
      setExtra((prev) => (prev.some((v) => v.key === created.key) ? prev : [...prev, created]));
      onChange(created.key);
      setDraftName('');
      setMode('select');
    } catch (e) {
      console.error('[NavbarVariantSelect] create failed', e);
    } finally {
      setCreating(false);
    }
  }

  if (mode === 'custom') {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void confirmCreate();
            } else if (e.key === 'Escape') {
              setDraftName('');
              setMode('select');
            }
          }}
          placeholder="Nom de la nouvelle navbar"
          className="h-9 flex-1 text-sm"
          disabled={creating}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void confirmCreate()}
          disabled={!draftName.trim() || creating}
          title="Créer la navbar"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraftName('');
            setMode('select');
          }}
          disabled={creating}
          title="Annuler"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <select
        className="border-border h-9 rounded-md border bg-white px-3 text-sm"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === NEW_SENTINEL) {
            setDraftName('');
            setMode('custom');
            return;
          }
          onChange(v || undefined);
        }}
      >
        <option value="">(aucune)</option>
        {merged.map((v) => (
          <option key={v.key} value={v.key}>
            {v.title} ({v.key})
          </option>
        ))}
        {currentMissing && <option value={value}>{value} — variant inconnu, à vérifier</option>}
        {onCreate && (
          <>
            <option disabled>──────────</option>
            <option value={NEW_SENTINEL}>+ Nouvelle navbar…</option>
          </>
        )}
      </select>
      {merged.length === 0 && !onCreate && (
        <p className="text-muted-foreground text-[10px]">
          Aucun variant défini pour ce parcours. Crée-en un dans l&apos;onglet « Navbars ».
        </p>
      )}
    </div>
  );
}
