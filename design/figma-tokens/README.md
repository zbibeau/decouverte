# Figma tokens — MadeForMed / Odaiji manager

Export des tokens design du projet (couleurs, espacements, typographie, rayons, ombres) pour le plugin **[Tokens Studio for Figma](https://tokens.studio)**. Permet à un designer d'ouvrir Figma avec **exactement** la même palette que celle utilisée dans le code (`globals.css` + `tailwind.config.ts`), sans risque de drift.

## Comment importer

1. **Installer le plugin** dans Figma : `Plugins → Find more plugins → "Tokens Studio for Figma"`.
2. Ouvrir un nouveau fichier Figma, lancer le plugin.
3. **Tools → Import** → coller le contenu de `tokens.json` (ou pointer vers le fichier).
4. Le plugin crée automatiquement :
   - **3 token sets** : `core` (palette brand, tags, rails, typo, espacements), `light`, `dark`.
   - **2 themes** prêts à basculer : `Light` et `Dark`.
5. Cliquer sur **Theme → Apply** pour générer les Figma variables / styles.

## Polices à installer localement

Le designer doit avoir installé sur son Mac :

- **[Figtree](https://fonts.google.com/specimen/Figtree)** (Google Fonts — gratuite)
- **[JetBrains Mono](https://www.jetbrains.com/lp/mono/)** (gratuite)

## Icônes

Toutes les icônes du manager viennent de **[lucide-react](https://lucide.dev)**. Le designer peut dupliquer le fichier officiel Figma Community via le bouton « Open in Figma » sur `lucide.dev` — il aura ainsi tous les SVG en composants.

## Que contient ce token export ?

| Set     | Contenu                                                                                                                                                                                                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`  | Palette brand (primary 50-950, secondary, success, danger, etc.), couleurs des **tags de maintenance** (8 palettes avec `chip` / `text` / `dot` / `ring`), tokens du **rail graphite** (identique en light/dark — signature Studio), rayons (`card` 14, `sm` 9, `btn` 10, `full`), spacing (0 → 12), typographie (familles, weights, sizes) |
| `light` | Tokens sémantiques light : `bg`, `surface` / `surface-2` / `surface-3`, `border` / `border-strong`, `text` / `text-muted` / `text-faint`, `primary` (default/strong/on/weak), `tone-*`, `shadow-card` / `shadow-card-sm`, `ring-primary`                                                                                                    |
| `dark`  | Mêmes clés, valeurs graphite Direction C (lift `+14 RGB` appliqué récemment sur `--surface`)                                                                                                                                                                                                                                                |

## Que NE contient PAS ce JSON ?

- ❌ Les **composants** (`Card`, `Button`, `Input`, `BlockThumb`, `PaletteItem`…) — à recréer ou importer via un plugin comme **[html.to.design](https://html.to.design)** depuis le manager live.
- ❌ Les **écrans** (chapter editor, palette ⌘K, vue chapitres…) — idem.
- ❌ La **signature visuelle radial gradient** (`--canvas-wash`) — Tokens Studio ne supporte pas les gradients ; à reproduire manuellement comme effet Background sur le calque canvas en dark.

## Workflow recommandé

1. Le designer importe ce JSON → il a la fondation système.
2. Il **duplique le Figma Community lucide** pour avoir toutes les icônes.
3. Il utilise **html.to.design** sur `http://localhost:3200` (parcours / chapitres / etc.) pour importer les écrans live → les classes Tailwind se mappent automatiquement sur les variables qu'il vient d'importer.
4. Il en extrait 5-7 composants récurrents (`Card`, `BlockRow`, `PaletteItem`, `Section`, `BlockThumb`, `Pill`) en components Figma.
5. Il propose des variants / nouvelles vues → exporte en `.zip` (HTML/CSS + spec markdown, à la Claude Design) → drop dans le repo pour implémentation.

## Mettre à jour les tokens

Si `globals.css` ou la palette brand de `tailwind.config.ts` changent, ce JSON doit être resynchronisé manuellement. Pour éviter le drift à terme, on peut ajouter un script `pnpm tokens:export` qui regénère ce fichier depuis les sources — à faire si la maintenance manuelle devient pénible.
