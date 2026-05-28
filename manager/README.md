# MadeForMed — Manager (back-office des parcours)

Le **manager** est l'application d'administration qui permet de créer et éditer les
**parcours** (contenu, chapitres, blocs, variables…). C'est le pendant « back-office »
du **front public** (l'app SolidJS à la racine du repo) : les deux partagent la même
base **Supabase**. Le manager écrit le contenu, le front le lit par `slug`.

| App                                 | Techno                  | Port (dev) | Rôle                                |
| ----------------------------------- | ----------------------- | ---------- | ----------------------------------- |
| **Manager** (ce dossier `manager/`) | Next.js 15 (App Router) | **3200**   | Éditer les parcours                 |
| **Front public** (racine `src/`)    | SolidJS / vinxi         | **3100**   | Afficher les parcours aux visiteurs |

---

## 1. Stack technique

- **Next.js 15** (App Router) + **React 19** — Server Components + Server Actions.
- **Supabase** — Postgres (contenu), Auth (connexion), Storage (images / vidéos uploadées).
- **Tailwind CSS** (design tokens MadeForMed), **lucide-react** (icônes).
- **cmdk** (palette ⌘K), **dnd-kit** (drag & drop des chapitres / blocs).
- Code partagé avec le front via `../shared/` (schéma des blocs de contenu).

---

## 2. Prérequis

- **pnpm v8** et **Node 18**.
- Accès à une instance **Supabase** : soit le **stack local** (`pnpm supabase:start` depuis la
  racine), soit un **projet cloud** Supabase.

---

## 3. Installation & configuration

```bash
cd manager
pnpm install
cp .env.local.example .env.local   # puis éditer les valeurs
```

### Variables d'environnement (`manager/.env.local`)

| Variable                        | Obligatoire | Rôle                                                                    | Exemple                                                        |
| ------------------------------- | ----------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅          | URL de l'instance Supabase                                              | `https://xxxx.supabase.co` ou `http://127.0.0.1:54321` (local) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅          | Clé publique (« publishable ») — sûre côté navigateur                   | `sb_publishable_...`                                           |
| `NEXT_PUBLIC_CLIENT_URL`        | ⬜          | URL du front public (preview + liens). Défaut : `http://localhost:3100` | `https://parcours.exemple.com`                                 |

> Le stack local génère la clé `sb_publishable_*` : récupère-la via `pnpm supabase:status`
> (rubrique _Authentication Keys → Publishable_). Des `.env.local.*.example` fournis couvrent
> le cas **cloud** et le cas **local (localstack)**.

### Base de données (migrations)

Le manager et le front lisent/écrivent la **même base**. Le schéma vit dans
`../supabase/migrations/` (≈ 36 migrations). Pour l'appliquer :

- **Local** : depuis la racine du repo — `pnpm supabase:start` puis `pnpm supabase:reset`
  (recrée le schéma + seed). `pnpm supabase:status` affiche les URL/clés.
- **Cloud** : exécuter les fichiers SQL de `supabase/migrations/` dans l'éditeur SQL Supabase
  (dans l'ordre des numéros). Certaines migrations « cloud » dédiées existent dans `scripts/`.

---

## 4. Lancer le manager

```bash
pnpm dev      # http://localhost:3200
pnpm build    # build de production
pnpm start    # serveur de production (port 3200)
pnpm lint     # ESLint (next lint)
```

> Le manager est un **package séparé** : lance ces commandes **depuis `manager/`**.
> (La racine du repo, elle, pilote le front Solid + Supabase.)

---

## 5. Authentification

- Connexion via **Supabase Auth** sur `/login`. Toutes les routes `/parcours/*` exigent une
  session active (redirection automatique vers `/login` sinon).
- Les comptes se gèrent dans le **dashboard Supabase** (Authentication → Users) — il n'y a pas
  d'inscription en self-service dans le manager.

---

## 6. Concepts clés

### Parcours & URLs

Un parcours est identifié par son **slug** (saisi à la création, normalisé : minuscules,
sans accents, espaces → tirets). Le slug est l'URL, des deux côtés, sans config :
`manager → /parcours/<slug>` · `front → /parcours/<slug>` (exception legacy : `demo-ventes`
est servi sur la racine `/`). Voir aussi la section « Parcours & URLs » du README racine.

### Brouillon vs version publiée

C'est le cœur du workflow :

- **Toute modification ouvre automatiquement un BROUILLON** (`draft`) — la version **publiée**
  (le « live » vu par les visiteurs) **n'est pas touchée**.
- Le bandeau de statut en haut de page rappelle en permanence où vont les modifications.
- Le bouton **Publier** promeut le brouillon en version publiée (avec une **revue des tags**
  avant publication, cf. plus bas).
- L'**historique des versions** permet de consulter / restaurer une version antérieure comme
  nouveau brouillon.
- ⚠️ Sans version publiée, le front affiche **le brouillon en fallback** → l'URL d'un parcours
  est donc « live » dès sa création (pratique pour tester, à garder en tête côté confidentialité).

### Chapitres

Briques de navigation d'un parcours : titre, **slug**, ordre, **sections** (regroupement
dans la sidebar), image/titre de carte (panorama de transition), et l'option **« Masquer de
la navigation »** (chapitre atteignable par URL/branchement mais absent de la sidebar). Drag &
drop pour réordonner et déplacer entre sections.

### Blocs

Le contenu d'un chapitre, ordonné et réorganisable. Types disponibles (bouton « Ajouter un
bloc ») : **Hero (titre)**, **Vidéo**, **Carrousel photos**, **Texte**, **Key points**,
**FAQ**, **Card**, **Formulaire**, **Conditionnel**, **Composant custom**, **Tool content
section**. Certains blocs en **imbriquent** d'autres (card, conditionnel, tool content
section…). Chaque bloc peut porter des **tags de maintenance**.

### Variables

Données collectées auprès du visiteur, réutilisées pour personnaliser le contenu. Quatre
types : **Oui/Non** (boolean), **Choix unique** (enum), **Texte libre** (string), **Nombre**
(number). Elles pilotent les **blocs conditionnels**, sont collectées par les **formulaires**,
et peuvent être **mappées vers une propriété Hubspot**.

### Tags de maintenance

Vocabulaire **global** (partagé entre tous les parcours) servant à repérer « quelle interface
produit » un bloc/chapitre illustre (ex. _fiche patient_, _vue agenda_). Utile pour les audits
de maintenance : la ⌘K permet de filtrer par tag, et une **revue des tags** est proposée avant
chaque publication pour repérer les blocs non taggés.

### Navbars pilote

« Sous-parties » visuelles d'un chapitre (variantes de navbar) déclarées au niveau du parcours
et référencées par les blocs.

---

## 7. Les 4 onglets d'un parcours

| Onglet           | Contenu                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| **Chapitres**    | Liste/édition des chapitres (sections, drag & drop, masquage, carte, aperçu des blocs en place).                |
| **Variables**    | Création (bouton pleine largeur) + liste des variables en accordéon (renommage, options enum, mapping Hubspot). |
| **Navbars**      | Déclaration des variantes de navbar pilote du parcours.                                                         |
| **Bibliothèque** | Catalogue visuel de tous les types de blocs (aperçu live + insertion) **et** administration des tags.           |

---

## 8. Fonctionnalités transverses

- **Palette de commandes ⌘K** : recherche plein-texte (chapitres, blocs, variables, parcours),
  filtre par tag, actions d'ajout contextuelles, navigation rapide. Chaque famille de résultat
  a un picto (repris dans les onglets et en-têtes de cartes pour un repère visuel cohérent).
- **Aperçu live (Preview)** : panneau de droite affichant le rendu réel du parcours dans une
  iframe vers le front (`NEXT_PUBLIC_CLIENT_URL`, défaut `localhost:3100`). Bascule
  **Brouillon / Publié**, **simulateur de variables**, et **clic-pour-inspecter** un bloc.
- **Workflow brouillon → publication** avec revue des tags et historique des versions.
- **Réorganisation** par drag & drop, **duplication**, **copie d'un bloc vers un autre chapitre**.

---

## 9. Modèle de données (vue d'ensemble)

```
parcours ─┬─ slug, name, theme_color, navbar_variants, published_version_id
          └─ parcours_version (status: draft | published, version_number)
                 └─ chapter (slug, title, order, section_label, hidden_from_nav, card_image…)
                        └─ block (type, payload JSONB, order, parent_block_id → imbrication)

variable (par parcours)  ── key, label, type, options, hubspot_mapping
tag (GLOBAL) ── via block_tag / chapter_tag  (rattachement aux blocs / chapitres)
```

L'édition **clone** la version publiée en brouillon (`clone_version_*`) ; la publication
promeut le brouillon. Les tags et variables sont rattachés hors du cycle brouillon/publication
selon les cas (cf. migrations `00xx_clone_version_*`).

---

## 10. Développement

- **Structure** : `app/` (routes App Router), `components/` (UI + éditeurs de blocs),
  `lib/` (server actions dans `actions.ts`, helpers, client Supabase), `tailwind.config.ts`.
- **Server Actions** : la quasi-totalité des écritures passe par `lib/actions.ts`
  (`createParcours`, `createChapter`, `createBlock`, `createVariable`, `publish…`, etc.).
- **Intégration continue** : le workflow CI (`.github/workflows/main.yml`) **lint + build le
  front Solid uniquement** (le manager n'y est pas inclus). Le manager se valide en local
  (`pnpm lint`, `pnpm build`).
- **Icônes de famille** : centralisées dans `lib/familyIcons.tsx` (source unique partagée
  palette ⌘K ↔ vues).
