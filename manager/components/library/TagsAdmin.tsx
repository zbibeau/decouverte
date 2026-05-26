'use client';

import { Check, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/Toaster';
import { createTag, deleteTag, loadAllTags, renameTag, setTagColor } from '@/lib/tags';
import { TAG_COLOR_CLASSES, TAG_COLOR_HEX, TAG_COLORS, type Tag, type TagColor } from '@/lib/tagColors';

/**
 * Tag administration UI rendered inside the "Tags" tab of the library
 * page. Lists every maintenance tag in the app and lets the editor :
 *   - Create a new tag from a label + color
 *   - Rename a tag (label only — slug stays canonical lowercase)
 *   - Change a tag's color via the 8-color palette popover
 *   - Delete a tag (with confirm) — `block_tag` rows cascade away
 *
 * All mutations call `lib/tags.ts` server actions directly. No
 * draft/publish cycle — tags are a maintenance index, persisted
 * immediately.
 */
export function TagsAdmin() {
  const toast = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState<TagColor>('amber');
  const [creating, setCreating] = useState(false);
  /** Tag whose label is being edited inline. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadAllTags()
      .then((t) => {
        if (!cancelled) setTags(t);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    const t = await loadAllTags();
    setTags(t);
  }

  async function handleCreate() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await createTag(trimmed, newColor);
      setNewLabel('');
      setNewColor('amber');
      await refresh();
      toast.success(`Tag « ${trimmed} » créé.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id: string) {
    const trimmed = editingLabel.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const original = tags.find((t) => t.id === id);
    if (original && trimmed === original.label) {
      setEditingId(null);
      return;
    }
    try {
      await renameTag(id, trimmed);
      await refresh();
      toast.success(`Tag renommé en « ${trimmed} ».`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEditingId(null);
    }
  }

  async function handleColor(id: string, color: TagColor) {
    // Optimistic update so the popover feels instant.
    const previous = tags.find((t) => t.id === id)?.color;
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
    try {
      await setTagColor(id, color);
      // Only surface a toast when the color actually changes — clicking
      // the already-selected color is a no-op and shouldn't spam.
      if (previous !== color) {
        toast.success(`Couleur mise à jour.`);
      }
    } catch (e) {
      toast.error((e as Error).message);
      await refresh();
    }
  }

  async function handleDelete(id: string, label: string) {
    if (
      !window.confirm(
        `Supprimer définitivement le tag « ${label} » ? Toutes ses associations avec des blocs seront retirées.`,
      )
    ) {
      return;
    }
    try {
      await deleteTag(id);
      await refresh();
      toast.success(`Tag « ${label} » supprimé.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-border bg-muted/20 rounded-md border p-3">
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Nouveau tag</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
            }}
            placeholder="Ex. : fiche patient"
            className="h-8 min-w-[200px] flex-1"
          />
          <ColorPickerPopover value={newColor} onChange={setNewColor} ariaLabel="Couleur du nouveau tag" />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={creating || !newLabel.trim()}
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Créer'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 px-3 py-6 text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Chargement des tags…
        </div>
      ) : tags.length === 0 ? (
        <p className="text-muted-foreground px-3 py-6 text-center text-sm italic">
          Aucun tag pour l&apos;instant. Crée-en un ci-dessus pour démarrer ta nomenclature.
        </p>
      ) : (
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-border bg-muted/30 text-muted-foreground border-b text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Tag</th>
                <th className="px-3 py-2 text-left font-medium">Slug</th>
                <th className="px-3 py-2 text-left font-medium">Couleur</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => {
                const cls = TAG_COLOR_CLASSES[tag.color];
                const isEditing = editingId === tag.id;
                return (
                  <tr key={tag.id} className="border-border border-b last:border-0">
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleRename(tag.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="h-7"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleRename(tag.id)}
                            title="Valider"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls.bg} ${cls.fg}`}
                        >
                          <span>🏷</span>
                          <span>{tag.label}</span>
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 font-mono text-xs">{tag.slug}</td>
                    <td className="px-3 py-2">
                      <ColorPickerPopover
                        value={tag.color}
                        onChange={(c) => void handleColor(tag.id, c)}
                        ariaLabel={`Couleur du tag ${tag.label}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(tag.id);
                            setEditingLabel(tag.label);
                          }}
                          title="Renommer"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDelete(tag.id, tag.label)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Color picker popover — bulletproof version using inline styles with
 * raw hex values (see `TAG_COLOR_HEX`). Bypasses Tailwind's JIT
 * entirely, so the swatches are guaranteed to render regardless of
 * how the bundler scans dynamic classNames.
 *
 * Layout :
 *   - Trigger : a labeled chip with color preview + color name (so the
 *     picker is usable even if styles fail to load).
 *   - Popover : 2-column list with full color name + preview ;
 *     selected row gets a check mark + bold name.
 *
 * Click outside or pick a color → closes.
 */
function ColorPickerPopover({
  value,
  onChange,
  ariaLabel,
}: {
  value: TagColor;
  onChange: (c: TagColor) => void;
  /** Accessible name for the trigger button (e.g. "Couleur du tag fiche patient"). */
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  /** Trigger's bounding rect, captured the moment the popover opens
   *  so the portal can place the dropdown exactly under it. */
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function openPopover() {
    const rect = triggerRef.current?.getBoundingClientRect() ?? null;
    setTriggerRect(rect);
    setOpen(true);
  }

  function closePopover() {
    setOpen(false);
    setTriggerRect(null);
  }

  // Close on outside click (mousedown). Checks BOTH the trigger and
  // the popover (rendered in a portal, so it's NOT a DOM child of the
  // trigger's wrapper).
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      closePopover();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Close on scroll or window resize — the popover's fixed position
  // would otherwise stay anchored to a now-stale rect. Cheaper than
  // recomputing on every scroll tick.
  useEffect(() => {
    if (!open) return;
    function onClose() {
      closePopover();
    }
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open]);

  const current = TAG_COLOR_HEX[value];

  // Compute popover position from the trigger rect. Anchored to the
  // viewport (`position: fixed`) so any ancestor `overflow: hidden`
  // can't clip it.
  const popoverStyle: React.CSSProperties | null = triggerRect
    ? {
        position: 'fixed',
        top: triggerRect.bottom + 4,
        left: triggerRect.left,
        zIndex: 9999,
      }
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel ?? `Couleur ${current.label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closePopover() : openPopover())}
        title="Cliquer pour changer la couleur"
        className="border-border inline-flex items-center gap-2 rounded-md border bg-white px-2 py-1 text-xs font-medium shadow-sm transition hover:shadow-md"
      >
        <span
          className="inline-block h-4 w-4 rounded-full border border-black/10"
          style={{ backgroundColor: current.dot }}
          aria-hidden="true"
        />
        <span>{current.label}</span>
        <span className="text-muted-foreground" aria-hidden="true">
          ▾
        </span>
      </button>
      {open &&
        popoverStyle &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choisir une couleur"
            style={popoverStyle}
            className="border-border min-w-[160px] rounded-lg border bg-white p-1 shadow-lg"
          >
            {TAG_COLORS.map((c) => {
              const hex = TAG_COLOR_HEX[c];
              const selected = c === value;
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={`Couleur ${hex.label}`}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(c);
                    closePopover();
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                    selected ? 'bg-primary/10 font-semibold' : 'hover:bg-muted'
                  }`}
                >
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: hex.dot }}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{hex.label}</span>
                  {selected && <Check className="text-primary h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
