import cx from 'classix';
import { JSX, mergeProps, Show } from 'solid-js';

import { Icon } from '../atoms/Icon';

export enum NavItemStatus {
  default = 'default',
  back = 'back',
  active = 'active',
  done = 'done',
  disabled = 'disabled',
}

/**
 * NavItem — refonte « moderne » (handoff Lot 3 Sommaire).
 *
 * 3 états visuels (en plus de `back` / `disabled`) :
 *   - **done** : cercle 22px `bg-primary-600`, check blanc, rendu sur
 *     une carte blanche `shadow-card`. Étape terminée, on peut y revenir.
 *   - **active** : cercle 22px bord `primary-600` 2.5px + point central
 *     `primary-600`, fond de ligne `bg-primary-100` en surbrillance,
 *     label 700 `primary-950`. L'étape en cours, sticky-out.
 *   - **default** : cercle 22px `bg-primary-200`, label `violet-faint`
 *     (#9F8FB8). Étape à venir, accessible cliquable mais discrète.
 *   - **disabled** : même look que default + opacité 60%, curseur
 *     not-allowed.
 *
 * Refonte vs avant :
 *   - Palette unifiée `primary-*` (was `success-400` vert).
 *   - Les lignes verticales de jonction inter-items sont SUPPRIMÉES
 *     (handoff §3 ne les mentionne pas, la maquette `03-sommaire.png`
 *     n'en montre pas — la progression est matérialisée par les
 *     états done/active eux-mêmes, pas par un fil conducteur). Cela
 *     évite aussi le bug visuel où les lignes traversaient les
 *     headers de section.
 *   - Les props `previousIsDone` / `nextIsDone` restent dans la
 *     signature pour rétrocompat (consommé par NavGroup) mais ne sont
 *     plus utilisées dans le rendu.
 */
export const NavItem = (_props: {
  text: string;

  status?: NavItemStatus;
  /** Retenu pour rétrocompat NavGroup — plus utilisé dans le rendu. */
  previousIsDone?: boolean;
  /** Retenu pour rétrocompat NavGroup — plus utilisé dans le rendu. */
  nextIsDone?: boolean;

  isBold?: boolean;

  onClick?: JSX.EventHandler<unknown, MouseEvent>;
}) => {
  const props = mergeProps(
    {
      status: NavItemStatus.default,
    },
    _props,
  );

  return (
    <div
      class={cx(
        'flex items-center gap-3 rounded-xl py-2',
        // Done : carte blanche + ombre + padding horizontal pour matérialiser
        // la carte. Active : bandeau primary-100 highlighted (handoff §3).
        props.status === NavItemStatus.done && 'border-violet-border-soft bg-white px-2 shadow-card',
        props.status === NavItemStatus.active && '-mx-2 border-primary-200 bg-primary-100 px-2',
        props.onClick && props.status !== NavItemStatus.disabled && 'cursor-pointer',
        props.status === NavItemStatus.disabled && 'cursor-not-allowed',
        props.status === NavItemStatus.back && 'opacity-50',
      )}
      onClick={(e) => props.onClick && props.status !== NavItemStatus.disabled && props.onClick(e)}
    >
      {/* Nœud d'état — cercle 22px taillé selon le status. */}
      <div class="flex w-[22px] shrink-0 items-center justify-center">
        <Show when={props.status === NavItemStatus.default || props.status === NavItemStatus.disabled}>
          {/* À venir : cercle violet pâle, plein. */}
          <div class="h-[22px] w-[22px] rounded-full bg-primary-200" aria-hidden="true" />
        </Show>
        <Show when={props.status === NavItemStatus.back}>
          <Icon size="2xs" icon="icon icon-arrow-left" variant="whiteSecondary900" isTransparent />
        </Show>
        <Show when={props.status === NavItemStatus.active}>
          {/* En cours : bord primary-600 + point central. */}
          <div
            class="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2.5px] border-primary-600 bg-white"
            aria-hidden="true"
          >
            <div class="h-[6px] w-[6px] rounded-full bg-primary-600" />
          </div>
        </Show>
        <Show when={props.status === NavItemStatus.done}>
          {/* Fait : cercle plein primary-600 + check blanc. Check rendu
                en <i> brut (mask icon font) — l'helper Icon paint un
                wrapper coloré qu'on ne veut pas ici. */}
          <div
            class="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary-600"
            aria-hidden="true"
          >
            <i class="icon icon-check-line block h-3 w-3 bg-white" />
          </div>
        </Show>
      </div>

      <div class="min-w-0 flex-1">
        <div
          class={cx(
            'text-sm leading-snug',
            // Tons par état :
            props.status === NavItemStatus.done && 'font-medium text-primary-950',
            props.status === NavItemStatus.active && 'font-bold text-primary-950',
            (props.status === NavItemStatus.default || props.status === NavItemStatus.back) &&
              'font-normal text-violet-faint',
            props.status === NavItemStatus.disabled && 'font-normal text-violet-faint opacity-60',
          )}
        >
          {props.text}
        </div>
      </div>
    </div>
  );
};
