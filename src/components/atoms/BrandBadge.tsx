import cx from 'classix';
import type { JSX } from 'solid-js';

/**
 * Badge incliné « MadeForMed » — primitive de marque de la peau moderne.
 *
 * Carré arrondi tilté à `-4deg`, ombre teintée violet (`shadow-badge`).
 * Présent sur la présentation (✦ sommet), chaque étape outil (numéro
 * d'étape), et l'écran de fin (médaillon ✓).
 *
 * Variants `tone` :
 *   - `dark` (par défaut) — fond `primary-900`, contenu blanc. Cas
 *     standard pour les numéros d'étape et le badge ✦ hero.
 *   - `light` — fond blanc, contenu `primary-600`. Cas du médaillon de
 *     fin (« VISITE TERMINÉE → ✓ » blanc sur dégradé violet).
 *
 * Tailles via `size` :
 *   - `sm` (38px) — sommaire repliable ou mini-state.
 *   - `md` (54px, défaut) — badge ✦ hero / badge numéro standard.
 *   - `lg` (84px) — médaillon de fin (CompletionCelebration).
 *
 * Reçoit du contenu libre (numéro, ✓, ✦, icône Solid). Le tilt et la
 * shadow sont gérés ici — le caller passe juste le contenu.
 */
export function BrandBadge(props: {
  children: JSX.Element;
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  /** Désactive le tilt pour les contextes où il dérange (rare). */
  noTilt?: boolean;
}) {
  const tone = () => props.tone ?? 'dark';
  const size = () => props.size ?? 'md';
  return (
    <span
      class={cx(
        'inline-flex shrink-0 select-none items-center justify-center font-bold',
        // Tilt signature de la marque — peut être désactivé via noTilt.
        !props.noTilt && '-rotate-[4deg]',
        // Ombre teintée violet.
        'shadow-badge',
        // Tons.
        tone() === 'dark' ? 'bg-primary-900 text-white' : 'bg-white text-primary-600',
        // Tailles + rayons proportionnés (14-17px sur md, 20px sur lg).
        size() === 'sm' && 'h-[38px] w-[38px] rounded-[12px] text-base',
        size() === 'md' && 'h-[54px] w-[54px] rounded-[14px] text-xl',
        size() === 'lg' && 'h-[84px] w-[84px] rounded-[20px] text-3xl',
        props.class,
      )}
    >
      {props.children}
    </span>
  );
}
