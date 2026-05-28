# Demo ventes

**BE SURE TO HAVE PNPM V8 INSTALLED**

## Start project in dev mode

```bash
pnpm i

cp .env.example .env # DON'T FORGET TO EDIT VALUES

pnpm dev
```

## Start project in production mode (in SSR)

```bash
pnpm i
pnpm build

pnpm start
```

## Start project in production mode (in Static Mode)

```bash
pnpm i
BUILD=static pnpm build

# You can now get files in .output/public
```

## Parcours & URLs

Chaque parcours est identifié par son **slug** (saisi à la création dans le manager,
normalisé : minuscules, sans accents, espaces → tirets). Le slug détermine directement
l'URL — sans configuration ni déploiement supplémentaire :

| Surface           | URL                                                                   |
| ----------------- | --------------------------------------------------------------------- |
| Manager (édition) | `/parcours/<slug>`                                                    |
| Front public      | `/parcours/<slug>` (en dev : `http://localhost:3100/parcours/<slug>`) |

- **Créer un parcours = créer son URL** : dès l'insertion en base, les routes manager et
  front (dynamiques par slug) répondent immédiatement, aucune étape de câblage requise.
- **Exception historique** : le parcours `demo-ventes` est servi sur la racine `/` (route
  legacy) ; tous les autres passent par `/parcours/<slug>`.
- **Brouillon visible avant publication** : sans version publiée, le front affiche
  automatiquement le brouillon. L'URL est donc « live » dès la création — pratique pour
  tester, mais à noter : un parcours non publié reste accessible via son URL directe.
