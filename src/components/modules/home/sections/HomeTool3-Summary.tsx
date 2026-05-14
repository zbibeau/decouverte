/* eslint-disable solid/no-innerhtml */
import { createVisibilityObserver } from '@solid-primitives/intersection-observer';
import { Component, createEffect } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';
import { useI18nDict } from '../../../../services/useI18nDict';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { AfterHeroContainer } from '../components/AfterHeroContainer';
import { NextStepsSection } from '../components/NextSteps';
import { QuestionsBox } from '../components/QuestionsBox';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';

let el: HTMLDivElement | undefined;
export const HomeTool3_Summary: Component<HOME_SECTION_PROPS & { onVisible: () => void }> = (props) => {
  const i18n = useI18n();
  const t = useI18nDict({ fr: HomeTool3_Summary_FR });

  const visible = createVisibilityObserver({ threshold: 0.1 })(() => el);

  createEffect(() => {
    if (visible()) {
      props.onVisible();
    }
  });

  return (
    <div ref={el}>
      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center gap-6 md:min-h-dvh">
          <div>
            <p class="font-doctorline text-[40px] font-bold leading-7 text-primary-400">{t()('summary.summary')}</p>
          </div>
          <div>
            <Text variant="3xl" fontWeight="normal" class="text-center text-white">
              {i18n().t('layout.stepper.sections.tool.step3')}
            </Text>
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center md:min-h-dvh">
          <div>
            <p class="text-center text-[32px] leading-[48px] text-white">
              <span innerHTML={t()('summary.title')} />
            </p>
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="m-auto grid h-full items-center gap-4 md:w-[584px] md:grid-cols-2">
          <div class="space-y-4">
            <div class="space-y-6 rounded-3xl bg-primary-600 px-6 py-8">
              <div>
                <i class="icon bg-toolbox3-infos block h-[74px] w-[68.97px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-white">
                  {t()('summary.cards.infos.title')}
                </Title>
                <Text class="!leading-snug text-white">{t()('summary.cards.infos.description')}</Text>
              </div>
            </div>

            <div class="relative space-y-6 rounded-3xl bg-primary-600 px-6 py-8">
              <div>
                <i class="icon bg-toolbox3-campaign absolute left-0 top-[21.95px] block h-[86.05px] w-[86.07px]" />
              </div>
              <div class="space-y-1 pt-14">
                <Title variant="h3" class="text-white">
                  {t()('summary.cards.campaign.title')}
                </Title>
                <Text class="!leading-snug text-white">{t()('summary.cards.campaign.description')}</Text>
              </div>
            </div>

            <div class="space-y-6 rounded-3xl bg-primary-600 px-6 py-8">
              <div>
                <i class="icon bg-toolbox3-messages block h-[78.23px] w-[68.34px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-white">
                  {t()('summary.cards.messages.title')}
                </Title>
                <Text class="!leading-snug text-white">{t()('summary.cards.messages.description')}</Text>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
              <div>
                <i class="icon bg-toolbox3-sms block h-[74px] w-[68.97px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-primary-900">
                  {t()('summary.cards.sms.title')}
                </Title>
              </div>
            </div>

            <div class="relative space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
              <div>
                <i class="icon bg-toolbox3-inbox block h-[74px] w-[68.97px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-primary-900">
                  {t()('summary.cards.inbox.title')}
                </Title>
                <Text class="!leading-snug text-primary-900">{t()('summary.cards.inbox.description')}</Text>
              </div>
            </div>

            <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
              <div>
                <i class="icon bg-toolbox3-website block h-[78.23px] w-[68.34px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-primary-900">
                  {t()('summary.cards.website.title')}
                </Title>
              </div>
            </div>
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] w-full max-w-[600px] flex-col items-center justify-center md:min-h-dvh">
          <div class="w-full">
            <QuestionsBox currentKey="HomeTool3" />
          </div>
        </div>
      </AfterHeroContainer>

      <NextStepsSection currentStep={1} setCurrentStep={props.setCurrentStep} />
    </div>
  );
};

const HomeTool3_Summary_FR = {
  summary: {
    summary: 'bilan',
    title: `Communiquez sans vous<span class="p-3 py-5 bg-no-repeat bg-contain bg-center" style="background-image:url('/illustrations/toolbox-1-summary-circle.svg')">exposer</span><br/>`,
    cards: {
      infos: {
        title: 'Vos coordonnées préservées',
        description: 'Toutes les communications au nom du cabinet',
      },
      sms: {
        title: 'Envoi de SMS : plus efficace qu’un coup de fil !',
      },
      campaign: {
        title: 'Envoi de SMS groupés',
        description: 'Retards, préventions, objets trouvés',
      },
      inbox: {
        title: 'Une messagerie maîtrisée',
        description: 'Vos patients peuvent vous contacter quand vous les décidez.',
      },
      messages: {
        title: 'Vos messages pratico-pratiques 100% lus ou entendus',
        description: 'Déménagement, port du masque, travaux, ...',
      },
      website: {
        title: 'Votre propre site Internet pour la prise de rendez-vous',
      },
    },
  },
};
