/* eslint-disable solid/no-innerhtml */
import { Component } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';
import { useI18nDict } from '../../../../services/useI18nDict';
import { Lottie } from '../../../atoms/Lottie';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { AfterHeroContainer } from '../components/AfterHeroContainer';
import { DoctorToolboxStepsSection } from '../components/DoctorToolboxSteps';
import { QuestionsBox } from '../components/QuestionsBox';
import { PERSON_WHO_HANDLE_CALLS, useHome } from '../context/HomeContext';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';

export const HomeTool1_Summary: Component<HOME_SECTION_PROPS> = (props) => {
  const i18n = useI18n();
  const { data } = useHome();
  const t = useI18nDict({ fr: HomeTool1_Summary_FR });

  return (
    <>
      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center gap-6 md:min-h-dvh">
          <div>
            <p class="font-doctorline text-[40px] font-bold leading-7 text-primary-400">{t()('summary.summary')}</p>
          </div>
          <div>
            <Text variant="3xl" fontWeight="normal" class="text-center text-white">
              {i18n().t('layout.stepper.sections.tool.step1')}
            </Text>
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center md:min-h-dvh">
          <div>
            <div class="space-y-2">
              <div>
                <Lottie
                  autoplay
                  loadOnVisible
                  src="/animations/hometool1-camember.lottie"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div>
                <p class="text-center text-[32px] leading-[48px] text-white">
                  <span innerHTML={t()('summary.title')} />
                </p>
              </div>
              <div>
                <img src="/illustrations/toolbox-1-summary-line.svg" alt="ask" class="mx-auto max-w-[153px]" />
              </div>
            </div>
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center md:min-h-dvh">
          <div>
            <div class="space-y-2">
              <div>
                <Lottie
                  autoplay
                  loadOnVisible
                  src="/animations/hometool1-patients.lottie"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div>
                <p class="text-center text-[32px] leading-[48px] text-white">
                  <span innerHTML={t()('summary.bestAnswer')} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="m-auto grid h-full items-center gap-4 md:w-[584px] md:grid-cols-2">
          <div class="space-y-4">
            <div class="relative space-y-6 rounded-3xl bg-primary-600 px-6 py-8">
              <div>
                <i class="icon bg-toolbox1-summary-alice absolute left-0 top-8 block h-[140px] w-[133.46px]" />
              </div>
              <div class="space-y-4 pt-32">
                <Title variant="h1" class="text-white">
                  {t()('summary.cards.alice.highlight')}
                </Title>
                <Title variant="h3" class="text-white">
                  {t()('summary.cards.alice.title')}
                </Title>
              </div>
            </div>

            <div class="relative space-y-6 rounded-3xl bg-primary-600 px-6 py-8">
              <div>
                <i class="icon bg-toolbox2-notifications block h-[75.50px] w-[75.89px]" />
              </div>
              <div class="space-y-1">
                <Title variant="h3" class="text-white">
                  {t()('summary.cards.sms.title')}
                </Title>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            {data().personWhoHandleCalls === PERSON_WHO_HANDLE_CALLS['REMOTE-SECRETARY'] && (
              <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
                <div>
                  <i class="icon bg-toolbox1-summary-pricing block h-24 w-[87.46px]" />
                </div>
                <div class="space-y-1">
                  <Title variant="h3" class="text-primary-900">
                    {t()('summary.cards.pricing.title')}
                  </Title>
                </div>
              </div>
            )}

            {data().personWhoHandleCalls === PERSON_WHO_HANDLE_CALLS['REMOTE-SECRETARY'] && (
              <div class="relative space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
                <div>
                  <i class="icon bg-toolbox1-summary-rules block h-24 w-[87.78px]" />
                </div>
                <div class="space-y-1">
                  <Title variant="h3" class="text-primary-900">
                    {t()('summary.cards.rules.title')}
                  </Title>
                </div>
              </div>
            )}

            {data().personWhoHandleCalls === PERSON_WHO_HANDLE_CALLS.DOCTOR && (
              <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
                <div>
                  <i class="icon bg-toolbox1-summary-decrease block h-[64px] w-[108.444px]" />
                </div>
                <div class="space-y-1">
                  <Title variant="h3" class="text-primary-900">
                    {t()('summary.cards.interruptions.title')}
                  </Title>
                </div>
              </div>
            )}

            {data().personWhoHandleCalls !== PERSON_WHO_HANDLE_CALLS.SECRETARY && (
              <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
                <div>
                  <i class="icon bg-toolbox1-summary-privacy block h-[59.06px] w-20" />
                </div>
                <div class="space-y-1">
                  <Title variant="h3" class="text-primary-900">
                    {t()('summary.cards.privacy.title')}
                  </Title>
                </div>
              </div>
            )}

            {data().personWhoHandleCalls === PERSON_WHO_HANDLE_CALLS.SECRETARY && (
              <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
                <div>
                  <i class="icon bg-toolbox1-summary-decrease block h-[64px] w-[108.444px]" />
                </div>
                <div class="space-y-1">
                  <Title variant="h3" class="text-primary-900">
                    {t()('summary.cards.calls.title')}
                  </Title>
                </div>
              </div>
            )}

            {data().personWhoHandleCalls === PERSON_WHO_HANDLE_CALLS.SECRETARY && (
              <div class="space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
                <div>
                  <i class="icon bg-toolbox1-summary-secAway block h-[70px] w-[88px]" />
                </div>
                <div class="space-y-1">
                  <Title variant="h3" class="text-primary-900">
                    {t()('summary.cards.secAway.title')}
                  </Title>
                </div>
              </div>
            )}

            {data().personWhoHandleCalls === PERSON_WHO_HANDLE_CALLS.SECRETARY && (
              <div class="relative space-y-6 rounded-3xl bg-white bg-radial-gradient px-6 py-8">
                <div>
                  <i class="icon bg-toolbox1-summary-rules block h-24 w-[87.78px]" />
                </div>
                <div class="space-y-1">
                  <Title variant="h3" class="text-primary-900">
                    {t()('summary.cards.sec.title')}
                  </Title>
                </div>
              </div>
            )}
          </div>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer class="bg-dark-950">
        <div class="flex min-h-[calc(100dvh-56px)] w-full max-w-[600px] flex-col items-center justify-center md:min-h-dvh">
          <div class="w-full">
            <QuestionsBox currentKey="HomeTool1" />
          </div>
        </div>
      </AfterHeroContainer>

      <DoctorToolboxStepsSection currentStep={2} setCurrentStep={props.setCurrentStep} />
    </>
  );
};

const HomeTool1_Summary_FR = {
  summary: {
    summary: 'bilan',
    title: `100% des demandes traitées`,
    bestAnswer: `la meilleure réponse pour <span class="p-3 py-5 bg-no-repeat bg-contain bg-center" style="background-image:url('/illustrations/toolbox-1-summary-circle.svg')">chacun</span>`,
    cards: {
      alice: {
        highlight: '24/7',
        title: 'Alice répond à tous les appels en même temps et sans attente',
      },
      sms: {
        title: 'SMS de rappel : fini les oublis',
      },
      pricing: {
        title: 'Divisez par 2 vos factures',
      },
      rules: {
        title: 'Vos consignes 100% respectées',
      },
      privacy: {
        title: 'Maitrisez qui peut vous joindre sans donner votre numéro',
      },
      interruptions: {
        title: 'Moins d’interruptions en consultation',
      },
      calls: {
        title: '65% d’appels en moins',
      },
      secAway: {
        title: 'Secrétaire absente, Alice prend le relais',
      },
      sec: {
        title: 'Secrétaire soulagée, burnout évité !',
      },
    },
  },
};
