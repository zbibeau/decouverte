'use client';

import { Command } from 'cmdk';
import { FileText, Replace, Search, Tag, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';

import { useAddActionScopes, useSelectedScopeId } from '@/components/blocks/AddActionsContext';
import { PaletteContextBar } from '@/components/palette/PaletteContextBar';
import { PaletteItem } from '@/components/palette/PaletteItem';
import { PALETTE_SCOPES, PaletteScopeBar, type PaletteScope } from '@/components/palette/PaletteScopeBar';
import { PreviewPane } from '@/components/palette/PreviewPane';
import { ReplacePanel, type ReplaceRow } from '@/components/palette/ReplacePanel';
import { useToast } from '@/components/Toaster';
import { insertSampleBlock, loadPaletteData, type PaletteData, replaceAcrossBlocks } from '@/lib/actions';
import { BLOCK_TYPE_LABELS, BLOCK_TYPES_ORDER } from '@/lib/blockDefaults';
import { findOccurrencesInPayload, replaceOccurrencesInPayload } from '@/lib/blockReplace';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { extractSnippet } from '@/lib/blockSearch';
import { FamilyIcon } from '@/lib/familyIcons';
import { formatRelative } from '@/lib/palette/formatRelative';
import { parsePathContext } from '@/lib/palette/parsePathContext';
import { scoreMatch } from '@/lib/palette/scorePaletteItem';
import { useCommandPaletteHotkeys } from '@/lib/palette/useCommandPaletteHotkeys';
import { useRecentItems, type RecentKind } from '@/lib/palette/useRecentItems';
import { isTagColor, TAG_COLOR_HEX } from '@/lib/tagColors';

/**
 * Match `haystack` against a user-typed `query`.
 *
 * Two-pass strategy :
 *   1. Strict case-insensitive substring — catches the common case
 *      (typing "fiche pati" surfaces every block whose searchable
 *      text contains that exact phrase).
 *   2. Hierarchical-tag fallback : when the query contains a ">",
 *      we split on it and accept the row if AT LEAST ONE segment
 *      (length ≥ 2) is a substring of the haystack. Lets a query
 *      like "réglage > acte" surface a block tagged
 *      "réglages > patient" via the shared "réglage" stem — same
 *      editorial intent, slightly different spelling. Without
 *      this, typing a full hierarchical label finds only EXACT
 *      tag matches, which surprises editors who use ">" as a
 *      category prefix.
 *
 * Both `haystack` and `query` must already be lowercased by the
 * caller (perf : avoids re-lowercasing on every keystroke).
 */
function matchesQuery(haystack: string, query: string): boolean {
  if (!query) return true;
  if (haystack.includes(query)) return true;
  if (query.includes('>')) {
    const segments = query
      .split('>')
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    if (segments.length > 0 && segments.some((s) => haystack.includes(s))) {
      return true;
    }
  }
  return false;
}

/**
 * Global command palette opened by ⌘K / Ctrl+K. Single entry point to
 * navigate the manager and add new blocks fast.
 *
 * Sections:
 *   - 📚 Parcours  — jump to any parcours
 *   - 🗂  Chapitres — chapters of the current parcours
 *   - 🧱 Blocs     — blocks of the current parcours, full-text searchable
 *                    via `extractBlockSearchText` (HTML stripped)
 *   - 🔣 Variables — variables of the current parcours
 *   - ➕ Ajouter un bloc — only visible when the user is inside a chapter
 *                          page; inserting picks the sample payload for
 *                          the chosen type and navigates to the new block
 *
 * Data is fetched lazily on first open (`loadPaletteData(currentSlug?)`)
 * and cached in component state for the lifetime of the mount.
 *
 * Cmdk handles fuzzy scoring; we pass `keywords` per item to widen the
 * match surface (e.g. include block payload text + chapter title).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PaletteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  // cmdk controlled value — fires on ↑↓ AND on mouse hover, lets the
  // right-hand PreviewPane mirror whichever row is highlighted right
  // now (without waiting for Enter).
  const [highlightedValue, setHighlightedValue] = useState('');
  // Active tag filter — when set, the Chapitres / Blocs sections only
  // show rows carrying this tag id. Picked by clicking a row in the
  // "🏷 Tags" section. Cleared via the chip's × button (kept separate
  // from `setOpen` so Esc still closes the whole palette).
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  // Search vs Replace mode. Toggled via the <Replace> button in the
  // input row OR via the local ⌘⇧H hotkey (only active while the
  // palette is open). State INTENTIONALLY persists across close/reopen
  // matching the existing `search` behaviour — the editor expects the
  // palette to "remember" what they were doing.
  const [mode, setMode] = useState<'search' | 'replace'>('search');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  // Opt-out set : rows are CHECKED by default ; this set carries the
  // keys (`${blockId}|${path}|${index}`) the editor explicitly
  // unchecked. Cleared after each successful apply.
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [isApplyingReplace, startReplaceTransition] = useTransition();
  // Scope filter — restricts the rendered groups to a single TYPE
  // (blocs / chapitres / variables / parcours / actions). Coexists
  // with the tag filter (`selectedTagId`) : scope filters by type,
  // tag filters by label, both can be active. Cyclable via Tab on
  // the input. Default `'all'` shows every group as before.
  const [scope, setScope] = useState<PaletteScope>('all');
  // Persisted "recently opened" entries — populated whenever the
  // palette navigates / inserts. Resolved against `data` below to
  // build the « Récents » group on the empty-query landing.
  const { recents: recentEntries, push: pushRecent } = useRecentItems();
  // Deferred `search` so the per-keystroke walk over every block of
  // the parcours stays cheap. React lets the input update immediately
  // while the occurrence list reconciles on idle. Only consulted in
  // replace mode — search mode renders against the raw `search`.
  const deferredSearch = useDeferredValue(search);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const allScopes = useAddActionScopes();
  const selectedScopeId = useSelectedScopeId();
  // Reorder: selected scope first (so its actions appear at the top of
  // the palette), then the others by depth desc. Without a selection,
  // the natural depth ordering is preserved.
  const registeredScopes = useMemo(() => {
    if (!selectedScopeId) return allScopes;
    const sel = allScopes.find((s) => s.id === selectedScopeId);
    if (!sel) return allScopes;
    return [sel, ...allScopes.filter((s) => s.id !== selectedScopeId)];
  }, [allScopes, selectedScopeId]);

  // Derive context from URL — what parcours / chapter are we on ?
  const ctx = useMemo(() => parsePathContext(pathname ?? ''), [pathname]);
  // When editing a single block we demote "Add block to chapter" so that
  // scope-specific actions registered by nested editors take precedence.
  const onBlockEditPage = Boolean(ctx.blockId);

  // Global hotkey wiring lives in its own hook for testability.
  useCommandPaletteHotkeys(setOpen);

  // Fetch palette data on first open + whenever the parcours slug changes
  // while the palette is open (covers in-app navigation).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    loadPaletteData(ctx.parcoursSlug ?? undefined)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        console.error('[CommandPalette] loadPaletteData failed', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ctx.parcoursSlug]);

  // Search query + highlighted row INTENTIONALLY persist across
  // close/re-open. The user expects that ⌘K → search → Esc → ⌘K
  // brings them back to where they were, without having to re-type
  // their query (much faster for iterative audit workflows). If
  // they really want a fresh slate, they can ✕ the input or clear
  // the field manually.

  // The chapter we're currently inside (URL-derived). Passed to the
  // preview pane so the "+ Add block" preview tells the user where the
  // block will land.
  const currentChapterTitle = useMemo(() => {
    if (!ctx.chapterSlug) return null;
    return data?.chapters.find((c) => c.slug === ctx.chapterSlug)?.title ?? null;
  }, [data?.chapters, ctx.chapterSlug]);

  // Resolve the currently-active tag (if any) to the full row so we
  // can render its colored chip in the filter indicator.
  const selectedTag = useMemo(() => {
    if (!selectedTagId || !data) return null;
    return data.tags.find((t) => t.id === selectedTagId) ?? null;
  }, [selectedTagId, data]);

  // Reset the tag filter automatically when the parcours context
  // changes (the new parcours has its own tag vocabulary — the
  // previous selection is meaningless there).
  useEffect(() => {
    setSelectedTagId(null);
  }, [ctx.parcoursSlug]);

  // Chapters / blocks restricted to the active tag (or pass-through
  // when no filter is set). Computed once so the Chapitres / Blocs
  // sections, the dedup logic and the section count badges all read
  // the same source of truth.
  const filteredChapters = useMemo(() => {
    if (!data) return [];
    if (!selectedTagId) return data.chapters;
    return data.chapters.filter((c) => c.tags.some((t) => t.id === selectedTagId));
  }, [data, selectedTagId]);
  const filteredBlocks = useMemo(() => {
    if (!data) return [];
    if (!selectedTagId) return data.blocks;
    return data.blocks.filter((b) => b.tags.some((t) => t.id === selectedTagId));
  }, [data, selectedTagId]);

  // === Récents (Direction B - point 2) ====================================
  // Resolve persisted entries against the current `data` snapshot. Rows
  // whose underlying object was deleted are silently dropped. Limited to
  // the first 6 surviving entries for the empty-state view.
  const resolvedRecents = useMemo(() => {
    if (!data)
      return [] as Array<{
        kind: RecentKind;
        id: string;
        ts: number;
        label: string;
        hint?: string;
        href: string;
        icon: 'block' | 'chapter' | 'variable' | 'parcours';
      }>;
    const out: Array<{
      kind: RecentKind;
      id: string;
      ts: number;
      label: string;
      hint?: string;
      href: string;
      icon: 'block' | 'chapter' | 'variable' | 'parcours';
    }> = [];
    for (const r of recentEntries) {
      if (r.kind === 'block') {
        const b = data.blocks.find((x) => x.id === r.id);
        if (!b) continue;
        out.push({
          ...r,
          label: b.summary || `Bloc ${b.type}`,
          hint: `${(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type} · ${b.chapterTitle}`,
          href: `/parcours/${ctx.parcoursSlug ?? ''}/chapters/${b.chapterSlug}/blocks/${b.id}`,
          icon: 'block',
        });
      } else if (r.kind === 'chapter') {
        const c = data.chapters.find((x) => x.id === r.id);
        if (!c) continue;
        out.push({
          ...r,
          label: c.title,
          hint: c.slug,
          href: `/parcours/${ctx.parcoursSlug ?? ''}/chapters/${c.slug}`,
          icon: 'chapter',
        });
      } else if (r.kind === 'variable') {
        const v = data.variables.find((x) => x.id === r.id);
        if (!v) continue;
        out.push({
          ...r,
          label: v.key,
          hint: `${v.label} · ${v.type}`,
          href: `/parcours/${ctx.parcoursSlug ?? ''}/variables`,
          icon: 'variable',
        });
      } else if (r.kind === 'parcours') {
        const p = data.parcours.find((x) => x.id === r.id);
        if (!p) continue;
        out.push({
          ...r,
          label: p.name,
          hint: p.slug,
          href: `/parcours/${p.slug}`,
          icon: 'parcours',
        });
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [data, recentEntries, ctx.parcoursSlug]);

  // Empty-query landing — when `true`, the rendered list collapses to
  // just « Récents » + « Suggestions ». A typed query brings the full
  // scored sections back via the standard rendering path below.
  const isEmptyQuery = search.trim() === '' && mode === 'search';

  // Dedup : chapters whose only reason to appear is that one of their
  // child blocks matches the search. From a maintenance-audit
  // standpoint the chapter row is redundant — clicking the more
  // specific block row leads to the same edit target in one less
  // step. We hide the chapter row when :
  //   - the search query is non-empty
  //   - the chapter doesn't match directly (title / slug / its own
  //     tag labels via `directSearchText`)
  //   - AND at least one of its blocks matches the query
  // If the chapter matches by itself (e.g. its title contains the
  // query), the row stays — it carries unique value (chapter-level
  // edits like title, tags, etc.).
  //
  // Uses the SAME matcher as the cmdk filter below (strict substring
  // with a hierarchical-tag fallback) so the dedup logic stays in
  // sync with what cmdk actually renders.
  const redundantChapterIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data) return new Set<string>();
    const ids = new Set<string>();
    // Reads `filteredChapters` / `filteredBlocks` so the dedup
    // mirrors the post-tag-filter view : a chapter doesn't become
    // "redundant" just because the tag filter is hiding all its
    // blocks.
    for (const c of filteredChapters) {
      const direct =
        matchesQuery(c.title.toLowerCase(), q) ||
        matchesQuery(c.slug.toLowerCase(), q) ||
        matchesQuery(c.directSearchText.toLowerCase(), q);
      if (direct) continue;
      const hasMatchingBlock = filteredBlocks.some((b) => b.chapterId === c.id && matchesQuery(b.searchText, q));
      if (hasMatchingBlock) ids.add(c.id);
    }
    return ids;
  }, [search, data, filteredChapters, filteredBlocks]);

  // === Search & Replace : occurrences across the parcours' blocks ===
  // Computed only in replace mode and only when there's a query.
  // useDeferredValue debounces the walk to React's idle slot so typing
  // stays smooth even on a 150-block parcours.
  const replaceRows = useMemo<ReplaceRow[]>(() => {
    if (mode !== 'replace' || !data || !deferredSearch.trim()) return [];
    const out: ReplaceRow[] = [];
    for (const b of data.blocks) {
      const occurrences = findOccurrencesInPayload(b.payload, deferredSearch, { matchCase });
      for (const occ of occurrences) {
        out.push({
          ...occ,
          key: `${b.id}|${occ.path}|${occ.index}`,
          blockId: b.id,
          blockSummary: b.summary,
          chapterTitle: b.chapterTitle,
          chapterSlug: b.chapterSlug,
          blockType: b.type,
        });
      }
    }
    return out;
  }, [mode, data, deferredSearch, matchCase]);

  // Toggle a single occurrence's checked state. Rows are CHECKED by
  // default ; storing the OPT-OUT (rather than the inclusions) means
  // a fresh search starts with everything selected, which matches
  // typical Find-and-Replace expectations.
  const toggleOccurrence = useCallback((key: string) => {
    setExcludedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // "Tout cocher" → clear the opt-out set ; "Tout décocher" → mark
  // every replaceable row as opted-out. Non-replaceable rows are
  // skipped either way since their checkbox is disabled.
  const toggleAllOccurrences = useCallback(() => {
    const replaceable = replaceRows.filter((r) => r.replaceable);
    const allChecked = replaceable.every((r) => !excludedKeys.has(r.key));
    if (allChecked) {
      setExcludedKeys(new Set(replaceable.map((r) => r.key)));
    } else {
      setExcludedKeys(new Set());
    }
  }, [replaceRows, excludedKeys]);

  // Apply : group selected occurrences by block, compute each block's
  // new payload via `replaceOccurrencesInPayload`, batch the writes
  // via `replaceAcrossBlocks`, then toast + reset + close.
  const handleApplyReplace = useCallback(() => {
    if (!ctx.parcoursSlug || replaceQuery === '' || !data) return;
    const selected = replaceRows.filter((r) => r.replaceable && !excludedKeys.has(r.key));
    if (selected.length === 0) return;

    const byBlock = new Map<string, ReplaceRow[]>();
    for (const r of selected) {
      const arr = byBlock.get(r.blockId) ?? [];
      arr.push(r);
      byBlock.set(r.blockId, arr);
    }

    const edits: { blockId: string; chapterSlug: string; payload: Record<string, unknown> }[] = [];
    let totalApplied = 0;
    for (const [blockId, rows] of byBlock) {
      const block = data.blocks.find((b) => b.id === blockId);
      if (!block) continue;
      const hits = rows.map((r) => ({ path: r.path, index: r.index, length: r.length, isHtml: r.isHtml }));
      const { payload: nextPayload, appliedCount } = replaceOccurrencesInPayload(block.payload, hits, replaceQuery);
      if (appliedCount === 0) continue;
      edits.push({
        blockId,
        chapterSlug: block.chapterSlug,
        payload: nextPayload as Record<string, unknown>,
      });
      totalApplied += appliedCount;
    }

    if (edits.length === 0) return;

    startReplaceTransition(async () => {
      try {
        const result = await replaceAcrossBlocks(ctx.parcoursSlug!, edits);
        toast.success(
          `${totalApplied} occurrence${totalApplied > 1 ? 's' : ''} remplacée${totalApplied > 1 ? 's' : ''} dans ${
            result.blocksTouched
          } bloc${result.blocksTouched > 1 ? 's' : ''}`,
        );
        // Reset replace state and close. `data` is intentionally set
        // to null so the next palette open re-fetches with the fresh
        // payloads from the draft.
        setReplaceQuery('');
        setExcludedKeys(new Set());
        setData(null);
        setOpen(false);
      } catch (e) {
        toast.error(`Échec du remplacement : ${(e as Error).message}`);
      }
    });
  }, [ctx.parcoursSlug, replaceQuery, replaceRows, excludedKeys, data, toast]);

  // Local palette hotkeys — only active while the palette is open.
  //  - ⌘⇧H : toggle Search / Replace.
  //  - Tab / Shift+Tab : cycle the scope chips. Bound on the input
  //    so the user can keep typing then cycle without focus-jumping.
  // We avoid `useCommandPaletteHotkeys` here because these shortcuts
  // are palette-scoped — firing them anywhere else would be surprising.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      const k = e.key?.toLowerCase();
      if (!k) return;
      if (k === 'h' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setMode((m) => (m === 'search' ? 'replace' : 'search'));
        return;
      }
      // Tab on the input → cycle scope (only when a parcours is in
      // context — outside a parcours the scope bar is hidden).
      if (e.key === 'Tab' && ctx.parcoursSlug && document.activeElement?.tagName === 'INPUT') {
        e.preventDefault();
        const ids = PALETTE_SCOPES.map((s) => s.id);
        const idx = ids.indexOf(scope);
        const dir = e.shiftKey ? -1 : 1;
        const nextIdx = (idx + dir + ids.length) % ids.length;
        setScope(ids[nextIdx]);
        return;
      }
      // Accès direct 1-9 (Direction B - point 6). Sélectionne + valide
      // le Nᵉ résultat visible. Ignoré tant que l'éditeur tape une
      // requête vide ou en mode replace (où l'index 1-9 perdrait son
      // sens — le panel ReplacePanel a ses propres affordances).
      if (mode === 'search' && /^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey && search.trim()) {
        // Accès direct par position GLOBALE (ignore les groupes) :
        // on collecte tous les `[cmdk-item]` visibles non-désactivés et
        // on simule un click sur le Nᵉ. Cmdk déclenche notre `onSelect`,
        // qui gère navigation + recents + close. Ne se déclenche que
        // lorsque le user a tapé quelque chose (sinon les badges 1-9
        // ne sont pas rendus, ça serait surprenant).
        const items = Array.from(document.querySelectorAll<HTMLElement>('.mfm-palette [cmdk-item]')).filter(
          (el) => el.getAttribute('data-disabled') !== 'true',
        );
        const n = Number(e.key);
        const candidate = items[n - 1];
        if (candidate) {
          e.preventDefault();
          candidate.click();
        }
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, ctx.parcoursSlug, scope, mode, search]);

  // When the user edits the search query in replace mode, clear the
  // opt-out set — keys reference specific (blockId, path, index)
  // triplets and become stale as soon as the occurrence list shifts.
  useEffect(() => {
    setExcludedKeys(new Set());
  }, [deferredSearch, matchCase, mode]);

  function go(href: string, recent?: { kind: RecentKind; id: string }) {
    setOpen(false);
    // Append the current search query as `?q=<encoded>` so the
    // destination page can apply the in-block / in-field highlights
    // (the editor wants to SEE where their term matched without
    // re-typing). The SearchHighlightBanner and the filter input
    // pre-fill have been suppressed downstream — only the silent
    // highlight survives. Skipped when the query is empty so we
    // don't pollute URLs with `?q=`.
    const q = search.trim();
    const final = q ? `${href}${href.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}` : href;
    if (recent) pushRecent(recent);
    router.push(final);
  }

  async function handleInsertBlock(type: string) {
    if (!ctx.parcoursSlug || !ctx.chapterSlug) return;
    const sample = SAMPLE_PAYLOADS[type as keyof typeof SAMPLE_PAYLOADS];
    if (!sample) {
      toast.error(`Pas d'exemple disponible pour le bloc « ${type} »`);
      return;
    }
    const chapter = data?.chapters.find((c) => c.slug === ctx.chapterSlug);
    if (!chapter) {
      toast.error('Chapitre courant introuvable.');
      return;
    }
    startTransition(async () => {
      try {
        const { blockId, chapterSlug } = await insertSampleBlock(ctx.parcoursSlug!, chapter.id, type, sample.payload);
        toast.success(`Bloc « ${(BLOCK_TYPE_LABELS as Record<string, string>)[type] ?? type} » ajouté`);
        pushRecent({ kind: 'block', id: blockId });
        setOpen(false);
        router.push(`/parcours/${ctx.parcoursSlug}/chapters/${chapterSlug}/blocks/${blockId}`);
      } catch (e) {
        toast.error(`Échec de l'insertion : ${(e as Error).message}`);
      }
    });
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <Command
        label="Palette de commandes"
        value={highlightedValue}
        onValueChange={setHighlightedValue}
        // Weighted scoring (Direction B - point 3 du handoff cmdk).
        // Before : the filter returned 0/1 → cmdk's tie-breaker was DOM
        // order, so a body-text match could outrank an exact-title hit.
        // Now : `scoreMatch` reads the FIRST keyword as the row's label
        // (every PaletteItem prepends its label to the keywords twice
        // anyway), falls back through label-starts-with / contains /
        // sub-contains / keywords-contains. Higher score = higher in the
        // rendered order. Empty query returns 1 → keeps natural order
        // when no input. Hierarchical-tag fallback via `>` segments
        // lives inside `scoreMatch`.
        filter={(value, search, keywords) => {
          const kw = keywords ?? [];
          return scoreMatch({ label: kw[0] ?? value, sub: kw[1], keywords: kw.slice(2) }, search);
        }}
        className="mfm-palette border-border bg-surface w-full max-w-5xl overflow-hidden rounded-xl border shadow-2xl"
      >
        <div className="border-border flex items-center gap-2 border-b px-3 py-2">
          <Search className="text-muted-foreground h-4 w-4" />
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={
              mode === 'replace'
                ? 'Cherche le texte à remplacer…'
                : ctx.parcoursSlug
                  ? 'Cherche un chapitre, un bloc, une variable…'
                  : 'Cherche un parcours…'
            }
            className="placeholder:text-muted-foreground h-9 flex-1 bg-transparent text-sm outline-none"
          />
          {/* Segmented control « Rechercher | Remplacer » (Direction B
              - point 4 du handoff cmdk). Remplace l'ancien bouton 11 px
              caché en bout de rangée par un contrôle visible dès
              l'ouverture (uniquement si un parcours est en contexte —
              Replace est parcours-scopé). Hotkey ⌘⇧H toujours actif. */}
          {ctx.parcoursSlug && (
            <div className="bg-surface-2 inline-flex shrink-0 gap-0.5 rounded-md p-0.5 text-[11px]">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'search'}
                onClick={() => setMode('search')}
                className={
                  mode === 'search'
                    ? 'bg-primary/15 text-primary-on shadow-app-sm inline-flex items-center gap-1 rounded-[5px] px-2 py-1 font-medium'
                    : 'text-text-muted hover:text-text inline-flex items-center gap-1 rounded-[5px] px-2 py-1 transition-colors'
                }
                title="Mode recherche"
              >
                <Search className="h-3 w-3" />
                <span className="hidden sm:inline">Rechercher</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'replace'}
                onClick={() => setMode('replace')}
                className={
                  mode === 'replace'
                    ? 'bg-primary/15 text-primary-on shadow-app-sm inline-flex items-center gap-1 rounded-[5px] px-2 py-1 font-medium'
                    : 'text-text-muted hover:text-text inline-flex items-center gap-1 rounded-[5px] px-2 py-1 transition-colors'
                }
                title="Mode remplacer (⌘⇧H)"
              >
                <Replace className="h-3 w-3" />
                <span className="hidden sm:inline">Remplacer</span>
              </button>
            </div>
          )}
          <kbd className="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5 text-[10px]">
            esc
          </kbd>
        </div>

        {/* Fil d'Ariane de contexte (Direction B - point 1). Affiché
            uniquement quand on est dans un parcours. Le placeholder
            seul ne disambigüe pas un bloc et un chapitre portant des
            noms proches ; ce breadcrumb dit à l'éditeur OÙ il agit.
            Le chip à droite surface la portée / le tag actif. */}
        {ctx.parcoursSlug && data && (
          <PaletteContextBar
            parcoursName={data.parcours.find((p) => p.slug === ctx.parcoursSlug)?.name ?? ctx.parcoursSlug}
            chapterTitle={currentChapterTitle}
            filterLabel={
              selectedTag
                ? `Tag : ${selectedTag.label}`
                : scope !== 'all'
                  ? `Portée : ${PALETTE_SCOPES.find((s) => s.id === scope)?.label}`
                  : null
            }
          />
        )}

        {/* Puces de portée (Direction B - point 5). Restreint l'index
            par TYPE (orthogonal au filtre par tag). Cyclables via
            Tab / Shift+Tab depuis l'input — handler dans
            `useEffect` plus bas. */}
        {ctx.parcoursSlug && <PaletteScopeBar scope={scope} onScope={setScope} />}

        {/* Replace mode — second input row : "Remplacer par…" + Match
            Case toggle. Tab order : search → replace → matchCase. */}
        {mode === 'replace' && ctx.parcoursSlug && (
          <div className="border-border bg-surface-2/30 flex items-center gap-2 border-b px-3 py-2">
            <Replace className="text-muted-foreground h-4 w-4" />
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Remplacer par…"
              className="placeholder:text-muted-foreground h-9 flex-1 bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setMatchCase((v) => !v)}
              aria-pressed={matchCase}
              title={matchCase ? 'Désactiver la sensibilité à la casse' : 'Activer la sensibilité à la casse'}
              className={`inline-flex h-7 items-center justify-center rounded px-2 text-[11px] font-medium ${
                matchCase
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground border-border border'
              }`}
            >
              Aa
            </button>
          </div>
        )}

        {/* Active-tag filter indicator. Only rendered when the editor has
            picked a tag from the "🏷 Tags" section below — clicking the
            × clears the filter (palette stays open with the search
            preserved). */}
        {selectedTag && (
          <div className="border-border bg-muted/30 flex items-center gap-2 border-b px-3 py-1.5 text-[11px]">
            <span className="text-muted-foreground">Filtré par tag :</span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: (isTagColor(selectedTag.color)
                  ? TAG_COLOR_HEX[selectedTag.color]
                  : TAG_COLOR_HEX.amber
                ).chip,
                color: (isTagColor(selectedTag.color) ? TAG_COLOR_HEX[selectedTag.color] : TAG_COLOR_HEX.amber).text,
              }}
            >
              <span aria-hidden="true">🏷</span>
              <span>{selectedTag.label}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedTagId(null)}
              className="text-muted-foreground hover:text-foreground hover:bg-surface ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]"
              aria-label="Retirer le filtre par tag"
            >
              <X className="h-3 w-3" />
              <span>Retirer le filtre</span>
            </button>
          </div>
        )}

        {/* Split layout : Command.List on the left (results), PreviewPane
              on the right (schematic preview of the currently-highlighted row).
              Below md the preview pane is hidden — the palette remains
              fully functional on narrow screens.

              In Replace mode the whole grid is swapped for <ReplacePanel>
              which owns its own header / list / footer — the PreviewPane
              isn't useful there since each row already shows full context. */}
        {mode === 'search' ? (
          <div className="grid h-[60vh] md:grid-cols-2">
            <Command.List className="border-border overflow-y-auto border-r p-2">
              {loading && !data ? (
                <div className="text-muted-foreground px-3 py-6 text-center text-sm">Chargement…</div>
              ) : (
                <>
                  {/* Empty state — quand un tag est filtré ET que le scope
                      actuel renvoie 0, on aide l'éditeur à comprendre
                      pourquoi (le tag existe mais dans une autre famille)
                      et à débloquer en un clic en élargissant le scope.
                      Cas concret rapporté : tag « Manh ha » sur 1 chapitre,
                      onglet Blocs sélectionné → 0 bloc avec ce tag mais
                      le tag existait bien dans l'autocomplete. */}
                  <Command.Empty className="text-muted-foreground px-3 py-6 text-center text-sm">
                    {(() => {
                      if (!selectedTag) return 'Aucun résultat.';
                      const blocks = selectedTag.blockCount;
                      const chapters = selectedTag.chapterCount;
                      const elsewhereParts: string[] = [];
                      if (scope !== 'blocks' && scope !== 'all' && blocks > 0) {
                        elsewhereParts.push(`${blocks} bloc${blocks > 1 ? 's' : ''}`);
                      }
                      if (scope !== 'chapters' && scope !== 'all' && chapters > 0) {
                        elsewhereParts.push(`${chapters} chapitre${chapters > 1 ? 's' : ''}`);
                      }
                      // Cas Blocs scope + tag uniquement sur chapitres :
                      if (scope === 'blocks' && blocks === 0 && chapters > 0) {
                        return (
                          <>
                            <p>
                              Aucun bloc avec le tag <strong>« {selectedTag.label} »</strong>.
                            </p>
                            <p className="mt-1">
                              {chapters} chapitre{chapters > 1 ? 's' : ''} en {chapters > 1 ? 'ont' : 'a'} un —{' '}
                              <button
                                type="button"
                                onClick={() => setScope('all')}
                                className="text-primary-on underline-offset-2 hover:underline"
                              >
                                voir tous les résultats
                              </button>
                              .
                            </p>
                          </>
                        );
                      }
                      // Symétrique : Chapitres scope + tag uniquement sur blocs.
                      if (scope === 'chapters' && chapters === 0 && blocks > 0) {
                        return (
                          <>
                            <p>
                              Aucun chapitre avec le tag <strong>« {selectedTag.label} »</strong>.
                            </p>
                            <p className="mt-1">
                              {blocks} bloc{blocks > 1 ? 's' : ''} en {blocks > 1 ? 'ont' : 'a'} un —{' '}
                              <button
                                type="button"
                                onClick={() => setScope('all')}
                                className="text-primary-on underline-offset-2 hover:underline"
                              >
                                voir tous les résultats
                              </button>
                              .
                            </p>
                          </>
                        );
                      }
                      return 'Aucun résultat.';
                    })()}
                  </Command.Empty>

                  {/* === Empty-query landing — Récents + Suggestions (Direction B point 2) ===
                      Quand la palette s'ouvre sans saisie, on ne déverse plus
                      tous les groupes (Tags + Chapitres + Blocs + Variables +
                      Parcours). À la place : 6 dernières ouvertures + un seul
                      groupe de Suggestions contextuelles. Dès que l'éditeur
                      tape, on bascule sur les sections classiques. */}
                  {isEmptyQuery && resolvedRecents.length > 0 && (
                    <Command.Group heading="Récents">
                      {resolvedRecents.map((r) => (
                        <PaletteItem
                          key={`recent-${r.kind}-${r.id}`}
                          icon={<FamilyIcon family={r.icon} />}
                          label={r.label}
                          hint={r.hint}
                          meta={formatRelative(r.ts)}
                          actionHint="↵ Ouvrir"
                          value={`recent-${r.kind}-${r.id}`}
                          keywords={[r.label, r.hint ?? '', 'récent', 'historique']}
                          onSelect={() => go(r.href, { kind: r.kind, id: r.id })}
                        />
                      ))}
                    </Command.Group>
                  )}
                  {isEmptyQuery && ctx.chapterSlug && currentChapterTitle && (
                    <Command.Group heading="Suggestions">
                      <PaletteItem
                        icon={<FamilyIcon family="chapter" />}
                        label={`Ouvrir ${currentChapterTitle}`}
                        hint="chapitre courant"
                        actionHint="↵ Ouvrir"
                        value={`suggest-current-chapter`}
                        keywords={['chapitre', 'courant', currentChapterTitle]}
                        onSelect={() => {
                          const c = data?.chapters.find((x) => x.slug === ctx.chapterSlug);
                          if (!c) return;
                          go(`/parcours/${ctx.parcoursSlug}/chapters/${c.slug}`, { kind: 'chapter', id: c.id });
                        }}
                      />
                    </Command.Group>
                  )}

                  {/* === Add actions registered by nested editors (deepest first) ===
                    The user is editing somewhere — these are the most local
                    actions ("Ajouter un point" in the open list, "Ajouter une
                    question" in the FAQ, etc.). Always shown first. */}
                  {registeredScopes.map((scope) => (
                    <Command.Group
                      key={scope.id}
                      heading={scope.id === selectedScopeId ? `★ ${scope.label} (sélection)` : scope.label}
                    >
                      {scope.actions.map((a) => (
                        <PaletteItem
                          key={`${scope.id}-${a.id}`}
                          icon={<FamilyIcon family="add" />}
                          label={a.label}
                          hint={a.description}
                          value={`scope-${scope.id}-${a.id}`}
                          keywords={[scope.label, a.label, a.description ?? '', 'ajouter', 'add']}
                          onSelect={async () => {
                            await a.run();
                            setOpen(false);
                          }}
                        />
                      ))}
                    </Command.Group>
                  ))}

                  {/* === Ajouter un bloc au chapitre ===
                    On chapter list pages this is the natural insert target.
                    On block edit pages we still show it but only when no
                    nested-scope action was registered (avoids confusing the
                    user with two competing "Add a block" entry points).
                    Caché en empty-query landing (les Suggestions prennent
                    le relais) et quand la portée filtre autre chose. */}
                  {!isEmptyQuery &&
                    (scope === 'all' || scope === 'actions') &&
                    ctx.parcoursSlug &&
                    ctx.chapterSlug &&
                    (!onBlockEditPage || registeredScopes.length === 0) && (
                      <Command.Group heading="Ajouter un bloc au chapitre">
                        {BLOCK_TYPES_ORDER.filter((t) => SAMPLE_PAYLOADS[t]).map((t) => (
                          <PaletteItem
                            key={`add-${t}`}
                            icon={<FamilyIcon family="add" />}
                            label={`+ ${(BLOCK_TYPE_LABELS as Record<string, string>)[t] ?? t}`}
                            hint="Insère dans le chapitre courant avec l'exemple"
                            value={`add-${t}`}
                            keywords={[
                              t,
                              (BLOCK_TYPE_LABELS as Record<string, string>)[t] ?? t,
                              'ajouter',
                              'add',
                              'insert',
                            ]}
                            disabled={isPending}
                            onSelect={() => void handleInsertBlock(t)}
                          />
                        ))}
                      </Command.Group>
                    )}

                  {/* === Tags (current parcours) ===
                      Browse the maintenance-tag vocabulary actually used in
                      this parcours. Selecting a row sets `selectedTagId`,
                      which scopes the Chapitres / Blocs sections below to
                      only items carrying that tag. The chip on top of the
                      palette mirrors the active filter with a × to clear.
                      Hidden when a filter is already active (the editor
                      doesn't need to pick again) and when the parcours has
                      no tags yet (empty section would just be noise). */}
                  {!isEmptyQuery && scope === 'all' && !selectedTagId && (data?.tags?.length ?? 0) > 0 && (
                    <Command.Group heading="Tags">
                      {data!.tags.map((t) => {
                        const hex = isTagColor(t.color) ? TAG_COLOR_HEX[t.color] : TAG_COLOR_HEX.amber;
                        // Détail par famille — évite l'ambiguïté de l'ancien
                        // « N bloc(s) / chapitre(s) » qui ne disait pas si
                        // les N étaient des blocs OU des chapitres. L'éditeur
                        // qui filtre par tag dans le scope « Blocs » a besoin
                        // de savoir d'avance s'il aura des résultats.
                        const parts: string[] = [];
                        if (t.blockCount > 0) parts.push(`${t.blockCount} bloc${t.blockCount > 1 ? 's' : ''}`);
                        if (t.chapterCount > 0)
                          parts.push(`${t.chapterCount} chapitre${t.chapterCount > 1 ? 's' : ''}`);
                        return (
                          <PaletteItem
                            key={`tag-${t.id}`}
                            icon={<Tag className="h-3.5 w-3.5" style={{ color: hex.dot }} />}
                            label={t.label}
                            hint={parts.length > 0 ? parts.join(' · ') : 'aucun usage'}
                            value={`tag-${t.id}`}
                            // Surface the section via natural French/English
                            // synonyms in addition to the label itself, so
                            // typing "filtre", "label", "etiquette" or "tag"
                            // brings the rows up even when the editor doesn't
                            // remember a specific tag name.
                            keywords={[t.label, 'tag', 'label', 'filtre', 'étiquette', 'etiquette', 'maintenance']}
                            onSelect={() => {
                              setSelectedTagId(t.id);
                              setSearch('');
                            }}
                          />
                        );
                      })}
                    </Command.Group>
                  )}

                  {/* === Chapitres (current parcours) ===
                      Reads `filteredChapters` (= data.chapters restricted
                      to the active tag if any), then strips out the rows
                      considered redundant with a matching block row
                      (see `redundantChapterIds` above). */}
                  {!isEmptyQuery && (scope === 'all' || scope === 'chapters') && filteredChapters.length > 0 && (
                    <Command.Group heading={`Chapitres · ${filteredChapters.length}`}>
                      {filteredChapters
                        .filter((c) => !redundantChapterIds.has(c.id))
                        .map((c, ci) => {
                          // Tags on the chapter that themselves match the
                          // query — rendered as colored pills on the row so
                          // the user sees the match comes from a tag.
                          const q = search.trim().toLowerCase();
                          const matchingTags = q ? c.tags.filter((t) => t.label.toLowerCase().includes(q)) : [];
                          // Snippet under the title when the query matched
                          // inside an *aggregated* block (and not in the
                          // title itself — that's already visible above).
                          // Skipped when a tag matches : the colored chip
                          // already conveys the match cleanly, the snippet
                          // would just duplicate / clutter the row.
                          const titleMatches = c.title.toLowerCase().includes(q);
                          const snippet =
                            q && !titleMatches && matchingTags.length === 0
                              ? (extractSnippet(c.searchText, search, 32) ?? undefined)
                              : undefined;
                          return (
                            <PaletteItem
                              key={c.id}
                              icon={<FamilyIcon family="chapter" />}
                              label={c.title}
                              hint={c.slug}
                              snippet={snippet}
                              highlight={search}
                              matchChips={matchingTags}
                              index={ci < 9 && search.trim() ? ci + 1 : undefined}
                              actionHint={search.trim() ? '↵ Ouvrir' : undefined}
                              value={`chapter-${c.id}`}
                              keywords={[c.title, c.title, c.slug, c.searchText]}
                              onSelect={() =>
                                go(`/parcours/${ctx.parcoursSlug}/chapters/${c.slug}`, { kind: 'chapter', id: c.id })
                              }
                            />
                          );
                        })}
                    </Command.Group>
                  )}

                  {/* === Blocs (current parcours, full-text searchable) === */}
                  {!isEmptyQuery && (scope === 'all' || scope === 'blocks') && filteredBlocks.length > 0 && (
                    <Command.Group heading={`Blocs · ${filteredBlocks.length}`}>
                      {filteredBlocks.map((b, bi) => {
                        // Tags on the block that themselves match the
                        // query — surfaced as colored pills inline on the
                        // row so the user sees the match comes from a tag.
                        const q = search.trim().toLowerCase();
                        const matchingTags = q ? b.tags.filter((t) => t.label.toLowerCase().includes(q)) : [];
                        // Snippet rendered only when the query matched
                        // deep in the payload — if it matched the summary
                        // OR a tag, we already convey that elsewhere (the
                        // summary is the row label ; the tag is its own
                        // colored pill). Doubling with a snippet would
                        // just clutter.
                        const summaryMatches = b.summary.toLowerCase().includes(q);
                        const snippet =
                          q && !summaryMatches && matchingTags.length === 0
                            ? (extractSnippet(b.searchText, search, 32) ?? undefined)
                            : undefined;
                        return (
                          <PaletteItem
                            key={b.id}
                            icon={<FamilyIcon family="block" />}
                            label={b.summary || `Bloc ${b.type}`}
                            hint={`${(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type} · ${b.chapterTitle}`}
                            snippet={snippet}
                            highlight={search}
                            matchChips={matchingTags}
                            index={bi < 9 && search.trim() ? bi + 1 : undefined}
                            actionHint={search.trim() ? '↵ Ouvrir' : undefined}
                            value={`block-${b.id}`}
                            // primaryText duplicated so cmdk's fuzzy matcher
                            // weighs a hit on titles/labels above one buried
                            // in the body. summary is also high-signal so it
                            // stays at the front. secondaryText is the long
                            // body content — present but unweighted.
                            //
                            // `chapterTitle` and `chapterSlug` were
                            // intentionally removed : including them made
                            // every block of a chapter match whenever the
                            // chapter's name contained the query (e.g.
                            // searching "patient" on the chapter "Copie —
                            // création du dossier patient" surfaced ALL its
                            // blocks, even those whose own content had
                            // nothing to do with "patient"). The chapter
                            // itself still appears as its own row in the
                            // Chapitres section if its title matches.
                            keywords={[b.summary, b.summary, b.primaryText, b.primaryText, b.type, b.secondaryText]}
                            onSelect={() =>
                              go(`/parcours/${ctx.parcoursSlug}/chapters/${b.chapterSlug}/blocks/${b.id}`, {
                                kind: 'block',
                                id: b.id,
                              })
                            }
                          />
                        );
                      })}
                    </Command.Group>
                  )}

                  {/* === Variables (current parcours) ===
                    Hidden while a tag filter is active : variables carry no
                    maintenance tag, so they can't be scoped by one — showing
                    the full list under an active tag filter is just noise
                    (the user expects to see only what's tagged). Same
                    `!selectedTagId` guard as the Tags section above. */}
                  {!isEmptyQuery &&
                    (scope === 'all' || scope === 'variables') &&
                    !selectedTagId &&
                    (data?.variables?.length ?? 0) > 0 && (
                      <Command.Group heading={`Variables · ${data!.variables.length}`}>
                        {data!.variables.map((v) => (
                          <PaletteItem
                            key={v.id}
                            icon={<FamilyIcon family="variable" />}
                            label={v.key}
                            hint={`${v.label} · ${v.type}`}
                            value={`var-${v.id}`}
                            keywords={[v.key, v.label, v.type]}
                            onSelect={() =>
                              go(`/parcours/${ctx.parcoursSlug}/variables`, { kind: 'variable', id: v.id })
                            }
                          />
                        ))}
                      </Command.Group>
                    )}

                  {/* === Parcours ===
                    Like Variables, hidden while a tag filter is active —
                    parcours rows carry no maintenance tag, so they're
                    irrelevant to a tag-scoped view (that's why two parcours
                    were wrongly showing under the « vue agenda » filter).
                    Shown normally otherwise, including plain text search. */}
                  {!isEmptyQuery &&
                    (scope === 'all' || scope === 'parcours') &&
                    !selectedTagId &&
                    (data?.parcours?.length ?? 0) > 0 && (
                      <Command.Group heading={`Parcours · ${data!.parcours.length}`}>
                        {data!.parcours.map((p) => (
                          <PaletteItem
                            key={p.id}
                            icon={<FamilyIcon family="parcours" />}
                            label={p.name}
                            hint={p.slug}
                            value={`parcours-${p.id}`}
                            keywords={[p.name, p.slug]}
                            onSelect={() => go(`/parcours/${p.slug}`, { kind: 'parcours', id: p.id })}
                          />
                        ))}
                      </Command.Group>
                    )}
                </>
              )}
            </Command.List>
            <div className="hidden overflow-hidden md:block">
              <PreviewPane
                value={highlightedValue}
                data={data}
                currentParcoursSlug={ctx.parcoursSlug ?? null}
                currentChapterTitle={currentChapterTitle}
                scopes={registeredScopes}
                search={search}
              />
            </div>
          </div>
        ) : (
          <div className="h-[60vh] overflow-hidden">
            <ReplacePanel
              rows={replaceRows}
              searchQuery={search}
              replaceQuery={replaceQuery}
              excludedKeys={excludedKeys}
              onToggle={toggleOccurrence}
              onToggleAll={toggleAllOccurrences}
              onApply={handleApplyReplace}
              isApplying={isApplyingReplace}
              loading={loading && !data}
            />
          </div>
        )}

        <div className="border-border bg-muted/30 text-muted-foreground flex items-center justify-between border-t px-3 py-1.5 text-[10px]">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>
              <kbd className="border-border bg-surface rounded border px-1 py-0.5">↑↓</kbd> naviguer
            </span>
            <span>
              <kbd className="border-border bg-surface rounded border px-1 py-0.5">1–9</kbd> accès direct
            </span>
            <span>
              <kbd className="border-border bg-surface rounded border px-1 py-0.5">⇥</kbd> filtrer
            </span>
            <span>
              <kbd className="border-border bg-surface rounded border px-1 py-0.5">↵</kbd> ouvrir
            </span>
            <span>
              <kbd className="border-border bg-surface rounded border px-1 py-0.5">esc</kbd> fermer
            </span>
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {data?.blocks?.length ?? 0} blocs indexés
          </span>
        </div>
      </Command>
    </div>
  );
}
