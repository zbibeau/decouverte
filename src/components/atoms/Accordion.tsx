import { Accordion as AccordionCmp } from '@ark-ui/solid';
import cx from 'classix';
import { createEffect, createSignal, For, JSX } from 'solid-js';

import { Text } from '../primitives/Text';
interface AccordionItem {
  key: string;
  title: string;
  children: JSX.Element;
}

export const Accordion = (props: { steps: AccordionItem[]; defaultKey?: string }) => {
  const [value, setValue] = createSignal<string[]>([]);

  createEffect(() => {
    if (props.steps) {
      if (props.defaultKey) {
        setValue([props.steps.find((v) => v.key === props.defaultKey)?.key]);
      }
    }
  });

  return (
    <AccordionCmp.Root
      value={value()}
      collapsible
      onValueChange={(evt) => {
        setValue(evt.value);
      }}
      class="space-y-2"
    >
      <For each={props.steps}>
        {(step) => (
          <AccordionCmp.Item value={step.key} class="rounded-2xl bg-white">
            <AccordionCmp.ItemTrigger class="flex w-full items-center justify-between p-4 hover:opacity-70">
              <div>
                <Text>{step.title}</Text>
              </div>

              <AccordionCmp.ItemIndicator>
                <i
                  class={cx(
                    'icon icon-arrow-down-s-line block size-6 bg-primary-400',
                    value().includes(step.key) ? '-rotate-180' : '',
                  )}
                />
              </AccordionCmp.ItemIndicator>
            </AccordionCmp.ItemTrigger>

            <AccordionCmp.ItemContent class="rounded-b-2xl bg-primary-100">{step.children}</AccordionCmp.ItemContent>
          </AccordionCmp.Item>
        )}
      </For>
    </AccordionCmp.Root>
  );
};
