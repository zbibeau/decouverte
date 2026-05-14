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
