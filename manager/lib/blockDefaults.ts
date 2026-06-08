import type { ContentBlock, FAQQuestionContent } from '@shared/content-schema';

/**
 * Blank payloads used when creating a new block (server action OR client editor).
 * Shape must match the corresponding TypeScript type in `shared/content-schema.ts`.
 */
export const BLANK_PAYLOADS: Record<ContentBlock['type'], Record<string, unknown>> = {
  text: { html: '', variant: 'default' },
  video: { vimeoSrc: 'vimeo/XXXXXX?hash=XXXXXX' },
  heroTitle: { title: 'Titre du chapitre', number: 1 },
  keyPointsCard: {
    main: { title: 'Titre principal', items: [] },
  },
  faqCard: { questions: [] },
  card: { children: [] },
  conditional: {
    condition: { variable: '', op: '=', value: '' },
    then: [],
    else: [],
  },
  componentRef: { name: 'HomeTool1_Summary' },
  toolContentSection: {
    title: 'Titre de la section',
    subtitle: '',
    advantageTitle: 'Les avantages',
    advantagePoints: [],
  },
  form: {
    title: 'Pour une démo personnalisée',
    description: 'Merci de répondre à ces quelques questions :',
    icon: 'icon-check-line',
    fields: [],
    nextButtonText: 'Continuer',
  },
  photoCarousel: {
    photos: [],
    aspectRatio: '16/9',
  },
};

/** Produce a blank ContentBlock for a given type. */
export function blankBlock(type: ContentBlock['type']): ContentBlock {
  return { type, payload: JSON.parse(JSON.stringify(BLANK_PAYLOADS[type])) } as ContentBlock;
}

export const BLANK_FAQ_CONTENTS: Record<FAQQuestionContent['kind'], FAQQuestionContent> = {
  text: { kind: 'text', html: '' },
  list: { kind: 'list', items: [] },
  audio: { kind: 'audio', url: '' },
  callout: { kind: 'callout', html: '' },
  conditional: {
    kind: 'conditional',
    condition: { variable: '', op: '=', value: '' },
    then: [],
    else: [],
  },
};

export function blankFaqContent(kind: FAQQuestionContent['kind']): FAQQuestionContent {
  return JSON.parse(JSON.stringify(BLANK_FAQ_CONTENTS[kind]));
}

export const BLOCK_TYPE_LABELS: Record<ContentBlock['type'], string> = {
  heroTitle: 'Hero (titre)',
  video: 'Vidéo',
  text: 'Texte',
  keyPointsCard: 'Key points',
  faqCard: 'FAQ',
  card: 'Card',
  conditional: 'Conditionnel',
  componentRef: 'Composant custom',
  toolContentSection: 'Tool content section',
  form: 'Formulaire',
  photoCarousel: 'Carrousel photos',
};

export const BLOCK_TYPES_ORDER: ContentBlock['type'][] = [
  'heroTitle',
  'video',
  'photoCarousel',
  'text',
  'keyPointsCard',
  'faqCard',
  'card',
  'form',
  'conditional',
  'componentRef',
  'toolContentSection',
];

/**
 * Categorisation used by the `<AddGallery>` modal (cf. Direction C
 * refonte, Lot 2). Each block type belongs to exactly one category,
 * and categories are rendered in `BLOCK_CATEGORY_ORDER` so the
 * editor's eye sweeps top-to-bottom from "structure first" to "edge
 * cases last". A new block type added later MUST be appended here ;
 * the TypeScript record type makes the omission a compile error.
 */
export type BlockCategory = 'Structure' | 'Contenu' | 'Média' | 'Conteneur' | 'Logique' | 'Conversion' | 'Avancé';

export const BLOCK_CATEGORY_ORDER: BlockCategory[] = [
  'Structure',
  'Contenu',
  'Média',
  'Conteneur',
  'Logique',
  'Conversion',
  'Avancé',
];

export const BLOCK_CATEGORIES: Record<ContentBlock['type'], BlockCategory> = {
  heroTitle: 'Structure',
  text: 'Contenu',
  keyPointsCard: 'Contenu',
  faqCard: 'Contenu',
  toolContentSection: 'Contenu',
  video: 'Média',
  photoCarousel: 'Média',
  card: 'Conteneur',
  conditional: 'Logique',
  form: 'Conversion',
  componentRef: 'Avancé',
};

/**
 * Tailwind classes for the colored LEFT BAND rendered on every block
 * row — visual key matching the category. Lets the editor scan a long
 * chapter and instantly see "where the conditionals are", "where the
 * media is", etc., without reading the eyebrow label. Mirrors the
 * accent system in `Section` (cf. `manager/components/blocks/Field.tsx`).
 *
 * Pattern : `border-l-2 border-l-<color>`. The width is small (2 px)
 * so the band reads as a margin signal, not as a chunky frame — keeps
 * the row chrome clean while adding the type cue.
 */
export const BLOCK_CATEGORY_ACCENT: Record<BlockCategory, string> = {
  Structure: 'border-l-rose-400',
  Contenu: 'border-l-slate-400',
  Média: 'border-l-emerald-400',
  Conteneur: 'border-l-violet-400',
  Logique: 'border-l-amber-400',
  Conversion: 'border-l-sky-400',
  Avancé: 'border-l-zinc-500',
};

/**
 * Short single-character glyphs used as the visual stamp on each
 * `<AddGallery>` item. Picked to feel like a typographic symbol
 * rather than an emoji — the manager already uses Lucide icons
 * extensively, the glyph is intentionally distinct as the "type
 * mark". Mirrors the prototype's `editor.jsx` glyphs.
 */
export const BLOCK_TYPE_GLYPHS: Record<ContentBlock['type'], string> = {
  heroTitle: 'H',
  text: '¶',
  keyPointsCard: '◆',
  faqCard: '▦',
  toolContentSection: '❖',
  video: '▶',
  photoCarousel: '◫',
  card: '▤',
  conditional: '⎇',
  form: '✎',
  componentRef: '⚙',
};
