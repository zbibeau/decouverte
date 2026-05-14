import cx from 'classix';
import { JSX } from 'solid-js';

export const ExceptionBlock = (props: {
  blockClass?: string;
  childrenBlock: JSX.Element;
  childrenException?: JSX.Element;
}) => {
  return (
    <div>
      <div
        class={cx(
          'w-full space-y-2 rounded-2xl bg-gradient-to-r from-orange-50 to-orange-50 p-6',
          props.blockClass || '',
          !!props.childrenException && '!pb-20',
        )}
      >
        {props.childrenBlock}
      </div>
      {props.childrenException && <div class="mx-6 -mt-14 -rotate-2">{props.childrenException}</div>}
    </div>
  );
};
