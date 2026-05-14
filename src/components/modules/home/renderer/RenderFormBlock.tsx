/* eslint-disable solid/no-innerhtml */
import type { FormBlock, FormField } from '@shared/content-schema';
import { createForm, getValues, setValue, validate, zodForm } from '@modular-forms/solid';
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
}> = (props) => {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const { data: existingData, setData } = useHome();

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
    <Show when={mounted()} fallback={<div class="m-auto w-full max-w-[600px] px-2 pb-12" />}>
      <div class="m-auto w-full max-w-[600px] px-2 pb-12">
        <Form class="space-y-6" onSubmit={() => {}}>
          <Card>
            <div class="space-y-4">
              <Show when={payload().title || payload().icon}>
                <div class="flex items-center gap-3">
                  <Show when={payload().icon}>
                    <div>
                      <Icon
                        icon={`icon ${payload().icon}`}
                        variant="secondary100Icon400"
                        size="xs"
                      />
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

          <div class="flex justify-end pt-6">
            <div>
              <SectionNextButton
                text={payload().nextButtonText ?? 'Continuer'}
                onClick={() => {
                  const merged = { ...(existingData?.() ?? {}), ...data() };
                  setData(merged as never);
                  const nextKey = payload().nextStep as HOME_STEPS_KEYS | undefined;
                  const target =
                    nextKey && (HOME_STEPS as Record<string, HOME_STEPS_KEYS>)[nextKey]
                      ? (HOME_STEPS as Record<string, HOME_STEPS_KEYS>)[nextKey]
                      : HOME_STEPS.INTRO;
                  props.sectionProps.setCurrentStep(target);
                }}
                disabled={form.invalid}
              />
            </div>
          </div>
        </Form>
      </div>
    </Show>
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
