import { APIEvent } from '@solidjs/start/server';

import { CUSTOM_COMPONENTS_META } from '../../components/modules/home/renderer/customComponents.meta';

/**
 * Returns the list of custom Solid components registered in
 * `customComponents.tsx`. Used by the Next.js manager to populate the
 * `componentRef` block dropdown without duplicating the registry.
 *
 * CORS is open because the manager runs on a different origin (localhost:3200).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

export function GET(_event: APIEvent) {
  return new Response(JSON.stringify(CUSTOM_COMPONENTS_META), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function OPTIONS(_event: APIEvent) {
  return new Response(null, { status: 204, headers: corsHeaders });
}
