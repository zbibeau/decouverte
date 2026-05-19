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
