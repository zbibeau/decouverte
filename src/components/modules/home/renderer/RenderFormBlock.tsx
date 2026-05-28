/* eslint-disable solid/no-innerhtml */
import { createForm, getValues, setValue, validate, zodForm } from '@modular-forms/solid';
import type { FormBlock, FormField } from '@shared/content-schema';
import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { z } from 'zod';

import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { RadioGroupForm } from '../../../atoms/RadioGroup';
import { InputLineSwitchForm } from '../../../molecules/InputLineSwitch';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { SectionNextButton } from '../components/SectionNextButton';
import { useHome } from '../context/HomeContext';
import { HOME_STEPS, HOME_STEPS_KEYS } from '../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../utils/HomeUtils';
import {
  CONSENT_ENABLED,
  CONSENT_LINK_TEXT,
  CONSENT_NOTICE,
  CONSENT_STORAGE_KEY,
  PRIVACY_POLICY_URL,
} from '../utils/privacyConsent';

// ============================================================
// Data-driven form block
// ============================================================
// Dynamically builds a Zod schema from the block payload's `fields`,
// renders one input per field type, and on submit merges the collected
// values into HomeContext before advancing to `nextStep`. Replaces the
// hardcoded IntroFormFields custom component; the fields list is stored
// in the block payload (edited via FormEditor in the manager).

function buildZodSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let base: z.ZodTypeAny;
    switch (f.type) {
      case 'boolean':
        base = z.boolean();
        break;
      case 'number':
        base = z.number();
        break;
      case 'enum':
        base = z.string();
        break;
      case 'string':
      default:
        base = z.string();
        break;
    }
    if (f.required === false) {
      base = base.optional().nullable();
    } else if (f.type === 'string' || f.type === 'enum') {
      base = (base as z.ZodString).min(1, 'Ce champ est requis');
    }
    shape[f.key] = base;
  }
  return z.object(shape);
}

type FormValues = Record<string, unknown>;

export const RenderFormBlock: Component<{
  block: FormBlock;
  sectionProps: HOME_SECTION_PROPS;
  /** Pre-rendered navbar element from the parent (ChapterRenderer). Rendered
   *  at the very top of the form's slide, before the centered card. */
  navbar?: import('solid-js').JSX.Element;
}> = (props) => {
  const [mounted, setMounted] = createSignal(false);
  // RGPD consent (cf. ../utils/privacyConsent). Mémorisé en localStorage
  // pour ne pas re-demander à un visiteur qui revient / enchaîne plusieurs
  // formulaires.
  const [consent, setConsent] = createSignal(false);
  onMount(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(CONSENT_STORAGE_KEY) === 'true') setConsent(true);
    } catch {
      /* localStorage indisponible */
    }
  });

  const { data: existingData, setData, chapters: homeChapters, currentStep: homeCurrentStep } = useHome();

  /** Same logical-order helper as the chapter renderer : walk sections in
   *  first-appearance order, then within a section by sectionOrder then by
   *  chapter.order. Lets us pick the chapter that visually follows this one
   *  in the sidebar, regardless of the raw DB `order` column. */
  function logicallyOrdered<
    T extends {
      order: number;
      sectionLabel?: string | null;
      sectionOrder?: number | null;
    },
  >(all: T[]): T[] {
    const sectionMinOrder = new Map<string, number>();
    for (const c of all) {
      const key = c.sectionLabel?.trim() || '__none__';
      const prev = sectionMinOrder.get(key);
      if (prev === undefined || c.order < prev) sectionMinOrder.set(key, c.order);
    }
    return [...all].sort((a, b) => {
      const ak = a.sectionLabel?.trim() || '__none__';
      const bk = b.sectionLabel?.trim() || '__none__';
      if (ak !== bk) {
        return (sectionMinOrder.get(ak) ?? 0) - (sectionMinOrder.get(bk) ?? 0);
      }
      const ao = a.sectionOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.sectionOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.order - b.order;
    });
  }

  const schema = createMemo(() => buildZodSchema(props.block.payload.fields ?? []));

  const [form, { Form, Field }] = createForm<FormValues>({
    // Cast: the generated zod schema is dynamic, but modular-forms only
    // uses the validator at runtime.
    validate: zodForm(schema() as never),
    validateOn: 'input',
    revalidateOn: 'input',
  });

  const data = createMemo(() => getValues(form));

  // Hydrate from existing HomeContext values (e.g. when the user comes back).
  createEffect(() => {
    const existing = existingData?.() ?? undefined;
    if (!existing) return;
    for (const f of props.block.payload.fields ?? []) {
      const v = (existing as Record<string, unknown>)[f.key];
      if (v !== undefined) {
        setValue(form, f.key, v as never);
      }
    }
    void validate(form, { shouldActive: false });
  });

  const payload = () => props.block.payload;

  return (
    // Wrap the form block in the same snap-target chrome as every other
    // block (see `AfterHeroContainer`). Without `snap-start snap-always
    // min-h-dvh`, the form would NOT be a snap point — and the
    // parent scroller (StepperLayout, `snap-y snap-mandatory`) would
    // happily fly past it from the previous block straight to the next
    // one, making the form appear to vanish during a fast scroll. The
    // `flex grow items-center` inner wrapper vertically centers the
    // form card so the user lands on it visually centered, mirroring
    // AfterHeroContainer's behaviour for the other block types.
    <div class="relative flex min-h-dvh snap-start snap-always flex-col pb-8">
      {props.navbar}
      <div class="flex grow items-center">
        <Show when={mounted()} fallback={<div class="m-auto w-full max-w-[600px] px-2 pb-12" />}>
          <div class="m-auto w-full max-w-[600px] px-2 pb-12">
            <Form class="space-y-6" onSubmit={() => {}}>
              <Card>
                <div class="space-y-4">
                  <Show when={payload().title || payload().icon}>
                    <div class="flex items-center gap-3">
                      <Show when={payload().icon}>
                        <div>
                          <Icon icon={`icon ${payload().icon}`} variant="secondary100Icon400" size="xs" />
                        </div>
                      </Show>
                      <Show when={payload().title}>
                        <div>
                          <Title tag="p" variant="h5">
                            {payload().title}
                          </Title>
                        </div>
                      </Show>
                    </div>
                  </Show>

                  <Show when={payload().description}>
                    <Text fontWeight="normal">
                      <span innerHTML={payload().description!} />
                    </Text>
                  </Show>

                  <div class="space-y-4">
                    <For each={payload().fields ?? []}>
                      {(f) => <RenderField field={f} form={form} Field={Field} />}
                    </For>
                  </div>
                </div>
              </Card>

              {/* Consentement RGPD — requis avant de soumettre (= collecter
                  les données). Texte + lien configurés dans
                  ../utils/privacyConsent (placeholders À REMPLACER). */}
              <Show when={CONSENT_ENABLED}>
                <label class="flex items-start gap-2 px-1 text-xs text-dark-700">
                  <input
                    type="checkbox"
                    checked={consent()}
                    onChange={(e) => {
                      const v = e.currentTarget.checked;
                      setConsent(v);
                      try {
                        if (v) localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
                      } catch {
                        /* ignore */
                      }
                    }}
                    class="mt-0.5 h-4 w-4 shrink-0"
                    aria-label="Consentement au traitement des données"
                  />
                  <span>
                    {CONSENT_NOTICE}{' '}
                    <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" class="underline">
                      {CONSENT_LINK_TEXT}
                    </a>
                  </span>
                </label>
              </Show>

              <div class="flex justify-end pt-6">
                <div>
                  <SectionNextButton
                    text={payload().nextButtonText ?? 'Continuer'}
                    onClick={() => {
                      const merged = { ...(existingData?.() ?? {}), ...data() };
                      setData(merged as never);
                      // Advance to the very next block. Two cases:
                      //
                      // (a) There is at least one block AFTER the form in
                      //     the SAME chapter (e.g. a conditional that branches
                      //     on the form answers, or a text wrap-up) → scroll
                      //     smoothly to it. Do NOT change chapter.
                      // (b) The form is the LAST block of the chapter →
                      //     navigate to the next chapter in the parcours'
                      //     logical reading order.
                      //
                      // The post-form blocks are gated by `formCompleted()` in
                      // ChapterRenderer's `shouldRenderAt`. `setData` above
                      // flips that to true, but Solid hasn't yet flushed the
                      // re-render — so we defer the DOM query by one task tick.
                      // setTimeout(0) is enough in practice (microtask queue
                      // drains first), but 50ms gives margin for slower
                      // machines / animations.
                      setTimeout(() => {
                        // `FormBlock` doesn't expose `id` in the schema type
                        // (id lives on `BlockWithId = ContentBlock & { id }`),
                        // but the runtime value coming from the chapter loader
                        // always carries it. Cast locally.
                        const formId = (props.block as FormBlock & { id?: string }).id;
                        const formWrapper = formId ? document.getElementById(`block-${formId}`) : null;
                        let next: Element | null = formWrapper?.nextElementSibling ?? null;
                        while (next && !(next as HTMLElement).dataset.blockId) {
                          next = next.nextElementSibling;
                        }
                        if (next) {
                          (next as HTMLElement).scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                          return;
                        }
                        // Fallback (case b) — no sibling block in DOM. Move
                        // to the next chapter in the parcours' logical
                        // section-aware reading order.
                        const all = homeChapters?.() ?? [];
                        const ordered = logicallyOrdered(all);
                        const curIdx = ordered.findIndex((c) => c.slug === homeCurrentStep?.());
                        const fallback = (HOME_STEPS as Record<string, HOME_STEPS_KEYS>).INTRO;
                        const targetSlug =
                          curIdx >= 0 && curIdx + 1 < ordered.length
                            ? (ordered[curIdx + 1].slug as HOME_STEPS_KEYS)
                            : fallback;
                        props.sectionProps.setCurrentStep(targetSlug);
                      }, 50);
                    }}
                    disabled={form.invalid || (CONSENT_ENABLED && !consent())}
                  />
                </div>
              </div>
            </Form>
          </div>
        </Show>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Per-field renderer
// ------------------------------------------------------------

const RenderField: Component<{
  field: FormField;
  // modular-forms types are awkward to pass around; cast at the call-site.
  form: unknown;
  Field: never;
}> = (props) => {
  const F = props.Field as unknown as (args: {
    name: string;
    type?: 'string' | 'boolean' | 'number';
    children: (field: { value: unknown; error: string; touched: boolean }, fProps: { name: string }) => unknown;
  }) => unknown;
  const f = props.field;
  const form = props.form as never;

  switch (f.type) {
    case 'boolean':
      return (
        <F name={f.key} type="boolean">
          {(field, fProps) => (
            <InputLineSwitchForm
              text={f.label}
              name={fProps.name}
              value={field.value as boolean | undefined}
              error={field.touched ? field.error : undefined}
              form={form}
              trueText="Oui"
              falseText="Non"
              variant="secondary"
            />
          )}
        </F>
      ) as unknown as ReturnType<Component>;

    case 'enum':
      return (
        <F name={f.key} type="string">
          {(field, fProps) => (
            <div class="group flex items-center justify-between gap-2 rounded-2xl border border-transparent bg-secondary-50 px-4 py-3 hover:border-secondary-100">
              <RadioGroupForm
                label={f.label}
                name={fProps.name}
                options={(f.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
                value={field.value as string | undefined}
                error={field.touched ? field.error : undefined}
                form={form}
                variant="default"
              />
            </div>
          )}
        </F>
      ) as unknown as ReturnType<Component>;

    case 'number':
      return (
        <F name={f.key} type="number">
          {(field, fProps) => (
            <label class="flex flex-col gap-1 px-4 py-3">
              <span class="text-sm text-dark-950">{f.label}</span>
              <input
                type="number"
                name={fProps.name}
                placeholder={f.placeholder}
                value={(field.value as number | undefined) ?? ''}
                class="rounded-md border border-secondary-100 bg-white px-3 py-2 text-sm"
              />
              <Show when={field.touched && field.error}>
                <span class="text-xs text-red-600">{field.error}</span>
              </Show>
            </label>
          )}
        </F>
      ) as unknown as ReturnType<Component>;

    case 'string':
    default:
      return (
        <F name={f.key} type="string">
          {(field, fProps) => (
            <label class="flex flex-col gap-1 px-4 py-3">
              <span class="text-sm text-dark-950">{f.label}</span>
              <input
                type="text"
                name={fProps.name}
                placeholder={f.placeholder}
                value={(field.value as string | undefined) ?? ''}
                class="rounded-md border border-secondary-100 bg-white px-3 py-2 text-sm"
              />
              <Show when={field.touched && field.error}>
                <span class="text-xs text-red-600">{field.error}</span>
              </Show>
            </label>
          )}
        </F>
      ) as unknown as ReturnType<Component>;
  }
};
