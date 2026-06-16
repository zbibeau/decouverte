import { FormStore, setValue } from '@modular-forms/solid';
import cx from 'classix';
import { mergeProps, splitProps } from 'solid-js';
import TextareaAutosize from 'solid-textarea-autosize';

import { Text } from '../primitives/Text';

/**
 * Textarea — refonte UI Kit moderne (handoff Lot 7).
 *
 * Aligné sur l'`Input` v2 :
 *   - rounded-[14px], border-[1.5px] border-violet-border, fond transparent
 *   - min-h-[84px] p-[13px_15px] leading-[1.5]
 *   - focus visible : ring violet 15% + border-primary-600
 *   - erreur : border-[#E9897F] + bg-[#FFF6F5] + text-[#B33B36]
 *
 * Variants conservés pour rétrocompat — re-mappés sur les nouveaux
 * tokens. Le double wrap interne (TextareaAutosize sur bg-white) est
 * remplacé par un wrap unique cohérent avec Input.
 */

const variantClassNames = {
  primary: 'border-violet-border bg-transparent hover:border-primary-200',
  secondary: 'border-secondary-200 bg-secondary-50/50 hover:border-secondary-300',
  danger: 'border-[#E9897F] bg-[#FFF6F5]',
  transparent: 'border-transparent bg-transparent',
  transparentWhite: 'border-transparent bg-transparent',
};

export const TextareaVariantClasses = Object.keys(variantClassNames) as (keyof typeof variantClassNames)[];

const variantValueClassNames = {
  primary: 'text-primary-950 placeholder:text-violet-faint',
  secondary: 'text-primary-950 placeholder:text-violet-faint',
  danger: 'text-[#B33B36] placeholder:text-[#C0463F]/60',
  transparent: 'text-primary-950 placeholder:text-violet-faint',
  transparentWhite: 'text-white placeholder:text-white/60',
} satisfies Record<keyof typeof variantClassNames, string>;

const variantLabelClassNames = {
  primary: 'text-primary-950',
  secondary: 'text-primary-950',
  danger: 'text-[#B33B36]',
  transparent: 'text-primary-950',
  transparentWhite: 'text-white',
} satisfies Record<keyof typeof variantClassNames, string>;

type TextareaProps = {
  label?: string;
  placeholder?: string;
  variant?: keyof typeof variantClassNames;
  isScrollable?: boolean;
  disabled?: boolean;
  rows?: number;

  class?: string;
  classInput?: string;

  value?: string;
  onChange?: (data?: string) => void;
};

export const Textarea = (_props: TextareaProps) => {
  const [props, otherProps] = splitProps(
    // eslint-disable-next-line solid/reactivity
    mergeProps(
      {
        variant: 'primary',
        size: 'default',
        isScrollable: true,
      },
      _props,
    ),
    ['variant', 'label', 'size', 'value', 'onChange', 'placeholder', 'isScrollable', 'rows', 'classInput', 'disabled'],
  );

  return (
    <div
      class={cx(
        'group space-y-2 rounded-[14px] border-[1.5px] px-[15px] py-[13px] transition-all',
        'focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-600/15',
        variantClassNames[props.variant as keyof typeof variantClassNames],
      )}
      {...otherProps}
    >
      {props.label && (
        <div>
          <Text class={variantLabelClassNames[props.variant as keyof typeof variantLabelClassNames]}>
            {props.label}
          </Text>
        </div>
      )}
      <TextareaAutosize
        minRows={props.rows || 3}
        maxRows={props.isScrollable && props.rows ? props.rows : undefined}
        class={cx(
          'w-full resize-none bg-transparent text-[15px] leading-[1.5] outline-none',
          variantValueClassNames[props.variant as keyof typeof variantValueClassNames],
          props?.classInput || '',
        )}
        //@ts-ignore
        value={props.value ? props.value : null}
        placeholder={props.placeholder}
        onInput={(e) => props.onChange && props.onChange(e.currentTarget.value)}
        disabled={props.disabled}
      />
    </div>
  );
};

export const TextareaForm = (props: TextareaProps & { name: string; form: FormStore<any, any>; error?: string }) => {
  return (
    <Textarea
      {...props}
      variant={props.error ? 'danger' : props.variant}
      value={props.value}
      onChange={(data) => {
        setValue(props.form, props.name, data, { shouldTouched: true });
      }}
    />
  );
};
