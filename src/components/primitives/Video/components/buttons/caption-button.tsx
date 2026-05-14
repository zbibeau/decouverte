import type { TooltipPlacement } from 'vidstack';

import { Tooltip } from '../tooltip';

export function CaptionButton(props: CaptionButtonProps) {
  return (
    <Tooltip
      placement={props.tooltipPlacement}
      triggerSlot={
        <media-caption-button class="group relative mr-0.5 inline-flex size-10 cursor-pointer items-center justify-center rounded-md outline-none ring-inset ring-media-focus hover:bg-white/20 aria-hidden:hidden data-[focus]:ring-4">
          <media-icon class="hidden size-8 media-captions:block" type="closed-captions-on" />
          <media-icon class="size-8 media-captions:hidden" type="closed-captions" />
        </media-caption-button>
      }
      contentSlot={
        <>
          <span class="hidden media-captions:block">Closed-Captions Off</span>
          <span class="media-captions:hidden">Closed-Captions On</span>
        </>
      }
    />
  );
}

export interface CaptionButtonProps {
  tooltipPlacement: TooltipPlacement;
}
