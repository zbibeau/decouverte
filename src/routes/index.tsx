import { Accessor, Component, createEffect, createSignal, JSX, Suspense } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { AppLayout } from '../components/layout/AppLayout';
import { StepperLayout } from '../components/layout/StepperLayout';
import { MobileModal } from '../components/modules/home/components/MobileModal';
import { useHome } from '../components/modules/home/context/HomeContext';
import { HOME_STEPS_KEYS, HomeSteps } from '../components/modules/home/utils/HomeSteps';

/**
 * Display Demo page conditionnaly. Step are sync with localStorage.
 */
export default function Home() {
  const { currentStep, setCurrentStep, mostAdvancedStep } = useHome();

  return (
    <main>
      <LayoutHome currentStep={currentStep} setCurrentStep={setCurrentStep} mostAdvancedStep={mostAdvancedStep}>
        <HomeSteps currentStep={currentStep} setCurrentStep={setCurrentStep} />
      </LayoutHome>
    </main>
  );
}

/**
 * Renders the home layout component.
 */
const LayoutHome = (props: {
  children: JSX.Element;
  currentStep: Accessor<HOME_STEPS_KEYS>;
  setCurrentStep: (step: HOME_STEPS_KEYS) => void;
  mostAdvancedStep: Accessor<HOME_STEPS_KEYS>;
}) => {
  const [layout, setLayout] = createSignal<Component<any>>(AppLayout);

  createEffect(() => {
    if (props.currentStep()?.startsWith('STEP')) {
      setLayout(() => StepperLayout);
      return;
    }

    setLayout(() => AppLayout);
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
