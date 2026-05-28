'use client';

import { useState } from 'react';

import { FamilyIcon } from '@/lib/familyIcons';

/**
 * Client tab switcher for the library page. Renders 2 tab buttons +
 * 2 panels ; only the active panel is visible (`hidden` toggle, not
 * unmounted) so client state inside Tags admin survives a back-and-forth.
 *
 * Both children are passed as named props (`blocksPanel`, `tagsPanel`)
 * to keep the boundary clear : the parent (server component) renders
 * both panels eagerly and passes the React trees here.
 */
export function LibraryTabs({ blocksPanel, tagsPanel }: { blocksPanel: React.ReactNode; tagsPanel: React.ReactNode }) {
  const [active, setActive] = useState<'blocks' | 'tags'>('blocks');
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Sections de la bibliothèque" className="border-border flex gap-1 border-b">
        <TabButton
          active={active === 'blocks'}
          onClick={() => setActive('blocks')}
          icon={<FamilyIcon family="block" />}
          label="Blocs"
        />
        <TabButton
          active={active === 'tags'}
          onClick={() => setActive('tags')}
          icon={<FamilyIcon family="tag" />}
          label="Tags"
        />
      </div>

      <div role="tabpanel" hidden={active !== 'blocks'}>
        {blocksPanel}
      </div>
      <div role="tabpanel" hidden={active !== 'tags'}>
        {tagsPanel}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
