import cx from 'classix';
import { For, mergeProps, splitProps } from 'solid-js';
export type Unpacked<T> = T extends (infer U)[] ? U : T;
import { Icon, IconVariantClasses } from '../atoms/Icon';
import { CheckListItem, CheckListItemVariantClasses } from '../molecules/CheckListItem';
import { Title } from '../primitives/Title';

const variantClassNames = {
  success50: 'bg-success-50',
  secondary50: 'bg-secondary-50',
  primary50: 'bg-primary-50',
  primary400: 'bg-primary-400',
};

const titleVariants = {
  success50: 'text-success-400',
  secondary50: 'text-secondary-400',
  primary50: 'text-primary-400',
  primary400: 'text-white',
} as Record<keyof typeof variantClassNames, string>;

const iconVariants = {
  success50: 'success400',
  secondary50: 'secondary400',
  primary50: 'primary400',
  primary400: 'whitePrimary400',
} as Record<keyof typeof variantClassNames, Unpacked<typeof IconVariantClasses>>;

const checkListVariant = {
  success50: 'success400',
  secondary50: 'secondary400',
  primary50: 'primary400',
  primary400: 'whiteSuccess400',
} as Record<keyof typeof variantClassNames, Unpacked<typeof CheckListItemVariantClasses>>;

export const CheckListGroupVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

export const CheckListGroup = (_props: {
  title?: string;
  icon?: string;
  text: string[];
  variant?: keyof typeof variantClassNames;
}) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'success50',
      },
      _props,
    ),
    ['variant', 'text', 'title', 'icon'],
  );
  return (
    <div
      class={cx('space-y-4 rounded-2xl p-4', variantClassNames[props.variant as keyof typeof variantClassNames])}
      {...otherProps}
    >
      {(props.title || props.icon) && (
        <div class="flex items-center gap-2">
          {props.icon && (
            <div>
              <Icon
                variant={iconVariants[props.variant as keyof typeof variantClassNames]}
                size="xs"
                icon={props.icon}
              />
            </div>
          )}
          {props.title && (
            <div>
              <Title tag="p" variant="h5" class={titleVariants[props.variant as keyof typeof variantClassNames]}>
                {props.title}
              </Title>
            </div>
          )}
        </div>
      )}

      <For each={props.text}>
        {(text) => (
          <CheckListItem variant={checkListVariant[props.variant as keyof typeof variantClassNames]} text={text} />
        )}
      </For>
    </div>
  );
};
