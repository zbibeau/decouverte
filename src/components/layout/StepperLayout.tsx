import { writeClipboard } from '@solid-primitives/clipboard';
import { createWindowSize } from '@solid-primitives/resize-observer';
import { createScrollPosition } from '@solid-primitives/scroll';
import { makeWebShare } from '@solid-primitives/share';
import cx from 'classix';
import { Accessor, Component, createEffect, createMemo, createSignal, JSX, on } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Transition } from 'solid-transition-group';

import { useI18n } from '../../lang/useI18n';
import { BrandLogo } from '../atoms/BrandLogo';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Modal } from '../atoms/Modal';
import { GotToNextPartButton } from '../modules/home/components/GoToNextPartButton';
import { TakeAppointment } from '../modules/home/components/TakeAppointment';
import { stepperContentId } from '../modules/home/utils/HomeIds';
import { HOME_STEPS, HOME_STEPS_KEYS } from '../modules/home/utils/HomeSteps';
import { HOME_SECTIONS_DATA, HOME_STEPS_LAYOUT_VALUE } from '../modules/home/utils/HomeUtils';
import { NavItem, NavItemStatus } from '../molecules/NavItem';
import { NavGroup } from '../organisms/NavGroup';
const MAX_MOBILE_WIDTH = 1200;

export const isLayoutMobileDisplay = () => {
  const windowSize = createWindowSize();

  const isMobileDisplay = createMemo(() => windowSize.width <= MAX_MOBILE_WIDTH);

  return isMobileDisplay;
};

const TakeAppointmentButton = () => {
  const i18n = useI18n();
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [haveRDV, setHaveRDV] = createSignal<boolean>(false);

  return (
    <>
      <Modal isOpen={isModalOpen()} onChange={() => setIsModalOpen(false)}>
        <TakeAppointment setHaveRDV={setHaveRDV} />
      </Modal>
      <Button
        variant="whitePrimary"
        class="w-full"
        size="sm"
        prefixIcon="icon icon-calendar-todo-fill"
        onClick={() => setIsModalOpen(true)}
      >
        {i18n().t('layout.stepper.takeAppointment')}
      </Button>
    </>
  );
};

const ShareButton = () => {
  const i18n = useI18n();

  const share = makeWebShare();
  const [isLinkCopied, setIsLinkCopied] = createSignal<boolean>(false);

  const onShare = async () => {
    const link = window.location.href;

    try {
      await share({
        url: link,
        title: i18n().t('components.modules.home.mobileModal.step1.shareLinkText'),
      });
    } catch (error) {
      writeClipboard(link);

      setIsLinkCopied(true);
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 3000);
    }
  };

  return (
    <Button
      variant="whitePrimary"
      class="w-full"
      size="sm"
      prefixIcon="icon icon-send-plane-fill"
      onClick={() => onShare()}
    >
      {isLinkCopied() ? i18n().t('layout.stepper.shareCopied') : i18n().t('layout.stepper.share')}
    </Button>
  );
};

let ref: HTMLDivElement | undefined;
export const StepperLayout: Component<{
  children: JSX.Element;

  currentStep: Accessor<HOME_STEPS_KEYS>;
  setCurrentStep: (step: HOME_STEPS_KEYS) => void;

  mostAdvancedStep: Accessor<HOME_STEPS_KEYS>;
}> = (props) => {
  const i18n = useI18n();

  const isMobileDisplay = isLayoutMobileDisplay();
  const [isMobileMenuDisplay, setIsMobileMenuDisplay] = createSignal(false);
  const windowScroll = createScrollPosition(() => ref);

  createEffect(
    on(isMobileDisplay, () => {
      setIsMobileMenuDisplay(false);
    }),
  );

  createEffect(() => {
    if (props.currentStep()) {
      setIsMobileMenuDisplay(false);
    }
  });

  const percentageContent = createMemo(() => {
    let elementHeight = window.innerHeight;
    let scrollY = windowScroll.y;
    try {
      elementHeight = document.getElementById(stepperContentId).scrollHeight;
      // eslint-disable-next-line no-empty
    } catch (error) {}

    //Remove first section
    if (scrollY <= window.innerHeight) {
      scrollY = 0;
    } else {
      scrollY -= window.innerHeight;
      //Remove first section + Last
      elementHeight -= window.innerHeight * 2;
    }

    return Math.ceil((scrollY * 100) / elementHeight);
  });

  return (
    <div
      class={cx('flex h-dvh w-dvw bg-cover bg-center bg-no-repeat', isMobileDisplay() && 'flex-col')}
      style={{
        'background-image': 'url(/background/bg-hero-content.webp)',
        'box-shadow': 'inset 0 0 0 100dvh rgba(255, 248, 238, 0.5)',
      }}
    >
      {!isMobileDisplay() ? (
        <div class="flex h-full max-w-[17.5rem] flex-col justify-between space-y-5 p-6 shadow-sidebar shadow-shadow-sidebar">
          <div class="mx-auto">
            <BrandLogo variant="secondary900" size="1.5x" />
          </div>

          <div class="h-full space-y-5 overflow-auto">
            <NavItem
              text={i18n().t('layout.stepper.back')!}
              status={NavItemStatus.back}
              onClick={() => props.setCurrentStep(HOME_STEPS.INTRO)}
            />

            <NavGroup
              data={HOME_SECTIONS_DATA(i18n().t, props.setCurrentStep)}
              actualStep={HOME_STEPS_LAYOUT_VALUE[props.currentStep()]}
              disableFromStep={props.mostAdvancedStep() ? HOME_STEPS_LAYOUT_VALUE[props.mostAdvancedStep()] : undefined}
            />
          </div>

          <div class="space-y-1">
            <TakeAppointmentButton />
            <ShareButton />
          </div>
        </div>
      ) : (
        <div>
          <div class="flex items-center p-3 shadow-sidebar shadow-shadow-sidebar">
            <div class="flex w-full items-center justify-between">
              <div>
                <BrandLogo variant="secondary900" size="1.5x" />
              </div>

              <div class="hover:opacity-80" onClick={() => setIsMobileMenuDisplay((v) => !v)}>
                <Icon
                  variant="secondary100Icon400"
                  icon={isMobileMenuDisplay() ? 'icon icon-close' : 'icon icon-menu-line'}
                />
              </div>
            </div>
          </div>

          {isMobileMenuDisplay() && (
            <Portal>
              <div class="absolute left-0 top-[56px] z-[999] flex h-[calc(100dvh-56px)] w-dvw flex-col justify-between space-y-5 overflow-auto bg-white p-6">
                <div class="h-full space-y-5 overflow-auto">
                  <NavItem
                    text={i18n().t('layout.stepper.back')!}
                    status={NavItemStatus.back}
                    onClick={() => props.setCurrentStep(HOME_STEPS.INTRO)}
                  />

                  <NavGroup
                    data={HOME_SECTIONS_DATA(i18n().t, props.setCurrentStep)}
                    actualStep={HOME_STEPS_LAYOUT_VALUE[props.currentStep()]}
                    disableFromStep={
                      props.mostAdvancedStep() ? HOME_STEPS_LAYOUT_VALUE[props.mostAdvancedStep()] : undefined
                    }
                  />
                </div>

                <div class="space-y-1">
                  <TakeAppointmentButton />
                  <ShareButton />
                </div>
              </div>
            </Portal>
          )}
        </div>
      )}

      <div
        class="relative grow snap-y snap-mandatory overflow-auto bg-opacity-50"
        id={stepperContentId}
        ref={(e) => (ref = e)}
      >
        <div
          class="fixed top-0 z-[999] h-[8px] rounded-r-md bg-radial-gradient"
          style={{ width: `${percentageContent()}%`, left: isMobileDisplay() ? '0px' : '280px' }}
        />
        <Transition
          name="slide-fade"
          onExit={(el, done) => {
            if (document.getElementById(stepperContentId)) {
              document.getElementById(stepperContentId)?.scroll({ top: 0 });
            }
            done();
          }}
        >
          {props.children}
        </Transition>
        <GotToNextPartButton />
      </div>
    </div>
  );
};
