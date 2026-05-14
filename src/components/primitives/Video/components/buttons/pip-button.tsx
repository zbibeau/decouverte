import type { TooltipPlacement } from 'vidstack';

import { Tooltip } from '../tooltip';

export function PIPButton(props: PIPButtonProps) {
  return (
    <Tooltip
      placement={props.tooltipPlacement}
      triggerSlot={
        <media-pip-button class="group relative mr-0.5 inline-flex size-10 cursor-pointer items-center justify-center rounded-md outline-none ring-inset ring-media-focus hover:bg-white/20 aria-hidden:hidden data-[focus]:ring-4">
          <media-icon class="size-8 media-pip:hidden" type="picture-in-picture" />
          <media-icon class="hidden size-8 media-pip:block" type="picture-in-picture-exit" />
        </media-pip-button>
      }
      contentSlot={
        <>
          <span class="media-pip:hidden">{props.pipLabel}</span>
          <span class="hidden media-pip:block">{props.unpipLabel}</span>
        </>
      }
    />
  );
}

export interface PIPButtonProps {
  tooltipPlacement: TooltipPlacement;
  pipLabel: string;
  unpipLabel: string;
}
