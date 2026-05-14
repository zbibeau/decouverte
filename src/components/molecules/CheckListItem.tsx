import { mergeProps, splitProps } from 'solid-js';
export type Unpacked<T> = T extends (infer U)[] ? U : T;
import { Icon, IconVariantClasses } from '../atoms/Icon';
import { Text } from '../primitives/Text';

const iconVariantClassNames = {
  success400: 'success400',
  success400TextOpacity66: 'success400',
  secondary400: 'secondary400',
  primary400: 'primary400',
  whiteSuccess400: 'success400',
  whitePrimary400: 'primary400',
} as Record<string, Unpacked<typeof IconVariantClasses>>;

export const CheckListItemVariantClasses = Object.keys(iconVariantClassNames) as (keyof typeof iconVariantClassNames)[];

const textVariantClassNames = {
  success400: 'text-dark-950',
  success400TextOpacity66: 'text-dark-950 opacity-[66%]',
  secondary400: 'text-dark-950',
  primary400: 'text-dark-950',
  whiteSuccess400: 'text-white',
  whitePrimary400: 'text-white',
} as Record<keyof typeof iconVariantClassNames, string>;

export const CheckListItem = (_props: { text: string; variant?: keyof typeof iconVariantClassNames }) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'success400',
      },
      _props,
    ),
    ['variant', 'text'],
  );
  return (
    <div class="flex gap-2" {...otherProps}>
      <div class="pt-1.5">
        <Icon
          variant={iconVariantClassNames[props.variant as keyof typeof iconVariantClassNames]}
          size="3xs"
          icon="icon icon-check-line"
          isRounded
        />
      </div>

      <div>
        <Text class={textVariantClassNames[props.variant as keyof typeof textVariantClassNames]}>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <span innerHTML={props.text} />
        </Text>
      </div>
    </div>
  );
};
