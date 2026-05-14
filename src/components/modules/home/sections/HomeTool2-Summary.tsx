/* eslint-disable solid/no-innerhtml */
import { Component } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';
import { useI18nDict } from '../../../../services/useI18nDict';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { AfterHeroContainer } from '../components/AfterHeroContainer';
import { DoctorToolboxStepsSection } from '../components/DoctorToolboxSteps';
import { QuestionsBox } from '../components/QuestionsBox';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';

export const HomeTool2_Summary: Component<HOME_SECTION_PROPS> = (props) => {
  const i18n = useI18n();
  const t = useI18nDict({ fr: HomeTool2_Summary_FR });

  return (
    <>
      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center gap-6 md:min-h-dvh">
          <div>
            <p class="font-doctorline text-[40px] font-bold leading-7 text-primary-400">{t()('summary.summary')}</p>
          </div>
          <div>
            <Text variant="3xl" fontWeight="normal" class="text-center text-white">
              {i18n().t('layout.stepper.sections.tool.step2')}
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
                <i class="icon bg-toolbox2-notifications block h-[75.50px] w-[75.89px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-white">
                  {t()('summary.cards.notifications.title')}
                </Title>
                <Text class="!leading-snug text-white">{t()('summary.cards.notifications.description')}</Text>
              </div>
            </div>

            <div class="relative space-y-6 rounded-3xl bg-primary-600 px-6 py-8">
              <div>
                <i class="icon bg-toolbox2-teleconsult block h-14 w-24" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-white">
                  {t()('summary.cards.teleconsult.title')}
                </Title>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
              <div>
                <i class="icon bg-toolbox2-org block h-16 w-[63.50px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-primary-900">
                  {t()('summary.cards.org.title')}
                </Title>
              </div>
            </div>

            <div class="relative space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
              <div>
                <i class="icon bg-toolbox2-documents absolute left-0 top-8 block h-16 w-[200px]" />
              </div>
              <div class="space-y-1 pt-16">
                <Title variant="h3" class="text-primary-900">
                  {t()('summary.cards.documents.title')}
                </Title>
              </div>
            </div>

            <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
              <div>
                <i class="icon icon-hand-coin-fill block size-16 bg-primary-600" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-primary-900">
                  {t()('summary.cards.tpe.title')}
                </Title>
              </div>
            </div>
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] w-full max-w-[600px] flex-col items-center justify-center md:min-h-dvh">
          <div class="w-full">
            <QuestionsBox currentKey="HomeTool2" />
          </div>
        </div>
      </AfterHeroContainer>

      <DoctorToolboxStepsSection currentStep={3} setCurrentStep={props.setCurrentStep} />
    </>
  );
};

const HomeTool2_Summary_FR = {
  summary: {
    summary: 'bilan',
    title: `Un agenda <span class="p-3 py-5 bg-no-repeat bg-contain bg-center" style="background-image:url('/illustrations/toolbox-1-summary-circle.svg')">complet,</span><br/>conçu pour la médecine générale`,
    cards: {
      org: {
        title: 'Votre organisation adaptable à chaque patient',
      },
      notifications: {
        title: 'Notifications premium',
        description: 'SMS priorisés par rapport aux emails, sans marque, et personnalisables',
      },
      documents: {
        title: 'Partage de documents sécurisé et flexible',
      },
      teleconsult: {
        title: 'La téléconsultation en 1 clic',
      },
      tpe: {
        title: 'TPE virtuel pour vos (télé)consultations',
      },
    },
  },
};
