import type { TooltipPlacement } from 'vidstack';

import { Tooltip } from '../tooltip';

export function FullscreenButton(props: FullscreenButtonProps) {
  return (
    <Tooltip
      placement={props.tooltipPlacement}
      triggerSlot={
        <media-fullscreen-button class="group relative inline-flex size-10 cursor-pointer items-center justify-center rounded-md outline-none ring-inset ring-media-focus hover:bg-white/20 aria-hidden:hidden data-[focus]:ring-4">
          <media-icon class="size-8 media-fullscreen:hidden" type="fullscreen" />
          <media-icon class="hidden size-8 media-fullscreen:block" type="fullscreen-exit" />
        </media-fullscreen-button>
      }
      contentSlot={
        <>
          <span class="media-fullscreen:hidden">{props.fullScreenLabel}</span>
          <span class="hidden media-fullscreen:block">{props.exitFullScreenLabel}</span>
        </>
      }
    />
  );
}

export interface FullscreenButtonProps {
  tooltipPlacement: TooltipPlacement;
  fullScreenLabel: string;
  exitFullScreenLabel: string;
}
