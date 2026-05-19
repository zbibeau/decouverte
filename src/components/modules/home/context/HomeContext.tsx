import Cookies from 'js-cookie';
import { Accessor, createContext, createEffect, createSignal, JSX, on, onMount, Setter, useContext } from 'solid-js';
import { boolean, object, string } from 'zod';
import * as z from 'zod';

import client from '../../../../services/api/RESTClient';
import {
  HubspotCookieName,
  LOCALSTORAGE_DATA_KEY,
  LOCALSTORAGE_MOST_ADVANCED_STEP_KEY,
  LOCALSTORAGE_STEP_KEY,
} from '../utils/HomeIds';
import {
  type ChapterStub,
  type NavbarVariant,
  loadChapterSequence,
  loadNavbarVariants,
} from '../renderer/loadChapter';
import { HOME_STEPS, HOME_STEPS_KEYS } from '../utils/HomeSteps';
import { HOME_STEPS_LAYOUT_VALUE } from '../utils/HomeUtils';
import { loadDynamicHubspotMappings } from '../utils/dynamicHubspotMapping';
import {
  DemoObjectToHubspotObject,
  HubspotObject,
  HubspotObjectToDemoObject,
  setDynamicHubspotMappings,
} from '../utils/HubspotMapping';
import { getPreviewParams } from '../utils/previewMode';

//Mock return to be sure HMR works
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
  // Stable per-mount slug : whichever slug the route declared at mount
  // time. Wrapped in an accessor for context API consistency.
  const parcoursSlug = () => props.parcoursSlug ?? DEFAULT_PARCOURS_SLUG;
  // Namespace persistent state by parcours slug so visiting a custom
  // parcours doesn't restore demo-ventes' last-known step. Demo-ventes
  // keeps the legacy unprefixed keys for back-compat with existing users.
  const stepKey = () =>
    parcoursSlug() === DEFAULT_PARCOURS_SLUG
      ? LOCALSTORAGE_STEP_KEY
      : `${LOCALSTORAGE_STEP_KEY}.${parcoursSlug()}`;
  const dataKey = () =>
    parcoursSlug() === DEFAULT_PARCOURS_SLUG
      ? LOCALSTORAGE_DATA_KEY
      : `${LOCALSTORAGE_DATA_KEY}.${parcoursSlug()}`;
  const mostAdvancedKey = () =>
    parcoursSlug() === DEFAULT_PARCOURS_SLUG
      ? LOCALSTORAGE_MOST_ADVANCED_STEP_KEY
      : `${LOCALSTORAGE_MOST_ADVANCED_STEP_KEY}.${parcoursSlug()}`;

  onMount(async () => {
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

    // Load the chapter sequence from DB. The dynamic stepper uses this
    // to know what chapters exist and how to navigate; the default
    // parcours falls back to its hardcoded HOME_STEPS order when the DB
    // hasn't been seeded yet.
    loadChapterSequence(parcoursSlug())
      .then((seq) => {
        setChapters(seq);
        setChaptersLoaded(true);
        if (seq.length === 0) return;
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
        const stored = typeof window !== 'undefined' ? localStorage?.getItem(stepKey()) : null;
        const storedIsValid = !!stored && validSlugs.has(stored);
        if (storedIsValid) {
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

    // Preview mode: manager iframe injects step + variables via query params.
    // Skip localStorage/Hubspot entirely and drive state from the URL.
    const preview = getPreviewParams();
    if (preview) {
      setData(preview.data);
      setCurrentStep(preview.step);
      setMostAdvancedStep(preview.step);
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
          const [mostAdvancedGroup, mostAdvancedGroupStep] = HOME_STEPS_LAYOUT_VALUE[mostAdvancedStep()]
            .split('.')
            .map((v) => parseInt(v));
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
