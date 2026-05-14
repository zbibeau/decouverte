import { Component, createEffect, createSignal, For, onCleanup, Show } from 'solid-js';

import type { PhotoCarouselBlock } from '@shared/content-schema';

type Payload = PhotoCarouselBlock['payload'];

const ASPECT_CLASS: Record<NonNullable<Payload['aspectRatio']>, string> = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '3/2': 'aspect-[3/2]',
  '1/1': 'aspect-square',
  '21/9': 'aspect-[21/9]',
};

/**
 * Full-width immersive photo carousel. One photo at a time, big arrows in
 * overlay (visible at all times), translucent caption overlay at the
 * bottom, and a thin progress bar showing position in the photo sequence.
 *
 * Auto-advances if `payload.autoplayMs > 0`. Autoplay pauses on hover and
 * resumes when the cursor leaves.
 */
export const PhotoCarousel: Component<{ payload: Payload }> = (props) => {
  const photos = () => props.payload.photos ?? [];
  const total = () => photos().length;
  const [index, setIndex] = createSignal(0);
  const [paused, setPaused] = createSignal(false);

  const goTo = (i: number) => {
    const n = total();
    if (n === 0) return;
    setIndex(((i % n) + n) % n);
  };
  const next = () => goTo(index() + 1);
  const prev = () => goTo(index() - 1);

  // Autoplay
  createEffect(() => {
    const ms = props.payload.autoplayMs ?? 0;
    if (ms <= 0 || total() <= 1 || paused()) return;
    const id = setInterval(next, ms);
    onCleanup(() => clearInterval(id));
  });

  const aspectClass = () => ASPECT_CLASS[props.payload.aspectRatio ?? '16/9'];
  const current = () => photos()[index()];

  return (
    <div class="m-auto w-full max-w-screen-2xl">
      <Show
        when={total() > 0}
        fallback={
          <div class={`${aspectClass()} m-auto flex w-full max-w-5xl items-center justify-center rounded-3xl bg-secondary-100`}>
            <p class="text-sm text-dark-600 opacity-60">Aucune photo dans ce carrousel.</p>
          </div>
        }
      >
        <div
          class={`relative ${aspectClass()} m-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-black`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Slides — each absolutely positioned, fade between */}
          <For each={photos()}>
            {(photo, i) => (
              <img
                src={photo.url}
                alt={photo.alt ?? photo.title ?? `Photo ${i() + 1}`}
                class="absolute inset-0 h-full w-full object-contain transition-opacity duration-500"
                style={{ opacity: i() === index() ? 1 : 0 }}
                loading={i() === 0 ? 'eager' : 'lazy'}
              />
            )}
          </For>

          {/* Title overlay (short, on top of the photo) */}
          <Show when={current()?.title}>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-6">
              <p class="text-base font-semibold text-white drop-shadow md:text-lg">
                {current()!.title}
              </p>
            </div>
          </Show>

          {/* Arrows */}
          <Show when={total() > 1}>
            <button
              type="button"
              onClick={prev}
              class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-dark-950 shadow-lg backdrop-blur transition hover:bg-white"
              aria-label="Photo précédente"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-dark-950 shadow-lg backdrop-blur transition hover:bg-white"
              aria-label="Photo suivante"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </Show>

          {/* Progress bar */}
          <Show when={total() > 1}>
            <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div
                class="h-full bg-white transition-all duration-500"
                style={{ width: `${((index() + 1) / total()) * 100}%` }}
              />
            </div>
          </Show>
        </div>

        {/* Description sous le carrousel — multi-ligne, hors overlay, change avec l'index actif */}
        <Show when={current()?.description}>
          <p class="m-auto mt-4 max-w-5xl whitespace-pre-wrap px-2 text-sm text-dark-700 md:text-base">
            {current()!.description}
          </p>
        </Show>
      </Show>
    </div>
  );
};
