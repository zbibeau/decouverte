import cx from 'classix';
import { JSX, mergeProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

export const TitleVariantClassNames = {
  h1: 'text-5xl leading-10',
  h2: 'text-3xl leading-9',
  h3: 'text-2xl leading-7',
  h4: 'text-xl leading-normal',
  h5: 'text-lg leading-snug',
  h6: 'text-base leading-tight',
  h7: 'text-sm leading-none',
  h8: 'text-xs leading-none',
};

export const TitleVariantClasses = Object.keys(TitleVariantClassNames) as (keyof typeof TitleVariantClassNames)[];

export const Title = (_props: {
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  variant?: keyof typeof TitleVariantClassNames;
  children?: JSX.Element;

  class?: string;
  isUppercase?: boolean;

  onClick?: JSX.EventHandler<unknown, MouseEvent>;
}) => {
  const props = mergeProps(
    {
      variant: 'h1' as const,
      isUppercase: false,
      tag: 'p',
    },
    _props,
  );

  return (
    <Dynamic
      component={props.tag}
      class={cx(
        TitleVariantClassNames[props.variant as keyof typeof TitleVariantClassNames],
        props.onClick && 'cursor-pointer',
        props.isUppercase && 'uppercase',
        'font-medium',
        props.class,
      )}
      // @ts-ignore
      onClick={(e) => props.onClick && props.onClick(e)}
    >
      {props.children}
    </Dynamic>
  );
};
