import { Component } from 'solid-js';

import { HomeTool1_Summary } from '../sections/HomeTool1-Summary';
import { HomeTool2_Summary } from '../sections/HomeTool2-Summary';
import { HomeTool3_Summary as HomeTool3_SummaryRaw } from '../sections/HomeTool3-Summary';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';
import { CUSTOM_COMPONENTS_META } from './customComponents.meta';
import { IntroFormFields } from './customSnippets/IntroFormFields';
import { DoctorToolboxStepsRef } from './customSnippets/ObservationParts';
import { HomeOurPricingBody, NextStepsRef } from './customSnippets/PricingParts';
import { HomeTransitionBody } from './customSnippets/TransitionParts';
import { HomeEndBody } from './customSnippets/EndParts';
import {
  PresentationBrandHeader,
  PresentationInlineVideo,
  PresentationNextButton,
} from './customSnippets/PresentationParts';

/**
 * Runtime registry: maps a custom-component `name` to its Solid component
 * implementation. Used by the renderer when it encounters a `componentRef`
 * block. The list of available names + descriptions lives in
 * `customComponents.meta.ts` so the API route can read it without pulling
 * in browser-only deps.
 *
 * To register a new custom component:
 *   1. Add it here under the matching `name`.
 *   2. Add the same `name` + a description in `customComponents.meta.ts`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CUSTOM_COMPONENT_RUNTIME: Record<string, Component<HOME_SECTION_PROPS & any>> = {
  DoctorToolboxStepsRef,
  HomeTool1_Summary,
  HomeTool2_Summary,
  HomeOurPricingBody,
  HomeTransitionBody,
  HomeEndBody,
  NextStepsRef,
  HomeTool3_Summary: (props: HOME_SECTION_PROPS & { onVisible?: () => void }) => (
    <HomeTool3_SummaryRaw {...props} onVisible={props.onVisible ?? (() => {})} />
  ),
  IntroFormFields,
  PresentationBrandHeader,
  PresentationInlineVideo,
  PresentationNextButton,
};

// Re-export the metadata so renderer-side code can also import a single symbol.
export { CUSTOM_COMPONENTS_META };
