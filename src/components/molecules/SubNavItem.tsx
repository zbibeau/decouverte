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
        {/* Refonte palette : point primary-600 (était primary-400) pour
            cohérence avec NavItem actif. */}
        <div class={cx('h-3 w-3 rounded-full', props.status === SubNavItemStatus.active && 'bg-primary-600')} />
      </div>

      <div
        class={cx(
          'text-sm font-normal leading-tight text-primary-950',
          props.status === SubNavItemStatus.active && '!font-medium',
          props.status === SubNavItemStatus.disabled && 'opacity-50',
        )}
      >
        {props.text}
      </div>
    </div>
  );
};
