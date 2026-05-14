import cx from 'classix';
import { JSX } from 'solid-js';

export const Card = (props: { children?: JSX.Element; class?: string }) => {
  return <div class={cx('w-full rounded-3xl bg-white p-5 shadow', props.class)}>{props.children}</div>;
};
