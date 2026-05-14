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
import { ReactNode, useEffect, useState } from 'react';

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

  // Sync when parent updates (after refresh)
  if (items.length !== localItems.length || items.some((it, i) => it.id !== localItems[i]?.id)) {
    setLocalItems(items);
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
    setLocalItems(next);
    void onReorder(next.map((i) => i.id));
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
