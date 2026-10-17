# Store Platform

Rebrandable e-commerce storefront + admin dashboard (Next.js, PostgreSQL, Prisma).
Design: `docs/superpowers/specs/2026-10-06-ecommerce-platform-design.md`.

## Requirements

- Node.js 24+ and npm
- No database install needed — Postgres runs from `embedded-postgres`.

## First-time setup

```bash
npm install
cp .env.example .env        # then change SEED_ADMIN_PASSWORD
```

Terminal 1 — start the database (leave it running):

```bash
npm run db
```

Terminal 2:

```bash
npm run setup               # apply migrations + seed store, settings, Owner admin
npm run dev                 # http://localhost:3000
```

- Storefront: http://localhost:3000/en (Arabic: /ar)
- Admin: http://localhost:3000/en/admin — sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`

## Tests

| Command | What it runs |
|---|---|
| `npm test` | Unit tests (`src/**/*.test.ts` and `scripts/**/*.test.ts`) |
| `npm run test:int` | Integration tests against a throwaway Postgres (`*.int.test.ts`) |
| `npm run test:e2e` | Playwright: builds the app, fresh DB on port 54331, app on port 3100. A `posttest:e2e` hook then stops only the processes this project started |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull request.

## Project layout

- `src/core` — business logic, framework-free, unit/integration tested
- `src/server` — Next.js glue: sessions, server actions, cached loaders
- `src/app/[locale]` — pages (`(store)` storefront, `admin` dashboard)
- `src/brand/brand.config.ts` — per-client defaults (name, colour, locale, currency)
- `src/brand/brand.css`, `src/brand/catalog.ts` — GIRLÉ colours/fonts and the starter product line
  (shown until the database catalog lands in milestone 2)
- `design/packshots` — Blender scene that renders the product photos
- `src/i18n/messages` — English and Arabic UI text
- `prisma/` — schema, migrations, seed

## Deploying to Vercel

1. Add a Postgres database to the Vercel project (Storage → Neon, or any hosted Postgres) so
   `DATABASE_URL` is set for Production and Preview.
2. Add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (and optionally `SEED_ADMIN_NAME`, `STORE_SLUG`)
   under Settings → Environment Variables.
3. Deploy. Vercel runs `npm run vercel-build`, which applies migrations, runs the seed (safe to
   repeat: it only creates what is missing) and builds the app.

## Changing the database schema

```bash
npm run db:migrate -- --name describe_change
```

## Troubleshooting

- **Windows: `ERR_SWC_NATIVE_CACHE` from `npm run dev` / `npm run build`** — set
  `SWC_NATIVE_BINDING_CACHE` to the absolute path of a writable folder, e.g. this repo's
  `.cache/swc` (git-ignored; the e2e server already does this). Relative paths are rejected.
  In Git Bash: `SWC_NATIVE_BINDING_CACHE="$PWD/.cache/swc" npm run dev`.
