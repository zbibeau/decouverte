import { Accordion as AccordionCmp } from '@ark-ui/solid';
import cx from 'classix';
import { createSignal, For } from 'solid-js';

import { useI18nDict } from '../../../../services/useI18nDict';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';

/**
 * FAQCard — Direction B.
 *
 * Changement par rapport à l'existant : l'accordéon passe d'une liste
 * `divide-y` (séparateurs) à une PILE DE CARTES DOUCES. Chaque question porte
 * une pastille « + » à gauche qui pivote en « × » à l'ouverture. La structure
 * (Card + en-tête + Accordion ark-ui) et les icônes réelles sont conservées.
 * Le dispatcher (ChapterRenderer) n'a PAS besoin de changer.
 */
export const FAQCard = (props: { questions: { title: string; content: any }[] }) => {
  const t = useI18nDict({ fr: FAQCard_FR });

  const [value, setValue] = createSignal<string[]>([]);
  const isOpen = (k: string) => value().includes(k);

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

        {/* Direction B : cartes espacées au lieu de divide-y. */}
        <AccordionCmp.Root
          value={value()}
          collapsible
          onValueChange={(evt) => {
            setValue(evt.value);
          }}
          class="space-y-2.5"
        >
          <For each={(props.questions || []).filter((f) => f !== undefined)}>
            {(question) => (
              <AccordionCmp.Item
                value={question.title}
                class={cx(
                  'overflow-hidden rounded-2xl ring-1 transition-colors',
                  isOpen(question.title) ? 'bg-white ring-primary-200' : 'bg-primary-50 ring-primary-100',
                )}
              >
                <AccordionCmp.ItemTrigger class="flex w-full items-center gap-3.5 p-4 text-left hover:opacity-80">
                  {/* Pastille « + » → pivote en « × » à l'ouverture. */}
                  <span class="grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary-100">
                    <i
                      class={cx(
                        'icon icon-add-line block size-5 bg-primary-700 transition-transform duration-200',
                        isOpen(question.title) ? 'rotate-45' : '',
                      )}
                    />
                  </span>
                  <div class="flex-1">
                    <Text class="font-medium">{question.title}</Text>
                  </div>
                </AccordionCmp.ItemTrigger>

                {/* Réponse alignée sous le texte (pastille 32 + gap 14 + p-4). */}
                <AccordionCmp.ItemContent class="pb-4 pl-[62px] pr-4">{question.content}</AccordionCmp.ItemContent>
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
