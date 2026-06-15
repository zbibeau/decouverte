import cx from 'classix';
import type { JSX } from 'solid-js';

/**
 * Bouton de la peau moderne — primitive de marque.
 *
 * Volontairement **séparé** du `Button` legacy de l'app : ce dernier
 * supporte 6 variants + 5 tailles + icons via classes prefixes (icon
 * font-based), tout est imbriqué via `splitProps`. Le bouton du
 * handoff a un look différent (radius 14-18px, ombre teintée
 * `shadow-cta`, dégradé hero violet → primary-600 selon variant) et
 * vit dans un sous-ensemble de l'app (hero, étapes parcours, finale,
 * sidebar). Faire évoluer le Button legacy aurait risqué des
 * régressions sur tout le reste de l'app (story video, formulaires
 * admin, etc.).
 *
 * Variants :
 *   - `primary` (défaut) — fond `primary-600`, texte blanc, `shadow-cta`.
 *     Le « Continuer → », « C'est parti → », « Choisir une offre → ».
 *   - `whiteOnViolet` — fond blanc, texte `primary-600`. CTA principal
 *     sur fond violet (hero « Commencer la visite → », fin « Prenez un
 *     rendez-vous »).
 *   - `ghostOnViolet` — transparent, bord blanc/55, texte blanc. CTA
 *     secondaire sur fond violet (« Voir le sommaire », « Partagez
 *     cette découverte »).
 *   - `ghostLight` — fond `primary-50`, texte `primary-600`, bord
 *     `primary-200`. Utilité : boutons secondaires sur fond clair
 *     (sidebar footer « Partagez », etc.).
 *
 * Le bouton accepte enfants libres (texte + flèche) — la flèche
 * n'est pas auto-injectée pour garder le caller en contrôle (parfois
 * « → », parfois rien).
 */
type Variant = 'primary' | 'whiteOnViolet' | 'ghostOnViolet' | 'ghostLight';

export function BrandButton(props: {
  children: JSX.Element;
  variant?: Variant;
  /** `lg` = h-12 (mobile CTA). `md` = h-10 (sidebar, secondary). */
  size?: 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>;
  /** Largeur pleine — utile pour les CTAs hero/finaux bottom-anchored. */
  block?: boolean;
  class?: string;
  ariaLabel?: string;
}) {
  const variant = () => props.variant ?? 'primary';
  const size = () => props.size ?? 'lg';
  return (
    <button
      type={props.type ?? 'button'}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={props.ariaLabel}
      class={cx(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Radius signature 14-18px → rounded-2xl ≈ 16px.
        'rounded-2xl',
        // Variants.
        variant() === 'primary' && 'bg-primary-600 text-white shadow-cta hover:bg-primary-700 active:bg-primary-800',
        variant() === 'whiteOnViolet' &&
          'bg-white text-primary-600 shadow-cta hover:bg-primary-50 active:bg-primary-100',
        variant() === 'ghostOnViolet' &&
          'border-2 border-white/55 bg-transparent text-white backdrop-blur-sm hover:bg-white/10 active:bg-white/15',
        variant() === 'ghostLight' &&
          'border border-primary-200 bg-primary-50 text-primary-600 hover:bg-primary-100 active:bg-primary-200',
        // Tailles.
        size() === 'lg' && 'h-12 px-5 text-[15px] tracking-tight',
        size() === 'md' && 'h-10 px-4 text-sm',
        // Bloc.
        props.block && 'w-full',
        props.class,
      )}
    >
      {props.children}
    </button>
  );
}
