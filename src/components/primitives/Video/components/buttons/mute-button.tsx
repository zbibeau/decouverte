import type { TooltipPlacement } from 'vidstack';

import { Tooltip } from '../tooltip';

export function MuteButton(props: MuteButtonProps) {
  return (
    <Tooltip
      placement={props.tooltipPlacement}
      triggerSlot={
        <media-mute-button class="group relative -mr-1.5 inline-flex size-10 cursor-pointer items-center justify-center rounded-md outline-none ring-inset ring-media-focus hover:bg-white/20 data-[focus]:ring-4">
          <media-icon class="hidden size-8 group-data-[state='muted']:block" type="mute" />
          <media-icon class="hidden size-8 group-data-[state='low']:block" type="volume-low" />
          <media-icon class="hidden size-8 group-data-[state='high']:block" type="volume-high" />
        </media-mute-button>
      }
      contentSlot={
        <>
          <span class="media-muted:hidden">{props.muteLabel}</span>
          <span class="hidden media-muted:block">{props.unmuteLabel}</span>
        </>
      }
    />
  );
}

export interface MuteButtonProps {
  tooltipPlacement: TooltipPlacement;
  muteLabel: string;
  unmuteLabel: string;
}
