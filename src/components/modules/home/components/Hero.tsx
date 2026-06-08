import cx from 'classix';
import { Component, JSX, Show } from 'solid-js';

import { isLayoutMobileDisplay } from '../../../layout/StepperLayout';
import { Text } from '../../../primitives/Text';
import { Title } from '../../../primitives/Title';

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

const HeroNumber = (props: { number?: number }) => {
  return (
    <div
      class={cx(
        'flex rotate-[-4deg] items-center justify-center rounded-xl bg-primary-900 font-medium text-white',
        // Direction B : ombre portée douce sous le badge.
        'shadow-[0_14px_26px_-10px_rgba(40,10,80,0.65)]',
        'h-[60px] w-[60px] text-4xl',
      )}
    >
      <Show when={props.number} fallback={<i class="brand icon-brand-icon block size-8 bg-white" />}>
        <div>{props.number}</div>
      </Show>
    </div>
  );
};

/**
 * HeroTitle — Direction B + photo.
 *
 * AJOUT par rapport à l'existant :
 *   • props.image / props.imageAlt → photo affichée dans une carte arrondie à
 *     droite. Aucun calque par-dessus la photo : juste la position + l'habillage
 *     (rayon, ombre, liseré, léger tilt). Sans `image`, comportement actuel.
 *
 * Le bloc média reste masqué sur mobile (comme aujourd'hui). Pour l'afficher
 * sur mobile aussi, retirer `isMobileDisplay() && 'hidden'` ci-dessous.
 */
export const HeroTitle: Component<{
  children?: JSX.Element;
  sectionTitle?: string;
  number?: number;
  title: string;
  /** Photo affichée dans la carte de droite (Direction B). */
  image?: string;
  /** Texte alternatif de la photo. */
  imageAlt?: string;
}> = (props) => {
  const isMobileDisplay = isLayoutMobileDisplay();

  return (
    <Hero class="bg-purple-400">
      <div class="m-auto flex size-full flex-col items-center justify-center gap-6 px-[5%] md:flex-row md:justify-between md:gap-[4%] md:pl-[7%] md:pr-0">
        <div class="max-w-[330px] space-y-4 md:max-w-[430px]">
          <Show when={props.sectionTitle}>
            <Title variant="h6" tag="h2" isUppercase class="text-purple-900">
              {props.sectionTitle}
            </Title>
          </Show>
          <HeroNumber number={props.number} />
          <div>
            <Text variant="5xl" class="leading-[48px] text-white">
              {props.title}
            </Text>
          </div>
        </div>

        {/* Photo à droite : carte arrondie (Direction B). Aucun calque par-dessus. */}
        <Show when={props.image}>
          <div
            class={cx(
              'relative aspect-[4/5] w-[46%] max-w-[560px] self-center overflow-hidden rounded-[28px]',
              'shadow-[0_40px_80px_-30px_rgba(40,10,80,0.7)] ring-1 ring-white/25',
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
