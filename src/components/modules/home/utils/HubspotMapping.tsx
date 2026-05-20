import { PERSON_WHO_HANDLE_CALLS } from '../context/HomeContext';
import { applyDemoToHubspotDynamic, applyHubspotToDemoDynamic, DynamicHubspotMapping } from './dynamicHubspotMapping';
import { HOME_STEPS } from './HomeSteps';

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export interface HubspotObject {
  poste?:
    | 'Médecin généraliste'
    | 'Médecin spécialiste'
    | 'Autre soignant'
    | 'Non soignant'
    | 'Secrétaire'
    | 'Remplaçant';
  medecin_de_suivi__?: boolean | string;
  mode_installation?: 'Seul' | 'Groupe' | 'Non' | 'Nouvelle installation';
  nouveaux_patients__?: boolean | string;
  vad__?: boolean | string;
  current_solution?:
    | "J'ai délégué les appels à une télésecrétaire"
    | 'Je les gère moi-même'
    | "J'ai embauché une secrétaire"
    | 'other';
  besoin?: string;
  etape_adv?:
    | 'START'
    | 'INTRO'
    | 'CONSTAT'
    | 'TOOL_BOX_1'
    | 'TOOL_BOX_2'
    | 'TOOL_BOX_3'
    | 'PRICING'
    | 'TRANSITION'
    | 'END';
  questions_boite_a_outils_section_1?: string;
  questions_boite_a_outils_section_2?: string;
  questions_boite_a_outils_section_3?: string;
  origine_adv?: string;
}

export interface DemoObject {
  isDoctor?: boolean;
  isDoingVAD?: boolean;
  isInGroup?: boolean;
  acceptNewPatient?: boolean;
  personWhoHandleCalls?: PERSON_WHO_HANDLE_CALLS;
  questionsStep1?: string;
  questionsStep2?: string;
  questionsStep3?: string;
  CURRENT_STEP?: HOME_STEPS;
  origine_adv?: string;
}

export const HubspotObjectToDemoObject = (data: HubspotObject) => {
  const result: DemoObject = {};

  for (const entry of Object.entries(data) as Entries<HubspotObject>) {
    const [key, value] = entry;

    switch (key) {
      case 'poste':
        result.isDoctor = value === 'Médecin généraliste';
        break;

      case 'mode_installation':
        if (value === 'Seul') {
          result.isInGroup = false;
        }

        if (value === 'Groupe') {
          result.isInGroup = true;
        }
        break;

      case 'nouveaux_patients__':
        result.acceptNewPatient = value === 'true' || value === true;
        break;

      case 'vad__':
        result.isDoingVAD = value === 'true' || value === true;
        break;

      case 'current_solution':
        if (value === "J'ai délégué les appels à une télésecrétaire") {
          result.personWhoHandleCalls = PERSON_WHO_HANDLE_CALLS['REMOTE-SECRETARY'];
        }

        if (value === 'Je les gère moi-même') {
          result.personWhoHandleCalls = PERSON_WHO_HANDLE_CALLS.DOCTOR;
        }

        if (value === "J'ai embauché une secrétaire") {
          result.personWhoHandleCalls = PERSON_WHO_HANDLE_CALLS.SECRETARY;
        }
        break;

      case 'etape_adv':
        switch (value) {
          case 'START':
            result.CURRENT_STEP = HOME_STEPS.PRESENTATION;
            break;
          case 'INTRO':
            result.CURRENT_STEP = HOME_STEPS.INTRO;
            break;
          case 'CONSTAT':
            result.CURRENT_STEP = HOME_STEPS.STEP_OBSERVATION;
            break;
          case 'TOOL_BOX_1':
            result.CURRENT_STEP = HOME_STEPS.STEP_TOOL_1;
            break;
          case 'TOOL_BOX_2':
            result.CURRENT_STEP = HOME_STEPS.STEP_TOOL_2;
            break;
          case 'TOOL_BOX_3':
            result.CURRENT_STEP = HOME_STEPS.STEP_TOOL_3;
            break;
          case 'PRICING':
            result.CURRENT_STEP = HOME_STEPS.STEP_NEXT_PRICING;
            break;
          case 'TRANSITION':
            result.CURRENT_STEP = HOME_STEPS.STEP_NEXT_TRANSITION;
            break;
          case 'END':
            result.CURRENT_STEP = HOME_STEPS.END;
            break;
        }
        break;

      case 'questions_boite_a_outils_section_1':
        result.questionsStep1 = value;
        break;

      case 'questions_boite_a_outils_section_2':
        result.questionsStep2 = value;
        break;

      case 'questions_boite_a_outils_section_3':
        result.questionsStep3 = value;
        break;

      case 'origine_adv':
        result.origine_adv = value;
        break;
    }
  }

  return applyHubspotToDemoDynamic(
    data as Record<string, unknown>,
    result as Record<string, unknown>,
    _dynamicMappings,
  ) as DemoObject;
};

// Module-level cache of dynamic mappings, loaded once by HomeContext on init.
let _dynamicMappings: DynamicHubspotMapping[] = [];
export function setDynamicHubspotMappings(mappings: DynamicHubspotMapping[]) {
  _dynamicMappings = mappings;
}

export const DemoObjectToHubspotObject = (data: DemoObject) => {
  const result: HubspotObject = {};

  for (const entry of Object.entries(data) as Entries<DemoObject>) {
    const [key, value] = entry;

    switch (key) {
      case 'isDoctor':
        if (value) {
          result.poste = 'Médecin généraliste';
        }
        break;

      case 'isInGroup':
        result.mode_installation = value ? 'Groupe' : 'Seul';
        break;

      case 'acceptNewPatient':
        result.nouveaux_patients__ = value;
        break;

      case 'isDoingVAD':
        result.vad__ = value;
        break;

      case 'personWhoHandleCalls':
        switch (value) {
          case PERSON_WHO_HANDLE_CALLS['REMOTE-SECRETARY']:
            // eslint-disable-next-line prettier/prettier
            result.current_solution = "J'ai délégué les appels à une télésecrétaire";
            break;

          case PERSON_WHO_HANDLE_CALLS.DOCTOR:
            result.current_solution = 'Je les gère moi-même';
            break;

          case PERSON_WHO_HANDLE_CALLS.SECRETARY:
            // eslint-disable-next-line prettier/prettier
            result.current_solution = "J'ai embauché une secrétaire";
            break;
        }
        break;

      case 'CURRENT_STEP':
        switch (value) {
          case HOME_STEPS.PRESENTATION:
            result.etape_adv = 'START';
            break;
          case HOME_STEPS.INTRO:
            result.etape_adv = 'INTRO';
            break;
          case HOME_STEPS.STEP_OBSERVATION:
            result.etape_adv = 'CONSTAT';
            break;
          case HOME_STEPS.STEP_TOOL_1:
            result.etape_adv = 'TOOL_BOX_1';
            break;
          case HOME_STEPS.STEP_TOOL_2:
            result.etape_adv = 'TOOL_BOX_2';
            break;
          case HOME_STEPS.STEP_TOOL_3:
            result.etape_adv = 'TOOL_BOX_3';
            break;
          case HOME_STEPS.STEP_NEXT_PRICING:
            result.etape_adv = 'PRICING';
            break;
          case HOME_STEPS.STEP_NEXT_TRANSITION:
            result.etape_adv = 'TRANSITION';
            break;
          case HOME_STEPS.END:
            result.etape_adv = 'END';
            break;
        }
        break;

      case 'questionsStep1':
        result.questions_boite_a_outils_section_1 = value;
        break;

      case 'questionsStep2':
        result.questions_boite_a_outils_section_2 = value;
        break;

      case 'questionsStep3':
        result.questions_boite_a_outils_section_3 = value;
        break;

      case 'origine_adv':
        result.origine_adv = value;
        break;
    }
  }

  return applyDemoToHubspotDynamic(
    data as Record<string, unknown>,
    result as Record<string, unknown>,
    _dynamicMappings,
  ) as HubspotObject;
};
