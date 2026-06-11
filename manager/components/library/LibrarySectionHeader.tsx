/**
 * En-tête commun pour les pages sous-section de la bibliothèque
 * (`/parcours/[slug]/library`, `.../variables`, `.../navbars`,
 * `.../library/tags`). Pattern Direction B : eyebrow uppercase
 * faint + grand H1 + paragraphe d'intro optionnel.
 *
 * Pourquoi un composant partagé : les 4 pages partageaient
 * jusqu'ici uniquement une CardTitle. Direction B veut un
 * pattern de page-header plus aéré (eyebrow + H1 grand titre),
 * et duppliquer le JSX 4 fois rendrait toute évolution future
 * fragile. Le composant est server-friendly (pas de hook), peut
 * être rendu dans n'importe quel server component.
 */
export function LibrarySectionHeader({
  eyebrow,
  title,
  description,
}: {
  /** Petite étiquette uppercase au-dessus du titre — typiquement
   *  `Bibliothèque · Blocs` ou similaire. */
  eyebrow: string;
  /** Titre principal de la section, rendu en H1 grand. */
  title: string;
  /** Paragraphe d'intro court sous le H1. Optionnel — certaines
   *  sections n'en ont pas besoin (ex. variables). */
  description?: string;
}) {
  return (
    <header className="mb-4">
      <div className="text-text-faint mb-1.5 text-[11px] font-semibold uppercase tracking-wider">{eyebrow}</div>
      <h1 className="text-text text-[22px] font-bold leading-tight tracking-tight">{title}</h1>
      {description && <p className="text-text-muted mt-1.5 max-w-2xl text-sm">{description}</p>}
    </header>
  );
}
