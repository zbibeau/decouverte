/**
 * RGPD / consent configuration for the public parcours front.
 *
 * ⚠️ À REMPLACER par ton équipe / ton conseil juridique.
 * Ce fichier ne fournit que des PLACEHOLDERS techniques — il ne constitue
 * PAS un avis juridique. Avant la mise en production, renseigne :
 *   - `PRIVACY_POLICY_URL` : l'URL réelle de ta politique de confidentialité.
 *   - `CONSENT_NOTICE`     : la mention de consentement exacte, validée
 *                            juridiquement (finalité, responsable de
 *                            traitement, droits, durée de conservation…).
 *
 * Mets `CONSENT_ENABLED` à `false` pour désactiver complètement la case
 * (par ex. sur un parcours qui ne collecte aucune donnée personnelle).
 */
export const CONSENT_ENABLED = true;

/** ⚠️ À REMPLACER par l'URL réelle de ta politique de confidentialité. */
export const PRIVACY_POLICY_URL = 'https://VOTRE-DOMAINE/politique-de-confidentialite';

/** ⚠️ À REMPLACER par ta mention RGPD validée (placeholder neutre ci-dessous). */
export const CONSENT_NOTICE =
  "[À REMPLACER] En continuant, j'accepte que mes réponses soient traitées par MadeForMed " +
  'pour personnaliser ce parcours et, le cas échéant, être recontacté(e).';

export const CONSENT_LINK_TEXT = 'Politique de confidentialité';

/** localStorage key — mémorise le consentement pour ne le demander qu'une fois par visiteur. */
export const CONSENT_STORAGE_KEY = 'PARCOURS-RGPD-CONSENT';
