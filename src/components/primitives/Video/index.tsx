/* eslint-disable import/no-unresolved */
// Import styles.
import 'vidstack/player/styles/base.css';
import 'vidstack/player/ui';
import 'vidstack/player';
import 'vidstack/icons';
import 'vidstack/player/layouts/default';

import cx from 'classix';
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { MediaPlayerElement } from 'vidstack/elements';

import { FullscreenButton } from './components/buttons/fullscreen-button';
import { MuteButton } from './components/buttons/mute-button';
import { PIPButton } from './components/buttons/pip-button';
import { PlayButton } from './components/buttons/play-button';
import { ChapterTitle } from './components/chapter-title';
import { Gestures } from './components/gestures';
import { SettingsMenu } from './components/menus/settings-menu';
import { TimeSlider } from './components/sliders/time-slider';
import { VolumeSlider } from './components/sliders/volume-slider';
import { TimeGroup } from './components/time-group';

type VideoProps = {
  src: string;

  i18n: VideoI18nProps;

  title?: string;
  class?: string;

  isAutoplay?: boolean;

  canTogglePlay?: boolean;
  canChangeSpeed?: boolean;
  canToggleMute?: boolean;
  canChangeQuality?: boolean;
  canChangeVolume?: boolean;
  canFullScreen?: boolean;
  canSeeTime?: boolean;
  canSeeTimeline?: boolean;
  canPip?: boolean;
  loop?: boolean;

  load?: 'visible' | 'eager' | 'idle' | 'play' | 'custom';

  onTime?: (time: number) => void;
  onPercent?: (percent: number) => void;
};

export type VideoI18nProps = {
  play: string;
  pause: string;
  mute: string;
  unmute: string;
  pip: string;
  unpip: string;
  settings: string;
  quality: string;
  speed: string;
  fullscreen: string;
  exitFullscreen: string;
};

export const defaultVideoI18nPropsFR: VideoI18nProps = {
  play: 'Lire',
  pause: 'Pause',
  mute: 'Désactiver le son',
  unmute: 'Activer le son',
  pip: 'Lecteur réduit',
  unpip: 'Agrandir',
  settings: 'Paramètres',
  quality: 'Qualité',
  speed: 'Vitesse',
  fullscreen: 'Plein écran',
  exitFullscreen: 'Quitter le mode plein écran',
};

/**
 * COPIED FROM https://github.com/vidstack/examples/tree/main/player/solid/tailwind-css
 */
let player!: MediaPlayerElement;
export const Video = (props: VideoProps & { play?: boolean; id?: string }) => {
  const [canChangeQuality, setCanChangeQuality] = createSignal(false);
  const [canChangeSpeed, setCanChangeSpeed] = createSignal(false);
  const [canFullScreen, setCanFullScreen] = createSignal(false);
  const [canPip, setCanPip] = createSignal(false);
  const [canSetVolume, setCanSetVolume] = createSignal(false);
  const [duration, setDuration] = createSignal(0);

  onMount(() => {
    onCleanup(
      // eslint-disable-next-line solid/reactivity
      player.subscribe((state) => {
        if (state.currentTime === 0) {
          setCanChangeQuality(props.canChangeQuality !== false && state.canSetQuality && state.qualities.length > 0);
          setCanChangeSpeed(props.canChangeSpeed !== false && state.canSetPlaybackRate);
          setCanFullScreen(props.canFullScreen !== false && state.canFullscreen);
          setCanPip(props.canPip !== false && state.canPictureInPicture);
          setCanSetVolume(props.canChangeVolume !== false && state.canSetVolume);
        }
        if (state.duration) {
          setDuration(state.duration);
        }
      }),
    );
  });

  createEffect(() => {
    if (props.play) {
      (async () => {
        try {
          await player.play();
        } catch (error) {
          player.addEventListener('can-play', () => {
            player?.play();
          });
        }
      })();
    }
  });

  return (
    <>
      <media-player
        id={props.id}
        class={cx(
          'player aspect-video w-full overflow-hidden font-sans text-white ring-media-focus data-[focus]:ring-4',
          props.class || '',
        )}
        title={props?.title}
        src={props?.src}
        crossOrigin
        playsInline
        ref={player}
        autoPlay={!!props.isAutoplay}
        loop={props.loop}
        load={props.load}
        on:time-update={(data) => {
          props.onTime && props.onTime(data.detail.currentTime);
          if (duration()) {
            props.onPercent && props.onPercent((data.detail.currentTime * 100) / duration() || 0);
          }
        }}
      >
        <media-provider class="cursor-pointer" />

        <Gestures />

        <media-controls
          class={`absolute inset-0 z-10 flex size-full flex-col bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity media-controls:opacity-100`}
        >
          <div class="flex-1" />

          {props.canSeeTimeline !== false && (
            <media-controls-group class="flex w-full items-center px-2">
              <TimeSlider />
            </media-controls-group>
          )}

          <media-controls-group class="-mt-0.5 flex w-full items-center px-2 pb-2">
            {props.canTogglePlay !== false && (
              <PlayButton tooltipPlacement="top start" playLabel={props.i18n.play} pauseLabel={props.i18n.pause} />
            )}
            {props.canToggleMute !== false && (
              <MuteButton tooltipPlacement="top" muteLabel={props.i18n.mute} unmuteLabel={props.i18n.unmute} />
            )}
            {canSetVolume() !== false && <VolumeSlider />}
            {props.canSeeTime !== false && <TimeGroup />}
            {props?.title && <ChapterTitle />}
            <div class="flex-1" />

            {canPip() && <PIPButton tooltipPlacement="top" pipLabel={props.i18n.pip} unpipLabel={props.i18n.unpip} />}
            {(canChangeSpeed() || canChangeQuality()) && (
              <SettingsMenu
                placement="top end"
                tooltipPlacement="top"
                canChangeSpeed={canChangeSpeed()}
                canChangeQuality={canChangeQuality()}
                settingsLabel={props.i18n.settings}
                qualityLabel={props.i18n.quality}
                speedLabel={props.i18n.speed}
              />
            )}
            {canFullScreen() && (
              <FullscreenButton
                tooltipPlacement="top end"
                fullScreenLabel={props.i18n.fullscreen}
                exitFullScreenLabel={props.i18n.exitFullscreen}
              />
            )}
          </media-controls-group>
        </media-controls>
      </media-player>
    </>
  );
};
