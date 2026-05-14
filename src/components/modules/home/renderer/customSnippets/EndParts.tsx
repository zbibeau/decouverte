/* eslint-disable solid/no-innerhtml */
import { Component } from 'solid-js';

import { useI18nDict } from '../../../../../services/useI18nDict';
import { Button } from '../../../../atoms/Button';
import { Text } from '../../../../primitives/Text';
import { HOME_STEPS } from '../../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

const FR = {
  title: 'Merci !',
  description:
    'Un email de synthèse vient de vous être envoyé.<br/>N’hésitez pas à le partager à vos confrères.<br/>😉',
  backToHome: 'Revenir à la démo',
};

/** Écran final : merci + diagramme + bouton retour vers STEP_OBSERVATION. */
export const HomeEndBody: Component<HOME_SECTION_PROPS> = (props) => {
  const t = useI18nDict({ fr: FR });

  return (
    <div class="flex min-h-dvh items-center justify-center gap-12 bg-dark-950 px-6 pb-16 pt-8 text-white">
      <div class="mx-auto space-y-8">
        <p class="text-center font-madeformed text-[32px]">{t()('title')}</p>

        <img src="/illustrations/end-grid.webp" alt="diagramme" class="mx-auto w-full max-w-[500px]" />

        <Text variant="lg" class="py-3 text-center">
          <span innerHTML={t()('description')} />
        </Text>

        <Button
          variant="primary"
          size="sm"
          class="mx-auto w-fit"
          prefixIcon="icon icon-arrow-left"
          onClick={() => props.setCurrentStep(HOME_STEPS.STEP_OBSERVATION)}
        >
          {t()('backToHome')}
        </Button>
      </div>
    </div>
  );
};
