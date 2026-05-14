import { Component, JSX } from 'solid-js';

import { Title } from '../../../primitives/Title';
export const AfterHeroContainerSticky: Component<{ children: JSX.Element; title: string; image: JSX.Element }> = (
  props,
) => {
  return (
    <div class="min-h-[calc(100dvh-56px)] snap-start pb-8 md:min-h-dvh">
      <div class="sticky top-0 z-50 pt-6 backdrop-blur-3xl">
        <div class="relative mx-6 rounded-2xl bg-primary-100 p-4 shadow">
          <Title variant="h6" class="leading-tight">
            {props.title}
          </Title>

          <div class="absolute -top-1.5 right-4">{props.image}</div>
        </div>
      </div>
      <div class="m-auto w-full max-w-[600px] px-1 pt-24 md:px-0">{props.children}</div>
    </div>
  );
};
