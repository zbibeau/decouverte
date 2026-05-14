import type { Chapter } from '@shared/content-schema';
import { Component, createResource, createSignal, onMount, Show } from 'solid-js';

import { HOME_SECTION_PROPS } from '../utils/HomeUtils';
import { ChapterRenderer } from './ChapterRenderer';
import { loadPublishedChapter } from './loadChapter';

/**
 * Loads a single chapter from Supabase and renders it via <ChapterRenderer />.
 * Renders nothing while loading; renders an error placeholder on miss/failure
 * so we don't silently fall through to a blank screen.
 */
export const ChapterFromDB: Component<
  HOME_SECTION_PROPS & { parcoursSlug: string; chapterSlug: string; versionId?: string }
> = (props) => {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const [chapter] = createResource<Chapter | null>(
    mounted,
    () => loadPublishedChapter(props.parcoursSlug, props.chapterSlug, props.versionId),
  );

  return (
    <Show when={mounted()} fallback={<div />}>
    <Show
      when={chapter()}
      fallback={
        <Show when={!chapter.loading}>
          <div class="p-8 text-center text-sm text-dark-950 opacity-60">
            Chapitre « {props.chapterSlug} » introuvable dans Supabase.
          </div>
        </Show>
      }
    >
      {(c) => <ChapterRenderer chapter={c()} sectionProps={props} />}
    </Show>
    </Show>
  );
};
