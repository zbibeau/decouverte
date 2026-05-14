import { Dialog } from '@ark-ui/solid';
import cx from 'classix';
import { createEffect, createSignal, JSX, mergeProps } from 'solid-js';
import { Portal } from 'solid-js/web';

export type Unpacked<T> = T extends (infer U)[] ? U : T;
import { Title, TitleVariantClasses } from '../primitives/Title';
import { Icon } from './Icon';

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
        <Dialog.Backdrop class="absolute left-0 top-0 z-[999] h-screen w-screen bg-dark-950 bg-opacity-60" />
        <Dialog.Positioner
          class={cx(
            'absolute z-[999] h-max max-h-screen w-full max-w-[100vw] overflow-auto md:w-max',
            'bottom-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:transform',
            !isOpen() && 'hidden',
          )}
        >
          <Dialog.Content
            class={cx(
              'relative block space-y-3 rounded-t-3xl bg-white p-8 shadow outline-none md:rounded-3xl',
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
              <Dialog.CloseTrigger class="absolute right-4 top-4 z-50 !m-0 cursor-pointer outline-none hover:opacity-60">
                <Icon icon="icon icon-close" size="lg" isRounded variant="whiteDark950" />
              </Dialog.CloseTrigger>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
