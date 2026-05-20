/* eslint-disable solid/no-innerhtml */
import { createForm, getValues, setValue, validate, zodForm } from '@modular-forms/solid';
import { Component, createEffect, createMemo, createSignal, onMount, Show } from 'solid-js';

import { Card } from '../../../../atoms/Card';
import { Icon } from '../../../../atoms/Icon';
import { Modal } from '../../../../atoms/Modal';
import { RadioGroupForm } from '../../../../atoms/RadioGroup';
import { InputLineSwitchForm } from '../../../../molecules/InputLineSwitch';
import { Text } from '../../../../primitives/Text';
import { Title } from '../../../../primitives/Title';
import { SectionNextButton } from '../../components/SectionNextButton';
import { IntroSchema, IntroSchemaType, PERSON_WHO_HANDLE_CALLS, useHome } from '../../context/HomeContext';
import { HOME_STEPS, HOME_STEPS_KEYS } from '../../utils/HomeSteps';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

/**
 * Intro form card — encapsulates the modular-forms / Zod-validated questionnaire
 * that hydrates the HomeContext branching variables. Registered as a custom
 * component so the INTRO chapter (data-driven) can drop it via `componentRef`
 * while still letting the manager edit the surrounding card chrome (title,
 * description, icon) and the next-step target through props.
 *
 * Props are intentionally cosmetic — the actual list of fields stays hardcoded
 * because each switch is wired to a specific IntroSchema key. Phase 3 #17 will
 * generalise this once variables become first-class table rows.
 */
export const IntroFormFieldsImpl: Component<
  HOME_SECTION_PROPS & {
    cardTitle?: string;
    cardDescription?: string;
    cardIcon?: string;
    nextButtonText?: string;
    loadingText?: string;
    nextStep?: HOME_STEPS_KEYS;
  }
> = (props) => {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const { data: existingData, setData, isLoading } = useHome();

  const [form, { Form, Field }] = createForm<IntroSchemaType>({
    validate: zodForm(IntroSchema),
    validateOn: 'input',
    revalidateOn: 'input',
  });

  const data = createMemo(() => getValues(form));

  createEffect(() => {
    if (existingData()) {
      for (const [key, value] of Object.entries(existingData())) {
        setValue(form, key as keyof IntroSchemaType, value);
      }
    }
    validate(form, { shouldActive: false });
  });

  const yes = 'Oui';
  const no = 'Non';

  return (
    <Show when={mounted()} fallback={<div class="m-auto w-full max-w-[600px] px-2 pb-12" />}>
      <div class="m-auto w-full max-w-[600px] px-2 pb-12">
        {isLoading() && (
          <Modal isOpen>
            <div class="space-y-2">
              <Icon icon="icon icon-loop-right-line animate-spin" variant="secondary100Icon400" class="m-auto" />
              <p class="text-center italic">
                {props.loadingText ?? 'Veuillez patienter, nous accédons aux derniers échanges avec vous…'}
              </p>
            </div>
          </Modal>
        )}

        <Form class="space-y-6" onSubmit={() => {}}>
          <Card>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div>
                  <Icon icon={`icon icon-${props.cardIcon ?? 'check-line'}`} variant="secondary100Icon400" size="xs" />
                </div>
                <div>
                  <Title tag="p" variant="h5">
                    {props.cardTitle ?? 'Pour une démo personnalisée'}
                  </Title>
                </div>
              </div>

              <Text fontWeight="normal">
                <span innerHTML={props.cardDescription ?? 'Merci de répondre à ces quelques questions :'} />
              </Text>

              <Field name="isDoctor" type="boolean">
                {(field, fProps) => (
                  <InputLineSwitchForm
                    text="Êtes-vous médecin (ou un membre du cabinet) ?"
                    name={fProps.name}
                    value={field.value}
                    error={field.touched ? field.error : undefined}
                    form={form}
                    trueText={yes}
                    falseText={no}
                    variant="secondary"
                  />
                )}
              </Field>

              <div class="space-y-4">
                <Field name="isInGroup" type="boolean">
                  {(field, fProps) => (
                    <InputLineSwitchForm
                      text="Exercez-vous en groupe ?"
                      name={fProps.name}
                      value={field.value}
                      error={field.touched ? field.error : undefined}
                      form={form}
                      trueText={yes}
                      falseText={no}
                      variant="secondary"
                    />
                  )}
                </Field>

                <Field name="acceptNewPatient" type="boolean">
                  {(field, fProps) => (
                    <InputLineSwitchForm
                      text="Acceptez-vous les nouveaux patients ?"
                      name={fProps.name}
                      value={field.value}
                      error={field.touched ? field.error : undefined}
                      form={form}
                      trueText={yes}
                      falseText={no}
                      variant="secondary"
                    />
                  )}
                </Field>

                <Field name="isDoingVAD" type="boolean">
                  {(field, fProps) => (
                    <InputLineSwitchForm
                      text="Effectuez-vous des visites à domicile ?"
                      name={fProps.name}
                      value={field.value}
                      error={field.touched ? field.error : undefined}
                      form={form}
                      trueText={yes}
                      falseText={no}
                      variant="secondary"
                    />
                  )}
                </Field>

                <Field name="personWhoHandleCalls" type="string">
                  {(field, fProps) => (
                    <div class="group flex items-center justify-between gap-2 rounded-2xl border border-transparent bg-secondary-50 px-4 py-3 hover:border-secondary-100">
                      <RadioGroupForm
                        label="Qui gère les appels aujourd'hui ?"
                        name={fProps.name}
                        options={[
                          { value: PERSON_WHO_HANDLE_CALLS.DOCTOR, label: 'Vous' },
                          { value: PERSON_WHO_HANDLE_CALLS.SECRETARY, label: 'Secrétaire' },
                          {
                            value: PERSON_WHO_HANDLE_CALLS['REMOTE-SECRETARY'],
                            label: 'Télé-secrétariat',
                          },
                        ]}
                        value={field.value}
                        error={field.touched ? field.error : undefined}
                        form={form}
                        variant="default"
                      />
                    </div>
                  )}
                </Field>
              </div>
            </div>
          </Card>

          <div class="flex justify-end pt-6">
            <div>
              <SectionNextButton
                text={props.nextButtonText ?? 'Suivant'}
                onClick={() => {
                  setData(data());
                  props.setCurrentStep(props.nextStep ?? HOME_STEPS.STEP_OBSERVATION);
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
