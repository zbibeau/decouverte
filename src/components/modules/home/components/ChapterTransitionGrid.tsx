import cx from 'classix';
import { Component, For, Show, createMemo } from 'solid-js';

import { Title } from '../../../primitives/Title';
import { DEFAULT_PARCOURS_SLUG, useHome } from '../context/HomeContext';
import type { ChapterStub } from '../renderer/loadChapter';
import type { HOME_STEPS_KEYS } from '../utils/HomeSteps';

type ChapterStubLike = ChapterStub;

type CardOverride = { shortTitle?: string; image?: string };

interface Props {
  /** Optional override of the section title. When empty, the renderer
   *  falls back to the section the active chapter belongs to. */
  titleOverride?: string;
  /** Label of the CTA on the active card. Default "Découvrir". */
  activeCtaLabel?: string;
  /** Optional per-chapter visual overrides keyed by chapter slug. Block-level
   *  overrides take priority over chapter-level `cardImage` / `cardShortTitle`. */
  cardOverrides?: Record<string, CardOverride>;
  /**
   * Determines which card is highlighted :
   *   - `current` (default) : the chapter currently being viewed (i.e.
   *     `currentStep`). Used by the manually-placed `chapterTransition`
   *     block to display "where you are in the section".
   *   - `next` : the chapter coming right after the current one (by
   *     `chapter.order`). Used by the auto-injected transition at the end
   *     of each chapter to nudge the visitor forward.
   */
  activeChapter?: 'current' | 'next';
}

/**
 * "Section panorama" block. Reads the chapters of the current parcours
 * from HomeContext, finds the section to display (current chapter's
 * section, or the next chapter's section when `activeChapter='next'`),
 * and renders them as a grid of cards. One card is highlighted (active +
 * "Découvrir" button) ; the others are clickable teasers.
 *
 * Chapter cards read their image + short title from chapter-level fields
 * (`cardImage` / `cardShortTitle`) so the visual is configured once per
 * chapter and reused across both manual and auto transitions. Block-level
 * `cardOverrides` (legacy) still take priority.
 */
export const ChapterTransitionGrid: Component<Props> = (props) => {
  const { parcoursSlug, chapters, currentStep, setCurrentStep } = useHome();
  const mode = () => props.activeChapter ?? 'current';

  // Sort key used to compute the *logical* reading order : chapters are
  // walked section-by-section, and within a section by sectionOrder then
  // chapter.order. This way the auto next-chapter transition picks the
  // chapter that comes next in the sidebar grouping, NOT the raw `order`
  // column (which can be interleaved across sections).
  function logicallyOrdered(all: ChapterStubLike[]): ChapterStubLike[] {
    // Establish each chapter's section key + the section's first-appearance
    // order in DB. Sections themselves are ranked by the minimum chapter.order
    // they contain (so the section whose first chapter appears earliest in
    // DB shows up first in the reading flow).
    const sectionMinOrder = new Map<string, number>();
    for (const c of all) {
      const key = c.sectionLabel?.trim() || '__none__';
      const prev = sectionMinOrder.get(key);
      if (prev === undefined || c.order < prev) sectionMinOrder.set(key, c.order);
    }
    return [...all].sort((a, b) => {
      const ak = a.sectionLabel?.trim() || '__none__';
      const bk = b.sectionLabel?.trim() || '__none__';
      if (ak !== bk) {
        return (sectionMinOrder.get(ak) ?? 0) - (sectionMinOrder.get(bk) ?? 0);
      }
      const ao = a.sectionOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.sectionOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.order - b.order;
    });
  }

  // The "anchor" chapter whose section we display. For 'current' mode this
  // is currentStep ; for 'next' mode it's the chapter coming right after in
  // the logical (section-aware) reading order.
  const anchor = createMemo(() => {
    // For the auto next-chapter transition, skip on legacy demo-ventes
    // (which has its own hardcoded `GoToNextPartButton`).
    if (mode() === 'next' && parcoursSlug() === DEFAULT_PARCOURS_SLUG) {
      return null;
    }
    const all = chapters();
    if (all.length === 0) return null;
    if (mode() === 'next') {
      const ordered = logicallyOrdered(all);
      const curIdx = ordered.findIndex((c) => c.slug === currentStep());
      if (curIdx === -1) return null;
      if (curIdx + 1 >= ordered.length) return null;
      return ordered[curIdx + 1];
    }
    return all.find((c) => c.slug === currentStep()) ?? null;
  });

  const sectionChapters = createMemo(() => {
    const all = chapters();
    const a = anchor();
    if (!a) return [];
    const label = a.sectionLabel?.trim() || null;
    if (!label) return [a]; // ungrouped chapter — render a single card
    return all
      .filter((c) => (c.sectionLabel?.trim() || null) === label)
      .sort((x, y) => {
        const ax = x.sectionOrder ?? Number.POSITIVE_INFINITY;
        const ay = y.sectionOrder ?? Number.POSITIVE_INFINITY;
        if (ax !== ay) return ax - ay;
        return x.order - y.order;
      });
  });

  const sectionTitle = createMemo(() => {
    const override = props.titleOverride?.trim();
    if (override) return override;
    return anchor()?.sectionLabel?.trim() || '';
  });

  return (
    <Show when={anchor() && sectionChapters().length > 0}>
      <div class="w-full max-w-full overflow-hidden bg-gradient-to-b from-primary-100 to-primary-200 px-4 py-10 md:px-6 md:py-12">
        <div class="mx-auto w-full max-w-[1100px]">
          <Show when={sectionTitle()}>
            <Title
              variant="h3"
              class="mb-8 text-center font-semibold text-primary-700"
            >
              {sectionTitle()}
            </Title>
          </Show>
          <div
            class={cx(
              'grid w-full gap-3 md:gap-4',
              sectionChapters().length === 1 && 'grid-cols-1 max-w-[360px] mx-auto',
              sectionChapters().length === 2 && 'grid-cols-1 sm:grid-cols-2 max-w-[700px] mx-auto',
              sectionChapters().length >= 3 && 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
            )}
          >
            <For each={sectionChapters()}>
              {(c, index) => {
                // Reactivity rule in Solid : `<For>` runs each child's render
                // closure only once per item. Anything that depends on an
                // external signal (here `anchor()`, which changes on
                // navigation) MUST be wrapped in a function so the JSX
                // re-evaluates it on every signal update. Storing
                // `const isActive = c.slug === anchor()?.slug` would freeze
                // the value at render time → the wrong card stays
                // highlighted after `currentStep` changes.
                const isActive = () => c.slug === anchor()?.slug;
                const override = (): CardOverride =>
                  props.cardOverrides?.[c.slug] ?? {};
                const shortTitle = () =>
                  override().shortTitle || c.cardShortTitle || c.title;
                const image = () => override().image || c.cardImage || undefined;
                return (
                  <div
                    role={!isActive() ? 'button' : undefined}
                    tabIndex={!isActive() ? 0 : undefined}
                    onClick={() => {
                      if (!isActive()) setCurrentStep(c.slug as HOME_STEPS_KEYS);
                    }}
                    onKeyDown={(e) => {
                      if (!isActive() && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setCurrentStep(c.slug as HOME_STEPS_KEYS);
                      }
                    }}
                    class={cx(
                      'relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl transition-all',
                      isActive()
                        ? 'bg-white shadow-xl'
                        : 'cursor-pointer bg-white/40 shadow-md hover:bg-white/60',
                    )}
                  >
                    <div class="flex flex-1 flex-col p-4 md:p-5">
                      <div
                        class={cx(
                          'mb-3 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                          isActive()
                            ? 'bg-primary-400 text-white'
                            : 'bg-white/70 text-primary-400',
                        )}
                      >
                        {index() + 1}
                      </div>
                      <Title
                        variant="h5"
                        tag="p"
                        class={cx(
                          'font-semibold',
                          isActive() ? 'text-primary-700' : 'text-primary-700/60',
                        )}
                      >
                        {shortTitle()}
                      </Title>
                    </div>
                    <Show when={image()}>
                      {/* Image as a tilted, rounded photo (same visual
                           treatment as the heroTitle vignette). Wrapper has
                           padding so the rotated corners don't get clipped
                           by the card's `overflow-hidden`. Takes 50% of the
                           card height — a touch more than the previous 40%
                           so the photo feels like the primary content. */}
                      <div
                        class={cx(
                          'h-1/2 px-3 pb-3',
                          !isActive() && 'opacity-50',
                        )}
                      >
                        <img
                          src={image()!}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          class="h-full w-full -rotate-2 rounded-2xl object-cover shadow-md"
                        />
                      </div>
                    </Show>
                    <Show when={isActive()}>
                      <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <button
                          type="button"
                          class="rounded-full bg-primary-400 px-6 py-2 text-sm font-medium text-white shadow hover:bg-primary-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentStep(c.slug as HOME_STEPS_KEYS);
                          }}
                        >
                          {props.activeCtaLabel?.trim() || 'Découvrir'}
                        </button>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
};
