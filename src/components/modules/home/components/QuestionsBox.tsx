import { createScheduled, debounce } from '@solid-primitives/scheduled';
import { createEffect, createSignal, onMount } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';
import { useI18nDict } from '../../../../services/useI18nDict';
import { Accordion } from '../../../atoms/Accordion';
import { Textarea } from '../../../atoms/Textarea';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';
import { useHome } from '../context/HomeContext';

const scheduled = createScheduled((fn) => debounce(fn, 250));
const scheduledSave = createScheduled((fn) => debounce(fn, 3000));

const QuestionBoxStep = (props: { field: 'questionsStep1' | 'questionsStep2' | 'questionsStep3' }) => {
  const { data, setData } = useHome();
  const t = useI18nDict({ fr: QuestionsBoxFR });
  const [value, setValue] = createSignal<string>();
  const [isSaved, setIsSaved] = createSignal(false);

  onMount(() => {
    setValue(data()?.[props.field]);
    setIsSaved(false);
  });

  createEffect(() => {
    // track source signal
    const v = value();
    // track the debounced signal and check if it's dirty
    if (scheduled()) {
      setIsSaved((prev) => (prev === false ? true : prev));
      setData({ [props.field]: v });
    }
  });

  createEffect(() => {
    // track source signal
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = isSaved();
    // track the debounced signal and check if it's dirty
    if (scheduledSave()) {
      setIsSaved(false);
    }
  });

  return (
    <div class="relative">
      <Textarea
        variant="transparent"
        classInput="text-primary-400 placeholder:text-primary-400 placeholder:opacity-60 !bg-transparent !p-4 group-hover:!shadow-none"
        value={value()}
        placeholder={t()('placeholder')}
        onChange={(v) => {
          setValue(v);
        }}
        rows={4}
      />
      {isSaved() && (
        <div class="absolute bottom-1.5 right-1.5 rounded-full bg-success-400 p-1">
          <i class="icon icon-check-line block size-3 bg-white" />
        </div>
      )}
    </div>
  );
};

export const QuestionsBox = (props: { currentKey: 'HomeTool1' | 'HomeTool2' | 'HomeTool3' }) => {
  const { data } = useHome();
  const i18n = useI18n();
  const t = useI18nDict({ fr: QuestionsBoxFR });

  const [steps, setSteps] = createSignal([]);
  onMount(() => {
    setSteps(
      [
        {
          title: i18n().t('layout.stepper.sections.tool.step1'),
          children: <QuestionBoxStep field="questionsStep1" />,
          key: 'HomeTool1',
        },
        {
          title: i18n().t('layout.stepper.sections.tool.step2'),
          children: <QuestionBoxStep field="questionsStep2" />,
          key: 'HomeTool2',
        },
        {
          title: i18n().t('layout.stepper.sections.tool.step3'),
          children: <QuestionBoxStep field="questionsStep3" />,
          key: 'HomeTool3',
        },
      ].filter((v) => {
        const currentStep = parseInt(props.currentKey.replace('HomeTool', ''), 10);
        const elementStep = parseInt(v.key.replace('HomeTool', ''), 10);

        const elementValue = data()?.['questionsStep' + elementStep];

        return (
          currentStep >= elementStep || (elementValue !== '' && elementValue !== undefined && elementValue !== null)
        );
      }),
    );
  });

  return (
    <div class="w-full space-y-6">
      <img src="/illustrations/toolbox-faq.svg" alt="faq" class="mx-auto w-full max-w-[128px]" />

      <div class="space-y-1">
        <Title variant="h3" class="text-center text-white">
          {t()('title')}
        </Title>
        <Text class="text-center text-primary-400">{t()('subTitle')}</Text>
      </div>

      <Accordion steps={steps()} defaultKey={props.currentKey} />
    </div>
  );
};

const QuestionsBoxFR = {
  title: 'Des points clés à clarifier ?',
  subTitle: "Renseignez ici vos questions, nous les aborderons ensemble lors d'un rendez-vous après votre découverte",
  placeholder: 'Si vous le souhaitez, posez ici vos questions concernant cette rubrique...',
};
