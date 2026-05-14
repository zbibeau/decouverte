import cx from 'classix';
import { Component, JSX } from 'solid-js';

import { isLayoutMobileDisplay } from '../../../layout/StepperLayout';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';

/**
 * Renders a Hero component with the given children and optional class.
 *
 * @param {JSX.Element} children - The JSX element(s) to be rendered inside the Hero component.
 * @param {string} class - An optional CSS class to be applied to the Hero component.
 * @return {JSX.Element} The rendered Hero component.
 */
export const Hero: Component<{ children: JSX.Element; class?: string; contentId?: string }> = (props) => {
  const isMobileDisplay = isLayoutMobileDisplay();

  return (
    <div class={cx('relative w-full snap-start snap-always', isMobileDisplay() ? 'h-[calc(100dvh-56px)]' : 'h-dvh')}>
      <div class={cx('h-full w-full', props.class || '')}>{props.children}</div>
    </div>
  );
};

const HeroNumber = (props: { number: number }) => {
  return (
    <div
      class={cx(
        'flex rotate-[-4deg] items-center justify-center rounded-xl bg-primary-900 font-medium text-white',
        'h-[60px] w-[60px] text-4xl',
      )}
    >
      {props.number && <div>{props.number}</div>}
      {!props.number && <i class="brand icon-brand-icon block size-8 bg-white" />}
    </div>
  );
};

export const HeroTitle: Component<{
  children?: JSX.Element;
  sectionTitle?: string;
  number?: number;
  title: string;
}> = (props) => {
  const isMobileDisplay = isLayoutMobileDisplay();
  return (
    <Hero class="bg-purple-400">
      <div class="m-auto flex size-full flex-col items-center justify-center gap-6 px-[5%] md:flex-row md:justify-between">
        <div class="max-w-[330px] space-y-4">
          {props.sectionTitle && (
            <Title variant="h6" tag="h2" isUppercase class="text-purple-900">
              {props.sectionTitle}
            </Title>
          )}
          <HeroNumber number={props.number} />
          <div>
            <Text variant="5xl" class="leading-[48px] text-white">
              {props.title}
            </Text>
          </div>
        </div>
        <div class={cx(isMobileDisplay() && 'hidden')}>{props.children}</div>
      </div>
    </Hero>
  );
};
