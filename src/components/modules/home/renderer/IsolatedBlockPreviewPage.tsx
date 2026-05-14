import { Component } from 'solid-js';

import { useHome } from '../context/HomeContext';
import { IsolatedBlockPreview } from './IsolatedBlockPreview';

/**
 * Client-only wrapper around `IsolatedBlockPreview`. Used by the
 * `/preview-block` route. Lives in its own file so the route can lazy-load it
 * via `clientOnly()` without dragging the full chapter renderer into SSR.
 */
const IsolatedBlockPreviewPage: Component<{ blockId: string; blockType: string }> = (props) => {
  const { setCurrentStep, currentStep, mostAdvancedStep } = useHome();

  return (
    <IsolatedBlockPreview
      // @ts-expect-error stepper props are unused in isolated mode
      setCurrentStep={setCurrentStep}
      currentStep={currentStep}
      mostAdvancedStep={mostAdvancedStep}
      blockId={props.blockId}
      blockType={props.blockType}
    />
  );
};

export default IsolatedBlockPreviewPage;
