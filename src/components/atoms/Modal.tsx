import { Dialog } from '@ark-ui/solid';
import cx from 'classix';
import { createEffect, createSignal, JSX, mergeProps } from 'solid-js';
import { Portal } from 'solid-js/web';

export type Unpacked<T> = T extends (infer U)[] ? U : T;
import { Title, TitleVariantClasses } from '../primitives/Title';

const sizeClassNames = {
  sm: 'md:w-screen md:max-w-[400px]',
  md: 'md:w-screen md:max-w-[600px]',
  lg: 'md:w-screen md:max-w-[800px]',
  xl: 'md:w-screen md:max-w-[1200px]',
};

const titleVariants = {
  sm: 'h2',
  md: 'h1',
  lg: 'h1',
  xl: 'h1',
} as Record<keyof typeof sizeClassNames, Unpacked<typeof TitleVariantClasses>>;

export const ModalSizeClasses = Object.keys(sizeClassNames) as (keyof typeof sizeClassNames)[];

export const Modal = (_props: {
  isOpen: boolean;
  children: JSX.Element;

  title?: string;
  size?: keyof typeof sizeClassNames;
  imageUrl?: string;
  modalClass?: string;
  contentClass?: string;
  onChange?: (value: boolean) => void;
}) => {
  const props = mergeProps(
    {
      size: 'md' as const,
    },
    _props,
  );

  const [isOpen, setIsOpen] = createSignal<boolean>();

  createEffect(() => {
    setIsOpen(props.isOpen);
  });

  return (
    <Dialog.Root
      open={isOpen()}
      closeOnEscapeKeyDown={!!props.onChange}
      closeOnInteractOutside={!!props.onChange}
      onOpenChange={(e) => {
        setIsOpen(e.open);
        if (props.onChange) {
          props.onChange(e.open);
        }
      }}
    >
      <Portal>
        {/* Refonte UI Kit Lot 8 — backdrop violet sombre teinté
            (primary-950/14, handoff) au lieu d'un noir 60%. Plus dans
            l'ADN de la marque, moins clinique. */}
        <Dialog.Backdrop class="absolute left-0 top-0 z-[999] h-screen w-screen bg-primary-950/40 backdrop-blur-[2px]" />
        <Dialog.Positioner
          class={cx(
            'absolute z-[999] h-max max-h-screen w-full max-w-[100vw] overflow-auto md:w-max',
            'bottom-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:transform',
            !isOpen() && 'hidden',
          )}
        >
          <Dialog.Content
            class={cx(
              // Refonte UI Kit Lot 8 — panel : rounded-[22px], padding
              // 26px, shadow violet teintée premium. Sur mobile : sheet
              // ancré en bas avec coins arrondis sup uniquement.
              'relative block space-y-3 rounded-t-[22px] bg-white p-[26px] shadow-premium outline-none md:rounded-[22px]',
              sizeClassNames[props.size],
              'mt-4 md:my-16',
              props.modalClass,
            )}
          >
            {props.imageUrl && (
              <div
                class={cx('-mx-8 -mt-8 h-[225px] rounded-t-3xl bg-cover bg-center bg-no-repeat')}
                style={{ 'background-image': `url(${props.imageUrl})` }}
              />
            )}
            {props.title && (
              <Dialog.Title>
                <Title
                  variant={titleVariants[props.size]}
                  tag="p"
                  class={cx('!m-0 pr-3', props.imageUrl ? 'pt-8' : 'pt-2')}
                >
                  {props.title}
                </Title>
              </Dialog.Title>
            )}

            {isOpen() && (
              <Dialog.Description>
                <div class={cx('!mb-0', !props.title && !!props.onChange && 'pt-7', props.contentClass)}>
                  {props.children}
                </div>
              </Dialog.Description>
            )}

            {!!props.onChange && (
              // Refonte UI Kit Lot 8 — close 30px bg #F1ECF8 (violet-divider),
              // icône violet-faint #9F8FB8, hover : darken.
              <Dialog.CloseTrigger class="absolute right-4 top-4 z-50 !m-0 inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-violet-divider outline-none transition-colors hover:bg-violet-border">
                <i class="icon icon-close block h-3.5 w-3.5 bg-current text-violet-faint" />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
