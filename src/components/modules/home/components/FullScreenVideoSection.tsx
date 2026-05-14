/* eslint-disable @typescript-eslint/no-unused-vars */
import { createVisibilityObserver } from '@solid-primitives/intersection-observer';
import cx from 'classix';
import { nanoid } from 'nanoid';
import { createEffect, createSignal, For, on } from 'solid-js';
import type { MediaPlayerElement } from 'vidstack/elements';

import { isLayoutMobileDisplay } from '../../../layout/StepperLayout';
import { Title } from '../../../primitives/Title';
import { defaultVideoI18nPropsFR, Video } from '../../../primitives/Video';

export const FullScreenVideoSection = (props: { src: string; ref?; class?: string }) => {
  const [videoId] = createSignal(nanoid());
  const isMobileDisplay = isLayoutMobileDisplay();
  const [hasRunAnimation, setHasRunAnimation] = createSignal<boolean>(false);
  const [runAnimation, setRunAnimation] = createSignal<boolean>(false);
  const [time, setTime] = createSignal(0);
  const [haveBeenPlayed, setHaveBeenPlayed] = createSignal(false);

  const [ref, setRef] = createSignal<HTMLDivElement>();
  const useVisibilityObserver = createVisibilityObserver({ threshold: 0.9 });
  const elementIsVisible = useVisibilityObserver(() => (props.ref ? props.ref() : ref()));

  createEffect(
    on(isMobileDisplay, () => {
      if (isMobileDisplay()) {
        setHasRunAnimation(true);
      }
    }),
  );

  createEffect(() => {
    if (elementIsVisible()) {
      if (!isMobileDisplay()) {
        setTimeout(() => {
          setRunAnimation(true);
        }, 500);
      } else {
        if (!haveBeenPlayed()) {
          (document.getElementById(videoId()) as MediaPlayerElement)?.play();
          setHaveBeenPlayed(true);
        }
      }
    }
  });

  createEffect(() => {
    if (elementIsVisible() && runAnimation() && !hasRunAnimation()) {
      setTimeout(() => {
        setHasRunAnimation(true);

        if (!haveBeenPlayed()) {
          (document.getElementById(videoId()) as MediaPlayerElement)?.play();
          setHaveBeenPlayed(true);
        }
      }, 1000);
    }
  });

  return (
    <>
      <div
        class={cx('m-auto flex h-full w-full items-center justify-center px-4 md:px-16', props.class)}
        ref={(ref) => setRef(ref)}
      >
        <Video
          id={videoId()}
          src={props.src}
          load="eager"
          class={cx(
            'relative rounded-3xl',
            runAnimation() && 'animate-video-fullscreen',
            hasRunAnimation() ? 'max-h-full max-w-full' : 'max-h-[50%] max-w-[50%]',
          )}
          onTime={(data) => {
            if (data > 0 && !elementIsVisible()) {
              (document.getElementById(videoId()) as MediaPlayerElement)?.pause();
              setTime(data);
            }
          }}
          i18n={defaultVideoI18nPropsFR}
        />
      </div>
    </>
  );
};

export const FullScreenVideoSections = (props: {
  src: string;
  title?: string;
  sections: { text: string; highlight?: string; time: number; backgroundImage: string }[];
  sectionRef?;
}) => {
  const [hasRunAnimation, setHasRunAnimation] = createSignal<boolean>(false);
  const [runAnimation, setRunAnimation] = createSignal<boolean>(false);
  const [videoId] = createSignal(nanoid());

  const [ref, setRef] = createSignal<HTMLDivElement>();
  const useVisibilityObserver = createVisibilityObserver({ threshold: 0.8 });
  const elementIsVisible = useVisibilityObserver(() => (props.sectionRef ? props.sectionRef() : ref()));
  const isMobileDisplay = isLayoutMobileDisplay();

  const [currentTime, setCurrentTime] = createSignal(0);

  createEffect(() => {
    if (elementIsVisible()) {
      setTimeout(() => {
        setRunAnimation(true);
      }, 250);
    }
  });

  createEffect(
    on(elementIsVisible, () => {
      if (!elementIsVisible() && runAnimation()) {
        setHasRunAnimation(false);
        setRunAnimation(false);
      }
    }),
  );

  createEffect(() => {
    if (runAnimation() && !hasRunAnimation()) {
      setTimeout(() => {
        setHasRunAnimation(true);
        if (elementIsVisible()) {
          (document.getElementById(videoId()) as MediaPlayerElement)?.play();
        }
      }, 1000);
    }
  });

  return (
    <>
      <div class={cx('m-auto flex max-h-[100dvh] flex-col gap-5 p-4 md:p-16')} ref={(ref) => setRef(ref)}>
        <Video
          id={videoId()}
          src={props.src}
          load="eager"
          class={cx(
            'relative m-auto rounded-3xl',
            runAnimation() && 'animate-video-fullscreen',
            hasRunAnimation() ? 'max-h-full max-w-full' : 'max-h-[50%] max-w-[50%]',
          )}
          i18n={defaultVideoI18nPropsFR}
          onTime={(data) => {
            if (data > 0 && !elementIsVisible()) {
              (document.getElementById(videoId()) as MediaPlayerElement)?.pause();
            }
          }}
        />
        {props.title && (
          <Title
            variant="h6"
            class={cx(
              'text-center text-primary-400',
              'transition-all duration-1000 ease-in-out',
              hasRunAnimation() ? 'opacity-100' : 'opacity-0',
            )}
          >
            {props.title}
          </Title>
        )}
        <div
          class={cx(
            'grid h-full flex-grow items-center gap-5 md:min-h-[10dvh]',
            'transition-all duration-1000 ease-in-out',
            hasRunAnimation() ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            'grid-template-columns': isMobileDisplay() ? '1fr' : `repeat(${props.sections.length}, minmax(0, 1fr))`,
          }}
        >
          <For each={props.sections}>
            {(section) => (
              <div
                class={cx(
                  'size-full rounded-2xl bg-cover bg-center bg-no-repeat',
                  isLayoutMobileDisplay() && 'min-h-[120px]',
                )}
                style={{ 'background-image': `url(${section.backgroundImage})` }}
              >
                <div class={cx('relative size-full rounded-2xl bg-[#1C263080] bg-opacity-10 p-3 text-white')}>
                  {currentTime() >= section.time && (
                    <>
                      <p>{section.text}</p>
                      <p class="font-bold">{section.highlight}</p>
                      <div class="absolute bottom-4 right-4 flex size-5 items-center justify-center rounded-full bg-success-400">
                        <i class="icon icon-check-line block size-4 bg-white align-middle" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </>
  );
};
