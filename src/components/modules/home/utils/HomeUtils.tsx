import { tI18n } from '../../../../lang/useI18n';
import type { NavGroupData } from '../../../organisms/NavGroup';
import type { ChapterStub } from '../renderer/loadChapter';
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

/**
 * Build the left-sidebar stepper data dynamically from the chapter list of
 * the current parcours. Chapters with the same `sectionLabel` are grouped;
 * chapters without one go to an ungrouped section (no header).
 *
 * Returns `{ data, actualStep }` where `actualStep` matches the NavGroup
 * format `"sectionIdx+1.chapterIdx+1"` so the existing NavGroup highlight
 * logic works unchanged.
 *
 * When no chapter carries a `sectionLabel`, the stepper still works as a
 * flat list (one ungrouped section). The caller can decide whether to
 * fall back to the legacy hardcoded `HOME_SECTIONS_DATA` instead.
 */
export function buildDynamicSections(
  chapters: ChapterStub[],
  currentSlug: string | undefined,
  setStepBySlug: (slug: string) => void,
): { data: NavGroupData; actualStep?: string } {
  // Preserve the order in which sections first appear.
  const groupOrder: (string | null)[] = [];
  const groups = new Map<string | null, ChapterStub[]>();
  for (const c of chapters) {
    const key = c.sectionLabel && c.sectionLabel.trim() !== '' ? c.sectionLabel : null;
    if (!groups.has(key)) {
      groups.set(key, []);
      groupOrder.push(key);
    }
    groups.get(key)!.push(c);
  }
  // Sort within a section by sectionOrder NULLS LAST, then chapter.order.
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const ao = a.sectionOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.sectionOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.order - b.order;
    });
  }

  const data: NavGroupData = groupOrder.map((key) => ({
    title: key ?? undefined,
    steps: groups.get(key)!.map((c) => ({
      text: c.title,
      onClick: () => setStepBySlug(c.slug),
    })),
  }));

  // Compute actualStep "X.Y" from the current slug.
  let actualStep: string | undefined;
  groupOrder.forEach((key, gi) => {
    const items = groups.get(key)!;
    items.forEach((c, si) => {
      if (c.slug === currentSlug) actualStep = `${gi + 1}.${si + 1}`;
    });
  });

  return { data, actualStep };
}
