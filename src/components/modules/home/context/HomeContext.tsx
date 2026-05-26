import Cookies from 'js-cookie';
import { Accessor, createContext, createEffect, createSignal, JSX, on, onMount, Setter, useContext } from 'solid-js';
import { boolean, object, string } from 'zod';
import * as z from 'zod';

import client from '../../../../services/api/RESTClient';
import {
  type ChapterStub,
  loadChapterSequence,
  loadNavbarVariants,
  loadParcoursThemeColor,
  type NavbarVariant,
} from '../renderer/loadChapter';
import { loadDynamicHubspotMappings } from '../utils/dynamicHubspotMapping';
import {
  HubspotCookieName,
  LOCALSTORAGE_DATA_KEY,
  LOCALSTORAGE_MOST_ADVANCED_STEP_KEY,
  LOCALSTORAGE_STEP_KEY,
} from '../utils/HomeIds';
import { HOME_STEPS, HOME_STEPS_KEYS } from '../utils/HomeSteps';
import { HOME_STEPS_LAYOUT_VALUE } from '../utils/HomeUtils';
import {
  DemoObjectToHubspotObject,
  HubspotObject,
  HubspotObjectToDemoObject,
  setDynamicHubspotMappings,
} from '../utils/HubspotMapping';
import { getPreviewParams } from '../utils/previewMode';

/**
 * Default slug served when the route doesn't carry one (e.g. the root
 * `/` URL on the legacy demo deployment). New deployments serve
 * `/parcours/<slug>` and override this via the route param.
 */
export const DEFAULT_PARCOURS_SLUG = 'demo-ventes';

export const HomeContext = createContext({
  data: () => ({}),
  setData: () => {},
  isLoading: () => {},
  setIsLoading: () => {},
  currentStep: () => {},
  mostAdvancedStep: () => {},
  setCurrentStep: () => {},
  setHubspotContactId: () => {},
  parcoursSlug: () => DEFAULT_PARCOURS_SLUG,
  chapters: () => [],
  chaptersLoaded: () => false,
  navbarVariants: () => [],
  themeColor: () => null,
} as HomeContextReturn);

export enum PERSON_WHO_HANDLE_CALLS {
  DOCTOR = 'doctor',
  SECRETARY = 'secretary',
  'REMOTE-SECRETARY' = 'remote-secretary',
}

export const IntroSchema = object({
  isDoctor: boolean(),
  isDoingVAD: boolean(),
  isInGroup: boolean(),
  acceptNewPatient: boolean(),
  personWhoHandleCalls: z.nativeEnum(PERSON_WHO_HANDLE_CALLS),
  questionsStep1: string().optional().nullable(),
  questionsStep2: string().optional().nullable(),
  questionsStep3: string().optional().nullable(),
  origine_adv: string().optional().nullable(),
}).required();
export type IntroSchemaType = z.infer<typeof IntroSchema>;

type HomeContextData = IntroSchemaType;

type HomeContextReturn = {
  data: Accessor<Partial<HomeContextData>>;
  setData: Setter<Partial<HomeContextData>>;
  isLoading: Accessor<boolean>;
  setIsLoading: Setter<boolean>;
  currentStep: Accessor<HOME_STEPS_KEYS>;
  mostAdvancedStep: Accessor<HOME_STEPS_KEYS | 'undefined'>;
  setCurrentStep: Setter<HOME_STEPS_KEYS>;
  setHubspotContactId: Setter<number>;
  /** The parcours slug currently being rendered. Set once at mount from
   *  the route param (`/parcours/[slug]`) and falls back to `DEFAULT_PARCOURS_SLUG`. */
  parcoursSlug: Accessor<string>;
  /** Ordered list of chapters of the current parcours, loaded from DB on
   *  mount. Empty until the load resolves. Used by the dynamic stepper
   *  to navigate prev/next and to render arbitrary chapter slugs. */
  chapters: Accessor<ChapterStub[]>;
  /** True once `loadChapterSequence` has resolved (success or failure).
   *  Used by the renderer to distinguish "still loading" from "loaded but
   *  empty" — an empty parcours should show a friendly empty state instead
   *  of staying stuck on a loading spinner. */
  chaptersLoaded: Accessor<boolean>;
  /** Navbar variants registered on the current parcours (Tool 1 pilote).
   *  Used by `renderNavbar` to resolve `payload.navbar.variant` keys to
   *  display data (title, icon, color, percent). */
  navbarVariants: Accessor<NavbarVariant[]>;
  /** Optional pastel accent stored on the parcours row (migration 0035).
   *  Also injected as `--mfm-theme` CSS custom property on `<html>` by
   *  HomeProvider's effect — components can pick it up via
   *  `style={{ color: 'var(--mfm-theme, currentColor)' }}` or similar
   *  without depending on this accessor directly. */
  themeColor: Accessor<string | null>;
};

export const HomeProvider = (props: { children: JSX.Element; parcoursSlug?: string }) => {
  // Always boot with an empty currentStep — the actual first chapter is
  // determined asynchronously by `loadChapterSequence` (or restored from
  // a per-parcours localStorage entry). Hardcoding HOME_STEPS.PRESENTATION
  // here used to cause a "PRESENTATION not found" race on custom parcours
  // whose first chapter has a different slug, because Solid sometimes
  // sees `props.parcoursSlug` as undefined at component initialisation.
  const [data, setData] = createSignal<Partial<HomeContextData>>();
  const [currentStep, setCurrentStep] = createSignal<HOME_STEPS_KEYS>('' as HOME_STEPS_KEYS);
  const [mostAdvancedStep, setMostAdvancedStep] = createSignal<HOME_STEPS_KEYS | 'undefined'>('' as HOME_STEPS_KEYS);
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [hubspotContactId, setHubspotContactId] = createSignal<number>();
  const [chapters, setChapters] = createSignal<ChapterStub[]>([]);
  const [chaptersLoaded, setChaptersLoaded] = createSignal(false);
  const [navbarVariants, setNavbarVariants] = createSignal<NavbarVariant[]>([]);
  // Optional pastel accent stored per-parcours (migration 0035). When set,
  // a createEffect below injects it as `--mfm-theme-color` on the
  // document root so any component can reference it (CSS custom prop)
  // without prop-drilling. Falls back to `null` (= use default theme)
  // when the column is missing on the DB or NULL on the row.
  const [themeColor, setThemeColor] = createSignal<string | null>(null);
  // Stable per-mount slug : whichever slug the route declared at mount
  // time. Wrapped in an accessor for context API consistency.
  const parcoursSlug = () => props.parcoursSlug ?? DEFAULT_PARCOURS_SLUG;
  // Namespace persistent state by parcours slug so visiting a custom
  // parcours doesn't restore demo-ventes' last-known step. Demo-ventes
  // keeps the legacy unprefixed keys for back-compat with existing users.
  const stepKey = () =>
    parcoursSlug() === DEFAULT_PARCOURS_SLUG ? LOCALSTORAGE_STEP_KEY : `${LOCALSTORAGE_STEP_KEY}.${parcoursSlug()}`;
  const dataKey = () =>
    parcoursSlug() === DEFAULT_PARCOURS_SLUG ? LOCALSTORAGE_DATA_KEY : `${LOCALSTORAGE_DATA_KEY}.${parcoursSlug()}`;
  const mostAdvancedKey = () =>
    parcoursSlug() === DEFAULT_PARCOURS_SLUG
      ? LOCALSTORAGE_MOST_ADVANCED_STEP_KEY
      : `${LOCALSTORAGE_MOST_ADVANCED_STEP_KEY}.${parcoursSlug()}`;

  onMount(async () => {
    // Preview mode: manager iframe injects step + variables via query params.
    // Resolved SYNCHRONOUSLY here BEFORE kicking off any async loaders so
    // its result wins the race against `loadChapterSequence(...).then(...)`,
    // which would otherwise overwrite `currentStep` with the first chapter
    // of the parcours when its promise resolves.
    const preview = getPreviewParams();
    if (preview) {
      setData(preview.data);
      setCurrentStep(preview.step);
      setMostAdvancedStep(preview.step);
    }

    // Hydrate dynamic Hubspot mappings (non-blocking) for the active parcours.
    loadDynamicHubspotMappings(parcoursSlug())
      .then(setDynamicHubspotMappings)
      .catch((e) => console.warn('[HomeContext] dynamic hubspot mappings load failed', e));

    // Hydrate the navbar variants registry for the active parcours. The
    // renderer reads this to map a block's `payload.navbar.variant` key to
    // its title/icon/color/percent.
    loadNavbarVariants(parcoursSlug())
      .then(setNavbarVariants)
      .catch((e) => console.warn('[HomeContext] navbar variants load failed', e));

    // Hydrate the parcours' pastel theme color (migration 0035). Applied
    // as a CSS custom property via the effect below.
    loadParcoursThemeColor(parcoursSlug())
      .then(setThemeColor)
      .catch((e) => console.warn('[HomeContext] theme color load failed', e));

    // Load the chapter sequence from DB. The dynamic stepper uses this
    // to know what chapters exist and how to navigate; the default
    // parcours falls back to its hardcoded HOME_STEPS order when the DB
    // hasn't been seeded yet.
    loadChapterSequence(parcoursSlug())
      .then((seq) => {
        setChapters(seq);
        setChaptersLoaded(true);
        if (seq.length === 0) return;
        // In preview mode the manager iframe URL is authoritative on which
        // chapter to display — never override it with localStorage or with
        // the parcours' first chapter, otherwise the block-edit preview
        // jumps back to chapter 1 when this async loader resolves.
        if (preview) return;
        // Authoritative resolution of `currentStep` :
        //   1. If localStorage holds a step that STILL EXISTS in the
        //      live DB chapter list → restore it (returning visitor
        //      resumes where they left off).
        //   2. Otherwise → use the current first chapter from the DB.
        //
        // Crucially, this is the SAME logic for the legacy parcours
        // (demo-ventes) and any custom parcours. Renaming or deleting
        // a chapter in the manager always falls back gracefully to the
        // updated first chapter instead of getting stuck on the old
        // slug.
        const validSlugs = new Set(seq.map((c) => c.slug));
        // Deep-link via URL hash : `#chapter-slug` jumps directly to
        // that chapter on first load (powering shared links like
        // `/parcours/X#step-tool-2`). Wins over localStorage AND the
        // first-chapter fallback. We don't clear the hash so refreshes
        // still land on the same chapter.
        const hashSlug =
          typeof window !== 'undefined' && window.location.hash.startsWith('#')
            ? decodeURIComponent(window.location.hash.slice(1))
            : null;
        const stored = typeof window !== 'undefined' ? localStorage?.getItem(stepKey()) : null;
        const hashIsValid = !!hashSlug && validSlugs.has(hashSlug);
        const storedIsValid = !!stored && validSlugs.has(stored);
        if (hashIsValid) {
          setCurrentStep(hashSlug as HOME_STEPS_KEYS);
          setMostAdvancedStep(hashSlug as HOME_STEPS_KEYS);
        } else if (storedIsValid) {
          setCurrentStep(stored as HOME_STEPS_KEYS);
        } else {
          setCurrentStep(seq[0].slug as HOME_STEPS_KEYS);
          setMostAdvancedStep(seq[0].slug as HOME_STEPS_KEYS);
        }
      })
      .catch((e) => {
        console.warn('[HomeContext] chapter sequence load failed', e);
        setChaptersLoaded(true);
      });

    // In preview mode we drove state from the URL above and skip the
    // localStorage / Hubspot hydration below.
    if (preview) {
      return;
    }

    if (localStorage) {
      const existingData = localStorage.getItem(dataKey());
      const existingMostAdvancedStep = localStorage.getItem(mostAdvancedKey());

      // Note: `currentStep` is NOT restored synchronously here anymore.
      // It's resolved by the chapter-sequence load above, which can
      // validate the stored slug against the live DB chapter list and
      // gracefully fall back to the current first chapter when the
      // stored slug no longer exists (renamed / deleted chapter).
      // `mostAdvancedStep` is only used by the demo-ventes progress
      // tracker and is safe to restore as-is.
      if (existingMostAdvancedStep) {
        setMostAdvancedStep(existingMostAdvancedStep as HOME_STEPS_KEYS);
      }

      if (existingData !== 'undefined' && existingData !== null) {
        setData(JSON.parse(existingData as string));

        if (Cookies.get(HubspotCookieName)) {
          try {
            const query = await client['/contacts'].get({
              query: {
                utk: Cookies.get(HubspotCookieName),
              },
            });

            //Contact not found
            if (query.status === 404) {
              throw 'Contact not found';
            }

            const response = await query.json();
            setHubspotContactId(response?.contact?.id);
            // eslint-disable-next-line no-empty
          } catch (error) {}
        }
      } else {
        // If user have an utk prefill informations from hubspot contact information
        if (Cookies.get(HubspotCookieName)) {
          try {
            setIsLoading(true);
            const query = await client['/contacts'].get({
              query: {
                utk: Cookies.get(HubspotCookieName),
              },
            });

            //Contact not found
            if (query.status === 404) {
              throw 'Contact not found';
            }

            const response = await query.json();
            const dataToSync: Partial<Record<keyof IntroSchemaType, any>> = {};
            const keysToAdd = Object.keys(IntroSchema.shape);

            setHubspotContactId(response?.contact?.id);

            //Sync data only related to form
            for (const [key, value] of Object.entries(HubspotObjectToDemoObject(response.contact as HubspotObject))) {
              if (keysToAdd.includes(key)) {
                dataToSync[key as keyof IntroSchemaType] = value;
              }
              if (key === 'CURRENT_STEP') {
                setCurrentStep(value as HOME_STEPS_KEYS);
                setMostAdvancedStep(value as HOME_STEPS_KEYS);
              }
            }

            if (Object.keys(dataToSync).length > 0) {
              setData(dataToSync);
            }
            setIsLoading(false);
          } catch (error) {
            setIsLoading(false);
          }
        }
      }
    }
  });

  createEffect(() => {
    if (getPreviewParams()) return; // no-op in preview mode
    if (localStorage && data()) {
      localStorage.setItem(dataKey(), JSON.stringify(data()));
    }
  });

  createEffect(() => {
    if (getPreviewParams()) return; // no-op in preview mode
    if (localStorage) {
      localStorage.setItem(stepKey(), currentStep() as string);
      localStorage.setItem(mostAdvancedKey(), mostAdvancedStep() as string);
    }
  });

  createEffect(
    on(currentStep, () => {
      if (getPreviewParams()) return; // no-op in preview mode
      if (hubspotContactId()) {
        (async () => {
          await client['/contacts/{contact_id}'].put({
            params: {
              contact_id: hubspotContactId(),
            },
            json: {
              // @ts-ignore
              data: DemoObjectToHubspotObject({
                CURRENT_STEP: currentStep() as HOME_STEPS,
                ...data(),
              }),
            },
            query: {},
          });
        })();
      }

      //Set most advanced step
      // ── The whole "most advanced step" computation below is keyed on
      //    `HOME_STEPS_LAYOUT_VALUE` which only declares mappings for the
      //    legacy demo-ventes step names. For a custom parcours whose
      //    chapter slugs aren't in that record, calling `.split('.')` on
      //    a missing value crashes. Skip the legacy tracking entirely —
      //    custom parcours will manage progression dynamically once we
      //    rebuild it from the DB chapter sequence.
      if (parcoursSlug() !== DEFAULT_PARCOURS_SLUG) return;
      const HOME_STEPS_LAYOUT_VALUEkeys = Object.keys(HOME_STEPS_LAYOUT_VALUE);
      const currentKeyIndex = HOME_STEPS_LAYOUT_VALUEkeys.findIndex((key) => key === currentStep());
      const nextStepKey = HOME_STEPS_LAYOUT_VALUEkeys[currentKeyIndex + 1];
      const nextStepValue = HOME_STEPS_LAYOUT_VALUE[nextStepKey];

      if (
        nextStepValue === undefined ||
        nextStepValue === '' ||
        mostAdvancedStep() === undefined ||
        mostAdvancedStep() === 'undefined'
      ) {
        //@ts-ignore
        setMostAdvancedStep(undefined);
      } else {
        const [currentStepGroup, currentStepKey] = nextStepValue.split('.').map((v) => parseInt(v));

        if (mostAdvancedStep() !== 'undefined' && mostAdvancedStep() !== undefined) {
          // Defensive : `HOME_STEPS_LAYOUT_VALUE` only contains the legacy
          // demo-ventes mappings. When `mostAdvancedStep()` is a custom
          // chapter slug (restored from localStorage / set via deep-link
          // hash) the lookup returns `undefined` and the `.split` below
          // throws — flooding the dev overlay with "Cannot read 'split'".
          // Bail gracefully : the visitor's progression is tracked
          // elsewhere via DB chapter sequence ; the legacy "most advanced"
          // computation is purely a back-compat for demo-ventes presets.
          const mostAdvancedLayout = HOME_STEPS_LAYOUT_VALUE[mostAdvancedStep()];
          if (!mostAdvancedLayout) {
            setMostAdvancedStep(nextStepKey as HOME_STEPS_KEYS);
            return;
          }
          const [mostAdvancedGroup, mostAdvancedGroupStep] = mostAdvancedLayout.split('.').map((v) => parseInt(v));
          if (currentStepGroup >= mostAdvancedGroup) {
            if (currentStepGroup > mostAdvancedGroup ? true : currentStepKey >= mostAdvancedGroupStep) {
              setMostAdvancedStep(nextStepKey as HOME_STEPS_KEYS);
            }
          }
        } else {
          setMostAdvancedStep(nextStepKey as HOME_STEPS_KEYS);
        }
      }
    }),
  );

  // Inject the parcours' pastel theme color as a CSS custom property
  // on <html>, so any component can pick it up via `var(--mfm-theme)`
  // without prop-drilling. `null` clears the variable so the default
  // Tailwind theme kicks in (no flash on switch).
  createEffect(() => {
    if (typeof document === 'undefined') return;
    const color = themeColor();
    const root = document.documentElement;
    if (color) {
      root.style.setProperty('--mfm-theme', color);
    } else {
      root.style.removeProperty('--mfm-theme');
    }
  });

  // Keep the URL hash in sync with the active chapter, so :
  //   - Copying the URL produces a deep link other people can paste back
  //     and land on the SAME chapter (read on mount above).
  //   - The browser back/forward history reflects chapter navigation.
  // `history.replaceState` (not pushState) — chapter switches feel
  // intra-page, the back button should still escape the parcours.
  createEffect(() => {
    if (typeof window === 'undefined') return;
    const step = currentStep();
    if (!step) return;
    // Skip in preview mode (manager iframe drives the URL).
    if (new URLSearchParams(window.location.search).get('preview') === '1') {
      return;
    }
    const desired = `#${step}`;
    if (window.location.hash !== desired) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${desired}`);
    }
  });

  return (
    <HomeContext.Provider
      value={{
        data,
        //@ts-ignore
        setData: (partialData: Partial<HomeContextData>) =>
          setData((previousData) => ({ ...(previousData || {}), ...partialData })),
        isLoading,
        setIsLoading,
        setHubspotContactId,
        mostAdvancedStep,
        currentStep,
        parcoursSlug,
        chapters,
        chaptersLoaded,
        navbarVariants,
        themeColor,
        //@ts-ignore
        setCurrentStep: (step: HOME_STEPS_KEYS) => {
          // eslint-disable-next-line solid/reactivity
          async () => {
            if (hubspotContactId) {
              await client['/contacts/{contact_id}'].put({
                params: {
                  contact_id: hubspotContactId().toString(),
                },
                json: {
                  //@ts-ignore
                  data: DemoObjectToHubspotObject({ CURRENT_STEP: step as HOME_STEPS }),
                },
                query: {},
              });
            }
          };
          setCurrentStep(step);
        },
      }}
    >
      {props.children}
    </HomeContext.Provider>
  );
};

export function useHome(): HomeContextReturn {
  const client = useContext(HomeContext);

  if (!client) {
    throw new Error('No HomeContext set, use HomeProvider to set one');
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  return client;
}
