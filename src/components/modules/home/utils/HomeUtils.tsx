import { tI18n } from '../../../../lang/useI18n';
import type { NavGroupData } from '../../../organisms/NavGroup';
import { HOME_STEPS, HOME_STEPS_KEYS } from './HomeSteps';

export type HOME_SECTION_PROPS = {
  setCurrentStep: (step: HOME_STEPS_KEYS) => void;
};

export const HOME_STEPS_LAYOUT_VALUE = {
  PRESENTATION: '1.0',
  INTRO: '1.0',

  STEP_OBSERVATION: '1.1',

  STEP_TOOL_1: '2.1',

  STEP_TOOL_2: '2.2',

  STEP_TOOL_3: '2.3',

  STEP_NEXT_PRICING: '3.1',
  STEP_NEXT_TRANSITION: '3.2',

  END: '',
} satisfies Record<HOME_STEPS_KEYS, string>;

export const HOME_SECTIONS_DATA = (t: tI18n, changeStep: (step: HOME_STEPS_KEYS) => void): NavGroupData => [
  {
    title: t('layout.stepper.sections.observation.title'),
    steps: [
      {
        text: t('layout.stepper.sections.observation.step1')!,
        onClick: () => changeStep(HOME_STEPS.STEP_OBSERVATION),
      },
    ],
  },
  {
    title: t('layout.stepper.sections.tool.title'),
    steps: [
      {
        text: '1. ' + t('layout.stepper.sections.tool.step1')!,
        onClick: () => changeStep(HOME_STEPS.STEP_TOOL_1),
      },
      {
        text: '2. ' + t('layout.stepper.sections.tool.step2')!,
        onClick: () => changeStep(HOME_STEPS.STEP_TOOL_2),
      },
      {
        text: '3. ' + t('layout.stepper.sections.tool.step3')!,
        onClick: () => changeStep(HOME_STEPS.STEP_TOOL_3),
      },
    ],
  },
  {
    title: t('layout.stepper.sections.next.title'),
    steps: [
      {
        text: t('layout.stepper.sections.next.step1')!,
        onClick: () => changeStep(HOME_STEPS.STEP_NEXT_PRICING),
      },
      {
        text: t('layout.stepper.sections.next.step2')!,
        onClick: () => changeStep(HOME_STEPS.STEP_NEXT_TRANSITION),
      },
    ],
  },
];
