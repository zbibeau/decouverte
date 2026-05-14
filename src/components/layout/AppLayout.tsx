import { Accessor, Component, JSX } from 'solid-js';

import { HOME_STEPS_KEYS } from '../modules/home/utils/HomeSteps';

export const AppLayout: Component<{
  children: JSX.Element;

  currentStep: Accessor<HOME_STEPS_KEYS>;
  setCurrentStep: (step: HOME_STEPS_KEYS) => void;

  mostAdvancedStep: Accessor<HOME_STEPS_KEYS>;
}> = (props) => {
  return <>{props.children}</>;
};
