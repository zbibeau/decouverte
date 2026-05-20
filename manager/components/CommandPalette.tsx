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

  // Reset query + highlight when closing so re-opening feels fresh
  // (otherwise a phantom row stays highlighted from the previous session,
  // and the preview pane would show stale content on re-open).
  useEffect(() => {
    if (!open) {
      setSearch('');
      setHighlightedValue('');
    }
  }, [open]);

  // The chapter we're currently inside (URL-derived). Passed to the
  // preview pane so the "+ Add block" preview tells the user where the
  // block will land.
  const currentChapterTitle = useMemo(() => {
    if (!ctx.chapterSlug) return null;
    return data?.chapters.find((c) => c.slug === ctx.chapterSlug)?.title ?? null;
  }, [data?.chapters, ctx.chapterSlug]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
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

                {/* === Chapitres (current parcours) === */}
                {(data?.chapters?.length ?? 0) > 0 && (
                  <Command.Group heading="Chapitres">
                    {data!.chapters.map((c) => {
                      // Show a snippet under the chapter title when the query
                      // matched inside an *aggregated* block (and not in the
                      // title itself — that's already visible above). Lets
                      // "saturation" surface the chapter, with a teaser of
                      // where the word lives.
                      const titleMatches = c.title.toLowerCase().includes(search.trim().toLowerCase());
                      const snippet =
                        search.trim() && !titleMatches
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
                      // Snippet rendered only when the query matched deep in
                      // the payload — if it matched the summary we already
                      // show that. Hides noise when there's no query (palette
                      // just opened) by passing undefined.
                      const summaryMatches = b.summary.toLowerCase().includes(search.trim().toLowerCase());
                      const snippet =
                        search.trim() && !summaryMatches
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
                          value={`block-${b.id}`}
                          // primaryText duplicated so cmdk's fuzzy matcher
                          // weighs a hit on titles/labels above one buried
                          // in the body. summary is also high-signal so it
                          // stays at the front. secondaryText is the long
                          // body content — present but unweighted.
                          keywords={[
                            b.summary,
                            b.summary,
                            b.primaryText,
                            b.primaryText,
                            b.type,
                            b.chapterTitle,
                            b.chapterSlug,
                            b.secondaryText,
                          ]}
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
