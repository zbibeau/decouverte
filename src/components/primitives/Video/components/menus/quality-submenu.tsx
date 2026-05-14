import { MenuRadio } from './menu-radio';
import { Submenu } from './submenu';

export function QualitySubmenu(props: { qualityLabel: string }) {
  return (
    <Submenu label={props.qualityLabel} iconSlot={<media-icon class="size-5" type="settings-menu" />}>
      <media-quality-radio-group class="flex w-full flex-col">
        <template>
          <MenuRadio />
        </template>
      </media-quality-radio-group>
    </Submenu>
  );
}
