import type { TooltipPlacement } from 'vidstack';

import { Tooltip } from '../tooltip';

export function PlayButton(props: PlayButtonProps) {
  return (
    <Tooltip
      placement={props.tooltipPlacement}
      triggerSlot={
        <media-play-button class="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-md outline-none ring-inset ring-media-focus hover:bg-white/20 data-[focus]:ring-4">
          <media-icon class="hidden size-8 media-paused:block" type="play" />
          <media-icon class="size-8 media-paused:hidden" type="pause" />
        </media-play-button>
      }
      contentSlot={
        <>
          <span class="hidden media-paused:block">{props.playLabel}</span>
          <span class="media-paused:hidden">{props.pauseLabel}</span>
        </>
      }
    />
  );
}

export interface PlayButtonProps {
  tooltipPlacement: TooltipPlacement;
  playLabel: string;
  pauseLabel: string;
}
