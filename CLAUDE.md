# demo-ventes-develop

CMS de parcours pédagogiques **MadeForMed / Odaiji**. Le manager est un Next.js
qui édite des chapitres composés de blocs ; le front Solid restitue ces parcours
aux utilisateurs finaux (médecins). Tout transite par Supabase.

Ce fichier est lu en début de session par Claude Code — il sert de mémoire
projet stable. Si tu vois quelque chose d'obsolète, dis-le, je le mets à jour.

## Stack

- **Front parcours** — `src/` — SolidJS 1.9 + Vinxi + `@ark-ui/solid` + Tailwind
  v3, port **3100**. Renderer public des parcours pédagogiques.
- **Manager CMS** — `manager/` — Next.js 15 App Router + React 19 RC + Tailwind
  v3, port **3200**. Édition des chapitres, blocs, variables, navbars, tags.
- **Schéma partagé** — `shared/content-schema.ts` — source de vérité des
  payloads. **Ne pas modifier sans validation**, c'est le contrat front ↔ back.
- **Backend** — Supabase **cloud** (auth + Postgres + Storage). Pas de Docker
  local côté Vivien — la voie locale via `pnpm supabase:start` existe mais n'est
  pas le mode d'usage courant.
- **Package manager** : `pnpm`. Lockfile unique à la racine, hoisting normal.

## Architecture manager

### Pages App Router

```
manager/app/
  (app)/
    page.tsx                              -> ParcoursGrid (liste)
    parcours/[slug]/
      layout.tsx                          -> Sidebar + DraftStatusBar + ParcoursTabs
      page.tsx                            -> ChapterList (Chapitres)
      library/page.tsx                    -> Bibliothèque
        library/tags/page.tsx             -> Admin tags
      navbars/page.tsx                    -> Variantes navbar
      variables/page.tsx                  -> Variables typées
      chapters/[chapterSlug]/page.tsx     -> ChapterEditor (édition inline)
        blocks/[blockId]/page.tsx         -> BlockEditor (route legacy block-only)
  login/page.tsx                          -> auth Supabase
```

### Chaîne d'édition d'un bloc

```
ChapterEditor          -> liste des blocs + preview à droite
  InlineBlockEditor    -> mounted une fois par bloc, gère save / draft / search
    PayloadEditor      -> dispatch par type vers l'éditeur dédié
      SimpleEditors    -> heroTitle, text, video, componentRef
      FormEditor       -> formulaire (avec ComboboxForm si >8 options enum)
      ConditionalEditor -> onglets Alors / Sinon
      CardEditor       -> children récursifs via ChildBlockList
      PhotoCarouselEditor
      KeyPointsCardEditor
      FaqListEditor
      ToolContentSectionEditor
      NavbarVariantSelect
    Field              -> wrapper standard (path="..." + diff + searchMatch)
```

### Tokens design — direction "D · Studio"

- **`manager/app/globals.css`** : variables CSS `:root` (light) + override `.dark`
  (dark). Format **RGB triplet** (espace-séparé) pour supporter le modifier
  `<alpha-value>` de Tailwind (ex. `bg-primary/10`).
- **`manager/tailwind.config.ts`** : mappe les vars vers `surface`, `text`,
  `border`, `primary`, `tone-*`, `rail-*`, et garde les alias historiques
  (`background`, `foreground`, `muted`, `accent`, `destructive`) re-pointés sur
  les nouvelles vars — donc le code legacy `bg-muted/40` continue de marcher ET
  switche dark automatiquement.
- **Rail graphite (Sidebar)** : `bg-rail-*` valeurs CSS brutes, **identiques en
  light et dark** (signature visuelle Studio).
- **Mode dark** activé via classe `.dark` sur `<html>` posée par
  `ThemeBootstrap` (script inline pour éviter le flash) + `ThemeToggle`
  (icône Soleil/Lune dans la Sidebar).

### Conventions classes Tailwind

À utiliser pour tout nouveau code :

| Usage                               | Token                                                     |
| ----------------------------------- | --------------------------------------------------------- |
| Fond surface principale             | `bg-surface`                                              |
| Fond surface décalé (rows, headers) | `bg-surface-2` / `bg-surface-3`                           |
| Texte normal                        | `text-text` (ou `text-foreground` legacy)                 |
| Texte adouci                        | `text-text-muted` (ou `text-muted-foreground` legacy)     |
| Texte très adouci                   | `text-text-faint`                                         |
| Bordure                             | `border-border`, `border-border-strong`                   |
| Bordure douce primary               | `border-primary-weak-border`                              |
| Fond accent primary                 | `bg-primary/10` (alpha) ou `bg-primary-weak` (figé)       |
| Texte primary lisible 2 modes       | `text-primary-on`                                         |
| Tons sémantiques                    | `bg-tone-rose`, `text-tone-emerald`, `ring-tone-amber/30` |
| CTA primary                         | **`bg-brand-primary-600` reste figé** (lisible 2 modes)   |

Les palettes pâles (`bg-amber-50`, `text-amber-900`, `border-sky-200`, …) sont
toutes accompagnées de variantes `dark:` ajoutées par la passe dark mode B
(juin 2026). Les couleurs **saturated** (`bg-amber-500` pour les dots,
`text-rose-600` pour les icônes) restent figées — elles sont lisibles dans les
deux modes par construction.

### Système de tags de maintenance

- Palette dans `manager/lib/tagColors.ts` : `TAG_COLOR_CLASSES` expose `bg`,
  `fg`, `ring`, `dot`, **`darkBg`**, **`darkFg`** par couleur. Consommateurs
  concaténent `${cls.bg} ${cls.fg} ${cls.darkBg} ${cls.darkFg}` dans le
  template literal — Tailwind JIT voit chaque classe en clair grâce à la
  safelist étendue dans `tailwind.config.ts`.
- 3 sites consomment : `TagsAdmin`, `palette/PreviewPane`, `blocks/TagsField`.

### Recherche

Deux niveaux :

1. **Bloc-level** — barre "Filtrer les champs de ce bloc" dans
   `InlineBlockEditor`. Utilise `findMatchingFieldPaths(payload, query)` +
   `findMatchingFieldSnippets` : walker permissif qui scanne TOUS les
   strings du payload et retourne les paths matchés. Field highlight via
   `SearchMatchProvider` + `useFieldSearchMatchSnippet`.

2. **Chapitre-level** — barre "Filtrer les blocs de ce chapitre" dans
   `ChapterEditor`. Utilise `extractBlockSearchTextWeighted(payload).full`
   qui produit l'index exhaustif via **mode blacklist** : tout est indexé
   sauf les clés techniques listées dans `EXCLUDED_KEYS` (`id`, `type`,
   `kind`, `src`, `vimeoSrc`, `youtubeId`, `href`, `url`, `illustration`,
   `image`, `cover`, `poster`, `thumbnail`, `icon`, `color`, `slug`, `key`,
   `path`, `tagIds`, `componentId`, `op`, `operator`, `variable`, `all`,
   `any`, `left`, `right`, `alignment`, `mode`, `size`, `align`,
   `position`). Le palette ⌘K consomme la même fonction et bénéficie en
   plus du ranking via `primary` / `secondary` (whitelists pour le boost).

**Ne pas revenir à une whitelist** — tout nouveau payload key est indexé
automatiquement. Si une clé technique pollue les résultats, l'ajouter à
`EXCLUDED_KEYS`.

### Protocole preview manager ↔ front (iframe)

postMessage protocol — **ne JAMAIS renommer** ces messages :

- `preview:scrollToBlock` — manager demande à scroller un bloc (`align:
'center'` par défaut)
- `preview:setBlockOverride` — manager pousse un payload en cours d'édition
  au front (live preview)
- `preview:highlightField` — manager survole un champ → outline temporaire
  dans la preview
- `preview:setEditedBlock` — id du bloc actuellement édité
- `preview:fieldRails` — couleurs des rails de variable
- `preview:visibleBlock` — front signale au manager le bloc visible
- `preview:blockClicked` — front signale un clic sur un bloc
- `preview:rendererReady` — front prêt à recevoir
- `preview:chapterChanged` — front change de chapitre (cmd-K ou nav)
- `preview:isolatedReady` — front en mode isolé prêt

### Brouillon / Publication

- Chaque parcours a UN brouillon vivant ; les éditions vont dedans, le live
  n'est pas touché tant que le user ne clique pas "Publier".
- `DraftStatusBar` (top de chaque page parcours) affiche l'état :
  - Aucun brouillon : bandeau émeraude "Version publiée vN"
  - Brouillon vide : bandeau émeraude + bouton "Jeter le brouillon vide"
  - Brouillon avec changements : bandeau ambre + compteurs + boutons
    "Publier" / "Jeter"
- Publier passe par `TagReviewModal` qui force une revue par-ligne quand le
  brouillon contient des nouveaux blocs ou des blocs modifiés (valider tags
  existants, ajouter un tag, ou skip).
- Auto-save : chaque édition de bloc enregistre via debounce ; pas de bouton
  "Enregistrer" classique. Exceptions : `componentRef` (manual save) et la
  création initiale (premier "Créer le bloc" manuel).
- Pre-warm draft : `CreateChapterForm` pré-charge la création de brouillon au
  mount pour réduire la latence du premier clic.

## Conventions de dev

- **tsc baseline** : manager **13**, front **19**. Si une PR augmente ce
  chiffre, c'est une régression — vérifie.
- **Lint safe-autofix** côté front avec règles solid/tailwind sur "off" pour
  les autofix risquées :
  ```
  --rule '{"solid/prefer-for":"off","solid/components-return-once":"off","solid/style-prop":"off","solid/no-innerhtml":"off","solid/event-handlers":"off","solid/reactivity":"off","tailwindcss/classnames-order":"off","tailwindcss/enforces-shorthand":"off"}'
  ```
- **Commits** en français, type Conventional (`feat:`, `fix:`, `chore:`,
  `docs:`, `style:`, `perf:`).
- **Le repo doit rester hors Google Drive Stream**. Le marqueur xattr
  `com.apple.provenance` posé par Drive bloque l'accès depuis les processus
  sandbox de Claude Code (EPERM partout). Le projet vit dans
  `~/Code/demo-ventes-develop/`.

## Workflow dev

```bash
# Onglet 1 — front Solid
cd ~/Code/demo-ventes-develop && pnpm dev          # port 3100

# Onglet 2 — manager Next.js
pnpm --dir ~/Code/demo-ventes-develop/manager dev  # port 3200
```

Le manager pointe vers le front sur 3100 (variable `NEXT_PUBLIC_CLIENT_URL`).
Modifier ce link dans `manager/.env.local` si besoin.

Claude Code : `.claude/launch.json` décrit les deux serveurs pour
`preview_start` — utilisable une fois la session démarrée depuis
`~/Code/demo-ventes-develop`.

## État du projet (juin 2026)

### Dark mode — complet

- Passe A : primitives UI (`Card`, `Input`, `Textarea`, `Button`, `Badge`),
  `DraftStatusBar`, `Toaster`, `ChapterList`, `ChapterEditor`,
  `InlineBlockEditor`, `DraftBlockDiffPanel`, `SearchHighlightBanner`,
  `ParcoursGrid`, `ConditionalEditor`, `ChildBlockList`, `TagReviewModal`.
- Passe B : passe massive perl ajoute `dark:` variants sur toutes les palettes
  pâles (amber, emerald, sky, rose, violet, slate, red) en mode "ajout safe"
  via negative lookahead `(?!dark:X-)`. Plus de 80 fichiers touchés. Cas
  spéciaux (`tagColors.ts` darkBg/darkFg, doublons `/N/N`, orphans `dark:bg`
  issus de `hover:bg`) traités manuellement.

### Recherche — exhaustive

`blockSearch.ts` switché de whitelist à blacklist. Toute clé non-technique du
payload est indexée (sectionTitle, eyebrow, question, answer, custom keys
futurs). Le palette ⌘K garde son ranking primary/secondary.

### Variables

- `AddVariableForm` propose un picker de type (boolean / enum / number / string).
- Options enum : `OptionsListInput` permet drag-and-drop dnd-kit + Enter pour
  ajouter une row + auto-save 500ms via `VariableOptionsForm`.
- `logicielMedecin` seedé avec 28 options médicales (Weda, Doctolib, etc.) via
  `supabase/migrations/0041_seed_variable_logiciel_medecin.sql`.

### Front — Combobox sur enums > 8 options

- `src/components/atoms/ComboboxForm.tsx` (nouveau) — wrapper `@ark-ui/solid`
  Combobox aligné sur le pattern `RadioGroupForm`. Filtre case-insensitive.
- Threshold `ENUM_DROPDOWN_THRESHOLD = 8` dans `RenderFormBlock` : sous 8
  options, on garde le RadioGroup ; au-dessus, on bascule en dropdown.
- **Important** : `Combobox.Positioner` doit être wrappé dans `<Portal>` de
  `solid-js/web` pour échapper aux stacking contexts du form (sinon le bouton
  "Continuer" avec `opacity-30` passe devant).

### Bibliothèque

- 4 onglets : Blocs, Top bar, Variables, Tags
  (`LibrarySectionTabs` remplace l'ancien `LibraryTabs`).
- `ParcoursTabs` réduit à 2 onglets racine (Chapitres, Bibliothèque) et caché
  sur les pages d'édition chapitre.

### UX divers

- `MoveIntoBlockMenu` : déplacer un bloc dans un container.
- `TabbedItemList` : affichage par onglets pour les items multi (`FormEditor`,
  `PhotoCarouselEditor`).
- Hero / Video bloc : champ `managerTitle` pour étiquette manager-only.
- `AddBlockButton` : popovers ne se cumulent plus (capture phase listener).
- `ChildBlockList.add` : callback stable via refs pour éviter la boucle
  infinie register/bump.

## Pièges connus

- **Google Drive Stream** : sandbox macOS bloque l'accès depuis tout
  subprocess Claude Code. Garder le projet sous `~/Code/` strict.
- **Cursor + Drive sync** : si tu rouvres dans Cursor un dossier qui était
  sous Drive, vérifie le path absolu — un mv mal placé peut casser le watch
  Next.js et donner du HTTP 500.
- **`brand-primary-600` non migré vers `bg-primary`** : volontaire pour les
  CTA primary. Le violet brand reste figé en dark, lisible avec texte blanc.
- **TCC Files & Folders** : `~/Desktop`, `~/Documents`, `~/Downloads` sont
  TCC-protected pour les subprocess sandbox. `~/Code/` est OK.
- **Migration future Combobox** : si on veut le mettre dans le manager (pas
  juste le front), prévoir un wrapper React équivalent avec `cmdk` ou
  `@ark-ui/react`.

## Roadmap / TODOs en attente

- Sessions user + drafts multi-éditeur (auth manager multi-utilisateurs +
  statut draft/published sur les contenus) — cf. `MEMORY.md` du dev.
- Docker-compose pour conteneuriser le tout (Vivien n'a pas Docker
  actuellement).
- LMS gap : passer du CMS de parcours à un vrai LMS (apprenants, progression,
  quiz scorés, certifications, reporting).
- Migration éventuelle des `bg-brand-primary-600` vers les tokens
  `bg-primary` quand on veut harmoniser entièrement le dark.
