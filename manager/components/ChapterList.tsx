'use client';

import { ArrowDown, ArrowUp, Check, ChevronRight, Copy, Pencil, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { TagsField, TagsHelpBanner } from '@/components/blocks/TagsField';
import { useConfirm } from '@/components/ConfirmDialog';
import { SortableList } from '@/components/SortableList';
import { useToast } from '@/components/Toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useListKeyboardNav } from '@/lib/useListKeyboardNav';
import { uploadImageDirect } from '@/lib/uploadImageClient';

interface ChapterRow {
  id: string;
  slug: string;
  title: string;
  order: number;
  /** Sidebar grouping label (NULL = ungrouped). Edited inline in this list. */
  sectionLabel?: string | null;
  /** Optional sort key within a section. NULL = chapter `order` decides. */
  sectionOrder?: number | null;
  /** Background image URL displayed on the chapter card in the section
   *  panorama (chapterTransition / auto next-chapter transition). */
  cardImage?: string | null;
  /** Short title displayed on the chapter card. Falls back to `title`. */
  cardShortTitle?: string | null;
  /** Draft diff state: 'new' (created in draft), 'modified' (diff vs published), or undefined (pristine / no draft). */
  diff?: 'new' | 'modified' | 'pristine';
  /** Navbar variants used by top-level blocks of this chapter. Renders as
   *  small colored chips so the author sees at a glance which "sous-parties"
   *  the chapter contains. */
  navbars?: Array<{ key: string; title: string; color?: string }>;
}

interface Props {
  parcoursSlug: string;
  chapters: ChapterRow[];
  reorderAction: (orderedIds: string[]) => Promise<void>;
  deleteAction: (chapterId: string) => Promise<void>;
  duplicateAction: (chapterId: string) => Promise<{ id: string; slug: string }>;
  /** Server action persisting a chapter title/slug/section/card update.
   *  Writes go through the draft (cf. `updateChapterMeta`). */
  updateAction: (
    chapterId: string,
    title: string,
    slug: string,
    sectionLabel: string | null,
    sectionOrder: number | null,
    cardImage: string | null,
    cardShortTitle: string | null,
  ) => Promise<void>;
  /** Server action swapping a section with its neighbour in the global
   *  chapter order. Powers the ↑ / ↓ buttons in each section header. */
  moveSectionAction: (sectionLabel: string | null, direction: -1 | 1) => Promise<void>;
}

function DiffBadge({ diff }: { diff?: ChapterRow['diff'] }) {
  if (diff === 'new') {
    return (
      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">
        Nouveau
      </span>
    );
  }
  if (diff === 'modified') {
    return (
      <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
        Modifié
      </span>
    );
  }
  return null;
}

export function ChapterList({
  parcoursSlug,
  chapters,
  reorderAction,
  deleteAction,
  duplicateAction,
  updateAction,
  moveSectionAction,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  // Local "edit mode" state — only one row at a time. When set, the row
  // renders an inline edit form instead of the static link.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSectionLabel, setEditSectionLabel] = useState('');
  const [editSectionOrder, setEditSectionOrder] = useState('');
  const [editCardImage, setEditCardImage] = useState('');
  const [editCardShortTitle, setEditCardShortTitle] = useState('');
  const [cardImageUploading, setCardImageUploading] = useState(false);
  const cardImageInputRef = useRef<HTMLInputElement | null>(null);

  function startEdit(c: ChapterRow) {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditSlug(c.slug);
    setEditSectionLabel(c.sectionLabel ?? '');
    setEditSectionOrder(c.sectionOrder == null ? '' : String(c.sectionOrder));
    setEditCardImage(c.cardImage ?? '');
    setEditCardShortTitle(c.cardShortTitle ?? '');
  }
  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditSlug('');
    setEditSectionLabel('');
    setEditSectionOrder('');
    setEditCardImage('');
    setEditCardShortTitle('');
  }
  async function handleCardImageUpload(file: File) {
    // Direct browser → Supabase upload : bypasses the Next.js server action
    // 1 MB body limit so photos > 1 MB go through (phone shots are typically
    // 2-8 MB). Same pattern as `VideoUploadButton`.
    setCardImageUploading(true);
    try {
      const res = await uploadImageDirect(file);
      if (!res.ok || !res.url) {
        toast.error(res.error || 'Upload échoué.');
        return;
      }
      setEditCardImage(res.url);
      toast.success('Image carte uploadée.');
    } catch (e) {
      console.error('[ChapterList] card image upload failed', e);
      toast.error(`Upload échoué : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCardImageUploading(false);
      if (cardImageInputRef.current) cardImageInputRef.current.value = '';
    }
  }
  function commitEdit(id: string, originalTitle: string) {
    const title = editTitle.trim();
    const slug = editSlug.trim();
    if (!title || !slug) {
      toast.error('Titre et slug requis.');
      return;
    }
    const sectionLabel = editSectionLabel.trim() === '' ? null : editSectionLabel.trim();
    const sectionOrder = editSectionOrder.trim() === '' ? null : Number(editSectionOrder);
    const cardImage = editCardImage.trim() === '' ? null : editCardImage.trim();
    const cardShortTitle = editCardShortTitle.trim() === '' ? null : editCardShortTitle.trim();
    startTransition(async () => {
      try {
        await updateAction(id, title, slug, sectionLabel, sectionOrder, cardImage, cardShortTitle);
        toast.success(`Chapitre « ${originalTitle} » mis à jour`);
        setEditingId(null);
        router.refresh();
      } catch (e) {
        console.error('[ChapterList] update failed', e);
        toast.error(`Échec de la mise à jour de « ${originalTitle} » — ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
  // ↑↓ / Enter / Esc keyboard navigation. Esc/← goes back to the parcours
  // list (home page).
  const { selectedIdx, isClient } = useListKeyboardNav(
    chapters,
    (c) => `/parcours/${parcoursSlug}/chapters/${c.slug}`,
    '/',
  );

  function handleReorder(orderedIds: string[]) {
    startTransition(async () => {
      await reorderAction(orderedIds);
      router.refresh();
    });
  }
  function handleDuplicate(id: string, title: string) {
    startTransition(async () => {
      try {
        const created = await duplicateAction(id);
        toast.success(`Chapitre dupliqué : « ${title} » → « ${created.slug} »`);
        router.refresh();
      } catch (e) {
        console.error('[ChapterList] duplicate failed', e);
        toast.error(`Échec de la duplication de « ${title} »`);
      }
    });
  }
  async function handleDelete(id: string, title: string) {
    const ok = await confirm({
      title: `Supprimer le chapitre « ${title} » ?`,
      message:
        "Cette action ouvre / modifie le brouillon ; elle ne touche pas la version publiée tant que tu n'as pas cliqué « Publier ».",
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteAction(id);
        toast.success(`Chapitre « ${title} » supprimé du brouillon`);
        router.refresh();
      } catch (e) {
        console.error('[ChapterList] delete failed', e);
        toast.error(`Échec de la suppression de « ${title} »`);
      }
    });
  }

  if (chapters.length === 0) {
    // Empty state with an explicit affordance : the previous "Aucun
    // chapitre." line was correct but felt like a dead-end. Surfacing
    // the CreateChapterForm right here turns the empty state into the
    // landing CTA — one click and the author is off.
    return (
      <div className="border-border bg-muted/30 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center">
        <div className="text-3xl" aria-hidden="true">
          📖
        </div>
        <p className="text-sm font-medium">Aucun chapitre pour l&apos;instant</p>
        <p className="text-muted-foreground max-w-md text-xs">
          Un chapitre regroupe les blocs (texte, vidéo, formulaire…) qu&apos;un visiteur va parcourir. Crée le premier
          ci-dessous.
        </p>
      </div>
    );
  }

  // Group chapters by section. Order of sections = order in which each
  // section first appears in `chapters`. Within a section, chapters keep
  // their original `chapter.order`. This gives the manager a stable
  // grouped view regardless of how the chapters are interleaved in DB.
  const groupedChapters = (() => {
    const groups = new Map<string, ChapterRow[]>();
    const order: string[] = [];
    for (const c of chapters) {
      const key = c.sectionLabel?.trim() || '__none__';
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(c);
    }
    return order.map((key) => ({
      sectionLabel: key === '__none__' ? null : key,
      items: groups.get(key)!,
    }));
  })();

  // Flat list of distinct existing section labels — fuels the dropdown in
  // the edit form so the author picks from existing sections rather than
  // re-typing (and accidentally creating a duplicate).
  const existingSections = groupedChapters.filter((g) => g.sectionLabel != null).map((g) => g.sectionLabel as string);

  // Cross-section drag : when SortableList returns the reordered ids of a
  // section's slice, we splice them back into the full list at the correct
  // position so the global `chapter.order` stays a contiguous sequence.
  function handleSectionReorder(sectionLabel: string | null, newOrder: string[]) {
    const all = chapters.map((c) => c.id);
    // Remove the chapters of this section from the global list.
    const sectionIds = new Set(newOrder);
    const remaining = all.filter((id) => !sectionIds.has(id));
    // Find the position where the first chapter of this section currently is.
    const firstIdxInGlobal = all.findIndex((id) => sectionIds.has(id));
    const insertAt = Math.max(0, firstIdxInGlobal);
    const reassembled = [...remaining.slice(0, insertAt), ...newOrder, ...remaining.slice(insertAt)];
    handleReorder(reassembled);
    void sectionLabel; // currently unused, kept for future per-section logic
  }

  return (
    <div className="space-y-3">
      {groupedChapters.length > 1 && (
        <div className="border-border bg-muted/30 flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs">
          <span className="text-muted-foreground font-semibold">{groupedChapters.length} section(s) :</span>
          {groupedChapters.map((g, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
              {g.sectionLabel ? (
                <strong className="text-foreground">{g.sectionLabel}</strong>
              ) : (
                <em className="text-muted-foreground">(sans section)</em>
              )}
              <span className="text-muted-foreground">· {g.items.length}</span>
            </span>
          ))}
        </div>
      )}
      {groupedChapters.map((group, groupIdx) => (
        <div key={group.sectionLabel ?? '__none__'} className="space-y-0">
          <div className="border-border bg-muted/40 text-brand-primary-700 flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide">
            {group.sectionLabel ? (
              <span>📁 {group.sectionLabel}</span>
            ) : (
              <span className="text-muted-foreground italic">(sans section)</span>
            )}
            <span className="text-muted-foreground/70">· {group.items.length} chapitre(s)</span>
            {/* Section reorder ↑/↓ — swaps the whole group with its
                 neighbour in the chapter list. Disabled at the boundaries
                 so the first section can't go higher and the last can't
                 go lower. */}
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                title="Remonter cette section"
                disabled={groupIdx === 0 || isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await moveSectionAction(group.sectionLabel, -1);
                      router.refresh();
                    } catch (e) {
                      toast.error(`Déplacement échoué : ${e instanceof Error ? e.message : String(e)}`);
                    }
                  });
                }}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Descendre cette section"
                disabled={groupIdx === groupedChapters.length - 1 || isPending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await moveSectionAction(group.sectionLabel, 1);
                      router.refresh();
                    } catch (e) {
                      toast.error(`Déplacement échoué : ${e instanceof Error ? e.message : String(e)}`);
                    }
                  });
                }}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="border-border rounded-b-md border">
            <SortableList
              items={group.items}
              onReorder={(ids) => handleSectionReorder(group.sectionLabel, ids)}
              itemClassName="border-b border-border last:border-b-0"
              renderItem={(c, dragHandle, idx) => {
                const isEditing = editingId === c.id;
                // Section header is now rendered above each section group, not
                // inline per row, so we no longer emit it here.
                void idx;
                function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitEdit(c.id, c.title);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                  }
                }
                return (
                  <div className="rounded px-2 py-3 transition-colors">
                    <div className="flex items-center gap-2">
                      {dragHandle}
                      {isEditing ? (
                        <>
                          <span className="text-muted-foreground font-mono text-xs">{c.order}.</span>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Titre du chapitre"
                            className="h-8 flex-1 text-sm"
                            autoFocus
                            onKeyDown={handleKey}
                          />
                          <Input
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            placeholder="STEP_SLUG"
                            className="h-8 w-[180px] font-mono text-xs"
                            onKeyDown={handleKey}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Enregistrer"
                            disabled={isPending}
                            onClick={() => commitEdit(c.id, c.title)}
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Annuler" disabled={isPending} onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {/*
                  Row layout : the "open chapter" Link is split into two
                  segments around the Pencil button so the pencil sits
                  visually right after the title — per UX feedback, the user
                  was confusing the pencil (renommer) with the ChevronRight
                  (entrer dans le chapitre). The pencil moved to the left
                  near the title (less-used action, but where it logically
                  belongs), and the chevron stays at the far right as the
                  unambiguous "enter chapter" affordance.

                  Two Link nodes pointing to the same destination is a bit
                  redundant but is the cleanest HTML-valid way to interleave
                  a button in the middle of a clickable row (nesting a
                  `<button>` inside `<a>` would be invalid). Both segments
                  share the same href + `hover:underline` so the row reads
                  visually as a single clickable area.
                */}
                          <Link
                            href={`/parcours/${parcoursSlug}/chapters/${c.slug}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <span className="text-muted-foreground font-mono text-xs">{c.order}.</span>
                            {c.cardImage && (
                              // Small thumbnail of the chapter card image — gives the
                              // author a visual marker to spot a chapter at a glance
                              // (same image as the section-panorama card).
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={c.cardImage}
                                alt=""
                                className="border-border h-8 w-12 shrink-0 rounded border object-cover"
                              />
                            )}
                            <span className="font-medium">{c.title}</span>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Renommer (titre + slug + section + carte)"
                            disabled={isPending}
                            onClick={() => startEdit(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Link
                            href={`/parcours/${parcoursSlug}/chapters/${c.slug}`}
                            className="flex flex-1 items-center gap-3 hover:underline"
                          >
                            <code className="text-muted-foreground text-xs">({c.slug})</code>
                            <DiffBadge diff={c.diff} />
                            <ChevronRight className="text-muted-foreground ml-auto h-4 w-4" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Dupliquer"
                            disabled={isPending}
                            onClick={() => handleDuplicate(c.id, c.title)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Supprimer"
                            disabled={isPending}
                            onClick={() => handleDelete(c.id, c.title)}
                          >
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    {isEditing && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                        <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                          Section sidebar
                        </label>
                        <SectionPicker
                          value={editSectionLabel}
                          onChange={setEditSectionLabel}
                          existingSections={existingSections}
                          currentSection={c.sectionLabel ?? null}
                        />
                        <p className="text-muted-foreground basis-full text-[10px]">
                          Choisis une section existante dans le dropdown, ou « + Nouvelle section… » pour en créer une.
                          Vide = chapitre non groupé.
                        </p>
                        <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                          Ordre
                        </label>
                        <Input
                          type="number"
                          value={editSectionOrder}
                          onChange={(e) => setEditSectionOrder(e.target.value)}
                          placeholder="(auto)"
                          className="h-8 w-[80px] text-xs"
                          onKeyDown={handleKey}
                        />
                        <div className="basis-full" />
                        <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                          Titre carte
                        </label>
                        <Input
                          value={editCardShortTitle}
                          onChange={(e) => setEditCardShortTitle(e.target.value)}
                          placeholder={`(défaut : ${c.title})`}
                          className="h-8 flex-1 text-sm"
                          onKeyDown={handleKey}
                        />
                        <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                          Image carte
                        </label>
                        <Input
                          value={editCardImage}
                          onChange={(e) => setEditCardImage(e.target.value)}
                          placeholder="URL ou upload"
                          className="h-8 flex-1 text-xs"
                          onKeyDown={handleKey}
                        />
                        <input
                          ref={cardImageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleCardImageUpload(file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={cardImageUploading}
                          onClick={() => cardImageInputRef.current?.click()}
                          title="Uploader une image"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {cardImageUploading ? '…' : ''}
                        </Button>
                        {editCardImage && (
                          <div className="basis-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={editCardImage}
                              alt={`Aperçu ${c.title}`}
                              className="border-border mt-1 h-24 w-auto rounded border object-cover"
                            />
                          </div>
                        )}
                        <p className="text-muted-foreground basis-full text-[10px]">
                          Le titre court et l'image servent au visuel de transition de chapitre (panorama de section) en
                          fin de chapitre.
                        </p>
                        {/* Maintenance tags for the chapter's card_image —
                            same vocabulary as block-level tags (the global
                            `tag` table is shared). Persisted directly via
                            `chapter_tag` join, no draft/publish cycle. */}
                        <div className="basis-full space-y-2 pt-2">
                          <TagsHelpBanner contextHint="Décris ici l'interface produit que l'image-carte de ce chapitre représente (ex. fiche patient, agenda)." />
                          <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                            Tags de maintenance
                          </label>
                          <TagsField target={{ kind: 'chapter', chapterId: c.id }} />
                        </div>
                      </div>
                    )}
                    {/* Navbar chips removed from this row per UX feedback : too
                noisy in a list of 10+ chapters. The chips are still rendered
                INSIDE the chapter detail view (`ChapterEditor.tsx`), per
                block, where the context makes the variant relevant. */}
                  </div>
                );
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Dropdown of existing section names + an "+ Nouvelle section…" option
 * that swaps to a free-text input. Used by ChapterList's edit form so the
 * author picks from existing sections rather than re-typing (which would
 * create duplicates with subtle differences like trailing spaces).
 */
function SectionPicker({
  value,
  onChange,
  existingSections,
  currentSection,
}: {
  value: string;
  onChange: (v: string) => void;
  existingSections: string[];
  currentSection: string | null;
}) {
  // When the current value isn't in the existing list, expose a text input
  // (the user is typing a new section name).
  const isCustom = value !== '' && !existingSections.includes(value) && value !== currentSection;
  const [mode, setMode] = useState<'select' | 'custom'>(isCustom ? 'custom' : 'select');

  if (mode === 'custom') {
    return (
      <div className="flex flex-1 items-center gap-1">
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nom de la nouvelle section"
          className="h-8 flex-1 text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange('');
            setMode('select');
          }}
          title="Annuler la création de section"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <select
      className="border-border h-8 flex-1 rounded-md border bg-white px-2 text-sm"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '__new__') {
          setMode('custom');
          onChange('');
          return;
        }
        onChange(v);
      }}
    >
      <option value="">— Aucune section —</option>
      {existingSections.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      <option disabled>──────────</option>
      <option value="__new__">+ Nouvelle section…</option>
    </select>
  );
}
