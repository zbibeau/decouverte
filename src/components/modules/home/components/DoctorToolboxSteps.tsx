import { createWindowSize } from '@solid-primitives/resize-observer';
import cx from 'classix';
import { createMemo } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';
import { Button } from '../../../atoms/Button';
import { Icon } from '../../../atoms/Icon';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { HOME_STEPS } from '../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';

const DoctorToolboxStepCard = (props: {
  cardStep: number;
  currentStep: number;
  onClick: () => void;
  class?: string;
  backgroundInBlock?: boolean;
}) => {
  const i18n = useI18n();

  const isActive = createMemo(() => props.cardStep === props.currentStep);

  const isMobileDisplay = isLayoutMobileDisplay();

  return (
    <div
      class={cx(
        'rounded-3xl',
        isMobileDisplay()
          ? 'h-[176px] w-full bg-contain bg-right bg-no-repeat p-3'
          : 'h-dvh max-h-[480px] bg-contain bg-no-repeat p-6',
        props.backgroundInBlock && '!px-0',
        props.class,
        isActive() === true
          ? 'cursor-pointer bg-white shadow-xl'
          : 'bg-gray-800 bg-opacity-10 opacity-50 mix-blend-luminosity',
      )}
      style={
        props.backgroundInBlock && !isMobileDisplay()
          ? undefined
          : {
              'background-image': `url(/illustrations/toolbox${props.cardStep}-stepper${isActive() ? '-active' : ''}.png)`,
            }
      }
      onClick={() => isActive() && props.onClick()}
    >
      <div class="flex size-full flex-col justify-center gap-4 bg-contain bg-right bg-no-repeat">
        <div class={cx((!isMobileDisplay() || (isMobileDisplay() && isActive())) && 'grow')}>
          <div class="flex h-full flex-col gap-4">
            <div class={cx('grow', isMobileDisplay() && 'flex h-full w-full items-center')}>
              <div class={isMobileDisplay() ? 'space-y-2' : 'space-y-4'}>
                <div class={cx(props.backgroundInBlock && 'px-6')}>
                  <DoctorToolboxStepNumber
                    number={props.cardStep}
                    isMobile={isMobileDisplay()}
                    isActive={isActive()}
                    isPast={props.cardStep < props.currentStep}
                  />
                </div>

                <div class={cx(props.backgroundInBlock && 'px-6')}>
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
                      innerHTML={i18n().t(`layout.stepper.sections.tool.step${props.cardStep.toString() as '1'}`)}
                    />
                  </Text>
                </div>
              </div>
            </div>

            {props.backgroundInBlock && !isMobileDisplay() && (
              <div class="flex size-full items-center">
                <div>
                  <img
                    src={`/illustrations/toolbox${props.cardStep}-stepper${isActive() ? '-active' : ''}.webp`}
                    alt="illu toolbox"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {isActive() && (
          <div class={cx(props.backgroundInBlock && 'px-6')}>
            <Button size={isMobileDisplay() ? 'xs' : 'sm'} onClick={props.onClick} class="w-full">
              {i18n().t('layout.stepper.discover')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const DoctorToolboxStepNumber = (props: {
  number: number;
  isMobile?: boolean;
  isActive?: boolean;
  isPast?: boolean;
}) => {
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

export const DoctorToolboxStepsSection = (props: {
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
            {i18n().t('layout.stepper.sections.tool.title')}
          </Title>
        </div>

        <div class={cx('mx-auto w-full max-w-[872px]', !isMobileDisplay() && 'flex items-center justify-center')}>
          <div class={cx('grid w-full', isMobileDisplay() ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-2.5')}>
            <DoctorToolboxStepCard
              cardStep={1}
              currentStep={props.currentStep}
              class={cx('bg-right-bottom')}
              onClick={() => props.setCurrentStep(HOME_STEPS.STEP_TOOL_1)}
            />

            <DoctorToolboxStepCard
              cardStep={2}
              // backgroundInBlock
              currentStep={props.currentStep}
              class={cx('bg-right-bottom')}
              onClick={() => props.setCurrentStep(HOME_STEPS.STEP_TOOL_2)}
            />

            <DoctorToolboxStepCard
              cardStep={3}
              currentStep={props.currentStep}
              class={cx('bg-right-bottom')}
              onClick={() => props.setCurrentStep(HOME_STEPS.STEP_TOOL_3)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
