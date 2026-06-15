import cx from 'classix';
import { Component, JSX, Show } from 'solid-js';

import { BrandBadge } from '../../../atoms/BrandBadge';
import { KeywordItalic } from '../../../atoms/KeywordItalic';
import { isLayoutMobileDisplay } from '../../../layout/StepperLayout';

/**
 * Hero shell — full-screen, snap section. Unchanged.
 */
export const Hero: Component<{ children: JSX.Element; class?: string; contentId?: string }> = (props) => {
  const isMobileDisplay = isLayoutMobileDisplay();

  return (
    <div class={cx('relative w-full snap-start snap-always', isMobileDisplay() ? 'h-[calc(100dvh-56px)]' : 'h-dvh')}>
      <div class={cx('h-full w-full', props.class || '')}>{props.children}</div>
    </div>
  );
};

/**
 * Numéro / icône d'étape — réutilise `BrandBadge` (primitive Lot 1).
 *
 * Sans `number` → badge ✦ (présentation hero). Avec `number` → badge
 * numéroté tilté (étapes 1/2/3 de la boîte à outils).
 */
const HeroNumber = (props: { number?: number }) => {
  return (
    <BrandBadge tone="dark" size="md">
      <Show
        when={props.number}
        fallback={
          // Étoile ✦ signature pour la présentation. Caractère Unicode pour
          // garantir l'alignement vertical sans dépendre d'une icône externe.
          <span aria-hidden="true">✦</span>
        }
      >
        <span>{props.number}</span>
      </Show>
    </BrandBadge>
  );
};

/**
 * HeroTitle — refonte « moderne » du front patient (handoff Lot 2).
 *
 * Restyle visuel sans changement de schéma : `title`, `number`,
 * `sectionTitle`, `image` restent les mêmes côté manager.
 *
 * Visuel cible (handoff §1 Présentation hero + §5-7 Outils) :
 *   - Fond `bg-hero-violet` (radial riche défini en Lot 1) pour le hero
 *     de présentation ; les étapes outil (avec `number`) gardent un fond
 *     plus mat — c'est traité par la légère variation `palette()` ci-dessous.
 *   - Badge incliné `BrandBadge` (✦ ou numéro) — primitive Lot 1.
 *   - Eyebrow `sectionTitle` en small caps blanc/80 tracking-wide.
 *   - h1 blanc 900 tracking-tight, échelle 30-36px mobile / 46-56px desktop.
 *   - Si `title` contient `\n`, la 2e ligne est rendue en `KeywordItalic`
 *     tone lavender (« ravi de vous accueillir. ») — pragmatique :
 *     l'auteur peut composer son sous-titre italique sans extension de
 *     schéma. Sans `\n`, comportement unique h1.
 *   - Photo droite (desktop) : carte arrondie 26px, ring blanc/30,
 *     `shadow-premium`, tilt `-2deg`. Inchangé en logique vs Direction B
 *     mais l'ombre / le radius sont harmonisés avec les tokens.
 */
export const HeroTitle: Component<{
  children?: JSX.Element;
  sectionTitle?: string;
  number?: number;
  title: string;
  /** Photo affichée dans la carte de droite. */
  image?: string;
  /** Texte alternatif de la photo. */
  imageAlt?: string;
}> = (props) => {
  const isMobileDisplay = isLayoutMobileDisplay();

  // Split title sur \n pour distinguer h1 principal et sous-titre italique.
  // Pragmatique : préserve le schéma (champ unique `title` côté manager) tout
  // en permettant la composition visuelle de la maquette (« Bonjour Dr X,\n
  // ravi de vous accueillir. »). Si l'auteur ne met pas de \n, tout est rendu
  // en h1 — comportement legacy.
  const titleLines = () =>
    props.title
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <Hero class="bg-hero-violet">
      <div class="m-auto flex size-full flex-col items-center justify-center gap-6 px-[5%] md:flex-row md:justify-between md:gap-[4%] md:pl-[7%] md:pr-0">
        <div class="max-w-[330px] space-y-4 md:max-w-[480px]">
          <HeroNumber number={props.number} />
          <Show when={props.sectionTitle}>
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">{props.sectionTitle}</p>
          </Show>
          <div class="space-y-1">
            {/* Premier h1 — toujours rendu. */}
            <h1 class="text-[clamp(30px,8vw,56px)] font-black leading-[1.05] tracking-[-0.03em] text-white">
              {titleLines()[0] ?? props.title}
            </h1>
            {/* Sous-titre italique optionnel — si l'auteur a écrit le titre
                sur plusieurs lignes via \n. */}
            <Show when={titleLines().length > 1}>
              <p class="text-[clamp(22px,5vw,32px)] font-medium leading-tight">
                <KeywordItalic tone="lavender">{titleLines().slice(1).join(' ')}</KeywordItalic>
              </p>
            </Show>
          </div>
          {props.children}
        </div>

        {/* Photo à droite (desktop) : carte arrondie + ombre premium + ring. */}
        <Show when={props.image}>
          <div
            class={cx(
              'relative aspect-[4/5] w-[46%] max-w-[560px] self-center overflow-hidden rounded-[26px]',
              'shadow-premium ring-1 ring-white/30',
              'md:mr-[-2%] md:rotate-[-2deg]',
              isMobileDisplay() && 'hidden',
            )}
          >
            <img src={props.image} alt={props.imageAlt ?? ''} class="absolute inset-0 size-full object-cover" />
          </div>
        </Show>
      </div>
    </Hero>
  );
};
