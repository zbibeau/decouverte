import cx from 'classix';
import { JSX, mergeProps } from 'solid-js';

export enum SubNavItemStatus {
  default = 'default',
  active = 'active',
  disabled = 'disabled',
}

export const SubNavItem = (_props: {
  status?: SubNavItemStatus;
  text: string;
  onClick?: JSX.EventHandler<unknown, MouseEvent>;
}) => {
  const props = mergeProps(
    {
      status: SubNavItemStatus.default,
    },
    _props,
  );

  return (
    <div
      class={cx(
        'flex items-center gap-2 pl-6',
        props.onClick && props.status !== SubNavItemStatus.disabled && 'cursor-pointer',
        props.status === SubNavItemStatus.disabled && '!cursor-not-allowed',
      )}
      onClick={(e) => props.onClick && props.status !== SubNavItemStatus.disabled && props.onClick(e)}
    >
      <div>
        <div class={cx('h-3 w-3 rounded-full', props.status === SubNavItemStatus.active && 'bg-primary-400')} />
      </div>

      <div
        class={cx(
          'text-sm font-normal leading-tight text-secondary-900',
          props.status === SubNavItemStatus.active && '!font-medium',
          props.status === SubNavItemStatus.disabled && 'opacity-50 grayscale',
        )}
      >
        {props.text}
      </div>
    </div>
  );
};
