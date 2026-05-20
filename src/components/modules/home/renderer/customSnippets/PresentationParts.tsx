import { createElementSize } from '@solid-primitives/resize-observer';
// eslint-disable-next-line import/no-unresolved
import { clientOnly } from '@solidjs/start';
import { Component, createSignal } from 'solid-js';

import { Title } from '../../../../primitives/Title';
import { defaultVideoI18nPropsFR } from '../../../../primitives/Video';
import { SectionNextButton } from '../../components/SectionNextButton';
import { HOME_STEPS, HOME_STEPS_KEYS } from '../../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

/**
 * Custom snippets used by the data-driven PRESENTATION chapter. Lifted as-is
 * from the original `HomePresentationSection.tsx`, broken into three small
 * registered components so the surrounding chrome stays in code (not editable
 * via the manager) while the actual content (subtitle text, video src, key
 * points card) lives as proper blocks in Supabase.
 *
 * Registered in `customComponents.tsx` and surfaced in
 * `customComponents.meta.ts` so the manager's componentRef picker lists them.
 */

// ============================================================
// Brand header (logo + centered subtitle)
// ============================================================

const Video = clientOnly(() => import('../../../../primitives/Video').then((m) => ({ default: m.Video })));

export const PresentationBrandHeader: Component<HOME_SECTION_PROPS & { subTitle?: string }> = (props) => {
  const [parentLogoRef, setParentLogoRef] = createSignal<HTMLElement>();
  const size = createElementSize(parentLogoRef);

  return (
    <div class="m-auto max-w-[620px] space-y-6 pb-12 pt-32" ref={setParentLogoRef}>
      <div class="m-auto w-fit">
        <i class="brand icon-brand-logo block h-8 max-w-60 bg-secondary-900" style={{ width: `${size.width}px` }} />
      </div>
      <Title variant="h5" tag="h2" class="text-center text-secondary-900">
        {props.subTitle ?? 'Découvrez MadeForMed'}
      </Title>
    </div>
  );
};

// ============================================================
// Inline rounded Vimeo video (aspect-video, max-w-5xl)
// ============================================================

export const PresentationInlineVideo: Component<HOME_SECTION_PROPS & { src?: string }> = (props) => {
  return (
    <div class="m-auto aspect-video size-full max-w-5xl">
      <Video src={props.src ?? ''} class="rounded-3xl" i18n={defaultVideoI18nPropsFR} />
    </div>
  );
};

// ============================================================
// Next button (chrome — drives the stepper)
// ============================================================

export const PresentationNextButton: Component<HOME_SECTION_PROPS & { text?: string; nextStep?: HOME_STEPS_KEYS }> = (
  props,
) => {
  return (
    <div class="m-auto flex max-w-[620px] justify-end pb-12 pt-6">
      <div>
        <SectionNextButton
          text={props.text ?? "C'est parti"}
          onClick={() => props.setCurrentStep(props.nextStep ?? HOME_STEPS.INTRO)}
        />
      </div>
    </div>
  );
};
