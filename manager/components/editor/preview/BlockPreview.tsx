'use client';

import type {
  CardBlock,
  ConditionalBlock,
  ContentBlock,
  FAQCardBlock,
  FormBlock,
  HeroTitleBlock,
  KeyPointsCardBlock,
  PhotoCarouselBlock,
  TextBlock,
  ToolContentSectionBlock,
  VideoBlock,
} from '@shared/content-schema';
import {
  Check,
  ChevronRight,
  GitBranch,
  HelpCircle,
  Image as ImageIcon,
  ListChecks,
  Play,
  Settings,
} from 'lucide-react';

/**
 * BlockPreview — Direction B, Lot 2 du handoff Studio Découverte.
 *
 * Rend un APERÇU statique d'un bloc, façon « papier ». Pour chaque
 * type de bloc du schema, un composant React miroir produit un visuel
 * approximativement fidèle à ce que rend le front Solid — sans
 * jamais le remplacer (le bouton « Aperçu » de la topbar reste la
 * ground truth pour le vrai rendu).
 *
 * Stratégie « React mirror » (vs mini-iframes Solid par bloc) :
 *   - Plus simple à maintenir et perf-friendly (un chapitre de 20+
 *     blocs reste léger).
 *   - Couplage avec la sélection / drag-and-drop / hover plus naturel
 *     (Lot 3).
 *   - Limite : un fork visuel à entretenir si le front Solid évolue.
 *     Acceptable tant qu'on vise une fidélité « raisonnable » et pas
 *     pixel-perfect.
 *
 * Le composant est PURE READ — aucun handler d'édition. La sélection
 * / mini-toolbar / chip de type viendront en Lot 3 dans la row qui
 * embarque le BlockPreview.
 */
export function BlockPreview({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  switch (type) {
    case 'heroTitle':
      return <HeroTitlePreview p={payload as HeroTitleBlock['payload']} />;
    case 'text':
      return <TextPreview p={payload as TextBlock['payload']} />;
    case 'video':
      return <VideoPreview p={payload as VideoBlock['payload']} />;
    case 'form':
      return <FormPreview p={payload as FormBlock['payload']} />;
    case 'conditional':
      return <ConditionalPreview p={payload as ConditionalBlock['payload']} />;
    case 'card':
      return <CardPreview p={payload as CardBlock['payload']} />;
    case 'photoCarousel':
      return <PhotoCarouselPreview p={payload as PhotoCarouselBlock['payload']} />;
    case 'keyPointsCard':
      return <KeyPointsCardPreview p={payload as KeyPointsCardBlock['payload']} />;
    case 'faqCard':
      return <FaqCardPreview p={payload as FAQCardBlock['payload']} />;
    case 'toolContentSection':
      return <ToolContentSectionPreview p={payload as ToolContentSectionBlock['payload']} />;
    case 'componentRef':
      return <ComponentRefPreview p={payload as { name: string; props?: Record<string, unknown> }} />;
    default:
      return <UnknownPreview type={type} />;
  }
}

/* ============================================================
 * heroTitle — gros bloc violet immersif avec n° + titre + section.
 * Miroir lite du Hero.tsx Solid.
 * ============================================================ */
function HeroTitlePreview({ p }: { p: HeroTitleBlock['payload'] }) {
  return (
    <div className="bg-brand-primary-400 relative overflow-hidden rounded-2xl px-6 py-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="flex flex-col gap-3">
          {p.sectionTitle && (
            <span className="text-xs font-bold uppercase tracking-wider text-violet-900/80">{p.sectionTitle}</span>
          )}
          {p.number !== undefined && (
            <span className="bg-brand-primary-900 inline-flex h-12 w-12 -rotate-[4deg] items-center justify-center rounded-xl text-3xl font-semibold text-white shadow-[0_8px_18px_-6px_rgba(40,10,80,0.6)]">
              {p.number}
            </span>
          )}
          <h2 className="max-w-md text-2xl font-bold leading-tight text-white md:text-3xl">{p.title}</h2>
        </div>
        {p.illustration && (
          <div className="hidden h-32 w-32 shrink-0 -rotate-2 overflow-hidden rounded-2xl shadow-[0_20px_40px_-15px_rgba(40,10,80,0.7)] ring-1 ring-white/25 md:block">
            <img src={p.illustration} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * text — HTML prose
 * ============================================================ */
function TextPreview({ p }: { p: TextBlock['payload'] }) {
  // Strip <script>/<style> as defense en profondeur — la prod côté
  // front Solid les ignore aussi, mais on évite tout JS embarqué qui
  // s'exécuterait dans le contexte du manager.
  const html = (p.html ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  return (
    <div
      className="prose prose-sm dark:prose-invert text-text max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_p]:leading-relaxed"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html || '<p class="text-text-faint italic">Paragraphe vide</p>' }}
    />
  );
}

/* ============================================================
 * video — placeholder Vimeo
 * ============================================================ */
function VideoPreview({ p }: { p: VideoBlock['payload'] }) {
  const id = p.vimeoSrc?.match(/vimeo\/(\d+)/i)?.[1] ?? p.vimeoSrc ?? '';
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-950">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
        <div className="bg-primary/90 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg">
          <Play className="ml-1 h-6 w-6 fill-white" />
        </div>
        <div className="text-center">
          {p.managerTitle && <p className="text-sm font-semibold">{p.managerTitle}</p>}
          <p className="font-mono text-[11px] text-white/60">Vimeo · {id || '(source manquante)'}</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * form — questionnaire stylisé
 * ============================================================ */
function FormPreview({ p }: { p: FormBlock['payload'] }) {
  return (
    <div className="border-primary/20 dark:border-primary/30 rounded-2xl border bg-gradient-to-br from-amber-50/30 to-orange-50/30 p-6 dark:from-amber-950/20 dark:to-orange-950/20">
      <div className="mb-4">
        {p.icon && (
          <div className="bg-primary/10 mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg">
            <Check className="text-primary h-5 w-5" />
          </div>
        )}
        {p.title && <h3 className="text-text mb-1 text-lg font-bold">{p.title}</h3>}
        {p.description && <p className="text-text-muted text-sm">{p.description}</p>}
      </div>
      <div className="flex flex-col gap-2.5">
        {(p.fields ?? []).slice(0, 5).map((f, i) => (
          <div
            key={i}
            className="border-border bg-surface flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
          >
            <span className="text-text text-sm font-medium">{f.label}</span>
            <FieldPreview field={f} />
          </div>
        ))}
        {(p.fields?.length ?? 0) > 5 && (
          <p className="text-text-faint text-center text-[11px]">+ {(p.fields?.length ?? 0) - 5} autre(s) champ(s)</p>
        )}
      </div>
      <button
        type="button"
        disabled
        className="bg-brand-primary-600 mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white opacity-90"
        tabIndex={-1}
      >
        {p.nextButtonText ?? 'Continuer'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function FieldPreview({ field }: { field: FormBlock['payload']['fields'][number] }) {
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-text-muted">Non</span>
        <span className="bg-text-faint relative h-4 w-7 rounded-full">
          <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white" />
        </span>
        <span className="text-text-muted">Oui</span>
      </div>
    );
  }
  if (field.type === 'enum') {
    const first = field.options?.[0]?.label ?? '(choisir)';
    return <span className="bg-surface-2 text-text-muted rounded-md px-2 py-1 text-xs">{first}</span>;
  }
  return <span className="text-text-faint text-xs italic">{field.placeholder ?? '...'}</span>;
}

/* ============================================================
 * conditional — onglets Alors/Sinon + résumé condition
 * ============================================================ */
function ConditionalPreview({ p }: { p: ConditionalBlock['payload'] }) {
  const summary = summarizeCondition(p.condition);
  const thenCount = p.then?.length ?? 0;
  const elseCount = p.else?.length ?? 0;
  return (
    <div className="border-border bg-surface-2 rounded-xl border p-4">
      <div className="text-text-muted mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
        <GitBranch className="h-3 w-3" />
        Condition
      </div>
      <code className="bg-surface border-border text-text mb-3 inline-block rounded-md border px-2 py-1 font-mono text-xs">
        {summary}
      </code>
      <div className="grid grid-cols-2 gap-2">
        <div className="border-primary/30 bg-primary/5 rounded-lg border-l-2 p-2.5">
          <div className="text-text-muted mb-1 text-[10px] font-semibold uppercase tracking-wider">✓ Alors</div>
          <div className="text-text-faint text-xs">
            {thenCount} bloc{thenCount > 1 ? 's' : ''}
          </div>
        </div>
        <div className="border-muted bg-muted/20 rounded-lg border-l-2 p-2.5">
          <div className="text-text-muted mb-1 text-[10px] font-semibold uppercase tracking-wider">✗ Sinon</div>
          <div className="text-text-faint text-xs">
            {elseCount} bloc{elseCount > 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function summarizeCondition(c: ConditionalBlock['payload']['condition']): string {
  if (!c) return '(aucune condition)';
  if ('all' in c) return `(${c.all.map(summarizeCondition).join(' ET ')})`;
  if ('any' in c) return `(${c.any.map(summarizeCondition).join(' OU ')})`;
  if ('variable' in c) {
    const val = Array.isArray(c.value) ? c.value.join(', ') : String(c.value);
    return `${c.variable} ${c.op} ${val}`;
  }
  return '(?)';
}

/* ============================================================
 * card — image cover + nb d'enfants
 * ============================================================ */
function CardPreview({ p }: { p: CardBlock['payload'] }) {
  const count = (p.children ?? []).length;
  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      {p.image && (
        <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img src={p.image} alt={p.imageAlt ?? ''} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="text-text-muted flex items-center gap-2 p-4 text-xs">
        <ImageIcon className="text-primary h-4 w-4" />
        <span className="font-semibold">Card</span>
        <span className="text-text-faint">·</span>
        <span>
          {count} sous-bloc{count > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
 * photoCarousel — grille de photos
 * ============================================================ */
function PhotoCarouselPreview({ p }: { p: PhotoCarouselBlock['payload'] }) {
  const photos = (p.photos ?? []).slice(0, 4);
  return (
    <div className="bg-surface-2 rounded-xl p-3">
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, i) => (
          <div key={i} className="bg-surface-3 relative aspect-video overflow-hidden rounded-lg ring-1 ring-black/5">
            {photo.url ? (
              <img src={photo.url} alt={photo.alt ?? ''} className="h-full w-full object-cover" />
            ) : (
              <div className="text-text-faint flex h-full w-full items-center justify-center text-[10px]">
                (pas d'URL)
              </div>
            )}
            {photo.title && (
              <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-[10px] font-medium text-white">
                {photo.title}
              </div>
            )}
          </div>
        ))}
      </div>
      {(p.photos?.length ?? 0) > 4 && (
        <p className="text-text-faint mt-2 text-center text-[11px]">
          + {(p.photos?.length ?? 0) - 4} autre(s) photo(s)
        </p>
      )}
    </div>
  );
}

/* ============================================================
 * keyPointsCard — header + checklist
 * ============================================================ */
function KeyPointsCardPreview({ p }: { p: KeyPointsCardBlock['payload'] }) {
  const items = p.main?.items ?? [];
  return (
    <div className="border-border bg-surface rounded-xl border p-5">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="text-primary h-5 w-5" />
        <h3 className="text-text text-base font-bold">{p.main?.title ?? 'Points clés'}</h3>
      </div>
      {p.main?.description && <p className="text-text-muted mb-3 text-sm">{p.main.description}</p>}
      <ul className="flex flex-col gap-2">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="bg-primary/15 text-primary mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
              <Check className="h-3 w-3" />
            </span>
            <span className="text-text">{item.text}</span>
          </li>
        ))}
      </ul>
      {items.length > 5 && <p className="text-text-faint mt-2 text-[11px]">+ {items.length - 5} autre(s) point(s)</p>}
      {(p.groups?.length ?? 0) > 0 && (
        <p className="text-text-faint mt-3 text-[11px]">+ {p.groups!.length} groupe(s) conditionnel(s)</p>
      )}
    </div>
  );
}

/* ============================================================
 * faqCard — accordéon
 * ============================================================ */
function FaqCardPreview({ p }: { p: FAQCardBlock['payload'] }) {
  const questions = p.questions ?? [];
  return (
    <div className="border-border bg-surface rounded-xl border p-5">
      <div className="mb-3 flex items-center gap-2">
        <HelpCircle className="text-primary h-5 w-5" />
        <h3 className="text-text text-base font-bold">Questions fréquentes</h3>
      </div>
      <div className="flex flex-col gap-2">
        {questions.slice(0, 4).map((q, i) => (
          <div key={i} className="bg-surface-2 ring-border flex items-center gap-2.5 rounded-lg p-2.5 ring-1">
            <span className="bg-primary/15 text-primary inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-lg font-bold leading-none">
              +
            </span>
            <span className="text-text truncate text-sm font-medium">{q.title}</span>
          </div>
        ))}
      </div>
      {questions.length > 4 && (
        <p className="text-text-faint mt-2 text-[11px]">+ {questions.length - 4} autre(s) question(s)</p>
      )}
    </div>
  );
}

/* ============================================================
 * toolContentSection — header + vidéo + bloc avantages
 * ============================================================ */
function ToolContentSectionPreview({ p }: { p: ToolContentSectionBlock['payload'] }) {
  const advCount = p.advantagePoints?.length ?? 0;
  const childCount = (p.children as ContentBlock[] | undefined)?.length ?? 0;
  return (
    <div className="border-border bg-surface space-y-3 rounded-xl border p-5">
      <div>
        {p.title && <h3 className="text-text text-lg font-bold">{p.title}</h3>}
        {p.subtitle && <p className="text-text-muted text-sm">{p.subtitle}</p>}
      </div>
      {p.video && (
        <div className="bg-surface-2 flex aspect-video items-center justify-center rounded-lg">
          <div className="text-text-faint flex items-center gap-2 text-xs">
            <Play className="h-4 w-4" />
            Vidéo {p.video.kind === 'branchOnPersonWhoHandleCalls' ? '(3 variantes)' : 'inline'}
          </div>
        </div>
      )}
      {p.advantageTitle && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
          <p className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-200">{p.advantageTitle}</p>
          {advCount > 0 ? (
            <p className="text-xs text-amber-800/70 dark:text-amber-300/70">
              {advCount} point{advCount > 1 ? 's' : ''} clé{advCount > 1 ? 's' : ''}
            </p>
          ) : p.advantageText ? (
            <p className="line-clamp-2 text-xs text-amber-800/70 dark:text-amber-300/70">{p.advantageText}</p>
          ) : null}
        </div>
      )}
      {childCount > 0 && (
        <p className="text-text-faint text-[11px]">
          + {childCount} sous-bloc{childCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

/* ============================================================
 * componentRef — escape hatch labellisé
 * ============================================================ */
function ComponentRefPreview({ p }: { p: { name: string; props?: Record<string, unknown> } }) {
  return (
    <div className="border-border bg-surface-2 rounded-xl border-2 border-dashed p-5">
      <div className="text-text-muted mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
        <Settings className="h-3 w-3" />
        Composant custom
      </div>
      <code className="bg-surface border-border text-text inline-block rounded-md border px-2 py-1 font-mono text-sm">
        {p.name || '(nom manquant)'}
      </code>
    </div>
  );
}

/* ============================================================
 * Unknown — fallback pour les types non gérés
 * ============================================================ */
function UnknownPreview({ type }: { type: string }) {
  return (
    <div className="border-border bg-surface-2 rounded-xl border-2 border-dashed p-5 text-center">
      <p className="text-text-muted font-mono text-xs">Type inconnu : « {type} »</p>
      <p className="text-text-faint mt-1 text-[10px]">Aucun aperçu disponible</p>
    </div>
  );
}
