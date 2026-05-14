// NOTE: `@dotlottie/player-component` registers a custom element by touching
// `window` at the top of its module. Importing it eagerly crashes SSR
// ("ReferenceError: window is not defined"), especially on Node ≥22 whose
// CJS/ESM loader no longer tolerates the side-effect. We therefore import it
// lazily inside `onMount` (browser only) and keep only the *types* as a
// type-only import here, which is erased at compile time.
import type { DotLottiePlayer, PlaybackOptions } from '@dotlottie/player-component';
import { createVisibilityObserver } from '@solid-primitives/intersection-observer';
import cx from 'classix';
import { createEffect, createSignal, onMount } from 'solid-js';
interface CSSProperties {
  // Override
  [key: string]: string | number | undefined;
}

//Exemple with Lottie Interactivity
/**
  <Lottie 
    onReady={
      (player) => {
        LottieInteractivity.create({
          player: player.getLottie(),
          mode:"cursor",
            actions: [
                {
                    type: "click",
                    forceFlag: true
                }
            ]
        });
      }
    }/>
 */

export const Lottie = (
  props: {
    id?: string;
    src: string;
    loadingBackgroundClass?: string;
    style?: CSSProperties | string;
    loadOnVisible?: boolean;
    visibilityThreeshold?: number;
    onReady?: (player: DotLottiePlayer) => void;
  } & PlaybackOptions,
) => {
  const [ref, setRef] = createSignal<DotLottiePlayer>();
  const [loading, setLoading] = createSignal(false);

  const useVisibilityObserver = createVisibilityObserver({ threshold: props.visibilityThreeshold || 0.8 });
  const elementIsVisible = useVisibilityObserver(() => ref());
  const [isVisible, setIsVisible] = createSignal(false);

  onMount(() => {
    // Browser-only side-effect import: registers the <dotlottie-player>
    // custom element. Awaited but not blocking the rest of the effects.
    void import('@dotlottie/player-component');
    ref().addEventListener('ready', () => {
      if (props.onReady) {
        props.onReady(ref());
      }
    });
  });

  createEffect(() => {
    if (elementIsVisible()) {
      setIsVisible(true);
    }
  });

  createEffect(() => {
    if (props.loadOnVisible ? !!isVisible() : true) {
      (async () => {
        //Wait container is build
        setTimeout(async () => {
          if (props.src && ref()) {
            try {
              setLoading(true);
              await ref().load(
                props.src,
                { progressiveLoad: true, id: props.id },
                {
                  autoplay: props.autoplay,
                  defaultTheme: props.defaultTheme,
                  direction: props.direction,
                  hover: props.hover,
                  intermission: props.intermission,
                  loop: props.loop,
                  playMode: props.playMode,
                  speed: props.speed,
                  themeColor: props.themeColor,
                },
              );
              setLoading(false);
            } catch (error) {
              setLoading(false);
            }
          }
        }, 500);
      })();
    }
  });

  return (
    <div class="min-h-8">
      {loading() && (
        <>
          <i
            class={cx(
              'icon icon-loop-right-line m-auto block h-8 w-8 animate-spin',
              props.loadingBackgroundClass || 'bg-black/25',
            )}
          />
        </>
      )}
      {/* @ts-ignore */}
      <dotlottie-player ref={(ref) => setRef(ref)} style={props.style} />
    </div>
  );
};
