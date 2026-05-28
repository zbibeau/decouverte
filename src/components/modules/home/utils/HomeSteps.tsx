import { Meta } from '@solidjs/meta';
import { Accessor, lazy, Match, Show, Suspense, Switch } from 'solid-js';

import { DEFAULT_PARCOURS_SLUG, useHome } from '../context/HomeContext';
import { HOME_SECTION_PROPS } from './HomeUtils';

const ChapterFromDB = lazy(() =>
  import('../renderer/ChapterFromDB').then(({ ChapterFromDB }) => ({ default: ChapterFromDB })),
);

/** True when the page was loaded in preview mode from the manager iframe. */
const isPreviewMode = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';

/**
 * Optional version override from the preview iframe query (`?version=<uuid>`).
 * When set, loadChapter reads from that specific parcours_version instead of
 * the currently-published one — this is how the manager previews a draft
 * without impacting the live demo.
 */
const previewVersionId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search).get('version') ?? undefined;
};

/** Set of slugs explicitly declared below — used to decide if we should fall
 * back to a DB-driven chapter render (any slug created via the manager). */
const KNOWN_STEPS = new Set<string>([
  'PRESENTATION',
  'INTRO',
  'STEP_OBSERVATION',
  'STEP_TOOL_1',
  'STEP_TOOL_2',
  'STEP_TOOL_3',
  'STEP_NEXT_PRICING',
  'STEP_NEXT_TRANSITION',
  'END',
]);

export const HomeSteps = (props: HOME_SECTION_PROPS & { currentStep: Accessor<HOME_STEPS_KEYS | undefined> }) => {
  const versionId = previewVersionId();
  const { parcoursSlug, chapters, chaptersLoaded } = useHome();
  const slug = parcoursSlug();
  const isCustomParcours = slug !== DEFAULT_PARCOURS_SLUG;
  /**
   * When to dispatch an arbitrary chapter slug (not in the hardcoded
   * `HOME_STEPS` enum) through `ChapterFromDB` :
   *   - preview mode (manager iframe inspecting any chapter)
   *   - OR the user is browsing a parcours other than the legacy one
   *     ('demo-ventes'), in which case the chapters were created in DB
   *     and don't follow the legacy step naming.
   */
  const allowDynamicChapter = (step: string | undefined): boolean => {
    if (!step) return false;
    if (KNOWN_STEPS.has(step)) return false;
    return isPreviewMode() || isCustomParcours;
  };
  // All parcours boot with an empty step until `loadChapterSequence`
  // resolves and picks the first chapter (or localStorage restores one
  // for a returning visitor). Wrap in <Show> so the gate is reactive —
  // a plain `if (...) return` only fires once at component instantiation
  // in Solid and would leave us stuck on "Chargement…" forever.
  // Empty-parcours state: the chapter sequence has resolved but the parcours
  // has zero chapters yet. Show a friendly message instead of staying stuck
  // on "Chargement…" (which used to be the case for brand-new parcours
  // created via the manager wizard before any chapter was added).
  const isEmptyParcours = () => chaptersLoaded() && chapters().length === 0;

  return (
    <>
      {/* Preview (iframe manager) + parcours indisponible : ne pas indexer. */}
      <Show when={isPreviewMode() || isEmptyParcours()}>
        <Meta name="robots" content="noindex" />
      </Show>
      <Show
        when={!isEmptyParcours()}
        fallback={
          <div class="m-auto max-w-md p-8 text-center">
            <Show
              when={isPreviewMode()}
              fallback={
                <>
                  {/* Visiteur public : parcours sans version publiée (ou vide).
                      Message neutre — on ne mentionne pas le manager. */}
                  <p class="mb-2 text-base font-semibold text-dark-950">Parcours indisponible</p>
                  <p class="text-sm text-dark-950 opacity-60">
                    Ce parcours n'est pas encore disponible. Reviens un peu plus tard.
                  </p>
                </>
              }
            >
              {/* Auteur en preview : message orienté édition. */}
              <p class="mb-2 text-base font-semibold text-dark-950">Parcours vide</p>
              <p class="text-sm text-dark-950 opacity-60">
                Ce parcours n'a pas encore de chapitre. Ajoute-en un depuis le manager pour commencer.
              </p>
            </Show>
          </div>
        }
      >
        <Show
          when={props.currentStep()}
          fallback={<div class="m-auto p-8 text-center text-sm opacity-60">Chargement…</div>}
        >
          <Suspense>
            <Switch
              fallback={
                allowDynamicChapter(props.currentStep() as string) ? (
                  <ChapterFromDB
                    {...props}
                    parcoursSlug={slug}
                    chapterSlug={props.currentStep() as string}
                    versionId={versionId}
                  />
                ) : (
                  <div>Not Found</div>
                )
              }
            >
              <Match when={props.currentStep() === HOME_STEPS.PRESENTATION}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="PRESENTATION" versionId={versionId} />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.INTRO}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="INTRO" versionId={versionId} />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.STEP_OBSERVATION}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="STEP_OBSERVATION" versionId={versionId} />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.STEP_TOOL_1}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="STEP_TOOL_1" versionId={versionId} />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.STEP_TOOL_2}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="STEP_TOOL_2" versionId={versionId} />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.STEP_TOOL_3}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="STEP_TOOL_3" versionId={versionId} />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.STEP_NEXT_PRICING}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="STEP_NEXT_PRICING" versionId={versionId} />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.STEP_NEXT_TRANSITION}>
                <ChapterFromDB
                  {...props}
                  parcoursSlug={slug}
                  chapterSlug="STEP_NEXT_TRANSITION"
                  versionId={versionId}
                />
              </Match>
              <Match when={props.currentStep() === HOME_STEPS.END}>
                <ChapterFromDB {...props} parcoursSlug={slug} chapterSlug="END" versionId={versionId} />
              </Match>
            </Switch>
          </Suspense>
        </Show>
      </Show>
    </>
  );
};

export enum HOME_STEPS {
  PRESENTATION = 'PRESENTATION',
  INTRO = 'INTRO',
  STEP_OBSERVATION = 'STEP_OBSERVATION',
  STEP_TOOL_1 = 'STEP_TOOL_1',
  STEP_TOOL_2 = 'STEP_TOOL_2',
  STEP_TOOL_3 = 'STEP_TOOL_3',
  STEP_NEXT_PRICING = 'STEP_NEXT_PRICING',
  STEP_NEXT_TRANSITION = 'STEP_NEXT_TRANSITION',
  END = 'END',
}

export type HOME_STEPS_KEYS = keyof typeof HOME_STEPS;
