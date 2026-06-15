import { JSX } from 'solid-js';

import { useI18n } from '../../../../lang/useI18n';

/**
 * KeyPointsCard — refonte « moderne » (handoff Lot 4 §4 Constat
 * + §5-7 Outils).
 *
 * Avant : Card avec ombre douce + header « 💡 LES POINTS CLÉS » via
 * Icon lightbulb-fill et Title h5. Hérité du design legacy.
 *
 * Après : section légère sans Card boxée :
 *   - Eyebrow « LES POINTS CLÉS » en small caps `primary-500`
 *     tracking-wide 0.14em (handoff §Typographie « Kicker »).
 *   - Pas de carte / ombre — le wrapper Card alourdissait visuellement
 *     une section qui n'a que 2 lignes de check. La maquette
 *     `04-constat.png` montre une liste plate.
 *   - L'enfant (le contenu des points) gère son propre layout.
 *   - `hideHeader` conservé pour rétrocompat (cas nesté).
 */
export const KeyPointsCard = (props: { children: JSX.Element; hideHeader?: boolean }) => {
  const i18n = useI18n();

  return (
    <div class="space-y-3">
      {!props.hideHeader && (
        <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-500">
          {i18n().t('components.modules.home.sections.keyPoints')}
        </p>
      )}

      {props.children}
    </div>
  );
};
