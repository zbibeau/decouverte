'use client';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  renderItem: (item: T, dragHandle: ReactNode, index: number) => ReactNode;
  itemClassName?: string;
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  itemClassName,
}: SortableListProps<T>) {
  const [localItems, setLocalItems] = useState(items);
  // dnd-kit assigns auto-incrementing aria-describedby ids that desync between
  // server and client. Render a static list during SSR, then mount the real
  // DndContext after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Optimistic-update tracking. When the user drops an item we update
  // `localItems` synchronously AND remember the new order here. The server
  // action then runs in the background and the parent eventually re-renders
  // with the same order. Until that happens, the parent's `items` prop is
  // STILL the pre-drop order — so without this ref, the sync block below
  // would helpfully "fix" our optimistic state by snapping the item back
  // to its original slot. That's exactly the lag/flicker the user reports:
  // the row visibly jumps back to its old position for a tick before the
  // refresh lands and it re-jumps to the new position.
  //
  // With the ref: while `expectedOrderRef` is set, we ignore prop updates
  // that don't match the optimistic order. Once props catch up (server
  // confirmed), we clear the ref and resume normal sync. If props change
  // to a DIFFERENT order (rare — e.g. another tab edited concurrently),
  // we don't get stuck because we fall through to the regular sync as
  // soon as the expected and prop orders both end up valid.
  const expectedOrderRef = useRef<string[] | null>(null);

  // Sync when parent updates (after refresh) — but respect any optimistic
  // reorder still in flight.
  const propsIds = items.map((i) => i.id);
  const localIds = localItems.map((i) => i.id);
  const propsDifferFromLocal =
    propsIds.length !== localIds.length ||
    propsIds.some((id, i) => id !== localIds[i]);
  if (propsDifferFromLocal) {
    const expected = expectedOrderRef.current;
    if (expected) {
      const propsMatchExpected =
        propsIds.length === expected.length &&
        propsIds.every((id, i) => id === expected[i]);
      if (propsMatchExpected) {
        // Server caught up to our optimistic order → clear the flag and
        // accept the refreshed items (no visible change, same order).
        expectedOrderRef.current = null;
        setLocalItems(items);
      }
      // else : server hasn't caught up yet — keep showing the optimistic
      // order. Once it does, the branch above fires on the next render.
    } else {
      setLocalItems(items);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(localItems, oldIndex, newIndex);
    const nextIds = next.map((i) => i.id);
    // Stash the optimistic order BEFORE updating state so the sync block
    // above knows to skip its "reset from props" while the server action
    // is in flight (see expectedOrderRef comment).
    expectedOrderRef.current = nextIds;
    setLocalItems(next);
    void onReorder(nextIds);
  }

  if (!mounted) {
    return (
      <>
        {localItems.map((item, idx) => (
          <div key={item.id} className={cn(itemClassName)}>
            {renderItem(
              item,
              <span className="px-1 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
              </span>,
              idx,
            )}
          </div>
        ))}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {localItems.map((item, idx) => (
          <SortableRow key={item.id} id={item.id} className={itemClassName}>
            {(handle) => renderItem(item, handle, idx)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="cursor-grab touch-none px-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      title="Glisser pour réordonner"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(className)}>
      {children(handle)}
    </div>
  );
}
