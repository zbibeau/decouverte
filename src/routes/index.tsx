import { Accessor, Component, createEffect, createSignal, JSX, Suspense } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { AppLayout } from '../components/layout/AppLayout';
import { StepperLayout } from '../components/layout/StepperLayout';
import { MobileModal } from '../components/modules/home/components/MobileModal';
import { DEFAULT_PARCOURS_SLUG, useHome } from '../components/modules/home/context/HomeContext';
import { HOME_STEPS_KEYS, HomeSteps } from '../components/modules/home/utils/HomeSteps';

/**
 * Display Demo page conditionnaly. Step are sync with localStorage.
 */
export default function Home() {
  const { currentStep, setCurrentStep, mostAdvancedStep, parcoursSlug } = useHome();

  return (
    <main>
      <LayoutHome
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        mostAdvancedStep={mostAdvancedStep}
        parcoursSlug={parcoursSlug}
      >
        <HomeSteps currentStep={currentStep} setCurrentStep={setCurrentStep} />
      </LayoutHome>
    </main>
  );
}

/**
 * Renders the home layout component.
 *
 * Layout strategy :
 *   - Legacy `demo-ventes` parcours : keeps the historical behaviour where
 *     only `STEP_*` steps render the full StepperLayout (sidebar visible);
 *     `PRESENTATION` / `INTRO` / `END` stay on the bare AppLayout.
 *   - Any other parcours : always uses StepperLayout once a chapter has
 *     resolved. Custom parcours don't follow the hardcoded `STEP_` naming,
 *     so the legacy slug heuristic would hide the sidebar forever.
 */
const LayoutHome = (props: {
  children: JSX.Element;
  currentStep: Accessor<HOME_STEPS_KEYS>;
  setCurrentStep: (step: HOME_STEPS_KEYS) => void;
  mostAdvancedStep: Accessor<HOME_STEPS_KEYS>;
  parcoursSlug: Accessor<string>;
}) => {
  const [layout, setLayout] = createSignal<Component<any>>(AppLayout);

  createEffect(() => {
    const step = props.currentStep();
    const isLegacy = props.parcoursSlug() === DEFAULT_PARCOURS_SLUG;

    if (isLegacy) {
      // Demo-ventes : same rule as before — only STEP_* triggers the
      // stepper layout. PRESENTATION / INTRO / END keep the bare layout.
      if (step?.startsWith('STEP')) {
        setLayout(() => StepperLayout);
      } else {
        setLayout(() => AppLayout);
      }
      return;
    }

    // Custom parcours : as soon as we have a chapter to show, render the
    // StepperLayout so the sidebar is available. Falls back to AppLayout
    // only while the very first chapter is still loading (step empty).
    if (step) {
      setLayout(() => StepperLayout);
    } else {
      setLayout(() => AppLayout);
    }
  });

  return (
    <>
      <Suspense>
        <Dynamic
          component={layout()}
          setCurrentStep={props.setCurrentStep}
          currentStep={props.currentStep}
          mostAdvancedStep={props.mostAdvancedStep}
        >
          {props.children}
        </Dynamic>
        <MobileModal />
      </Suspense>
    </>
  );
};
