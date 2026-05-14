export function MenuRadio() {
  return (
    <media-radio class="group relative flex w-full cursor-pointer select-none items-center justify-start rounded-sm p-2.5 outline-none ring-media-focus data-[hocus]:bg-white/10 data-[focus]:ring">
      <media-icon class="size-4 text-white group-data-[checked]:hidden" type="radio-button" />
      <media-icon class="hidden size-4 text-media-brand group-data-[checked]:block" type="radio-button-selected" />
      <span class="ml-2" data-part="label" />
    </media-radio>
  );
}
export function MenuSpeedRadio() {
  return (
    <media-radio class="group relative flex w-full cursor-pointer select-none items-center justify-start rounded-sm p-2.5 outline-none ring-media-focus data-[hocus]:bg-white/10 data-[focus]:ring">
      <media-icon class="size-4 text-white group-data-[checked]:hidden" type="radio-button" />
      <media-icon class="hidden size-4 text-media-brand group-data-[checked]:block" type="radio-button-selected" />
      <span class="ml-2" data-part="label" />
      <span class="ml-2" data-part="bitrate" />
    </media-radio>
  );
}
