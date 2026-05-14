import cx from 'classix';
import { JSX, mergeProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

export const TextVariantClassNames = {
  '5xl': 'text-5xl leading-10',
  '4xl': 'text-4xl leading-10',
  '3xl': 'text-3xl leading-9',
  '2xl': 'text-2xl leading-loose',
  xl: 'text-xl leading-7',
  lg: 'text-lg leading-7',
  base: 'text-base leading-normal',
  sm: 'text-sm leading-tight',
  xs: 'text-xs leading-none',
  '2xs': 'text-[10px] leading-none',
  '3xs': 'text-[8px] leading-3',
};

export const TextVariantClasses = Object.keys(TextVariantClassNames) as (keyof typeof TextVariantClassNames)[];

const fontWeightClassNames = {
  ultralight: 'font-ultralight',
  normal: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
};
export const TextFontWeightClasses = Object.keys(fontWeightClassNames) as (keyof typeof fontWeightClassNames)[];

export const Text = (_props: {
  tag?: 'p' | 'span';
  variant?: keyof typeof TextVariantClassNames;
  fontWeight?: keyof typeof fontWeightClassNames;

  children?: JSX.Element;
  class?: string;

  onClick?: JSX.EventHandler<unknown, MouseEvent>;
}) => {
  const props = mergeProps(
    {
      variant: TextVariantClassNames.base,
      fontWeight: fontWeightClassNames.normal,
      tag: 'p',
    },
    _props,
  );

  return (
    <Dynamic
      component={props.tag}
      class={cx(
        TextVariantClassNames[props.variant as keyof typeof TextVariantClassNames],
        fontWeightClassNames[props.fontWeight as keyof typeof fontWeightClassNames],
        props.onClick && 'cursor-pointer',
        props.class,
      )}
      // @ts-ignore
      onClick={(e) => props.onClick && props.onClick(e)}
    >
      {props.children}
    </Dynamic>
  );
};
