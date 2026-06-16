import { Accordion as AccordionCmp } from '@ark-ui/solid';
import cx from 'classix';
import { createEffect, createSignal, For, JSX } from 'solid-js';

interface AccordionItem {
  key: string;
  title: string;
  children: JSX.Element;
}

/**
 * Accordion — refonte UI Kit moderne (handoff Lot 8 §FAQ / accordéon).
 *
 * Avant : item plat rounded-2xl bg-white avec contenu sur bg-primary-100,
 * indicateur chevron primary-400.
 *
 * Après (handoff §FAQ / Accordéon) :
 *   - Item fermé : border border-[#E6DEF1] bg-transparent, signe `+` violet-faint.
 *   - Item ouvert : border-[1.5px] border-primary-600 bg-primary-50,
 *     titre 700 text-primary-950, signe `−` violet, réponse violet-text leading-relaxed.
 *   - Padding 15px, rayon 14px (au lieu de rounded-2xl).
 *
 * Trigger : `+` (fermé) → `−` (ouvert) au lieu d'un chevron rotaté. Plus
 * conforme au motif FAQ classique du handoff.
 */
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
        {(step) => {
          const isOpen = () => value().includes(step.key);
          return (
            <AccordionCmp.Item
              value={step.key}
              class={cx(
                'rounded-[14px] transition-colors',
                isOpen() ? 'border-[1.5px] border-primary-600 bg-primary-50' : 'border border-[#E6DEF1] bg-white',
              )}
            >
              <AccordionCmp.ItemTrigger class="flex w-full items-center justify-between gap-3 px-[15px] py-[14px] text-left">
                <span
                  class={cx(
                    'text-[15px] leading-tight',
                    isOpen() ? 'font-bold text-primary-950' : 'font-medium text-primary-950',
                  )}
                >
                  {step.title}
                </span>

                <AccordionCmp.ItemIndicator class="shrink-0">
                  {/* Trigger : « − » ouvert / « + » fermé. Caractère Unicode
                      pour rester indépendant des icon fonts. */}
                  <span
                    class={cx(
                      'inline-flex h-6 w-6 items-center justify-center text-xl leading-none',
                      isOpen() ? 'text-primary-600' : 'text-violet-faint',
                    )}
                    aria-hidden="true"
                  >
                    {isOpen() ? '−' : '+'}
                  </span>
                </AccordionCmp.ItemIndicator>
              </AccordionCmp.ItemTrigger>

              <AccordionCmp.ItemContent class="px-[15px] pb-[14px] text-[14px] leading-[1.5] text-violet-text">
                {step.children}
              </AccordionCmp.ItemContent>
            </AccordionCmp.Item>
          );
        }}
      </For>
    </AccordionCmp.Root>
  );
};
