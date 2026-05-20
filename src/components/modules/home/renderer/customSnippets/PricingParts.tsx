/* eslint-disable solid/no-innerhtml */
import { Component, createSignal, For } from 'solid-js';

import { useI18nDict } from '../../../../../services/useI18nDict';
import { Button } from '../../../../atoms/Button';
import { Card } from '../../../../atoms/Card';
import { Icon } from '../../../../atoms/Icon';
import { CheckListGroup } from '../../../../organisms/CheckListGroup';
import { Text } from '../../../../primitives/Text';
import { Title } from '../../../../primitives/Title';
import { AfterHeroContainer } from '../../components/AfterHeroContainer';
import { NextStepsSection } from '../../components/NextSteps';
import { PERSON_WHO_HANDLE_CALLS, useHome } from '../../context/HomeContext';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

const FR = {
  pricingCalc: '<span class="text-4xl">{{price}}€</span> TTC',
  pricingCalcValues: {
    '1': '299',
    '2': '290',
    '3': '281',
    '4': '272',
    '5': '263',
    '6': '254',
    '7': '250',
  },
  byMonthAndByDoctor: 'par mois et par médecin',
  doctor: '1 médecin',
  doctors: '{{nb}} médecins',
  doctorsMore: '{{nb}} médecins et plus',
  noEngagement: 'sans engagement, incluant tous nos services',
  point1: 'gestion des appels illimités avec la standardiste virtuelle',
  point2: 'site Internet indépendant avec prise de rdv',
  point3: 'téléconsultation',
  point4: 'messagerie centralisée patients/médecin',
  point5: 'échange sécurisé de documents',
  point6: 'TPE virtuel sans commission jusqu’à 20 télépaiements / mois / médecin',
  point7: 'SMS gratuits et illimités (hors campagnes “massives”)',
  pricing: {
    title: '-3% par an',
    description: 'Votre fidélité est récompensée.',
    infos: '(prix plancher de 250€ TTC/mois/médecin)',
  },
  parteners: {
    title: 'Au besoin, activez les services de nos partenaires',
    telesec: { title: 'Télésecrétariat', details: 'pour vos patients assistés : télésecrétariat : 1€ / appel ' },
    tpe: {
      title: 'TPE virtuel',
      details: 'gratuit jusqu’à 20 télépaiements/mois, puis 0,8% au-delà (21 cts pour 26,50€)',
    },
    campaign: {
      title: 'Campagne sms/email',
      details:
        'offerte au démarrage dans la limite de 1500 patients et dans la limite de 100 euros par médecin, puis 0,02€/email ou 0,07€/sms (devis calculé en temps réel)',
    },
  },
  telesec:
    'En moyenne, et même avec quelques options,<br/>nos utilisateurs divisent par 2 leur facture actuelle de télésecrétariat.',
};

/** Carte interactive de pricing (calculateur nb médecins + partenaires + bandeau conditionnel). */
export const HomeOurPricingBody: Component<HOME_SECTION_PROPS> = () => {
  const { data } = useHome();
  const t = useI18nDict({ fr: FR });
  const [nbDoctor, setNbDoctor] = createSignal(1);
  const maxDoctorPricing = 7;

  return (
    <AfterHeroContainer>
      <div class="m-auto w-full max-w-[600px] space-y-6 px-1 py-16">
        <Card>
          <div class="space-y-2 px-4 py-8">
            <div class="space-y-4">
              <div class="text-center">
                <Text variant="xl" fontWeight="medium">
                  <span
                    innerHTML={t()('pricingCalc', {
                      price: t()(`pricingCalcValues.${nbDoctor().toString() as '1'}`),
                    })}
                  />
                </Text>
                <Text variant="lg">{t()('byMonthAndByDoctor')}</Text>
              </div>

              <div class="mx-auto flex w-fit items-center justify-between gap-2 rounded-full bg-primary-100 p-2">
                <Button
                  prefixIcon="icon icon-subtract-line"
                  size="xs"
                  disabled={nbDoctor() == 1}
                  onClick={() => setNbDoctor(nbDoctor() - 1)}
                />
                <div class="flex-grow text-center">
                  <Text fontWeight="medium" class="text-primary-600">
                    {t()(nbDoctor() == 1 ? 'doctor' : nbDoctor() == maxDoctorPricing ? 'doctorsMore' : 'doctors', {
                      nb: nbDoctor(),
                    })}
                  </Text>
                </div>
                <Button
                  prefixIcon="icon icon-add-line"
                  size="xs"
                  onClick={() => setNbDoctor(nbDoctor() + 1)}
                  disabled={nbDoctor() == maxDoctorPricing}
                />
              </div>
            </div>

            <div>
              <Text class="text-center text-primary-400">{t()('noEngagement')}</Text>
            </div>
          </div>

          <div class="space-y-6">
            <CheckListGroup
              variant="primary50"
              text={[
                t()('point1')!,
                t()('point2')!,
                t()('point3')!,
                t()('point4')!,
                t()('point5')!,
                t()('point6')!,
                t()('point7')!,
              ]}
            />
          </div>

          <div class="space-y-4 rounded-2xl bg-primary-200 px-4 py-6 text-center">
            <div>
              <Text variant="2xl" fontWeight="medium" class="text-primary-600">
                {t()('pricing.title')}
              </Text>
            </div>
            <div>
              <Text fontWeight="medium">{t()('pricing.description')}</Text>
              <Text>{t()('pricing.infos')}</Text>
            </div>
          </div>
        </Card>

        <Card class="space-y-6">
          <Title variant="h6" class="text-center">
            {t()('parteners.title')}
          </Title>
          <div class="grid items-stretch gap-2 md:grid-cols-3">
            <For each={['telesec', 'tpe', 'campaign']}>
              {(v) => (
                <div class="space-y-4 rounded-2xl bg-secondary-50 px-2 pb-4 pt-2">
                  <div>
                    <Text variant="sm" fontWeight="medium" class="pt-4 text-center text-secondary-400">
                      {t()(`parteners.${v as 'telesec'}.title`)}
                    </Text>
                  </div>
                  <div>
                    <Text variant="2xs" class="!text-sm leading-[14px] md:!text-[10px]">
                      {t()(`parteners.${v as 'telesec'}.details`)}
                    </Text>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Card>

        {data()?.personWhoHandleCalls !== PERSON_WHO_HANDLE_CALLS.SECRETARY && (
          <div
            class="rounded-2xl bg-cover bg-center"
            style={{ 'background-image': 'url(/background/bg-pricing.webp)' }}
          >
            <div class="w-full space-y-2 rounded-2xl bg-black/50 p-4">
              <Icon
                variant="whiteWarning400"
                isTransparent
                size="lg"
                icon="icon icon-money-euro-circle !bg-secondary-400"
                isRounded
                class="mx-auto"
              />
              <Text variant="sm" fontWeight="medium" class="pb-2 text-center text-white">
                <span innerHTML={t()('telesec')} />
              </Text>
            </div>
          </div>
        )}
      </div>
    </AfterHeroContainer>
  );
};

/** Stepper "Prochaines étapes" (phase next). Prop : currentStep (1, 2 ou 3). */
export const NextStepsRef: Component<HOME_SECTION_PROPS & { currentStep?: number }> = (props) => (
  <NextStepsSection currentStep={props.currentStep ?? 1} setCurrentStep={props.setCurrentStep} />
);
