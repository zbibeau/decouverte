import { Accordion as AccordionCmp } from '@ark-ui/solid';
import cx from 'classix';
import { createSignal, For } from 'solid-js';

import { useI18nDict } from '../../../../services/useI18nDict';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';

export const FAQCard = (props: { questions: { title: string; content: any }[] }) => {
  const t = useI18nDict({ fr: FAQCard_FR });

  const [value, setValue] = createSignal<string[]>([]);

  return (
    <Card>
      <div class="space-y-12">
        <div class="flex w-full flex-col items-center justify-items-center gap-2">
          <div>
            <Icon icon="icon icon-questionnaire-fill" variant="secondary100Icon400" size="lg" />
          </div>
          <div>
            <Title variant="h4" tag="p">
              {t()('title')}
            </Title>
          </div>
        </div>

        <AccordionCmp.Root
          value={value()}
          collapsible
          onValueChange={(evt) => {
            setValue(evt.value);
          }}
          class="divide-y px-4"
        >
          <For each={(props.questions || []).filter((f) => f !== undefined)}>
            {(question) => (
              <AccordionCmp.Item value={question.title} class="py-3">
                <AccordionCmp.ItemTrigger class="flex w-full items-center justify-between hover:opacity-70">
                  <div>
                    <Text>{question.title}</Text>
                  </div>

                  <AccordionCmp.ItemIndicator>
                    <i
                      class={cx(
                        'icon icon-arrow-down-s-line block size-6 bg-secondary-400',
                        value().includes(question.title) ? '-rotate-180' : '',
                      )}
                    />
                  </AccordionCmp.ItemIndicator>
                </AccordionCmp.ItemTrigger>

                <AccordionCmp.ItemContent class="py-3">{question.content}</AccordionCmp.ItemContent>
              </AccordionCmp.Item>
            )}
          </For>
        </AccordionCmp.Root>
      </div>
    </Card>
  );
};

export const FAQCard_FR = {
  title: 'Questions fréquentes',
};
