/* eslint-disable solid/no-innerhtml */
import { Component } from 'solid-js';

import { useI18nDict } from '../../../../../services/useI18nDict';
import { BrandBadge } from '../../../../atoms/BrandBadge';
import { BrandButton } from '../../../../atoms/BrandButton';
import { KeywordItalic } from '../../../../atoms/KeywordItalic';
import { HOME_STEPS } from '../../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

const FR = {
  eyebrow: 'Visite terminée',
  title: "Bravo, c'est",
  titleEm: 'terminé.',
  description: 'Parlons de votre cabinet quand vous voulez.',
  cta1: 'Prenez un rendez-vous',
  cta2: 'Partagez cette découverte',
};

/**
 * Écran final — refonte « moderne » (handoff Lot 5 §10 Fin).
 *
 * Bookend visuel avec le hero de présentation : fond radial violet
 * (`bg-hero-violet`, lot 1), médaillon ✓ blanc tilté en `BrandBadge`
 * size lg (84px), titre h1 blanc 900 avec mot italique en ocre clair,
 * paragraphe blanc/80, deux CTAs (white-on-violet + ghost-on-violet).
 *
 * `CompletionCelebration` (confettis) est déjà rendu globalement
 * ailleurs — on ne le réinjecte pas ici.
 */
export const HomeEndBody: Component<HOME_SECTION_PROPS> = (props) => {
  const t = useI18nDict({ fr: FR });

  return (
    <section class="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-hero-violet px-6 pb-16 pt-8 text-white">
      <div class="relative z-10 mx-auto flex max-w-md flex-col items-center space-y-6 text-center">
        {/* Médaillon ✓ tilté — primitive BrandBadge en tone light + size lg.
            Le tilt -4deg est intégré dans BrandBadge ; le shadow-badge
            donne la profondeur signature. */}
        <BrandBadge tone="light" size="lg">
          <i class="icon icon-check-line block h-10 w-10 bg-primary-600" />
        </BrandBadge>

        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">{t()('eyebrow')}</p>

        <h1 class="text-[clamp(32px,8vw,52px)] font-black leading-[1.05] tracking-[-0.03em] text-white">
          {t()('title')} <KeywordItalic tone="ocre-light">{t()('titleEm')}</KeywordItalic>
        </h1>

        <p class="max-w-xs text-base leading-relaxed text-white/85">{t()('description')}</p>

        <div class="flex w-full max-w-xs flex-col items-stretch gap-3 pt-4">
          {/* CTA primaire : blanc-sur-violet (handoff §10). */}
          <BrandButton
            variant="whiteOnViolet"
            size="lg"
            block
            onClick={() => props.setCurrentStep(HOME_STEPS.PRESENTATION)}
          >
            {t()('cta1')}
          </BrandButton>
          {/* CTA secondaire : ghost transparent border-white/55. */}
          <BrandButton
            variant="ghostOnViolet"
            size="lg"
            block
            onClick={() => props.setCurrentStep(HOME_STEPS.STEP_OBSERVATION)}
          >
            {t()('cta2')}
          </BrandButton>
        </div>
      </div>
    </section>
  );
};
