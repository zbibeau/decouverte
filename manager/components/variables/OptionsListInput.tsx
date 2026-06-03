'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Option = { value: string; label: string };
/** Représentation interne — `id` strictement local au composant pour
 *  dnd-kit + keys React, jamais persisté. */
type Row = Option & { id: string };

interface Props {
  /** Name of the hidden input that server actions read via FormData. */
  name: string;
  /** Initial rows (from DB). */
  initial?: Option[];
  /**
   * Callback fired on every change (reorder, add, remove, value/label edit)
   * with the freshly serialised options. Used by `VariableOptionsForm` to
   * auto-save + toast — the component itself reste agnostique du transport.
   * Optionnel : si absent, l'éditeur reste « contrôlé en interne » et le
   * caller s'appuie sur le hidden input pour récupérer la valeur au submit.
   */
  onChange?: (next: Option[]) => void;
}

/**
 * Éditeur d'une liste d'options `{value, label}` avec :
 *  - Ajout d'une ligne via le CTA OU via Enter dans n'importe quel input
 *    de la dernière ligne (focus auto sur le nouveau champ « value »).
 *  - Réordonnancement via drag & drop (poignée GripVertical) — utilise
 *    dnd-kit avec sensors clavier inclus pour l'accessibilité.
 *  - Sérialisation finale en JSON (sans le `id` interne) dans un input
 *    caché pour rester compatible avec les server actions historiques
 *    (`createVariable`, `updateVariableOptions`).
 *
 * `id` interne est généré une seule fois par ligne (compteur incrémental
 * monté côté client). C'est strictement local : jamais envoyé au serveur
 * ni rendu visible — uniquement pour donner à dnd-kit / React des keys
 * stables qui survivent au reorder.
 */
export function OptionsListInput({ name, initial = [], onChange }: Props) {
  const idCounterRef = useRef(0);
  const nextId = useCallback(() => `opt-${++idCounterRef.current}`, []);

  const [rows, setRows] = useState<Row[]>(() => initial.map((o) => ({ ...o, id: nextId() })));

  // Notify le caller à chaque vraie modif. On strip le `id` interne (= local
  // uniquement, jamais persisté) — le caller reçoit la même shape qu'il a
  // injectée en `initial`. Skip le tout premier render via une ref pour
  // éviter un faux signal au mount (sinon le wrapper trigger un save de la
  // valeur initiale = identique à ce qui est déjà en DB, bruit pour rien).
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    onChange?.(rows.map(({ value, label }) => ({ value, label })));
  }, [rows, onChange]);
  // `pendingFocusId` : signal post-rendu pour focus le premier input de la
  // ligne qui vient d'être ajoutée (sinon `e.target.focus()` à l'intérieur
  // d'un event handler échoue car l'input n'existe pas encore dans le DOM).
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const valueInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  useEffect(() => {
    if (!pendingFocusId) return;
    valueInputRefs.current.get(pendingFocusId)?.focus();
    setPendingFocusId(null);
  }, [pendingFocusId]);

  // dnd-kit assigne des aria-describedby auto-incrémentés qui désynchronisent
  // SSR ↔ client. On rend en static list pendant l'hydratation, puis on
  // monte DndContext après. Pareil que `SortableList`.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  function update(id: string, patch: Partial<Option>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }
  function add() {
    const id = nextId();
    setRows((rs) => [...rs, { id, value: '', label: '' }]);
    setPendingFocusId(id);
  }
  function handleEnter(id: string) {
    // Enter sur n'importe quel input d'une ligne → ajoute une ligne en bas
    // SI on est sur la dernière ligne. Sinon avance simplement le focus
    // sur la ligne d'après (= bouge vers le bas dans le tableau).
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return;
    if (idx === rows.length - 1) {
      add();
    } else {
      const next = rows[idx + 1];
      valueInputRefs.current.get(next.id)?.focus();
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((rs) => {
      const oldIdx = rs.findIndex((r) => r.id === active.id);
      const newIdx = rs.findIndex((r) => r.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return rs;
      return arrayMove(rs, oldIdx, newIdx);
    });
  }

  /** Serialisation FormData — strip le `id` interne, garder uniquement
   *  `{value, label}` que le serveur attend. */
  const serialized = JSON.stringify(rows.map(({ value, label }) => ({ value, label })));

  return (
    <div className="space-y-2">
      {rows.length > 0 &&
        (mounted ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {rows.map((r) => (
                  <SortableOptionRow
                    key={r.id}
                    row={r}
                    onUpdate={(patch) => update(r.id, patch)}
                    onRemove={() => remove(r.id)}
                    onEnter={() => handleEnter(r.id)}
                    setValueInputRef={(el) => valueInputRefs.current.set(r.id, el)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          // Snapshot SSR-stable (pas de DndContext, donc pas de poignée).
          // L'hydratation va remplacer ça par la version interactive ci-dessus.
          <div className="space-y-2">
            {rows.map((r) => (
              <StaticOptionRow key={r.id} row={r} />
            ))}
          </div>
        ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter une option
      </Button>
      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}

function SortableOptionRow({
  row,
  onUpdate,
  onRemove,
  onEnter,
  setValueInputRef,
}: {
  row: Row;
  onUpdate: (patch: Partial<Option>) => void;
  onRemove: () => void;
  onEnter: () => void;
  setValueInputRef: (el: HTMLInputElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  // Empêche Enter de submit le `<form>` parent — on le détourne soit pour
  // ajouter une nouvelle ligne (dernière ligne), soit pour avancer le focus.
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        // Poignée drag : cursor-grab côté visuel, mais le hit-zone qui
        // active le drag est géré par `listeners` (dnd-kit).
        className="text-text-faint hover:text-text-muted cursor-grab touch-none active:cursor-grabbing"
        title="Glisser pour réordonner"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        ref={setValueInputRef}
        placeholder="value (ex: small)"
        value={row.value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        onKeyDown={onKeyDown}
        className="h-8 text-xs"
      />
      <Input
        placeholder="label affiché (ex: Petit)"
        value={row.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        onKeyDown={onKeyDown}
        className="h-8 text-xs"
      />
      <Button type="button" variant="ghost" size="sm" onClick={onRemove} title="Supprimer cette option">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function StaticOptionRow({ row }: { row: Row }) {
  // Variante pré-hydratation : pas de poignée drag, pas d'event handlers.
  // Conserve la même grille visuelle pour éviter un saut au mount.
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-faint h-4 w-4 shrink-0" aria-hidden />
      <Input placeholder="value (ex: small)" defaultValue={row.value} className="h-8 text-xs" readOnly tabIndex={-1} />
      <Input
        placeholder="label affiché (ex: Petit)"
        defaultValue={row.label}
        className="h-8 text-xs"
        readOnly
        tabIndex={-1}
      />
      <span className="inline-flex h-8 w-8 shrink-0" aria-hidden />
    </div>
  );
}
