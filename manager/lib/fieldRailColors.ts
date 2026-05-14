/**
 * Maps the `data-field-rail` keys emitted by the Solid renderer to the
 * colours used by the matching `<Section accentColor>` in the editor.
 *
 * Source of truth: the colour decisions live here in the manager, the Solid
 * side only emits the rail keys (it doesn't know about colours).
 *
 * Conventions :
 *   rose   #f43f5e — titre/sous-titre (Section accentColor="rose")
 *   amber  #f59e0b — bloc avantages / groupes (accentColor="amber")
 *   emerald#10b981 — vidéo (accentColor="green")
 *   violet #8b5cf6 — sous-blocs/children/exception (accentColor="purple")
 *   sky    #0ea5e9 — questions FAQ (accentColor="sky")
 *   slate  #64748b — divers/form fields (accentColor="slate")
 */
export const FIELD_RAIL_COLORS: Record<string, string> = {
  // toolContentSection — already in place
  title: '#f43f5e',
  video: '#10b981',
  advantages: '#f59e0b',
  children: '#8b5cf6',

  // keyPointsCard
  subtitle: '#f43f5e',
  groups: '#f59e0b',
  exception: '#8b5cf6',

  // faqCard
  questions: '#0ea5e9',

  // photoCarousel
  photos: '#f43f5e',

  // form
  fields: '#64748b',
};
