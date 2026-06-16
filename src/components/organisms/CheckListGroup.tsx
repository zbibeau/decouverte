import cx from 'classix';
import { For, mergeProps, splitProps } from 'solid-js';
export type Unpacked<T> = T extends (infer U)[] ? U : T;
import { Icon, IconVariantClasses } from '../atoms/Icon';
import { CheckListItem, CheckListItemVariantClasses } from '../molecules/CheckListItem';
import { Title } from '../primitives/Title';

/**
 * CheckListGroup — refonte UI Kit Lot 8 (handoff §Points clés & check-lists).
 *
 * Avant : 4 variants à fond plat (success-50 / secondary-50 / primary-50
 *   / primary-400). Le `primary400` était un aplat violet vif avec coches
 *   VERTES sur fond violet — contraste criard que le handoff explicite
 *   en exemple.
 *
 * Après :
 *   - `primary400` → gradient signature `bg-card-premium` (Lot 1, linéaire
 *     160deg #9951FB → #6E1ED2) + ombre teintée + coches BLANCHES (variant
 *     `whitePrimary400` au lieu de `whiteSuccess400`).
 *   - Les autres variants (success50, secondary50, primary50) gardent leur
 *     fond pâle. Leurs coches passent toutes au violet primary-600 (variant
 *     `primary600` du Lot 4) pour cohérence — la version vert success-400
 *     legacy tranchait avec la palette moderne.
 */
const variantClassNames = {
  success50: 'bg-success-50 rounded-2xl border border-violet-border-soft',
  secondary50: 'bg-secondary-50 rounded-2xl border border-violet-border-soft',
  primary50: 'bg-primary-50 rounded-2xl border border-violet-border-soft',
  primary400: 'bg-card-premium rounded-2xl shadow-premium',
};

const titleVariants = {
  success50: 'text-primary-600',
  secondary50: 'text-secondary-400',
  primary50: 'text-primary-600',
  primary400: 'text-white',
} as Record<keyof typeof variantClassNames, string>;

const iconVariants = {
  success50: 'primary600',
  secondary50: 'secondary400',
  primary50: 'primary600',
  primary400: 'whitePrimary400',
} as Record<keyof typeof variantClassNames, Unpacked<typeof IconVariantClasses>>;

// Refonte : toutes les variantes claires passent en violet primary-600
// (au lieu de success-400 vert). Le primary400 (gradient violet) garde
// les checks blancs (whitePrimary400) au lieu de whiteSuccess400 (vert).
const checkListVariant = {
  success50: 'primary600',
  secondary50: 'secondary400',
  primary50: 'primary600',
  primary400: 'whitePrimary400',
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
      class={cx('space-y-4 p-5', variantClassNames[props.variant as keyof typeof variantClassNames])}
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
