import type { MenuPlacement, TooltipPlacement } from 'vidstack';

import { Menu } from './menu';
import { QualitySubmenu } from './quality-submenu';
import { SpeedSubmenu } from './speed-submenu';

export function SettingsMenu(props: SettingsMenuProps) {
  return (
    <Menu
      placement={props.placement}
      buttonSlot={
        <media-icon
          class="size-8 transform transition-transform duration-200 ease-out group-data-[open]:rotate-90"
          type="settings"
        />
      }
      tooltipPlacement={props.tooltipPlacement}
      tooltipSlot={<span>{props.settingsLabel}</span>}
    >
      {props.canChangeSpeed !== false && <SpeedSubmenu speedLabel={props.speedLabel} />}
      {props.canChangeQuality !== false && <QualitySubmenu qualityLabel={props.qualityLabel} />}
    </Menu>
  );
}

export interface SettingsMenuProps {
  placement: MenuPlacement;
  tooltipPlacement: TooltipPlacement;
  canChangeSpeed?: boolean;
  canChangeQuality?: boolean;
  settingsLabel: string;
  speedLabel: string;
  qualityLabel: string;
}
