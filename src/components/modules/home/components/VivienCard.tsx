import { JSX } from 'solid-js';

/**
 * VivienCard — refonte UI Kit Lot 8.
 *
 * Carte conseiller : illustration Vivien en débord top-right + contenu
 * principal sur fond blanc. Refonte :
 *   - Wrapper white avec border-violet-border-soft + shadow-card teintée
 *     violet (au lieu de shadow plate générique).
 *   - Rayon 22px (au lieu de 3xl=24px).
 *
 * Structure inchangée — l'illustration reste positionnée en absolute
 * sur desktop, au-dessus en mobile.
 */
export const VivienCard = (props: { children: JSX.Element }) => {
  return (
    <div class="relative flex w-full flex-col-reverse items-center">
      <div class="w-full rounded-[22px] border border-violet-border-soft bg-white p-6 shadow-card">
        {props.children}
      </div>

      <img src="/illustrations/toolbox-1-2-vivien.webp" class="size-32 md:absolute md:-top-6 md:right-1" alt="vivien" />
    </div>
  );
};
