# Sujets à réaborder plus tard

## HubSpot — mapping dynamique des variables
**Statut** : infrastructure en place (migration 0014, helpers Solid, UI manager) mais pas validé end-to-end.

**À reprendre**
- Tester le flow complet : créer une variable custom avec `hubspot_mapping`, vérifier dans Supabase, recharger l'app Solid, confirmer que la valeur arrive dans Hubspot via `DemoObjectToHubspotObject`
- Ajouter un feedback visuel (toast "✅ enregistré") sur le bouton Enregistrer de `/variables`
- Ajouter une page debug ou un endpoint qui liste les mappings dynamiques actifs
- Valider qu'une variable HS inexistante ne fait pas planter le sync (côté Hubspot API)
- Décider du comportement si une variable legacy hardcodée ET une dynamique pointent sur la même property HS (actuellement : la dynamique écrase la legacy car appliquée en dernier)
- Documenter pour l'équipe : "comment ajouter une nouvelle variable Hubspot sans toucher au code"

**Fichiers concernés**
- `supabase/migrations/0014_variable_hubspot_mapping.sql`
- `src/components/modules/home/utils/dynamicHubspotMapping.ts`
- `src/components/modules/home/utils/HubspotMapping.tsx` (merge dynamique en fin de fonctions)
- `src/components/modules/home/context/HomeContext.tsx` (hydratation au boot)
- `manager/lib/actions.ts` → `updateVariableHubspotMapping`
- `manager/app/(app)/parcours/[slug]/variables/page.tsx`
