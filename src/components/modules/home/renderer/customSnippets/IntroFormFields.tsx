// eslint-disable-next-line import/no-unresolved
import { clientOnly } from '@solidjs/start';
import { Component } from 'solid-js';

import { HOME_STEPS_KEYS } from '../../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

/**
 * Client-only wrapper around IntroFormFieldsImpl — the form implementation
 * uses `@modular-forms/solid` + DOM refs which break SSR hydration. Loading
 * it via `clientOnly` skips SSR entirely so the renderer mounts a fresh
 * client-side instance after hydration.
 */
const IntroFormFieldsClient = clientOnly(() =>
  import('./IntroFormFieldsImpl').then((m) => ({ default: m.IntroFormFieldsImpl })),
);

export const IntroFormFields: Component<
  HOME_SECTION_PROPS & {
    cardTitle?: string;
    cardDescription?: string;
    cardIcon?: string;
    nextButtonText?: string;
    loadingText?: string;
    nextStep?: HOME_STEPS_KEYS;
  }
> = (props) => <IntroFormFieldsClient {...props} />;
