/* eslint-disable tailwindcss/no-custom-classname */
import type { JSX } from 'solid-js';

export function SubmenuButton(props: SubmenuButtonProps) {
  return (
    <media-menu-button class="parent left-0 z-10 flex w-full cursor-pointer select-none items-center justify-start rounded-sm bg-black/60 p-2.5 outline-none ring-inset ring-media-focus aria-disabled:hidden aria-hidden:hidden data-[open]:sticky data-[open]:-top-2.5 data-[hocus]:bg-white/10 data-[focus]:ring">
      <media-icon class="-ml-0.5 mr-1.5 hidden size-[18px] parent-data-[open]:block" type="chevron-left" />
      <div class="contents parent-data-[open]:hidden">{props.children}</div>
      <span class="ml-1.5 parent-data-[open]:ml-0">{props.label}</span>
      <span class="ml-auto text-sm text-white/50" data-part="hint" />
      <media-icon class="ml-0.5 size-[18px] text-sm text-white/50 parent-data-[open]:hidden" type="chevron-right" />
    </media-menu-button>
  );
}

export interface SubmenuButtonProps {
  label: string;
  children: JSX.Element;
}
