import cx from 'classix';

import { Icon } from '../../../atoms/Icon';
import { Text } from '../../../primitives/Text';

export const SectionNextButton = (props: {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}) => {
  return (
    <div
      class={cx(
        'flex cursor-pointer items-center gap-2 hover:opacity-60',
        (props.disabled || props.isLoading) && '!cursor-not-allowed opacity-30',
      )}
      onClick={() => {
        if (props.disabled || props.isLoading) {
          return;
        }
        props.onClick();
      }}
    >
      <div>
        <Text variant="lg">{props.text}</Text>
      </div>
      <div>
        <Icon
          isRounded
          icon={props.isLoading ? 'icon icon-loop-right-line animate-spin' : 'icon icon-arrow-right'}
          size="default"
          variant="primary400"
        />
      </div>
    </div>
  );
};
