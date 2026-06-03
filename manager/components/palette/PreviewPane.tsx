'use client';

import { CornerDownLeft, FileText, Keyboard, Layers, ListOrdered, MoveVertical, Plus, Sparkles } from 'lucide-react';

import { useMemo } from 'react';

import { LivePreviewIframe } from '@/components/palette/LivePreviewIframe';
import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { TAG_COLOR_CLASSES, isTagColor } from '@/lib/tagColors';
import type { PaletteBlock, PaletteChapter, PaletteData, PaletteParcours, PaletteVariable } from '@/lib/actions';

/**
 * Right-hand "preview pane" of the command palette. Reads the value of
 * the row currently highlighted in cmdk (via `<Command value=...
 * onValueChange=...>`) and renders a schematic of what that row points
 * to — sample payload for "+ Add block", block content for a block row,
 * chapter contents for a chapter row, etc.
 *
 * Goal : let the visitor *see* what they're about to click on before
 * pressing Enter — without booting the actual Solid front (which would
 * be way too heavy for hover/keyboard navigation).
 */
type AddActionScope = {
  id: string;
  label: string;
  actions: { id: string; label: string; description?: string }[];
};

interface PreviewPaneProps {
  /** Currently highlighted row's `value` (e.g. "block-abc", "add-text", "chapter-xyz"). */
  value: string;
  data: PaletteData | null;
  /** Parcours slug of the current context. Used to decide whether
   *  parcours rows point to the parcours we already have data for. */
  currentParcoursSlug: string | null;
  /** Optional chapter title used in the "+ Add block" preview footer
   *  to remind the user where the block will be inserted. */
  currentChapterTitle: string | null;
  /** Scope actions registered by nested editors — the palette router
   *  needs them to render the right preview for `scope-*` values. */
  scopes: AddActionScope[];
  /** Current ⌘K search query — propagated from the palette so the
   *  schematic previews (chapter / parcours / variable / scope) can
   *  highlight matching substrings in their text content. The block
   *  / add iframe previews are unaffected (the rendered block is
   *  shown live, search highlights would require postMessage tricks
   *  inside the iframe — out of scope for v1). */
  search?: string;
}

type ParsedValue =
  | { kind: 'add'; type: string }
  | { kind: 'block'; id: string }
  | { kind: 'chapter'; id: string }
  | { kind: 'parcours'; id: string }
  | { kind: 'variable'; id: string }
  | { kind: 'scope'; scopeId: string; actionId: string }
  | null;

function parseValue(v: string): ParsedValue {
  if (!v) return null;
  // scope-<scopeId>-<actionId> — scopeId may itself contain dashes ;
  // we anchor on the literal "scope-" prefix and split actionId off
  // by reading the LAST dash-segment from the right (action IDs in
  // AddActionsContext are short, no dashes).
  if (v.startsWith('scope-')) {
    const rest = v.slice('scope-'.length);
    const lastDash = rest.lastIndexOf('-');
    if (lastDash === -1) return null;
    return {
      kind: 'scope',
      scopeId: rest.slice(0, lastDash),
      actionId: rest.slice(lastDash + 1),
    };
  }
  if (v.startsWith('add-')) return { kind: 'add', type: v.slice('add-'.length) };
  if (v.startsWith('block-')) return { kind: 'block', id: v.slice('block-'.length) };
  if (v.startsWith('chapter-')) return { kind: 'chapter', id: v.slice('chapter-'.length) };
  if (v.startsWith('parcours-')) return { kind: 'parcours', id: v.slice('parcours-'.length) };
  if (v.startsWith('var-')) return { kind: 'variable', id: v.slice('var-'.length) };
  return null;
}

// ============================================================================
// Top-level router
// ============================================================================

export function PreviewPane({
  value,
  data,
  currentParcoursSlug,
  currentChapterTitle,
  scopes,
  search,
}: PreviewPaneProps) {
  const parsed = parseValue(value);

  // ─── Live preview mode (block / add-block rows) ────────────────────
  // Compute the block to show in the iframe. The iframe itself is
  // ALWAYS rendered while PreviewPane is mounted (= while the palette
  // is open) so the Solid app boots once and is reused across rows.
  // When `liveBlock` is null, the iframe wrapper is hidden via
  // `display:none` but stays in the DOM — boot state is preserved.
  const liveBlock = useMemo<{ type: string; payload: Record<string, unknown> } | null>(() => {
    if (parsed?.kind === 'add') {
      const sample = (SAMPLE_PAYLOADS as Record<string, { payload: Record<string, unknown> }>)[parsed.type];
      return sample ? { type: parsed.type, payload: sample.payload } : null;
    }
    if (parsed?.kind === 'block') {
      const b = data?.blocks.find((bl) => bl.id === parsed.id);
      return b ? { type: b.type, payload: b.payload } : null;
    }
    return null;
  }, [parsed, data]);

  // Header + footer info for the iframe mode — recomputed only when
  // the parsed value changes.
  const liveHeader = useMemo(() => {
    if (parsed?.kind === 'add') {
      const label = (BLOCK_TYPE_LABELS as Record<string, string>)[parsed.type] ?? parsed.type;
      return (
        <PreviewHeader
          eyebrow="Ajouter"
          title={label}
          icon={<Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        />
      );
    }
    if (parsed?.kind === 'block') {
      const b = data?.blocks.find((bl) => bl.id === parsed.id);
      if (!b) return null;
      const label = (BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type;
      return (
        <PreviewHeader
          eyebrow={`${label} · ${b.chapterTitle}`}
          title={b.summary || `Bloc ${b.type}`}
          icon={<Layers className="h-4 w-4 text-violet-600 dark:text-violet-300" />}
        />
      );
    }
    return null;
  }, [parsed, data]);

  const liveFooter = useMemo(() => {
    if (parsed?.kind === 'add' && currentChapterTitle) {
      return (
        <p className="text-muted-foreground text-xs">
          Sera inséré dans : <span className="text-foreground font-medium">{currentChapterTitle}</span>
        </p>
      );
    }
    if (parsed?.kind === 'block') {
      return (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <CornerDownLeft className="h-3 w-3" /> Entrée pour ouvrir l&apos;éditeur du bloc
        </p>
      );
    }
    return null;
  }, [parsed, currentChapterTitle]);

  // ─── Schematic mode (chapter / parcours / variable / scope) ─────────
  // Resolved sub-preview rendered only when the iframe isn't in use.
  // Each branch falls back to EmptyState when the referenced item
  // isn't found in `data` (stale rows, deleted entities, etc.).
  let schematic: React.ReactNode = null;
  if (!liveBlock) {
    if (!parsed) {
      schematic = <EmptyState />;
    } else if (parsed.kind === 'chapter') {
      const chapter = data?.chapters.find((c) => c.id === parsed.id);
      if (!chapter) schematic = <EmptyState reason="Chapitre introuvable." />;
      else {
        const blocks = (data?.blocks ?? []).filter((b) => b.chapterId === chapter.id);
        schematic = <ChapterPreview chapter={chapter} blocks={blocks} search={search} />;
      }
    } else if (parsed.kind === 'parcours') {
      const parcours = data?.parcours.find((p) => p.id === parsed.id);
      if (!parcours) schematic = <EmptyState reason="Parcours introuvable." />;
      else {
        const isCurrent = parcours.slug === currentParcoursSlug;
        schematic = (
          <ParcoursPreview parcours={parcours} chapters={isCurrent ? (data?.chapters ?? []) : null} search={search} />
        );
      }
    } else if (parsed.kind === 'variable') {
      const variable = data?.variables.find((v) => v.id === parsed.id);
      if (!variable) schematic = <EmptyState reason="Variable introuvable." />;
      else schematic = <VariablePreview variable={variable} search={search} />;
    } else if (parsed.kind === 'scope') {
      const scope = scopes.find((s) => s.id === parsed.scopeId);
      const action = scope?.actions.find((a) => a.id === parsed.actionId);
      if (!scope || !action) schematic = <EmptyState />;
      else schematic = <ScopeActionPreview scopeLabel={scope.label} action={action} search={search} />;
    } else {
      schematic = <EmptyState />;
    }
  }

  return (
    <>
      {/* Live preview block — iframe is ALWAYS rendered (hidden via
          `display:none` when not in use) so the Solid app boots once
          per palette session and only the postMessage payload
          changes on subsequent highlights. */}
      <div className={liveBlock ? 'flex h-full flex-col overflow-hidden' : 'hidden'}>
        {liveHeader && <div className="border-border border-b px-4 py-3">{liveHeader}</div>}
        <div className="bg-muted/10 flex-1 overflow-hidden">
          <LivePreviewIframe block={liveBlock} className="h-full w-full border-0" />
        </div>
        {liveFooter && <div className="border-border bg-muted/30 border-t px-4 py-2">{liveFooter}</div>}
      </div>

      {/* Schematic preview for non-block rows — re-mounted as the
          highlighted row changes (these aren't expensive enough to
          warrant the persistent-mount trick). */}
      {schematic}
    </>
  );
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({ reason }: { reason?: string }) {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Keyboard className="h-8 w-8 opacity-50" />
      <p className="text-sm">{reason ?? 'Survole un résultat pour voir un aperçu.'}</p>
      <p className="flex items-center gap-2 text-[11px]">
        <MoveVertical className="h-3 w-3" />
        <span>↑↓ pour naviguer · ↵ pour valider</span>
      </p>
    </div>
  );
}

/**
 * Wraps every occurrence of `query` in `text` with a yellow `<mark>`.
 * Used by the schematic previews (chapter / parcours / variable /
 * scope) to make the matched substring pop wherever it appears in
 * the preview content. Case-insensitive, preserves original casing.
 * Returns the plain string when the query is empty or doesn't match.
 */
function Highlighted({ text, query }: { text: string; query?: string }) {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(q, cursor);
    if (idx === -1) {
      parts.push(text.slice(cursor));
      break;
    }
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <mark
        key={`h-${idx}`}
        className="rounded-sm bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-800/60 dark:text-amber-100"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    cursor = idx + q.length;
  }
  return <>{parts}</>;
}

// ============================================================================
// Sub-previews
// ============================================================================
// Block previews go through a persistent <LivePreviewIframe> (see the
// top-level component above) ; only the non-block rows (chapter /
// parcours / variable / scope) still render their schematic helper
// below.

function ChapterPreview({
  chapter,
  blocks,
  search,
}: {
  chapter: PaletteChapter;
  blocks: PaletteBlock[];
  search?: string;
}) {
  const hasForm = blocks.some((b) => b.type === 'form');
  // Sort matching blocks to the top when a search is active — the
  // user is auditing, the relevant blocks should be the first thing
  // they see.
  const sortedBlocks = useMemo(() => {
    const q = (search ?? '').trim().toLowerCase();
    if (!q) return blocks;
    const matches: PaletteBlock[] = [];
    const others: PaletteBlock[] = [];
    for (const b of blocks) {
      if (b.searchText.includes(q)) matches.push(b);
      else others.push(b);
    }
    return [...matches, ...others];
  }, [blocks, search]);
  return (
    <PreviewLayout
      header={
        <PreviewHeader
          eyebrow="Chapitre"
          title={chapter.title}
          icon={<FileText className="text-primary h-4 w-4" />}
          rightChip={<SlugChip slug={chapter.slug} />}
        />
      }
      footer={
        <p className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            {blocks.length} bloc{blocks.length > 1 ? 's' : ''}
          </span>
          {hasForm && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
              <Sparkles className="h-3 w-3" /> Form
            </span>
          )}
        </p>
      }
    >
      {blocks.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">Ce chapitre n'a pas encore de bloc.</p>
      ) : (
        <ol className="space-y-1.5">
          {sortedBlocks.slice(0, 12).map((b, i) => {
            const typeLabel = (BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type;
            const q = (search ?? '').trim().toLowerCase();
            const isMatch = q ? b.searchText.includes(q) : false;
            return (
              <li
                key={b.id}
                className={`flex items-start gap-2 text-sm ${isMatch ? '-mx-1 rounded bg-amber-50/70 px-1 dark:bg-amber-950/30' : ''}`}
              >
                <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mr-1.5 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                    {typeLabel}
                  </span>
                  <span className="text-foreground">
                    <Highlighted text={b.summary || `Bloc ${b.type}`} query={search} />
                  </span>
                </span>
              </li>
            );
          })}
          {blocks.length > 12 && (
            <li className="text-muted-foreground pl-7 text-xs italic">
              + {blocks.length - 12} autre{blocks.length - 12 > 1 ? 's' : ''}…
            </li>
          )}
        </ol>
      )}
      {/* Tags on the chapter's card_image, if any — same chip look as
          on media blocks, separated by a thin top border so the eye
          parses them as a metadata footer of the chapter. */}
      <TagsRow tags={chapter.tags} />
    </PreviewLayout>
  );
}

function ParcoursPreview({
  parcours,
  chapters,
  search,
}: {
  parcours: PaletteParcours;
  chapters: PaletteChapter[] | null;
  search?: string;
}) {
  return (
    <PreviewLayout
      header={
        <PreviewHeader
          eyebrow="Parcours"
          title={parcours.name}
          icon={<Sparkles className="h-4 w-4 text-rose-600" />}
          rightChip={<SlugChip slug={parcours.slug} />}
        />
      }
      footer={
        chapters ? (
          <p className="text-muted-foreground text-xs">
            {chapters.length} chapitre{chapters.length > 1 ? 's' : ''} chargé{chapters.length > 1 ? 's' : ''}
          </p>
        ) : (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <CornerDownLeft className="h-3 w-3" /> Entrée pour ouvrir ce parcours
          </p>
        )
      }
    >
      {chapters === null ? (
        <p className="text-muted-foreground text-sm italic">Ouvre ce parcours pour voir le détail de ses chapitres.</p>
      ) : chapters.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">Ce parcours n'a pas encore de chapitre.</p>
      ) : (
        <ol className="space-y-1.5">
          {chapters.slice(0, 14).map((c, i) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium">
                {i + 1}
              </span>
              <span className="text-foreground">
                <Highlighted text={c.title} query={search} />
              </span>
            </li>
          ))}
          {chapters.length > 14 && (
            <li className="text-muted-foreground pl-7 text-xs italic">
              + {chapters.length - 14} autre{chapters.length - 14 > 1 ? 's' : ''}…
            </li>
          )}
        </ol>
      )}
    </PreviewLayout>
  );
}

function VariablePreview({ variable, search }: { variable: PaletteVariable; search?: string }) {
  return (
    <PreviewLayout
      header={
        <PreviewHeader
          eyebrow="Variable"
          title={<Highlighted text={variable.label || variable.key} query={search} />}
          icon={<ListOrdered className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        />
      }
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground w-16 shrink-0 text-xs uppercase">Clé</dt>
          <dd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            <Highlighted text={variable.key} query={search} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground w-16 shrink-0 text-xs uppercase">Type</dt>
          <dd>
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
              {variable.type}
            </span>
          </dd>
        </div>
      </dl>
    </PreviewLayout>
  );
}

function ScopeActionPreview({
  scopeLabel,
  action,
  search,
}: {
  scopeLabel: string;
  action: { label: string; description?: string };
  search?: string;
}) {
  return (
    <PreviewLayout
      header={
        <PreviewHeader
          eyebrow={scopeLabel}
          title={<Highlighted text={action.label} query={search} />}
          icon={<Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        />
      }
    >
      {action.description ? (
        <p className="text-foreground text-sm">
          <Highlighted text={action.description} query={search} />
        </p>
      ) : (
        <p className="text-muted-foreground text-sm italic">Action sans description.</p>
      )}
    </PreviewLayout>
  );
}

// ============================================================================
// Layout primitives (header / footer wrapper)
// ============================================================================

function PreviewLayout({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-border border-b px-4 py-3">{header}</div>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">{children}</div>
      {footer && <div className="border-border bg-muted/30 border-t px-4 py-2">{footer}</div>}
    </div>
  );
}

function PreviewHeader({
  eyebrow,
  title,
  icon,
  rightChip,
}: {
  eyebrow: string;
  /** Accepts either a plain string or a React node so callers can
   *  pass `<Highlighted ...>` to mark a matched substring. */
  title: React.ReactNode;
  icon: React.ReactNode;
  rightChip?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground truncate text-[10px] uppercase tracking-wide">{eyebrow}</p>
        <p className="text-foreground truncate text-sm font-semibold">{title}</p>
      </div>
      {rightChip}
    </div>
  );
}

function SlugChip({ slug }: { slug: string }) {
  return (
    <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">{slug}</span>
  );
}

/**
 * Tiny row of colored chips rendered at the bottom of media-block
 * schematics (`video`, `heroTitle`, `photoCarousel`). Surfaces the
 * maintenance tags attached to the block (with their palette color)
 * so the auditor immediately sees what the row covers ("fiche
 * patient", "agenda", …). Returns null on empty so it doesn't add
 * an empty row.
 */
function TagsRow({ tags }: { tags?: { label: string; color: string }[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="border-border mt-3 flex flex-wrap gap-1 border-t pt-2">
      {tags.map((t) => {
        const cls = TAG_COLOR_CLASSES[isTagColor(t.color) ? t.color : 'amber'];
        return (
          <span
            key={t.label}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls.bg} ${cls.fg} ${cls.darkBg} ${cls.darkFg}`}
          >
            <span>🏷</span>
            <span>{t.label}</span>
          </span>
        );
      })}
    </div>
  );
}
