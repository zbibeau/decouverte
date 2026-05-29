'use client';

import type { ContentBlock } from '@shared/content-schema';
import { assertNever } from '@shared/content-schema';

import { CardEditor } from './CardEditor';
import { ConditionalEditor } from './ConditionalEditor';
import { FaqCardEditor } from './FaqCardEditor';
import { FormEditor } from './FormEditor';
import { KeyPointsCardEditor } from './KeyPointsCardEditor';
import { PhotoCarouselEditor } from './PhotoCarouselEditor';
import { ComponentRefEditor, HeroTitleEditor, TextEditor, VideoEditor } from './SimpleEditors';
import { ToolContentSectionEditor } from './ToolContentSectionEditor';
import type { BlockEditorFrameProps } from './editor-types';

/**
 * Type-dispatching payload editor. Receives a ContentBlock and emits
 * a new ContentBlock when any field changes. Used at the top of
 * `BlockEditor.tsx` and recursively inside `ChildBlockList`.
 */
export function PayloadEditor({
  block,
  onChange,
  variables,
  chapters,
  currentChapterSlug,
  navbarVariants,
  depth = 0,
}: BlockEditorFrameProps) {
  function updatePayload<P>(next: P) {
    onChange({ ...block, payload: next } as ContentBlock);
  }

  switch (block.type) {
    case 'text':
      return (
        <TextEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
          /* Allow promoting `text` to a container by adding a sub-block. */
          onReplace={onChange}
        />
      );
    case 'video':
      return (
        <VideoEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    case 'heroTitle':
      return <HeroTitleEditor payload={block.payload} onChange={updatePayload} variables={variables} depth={depth} />;
    case 'keyPointsCard':
      return (
        <KeyPointsCardEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    case 'faqCard':
      return (
        <FaqCardEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    case 'card':
      return (
        <CardEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    case 'conditional':
      return (
        <ConditionalEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    case 'toolContentSection':
      return (
        <ToolContentSectionEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    case 'componentRef':
      return (
        <ComponentRefEditor payload={block.payload} onChange={updatePayload} variables={variables} depth={depth} />
      );
    case 'form':
      return (
        <FormEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          chapters={chapters}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    case 'photoCarousel':
      return (
        <PhotoCarouselEditor
          payload={block.payload}
          onChange={updatePayload}
          variables={variables}
          navbarVariants={navbarVariants}
          depth={depth}
        />
      );
    default:
      // Exhaustiveness check : if a new variant is added to `ContentBlock`
      // and not handled above, `block` is no longer narrowed to `never`
      // here and the call fails to type-check. Logs (not throws) so the
      // JSX fallback below still renders if a legacy row sneaks in.
      assertNever(block);
      return (
        <p className="text-destructive text-xs">
          Type de bloc inconnu : <code>{(block as ContentBlock).type}</code>
        </p>
      );
  }
}
