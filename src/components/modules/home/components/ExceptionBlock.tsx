import cx from 'classix';
import { JSX } from 'solid-js';

/**
 * ExceptionBlock — refonte UI Kit Lot 8.
 *
 * Bloc contenu (haut) + sticker exception ocre tilté (bas, débordant).
 * Refonte :
 *   - Wrapper bloc : passe de from-orange-50/to-orange-50 plat à un
 *     blanc avec border-violet-border-soft + shadow-card teintée violet
 *     (l'orange-50 legacy était hors palette de la peau).
 *   - Sticker exception : conserve son tilt -2deg, gardé pour les
 *     callers qui le stylent via `childrenException` ; l'ombre teintée
 *     ocre arrive avec le styling du caller.
 */
export const ExceptionBlock = (props: {
  blockClass?: string;
  childrenBlock: JSX.Element;
  childrenException?: JSX.Element;
}) => {
  return (
    <div>
      <div
        class={cx(
          'w-full space-y-2 rounded-[22px] border border-violet-border-soft bg-white p-6 shadow-card',
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
