import cx from 'classix';
import type { JSX } from 'solid-js';

/**
 * Mot-clé italique « MadeForMed » — primitive de marque.
 *
 * Steradian italic 500 en violet primary-600. Cf. handoff §Typographie :
 * « Le téléphone reste un *problème.* », « Un *filtre* multicanal. »,
 * « Nos *tarifs.* », etc.
 *
 * Forme courte et explicite — on l'utilise directement dans les h1 du
 * front, en remplacement d'un `<i>` brut qui hériterait juste de
 * font-style: italic sans la teinte. Le caller passe le mot tel quel
 * (ponctuation incluse si elle fait partie du « beat » du mot, ex.
 * « problème. »).
 *
 * Variant `tone` permet de surcharger pour les écrans où le fond est
 * violet (hero, fin) — dans ces cas le mot-clé prend `primary-100`
 * (lavande clair) ou ocre `secondary-200` (« terminé. » sur l'écran
 * de fin).
 */
export function KeywordItalic(props: {
  children: JSX.Element;
  /** Tonalité du mot. Default : `primary-600` (sur fond clair). */
  tone?: 'primary' | 'lavender' | 'ocre-light';
  class?: string;
}) {
  const tone = () => props.tone ?? 'primary';
  return (
    <em
      class={cx(
        'font-medium italic',
        tone() === 'primary' && 'text-primary-600',
        tone() === 'lavender' && 'text-primary-100',
        tone() === 'ocre-light' && 'text-[#FFE3B0]',
        props.class,
      )}
    >
      {props.children}
    </em>
  );
}
