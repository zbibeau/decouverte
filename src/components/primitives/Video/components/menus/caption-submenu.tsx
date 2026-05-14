import { MenuRadio } from './menu-radio';
import { Submenu } from './submenu';

export function CaptionSubmenu() {
  return (
    <Submenu label="Captions" iconSlot={<media-icon class="size-5" type="closed-captions" />}>
      <media-captions-radio-group class="flex w-full flex-col">
        <template>
          <MenuRadio />
        </template>
      </media-captions-radio-group>
    </Submenu>
  );
}
