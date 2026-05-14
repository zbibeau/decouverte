import cx from 'classix';
import { JSX, mergeProps } from 'solid-js';

import { Icon } from '../atoms/Icon';

export enum NavItemStatus {
  default = 'default',
  back = 'back',
  active = 'active',
  done = 'done',
  disabled = 'disabled',
}

export const NavItem = (_props: {
  text: string;

  status?: NavItemStatus;
  previousIsDone?: boolean;
  nextIsDone?: boolean;

  isBold?: boolean;

  onClick?: JSX.EventHandler<unknown, MouseEvent>;
}) => {
  const props = mergeProps(
    {
      status: NavItemStatus.default,
    },
    _props,
  );

  return (
    <div class="relative">
      <div>
        <div
          class={cx(
            'absolute left-[0.500rem] z-0 w-[2px] bg-success-400',
            props.previousIsDone && props.nextIsDone && props.status === NavItemStatus.done && 'h-full',
            props.previousIsDone &&
              !props.nextIsDone &&
              [NavItemStatus.active, NavItemStatus.done].includes(props.status) &&
              'h-2',
            !props.previousIsDone && props.nextIsDone && props.status === NavItemStatus.done && 'mt-[24px] h-full',
            !props.previousIsDone && !props.nextIsDone && 'hidden',
          )}
        />
      </div>

      <div
        class={cx(
          'z-1 relative flex gap-2 py-2',
          props.onClick && props.status !== NavItemStatus.disabled && 'cursor-pointer',
          props.status === NavItemStatus.disabled && 'cursor-not-allowed',
          props.status === NavItemStatus.back && 'opacity-50',
        )}
        onClick={(e) => props.onClick && props.status !== NavItemStatus.disabled && props.onClick(e)}
      >
        <div>
          {(props.status === NavItemStatus.default || props.status === NavItemStatus.disabled) && (
            <div class="relative size-4 rounded-md bg-white shadow" />
          )}
          {props.status === NavItemStatus.back && (
            <Icon size="2xs" icon="icon icon-arrow-left" variant="whiteSecondary900" isTransparent />
          )}
          {props.status === NavItemStatus.active && (
            <div class="rounded-md shadow">
              <Icon size="2xs" icon="icon icon-arrow-right" variant="primary400" />
            </div>
          )}
          {props.status === NavItemStatus.done && <Icon size="2xs" icon="icon icon-check-line" variant="success400" />}
        </div>

        <div>
          <div
            class={cx(
              props.isBold ? 'pt-[0.150rem]' : 'pt-[0.100rem]',
              'text-sm font-normal leading-none text-secondary-900',
              props.status === NavItemStatus.active && props.isBold && '!font-medium',
              props.status === NavItemStatus.disabled && 'opacity-50 grayscale',
            )}
          >
            {props.text}
          </div>
        </div>
      </div>
    </div>
  );
};
