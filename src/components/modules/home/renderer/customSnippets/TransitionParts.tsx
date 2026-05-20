/* eslint-disable solid/no-innerhtml */
import { Component, createSignal } from 'solid-js';

import { useI18n } from '../../../../../lang/useI18n';
import { useI18nDict } from '../../../../../services/useI18nDict';
import { Card } from '../../../../atoms/Card';
import { Icon } from '../../../../atoms/Icon';
import { Text } from '../../../../primitives/Text';
import { Title } from '../../../../primitives/Title';
import { AfterHeroContainer } from '../../components/AfterHeroContainer';
import { SectionNextButton } from '../../components/SectionNextButton';
import { TakeAppointment } from '../../components/TakeAppointment';
import { useHome } from '../../context/HomeContext';
import { HOME_STEPS } from '../../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

const FR = {
  infos: {
    title: 'Chez nous tout est inclus sans surcoût !',
    point1: 'formation e-learning (2h par médecin)',
    point2: 'rendez-vous avec un formateur dédié (1h par médecin)',
    point3: 'aide à la transition:',
    point3_1: '- transfert de données',
    point3_2: '- cartes de visite et affiches (sans marque)',
    point3_3: '- campagne pour prévenir les patients',
    point4: 'tchat disponible dans l’interface',
    subtitle: 'Comptez 3 à 4 semaines pour un démarrage, sans courir !',
  },
};

const CheckRow: Component<{ children: unknown }> = (p) => (
  <div class="flex gap-2">
    <div class="pt-1.5">
      <Icon variant="primary400" size="3xs" icon="icon icon-check-line" isRounded />
    </div>
    <div>{p.children as any}</div>
  </div>
);

/** Corps bespoke STEP_NEXT_TRANSITION : info card + TakeAppointment + bouton "suivant". */
export const HomeTransitionBody: Component<HOME_SECTION_PROPS> = (props) => {
  const i18n = useI18n();
  const t = useI18nDict({ fr: FR });
  const { isLoading } = useHome();
  const [haveRDV, setHaveRDV] = createSignal(false);

  const onNext = () => props.setCurrentStep(HOME_STEPS.END);

  return (
    <>
      <AfterHeroContainer>
        <div class="m-auto w-full max-w-[600px] space-y-6 px-1 py-16">
          <Card>
            <div class="space-y-6">
              <div class="space-y-4">
                <Title variant="h6">{t()('infos.title')}</Title>
              </div>

              <div class="w-full space-y-2 rounded-2xl bg-primary-50 p-4">
                <CheckRow>
                  <Text>{t()('infos.point1')}</Text>
                </CheckRow>
                <CheckRow>
                  <Text>{t()('infos.point2')}</Text>
                </CheckRow>
                <CheckRow>
                  <Text>
                    <span innerHTML={t()('infos.point3')} />
                  </Text>
                  <div class="pl-1">
                    <div>
                      <Text>
                        <span innerHTML={t()('infos.point3_1')} />
                      </Text>
                    </div>
                    <div>
                      <Text>
                        <span innerHTML={t()('infos.point3_2')} />
                      </Text>
                    </div>
                    <div>
                      <Text>
                        <span innerHTML={t()('infos.point3_3')} />
                      </Text>
                    </div>
                  </div>
                </CheckRow>
                <CheckRow>
                  <Text>
                    <span innerHTML={t()('infos.point4')} />
                  </Text>
                </CheckRow>
              </div>

              <div class="text-center">
                <Text class="text-primary-400">{t()('infos.subtitle')}</Text>
              </div>
            </div>
          </Card>
        </div>
      </AfterHeroContainer>

      <AfterHeroContainer>
        <div class="m-auto w-full max-w-[600px] space-y-6 px-1 py-16">
          <TakeAppointment setHaveRDV={setHaveRDV} />

          <div class="flex w-full max-w-[600px] justify-end pt-16">
            <div>
              <SectionNextButton
                disabled={!haveRDV()}
                text={i18n().t('components.modules.home.sections.next')!}
                isLoading={isLoading()}
                onClick={onNext}
              />
            </div>
          </div>
        </div>
      </AfterHeroContainer>
    </>
  );
};
