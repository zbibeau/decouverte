'use client';

import {
  CornerDownLeft,
  FileText,
  Image as ImageIcon,
  Keyboard,
  Layers,
  ListOrdered,
  MoveVertical,
  PlayCircle,
  Plus,
  Sparkles,
} from 'lucide-react';

import { SAMPLE_PAYLOADS } from '@/lib/blockSamples';
import { BLOCK_TYPE_LABELS } from '@/lib/blockDefaults';
import { stripHtml } from '@/lib/blockSearch';
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

export function PreviewPane({ value, data, currentParcoursSlug, currentChapterTitle, scopes }: PreviewPaneProps) {
  const parsed = parseValue(value);
  if (!parsed) return <EmptyState />;

  if (parsed.kind === 'add') {
    return <AddBlockPreview type={parsed.type} chapterTitle={currentChapterTitle} />;
  }
  if (parsed.kind === 'block') {
    const block = data?.blocks.find((b) => b.id === parsed.id);
    if (!block) return <EmptyState reason="Bloc introuvable." />;
    return <BlockPreview block={block} />;
  }
  if (parsed.kind === 'chapter') {
    const chapter = data?.chapters.find((c) => c.id === parsed.id);
    if (!chapter) return <EmptyState reason="Chapitre introuvable." />;
    const blocks = (data?.blocks ?? []).filter((b) => b.chapterId === chapter.id);
    return <ChapterPreview chapter={chapter} blocks={blocks} />;
  }
  if (parsed.kind === 'parcours') {
    const parcours = data?.parcours.find((p) => p.id === parsed.id);
    if (!parcours) return <EmptyState reason="Parcours introuvable." />;
    const isCurrent = parcours.slug === currentParcoursSlug;
    return <ParcoursPreview parcours={parcours} chapters={isCurrent ? (data?.chapters ?? []) : null} />;
  }
  if (parsed.kind === 'variable') {
    const variable = data?.variables.find((v) => v.id === parsed.id);
    if (!variable) return <EmptyState reason="Variable introuvable." />;
    return <VariablePreview variable={variable} />;
  }
  if (parsed.kind === 'scope') {
    const scope = scopes.find((s) => s.id === parsed.scopeId);
    const action = scope?.actions.find((a) => a.id === parsed.actionId);
    if (!scope || !action) return <EmptyState />;
    return <ScopeActionPreview scopeLabel={scope.label} action={action} />;
  }
  return <EmptyState />;
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

// ============================================================================
// Sub-previews
// ============================================================================

function AddBlockPreview({ type, chapterTitle }: { type: string; chapterTitle: string | null }) {
  const sample = (SAMPLE_PAYLOADS as Record<string, { payload: Record<string, unknown>; description?: string }>)[type];
  const label = (BLOCK_TYPE_LABELS as Record<string, string>)[type] ?? type;
  return (
    <PreviewLayout
      header={<PreviewHeader eyebrow="Ajouter" title={label} icon={<Plus className="h-4 w-4 text-emerald-600" />} />}
      footer={
        chapterTitle ? (
          <p className="text-muted-foreground text-xs">
            Sera inséré dans : <span className="text-foreground font-medium">{chapterTitle}</span>
          </p>
        ) : null
      }
    >
      {sample?.description && <p className="text-muted-foreground mb-3 text-xs italic">{sample.description}</p>}
      <BlockPayloadSchematic type={type} payload={sample?.payload ?? {}} />
    </PreviewLayout>
  );
}

function BlockPreview({ block }: { block: PaletteBlock }) {
  const label = (BLOCK_TYPE_LABELS as Record<string, string>)[block.type] ?? block.type;
  return (
    <PreviewLayout
      header={
        <PreviewHeader
          eyebrow={`${label} · ${block.chapterTitle}`}
          title={block.summary || `Bloc ${block.type}`}
          icon={<Layers className="h-4 w-4 text-violet-600" />}
        />
      }
      footer={
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <CornerDownLeft className="h-3 w-3" /> Entrée pour ouvrir l'éditeur du bloc
        </p>
      }
    >
      <BlockPayloadSchematic type={block.type} payload={block.payload} tags={block.tags} />
    </PreviewLayout>
  );
}

function ChapterPreview({ chapter, blocks }: { chapter: PaletteChapter; blocks: PaletteBlock[] }) {
  const hasForm = blocks.some((b) => b.type === 'form');
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
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
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
          {blocks.slice(0, 12).map((b, i) => {
            const typeLabel = (BLOCK_TYPE_LABELS as Record<string, string>)[b.type] ?? b.type;
            return (
              <li key={b.id} className="flex items-start gap-2 text-sm">
                <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-medium">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mr-1.5 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                    {typeLabel}
                  </span>
                  <span className="text-foreground">{b.summary || `Bloc ${b.type}`}</span>
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

function ParcoursPreview({ parcours, chapters }: { parcours: PaletteParcours; chapters: PaletteChapter[] | null }) {
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
              <span className="text-foreground">{c.title}</span>
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

function VariablePreview({ variable }: { variable: PaletteVariable }) {
  return (
    <PreviewLayout
      header={
        <PreviewHeader
          eyebrow="Variable"
          title={variable.label || variable.key}
          icon={<ListOrdered className="h-4 w-4 text-amber-600" />}
        />
      }
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground w-16 shrink-0 text-xs uppercase">Clé</dt>
          <dd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{variable.key}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground w-16 shrink-0 text-xs uppercase">Type</dt>
          <dd>
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
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
}: {
  scopeLabel: string;
  action: { label: string; description?: string };
}) {
  return (
    <PreviewLayout
      header={
        <PreviewHeader eyebrow={scopeLabel} title={action.label} icon={<Plus className="h-4 w-4 text-emerald-600" />} />
      }
    >
      {action.description ? (
        <p className="text-foreground text-sm">{action.description}</p>
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
  title: string;
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

// ============================================================================
// Block payload schematic — per-type rendering of an arbitrary payload
// ============================================================================

function BlockPayloadSchematic({
  type,
  payload,
  tags,
}: {
  type: string;
  payload: Record<string, unknown>;
  /** Rich tags (with color) attached to this block. Only forwarded to
   *  the media schematics — other types ignore the prop. */
  tags?: { label: string; color: string }[];
}) {
  switch (type) {
    case 'heroTitle':
      return <HeroTitleSchematic payload={payload} tags={tags} />;
    case 'text':
      return <TextSchematic payload={payload} />;
    case 'video':
      return <VideoSchematic payload={payload} tags={tags} />;
    case 'keyPointsCard':
      return <KeyPointsSchematic payload={payload} />;
    case 'faqCard':
      return <FaqSchematic payload={payload} />;
    case 'card':
      return <CardSchematic payload={payload} />;
    case 'conditional':
      return <ConditionalSchematic payload={payload} />;
    case 'componentRef':
      return <ComponentRefSchematic payload={payload} />;
    case 'toolContentSection':
      return <ToolContentSchematic payload={payload} />;
    case 'form':
      return <FormSchematic payload={payload} />;
    case 'photoCarousel':
      return <PhotoCarouselSchematic payload={payload} tags={tags} />;
    default:
      return <FallbackSchematic payload={payload} />;
  }
}

// ---------------- Per-type schematics ----------------

function HeroTitleSchematic({
  payload,
  tags,
}: {
  payload: Record<string, unknown>;
  tags?: { label: string; color: string }[];
}) {
  const title = typeof payload.title === 'string' ? payload.title : '(sans titre)';
  const number = payload.number;
  const illustration = typeof payload.illustration === 'string' ? payload.illustration : null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        {typeof number === 'number' && (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-bold">#{number}</span>
        )}
        <h3 className="text-base font-semibold leading-tight">{title}</h3>
      </div>
      {illustration && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <ImageIcon className="h-3 w-3" />
          <span className="truncate font-mono">{illustration}</span>
        </p>
      )}
      <TagsRow tags={tags} />
    </div>
  );
}

function TextSchematic({ payload }: { payload: Record<string, unknown> }) {
  const html = typeof payload.html === 'string' ? payload.html : '';
  const text = stripHtml(html).trim();
  if (!text) return <Empty />;
  const truncated = text.length > 320 ? `${text.slice(0, 320)}…` : text;
  return <p className="text-foreground leading-relaxed">{truncated}</p>;
}

function VideoSchematic({
  payload,
  tags,
}: {
  payload: Record<string, unknown>;
  tags?: { label: string; color: string }[];
}) {
  const src = typeof payload.vimeoSrc === 'string' ? payload.vimeoSrc : null;
  const file = typeof payload.fileUrl === 'string' ? payload.fileUrl : null;
  return (
    <div className="space-y-2">
      <div className="border-border bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2">
        <PlayCircle className="text-muted-foreground h-5 w-5" />
        <div className="min-w-0">
          {src ? (
            <>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Vimeo</p>
              <p className="truncate font-mono text-xs">{src}</p>
            </>
          ) : file ? (
            <>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Fichier</p>
              <p className="truncate font-mono text-xs">{file}</p>
            </>
          ) : (
            <p className="text-muted-foreground text-xs italic">Vidéo sans source.</p>
          )}
        </div>
      </div>
      <TagsRow tags={tags} />
    </div>
  );
}

function KeyPointsSchematic({ payload }: { payload: Record<string, unknown> }) {
  const main = (payload.main as Record<string, unknown> | undefined) ?? {};
  const exception = payload.exception as Record<string, unknown> | undefined;
  const mainTitle = typeof main.title === 'string' ? main.title : '(sans titre)';
  const mainItems = Array.isArray(main.items) ? (main.items as { text?: string }[]) : [];
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold leading-tight">{mainTitle}</h4>
        {mainItems.length > 0 && (
          <ul className="text-foreground mt-1.5 list-inside list-disc space-y-0.5 text-sm">
            {mainItems.slice(0, 4).map((it, i) => (
              <li key={i} className="truncate">
                {it.text ?? ''}
              </li>
            ))}
            {mainItems.length > 4 && (
              <li className="text-muted-foreground list-none italic">
                + {mainItems.length - 4} autre{mainItems.length - 4 > 1 ? 's' : ''}…
              </li>
            )}
          </ul>
        )}
      </div>
      {exception && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-900">Exception</p>
          {typeof exception.title === 'string' && <p className="text-sm font-semibold">{exception.title}</p>}
        </div>
      )}
    </div>
  );
}

function FaqSchematic({ payload }: { payload: Record<string, unknown> }) {
  const qs = Array.isArray(payload.questions) ? (payload.questions as { title?: string }[]) : [];
  if (qs.length === 0) return <Empty />;
  return (
    <ol className="space-y-1.5">
      {qs.slice(0, 5).map((q, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
            ?
          </span>
          <span className="text-foreground text-sm">{q.title ?? '(sans titre)'}</span>
        </li>
      ))}
      {qs.length > 5 && (
        <li className="text-muted-foreground pl-7 text-xs italic">
          + {qs.length - 5} autre{qs.length - 5 > 1 ? 's' : ''}…
        </li>
      )}
    </ol>
  );
}

function CardSchematic({ payload }: { payload: Record<string, unknown> }) {
  const children = Array.isArray(payload.children) ? (payload.children as { type?: string }[]) : [];
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {children.length} bloc{children.length > 1 ? 's' : ''} enfant{children.length > 1 ? 's' : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {children.slice(0, 8).map((c, i) => (
          <span key={i} className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
            {(BLOCK_TYPE_LABELS as Record<string, string>)[c.type ?? ''] ?? c.type ?? '?'}
          </span>
        ))}
        {children.length > 8 && (
          <span className="text-muted-foreground text-[10px] italic">+ {children.length - 8}…</span>
        )}
      </div>
    </div>
  );
}

function ConditionalSchematic({ payload }: { payload: Record<string, unknown> }) {
  const cond = payload.condition as Record<string, unknown> | undefined;
  const thenArr = Array.isArray(payload.then) ? (payload.then as unknown[]) : [];
  const elseArr = Array.isArray(payload.else) ? (payload.else as unknown[]) : [];
  const summary = cond ? prettyCondition(cond) : '(pas de condition)';
  return (
    <div className="space-y-2">
      <div className="bg-muted text-foreground rounded-md px-3 py-2 font-mono text-xs">{summary}</div>
      <div className="text-muted-foreground flex gap-4 text-xs">
        <span>
          <strong className="text-emerald-700">Alors :</strong> {thenArr.length} bloc{thenArr.length > 1 ? 's' : ''}
        </span>
        <span>
          <strong className="text-rose-700">Sinon :</strong> {elseArr.length} bloc{elseArr.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

function prettyCondition(c: Record<string, unknown>): string {
  if (typeof c.variable === 'string' && typeof c.op === 'string') {
    return `${c.variable} ${c.op} ${JSON.stringify(c.value)}`;
  }
  if (Array.isArray(c.all)) return `tout (${(c.all as unknown[]).length} sous-conditions)`;
  if (Array.isArray(c.any)) return `au moins une (${(c.any as unknown[]).length} sous-conditions)`;
  return JSON.stringify(c);
}

function ComponentRefSchematic({ payload }: { payload: Record<string, unknown> }) {
  const name = typeof payload.name === 'string' ? payload.name : '(sans nom)';
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">Composant Solid</p>
      <p className="bg-muted mt-1 rounded px-2 py-1 font-mono text-sm">{name}</p>
    </div>
  );
}

function ToolContentSchematic({ payload }: { payload: Record<string, unknown> }) {
  const title = typeof payload.title === 'string' ? payload.title : '(sans titre)';
  const subtitle = typeof payload.subtitle === 'string' ? payload.subtitle : null;
  const advantages = Array.isArray(payload.advantagePoints) ? (payload.advantagePoints as string[]) : [];
  const children = Array.isArray(payload.children) ? (payload.children as unknown[]) : [];
  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-base font-semibold leading-tight">{title}</h4>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      {advantages.length > 0 && (
        <ul className="list-inside list-disc space-y-0.5 text-sm">
          {advantages.slice(0, 4).map((a, i) => (
            <li key={i} className="truncate">
              {a}
            </li>
          ))}
          {advantages.length > 4 && (
            <li className="text-muted-foreground list-none italic">+ {advantages.length - 4}…</li>
          )}
        </ul>
      )}
      {children.length > 0 && (
        <p className="text-muted-foreground text-xs italic">
          + {children.length} sous-bloc{children.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

function FormSchematic({ payload }: { payload: Record<string, unknown> }) {
  const title = typeof payload.title === 'string' ? payload.title : null;
  const description = typeof payload.description === 'string' ? payload.description : null;
  const fields = Array.isArray(payload.fields)
    ? (payload.fields as { label?: string; type?: string; key?: string }[])
    : [];
  return (
    <div className="space-y-2">
      {title && <h4 className="font-semibold leading-tight">{title}</h4>}
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
      <ol className="space-y-1">
        {fields.slice(0, 6).map((f, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{f.label ?? f.key ?? '(sans label)'}</span>
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
              {f.type ?? '?'}
            </span>
          </li>
        ))}
        {fields.length > 6 && (
          <li className="text-muted-foreground text-xs italic">
            + {fields.length - 6} autre{fields.length - 6 > 1 ? 's' : ''}…
          </li>
        )}
      </ol>
    </div>
  );
}

function PhotoCarouselSchematic({
  payload,
  tags,
}: {
  payload: Record<string, unknown>;
  tags?: { label: string; color: string }[];
}) {
  const photos = Array.isArray(payload.photos)
    ? (payload.photos as { url?: string; title?: string; alt?: string }[])
    : [];
  if (photos.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {photos.length} photo{photos.length > 1 ? 's' : ''}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {photos.slice(0, 4).map((p, i) => (
          <div key={i} className="border-border bg-muted relative aspect-video overflow-hidden rounded-md border">
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.url} alt={p.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
            ) : null}
            {p.title && (
              <span className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                {p.title}
              </span>
            )}
          </div>
        ))}
      </div>
      {photos.length > 4 && (
        <p className="text-muted-foreground text-xs italic">
          + {photos.length - 4} non affichée{photos.length - 4 > 1 ? 's' : ''} ici.
        </p>
      )}
      <TagsRow tags={tags} />
    </div>
  );
}

function FallbackSchematic({ payload }: { payload: Record<string, unknown> }) {
  const json = JSON.stringify(payload, null, 2);
  const truncated = json.length > 600 ? `${json.slice(0, 600)}\n…` : json;
  return <pre className="bg-muted overflow-x-auto rounded-md px-2 py-1.5 text-[11px] leading-relaxed">{truncated}</pre>;
}

function Empty() {
  return <p className="text-muted-foreground text-sm italic">Aucun contenu dans ce bloc.</p>;
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
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls.bg} ${cls.fg}`}
          >
            <span>🏷</span>
            <span>{t.label}</span>
          </span>
        );
      })}
    </div>
  );
}
