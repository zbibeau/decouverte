# Handoff — Refonte Manager MadeForMed / Odaiji · Direction C

Package de design pour réintégration. **Aucun fichier de votre codebase n'a été
modifié** : ce dossier ne contient que des livrables de design (audit + prototype)
et leurs sources, à consommer comme spécification.

---

## 1. Contenu du package

```
package/
├─ Audit Manager MadeForMed (autonome).html   ← audit complet, offline, à partager
├─ Manager C - Studio (autonome).html         ← prototype Direction C, offline, à partager
├─ HANDOFF.md                                  ← ce fichier
└─ source/
   ├─ audit/        (Audit …html + audit.css)
   └─ prototype/    (sources éditables du prototype)
      ├─ Manager C - Studio.html   ← shell + styles + montage React/Tweaks
      ├─ data.js                   ← catalogue des types de blocs + seed + variables
      ├─ preview.jsx               ← FrontPreview : fac-similé fidèle du front
      ├─ editor.jsx                ← logique éditeur (arbre, DnD, inspecteurs, ⌘K)
      ├─ tweaks-panel.jsx          ← panneau Tweaks (composant fourni)
      └─ fonts/                    ← Steradian + MadeForMed (woff2, copiés du repo)
```

> Les `.html (autonome)` sont des **bundles** auto-suffisants (offline). Pour les
> modifier, éditez les **sources** dans `source/` puis recompilez — n'éditez jamais
> le bundle directement.

---

## 2. Ce que la refonte résout (rappel de l'audit)

| #   | Problème actuel                                                                                                                                                  | Réponse Direction C                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P1  | On édite dans des champs à gauche, le rendu vit dans une iframe à droite qu'il faut synchroniser à la main (minuteries `1,2 s` / `900 ms` dans `ChapterEditor`). | **Aperçu device docké en permanence**, synchronisé sélection ↔ édition.                          |
| P2  | Un « bloc » se manipule différemment selon sa profondeur (drag à la racine, flèches en sous-bloc ; tags/dupliquer absents en imbriqué).                          | **Un seul composant `BlockCard`, récursif** : même geste partout (collapse, ↑↓, drag, supprimer). |
| P3  | Trop de texte / jargon, ~9 signaux par ligne.                                                                                                                    | **Galerie d'icônes catégorisée**, lignes épurées, le type se reconnaît à sa vignette.             |

Principes : éditer sur le rendu · un seul modèle de bloc · montrer plutôt que décrire ·
ajouter = voir puis poser · le violet ne sert qu'à agir.

---

## 3. Garde-fous d'intégration (NE PAS CASSER)

La refonte est **purement présentation**. À ne **pas** toucher en réintégrant :

- **`shared/content-schema.ts`** — contrat front ↔ back. Le prototype suit déjà ses
  formes : `card.children`, `conditional.then/else` (avec `BranchingCondition`),
  `toolContentSection` (title/subtitle/advantageTitle/advantagePoints/children).
- **Protocole d'aperçu (postMessage)** — `preview:setBlockOverride`,
  `preview:scrollToBlock`, `preview:setEditedBlock`, `preview:visibleBlock`,
  `preview:isolatedReady`, `preview:rendererReady`, etc. **Aucun renommage.**
- **Mécanisme brouillon / publication** — `ensureDraft`, `DraftStatusBar`,
  `TagReviewModal`, auto-save debounce. Inchangé.

Le prototype démontre le branchement réel : Tweaks → **Aperçu → « Branché »**
remplace le fac-similé par le volet `localhost:3100/preview-block` et affiche, en
direct, les messages `preview:*` que le manager pousserait à votre renderer SolidJS.
**C'est le point d'intégration exact** — voir `editor.jsx › ConnectedPane`.

---

## 4. Plan de réintégration recommandé (du low-risk au high-impact)

1. **Unifier le modèle de bloc d'abord** (indépendant du style) : faire converger
   bloc racine (`ChapterEditor`/`InlineBlockEditor`) et sous-bloc (`ChildBlockList`)
   sur un seul composant — même drag (vous avez déjà `SortableList` à la racine ;
   l'étendre aux enfants), même collapse, même menu. Voir
   `editor.jsx › BlockCard` + helpers `childContainers / reorderRelative`.
2. **Galerie d'ajout catégorisée** en remplacement de la barre de 11 boutons
   (`BlockTypeSelector`) — réutilise `SAMPLE_PAYLOADS` pour la vignette d'aperçu.
   Voir `editor.jsx › AddGallery`.
3. **Aperçu docké permanent** branché sur le vrai front via le protocole existant
   (le fac-similé `preview.jsx` n'est là que pour la démo offline ; en prod, on
   garde l'iframe SolidJS + `preview:setBlockOverride`).
4. **Habillage Studio dark** : tokens dans `Manager C - Studio.html` (`:root`).
   Le rail graphite existe déjà chez vous (`--rail-*`) — Direction C ne fait que
   l'étendre au plan de travail. Violet réservé aux actions/sélection.

---

## 5. Notes techniques sur le prototype

- **Stack démo** : React 18 + Babel inline (pas un build). En prod, transposer en
  composants Next.js/React du `manager/`. La logique d'arbre (`editor.jsx`) est du
  React standard, directement portable.
- **Helpers d'arbre** (`editor.jsx`) : `childContainers(b)` déclare les listes
  d'enfants par type (`children`, `then`, `else`) ; tous les helpers
  (`findBlock/updIn/removeFrom/insertInto/moveIn/reorderRelative`) en découlent —
  ajouter un nouveau type conteneur = une ligne.
- **Drag & drop** : HTML5 natif, réordonnancement **entre frères uniquement**
  (pas de move cross-parent → pas d'imbrication invalide). Idem sur les listes de
  champs (`ListInput`, poignée incandescente à droite).
- **Persistance** : `localStorage['mfm-studio-c-v2']` (démo). À remplacer par vos
  server actions / draft.
- **Simulateur de condition** : le `conditional` expose un toggle Alors/Sinon pour
  prévisualiser chaque branche — à brancher sur votre simulateur de variables réel.

---

## 6. Pour partager (non-dev)

Ouvrez simplement les deux fichiers **`… (autonome).html`** dans un navigateur :
tout est embarqué (polices comprises), aucun serveur requis.
