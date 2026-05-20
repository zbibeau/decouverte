/**
 * Pure metadata for the custom components registry — NO Solid component
 * imports here so this file can be loaded from the server-side API route
 * (`/api/custom-components`) without pulling in browser-only dependencies.
 *
 * To register a new custom component:
 *   1. Add an entry below.
 *   2. Add the matching `name → Component` mapping in `customComponents.tsx`.
 *
 * Both files share the same `name` strings; mismatches will surface as
 * console warnings at render time.
 */

export interface CustomComponentMeta {
  name: string;
  description: string;
}

export const CUSTOM_COMPONENTS_META: CustomComponentMeta[] = [
  {
    name: 'HomeTool1_Summary',
    description: 'Récapitulatif interactif du chapitre Outil 1 (formulaire + actions)',
  },
  {
    name: 'HomeTool2_Summary',
    description: 'Bilan visuel du chapitre Outil 2 (agenda) : cartes icônes + QuestionsBox + stepper',
  },
  {
    name: 'HomeEndBody',
    description: 'Écran final "Merci !" avec diagramme + bouton retour vers STEP_OBSERVATION',
  },
  {
    name: 'HomeTransitionBody',
    description: 'Corps bespoke STEP_NEXT_TRANSITION : infos "tout inclus" + TakeAppointment + bouton suivant → END',
  },
  {
    name: 'HomeOurPricingBody',
    description: 'Carte pricing interactive (calculateur nb médecins + partenaires + bandeau télésec conditionnel)',
  },
  {
    name: 'NextStepsRef',
    description: 'Stepper "Prochaines étapes" (navigation phase next). Prop : currentStep (1, 2 ou 3)',
  },
  {
    name: 'HomeTool3_Summary',
    description: 'Bilan visuel du chapitre Outil 3 (communication)',
  },
  {
    name: 'IntroFormFields',
    description:
      "Formulaire d'introduction (5 variables de branching) avec card éditable. Props : cardTitle, cardDescription, cardIcon, nextButtonText, loadingText, nextStep",
  },
  {
    name: 'PresentationBrandHeader',
    description: "Logo MadeForMed + sous-titre centré (chrome de l'écran d'accueil). Prop : subTitle",
  },
  {
    name: 'PresentationInlineVideo',
    description: 'Vidéo Vimeo inline arrondie (aspect 16/9, max-w-5xl). Prop : src ("vimeo/XXXXXX?hash=…")',
  },
  {
    name: 'PresentationNextButton',
    description: 'Bouton "Suivant" qui pousse au step suivant. Props : text, nextStep',
  },
  {
    name: 'DoctorToolboxStepsRef',
    description:
      'Stepper "Boîte à outils du médecin" (navigation vers STEP_TOOL_1/2/3). Prop : currentStep (1, 2 ou 3)',
  },
];
