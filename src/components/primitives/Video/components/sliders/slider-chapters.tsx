export function SliderChapters() {
  return (
    <media-slider-chapters class="relative flex size-full items-center rounded-[1px]">
      <template>
        <SliderChapter />
      </template>
    </media-slider-chapters>
  );
}

function SliderChapter() {
  return (
    <div
      class="last-child:mr-0 relative mr-0.5 flex size-full items-center rounded-[1px]"
      style={{ contain: 'layout style' }}
    >
      {/* Track */}
      <div class="relative z-0 h-[5px] w-full rounded-sm bg-white/30 ring-media-focus group-data-[focus]:ring">
        <div class="absolute h-full w-[var(--chapter-fill)] rounded-sm bg-media-brand will-change-[width]" />
        <div class="absolute z-10 h-full w-[var(--chapter-progress)] rounded-sm bg-white/50 will-change-[width]" />
      </div>
    </div>
  );
}
