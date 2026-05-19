import type { ContentBlock } from '@shared/content-schema';

export interface VariableMeta {
  id: string;
  key: string;
  label: string;
  type: 'boolean' | 'enum' | 'string' | 'number';
  options: Array<{ value: string; label: string }>;
}

/** Compact chapter descriptor for cross-chapter pickers (nextStep,
 *  branchingNext, section transitions…). */
export interface ChapterMeta {
  id: string;
  slug: string;
  title: string;
  /** Sidebar section this chapter belongs to (matches `chapter.section_label`).
   *  `null` / `undefined` = ungrouped. */
  sectionLabel?: string | null;
  /** Sort key within the section. NULL = chapter `order` decides. */
  sectionOrder?: number | null;
}

/** Per-parcours navbar variant descriptor used by editors that expose a
 *  `payload.navbar.variant` dropdown (video, card, faqCard, keyPointsCard).
 *  Same shape as `NavbarVariant` in `lib/actions.ts`, kept duplicated here
 *  to avoid importing server-only code into client components. */
export interface NavbarVariantMeta {
  key: string;
  title: string;
  icon?: string;
  color?: string;
  percent?: number;
}

/** Props shared by every per-type payload editor. */
export interface PayloadEditorProps<T = Record<string, unknown>> {
  payload: T;
  onChange: (next: T) => void;
  variables: VariableMeta[];
  /** All chapters of the current parcours (draft view). Used for nextStep dropdowns. */
  chapters?: ChapterMeta[];
  /** Slug of the chapter the block currently being edited belongs to. Used
   *  by block types that scope their behaviour to the section of the
   *  current chapter (e.g. resolve which section a block belongs to from
   *  `chapter.section_label`). */
  currentChapterSlug?: string;
  /** Navbar variants registered on this parcours — fuels the navbar variant dropdown
   *  in editors that surface a `payload.navbar.variant` field. */
  navbarVariants?: NavbarVariantMeta[];
  /** How deep we are in a nested editor (for visual indentation). */
  depth?: number;
  /**
   * Replace the entire block (type + payload) rather than just the payload.
   * Used by "leaf" editors that can promote themselves into a container
   * block — e.g. clicking "+ Vidéo" inside a `text` editor wraps the
   * text into a `card` whose children contain the original text + the new
   * sub-block. Optional ; editors that don't support promotion ignore it.
   */
  onReplace?: (next: ContentBlock) => void;
}

export interface BlockEditorFrameProps {
  block: ContentBlock;
  onChange: (next: ContentBlock) => void;
  variables: VariableMeta[];
  chapters?: ChapterMeta[];
  currentChapterSlug?: string;
  navbarVariants?: NavbarVariantMeta[];
  depth?: number;
}
