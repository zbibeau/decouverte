import { Component } from 'solid-js';

import { DoctorToolboxStepsSection } from '../../components/DoctorToolboxSteps';
import { HOME_SECTION_PROPS } from '../../utils/HomeUtils';

/**
 * Thin wrapper exposing the tool-selection stepper (currentStep = 1|2|3).
 * Kept as a custom component because the component reads `HOME_STEPS` to
 * navigate — not representable as a generic block.
 */
export const DoctorToolboxStepsRef: Component<
  HOME_SECTION_PROPS & { currentStep?: number }
> = (props) => {
  return (
    <DoctorToolboxStepsSection
      currentStep={props.currentStep ?? 1}
      setCurrentStep={props.setCurrentStep}
    />
  );
};
