import cx from 'classix';
import isEqual from 'lodash/isEqual';
import { createSignal, onMount } from 'solid-js';

import { Icon } from '../../../atoms/Icon';

export const GotToNextPartButton = () => {
  const [elementToScroll, setElementToScroll] = createSignal<Element>();
  const [items, setItems] = createSignal<Element[]>();

  onMount(() => {
    setInterval(() => {
      refreshButtonClick();
    }, 500);
  });

  const refreshButtonClick = () => {
    const container = document.querySelector('#stepper-content');
    const elements = Array.from(document.querySelectorAll('#stepper-content > div > div.snap-start'));

    // Transition to next page
    if (elements.length === 0) {
      return;
    }

    //Same Page, so don't need to run this
    if (isEqual(elements, items())) {
      return;
    }

    setItems(elements);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const nextElement = items()[items().indexOf(entry.target) + 1];
            if (nextElement !== elementToScroll()) {
              setElementToScroll(nextElement);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.01,
      },
    );

    elements.forEach((el) => {
      observer.observe(el);
    });
  };

  const onIconClick = () => {
    elementToScroll()?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      class={cx('fixed inset-x-0 bottom-2 z-[200] m-auto w-fit md:pl-[280px]', !elementToScroll() ? 'hidden' : 'block')}
    >
      <Icon
        variant="dark950"
        size="default"
        icon="icon icon-arrow-right rotate-90"
        isRounded
        onClick={() => onIconClick()}
      />
    </div>
  );
};
