'use client';

import { Info, Loader2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@/components/Toaster';
import { createTag, loadAllTags, loadBlockTags, loadChapterTags, setBlockTags, setChapterTags } from '@/lib/tags';
import { TAG_COLOR_CLASSES, type Tag } from '@/lib/tagColors';
import { parsePathContext } from '@/lib/palette/parsePathContext';

/**
 * Maintenance-tags input. Two targets are supported :
 *
 *   - { kind: 'block' } — Defaults when no prop is passed. Reads
 *     `blockId` from the URL via `parsePathContext` (the block
 *     editor lives at `/parcours/<slug>/chapters/<chapter>/blocks/<id>`).
 *     Used by VideoEditor / HeroTitleEditor / PhotoCarouselEditor.
 *
 *   - { kind: 'chapter', chapterId } — Caller passes the chapter id
 *     explicitly (chapter edition happens inline inside ChapterList,
 *     not as a dedicated route). Used to tag `chapter.card_image`.
 *
 * Saves every add / remove **directly** to the appropriate bridge
 * table (`block_tag` or `chapter_tag`), bypassing the parcours draft /
 * publish cycle entirely. Tags are a maintenance index, persisted
 * the instant the user adds them.
 *
 * UX :
 *   - Pills with ✕ for existing tags (colored from the palette)
 *   - Text input ; Enter / comma adds a tag (auto-creates if new)
 *   - Backspace on empty input removes the last pill
 *   - Autocomplete dropdown shows up to 8 matching tags from the
 *     global vocabulary, filtered case-insensitively, excluding tags
 *     already present
 *   - ↑↓ cycle through suggestions, Enter picks the highlighted one
 *     (falls back to "create" when no suggestion matches)
 *   - Case-insensitive dedup against the current target's tags
 */

export type TagsFieldTarget =
  /** Block mode. `blockId` optional : falls back to the one parsed
   *  from the URL when omitted (the default in the block editor
   *  page). Pass it explicitly when rendering TagsField outside of a
   *  block route — e.g. the pre-publish review modal which iterates
   *  over many blocks at once. */
  | { kind: 'block'; blockId?: string }
  | { kind: 'chapter'; chapterId: string }
  /** Controlled mode : the field doesn't talk to the DB at all. The
   *  parent owns the `valueIds` state and is notified via `onChange`.
   *  Used for nested blocks (children of card / toolContentSection /
   *  conditional…) where there's no `block_tag` row — the tags live
   *  inline in the parent block's payload as `tagIds: string[]`. */
  | { kind: 'controlled'; valueIds: string[]; onChange: (next: string[]) => void };

export function TagsField({
  target,
  onCurrentTagsChange,
}: {
  target?: TagsFieldTarget;
  /** Fires whenever the LOADED set of tags on this target changes —
   *  initial fetch, add, remove, server roundtrip. Lets the parent
   *  (e.g. the InlineBlockEditor) reflect the current tag pills in
   *  its own header without re-fetching them. Fires once with `[]`
   *  during loading too. */
  onCurrentTagsChange?: (tags: Tag[]) => void;
} = {}) {
  const pathname = usePathname();
  const resolvedTarget = useMemo<
    | { kind: 'block'; blockId: string | null }
    | { kind: 'chapter'; chapterId: string }
    | { kind: 'controlled'; valueIds: string[]; onChange: (next: string[]) => void }
  >(() => {
    if (target?.kind === 'chapter') return target;
    if (target?.kind === 'controlled') return target;
    // Block mode : explicit blockId wins, else fall back to the URL.
    if (target?.kind === 'block' && target.blockId) {
      return { kind: 'block', blockId: target.blockId };
    }
    const { blockId } = parsePathContext(pathname ?? '');
    return { kind: 'block', blockId };
  }, [target, pathname]);

  const toast = useToast();

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Wraps the whole field (pills + input + dropdown) so the
   *  click-outside detector can tell whether a mousedown should
   *  close the field or stay inside (e.g. clicking on a pill ✕). */
  const wrapperRef = useRef<HTMLDivElement>(null);
  /** Tracks whether the user actually added or removed a tag during
   *  the current focus session. Lets us only fire the "enregistré"
   *  toast when something meaningful happened — clicking outside an
   *  untouched field shouldn't spam. */
  const dirtyRef = useRef(false);

  // Initial load : global vocabulary.
  useEffect(() => {
    let cancelled = false;
    loadAllTags()
      .then((t) => {
        if (!cancelled) setAllTags(t);
      })
      .finally(() => {
        if (!cancelled) setLoadingAll(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Target-specific tag load. Re-fires when target identity changes.
  // - block / chapter : fetch the join rows from the DB
  // - controlled : resolve the parent-provided `valueIds` against
  //   the global `allTags` vocabulary (no roundtrip).
  const targetKey =
    resolvedTarget.kind === 'block'
      ? resolvedTarget.blockId
      : resolvedTarget.kind === 'chapter'
        ? resolvedTarget.chapterId
        : null;
  const controlledIdsKey = resolvedTarget.kind === 'controlled' ? resolvedTarget.valueIds.join(',') : '';
  useEffect(() => {
    if (resolvedTarget.kind === 'controlled') {
      // Inline mode : derive from `valueIds` + `allTags`. Skipping
      // missing IDs (e.g. a tag deleted from the library elsewhere)
      // keeps the field stable instead of showing dangling rows.
      const byId = new Map(allTags.map((t) => [t.id, t]));
      const resolved = resolvedTarget.valueIds
        .map((id) => byId.get(id))
        .filter((t): t is Tag => t !== undefined)
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
      setCurrentTags(resolved);
      setLoadingCurrent(false);
      return;
    }
    if (resolvedTarget.kind === 'block' && !resolvedTarget.blockId) {
      setLoadingCurrent(false);
      setCurrentTags([]);
      return;
    }
    let cancelled = false;
    setLoadingCurrent(true);
    const loader =
      resolvedTarget.kind === 'block'
        ? loadBlockTags(resolvedTarget.blockId!)
        : loadChapterTags(resolvedTarget.chapterId);
    loader
      .then((t) => {
        if (!cancelled) setCurrentTags(t);
      })
      .finally(() => {
        if (!cancelled) setLoadingCurrent(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, resolvedTarget.kind, controlledIdsKey, allTags]);

  // Broadcast `currentTags` to the parent (when interested) so it
  // can render its own surface — typically the collapsed Section
  // header showing the existing pills at a glance.
  useEffect(() => {
    if (!onCurrentTagsChange) return;
    onCurrentTagsChange(currentTags);
  }, [currentTags, onCurrentTagsChange]);

  // Persist `next` to the server (block/chapter) OR to the parent's
  // onChange (controlled). Optimistic with rollback in DB modes.
  async function persistTags(next: Tag[]) {
    const previous = currentTags;
    setCurrentTags(next);
    setSaving(true);
    // Mark the focus session as dirty so the click-outside handler
    // knows to toast a confirmation.
    dirtyRef.current = true;
    try {
      const ids = next.map((t) => t.id);
      if (resolvedTarget.kind === 'controlled') {
        // Just bubble up — the parent decides how to persist (usually
        // by stashing the IDs into its payload state, then the block
        // editor's normal save flow takes care of writing).
        resolvedTarget.onChange(ids);
      } else if (resolvedTarget.kind === 'block') {
        if (!resolvedTarget.blockId) return;
        await setBlockTags(resolvedTarget.blockId, ids);
      } else {
        await setChapterTags(resolvedTarget.chapterId, ids);
      }
    } catch (e) {
      setCurrentTags(previous);
      toast.error(`Sauvegarde des tags impossible : ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  // Global click-outside detector — closes the dropdown AND fires a
  // confirmation toast if the user touched the tag set during the
  // focus session. Listening on `mousedown` (not `click`) so the
  // close happens BEFORE the click bubbles to other handlers — feels
  // more responsive.
  useEffect(() => {
    if (!focused) return;
    function onMouseDown(e: MouseEvent) {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      if (wrapper.contains(e.target as Node)) return; // click inside, ignore
      setFocused(false);
      setInput('');
      if (dirtyRef.current) {
        toast.success('Tags enregistrés.');
        dirtyRef.current = false;
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [focused, toast]);

  async function addByLabel(rawLabel: string) {
    const trimmed = rawLabel.trim();
    if (!trimmed) {
      setInput('');
      return;
    }
    const lower = trimmed.toLowerCase();
    if (currentTags.some((t) => t.label.toLowerCase() === lower)) {
      setInput('');
      return;
    }
    const existing = allTags.find((t) => t.label.toLowerCase() === lower);
    let tag = existing;
    if (!tag) {
      setSaving(true);
      try {
        tag = await createTag(trimmed);
        setAllTags((prev) => [...prev, tag!].sort((a, b) => a.label.localeCompare(b.label, 'fr')));
      } catch (e) {
        toast.error((e as Error).message);
        setSaving(false);
        setInput('');
        return;
      } finally {
        setSaving(false);
      }
    }
    await persistTags([...currentTags, tag]);
    setInput('');
    setHighlightIdx(0);
  }

  function addExistingTag(tag: Tag) {
    if (currentTags.some((t) => t.id === tag.id)) return;
    void persistTags([...currentTags, tag]);
    setInput('');
    setHighlightIdx(0);
  }

  function removeAt(idx: number) {
    void persistTags(currentTags.filter((_, i) => i !== idx));
  }

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    const inTarget = new Set(currentTags.map((t) => t.id));
    return allTags
      .filter((t) => !inTarget.has(t.id))
      .filter((t) => (q ? t.label.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [allTags, input, currentTags]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [suggestions.length]);

  const targetReady =
    resolvedTarget.kind === 'chapter' || resolvedTarget.kind === 'controlled' || resolvedTarget.blockId !== null;
  const showDropdown = targetReady && focused && (suggestions.length > 0 || loadingAll || input.trim().length > 0);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (suggestions[highlightIdx]) {
        addExistingTag(suggestions[highlightIdx]);
      } else if (input.trim()) {
        void addByLabel(input);
      }
      return;
    }
    if (e.key === 'Backspace' && input === '' && currentTags.length > 0) {
      e.preventDefault();
      removeAt(currentTags.length - 1);
      return;
    }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === 'Escape') {
      setFocused(false);
      setInput('');
      inputRef.current?.blur();
      if (dirtyRef.current) {
        toast.success('Tags enregistrés.');
        dirtyRef.current = false;
      }
    }
  }

  // Pre-save block (no ID yet) — disable the field.
  if (!targetReady) {
    return (
      <div className="border-border bg-muted/20 text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs italic">
        Sauvegarde le bloc d&apos;abord — les tags seront disponibles dès qu&apos;il aura un identifiant.
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="border-input focus-within:ring-primary/20 bg-surface flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:ring-2"
        onClick={() => inputRef.current?.focus()}
      >
        {loadingCurrent ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Chargement…
          </span>
        ) : (
          currentTags.map((tag, i) => {
            const cls = TAG_COLOR_CLASSES[tag.color];
            return (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls.bg} ${cls.fg} ${cls.darkBg} ${cls.darkFg}`}
              >
                <span>🏷</span>
                <span>{tag.label}</span>
                <button
                  type="button"
                  aria-label={`Supprimer le tag ${tag.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i);
                  }}
                  className="-mr-0.5 ml-0.5 rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          // No onBlur — the click-outside detector above handles closing
          // the dropdown. Relying on blur was flaky because mousedown on
          // a suggestion fires blur before the suggestion handler can
          // re-focus, and tab-out timing varies across browsers.
          onKeyDown={onKeyDown}
          placeholder={currentTags.length === 0 ? 'Ajoute un tag…' : ''}
          disabled={saving || loadingCurrent}
          className="placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
        />
        {saving && <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />}
      </div>

      {showDropdown && (
        <div className="border-border bg-surface absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-md border shadow-lg">
          {loadingAll && suggestions.length === 0 && (
            <div className="text-muted-foreground px-3 py-2 text-xs italic">Chargement du vocabulaire…</div>
          )}
          {suggestions.map((s, i) => {
            const cls = TAG_COLOR_CLASSES[s.color];
            return (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addExistingTag(s);
                  inputRef.current?.focus();
                }}
                onMouseEnter={() => setHighlightIdx(i)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                  i === highlightIdx ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${cls.dot}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
          {!loadingAll && suggestions.length === 0 && input.trim() && (
            <div className="text-muted-foreground px-3 py-2 text-xs italic">
              Aucune suggestion. Tape Entrée pour créer « {input.trim()} ».
            </div>
          )}
          {!loadingAll && suggestions.length === 0 && !input.trim() && (
            <div className="text-muted-foreground px-3 py-2 text-xs italic">
              Aucun tag enregistré. Tape un mot et appuie sur Entrée pour le créer.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible help banner shown above every `<TagsField>`. Reminds
 * the editor that tags are a maintenance tool only — they don't
 * render on the parcours and shouldn't be repurposed for UX / SEO /
 * etc.
 *
 * The reminder is now collapsed by default (`<details>`) because the
 * editor only needs it the first few times — after that, the constant
 * 3-line blue banner above every TagsField becomes pure noise. Click
 * the summary to expand it on demand.
 */
export function TagsHelpBanner({ contextHint }: { contextHint?: string }) {
  return (
    <details className="border-border bg-muted/30 text-muted-foreground group rounded-md border px-3 py-2 text-xs">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2">
        <Info className="text-primary h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">À quoi servent ces tags&nbsp;?</span>
        <span className="text-muted-foreground/70 text-[10px] group-open:hidden">Afficher l&apos;aide</span>
        <span className="text-muted-foreground/70 hidden text-[10px] group-open:inline">Masquer</span>
      </summary>
      <p className="mt-2 leading-relaxed">
        Ces tags servent <strong>uniquement à la maintenance</strong> — ils t&apos;aident à retrouver ce média via ⌘K
        quand une fonctionnalité du produit évolue. Ils n&apos;ont <strong>aucun impact visuel ou navigationnel</strong>{' '}
        sur le parcours, et sont sauvegardés immédiatement (pas besoin de publier).
        {contextHint && <span className="mt-0.5 block italic">{contextHint}</span>}
      </p>
    </details>
  );
}
