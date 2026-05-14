import type { ContentBlock } from '@shared/content-schema';

export interface VariableMeta {
  id: string;
  key: string;
  label: string;
  type: 'boolean' | 'enum' | 'string' | 'number';
  options: Array<{ value: string; label: string }>;
}

/** Compact chapter descriptor for cross-chapter pickers (nextStep, branchingNext). */
export interface ChapterMeta {
  id: string;
  slug: string;
  title: string;
}

/** Props shared by every per-type payload editor. */
export interface PayloadEditorProps<T = Record<string, unknown>> {
  payload: T;
  onChange: (next: T) => void;
  variables: VariableMeta[];
  /** All chapters of the current parcours (draft view). Used for nextStep dropdowns. */
  chapters?: ChapterMeta[];
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
  depth?: number;
}
