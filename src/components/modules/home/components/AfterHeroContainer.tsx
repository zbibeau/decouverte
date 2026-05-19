import cx from 'classix';
import { Component, createSignal, JSX } from 'solid-js';

import { isLayoutMobileDisplay } from '../../../layout/StepperLayout';
import { FullScreenVideoSection, FullScreenVideoSections } from './FullScreenVideoSection';

export const AfterHeroContainer: Component<{
  children: JSX.Element;
  preChildren?: JSX.Element;
  contentId?: string;
  class?: string;
  contentClass?: string;
}> = (props) => {
  const isMobile = isLayoutMobileDisplay();
  // `snap-always` (= scroll-snap-stop: always) forces the parent scroller
  // to stop at every snap target — even when the user scrolls fast or
  // momentum-flicks. Without it, `snap-mandatory` would happily jump past
  // intermediate snap points (e.g. a short form block sandwiched between
  // two min-h-dvh sections), making blocks appear to vanish during scroll.
  return (
    <div
      id={props.contentId}
      class={cx(
        'relative flex snap-start snap-always flex-col pb-8',
        props?.class,
        isMobile() ? 'min-h-[calc(100dvh-56px)]' : 'min-h-dvh',
      )}
    >
      {props.preChildren}
      <div class="flex grow items-center">
        <div class={cx('m-auto w-full max-w-[600px] px-1 pt-8 md:px-0', props?.contentClass)}>{props.children}</div>
      </div>
    </div>
  );
};

export const AfterHeroContainerWide: Component<{
  children: JSX.Element;
  contentId?: string;
  class?: string;
  /** Pre-children slot (e.g. Tool1 navbar) rendered at the very top of the
   *  slide, before the main content. Mirrors `AfterHeroContainer`. */
  preChildren?: JSX.Element;
}> = (
  props,
) => {
  const isMobile = isLayoutMobileDisplay();

  return (
    <div
      id={props.contentId}
      class={cx('relative snap-start snap-always pb-8', props?.class, isMobile() ? 'min-h-[calc(100dvh-56px)]' : 'min-h-dvh')}
    >
      {props.preChildren}
      <div class="m-auto w-full max-w-[960px] px-1 pt-8 md:px-0">{props.children}</div>
    </div>
  );
};

export const AfterHeroContainerFull: Component<{
  children: JSX.Element;
  contentId?: string;
  class?: string;
  setRef?;
}> = (props) => {
  return (
    <div
      id={props.contentId}
      class={cx('relative min-h-[calc(100dvh-56px)] snap-start snap-always md:min-h-dvh', props?.class)}
      ref={(ref) => (props.setRef ? props.setRef(ref) : undefined)}
    >
      {props.children}
    </div>
  );
};

export const AfterHeroContainerFullVideoSection: Component<
  {
    contentId?: string;
    class?: string;
    contentClass?: string;
    children?: JSX.Element;
  } & Parameters<typeof FullScreenVideoSection>[0]
> = (props) => {
  const [ref, setRef] = createSignal();

  return (
    <div
      id={props.contentId}
      class={cx('relative flex h-[calc(100dvh-56px)] max-w-[100dvw] snap-start snap-always flex-col md:h-dvh', props.class)}
      ref={(ref) => setRef(ref)}
    >
      {/* {props.children && <div>{props.children}</div>} */}
      {props.children}
      <FullScreenVideoSection ref={ref} src={props.src} class={props.contentClass} />
    </div>
  );
};

export const AfterHeroContainerFullVideoSections: Component<
  {
    contentId?: string;
    class?: string;
    children?: JSX.Element;
  } & Parameters<typeof FullScreenVideoSections>[0]
> = (props) => {
  const [ref, setRef] = createSignal();

  return (
    <div id={props.contentId} class={cx('relative h-dvh snap-start snap-always')} ref={(ref) => setRef(ref)}>
      {props.children}
      <FullScreenVideoSections src={props.src} sectionRef={ref} title={props.title} sections={props.sections} />
    </div>
  );
};
