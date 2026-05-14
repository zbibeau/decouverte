# Supabase — Backend de contenu

Schéma de données pour l'interface manager de la découverte autonome.

## Structure

```
supabase/
├── config.toml            — config du stack local (ports, auth, etc.)
├── migrations/            — 0001 → 0024, rejouées automatiquement à `supabase start`
└── seed.sql               — (optionnel) dump de la prod, importé après les migrations
```

## Deux modes de dev

### Mode cloud (par défaut aujourd'hui)
Les apps tapent directement sur le projet cloud Supabase (`*.supabase.co`). Les migrations sont appliquées manuellement via le **SQL Editor** du dashboard. C'est ce que tu as fait jusqu'ici.

### Mode local (recommandé pour itérer sans risque)
Stack complète Postgres + Auth + REST + Storage + Studio en local via Docker. **Indispensable pour tester une migration sans toucher à la prod.**

#### Pré-requis
- Docker Desktop installé et lancé
- `pnpm` installé

#### Démarrage à froid (1ère fois)
```bash
pnpm supabase:start            # télécharge les images Docker, applique migrations 0001→0024
```
Au bout de ~30s tu obtiens :
- API : http://localhost:54321
- Studio (UI DB) : http://localhost:54323
- Inbucket (emails) : http://localhost:54324
- Postgres : `postgres://postgres:postgres@localhost:54322/postgres`

#### Brancher les apps sur le stack local
```bash
cp .env.local.localstack.example .env.local
cp manager/.env.local.localstack.example manager/.env.local
# redémarrer pnpm dev partout
```

Pour revenir au cloud : restaure tes anciens `.env.local` (les clés sont dans 1Password / Supabase dashboard).

#### Commandes courantes
```bash
pnpm supabase:start            # démarre le stack
pnpm supabase:stop             # arrête (les données persistent)
pnpm supabase:reset            # wipe + rejoue toutes les migrations + le seed
pnpm supabase:status           # affiche les URLs/keys du stack en cours
```

#### Importer le contenu de la prod (cloud → local)
```bash
# 1) Lie le repo à ton projet cloud
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref <ref-du-projet>

# 2) Dump du contenu actuel
pnpm dlx supabase@latest db dump --data-only --schema public -f supabase/seed.sql

# 3) Reset le stack local : il rejoue les migrations puis charge seed.sql
pnpm supabase:reset
```

#### Pousser le contenu local en prod (local → cloud)
Pour faire l'inverse — publier en prod ce que tu as construit en local — utilise le script `content-push` :
```bash
# 1) Récupère la connection string Postgres du cloud
#    Supabase dashboard → Project Settings → Database → Connection string
#    → "URI" tab → "Transaction" pooler. Exporte-la dans ton shell :
export CLOUD_DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"

# 2) Voir ce qui changerait (sans rien écrire)
pnpm content:diff

# 3) Pousser pour de vrai (te demande de taper "PUSH" pour confirmer)
pnpm content:push
```
Le script REMPLACE l'intégralité des tables `parcours`/`parcours_version`/`variable`/`chapter`/`block` en cloud avec le contenu local. Il ne touche **pas** aux users `auth.users` ni aux migrations. Tout est dans une transaction, donc rollback automatique si erreur.

Conseil : `export CLOUD_DATABASE_URL=…` dans ton `~/.zshrc` pour ne plus retaper la connection string à chaque fois.

#### Auth en local
- Pas d'envoi d'email réel : tout va dans **Inbucket** (http://localhost:54324).
- Confirmation d'email désactivée par défaut (`config.toml` → `[auth.email] enable_confirmations = false`).
- Crée un user de test depuis Studio → **Authentication → Users → Add user**.

## Auth

Un seul admin pour commencer : créer l'utilisateur manuellement dans **Authentication → Users → Add user**. L'app manager se connectera avec email/password.

## Modèle RLS (rappel)

- `anon` (app cliente) : `SELECT` uniquement sur les parcours ayant un `published_version_id` et leurs chapitres/blocs rattachés à une version `published`.
- `authenticated` (manager) : CRUD complet sur toutes les tables.

À durcir plus tard avec une table `profiles` + rôles si plusieurs éditeurs.

## Types de blocs

| type          | payload                                                      | enfants                              |
| ------------- | ------------------------------------------------------------ | ------------------------------------ |
| `text`        | `{ markdown }`                                               | —                                    |
| `video`       | `{ vimeoHash, title?, caption? }`                            | —                                    |
| `list`        | `{ items: [...] }`                                           | —                                    |
| `conditional` | `{ condition: { variable, op, value } }`                     | oui, via `parent_block_id`           |

Pour un bloc `conditional`, les enfants portent dans leur `payload` un champ `branch: "then" | "else"` qui indique de quel côté de la condition ils appartiennent.
