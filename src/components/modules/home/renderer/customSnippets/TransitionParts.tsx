/* eslint-disable solid/no-innerhtml */
import { Component, createSignal } from 'solid-js';

import { useI18n } from '../../../../../lang/useI18n';
import { useI18nDict } from '../../../../../services/useI18nDict';
import { Icon } from '../../../../atoms/Icon';
import { Text } from '../../../../primitives/Text';
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

/**
 * Petite ligne de check pour le tout-inclus. Refonte Lot 5 §9 :
 * primary-600 par défaut, le caller peut forcer `tone="ocre"` pour
 * le dernier check (handoff : « 3 violets + 1 ocre »).
 */
const CheckRow: Component<{ children: unknown; tone?: 'primary' | 'ocre' }> = (p) => (
  <div class="flex items-start gap-3">
    <div class="pt-1">
      <Icon
        variant={p.tone === 'ocre' ? 'secondary400' : 'primary600'}
        size="3xs"
        icon="icon icon-check-line"
        isRounded
      />
    </div>
    <div class="text-primary-950">{p.children as any}</div>
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
          {/* Refonte handoff §9 Transition : Card boxée legacy →
              wrapper léger violet-border-soft + shadow-card. Header
              en eyebrow uppercase « POUR UNE TRANSITION RÉUSSIE »
              ocre (handoff §9 « kicker »). Checks alternants
              violet/violet/violet/ocre — 4 items max ici, le 4e
              prend la teinte ocre. */}
          <div class="rounded-2xl border border-violet-border-soft bg-white p-6 shadow-card">
            <div class="space-y-6">
              <div class="space-y-2">
                <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary-400">
                  Pour une transition réussie
                </p>
                <h2 class="text-xl font-bold leading-tight text-primary-950">{t()('infos.title')}</h2>
              </div>

              <div class="w-full space-y-3">
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
                  <div class="pl-1 text-violet-text">
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
                {/* 4e check en ocre — accent visuel handoff §9. */}
                <CheckRow tone="ocre">
                  <Text>
                    <span innerHTML={t()('infos.point4')} />
                  </Text>
                </CheckRow>
              </div>

              <div class="text-center">
                <Text class="text-violet-faint">{t()('infos.subtitle')}</Text>
              </div>
            </div>
          </div>
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
