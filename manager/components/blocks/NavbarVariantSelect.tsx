'use client';

import type { NavbarVariantMeta } from './editor-types';

interface Props {
  value: string | undefined;
  onChange: (key: string | undefined) => void;
  variants?: NavbarVariantMeta[];
}

/**
 * Drop-in replacement for the previous hardcoded
 *   <select>
 *     <option value="">(aucune)</option>
 *     <option value="appointment">appointment</option>
 *     <option value="contact">contact</option>
 *   </select>
 *
 * Now fed from `parcours.navbar_variants` (managed in /parcours/<slug>/navbars).
 * If the parcours hasn't registered any variant yet, the select renders only
 * the "(aucune)" option with a hint message.
 */
export function NavbarVariantSelect({ value, onChange, variants }: Props) {
  const list = variants ?? [];
  const currentMissing = !!value && !list.some((v) => v.key === value);
  return (
    <div className="space-y-1">
      <select
        className="h-9 rounded-md border border-border bg-white px-3 text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">(aucune)</option>
        {list.map((v) => (
          <option key={v.key} value={v.key}>
            {v.title} ({v.key})
          </option>
        ))}
        {currentMissing && (
          <option value={value}>
            {value} — variant inconnu, à vérifier
          </option>
        )}
      </select>
      {list.length === 0 && (
        <p className="text-[10px] text-muted-foreground">
          Aucun variant défini pour ce parcours. Crée-en un dans l'onglet
          « Navbars ».
        </p>
      )}
    </div>
  );
}
