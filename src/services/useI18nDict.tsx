import { RosettyReturn } from 'rosetty';
import { Accessor, createMemo } from 'solid-js';

import { useI18n } from '../lang/useI18n';

type tDict = <R>(
  dicts: Record<string, R>,
) => Accessor<(t: Parameters<RosettyReturn<R>['t']>['0'], data?: Record<string, any>) => string | undefined>;

//@ts-ignore
export const useI18nDict: tDict = (dicts) => {
  const i18n = useI18n();

  const t = createMemo(
    () => (key: Parameters<RosettyReturn<typeof dicts>['t']>['0'], data?: Record<string, any>) =>
      //@ts-ignore
      i18n().t(key, data, dicts),
  );

  return t;
};
