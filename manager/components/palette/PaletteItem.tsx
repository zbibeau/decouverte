'use client';

import { Command } from 'cmdk';
import type { ReactNode } from 'react';

/**
 * Standardised row inside the command palette: icon · label · subtle
 * right-aligned hint. Disabled rows look greyed out and don't fire
 * `onSelect`.
 *
 * Centralises the visual contract so every section (Add actions,
 * Chapters, Blocs, Variables, Parcours) renders consistently.
 */
export function PaletteItem({
  icon,
  label,
  hint,
  value,
  keywords,
  disabled,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  value: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      disabled={disabled}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-primary/10 data-[disabled=true]:opacity-40"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {hint && (
        <span className="ml-2 shrink-0 truncate text-[10px] text-muted-foreground">
          {hint}
        </span>
      )}
    </Command.Item>
  );
}
