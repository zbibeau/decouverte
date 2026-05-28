/* eslint-disable jsx-a11y/alt-text */
import { writeClipboard } from '@solid-primitives/clipboard';
import { createElementSize, createWindowSize } from '@solid-primitives/resize-observer';
import { makeWebShare } from '@solid-primitives/share';
import { createEffect, createMemo, createSignal, onMount, Show } from 'solid-js';
import { isServer } from 'solid-js/web';

import desktopDemo from '../../../../../public/illustrations/desktop-demo.webp';
import { useI18n } from '../../../../lang/useI18n';
import { Button } from '../../../atoms/Button';
import { Icon } from '../../../atoms/Icon';
import { Title } from '../../../primitives/Title';
import { isPreviewMode } from '../utils/previewMode';

const MIN_WINDOW_HEIGHT = 600;
const MIN_WINDOW_WIDTH = 600;

const LOCALSTORAGE_KEY = 'MOBILE-MODAL-DISABLED';

export const MobileModal = () => {
  const i18n = useI18n();
  const windowSize = createWindowSize();
  const [isModalDisplayed, setIsModalDisplayed] = createSignal<boolean>(false);
  const [isModalClosedByUser, setIsModalClosedByUser] = createSignal<boolean>(false);

  onMount(() => {
    if (localStorage) {
      if (localStorage.getItem(LOCALSTORAGE_KEY) === 'true') {
        setIsModalClosedByUser(true);
      }
    }
  });

  createEffect(() => {
    if (isModalClosedByUser()) {
      return;
    }

    // Preview iframe (manager) : the viewport is intentionally narrow
    // (~560px) because it's a scaled-down DESKTOP preview, not a real
    // mobile device. The width-based trigger below would always fire
    // here — showing the "use a computer" modal as a false positive,
    // AND producing a visible content↔modal scroll jump on every load
    // (the modal mounts after `createWindowSize` measures post-hydration,
    // and preview mode bypasses the localStorage opt-out so it never
    // stays dismissed). Never show the modal in preview.
    if (isPreviewMode()) {
      if (isModalDisplayed()) {
        setIsModalDisplayed(false);
      }
      return;
    }

    // Check if the MobileModal is being displayed
    if (isModalDisplayed()) {
      // Check if the window size is larger than the minimum width and height
      if (windowSize.width >= MIN_WINDOW_WIDTH && windowSize.height >= MIN_WINDOW_HEIGHT) {
        // If the window size is larger than the minimum requirements, hide the MobileModal
        setIsModalDisplayed(false);
      }
    } else {
      // Check if the window size is smaller than the minimum width or height
      if (windowSize.width < MIN_WINDOW_WIDTH || windowSize.height < MIN_WINDOW_HEIGHT) {
        // If the window size is smaller than the minimum requirements, show the MobileModal
        setIsModalDisplayed(true);
      }
    }
  });

  //To adapt logo size regarding screen size
  const [parentLogoRef, setParentLogoRef] = createSignal<HTMLElement>();
  const size = createElementSize(parentLogoRef);

  const share = makeWebShare();
  const canShare = createMemo(() => {
    if (isServer) {
      return false;
    }

    return !!navigator && !!navigator.share;
  });
  const [isLinkCopied, setIsLinkCopied] = createSignal<boolean>(false);

  const onReceiveLink = async () => {
    //Share API + WAIT + REDIRECT TO MFM
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

  const onContinue = () => {
    setIsModalClosedByUser(true);
    setIsModalDisplayed(false);

    if (localStorage) {
      localStorage.setItem(LOCALSTORAGE_KEY, 'true');
    }
  };

  return (
    <Show when={isModalDisplayed()}>
      <div class="absolute top-0 z-50 h-dvh w-dvw overflow-auto bg-primary-400 px-6 py-16">
        <div class="mx-auto flex size-full max-w-[340px] flex-col gap-2">
          <div class="space-y-2" ref={setParentLogoRef}>
            <div class="m-auto w-fit">
              <i class="brand icon-brand-logo block h-8 max-w-60 bg-white" style={{ width: `${size.width}px` }} />
            </div>

            <Title variant="h5" tag="h2" class="text-center text-white">
              {i18n().t('components.modules.home.mobileModal.layout.subTitle')}
            </Title>
          </div>

          <div class="flex size-full flex-col">
            <div class="flex grow items-center justify-center">
              <div class="my-auto w-full space-y-4">
                <img src={desktopDemo} class="m-auto size-full max-h-[278px] max-w-[310px]" />

                <Title tag="p" variant="h4" class="text-center !leading-tight">
                  {i18n().t('components.modules.home.mobileModal.step1.description')}
                </Title>
              </div>
            </div>

            <div class="space-y-2">
              <Button onClick={() => onReceiveLink()} class="w-full text-center">
                <div class="flex items-center gap-2">
                  <div>
                    <Icon
                      variant="whitePrimary400"
                      size="2xs"
                      icon={`icon ${isLinkCopied() ? 'icon-check-line' : 'icon-share'}`}
                    />
                  </div>
                  <div>
                    {i18n().t(
                      canShare()
                        ? 'components.modules.home.mobileModal.step1.shareLink'
                        : 'components.modules.home.mobileModal.step1.copyLink',
                    )}
                  </div>
                </div>
              </Button>

              <Button onClick={() => onContinue()} class="w-full text-center">
                {i18n().t('components.modules.home.mobileModal.step1.continue')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
