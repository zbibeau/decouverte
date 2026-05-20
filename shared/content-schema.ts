/**
 * Content schema shared between the Solid app (renderer) and the
 * future Next.js manager (editor). The Supabase tables `chapter` and
 * `block` store rows whose `payload` columns conform to these types.
 *
 * For the pilot, conditional branches and structured children
 * (FAQ items, key-points cards) are stored INLINE inside `payload`
 * jsonb. The `parent_block_id` column in the `block` table is reserved
 * for future use but unused at first — keeps reads and writes simple.
 */

// ============================================================
// Conditions (used by ConditionalBlock)
// ============================================================

export type ConditionOperator = '=' | '!=' | 'in';

/** Single variable test — the original (and most common) shape. */
export interface LeafCondition {
  variable: string; // key matching a row in the `variable` table
  op: ConditionOperator;
  value: string | number | boolean | Array<string | number | boolean>;
}

/** AND combinator — every member must be true. */
export interface AllCondition {
  all: BranchingCondition[];
}

/** OR combinator — at least one member must be true. */
export interface AnyCondition {
  any: BranchingCondition[];
}

/**
 * A branching condition can be a single leaf test, a conjunction (all)
 * or a disjunction (any). Combinators can be nested arbitrarily; the
 * Solid evaluator handles any depth, while the visual builder in the
 * manager exposes only one level (single / flat AND / flat OR).
 *
 * Backward compatibility: existing payloads that contain only the leaf
 * shape are still valid since `LeafCondition` is a member of the union.
 */
export type BranchingCondition = LeafCondition | AllCondition | AnyCondition;

// Type guards used by both the renderer and the manager builder.
export function isLeafCondition(c: BranchingCondition): c is LeafCondition {
  return typeof (c as LeafCondition).variable === 'string';
}
export function isAllCondition(c: BranchingCondition): c is AllCondition {
  return Array.isArray((c as AllCondition).all);
}
export function isAnyCondition(c: BranchingCondition): c is AnyCondition {
  return Array.isArray((c as AnyCondition).any);
}

// ============================================================
// Block payloads
// ============================================================

export interface TextBlock {
  type: 'text';
  payload: {
    /** Plain HTML or markdown — rendered as-is via innerHTML for the pilot. */
    html: string;
    variant?: 'default' | 'lg' | 'sm';
    /** Optional pilot-specific Tool1 navbar variant rendered as preChildren. */
    navbar?: { variant: string };
  };
}

export interface VideoBlock {
  type: 'video';
  payload: {
    /** Vimeo identifier passed to the existing <FullScreenVideoSection>, e.g. "vimeo/907882115?hash=2d4027711d". */
    vimeoSrc: string;
    contentId?: string;
    contentClass?: string;
    /** Optional pilot-specific Tool1 navbar variant rendered on top of the video. */
    navbar?: { variant: string };
  };
}

export interface HeroTitleBlock {
  type: 'heroTitle';
  payload: {
    title: string;
    /** Small label displayed above the title (e.g. chapter section name). */
    sectionTitle?: string;
    number?: number;
    illustration?: string;
  };
}

export interface ListItem {
  text: string;
  variant?: string;
}

/**
 * A single checklist item — either a plain text row, or a conditional
 * row that switches its label (and optionally its presence) based on a
 * runtime BranchingCondition. Used by the optional `groups` array on
 * KeyPointsCardBlock so a single card can contain multiple sub-sections
 * with per-item branching (e.g. points 3 and 4 differ when
 * `acceptNewPatient === false`).
 */
export type KeyPointsGroupItem =
  | { text: string }
  | {
      conditional: BranchingCondition;
      then: { text: string };
      /** Optional: omit to hide the row entirely when the condition is false. */
      else?: { text: string };
    };

export interface KeyPointsGroup {
  /** Section heading displayed above the checklist. */
  title: string;
  /** Visual variant for the CheckListGroup component. Includes `primary400`
   *  (dark) and `success50` for richer layouts. */
  variant?: 'success50' | 'secondary50' | 'primary50' | 'primary400';
  /** Optional icon key (matches the IconPicker library). */
  icon?: string;
  items: KeyPointsGroupItem[];
}

export interface KeyPointsCardBlock {
  type: 'keyPointsCard';
  payload: {
    /** Optional pilot-specific Tool1 navbar variant rendered as preChildren. */
    navbar?: { variant: string };
    contentClass?: string;
    /** When true, render without the full-page AfterHeroContainer wrapper
     *  (no min-h-dvh, no top padding). Useful when the card sits inside a
     *  single-screen chapter (e.g. PRESENTATION). */
    inline?: boolean;
    /** Hide the card's "Les points clés" header (icon + title). */
    hideHeader?: boolean;
    main: {
      icon?: string;
      title: string;
      description?: string;
      items?: ListItem[];
      /** Additional paragraph(s) rendered before the groups, for cards that
       *  need more than one description line (e.g. STEP_OBSERVATION). */
      extraDescriptions?: string[];
    };
    /** Optional multi-section checklist groups with per-item branching. */
    groups?: KeyPointsGroup[];
    exception?: {
      icon?: string;
      title: string;
      description?: string;
      items?: ListItem[];
      style?: 'primary' | 'dark' | 'secondary';
    };
  };
}

export type FAQQuestionContent =
  | { kind: 'text'; html: string }
  | { kind: 'list'; items: ListItem[] }
  | { kind: 'audio'; url: string }
  | { kind: 'callout'; html: string }
  | { kind: 'conditional'; condition: BranchingCondition; then: FAQQuestionContent[]; else?: FAQQuestionContent[] };

export interface FAQQuestion {
  title: string;
  blocks: FAQQuestionContent[];
}

export interface FAQCardBlock {
  type: 'faqCard';
  payload: {
    navbar?: { variant: string };
    contentClass?: string;
    questions: FAQQuestion[];
  };
}

export interface CardBlock {
  type: 'card';
  payload: {
    navbar?: { variant: string };
    contentClass?: string;
    /** Optional cover image displayed at the top of the card (rounded, full-bleed
     *  inside the card chrome). Mirrors the visual treatment used in the
     *  chapter transition panorama. URL may be a Supabase Storage public URL
     *  or any external image. */
    image?: string;
    /** Optional alt text for the cover image. Defaults to an empty string. */
    imageAlt?: string;
    children: ContentBlock[];
  };
}

/**
 * Conditional block: only one of `then` / `else` is rendered, depending
 * on the runtime evaluation of `condition` against the user variables.
 */
export interface ConditionalBlock {
  type: 'conditional';
  payload: {
    condition: BranchingCondition;
    then: ContentBlock[];
    else?: ContentBlock[];
  };
}

/**
 * Escape hatch: render an existing Solid component by name. Used during
 * the pilot for parts that are too custom to migrate first (e.g. the
 * Tool 1 Summary screen with its own forms and side-effects).
 */
export interface ComponentRefBlock {
  type: 'componentRef';
  payload: {
    /**
     * Registered key in `customComponents.tsx`. Open string so we can add
     * new escape-hatch components without re-typing this union.
     */
    name: string;
    /** Forwarded as additional props to the registered Solid component. */
    props?: Record<string, unknown>;
  };
}

/**
 * Tool content section block — a rich "chapter inside a chapter" used by
 * STEP_TOOL_3. Renders: title + subtitle + video (optionally variant per
 * `personWhoHandleCalls`) + advantage card (bullets OR single paragraph).
 */
export interface ToolContentSectionBlock {
  type: 'toolContentSection';
  payload: {
    /** Optional pilot-specific Tool1 navbar variant rendered as preChildren. */
    navbar?: { variant: string };
    /** @deprecated Legacy "label nav" field — was used by a mini sidebar that
     *  has been replaced by the global StepperLayout sidebar + per-block
     *  navbar variants. Kept optional for back-compat with existing payloads
     *  in DB; never rendered. New blocks shouldn't set this. */
    name?: string;
    /** Optional HTML anchor id (e.g. "section-message") for deep-linking. */
    anchorId?: string;
    title: string;
    subtitle?: string;
    /** Video: either a single fixed vimeo src, or a branching by personWhoHandleCalls. */
    video?:
      | { kind: 'fixed'; src: string }
      | {
          kind: 'branchOnPersonWhoHandleCalls';
          doctor?: string;
          secretary?: string;
          'remote-secretary'?: string;
        };
    advantageTitle?: string;
    /** Either a bullet list OR a single paragraph (not both). */
    advantagePoints?: string[];
    advantageText?: string;
    /**
     * Optional free-form sub-blocks rendered AFTER the advantage card. Same
     * pattern as `CardBlock.children` — lets authors add text, key points,
     * FAQ, etc. inside a tool content section without code changes.
     */
    children?: ContentBlock[];
  };
}

// ============================================================
// FormBlock — data-driven questionnaire tied to the `variable` table
// ============================================================

/**
 * A single field rendered inside a FormBlock. The `key` must match an
 * existing row in the `variable` table for the current parcours; the
 * renderer builds a Zod schema on the fly using the variable's type so
 * each submitted value ends up hydrating HomeContext under that key.
 */
export interface FormField {
  /** Variable key this field collects (matches `variable.key`). */
  key: string;
  /** Human-readable question (e.g. "Êtes-vous médecin ?"). */
  label: string;
  /** Input kind. Must stay consistent with the variable's declared type. */
  type: 'boolean' | 'enum' | 'string' | 'number';
  /** Required at submit time. Defaults to true. */
  required?: boolean;
  /** Options for `type: 'enum'` (ignored otherwise). */
  options?: { value: string; label: string }[];
  /** Optional placeholder for text/number inputs. */
  placeholder?: string;
}

/**
 * Data-driven questionnaire block. Replaces the hardcoded IntroFormFields
 * custom component: the editor lists existing variables, the client
 * generates the form dynamically and stores answers back into HomeContext.
 */
export interface FormBlock {
  type: 'form';
  payload: {
    /** Optional pilot-specific Tool1 navbar variant rendered as preChildren. */
    navbar?: { variant: string };
    /** Card header (optional). */
    title?: string;
    description?: string;
    /** Icon key for the card header (e.g. 'icon-check-line'). */
    icon?: string;
    fields: FormField[];
    /** CTA label. Defaults to "Continuer". */
    nextButtonText?: string;
    /**
     * @deprecated Removed from the editor : forms now always advance to
     * the next chapter in the parcours' logical reading order. The field
     * is kept in the schema so existing rows still parse, but is ignored
     * by the renderer. Will be dropped from the type in a future cleanup.
     */
    nextStep?: string;
  };
}

/**
 * Single photo entry inside a `PhotoCarouselBlock`.
 */
export interface CarouselPhoto {
  /** Full image URL (external host, /illustrations local path, Supabase Storage, anything fetchable). */
  url: string;
  /** Short title shown as a translucent overlay over the bottom of the photo. */
  title?: string;
  /** Longer description rendered as plain text below the carousel (multi-line, \n preserved). */
  description?: string;
  /** Alt text for screen readers — falls back to title when omitted. */
  alt?: string;
}

/**
 * Full-width immersive photo carousel. No card wrapper — the carousel takes
 * the whole chapter width. One photo at a time with arrow navigation, a
 * progress bar at the bottom, an optional title overlay, and an optional
 * multi-line description rendered below the photo.
 */
export interface PhotoCarouselBlock {
  type: 'photoCarousel';
  payload: {
    /** Optional pilot-specific Tool1 navbar variant rendered as preChildren. */
    navbar?: { variant: string };
    photos: CarouselPhoto[];
    /** Aspect ratio for the photo viewport. Default 16:9. */
    aspectRatio?: '16/9' | '4/3' | '3/2' | '1/1' | '21/9';
    /** Auto-advance interval in ms. 0 / undefined disables autoplay. */
    autoplayMs?: number;
  };
}

/**
 * @deprecated `ChapterTransitionBlock` was a manual "section panorama"
 * block. Replaced by the auto-injected next-chapter transition rendered at
 * the end of every chapter by ChapterRenderer (which reads from chapter
 * `card_image` + `card_short_title`). Type removed from the union ; any
 * row of this type still sitting in DB is treated as "unknown" by the
 * renderer (renders null) and by the manager UI (shows the default
 * "type inconnu" message + a delete button).
 */

export type ContentBlock =
  | TextBlock
  | VideoBlock
  | HeroTitleBlock
  | KeyPointsCardBlock
  | FAQCardBlock
  | CardBlock
  | ConditionalBlock
  | ComponentRefBlock
  | ToolContentSectionBlock
  | FormBlock
  | PhotoCarouselBlock;

/** A ContentBlock loaded from DB, carrying its row id (used as scroll anchor in preview). */
export type BlockWithId = ContentBlock & { id: string };

// ============================================================
// Chapter / Parcours / Variable
// ============================================================

export interface BranchingNextRule {
  condition: BranchingCondition;
  nextChapterSlug: string;
}

export interface Chapter {
  id: string;
  versionId: string;
  slug: string;
  title: string;
  order: number;
  /** Optional Tailwind classes applied to the chapter's outer wrapper. */
  wrapperClass?: string;
  nextChapterSlug?: string;
  branchingNext?: BranchingNextRule[];
  blocks: BlockWithId[];
  /** Hero image rendered at the top of the chapter (full-width, rounded).
   *  Comes from `chapter.card_image` — same source as the chapter card
   *  in the section panorama, kept consistent across both surfaces. */
  cardImage?: string;
  /** Short label used by the chapter card. Falls back to `title` when undefined. */
  cardShortTitle?: string;
}

export interface ParcoursVariableEnumOption {
  value: string;
  label: string;
}

export interface ParcoursVariable {
  id: string;
  parcoursId: string;
  key: string;
  label: string;
  type: 'boolean' | 'enum' | 'string' | 'number';
  options: ParcoursVariableEnumOption[];
}

export interface ParcoursVersion {
  id: string;
  parcoursId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  chapters: Chapter[];
}

export interface Parcours {
  id: string;
  slug: string;
  name: string;
  publishedVersionId?: string;
  variables: ParcoursVariable[];
}

// ============================================================
// Runtime helpers
// ============================================================

/**
 * Evaluate a branching condition against a user-variables bag.
 * Handles arbitrary nesting of leaf / all / any. Returns false on
 * missing variable or comparator mismatch — never throws.
 */
export function evaluateCondition(condition: BranchingCondition, variables: Record<string, unknown>): boolean {
  if (isAllCondition(condition)) {
    return condition.all.every((sub) => evaluateCondition(sub, variables));
  }
  if (isAnyCondition(condition)) {
    return condition.any.some((sub) => evaluateCondition(sub, variables));
  }
  // Leaf
  const actual = variables[condition.variable];
  switch (condition.op) {
    case '=':
      return actual === condition.value;
    case '!=':
      return actual !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && (condition.value as Array<unknown>).includes(actual);
    default:
      return false;
  }
}

/**
 * Compile-time exhaustiveness helper. Call it in the `default:` arm of
 * a switch over a discriminated union — when a new variant is added to
 * the union and not handled above, `value` is no longer narrowed to
 * `never` at this point and the call fails to type-check.
 *
 * Pragmatic alternative to enabling the type-aware ESLint rule
 * `@typescript-eslint/switch-exhaustiveness-check`, which requires
 * `parserOptions.project` (not configured in this monorepo) and adds
 * lint pass cost. This helper has zero runtime overhead.
 *
 * Returns `void` (not `never`) on purpose : the assertion is decoupled
 * from control flow so any callers that want to keep a runtime
 * fallback (e.g. "type de bloc inconnu" JSX) after the assertion
 * stay reachable. The runtime `console.warn` surfaces legacy rows
 * that slip in from DB with an out-of-union `type` discriminator.
 *
 * Usage :
 *   switch (block.type) {
 *     case 'text': return renderText(...);
 *     case 'video': return renderVideo(...);
 *     // ... every variant ...
 *     default:
 *       assertNever(block);           // compile error if variants missing
 *       return renderUnknownBlock();  // runtime fallback
 *   }
 */
export function assertNever(value: never): void {
  // eslint-disable-next-line no-console
  console.warn('[assertNever] Unhandled discriminated union variant:', value);
}
