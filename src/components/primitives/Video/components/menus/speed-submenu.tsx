import { MenuRadio } from './menu-radio';
import { Submenu } from './submenu';

export function SpeedSubmenu(props: { speedLabel: string }) {
  return (
    <Submenu label={props.speedLabel} iconSlot={<media-icon class="size-5" type="odometer" />}>
      <media-speed-radio-group class="flex w-full flex-col">
        <template>
          <MenuRadio />
        </template>
      </media-speed-radio-group>
    </Submenu>
  );
}
