'use client';

import { Command } from 'cmdk';
import { Book, FileText, Hash, Layers, Plus, Search, Variable } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { PaletteItem } from '@/components/palette/PaletteItem';
import { PreviewPane } from '@/components/palette/PreviewPane';
import { useToast } from '@/components/Toaster';
import { useAddActionScopes, useSelectedScopeId } from '@/components/blocks/AddActionsContext';
import { loadPaletteData, insertSampleBlock, type PaletteData } from '@/lib/actions';
import { BLOCK_TYPES_ORDER, BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { extractSnippet } from '@/lib/blockSearch';
import { parsePathContext } from '@/lib/palette/parsePathContext';
import { useCommandPaletteHotkeys } from '@/lib/palette/useCommandPaletteHotkeys';

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
    for (const c of data.chapters) {
      const direct =
        matchesQuery(c.title.toLowerCase(), q) ||
        matchesQuery(c.slug.toLowerCase(), q) ||
        matchesQuery(c.directSearchText.toLowerCase(), q);
      if (direct) continue;
      const hasMatchingBlock = data.blocks.some((b) => b.chapterId === c.id && matchesQuery(b.searchText, q));
      if (hasMatchingBlock) ids.add(c.id);
    }
    return ids;
  }, [search, data]);

  function go(href: string) {
    setOpen(false);
    // Append the current search query as `?q=<encoded>` so the
    // destination page can highlight the matching block(s) and tell
    // the user where their term actually appears. Skipped when the
    // query is empty so we don't pollute URLs with `?q=`.
    const q = search.trim();
    const final = q ? `${href}${href.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}` : href;
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
        // Override cmdk's default fuzzy matcher with the shared
        // `matchesQuery` helper. Default fuzzy scored items whose
        // chars appeared scattered across keywords — typing
        // "fiche pati" was bleeding into unrelated blocks. The
        // helper applies strict substring + a hierarchical-tag
        // fallback (see its docstring above). Score is 0/1 so
        // ordering falls back to natural DOM order (still grouped
        // by section).
        filter={(value, search, keywords) => {
          const q = search.trim().toLowerCase();
          if (!q) return 1;
          const haystack = `${(keywords ?? []).join(' ')} ${value}`.toLowerCase();
          return matchesQuery(haystack, q) ? 1 : 0;
        }}
        className="border-border w-full max-w-5xl overflow-hidden rounded-xl border bg-white shadow-2xl"
      >
        <div className="border-border flex items-center gap-2 border-b px-3 py-2">
          <Search className="text-muted-foreground h-4 w-4" />
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={ctx.parcoursSlug ? 'Cherche un chapitre, un bloc, une variable…' : 'Cherche un parcours…'}
            className="placeholder:text-muted-foreground h-9 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5 text-[10px]">
            esc
          </kbd>
        </div>

        {/* Split layout : Command.List on the left (results), PreviewPane
              on the right (schematic preview of the currently-highlighted row).
              Below md the preview pane is hidden — the palette remains
              fully functional on narrow screens. */}
        <div className="grid h-[60vh] md:grid-cols-2">
          <Command.List className="border-border overflow-y-auto border-r p-2">
            {loading && !data ? (
              <div className="text-muted-foreground px-3 py-6 text-center text-sm">Chargement…</div>
            ) : (
              <>
                <Command.Empty className="text-muted-foreground px-3 py-6 text-center text-sm">
                  Aucun résultat.
                </Command.Empty>

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
                        icon={<Plus className="h-3.5 w-3.5 text-emerald-600" />}
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
                    user with two competing "Add a block" entry points). */}
                {ctx.parcoursSlug && ctx.chapterSlug && (!onBlockEditPage || registeredScopes.length === 0) && (
                  <Command.Group heading="Ajouter un bloc au chapitre">
                    {BLOCK_TYPES_ORDER.filter((t) => SAMPLE_PAYLOADS[t]).map((t) => (
                      <PaletteItem
                        key={`add-${t}`}
                        icon={<Plus className="h-3.5 w-3.5 text-emerald-600" />}
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

                {/* === Chapitres (current parcours) ===
                      Chapters whose only match is via a child block are
                      filtered out (see `redundantChapterIds` above) —
                      the block row already covers the same edit
                      target, and a duplicate row would falsely suggest
                      "two things to fix" in an audit workflow. */}
                {(data?.chapters?.length ?? 0) > 0 && (
                  <Command.Group heading="Chapitres">
                    {data!.chapters
                      .filter((c) => !redundantChapterIds.has(c.id))
                      .map((c) => {
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
                            icon={<Hash className="text-primary h-3.5 w-3.5" />}
                            label={c.title}
                            hint={c.slug}
                            snippet={snippet}
                            highlight={search}
                            matchChips={matchingTags}
                            value={`chapter-${c.id}`}
                            keywords={[c.title, c.title, c.slug, c.searchText]}
                            onSelect={() => go(`/parcours/${ctx.parcoursSlug}/chapters/${c.slug}`)}
                          />
                        );
                      })}
                  </Command.Group>
                )}

                {/* === Blocs (current parcours, full-text searchable) === */}
                {(data?.blocks?.length ?? 0) > 0 && (
                  <Command.Group heading="Blocs">
                    {data!.blocks.map((b) => {
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
                          icon={<Layers className="h-3.5 w-3.5 text-violet-600" />}
                          label={b.summary || `Bloc ${b.type}`}
                          hint={`${(BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type} · ${b.chapterTitle}`}
                          snippet={snippet}
                          highlight={search}
                          matchChips={matchingTags}
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
                          onSelect={() => go(`/parcours/${ctx.parcoursSlug}/chapters/${b.chapterSlug}/blocks/${b.id}`)}
                        />
                      );
                    })}
                  </Command.Group>
                )}

                {/* === Variables (current parcours) === */}
                {(data?.variables?.length ?? 0) > 0 && (
                  <Command.Group heading="Variables">
                    {data!.variables.map((v) => (
                      <PaletteItem
                        key={v.id}
                        icon={<Variable className="h-3.5 w-3.5 text-amber-600" />}
                        label={v.key}
                        hint={`${v.label} · ${v.type}`}
                        value={`var-${v.id}`}
                        keywords={[v.key, v.label, v.type]}
                        onSelect={() => go(`/parcours/${ctx.parcoursSlug}/variables`)}
                      />
                    ))}
                  </Command.Group>
                )}

                {/* === Parcours (always shown) === */}
                {(data?.parcours?.length ?? 0) > 0 && (
                  <Command.Group heading="Parcours">
                    {data!.parcours.map((p) => (
                      <PaletteItem
                        key={p.id}
                        icon={<Book className="h-3.5 w-3.5 text-rose-600" />}
                        label={p.name}
                        hint={p.slug}
                        value={`parcours-${p.id}`}
                        keywords={[p.name, p.slug]}
                        onSelect={() => go(`/parcours/${p.slug}`)}
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

        <div className="border-border bg-muted/30 text-muted-foreground flex items-center justify-between border-t px-3 py-1.5 text-[10px]">
          <span>
            <kbd className="border-border rounded border bg-white px-1 py-0.5">↑↓</kbd> naviguer ·{' '}
            <kbd className="border-border rounded border bg-white px-1 py-0.5">↵</kbd> valider ·{' '}
            <kbd className="border-border rounded border bg-white px-1 py-0.5">esc</kbd> fermer
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
