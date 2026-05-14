import { getSupabase } from '../../../../services/supabase';

/**
 * Shape of the `hubspot_mapping` JSON column on `public.variable`.
 * - `property` : name of the target Hubspot property
 * - `valueMap` : optional demo→hubspot value transform (enum / boolean labels).
 *                When missing, raw values are passed through.
 */
export interface DynamicHubspotMapping {
  variableKey: string;
  property: string;
  valueMap?: Record<string, unknown>;
}

let cachedMappings: DynamicHubspotMapping[] | null = null;
let loadPromise: Promise<DynamicHubspotMapping[]> | null = null;

/**
 * Loads all variables of the given parcours that declare a `hubspot_mapping`.
 * Result is cached for the lifetime of the module.
 */
export async function loadDynamicHubspotMappings(parcoursSlug: string): Promise<DynamicHubspotMapping[]> {
  if (cachedMappings) return cachedMappings;
  if (loadPromise) return loadPromise;

  const supabase = getSupabase();
  if (!supabase) {
    cachedMappings = [];
    return cachedMappings;
  }

  loadPromise = (async () => {
    const { data: parcours } = await supabase
      .from('parcours')
      .select('id')
      .eq('slug', parcoursSlug)
      .maybeSingle();
    if (!parcours?.id) return [];

    const { data } = await supabase
      .from('variable')
      .select('key, hubspot_mapping')
      .eq('parcours_id', parcours.id)
      .not('hubspot_mapping', 'is', null);

    const mappings: DynamicHubspotMapping[] = (data ?? [])
      .filter((row: { hubspot_mapping: unknown }) => row.hubspot_mapping && typeof row.hubspot_mapping === 'object')
      .map((row: { key: string; hubspot_mapping: { property?: string; valueMap?: Record<string, unknown> } }) => ({
        variableKey: row.key,
        property: row.hubspot_mapping.property ?? row.key,
        valueMap: row.hubspot_mapping.valueMap,
      }))
      .filter((m) => !!m.property);

    cachedMappings = mappings;
    return mappings;
  })();

  return loadPromise;
}

/** For tests / hot-reload. */
export function resetDynamicHubspotMappingsCache() {
  cachedMappings = null;
  loadPromise = null;
}

/** Apply the dynamic mappings demo→hubspot onto an existing hubspot payload (mutates a copy). */
export function applyDemoToHubspotDynamic(
  demo: Record<string, unknown>,
  hubspot: Record<string, unknown>,
  mappings: DynamicHubspotMapping[],
): Record<string, unknown> {
  const out = { ...hubspot };
  for (const m of mappings) {
    if (!(m.variableKey in demo)) continue;
    const raw = demo[m.variableKey];
    if (raw === undefined) continue;
    const mapped = m.valueMap ? (m.valueMap[String(raw)] ?? raw) : raw;
    out[m.property] = mapped;
  }
  return out;
}

/** Apply the dynamic mappings hubspot→demo onto an existing demo payload (mutates a copy). */
export function applyHubspotToDemoDynamic(
  hubspot: Record<string, unknown>,
  demo: Record<string, unknown>,
  mappings: DynamicHubspotMapping[],
): Record<string, unknown> {
  const out = { ...demo };
  for (const m of mappings) {
    if (!(m.property in hubspot)) continue;
    const raw = hubspot[m.property];
    if (raw === undefined) continue;
    let mapped: unknown = raw;
    if (m.valueMap) {
      const inverted = Object.entries(m.valueMap).find(([, v]) => v === raw);
      if (inverted) mapped = inverted[0];
    }
    out[m.variableKey] = mapped;
  }
  return out;
}
