/**
 * Preview mode: when the Solid app is loaded inside an iframe from the
 * manager with `?preview=1` in the URL, we bypass the normal
 * localStorage/Hubspot flow and read the current step + variables
 * directly from the query string.
 *
 * URL shape:
 *   http://localhost:3100/?preview=1&step=STEP_TOOL_1&personWhoHandleCalls=secretary&isInGroup=true
 */

import type { IntroSchemaType } from '../context/HomeContext';
import type { HOME_STEPS_KEYS } from './HomeSteps';

export interface PreviewParams {
  step: HOME_STEPS_KEYS;
  data: Partial<IntroSchemaType>;
  /** When true, the renderer shows a single placeholder block instead of a full chapter. */
  isolated: boolean;
  isolatedBlockId?: string;
  isolatedBlockType?: string;
}

const RESERVED_KEYS = new Set([
  'preview',
  'step',
  'isolated',
  'isolatedBlockId',
  'isolatedBlockType',
  '_n',
]);

export function getPreviewParams(): PreviewParams | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') !== '1') return null;

  const step = (params.get('step') ?? 'STEP_TOOL_1') as HOME_STEPS_KEYS;
  const isolated = params.get('isolated') === '1';
  const isolatedBlockId = params.get('isolatedBlockId') ?? undefined;
  const isolatedBlockType = params.get('isolatedBlockType') ?? undefined;

  const data: Record<string, unknown> = {};
  params.forEach((value, key) => {
    if (RESERVED_KEYS.has(key)) return;
    if (value === 'true') data[key] = true;
    else if (value === 'false') data[key] = false;
    else if (value === 'null' || value === '') return;
    else if (!isNaN(Number(value)) && value.trim() !== '') data[key] = Number(value);
    else data[key] = value;
  });

  return {
    step,
    data: data as Partial<IntroSchemaType>,
    isolated,
    isolatedBlockId,
    isolatedBlockType,
  };
}

export function isPreviewMode(): boolean {
  return getPreviewParams() !== null;
}
