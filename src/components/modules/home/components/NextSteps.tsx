import { createWindowSize } from '@solid-primitives/resize-observer';
import cx from 'classix';
import { createMemo, For } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';
import { Button } from '../../../atoms/Button';
import { Icon } from '../../../atoms/Icon';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { HOME_STEPS } from '../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';

const NextStepCard = (props: { cardStep: number; currentStep: number; onClick: () => void }) => {
  const i18n = useI18n();
  const isActive = createMemo(() => props.cardStep === props.currentStep);

  const isMobileDisplay = isLayoutMobileDisplay();

  return (
    <div
      class={cx(
        'rounded-3xl',
        isMobileDisplay()
          ? 'h-[176px] w-full !bg-contain !bg-right bg-no-repeat p-3'
          : 'h-dvh max-h-[480px] bg-contain bg-right-bottom bg-no-repeat p-6',
        isActive() === true
          ? 'cursor-pointer bg-white shadow-xl'
          : 'bg-gray-800 bg-opacity-10 opacity-50 mix-blend-luminosity',
      )}
      style={{
        'background-image':
          props.cardStep === 1
            ? `url(/illustrations/pricing-footer${isActive() ? '-active' : ''}.webp)`
            : `url(/illustrations/transition-footer${isActive() ? '-active' : ''}.webp)`,
        'background-position': props.cardStep === 1 ? 'right bottom 3rem' : undefined,
        'background-size': props.cardStep === 2 ? '90%' : props.cardStep === 1 && !isActive() ? '93%' : undefined,
      }}
      onClick={() => isActive() && props.onClick()}
    >
      <div class="flex size-full flex-col justify-center gap-4 bg-contain bg-right bg-no-repeat">
        <div class={cx((!isMobileDisplay() || (isMobileDisplay() && isActive())) && 'grow')}>
          <div class="flex h-full flex-col gap-4">
            <div class={cx('grow', isMobileDisplay() && 'flex h-full w-full items-center')}>
              <div class={isMobileDisplay() ? 'space-y-2' : 'space-y-4'}>
                <NextStepNumber
                  number={props.cardStep}
                  isMobile={isMobileDisplay()}
                  isActive={isActive()}
                  isPast={props.cardStep < props.currentStep}
                />

                <Text
                  tag="p"
                  variant={isMobileDisplay() ? 'base' : '2xl'}
                  fontWeight="medium"
                  class={cx(
                    isActive() ? 'text-primary-900' : 'text-white',
                    isMobileDisplay() ? 'max-w-[220px] xs:max-w-[70vw]' : '!leading-[32px]',
                  )}
                >
                  <span
                    // eslint-disable-next-line solid/no-innerhtml
                    innerHTML={i18n().t(`layout.stepper.sections.next.step${props.cardStep.toString() as '1'}`)}
                  />
                </Text>
              </div>
            </div>
          </div>
        </div>

        {isActive() && (
          <div>
            <Button size={isMobileDisplay() ? 'xs' : 'sm'} onClick={props.onClick} class="w-full">
              {i18n().t('layout.stepper.discover')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const NextStepNumber = (props: { number: number; isMobile?: boolean; isActive?: boolean; isPast?: boolean }) => {
  return (
    <div
      class={cx(
        'flex rotate-[-4deg] items-center justify-center rounded-xl bg-primary-400 font-medium text-white',
        props.isActive ? 'bg-primary-900' : 'bg-white bg-opacity-15',
        props.isMobile ? 'h-8 w-8 text-lg' : 'h-10 w-10 text-2xl',
      )}
    >
      {!props.isPast && <div>{props.number}</div>}
      {props.isPast && <Icon icon="icon icon-check-fill !bg-white" isTransparent />}
    </div>
  );
};

const MAX_MOBILE_WIDTH = 700;

const isLayoutMobileDisplay = () => {
  const windowSize = createWindowSize();

  const isMobileDisplay = createMemo(() => windowSize.width <= MAX_MOBILE_WIDTH);

  return isMobileDisplay;
};

export const NextStepsSection = (props: {
  setCurrentStep: HOME_SECTION_PROPS['setCurrentStep'];
  currentStep: number;
}) => {
  const i18n = useI18n();

  const isMobileDisplay = isLayoutMobileDisplay();

  return (
    <div class="min-h-[calc(100dvh-56px)] snap-start bg-radial-gradient md:min-h-dvh">
      <div
        class={cx(
          'flex flex-col items-center justify-center',
          isMobileDisplay() ? 'gap-4 p-4' : 'min-h-dvh gap-8 px-4 py-16 md:p-16',
        )}
      >
        <div>
          <Title tag="h2" variant={isMobileDisplay() ? 'h4' : 'h3'} class="text-center text-primary-900">
            {i18n().t('layout.stepper.sections.next.title')}
          </Title>
        </div>

        <div class={cx('mx-auto w-full max-w-[586px]', !isMobileDisplay() && 'flex items-center justify-center')}>
          <div class={cx('grid h-full w-full', isMobileDisplay() ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-2.5')}>
            <For each={[1, 2]}>
              {(step) => (
                <NextStepCard
                  cardStep={step}
                  currentStep={props.currentStep}
                  onClick={() =>
                    props.setCurrentStep(step === 1 ? HOME_STEPS.STEP_NEXT_PRICING : HOME_STEPS.STEP_NEXT_TRANSITION)
                  }
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};
