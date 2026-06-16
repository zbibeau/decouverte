import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { mergeProps, splitProps } from 'solid-js';

import { Icon, IconVariantClasses } from './Icon';

export type Unpacked<T> = T extends (infer U)[] ? U : T;

/**
 * Input — refonte UI Kit moderne (handoff Lot 7).
 *
 * Avant : box `bg-primary-50 border border-transparent rounded-xl px-3 py-2`,
 * focus implicite (pas de visuel dédié), erreur via variant `danger`
 * fond rose pâle.
 *
 * Après (handoff §UI Kit Formulaires) :
 *   - h-[50px], rounded-[14px], border-[1.5px] (au lieu de 1px).
 *   - Bordure default : `border-violet-border` (#E0D8EC).
 *   - Fond transparent par défaut (était primary-50 pour la variante
 *     `primary`). Le contenu reste sur la surface du parent.
 *   - Focus visible : `border-primary-600` + `ring-4 ring-primary-600/15`
 *     pour matérialiser le tap target.
 *   - Erreur : `border-[#E9897F]` + `bg-[#FFF6F5]` + `text-[#B33B36]`
 *     pour éviter le rouge criard.
 *
 * Variants conservés pour rétrocompat — leur sémantique est juste
 * re-mappée sur les nouveaux tokens (white = default, primary = bg
 * primary-50 doux, secondary = idem côté secondary, danger = état
 * erreur).
 */

const variantClassNames = {
  white: 'border-violet-border bg-transparent hover:border-primary-200',
  primary: 'border-violet-border bg-primary-50/50 hover:border-primary-200',
  secondary: 'border-secondary-200 bg-secondary-50/50 hover:border-secondary-300',
  danger: 'border-[#E9897F] bg-[#FFF6F5]',
};

export const InputVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const variantValueClassNames = {
  white: 'text-primary-950 placeholder:text-violet-faint',
  primary: 'text-primary-950 placeholder:text-violet-faint',
  secondary: 'text-primary-950 placeholder:text-violet-faint',
  danger: 'text-[#B33B36] placeholder:text-[#C0463F]/60',
} satisfies Record<keyof typeof variantClassNames, string>;

const variantIconClassNames = {
  white: 'primary600',
  primary: 'primary600',
  secondary: 'secondary400',
  danger: 'danger400',
} satisfies Record<keyof typeof variantClassNames, Unpacked<typeof IconVariantClasses>>;

type InputProps = {
  type?: string;
  icon?: string;
  placeholder?: string;
  variant?: keyof typeof variantClassNames;

  value?: string;
  onChange?: (data?: string) => void;
};

export const Input = (_props: InputProps) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'primary',
        size: 'default',
      },
      _props,
    ),
    ['variant', 'type', 'size', 'value', 'onChange', 'placeholder', 'icon'],
  );

  return (
    <div
      class={cx(
        // Box de base — h-[50px] rounded-[14px] border-[1.5px] (handoff §UI Kit).
        'group flex h-[50px] items-center rounded-[14px] border-[1.5px] px-[15px] transition-all',
        // Focus visible : ring violet à 15% d'opacité, anneau de 4px.
        'focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/15',
        variantClassNames[props.variant as keyof typeof variantClassNames],
      )}
      {...otherProps}
    >
      {props.icon && (
        <div class="pr-2">
          <Icon
            size="default"
            icon={props.icon}
            variant={variantIconClassNames[props.variant as keyof typeof variantIconClassNames]}
            isTransparent
          />
        </div>
      )}

      <div class="grow">
        <input
          type={props.type || 'text'}
          class={cx(
            'w-full resize-none bg-transparent text-[15px] outline-none',
            variantValueClassNames[props.variant as keyof typeof variantValueClassNames],
          )}
          //@ts-ignore
          value={props.value ? props.value : null}
          placeholder={props.placeholder}
          onInput={(e) => props.onChange && props.onChange(e.currentTarget.value)}
        />
      </div>
    </div>
  );
};

export const InputForm = (props: InputProps & { name: string; form: FormStore<any, any>; error?: string }) => {
  return (
    <Input
      {...props}
      variant={props.error ? 'danger' : props.variant}
      value={props.value}
      onChange={(data) => {
        setValue(props.form, props.name, data, { shouldTouched: true });
      }}
    />
  );
};
