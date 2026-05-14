import { RosettyReturn } from 'rosetty';
import { useRosetty } from 'rosetty-solid';

import { frI18n } from './fr';

export const useI18n = () => {
  return useRosetty<typeof frI18n>(); //Enable autocompletion base on you translation file
};

export type tI18n = RosettyReturn<typeof frI18n>['t'];
