'use client';

import { ChevronDown, FolderInput } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { summarizeBlock } from '@/lib/blockSummary';

export type MoveDestField = 'children' | 'then' | 'else';

interface ContainerBlock {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  order: number;
}

interface Props {
  /** Id of the block that would be moved. Excluded from the destination list. */
  sourceBlockId: string;
  /** All top-level blocks of the current chapter — we filter the eligible
   *  containers (card / toolContentSection / conditional) and skip the source. */
  allBlocks: ContainerBlock[];
  disabled?: boolean;
  /** Fired when the user picks a destination. The caller wires it to the
   *  `moveBlockIntoContainerAction` server action. */
  onMove: (destContainerId: string, destField: MoveDestField) => void | Promise<void>;
  /**
   * Fired as the user hovers / focuses each destination entry (and with `null`
   * on leave / menu close). The parent uses this to mirror the hover on the
   * matching row in the underlying list — so the user sees which block in
   * the chapter the entry is pointing at without having to read its summary.
   */
  onHoverDestination?: (destContainerId: string | null) => void;
}

/**
 * Dropdown shown in the chapter block row that lets the author send a block
 * inside another block's container payload (card.children,
 * toolContentSection.children, conditional.then / else). Plain menu — no DnD.
 *
 * Like `DuplicateBlockMenu`, it portals the popover to `document.body` so it
 * isn't clipped by the scrollable Card hosting the list, and re-anchors on
 * scroll/resize.
 */
export function MoveIntoBlockMenu({ sourceBlockId, allBlocks, disabled, onMove, onHoverDestination }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Compute the list of eligible destinations. Each container appears once
  // (twice for `conditional` — once per branch). We keep the chapter order
  // so the menu mirrors the visual list above.
  const destinations = useMemo(() => {
    type Dest = {
      containerId: string;
      containerType: string;
      containerSummary: string;
      field: MoveDestField;
      label: string;
    };
    const out: Dest[] = [];
    for (const b of allBlocks) {
      if (b.id === sourceBlockId) continue;
      const summary = summarizeBlock(b.type, b.payload);
      const typeLabel = (BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type;
      if (b.type === 'card' || b.type === 'toolContentSection') {
        out.push({
          containerId: b.id,
          containerType: b.type,
          containerSummary: summary,
          field: 'children',
          label: `${typeLabel} — ${summary}`,
        });
      } else if (b.type === 'conditional') {
        out.push({
          containerId: b.id,
          containerType: b.type,
          containerSummary: summary,
          field: 'then',
          label: `${typeLabel} — ${summary} · Alors`,
        });
        out.push({
          containerId: b.id,
          containerType: b.type,
          containerSummary: summary,
          field: 'else',
          label: `${typeLabel} — ${summary} · Sinon`,
        });
      }
    }
    return out;
  }, [allBlocks, sourceBlockId]);

  useLayoutEffect(() => {
    if (!open) return;
    function updateCoords() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Whenever the menu closes (via outside click, Escape, click on an item,
  // disabled toggle…), clear any lingering hover preview in the parent list.
  useEffect(() => {
    if (!open) onHoverDestination?.(null);
  }, [open, onHoverDestination]);

  const hasDestinations = destinations.length > 0;

  return (
    <div ref={triggerRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        title={hasDestinations ? 'Déplacer dans un autre bloc…' : 'Aucun bloc container dans ce chapitre'}
        disabled={disabled || !hasDestinations}
        onClick={() => setOpen((v) => !v)}
      >
        <FolderInput className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, right: coords.right }}
            className="border-border bg-surface z-50 min-w-[280px] overflow-hidden rounded-md border text-sm shadow-lg"
          >
            <div className="border-border text-muted-foreground border-b px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
              Déplacer dans…
            </div>
            <div
              className="max-h-72 overflow-y-auto"
              // Clear the hover preview when the cursor leaves the destination
              // list (e.g. moves to the warning banner below or out of the menu).
              onMouseLeave={() => onHoverDestination?.(null)}
            >
              {destinations.map((d) => (
                <button
                  key={`${d.containerId}-${d.field}`}
                  type="button"
                  className="hover:bg-muted/60 block w-full px-3 py-2 text-left"
                  onClick={() => {
                    setOpen(false);
                    onHoverDestination?.(null);
                    void onMove(d.containerId, d.field);
                  }}
                  onMouseEnter={() => onHoverDestination?.(d.containerId)}
                  onFocus={() => onHoverDestination?.(d.containerId)}
                  title={`${d.containerType}${d.field !== 'children' ? ` · ${d.field}` : ''}`}
                >
                  <span className="truncate">{d.label}</span>
                </button>
              ))}
            </div>
            <div className="border-border text-muted-foreground border-t px-3 py-1.5 text-[10px]">
              ⚠️ Les tags de maintenance de ce bloc seront perdus pendant le déplacement.
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
