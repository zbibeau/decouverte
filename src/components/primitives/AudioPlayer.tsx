import cx from 'classix';
import { Accessor, createEffect, createSignal, JSX } from 'solid-js';
import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js';

import { Icon } from '../atoms/Icon';

// WaveSurfer hook
const useWavesurfer = (containerRef: Accessor<JSX.Element>, options: WaveSurferOptions) => {
  const [wavesurfer, setWavesurfer] = createSignal<WaveSurfer | null>(null);

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  createEffect(() => {
    if (!containerRef() || wavesurfer() !== null) return;

    const ws = WaveSurfer.create({
      ...options,
      container: containerRef() as HTMLElement,
      waveColor: '#c6c9cb',
      progressColor: '#b480ff',
      cursorColor: 'transparent',
      height: 48,
      barWidth: 3,
      barGap: 2,
      barRadius: 5,
    });

    setWavesurfer(ws);

    return () => {
      ws.destroy();
    };
  });

  return wavesurfer;
};

let ref!: any;
export const AudioPlayer = (props: {
  url: string;

  isAutoplay?: boolean;
  canChangeTime?: boolean;
  onTime?: (time: number) => void;
  onPercent?: (percent: number) => void;
}) => {
  const [wavesurferPlayerRef, setWavesurferPlayerRef] = createSignal<JSX.Element | null>(null);

  createEffect(() => {
    //Hack to handle ref not being available in the first render
    setWavesurferPlayerRef(ref);
  });

  // Don't set anything except container at the beginning
  //@ts-ignore
  const wavesurfer = useWavesurfer(wavesurferPlayerRef, {});

  const [currentTime, setCurrentTime] = createSignal(0);
  const [isPlaying, setIsPlaying] = createSignal(false);

  createEffect(() => {
    if (!wavesurfer()) return;

    setCurrentTime(0);
    setIsPlaying(false);

    const subscriptions = [
      wavesurfer()!.on('play', () => setIsPlaying(true)),
      wavesurfer()!.on('pause', () => setIsPlaying(false)),
      wavesurfer()!.on('timeupdate', (currentTime) => setCurrentTime(currentTime)),
    ];

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  });

  createEffect(() => {
    props.onTime && props.onTime(currentTime());
    props.onPercent && props.onPercent((currentTime() * 100) / wavesurfer()!.getDuration() || 0);
  });

  createEffect(() => {
    if (!wavesurfer()) return;

    (async () => {
      wavesurfer()!.toggleInteraction(props.canChangeTime !== false);
      await wavesurfer()!.load(props.url);
      if (props.isAutoplay) {
        wavesurfer()!.play();
      }
    })();
  });

  const onPlayClick = () => {
    wavesurfer()!.isPlaying() ? wavesurfer()!.pause() : wavesurfer()!.play();
  };

  return (
    <div class="flex w-full gap-2">
      <div class="hover:opacity-60">
        <Icon
          icon={isPlaying() ? 'icon icon-pause-circle-fill' : 'icon icon-play-circle-fill'}
          variant="whitePrimary400"
          size="xl"
          class="!h-12 !w-12"
          onClick={() => onPlayClick()}
        />
      </div>
      <div class={cx('grow', props.canChangeTime !== false && 'hover:opacity-60')}>
        <div class={cx('w-full', props.canChangeTime !== false && 'cursor-pointer')} ref={ref} />
      </div>
    </div>
  );
};
