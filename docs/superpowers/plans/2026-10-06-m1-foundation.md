# Milestone 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runnable Next.js app with database, customer + admin authentication (roles/permissions), store settings with brand theming, English/Arabic (RTL), dark mode, storefront and admin shells, seed script, and unit/integration/e2e test harnesses.

**Architecture:** One Next.js App Router app. Business rules live in `src/core` (no `next/*` imports), taking a Prisma client as an argument; `src/server` is thin Next glue (cookies, server actions, cached loaders); `src/app/[locale]` holds pages. PostgreSQL runs locally via `embedded-postgres` (dev on port 54329, integration tests 54330, e2e 54331).

**Tech Stack:** Next.js 16.4, React 19, TypeScript (strict), Prisma 7.10 + `@prisma/adapter-pg`, PostgreSQL (embedded-postgres), Tailwind CSS 4, shadcn/ui, next-intl 4, next-themes, Zod 4, `@node-rs/argon2`, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-06-ecommerce-platform-design.md`

## Global Constraints

- Package manager: **npm** (no pnpm on this machine). Node 24.
- Pin Prisma to **7.10.0** (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) — 8.x is a release candidate.
- Every business table has `storeId`. Single store per deployment resolved by `STORE_SLUG` env (default `default`).
- `src/core/**` must not import from `next`, `next/*`, `react`, or `src/server/**`.
- Translatable text is JSON `{ en?: string, ar?: string }`; resolve with `localize()`, fallback to `en`.
- Locales: `en` (LTR, default) and `ar` (RTL); URLs are always locale-prefixed (`/en/...`, `/ar/...`).
- Passwords: argon2id via `@node-rs/argon2`, minimum 8 characters.
- Session tokens: 32 random bytes, only the SHA-256 hash is stored; admin and customer sessions use separate cookies (`adm_session`, `cus_session`) and separate realms.
- Login rate limit: 5 failed attempts per (store, realm, email) within 15 minutes → `RATE_LIMITED`.
- Colours are CSS variables only; components never hard-code brand colours.
- No Aniq UI code, text, logos, or images are copied into this repo.
- Commit after every task with a conventional message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Arabic page with a field that has no Arabic translation** → shows the English text, never blank (Task 3 `localize` test).
2. **A customer's session cookie sent to the admin area** (or a customer token placed in the admin cookie) → treated as signed out (Task 5 realm test + Task 12 e2e).
3. **Email typed with different case/spaces** (`"  Sara@Example.COM "`) → signs in to the same account; signing up again with a different case is rejected as taken (Task 6 tests).
4. **An admin deactivated, or a customer soft-deleted, while still holding a live session** → next request is signed out (Task 5 test).
5. **Corrupted or hand-edited settings JSON** (bad hex colour, unknown locale, non-object) → app renders with defaults instead of crashing or emitting broken CSS (Task 7 tests).

---

## File map (created in this milestone)

```
.env.example                       env template (dev DB url, seed owner)
prisma.config.ts                   Prisma 7 config (schema path, seed, datasource)
prisma/schema.prisma               M1 models
prisma/seed.ts                     runs seedFoundation (+ e2e fixtures when flagged)
scripts/lib/postgres.ts            startPostgres() helper around embedded-postgres
scripts/db-dev.ts                  long-running dev database
scripts/e2e-server.ts              fresh DB + migrate + seed + build + start for Playwright
vitest.config.ts                   unit + integration projects
playwright.config.ts
tests/setup/global-int.ts          starts throwaway Postgres for integration tests
tests/helpers/db.ts                testDb(), resetDb(), makeStore()
tests/e2e/fixtures.ts              e2e credentials
tests/e2e/seed-fixtures.ts         Viewer role/admin for permission tests
tests/e2e/storefront.spec.ts
tests/e2e/admin.spec.ts
src/brand/brand.config.ts          per-client defaults
src/core/db.ts                     DbClient type
src/core/errors.ts                 DomainError + codes
src/core/i18n/locales.ts           LOCALES, isLocale, isRtl
src/core/i18n/localize.ts          localize()
src/core/auth/permissions.ts       PERMISSIONS, hasPermission, assertPermission
src/core/auth/password.ts          hashPassword, verifyPassword
src/core/auth/schemas.ts           zod schemas for sign-in/up
src/core/auth/sessions.ts          create/validate/revoke sessions
src/core/auth/login.ts             loginAdmin, loginCustomer, registerCustomer, normalizeEmail
src/core/audit.ts                  recordAudit
src/core/settings/schema.ts        settingsSchema (lenient), defaultSettings, readSettings
src/core/settings/settings.ts      getSettings
src/core/theme/palette.ts          normalizeHex, contrast, buildThemeCss
src/core/setup/seed-foundation.ts  idempotent store/settings/Owner seed
src/i18n/routing.ts | request.ts | navigation.ts
src/i18n/messages/en.json | ar.json
src/proxy.ts                       next-intl + admin cookie guard
src/server/db.ts                   Prisma singleton
src/server/store.ts                getStoreId, getStoreSettings
src/server/cookie-names.ts         SESSION_COOKIE
src/server/proxy-guard.ts          adminGuardRedirect (pure)
src/server/session.ts              cookie helpers, getCurrentAdmin/Customer, require*
src/server/action-result.ts        ActionState, toActionState
src/server/actions/auth.ts         sign-in/up/out server actions (customer + admin)
src/components/theme/*             ThemeProvider, ThemeToggle
src/components/i18n/locale-switcher.tsx
src/components/forms/field.tsx
src/components/store/*             SiteHeader, SiteFooter, SignInForm, SignUpForm
src/components/admin/*             nav, Sidebar, Topbar, AdminLoginForm, NoAccess
src/app/globals.css
src/app/[locale]/layout.tsx
src/app/[locale]/(store)/...       layout, home, auth/signin, auth/signup, account
src/app/[locale]/admin/login/page.tsx
src/app/[locale]/admin/(panel)/layout.tsx, page.tsx
.github/workflows/ci.yml
README.md
```

---

### Task 1: Scaffold the Next.js project and tooling

**Files:**
- Create: project scaffold (via create-next-app), `vitest.config.ts`, `.env.example`, `.env`
- Modify: `package.json` (scripts), `.gitignore`, `eslint.config.mjs`, `next.config.ts`
- Test: `src/lib/utils.test.ts`

**Interfaces:**
- Produces: `cn(...classes)` in `src/lib/utils.ts` (from shadcn); npm scripts `dev, build, start, lint, typecheck, test, test:int, test:e2e, db, db:migrate, setup, e2e:server`; path alias `@/* → src/*`.

- [ ] **Step 1: Generate the app in a temp folder (the repo already contains `docs/` and `.git`)**

Run (Git Bash, from repo root):
```bash
npx create-next-app@16.4.0 .tmp-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --yes
cp -r .tmp-app/. . && rm -rf .tmp-app
rm -f src/app/page.tsx src/app/layout.tsx src/app/favicon.ico
```
Expected: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `src/app/globals.css` now exist at the repo root.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install next-intl@4 next-themes zod@4 @node-rs/argon2 server-only lucide-react @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 dotenv
npm install -D prisma@7.10.0 vitest@5 @playwright/test embedded-postgres tsx
npx shadcn@latest init --yes --base-color neutral
npx shadcn@latest add button input label card --yes
```
Expected: `src/components/ui/{button,input,label,card}.tsx` and `src/lib/utils.ts` exist; `components.json` created.

- [ ] **Step 3: Write the failing smoke test**

`src/lib/utils.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conflicting tailwind classes, last one wins', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4');
  });
});
```

- [ ] **Step 4: Add Vitest config and scripts**

`vitest.config.ts`:
```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.int.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.int.test.ts'],
          globalSetup: ['tests/setup/global-int.ts'],
          fileParallelism: false,
          hookTimeout: 180_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
```

In `package.json` replace `"scripts"` with:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run --project unit",
  "test:int": "vitest run --project integration",
  "test:e2e": "playwright test",
  "db": "tsx scripts/db-dev.ts",
  "db:migrate": "prisma migrate dev",
  "setup": "prisma migrate deploy && prisma db seed",
  "e2e:server": "tsx scripts/e2e-server.ts",
  "postinstall": "prisma generate"
}
```
(`postinstall` will fail until Task 2 adds the schema — that is expected; do not run `npm install` again before Task 2.)

Append to `.gitignore`:
```
# local
.env
.pg/
src/generated/
test-results/
playwright-report/
```

In `eslint.config.mjs`, add `"src/generated/**"` to the existing `globalIgnores([...])` array.

`next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@node-rs/argon2'],
};

export default nextConfig;
```

`.env.example` (also copy it to `.env`):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:54329/shop_dev
STORE_SLUG=default
SEED_ADMIN_NAME=Store Owner
SEED_ADMIN_EMAIL=owner@example.com
SEED_ADMIN_PASSWORD=ChangeMe-Owner-123
```
```bash
cp .env.example .env
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run --project unit`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, shadcn and Vitest"
```

---

### Task 2: Database — embedded Postgres, Prisma schema, integration harness

**Files:**
- Create: `scripts/lib/postgres.ts`, `scripts/db-dev.ts`, `prisma.config.ts`, `prisma/schema.prisma`, `src/core/db.ts`, `src/server/db.ts`, `tests/setup/global-int.ts`, `tests/helpers/db.ts`
- Test: `src/core/db.int.test.ts`

**Interfaces:**
- Produces:
  - `startPostgres({ dir, port, database, persistent? }): Promise<{ pg: EmbeddedPostgres; url: string }>`
  - Prisma models `Store, Settings, Role, Admin, Customer, Session, LoginAttempt, AuditLog`; enum `SessionRealm { ADMIN, CUSTOMER }`; compound uniques `storeId_name` (Role), `storeId_email` (Admin, Customer)
  - `type DbClient = PrismaClient | Prisma.TransactionClient` (`src/core/db.ts`)
  - `db` singleton (`src/server/db.ts`)
  - test helpers `testDb(): PrismaClient`, `resetDb(db)`, `makeStore(db, slug?)`

- [ ] **Step 1: Postgres helper and dev runner**

`scripts/lib/postgres.ts`:
```ts
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export const PG_USER = 'postgres';
export const PG_PASSWORD = 'postgres';

export async function startPostgres(opts: {
  dir: string;
  port: number;
  database: string;
  persistent?: boolean;
}): Promise<{ pg: EmbeddedPostgres; url: string }> {
  const pg = new EmbeddedPostgres({
    databaseDir: opts.dir,
    user: PG_USER,
    password: PG_PASSWORD,
    port: opts.port,
    persistent: opts.persistent ?? true,
  });
  if (!existsSync(path.join(opts.dir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(opts.database);
  } catch (err) {
    if (!String(err).includes('already exists')) throw err;
  }
  return {
    pg,
    url: `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${opts.port}/${opts.database}`,
  };
}
```

`scripts/db-dev.ts`:
```ts
import path from 'node:path';
import { startPostgres } from './lib/postgres';

async function main() {
  const { pg, url } = await startPostgres({
    dir: path.resolve('.pg/dev'),
    port: 54329,
    database: 'shop_dev',
  });
  console.log(`Postgres running: ${url}\nPress Ctrl+C to stop.`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 1 << 30); // keep process alive
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Prisma config and schema**

`prisma.config.ts`:
```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
});
```

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum SessionRealm {
  ADMIN
  CUSTOMER
}

model Store {
  id        String     @id @default(cuid())
  slug      String     @unique
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  settings  Settings?
  roles     Role[]
  admins    Admin[]
  customers Customer[]
}

model Settings {
  id        String   @id @default(cuid())
  storeId   String   @unique
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  data      Json     @default("{}")
  updatedAt DateTime @updatedAt
}

model Role {
  id          String   @id @default(cuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name        String
  permissions String[]
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  admins      Admin[]

  @@unique([storeId, name])
}

model Admin {
  id           String    @id @default(cuid())
  storeId      String
  store        Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name         String
  email        String
  passwordHash String
  roleId       String
  role         Role      @relation(fields: [roleId], references: [id])
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([storeId, email])
}

model Customer {
  id           String    @id @default(cuid())
  storeId      String
  store        Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  name         String
  email        String
  phone        String?
  passwordHash String
  deletedAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([storeId, email])
}

model Session {
  id        String       @id @default(cuid())
  storeId   String
  realm     SessionRealm
  subjectId String
  tokenHash String       @unique
  expiresAt DateTime
  createdAt DateTime     @default(now())

  @@index([realm, subjectId])
}

model LoginAttempt {
  id        String       @id @default(cuid())
  storeId   String
  realm     SessionRealm
  email     String
  success   Boolean
  createdAt DateTime     @default(now())

  @@index([storeId, realm, email, createdAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  storeId    String
  adminId    String?
  action     String
  entityType String
  entityId   String?
  diff       Json?
  createdAt  DateTime @default(now())

  @@index([storeId, createdAt])
}
```

- [ ] **Step 3: Create the first migration**

In a second terminal: `npm run db` (leave running). Then:
```bash
npx prisma migrate dev --name init
```
Expected: `prisma/migrations/<timestamp>_init/migration.sql` created; client generated into `src/generated/prisma`.

- [ ] **Step 4: DB types and singleton**

`src/core/db.ts`:
```ts
import type { Prisma, PrismaClient } from '@/generated/prisma/client';

/** Anything that can run queries: the root client or a transaction client. */
export type DbClient = PrismaClient | Prisma.TransactionClient;
```

`src/server/db.ts`:
```ts
import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 5: Integration harness**

`tests/setup/global-int.ts`:
```ts
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { TestProject } from 'vitest/node';
import { startPostgres } from '../../scripts/lib/postgres';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const dir = mkdtempSync(path.join(tmpdir(), 'shop-int-'));
  const { pg, url } = await startPostgres({ dir, port: 54330, database: 'shop_test', persistent: false });
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit' });
  project.provide('databaseUrl', url);
  return async () => {
    await pg.stop();
  };
}
```

`tests/helpers/db.ts`:
```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { PrismaClient } from '@/generated/prisma/client';

let client: PrismaClient | undefined;

export function testDb(): PrismaClient {
  client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('databaseUrl') }) });
  return client;
}

export async function resetDb(db: PrismaClient): Promise<void> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export async function makeStore(db: PrismaClient, slug = 'default') {
  return db.store.create({ data: { slug } });
}
```

- [ ] **Step 6: Write the integration smoke test**

`src/core/db.int.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../tests/helpers/db';

const db = testDb();
beforeEach(() => resetDb(db));
afterAll(() => db.$disconnect());

describe('database harness', () => {
  it('creates and reads a store', async () => {
    const store = await makeStore(db, 'acme');
    const found = await db.store.findUnique({ where: { slug: 'acme' } });
    expect(found?.id).toBe(store.id);
  });

  it('resetDb empties tables between tests', async () => {
    expect(await db.store.count()).toBe(0);
  });
});
```

- [ ] **Step 7: Run integration tests**

Run: `npm run test:int`
Expected: PASS, 2 tests (first run downloads nothing extra; Postgres binaries come from the `@embedded-postgres/*` optional dependency).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(db): add Prisma schema, embedded Postgres and integration test harness"
```

---

### Task 3: Core primitives — errors, locales, localize, brand config

**Files:**
- Create: `src/core/errors.ts`, `src/core/i18n/locales.ts`, `src/core/i18n/localize.ts`, `src/brand/brand.config.ts`
- Test: `src/core/errors.test.ts`, `src/core/i18n/localize.test.ts`

**Interfaces:**
- Produces:
  - `type ErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'RATE_LIMITED'`
  - `class DomainError extends Error { code: ErrorCode; details?: { fieldErrors?: Record<string, string[]> } }`
  - `isDomainError(e: unknown): e is DomainError`
  - `LOCALES = ['en','ar'] as const`, `type Locale`, `DEFAULT_LOCALE: Locale = 'en'`, `isLocale(v: string): v is Locale`, `isRtl(locale: string): boolean`
  - `type Localized = Partial<Record<Locale, string>>`, `localize(value: Localized | null | undefined, locale: string, fallback?: Locale): string`
  - `brand: { name: Localized; primaryColor: string; radius: number; defaultLocale: Locale; enabledLocales: readonly Locale[]; currency: string }`

- [ ] **Step 1: Write failing tests**

`src/core/errors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DomainError, isDomainError } from './errors';

describe('DomainError', () => {
  it('carries a code and optional field errors', () => {
    const err = new DomainError('VALIDATION', 'bad input', { fieldErrors: { email: ['INVALID'] } });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toBe('bad input');
    expect(err.details?.fieldErrors?.email).toEqual(['INVALID']);
  });

  it('defaults the message to the code', () => {
    expect(new DomainError('NOT_FOUND').message).toBe('NOT_FOUND');
  });

  it('isDomainError distinguishes domain errors from other errors', () => {
    expect(isDomainError(new DomainError('FORBIDDEN'))).toBe(true);
    expect(isDomainError(new Error('x'))).toBe(false);
    expect(isDomainError('FORBIDDEN')).toBe(false);
  });
});
```

`src/core/i18n/localize.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isLocale, isRtl } from './locales';
import { localize } from './localize';

describe('localize', () => {
  it('returns the requested locale', () => {
    expect(localize({ en: 'Hats', ar: 'قبعات' }, 'ar')).toBe('قبعات');
  });

  it('falls back to English when the Arabic value is missing', () => {
    expect(localize({ en: 'Hats' }, 'ar')).toBe('Hats');
  });

  it('falls back to English when the Arabic value is blank', () => {
    expect(localize({ en: 'Hats', ar: '   ' }, 'ar')).toBe('Hats');
  });

  it('falls back to any non-empty value when English is also missing', () => {
    expect(localize({ ar: 'قبعات' }, 'en')).toBe('قبعات');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(localize(null, 'en')).toBe('');
    expect(localize(undefined, 'en')).toBe('');
    expect(localize({}, 'en')).toBe('');
  });
});

describe('locales', () => {
  it('recognises supported locales only', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });

  it('marks Arabic as right-to-left', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./errors`, `./locales`, `./localize`.

- [ ] **Step 3: Implement**

`src/core/errors.ts`:
```ts
export type ErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'RATE_LIMITED';

export type ErrorDetails = { fieldErrors?: Record<string, string[]> };

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;

  constructor(code: ErrorCode, message?: string, details?: ErrorDetails) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
```

`src/core/i18n/locales.ts`:
```ts
export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const RTL_LOCALES: readonly string[] = ['ar'];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}
```

`src/core/i18n/localize.ts`:
```ts
import type { Locale } from './locales';

export type Localized = Partial<Record<Locale, string>>;

function nonBlank(v: string | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function localize(
  value: Localized | null | undefined,
  locale: string,
  fallback: Locale = 'en',
): string {
  if (!value) return '';
  const requested = (value as Record<string, string | undefined>)[locale];
  if (nonBlank(requested)) return requested;
  if (nonBlank(value[fallback])) return value[fallback];
  return Object.values(value).find(nonBlank) ?? '';
}
```

`src/brand/brand.config.ts`:
```ts
import type { Locale } from '@/core/i18n/locales';
import type { Localized } from '@/core/i18n/localize';

/** Per-client defaults. Edit when setting up a new client; admin Settings override these at runtime. */
export const brand: {
  name: Localized;
  primaryColor: string;
  radius: number;
  defaultLocale: Locale;
  enabledLocales: readonly Locale[];
  currency: string;
} = {
  name: { en: 'My Store', ar: 'متجري' },
  primaryColor: '#e8590c',
  radius: 0.75,
  defaultLocale: 'en',
  enabledLocales: ['en', 'ar'],
  currency: 'EGP',
};
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): add domain errors, locales, localize and brand config"
```

---

### Task 4: Permissions and password hashing

**Files:**
- Create: `src/core/auth/permissions.ts`, `src/core/auth/password.ts`
- Test: `src/core/auth/permissions.test.ts`, `src/core/auth/password.test.ts`

**Interfaces:**
- Consumes: `DomainError` (Task 3)
- Produces:
  - `PERMISSIONS` (readonly tuple, list below), `type Permission`, `OWNER_ROLE_NAME = 'Owner'`
  - `type RoleLike = { name: string; isSystem: boolean; permissions: string[] }`
  - `hasPermission(role: RoleLike, perm: Permission): boolean`
  - `assertPermission(role: RoleLike, perm: Permission): void` (throws `DomainError('FORBIDDEN')`)
  - `hashPassword(plain: string): Promise<string>`, `verifyPassword(hash: string, plain: string): Promise<boolean>`

- [ ] **Step 1: Write failing tests**

`src/core/auth/permissions.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { assertPermission, hasPermission, OWNER_ROLE_NAME, PERMISSIONS } from './permissions';

const owner = { name: OWNER_ROLE_NAME, isSystem: true, permissions: [] };
const editor = { name: 'Editor', isSystem: false, permissions: ['products.read', 'products.write'] };
const fakeOwner = { name: OWNER_ROLE_NAME, isSystem: false, permissions: [] };

describe('permissions', () => {
  it('includes the spec permission set', () => {
    expect(PERMISSIONS).toContain('dashboard.read');
    expect(PERMISSIONS).toContain('orders.update_status');
    expect(PERMISSIONS).toContain('ai.use');
  });

  it('system Owner role has every permission regardless of its list', () => {
    for (const p of PERMISSIONS) expect(hasPermission(owner, p)).toBe(true);
  });

  it('a non-system role named Owner gets no special treatment', () => {
    expect(hasPermission(fakeOwner, 'settings.write')).toBe(false);
  });

  it('regular roles have only listed permissions', () => {
    expect(hasPermission(editor, 'products.write')).toBe(true);
    expect(hasPermission(editor, 'products.delete')).toBe(false);
  });

  it('assertPermission throws FORBIDDEN when missing', () => {
    expect(() => assertPermission(editor, 'settings.write')).toThrow(DomainError);
    try {
      assertPermission(editor, 'settings.write');
    } catch (e) {
      expect((e as DomainError).code).toBe('FORBIDDEN');
    }
    expect(() => assertPermission(editor, 'products.read')).not.toThrow();
  });
});
```

`src/core/auth/password.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('produces an argon2id hash that verifies', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'correct horse')).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('correct horse');
    expect(await verifyPassword(hash, 'Correct horse')).toBe(false);
  });

  it('returns false (does not throw) for a malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'whatever')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/core/auth/permissions.ts`:
```ts
import { DomainError } from '../errors';

export const PERMISSIONS = [
  'dashboard.read',
  'analytics.read',
  'products.read',
  'products.write',
  'products.delete',
  'categories.read',
  'categories.write',
  'orders.read',
  'orders.update_status',
  'orders.refund',
  'customers.read',
  'customers.write',
  'customers.delete',
  'admins.read',
  'admins.write',
  'roles.write',
  'coupons.write',
  'campaigns.write',
  'messages.read',
  'settings.read',
  'settings.write',
  'ai.use',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const OWNER_ROLE_NAME = 'Owner';

export type RoleLike = { name: string; isSystem: boolean; permissions: string[] };

export function hasPermission(role: RoleLike, perm: Permission): boolean {
  if (role.isSystem && role.name === OWNER_ROLE_NAME) return true;
  return role.permissions.includes(perm);
}

export function assertPermission(role: RoleLike, perm: Permission): void {
  if (!hasPermission(role, perm)) throw new DomainError('FORBIDDEN', `Missing permission ${perm}`);
}
```

`src/core/auth/password.ts`:
```ts
import { hash, verify } from '@node-rs/argon2';

export const PASSWORD_MIN_LENGTH = 8;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain); // argon2id with library defaults
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add permission model and argon2 password hashing"
```

---

### Task 5: Sessions

**Files:**
- Create: `src/core/auth/sessions.ts`
- Test: `src/core/auth/sessions.int.test.ts`

**Interfaces:**
- Consumes: `DbClient` (Task 2)
- Produces:
  - `type Realm = 'ADMIN' | 'CUSTOMER'`, `SESSION_TTL_MS: Record<Realm, number>` (ADMIN 12h, CUSTOMER 30d)
  - `hashToken(token: string): string`
  - `createSession(db, { storeId, realm, subjectId, now? }): Promise<{ token: string; expiresAt: Date }>`
  - `validateSession(db, { token: string | undefined; realm; now? }): Promise<ValidSession | null>` where `ValidSession = { sessionId, storeId, realm, subjectId, expiresAt }`
  - `revokeSession(db, token: string): Promise<void>`, `revokeAllSessions(db, realm, subjectId): Promise<void>`

- [ ] **Step 1: Write failing tests**

`src/core/auth/sessions.int.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../../tests/helpers/db';
import { createSession, hashToken, revokeAllSessions, revokeSession, SESSION_TTL_MS, validateSession } from './sessions';

const db = testDb();
afterAll(() => db.$disconnect());

let storeId: string;
let adminId: string;
let customerId: string;

beforeEach(async () => {
  await resetDb(db);
  storeId = (await makeStore(db)).id;
  const role = await db.role.create({ data: { storeId, name: 'Staff', permissions: [] } });
  adminId = (await db.admin.create({
    data: { storeId, name: 'A', email: 'a@x.com', passwordHash: 'h', roleId: role.id },
  })).id;
  customerId = (await db.customer.create({
    data: { storeId, name: 'C', email: 'c@x.com', passwordHash: 'h' },
  })).id;
});

describe('sessions', () => {
  it('stores only the token hash and validates the raw token', async () => {
    const { token, expiresAt } = await createSession(db, { storeId, realm: 'CUSTOMER', subjectId: customerId });
    const row = await db.session.findFirstOrThrow();
    expect(row.tokenHash).toBe(hashToken(token));
    expect(row.tokenHash).not.toContain(token);
    const s = await validateSession(db, { token, realm: 'CUSTOMER' });
    expect(s).toMatchObject({ subjectId: customerId, storeId, realm: 'CUSTOMER' });
    expect(s?.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it('rejects a customer token presented in the admin realm', async () => {
    const { token } = await createSession(db, { storeId, realm: 'CUSTOMER', subjectId: customerId });
    expect(await validateSession(db, { token, realm: 'ADMIN' })).toBeNull();
  });

  it('rejects missing and unknown tokens', async () => {
    expect(await validateSession(db, { token: undefined, realm: 'ADMIN' })).toBeNull();
    expect(await validateSession(db, { token: 'nope', realm: 'ADMIN' })).toBeNull();
  });

  it('expires sessions after the realm TTL and deletes them', async () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const { token } = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId, now });
    const justBefore = new Date(now.getTime() + SESSION_TTL_MS.ADMIN - 1);
    expect(await validateSession(db, { token, realm: 'ADMIN', now: justBefore })).not.toBeNull();
    const after = new Date(now.getTime() + SESSION_TTL_MS.ADMIN);
    expect(await validateSession(db, { token, realm: 'ADMIN', now: after })).toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it('invalidates sessions of a deactivated admin', async () => {
    const { token } = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId });
    await db.admin.update({ where: { id: adminId }, data: { isActive: false } });
    expect(await validateSession(db, { token, realm: 'ADMIN' })).toBeNull();
  });

  it('invalidates sessions of a soft-deleted customer', async () => {
    const { token } = await createSession(db, { storeId, realm: 'CUSTOMER', subjectId: customerId });
    await db.customer.update({ where: { id: customerId }, data: { deletedAt: new Date() } });
    expect(await validateSession(db, { token, realm: 'CUSTOMER' })).toBeNull();
  });

  it('revokes one session or all sessions of a subject', async () => {
    const a = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId });
    const b = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId });
    await revokeSession(db, a.token);
    expect(await validateSession(db, { token: a.token, realm: 'ADMIN' })).toBeNull();
    expect(await validateSession(db, { token: b.token, realm: 'ADMIN' })).not.toBeNull();
    await revokeAllSessions(db, 'ADMIN', adminId);
    expect(await validateSession(db, { token: b.token, realm: 'ADMIN' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:int`
Expected: FAIL — `./sessions` not found.

- [ ] **Step 3: Implement**

`src/core/auth/sessions.ts`:
```ts
import { createHash, randomBytes } from 'node:crypto';
import type { DbClient } from '../db';

export type Realm = 'ADMIN' | 'CUSTOMER';

const HOUR = 60 * 60 * 1000;
export const SESSION_TTL_MS: Record<Realm, number> = {
  ADMIN: 12 * HOUR,
  CUSTOMER: 30 * 24 * HOUR,
};

export type ValidSession = {
  sessionId: string;
  storeId: string;
  realm: Realm;
  subjectId: string;
  expiresAt: Date;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  db: DbClient,
  input: { storeId: string; realm: Realm; subjectId: string; now?: Date },
): Promise<{ token: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS[input.realm]);
  await db.session.create({
    data: {
      storeId: input.storeId,
      realm: input.realm,
      subjectId: input.subjectId,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: now,
    },
  });
  return { token, expiresAt };
}

export async function validateSession(
  db: DbClient,
  input: { token: string | undefined; realm: Realm; now?: Date },
): Promise<ValidSession | null> {
  if (!input.token) return null;
  const now = input.now ?? new Date();
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(input.token) } });
  if (!session || session.realm !== input.realm) return null;
  if (session.expiresAt <= now) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  const subjectActive =
    input.realm === 'ADMIN'
      ? await db.admin.count({ where: { id: session.subjectId, isActive: true } })
      : await db.customer.count({ where: { id: session.subjectId, deletedAt: null } });
  if (!subjectActive) return null;
  return {
    sessionId: session.id,
    storeId: session.storeId,
    realm: input.realm,
    subjectId: session.subjectId,
    expiresAt: session.expiresAt,
  };
}

export async function revokeSession(db: DbClient, token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function revokeAllSessions(db: DbClient, realm: Realm, subjectId: string): Promise<void> {
  await db.session.deleteMany({ where: { realm, subjectId } });
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:int`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add hashed, realm-scoped sessions"
```

---

### Task 6: Login, registration, rate limiting, audit log

**Files:**
- Create: `src/core/auth/schemas.ts`, `src/core/auth/login.ts`, `src/core/audit.ts`
- Test: `src/core/auth/login.int.test.ts`

**Interfaces:**
- Consumes: `DbClient`, `DomainError`, `hashPassword/verifyPassword`, `createSession`
- Produces:
  - `signInSchema`, `signUpSchema` (zod; field names `email`, `password`, `name`, `phone`)
  - `normalizeEmail(email: string): string`
  - `RATE_LIMIT = { maxFailures: 5, windowMs: 900_000 }`
  - `loginAdmin(db, { storeId, email, password, now? }): Promise<{ token; expiresAt; adminId }>`
  - `loginCustomer(db, { storeId, email, password, now? }): Promise<{ token; expiresAt; customerId }>`
  - `registerCustomer(db, { storeId, name, email, password, phone?, now? }): Promise<{ token; expiresAt; customerId }>`
  - `recordAudit(db, { storeId, adminId?, action, entityType, entityId?, diff? }): Promise<void>`
  - Errors thrown: `VALIDATION` (with `fieldErrors`), `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `RATE_LIMITED`

- [ ] **Step 1: Write failing tests**

`src/core/auth/login.int.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../../tests/helpers/db';
import type { ErrorCode } from '../errors';
import { loginAdmin, loginCustomer, normalizeEmail, RATE_LIMIT, registerCustomer } from './login';
import { hashPassword } from './password';
import { validateSession } from './sessions';

const db = testDb();
afterAll(() => db.$disconnect());

let storeId: string;
beforeEach(async () => {
  await resetDb(db);
  storeId = (await makeStore(db)).id;
});

async function expectCode(p: Promise<unknown>, code: ErrorCode) {
  await expect(p).rejects.toMatchObject({ code });
}

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Sara@Example.COM ')).toBe('sara@example.com');
  });
});

describe('registerCustomer', () => {
  it('creates a customer with normalized email and returns a valid session', async () => {
    const r = await registerCustomer(db, { storeId, name: 'Sara', email: ' Sara@Example.com ', password: 'secret123' });
    const c = await db.customer.findUniqueOrThrow({ where: { id: r.customerId } });
    expect(c.email).toBe('sara@example.com');
    expect(c.passwordHash).not.toBe('secret123');
    expect(await validateSession(db, { token: r.token, realm: 'CUSTOMER' })).not.toBeNull();
  });

  it('rejects a duplicate email differing only by case', async () => {
    await registerCustomer(db, { storeId, name: 'Sara', email: 'sara@example.com', password: 'secret123' });
    await expectCode(
      registerCustomer(db, { storeId, name: 'Sara 2', email: 'SARA@example.com', password: 'secret123' }),
      'EMAIL_TAKEN',
    );
  });

  it('validates input and reports field errors', async () => {
    const p = registerCustomer(db, { storeId, name: '', email: 'not-an-email', password: 'short' });
    await expect(p).rejects.toMatchObject({ code: 'VALIDATION' });
    const err = await p.catch((e) => e);
    expect(Object.keys(err.details.fieldErrors).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('loginCustomer', () => {
  beforeEach(async () => {
    await registerCustomer(db, { storeId, name: 'Sara', email: 'sara@example.com', password: 'secret123' });
  });

  it('signs in regardless of email case/whitespace', async () => {
    const r = await loginCustomer(db, { storeId, email: '  SARA@example.com', password: 'secret123' });
    expect(await validateSession(db, { token: r.token, realm: 'CUSTOMER' })).not.toBeNull();
  });

  it('rejects wrong password and unknown email with the same error', async () => {
    await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'nope-nope' }), 'INVALID_CREDENTIALS');
    await expectCode(loginCustomer(db, { storeId, email: 'who@example.com', password: 'secret123' }), 'INVALID_CREDENTIALS');
  });

  it('rejects a soft-deleted customer', async () => {
    await db.customer.updateMany({ data: { deletedAt: new Date() } });
    await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'secret123' }), 'INVALID_CREDENTIALS');
  });

  it(`rate-limits after ${RATE_LIMIT.maxFailures} failures, even with the right password, until the window passes`, async () => {
    const t0 = new Date('2026-01-01T10:00:00Z');
    for (let i = 0; i < RATE_LIMIT.maxFailures; i++) {
      await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'wrong-pass', now: t0 }), 'INVALID_CREDENTIALS');
    }
    await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'secret123', now: t0 }), 'RATE_LIMITED');
    const later = new Date(t0.getTime() + RATE_LIMIT.windowMs + 1000);
    await expect(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'secret123', now: later })).resolves.toHaveProperty('token');
  });
});

describe('loginAdmin', () => {
  let adminId: string;
  beforeEach(async () => {
    const role = await db.role.create({ data: { storeId, name: 'Staff', permissions: [] } });
    adminId = (await db.admin.create({
      data: { storeId, name: 'Omar', email: 'omar@example.com', passwordHash: await hashPassword('adminpass1'), roleId: role.id },
    })).id;
  });

  it('signs in, records lastLoginAt and an audit entry', async () => {
    const now = new Date('2026-02-02T08:00:00Z');
    const r = await loginAdmin(db, { storeId, email: 'Omar@Example.com', password: 'adminpass1', now });
    expect(r.adminId).toBe(adminId);
    expect(await validateSession(db, { token: r.token, realm: 'ADMIN', now })).not.toBeNull();
    const admin = await db.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.lastLoginAt?.toISOString()).toBe(now.toISOString());
    const audit = await db.auditLog.findFirstOrThrow();
    expect(audit).toMatchObject({ action: 'auth.login', adminId, entityType: 'Admin', entityId: adminId });
  });

  it('rejects an inactive admin', async () => {
    await db.admin.update({ where: { id: adminId }, data: { isActive: false } });
    await expectCode(loginAdmin(db, { storeId, email: 'omar@example.com', password: 'adminpass1' }), 'INVALID_CREDENTIALS');
  });

  it('admin and customer rate limits are counted separately', async () => {
    const t0 = new Date('2026-01-01T10:00:00Z');
    for (let i = 0; i < RATE_LIMIT.maxFailures; i++) {
      await expectCode(loginCustomer(db, { storeId, email: 'omar@example.com', password: 'x-x-x-x-x', now: t0 }), 'INVALID_CREDENTIALS');
    }
    await expect(loginAdmin(db, { storeId, email: 'omar@example.com', password: 'adminpass1', now: t0 })).resolves.toHaveProperty('token');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:int`
Expected: FAIL — `./login` not found.

- [ ] **Step 3: Implement**

`src/core/auth/schemas.ts`:
```ts
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './password';

export const signInSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
  phone: z.string().trim().max(30).optional(),
});
```

`src/core/audit.ts`:
```ts
import type { Prisma } from '@/generated/prisma/client';
import type { DbClient } from './db';

export async function recordAudit(
  db: DbClient,
  entry: {
    storeId: string;
    adminId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    diff?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.auditLog.create({
    data: {
      storeId: entry.storeId,
      adminId: entry.adminId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      diff: entry.diff,
    },
  });
}
```

`src/core/auth/login.ts`:
```ts
import { z } from 'zod';
import { recordAudit } from '../audit';
import type { DbClient } from '../db';
import { DomainError } from '../errors';
import { hashPassword, verifyPassword } from './password';
import { signInSchema, signUpSchema } from './schemas';
import { createSession, type Realm } from './sessions';

export const RATE_LIMIT = { maxFailures: 5, windowMs: 15 * 60 * 1000 };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validationError(error: z.ZodError): DomainError {
  return new DomainError('VALIDATION', 'Invalid input', {
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  });
}

async function assertNotRateLimited(db: DbClient, storeId: string, realm: Realm, email: string, now: Date) {
  const since = new Date(now.getTime() - RATE_LIMIT.windowMs);
  const failures = await db.loginAttempt.count({
    where: { storeId, realm, email, success: false, createdAt: { gt: since } },
  });
  if (failures >= RATE_LIMIT.maxFailures) throw new DomainError('RATE_LIMITED');
}

let dummyHash: Promise<string> | undefined;
/** Spend comparable time when the account does not exist, so response time does not reveal it. */
async function burnVerifyTime(password: string): Promise<false> {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(await dummyHash, password);
  return false;
}

async function recordAttempt(db: DbClient, storeId: string, realm: Realm, email: string, success: boolean, now: Date) {
  await db.loginAttempt.create({ data: { storeId, realm, email, success, createdAt: now } });
}

type LoginInput = { storeId: string; email: string; password: string; now?: Date };

export async function loginAdmin(db: DbClient, input: LoginInput) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  const now = input.now ?? new Date();
  const email = normalizeEmail(parsed.data.email);
  await assertNotRateLimited(db, input.storeId, 'ADMIN', email, now);

  const admin = await db.admin.findUnique({ where: { storeId_email: { storeId: input.storeId, email } } });
  const ok =
    admin && admin.isActive
      ? await verifyPassword(admin.passwordHash, parsed.data.password)
      : await burnVerifyTime(parsed.data.password);
  await recordAttempt(db, input.storeId, 'ADMIN', email, ok, now);
  if (!ok || !admin) throw new DomainError('INVALID_CREDENTIALS');

  await db.admin.update({ where: { id: admin.id }, data: { lastLoginAt: now } });
  await recordAudit(db, {
    storeId: input.storeId,
    adminId: admin.id,
    action: 'auth.login',
    entityType: 'Admin',
    entityId: admin.id,
  });
  const session = await createSession(db, { storeId: input.storeId, realm: 'ADMIN', subjectId: admin.id, now });
  return { ...session, adminId: admin.id };
}

export async function loginCustomer(db: DbClient, input: LoginInput) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  const now = input.now ?? new Date();
  const email = normalizeEmail(parsed.data.email);
  await assertNotRateLimited(db, input.storeId, 'CUSTOMER', email, now);

  const customer = await db.customer.findUnique({ where: { storeId_email: { storeId: input.storeId, email } } });
  const ok =
    customer && !customer.deletedAt
      ? await verifyPassword(customer.passwordHash, parsed.data.password)
      : await burnVerifyTime(parsed.data.password);
  await recordAttempt(db, input.storeId, 'CUSTOMER', email, ok, now);
  if (!ok || !customer) throw new DomainError('INVALID_CREDENTIALS');

  const session = await createSession(db, { storeId: input.storeId, realm: 'CUSTOMER', subjectId: customer.id, now });
  return { ...session, customerId: customer.id };
}

export async function registerCustomer(
  db: DbClient,
  input: { storeId: string; name: string; email: string; password: string; phone?: string; now?: Date },
) {
  const parsed = signUpSchema.safeParse({ ...input, email: normalizeEmail(input.email) });
  if (!parsed.success) throw validationError(parsed.error);
  const { name, email, password, phone } = parsed.data;

  const existing = await db.customer.findUnique({ where: { storeId_email: { storeId: input.storeId, email } } });
  if (existing) throw new DomainError('EMAIL_TAKEN');

  let customerId: string;
  try {
    const created = await db.customer.create({
      data: { storeId: input.storeId, name, email, phone: phone || null, passwordHash: await hashPassword(password) },
    });
    customerId = created.id;
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') throw new DomainError('EMAIL_TAKEN');
    throw err;
  }
  const session = await createSession(db, { storeId: input.storeId, realm: 'CUSTOMER', subjectId: customerId, now: input.now });
  return { ...session, customerId };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test:int`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add admin/customer login, registration, rate limiting and audit log"
```

---

### Task 7: Store settings and brand theme CSS

**Files:**
- Create: `src/core/settings/schema.ts`, `src/core/settings/settings.ts`, `src/core/theme/palette.ts`
- Test: `src/core/settings/schema.test.ts`, `src/core/settings/settings.int.test.ts`, `src/core/theme/palette.test.ts`

**Interfaces:**
- Consumes: `brand`, `LOCALES`, `Localized`, `DbClient`
- Produces:
  - `settingsSchema` (lenient: every field `.catch(default)`), `type Settings = { storeName: Localized; logoLight: string|null; logoDark: string|null; primaryColor: string; radius: number; defaultLocale: Locale; enabledLocales: Locale[]; currency: string; contactEmail: string|null; contactPhone: string|null }`
  - `defaultSettings: Settings`, `readSettings(raw: unknown): Settings`
  - `getSettings(db, storeId): Promise<Settings>`
  - `DEFAULT_PRIMARY`, `normalizeHex(input, fallback?)`, `relativeLuminance(hex)`, `contrastRatio(a, b)`, `readableForeground(bg): '#ffffff' | '#000000'`, `buildThemeCss({ primaryColor, radius }): string`

- [ ] **Step 1: Write failing tests**

`src/core/theme/palette.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildThemeCss, contrastRatio, DEFAULT_PRIMARY, normalizeHex, readableForeground } from './palette';

describe('normalizeHex', () => {
  it('accepts 6-digit hex and lower-cases it', () => {
    expect(normalizeHex('#AABBCC')).toBe('#aabbcc');
  });
  it('expands 3-digit hex', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });
  it('falls back for invalid input', () => {
    expect(normalizeHex('red')).toBe(DEFAULT_PRIMARY);
    expect(normalizeHex('#12345g')).toBe(DEFAULT_PRIMARY);
    expect(normalizeHex(undefined)).toBe(DEFAULT_PRIMARY);
    expect(normalizeHex('#fff;}body{display:none')).toBe(DEFAULT_PRIMARY);
  });
});

describe('contrast', () => {
  it('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
  it('picks white text on navy and black text on yellow', () => {
    expect(readableForeground('#000080')).toBe('#ffffff');
    expect(readableForeground('#ffd43b')).toBe('#000000');
  });
});

describe('buildThemeCss', () => {
  it('emits primary, foreground, ring and radius variables for light and dark', () => {
    const css = buildThemeCss({ primaryColor: '#000080', radius: 0.5 });
    expect(css).toContain('html:root,html.dark{');
    expect(css).toContain('--primary:#000080;');
    expect(css).toContain('--primary-foreground:#ffffff;');
    expect(css).toContain('--ring:#000080;');
    expect(css).toContain('--radius:0.5rem;');
  });
  it('sanitizes bad values instead of emitting broken CSS', () => {
    const css = buildThemeCss({ primaryColor: 'javascript:alert(1)', radius: Number.NaN });
    expect(css).toContain(`--primary:${DEFAULT_PRIMARY};`);
    expect(css).toContain('--radius:0.75rem;');
  });
});
```

`src/core/settings/schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { brand } from '@/brand/brand.config';
import { defaultSettings, readSettings } from './schema';

describe('readSettings', () => {
  it('returns brand defaults for empty or non-object input', () => {
    expect(readSettings({})).toEqual(defaultSettings);
    expect(readSettings(null)).toEqual(defaultSettings);
    expect(readSettings('garbage')).toEqual(defaultSettings);
    expect(readSettings([1, 2])).toEqual(defaultSettings);
    expect(defaultSettings.storeName).toEqual(brand.name);
  });

  it('keeps valid stored values', () => {
    const s = readSettings({ primaryColor: '#123456', currency: 'USD', defaultLocale: 'ar' });
    expect(s.primaryColor).toBe('#123456');
    expect(s.currency).toBe('USD');
    expect(s.defaultLocale).toBe('ar');
  });

  it('replaces each invalid field with its default without discarding valid ones', () => {
    const s = readSettings({
      primaryColor: 'not-a-colour',
      defaultLocale: 'fr',
      enabledLocales: [],
      radius: 99,
      currency: 'usd',
      contactEmail: 'shop@example.com',
    });
    expect(s.primaryColor).toBe(defaultSettings.primaryColor);
    expect(s.defaultLocale).toBe(defaultSettings.defaultLocale);
    expect(s.enabledLocales).toEqual(defaultSettings.enabledLocales);
    expect(s.radius).toBe(defaultSettings.radius);
    expect(s.currency).toBe(defaultSettings.currency);
    expect(s.contactEmail).toBe('shop@example.com');
  });
});
```

`src/core/settings/settings.int.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../../tests/helpers/db';
import { defaultSettings } from './schema';
import { getSettings } from './settings';

const db = testDb();
afterAll(() => db.$disconnect());
let storeId: string;
beforeEach(async () => {
  await resetDb(db);
  storeId = (await makeStore(db)).id;
});

describe('getSettings', () => {
  it('returns defaults when the store has no settings row', async () => {
    expect(await getSettings(db, storeId)).toEqual(defaultSettings);
  });

  it('merges stored values over defaults', async () => {
    await db.settings.create({ data: { storeId, data: { storeName: { en: 'Nile Wear' }, primaryColor: '#0b7285' } } });
    const s = await getSettings(db, storeId);
    expect(s.storeName).toEqual({ en: 'Nile Wear' });
    expect(s.primaryColor).toBe('#0b7285');
    expect(s.currency).toBe(defaultSettings.currency);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test` then `npm run test:int`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`src/core/theme/palette.ts`:
```ts
export const DEFAULT_PRIMARY = '#e8590c';
const DEFAULT_RADIUS = 0.75;

export function normalizeHex(input: string | null | undefined, fallback = DEFAULT_PRIMARY): string {
  if (!input) return fallback;
  let v = input.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    v = `#${v.slice(1).split('').map((c) => c + c).join('')}`;
  }
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
}

export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(normalizeHex(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readableForeground(bg: string): '#ffffff' | '#000000' {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000') ? '#ffffff' : '#000000';
}

/**
 * CSS that overrides the shadcn brand variables. `html:root` / `html.dark` outrank the
 * `:root` / `.dark` rules in globals.css regardless of stylesheet order.
 */
export function buildThemeCss(input: { primaryColor: string; radius: number }): string {
  const primary = normalizeHex(input.primaryColor);
  const radius = Number.isFinite(input.radius) && input.radius >= 0 && input.radius <= 2 ? input.radius : DEFAULT_RADIUS;
  return (
    `html:root,html.dark{` +
    `--primary:${primary};` +
    `--primary-foreground:${readableForeground(primary)};` +
    `--ring:${primary};` +
    `--radius:${radius}rem;` +
    `}`
  );
}
```

`src/core/settings/schema.ts`:
```ts
import { z } from 'zod';
import { brand } from '@/brand/brand.config';
import { LOCALES } from '../i18n/locales';

const localizedSchema = z.object({
  en: z.string().max(200).optional(),
  ar: z.string().max(200).optional(),
});

export const defaultSettings = {
  storeName: { ...brand.name },
  logoLight: null as string | null,
  logoDark: null as string | null,
  primaryColor: brand.primaryColor,
  radius: brand.radius,
  defaultLocale: brand.defaultLocale,
  enabledLocales: [...brand.enabledLocales],
  currency: brand.currency,
  contactEmail: null as string | null,
  contactPhone: null as string | null,
};

/** Lenient reader: any invalid field silently falls back to its default. */
export const settingsSchema = z.object({
  storeName: localizedSchema.catch(defaultSettings.storeName),
  logoLight: z.string().nullable().catch(null),
  logoDark: z.string().nullable().catch(null),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch(defaultSettings.primaryColor),
  radius: z.number().min(0).max(2).catch(defaultSettings.radius),
  defaultLocale: z.enum(LOCALES).catch(defaultSettings.defaultLocale),
  enabledLocales: z.array(z.enum(LOCALES)).min(1).catch(defaultSettings.enabledLocales),
  currency: z.string().regex(/^[A-Z]{3}$/).catch(defaultSettings.currency),
  contactEmail: z.email().nullable().catch(null),
  contactPhone: z.string().max(30).nullable().catch(null),
});

export type Settings = z.infer<typeof settingsSchema>;

export function readSettings(raw: unknown): Settings {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return settingsSchema.parse(obj);
}
```

`src/core/settings/settings.ts`:
```ts
import type { DbClient } from '../db';
import { readSettings, type Settings } from './schema';

export async function getSettings(db: DbClient, storeId: string): Promise<Settings> {
  const row = await db.settings.findUnique({ where: { storeId } });
  return readSettings(row?.data);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test && npm run test:int`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(settings): add lenient store settings and brand theme CSS generation"
```

---

### Task 8: Foundation seed

**Files:**
- Create: `src/core/setup/seed-foundation.ts`, `prisma/seed.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/seed-fixtures.ts`
- Test: `src/core/setup/seed-foundation.int.test.ts`

**Interfaces:**
- Consumes: `PERMISSIONS`, `OWNER_ROLE_NAME`, `hashPassword`, `normalizeEmail`, `defaultSettings`, `verifyPassword`
- Produces:
  - `seedFoundation(db: PrismaClient, { storeSlug, owner: { name, email, password } }): Promise<{ storeId: string; ownerRoleId: string }>` — idempotent; never resets an existing owner's password
  - `E2E` credentials object (`tests/e2e/fixtures.ts`): `E2E.owner`, `E2E.viewer` (`{ name, email, password }`)
  - `seedE2eFixtures(db, storeId)` — creates role `Viewer` (no permissions) and admin `E2E.viewer`

- [ ] **Step 1: Write failing test**

`src/core/setup/seed-foundation.int.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDb, testDb } from '../../../tests/helpers/db';
import { OWNER_ROLE_NAME, PERMISSIONS } from '../auth/permissions';
import { verifyPassword } from '../auth/password';
import { getSettings } from '../settings/settings';
import { defaultSettings } from '../settings/schema';
import { seedFoundation } from './seed-foundation';

const db = testDb();
afterAll(() => db.$disconnect());
beforeEach(() => resetDb(db));

const input = { storeSlug: 'default', owner: { name: 'Owner', email: ' Owner@Example.com ', password: 'owner-pass-1' } };

describe('seedFoundation', () => {
  it('creates store, default settings, system Owner role and owner admin', async () => {
    const { storeId, ownerRoleId } = await seedFoundation(db, input);
    expect(await getSettings(db, storeId)).toEqual(defaultSettings);
    const role = await db.role.findUniqueOrThrow({ where: { id: ownerRoleId } });
    expect(role).toMatchObject({ name: OWNER_ROLE_NAME, isSystem: true });
    expect(role.permissions).toEqual([...PERMISSIONS]);
    const admin = await db.admin.findFirstOrThrow({ where: { storeId } });
    expect(admin.email).toBe('owner@example.com');
    expect(admin.roleId).toBe(ownerRoleId);
    expect(await verifyPassword(admin.passwordHash, 'owner-pass-1')).toBe(true);
  });

  it('is idempotent and does not overwrite an existing owner password', async () => {
    await seedFoundation(db, input);
    await seedFoundation(db, { ...input, owner: { ...input.owner, password: 'different-pass' } });
    expect(await db.store.count()).toBe(1);
    expect(await db.role.count()).toBe(1);
    expect(await db.admin.count()).toBe(1);
    const admin = await db.admin.findFirstOrThrow();
    expect(await verifyPassword(admin.passwordHash, 'owner-pass-1')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:int`
Expected: FAIL — `./seed-foundation` not found.

- [ ] **Step 3: Implement**

`src/core/setup/seed-foundation.ts`:
```ts
import type { PrismaClient } from '@/generated/prisma/client';
import { normalizeEmail } from '../auth/login';
import { hashPassword } from '../auth/password';
import { OWNER_ROLE_NAME, PERMISSIONS } from '../auth/permissions';
import { defaultSettings } from '../settings/schema';

export type SeedFoundationInput = {
  storeSlug: string;
  owner: { name: string; email: string; password: string };
};

export async function seedFoundation(db: PrismaClient, input: SeedFoundationInput) {
  const store = await db.store.upsert({
    where: { slug: input.storeSlug },
    create: { slug: input.storeSlug },
    update: {},
  });
  await db.settings.upsert({
    where: { storeId: store.id },
    create: { storeId: store.id, data: defaultSettings },
    update: {},
  });
  const ownerRole = await db.role.upsert({
    where: { storeId_name: { storeId: store.id, name: OWNER_ROLE_NAME } },
    create: { storeId: store.id, name: OWNER_ROLE_NAME, isSystem: true, permissions: [...PERMISSIONS] },
    update: { isSystem: true, permissions: [...PERMISSIONS] },
  });
  const email = normalizeEmail(input.owner.email);
  const existing = await db.admin.findUnique({ where: { storeId_email: { storeId: store.id, email } } });
  if (!existing) {
    await db.admin.create({
      data: {
        storeId: store.id,
        name: input.owner.name,
        email,
        passwordHash: await hashPassword(input.owner.password),
        roleId: ownerRole.id,
      },
    });
  }
  return { storeId: store.id, ownerRoleId: ownerRole.id };
}
```

`tests/e2e/fixtures.ts`:
```ts
/** Test-only credentials used by the e2e database. Never used outside the throwaway e2e DB. */
export const E2E = {
  owner: { name: 'E2E Owner', email: 'owner@example.com', password: 'OwnerPass-e2e-1' },
  viewer: { name: 'E2E Viewer', email: 'viewer@example.com', password: 'ViewerPass-e2e-1' },
} as const;
```

`tests/e2e/seed-fixtures.ts`:
```ts
import type { PrismaClient } from '../../src/generated/prisma/client';
import { hashPassword } from '../../src/core/auth/password';
import { E2E } from './fixtures';

export async function seedE2eFixtures(db: PrismaClient, storeId: string): Promise<void> {
  const role = await db.role.upsert({
    where: { storeId_name: { storeId, name: 'Viewer' } },
    create: { storeId, name: 'Viewer', permissions: [] },
    update: {},
  });
  const existing = await db.admin.findUnique({ where: { storeId_email: { storeId, email: E2E.viewer.email } } });
  if (!existing) {
    await db.admin.create({
      data: {
        storeId,
        name: E2E.viewer.name,
        email: E2E.viewer.email,
        passwordHash: await hashPassword(E2E.viewer.password),
        roleId: role.id,
      },
    });
  }
}
```

`prisma/seed.ts`:
```ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedFoundation } from '../src/core/setup/seed-foundation';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedE2eFixtures } from '../tests/e2e/seed-fixtures';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (see .env.example).');
  const { storeId } = await seedFoundation(db, {
    storeSlug: process.env.STORE_SLUG ?? 'default',
    owner: { name: process.env.SEED_ADMIN_NAME ?? 'Store Owner', email, password },
  });
  if (process.env.SEED_E2E_FIXTURES === '1') await seedE2eFixtures(db, storeId);
  console.log(`Seed complete for store "${process.env.STORE_SLUG ?? 'default'}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 4: Run tests and the real seed**

Run: `npm run test:int`
Expected: PASS.

With `npm run db` running in another terminal:
```bash
npm run setup
```
Expected: migrations up to date, then `Seed complete for store "default".`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(setup): add idempotent foundation seed and e2e fixtures"
```

---

### Task 9: i18n routing, root layout, theming, admin route guard

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`, `src/i18n/messages/en.json`, `src/i18n/messages/ar.json`, `src/server/cookie-names.ts`, `src/server/proxy-guard.ts`, `src/proxy.ts`, `src/server/store.ts`, `src/components/theme/theme-provider.tsx`, `src/components/theme/theme-toggle.tsx`, `src/components/i18n/locale-switcher.tsx`, `src/app/[locale]/layout.tsx`
- Modify: `next.config.ts`, `src/app/globals.css`
- Test: `src/server/proxy-guard.test.ts`

**Interfaces:**
- Consumes: `LOCALES`, `DEFAULT_LOCALE`, `isRtl`, `localize`, `getSettings`, `buildThemeCss`, `db`
- Produces:
  - `routing` (next-intl), `Link`, `redirect`, `usePathname`, `useRouter` from `@/i18n/navigation`
  - `SESSION_COOKIE: { ADMIN: 'adm_session'; CUSTOMER: 'cus_session' }`
  - `adminGuardRedirect(pathname: string, hasAdminCookie: boolean): string | null`
  - `getStoreId(): Promise<string>`, `getStoreSettings(): Promise<Settings>` (React-cached per request)
  - `<ThemeProvider>`, `<ThemeToggle>` (`data-testid="theme-toggle"`), `<LocaleSwitcher>` (`data-testid="locale-switch"`)
  - Message namespaces: `common`, `nav`, `home`, `auth`, `account`, `footer`, `admin`, `errors`

- [ ] **Step 1: Write failing test**

`src/server/proxy-guard.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { adminGuardRedirect } from './proxy-guard';

describe('adminGuardRedirect', () => {
  it('ignores storefront paths', () => {
    expect(adminGuardRedirect('/en', false)).toBeNull();
    expect(adminGuardRedirect('/ar/account', false)).toBeNull();
    expect(adminGuardRedirect('/en/administrator', false)).toBeNull();
  });

  it('sends signed-out visitors of admin pages to the login page in their locale', () => {
    expect(adminGuardRedirect('/en/admin', false)).toBe('/en/admin/login');
    expect(adminGuardRedirect('/ar/admin/products', false)).toBe('/ar/admin/login');
  });

  it('never redirects the login page itself', () => {
    expect(adminGuardRedirect('/en/admin/login', false)).toBeNull();
  });

  it('lets requests with an admin cookie through (the layout validates it)', () => {
    expect(adminGuardRedirect('/en/admin', true)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `./proxy-guard` not found.

- [ ] **Step 3: Implement guard and cookie names**

`src/server/cookie-names.ts`:
```ts
export const SESSION_COOKIE = { ADMIN: 'adm_session', CUSTOMER: 'cus_session' } as const;
```

`src/server/proxy-guard.ts`:
```ts
import { LOCALES } from '@/core/i18n/locales';

const ADMIN_PATH = new RegExp(`^/(${LOCALES.join('|')})/admin(/.*)?$`);

export function adminGuardRedirect(pathname: string, hasAdminCookie: boolean): string | null {
  const match = ADMIN_PATH.exec(pathname);
  if (!match) return null;
  const rest = match[2] ?? '';
  if (rest === '/login' || rest.startsWith('/login/')) return null;
  return hasAdminCookie ? null : `/${match[1]}/admin/login`;
}
```

Run: `npm test` — Expected: PASS.

- [ ] **Step 4: next-intl wiring**

`src/i18n/routing.ts`:
```ts
import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES } from '@/core/i18n/locales';

export const routing = defineRouting({ locales: LOCALES, defaultLocale: DEFAULT_LOCALE });
```

`src/i18n/navigation.ts`:
```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

`src/i18n/request.ts`:
```ts
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: (await import(`./messages/${locale}.json`)).default };
});
```

`next.config.ts`:
```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ['@node-rs/argon2'],
};

export default withNextIntl(nextConfig);
```

`src/proxy.ts`:
```ts
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE } from '@/server/cookie-names';
import { adminGuardRedirect } from '@/server/proxy-guard';

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const target = adminGuardRedirect(request.nextUrl.pathname, request.cookies.has(SESSION_COOKIE.ADMIN));
  if (target) return NextResponse.redirect(new URL(target, request.url));
  return intl(request);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
```

- [ ] **Step 5: Messages**

`src/i18n/messages/en.json`:
```json
{
  "common": {
    "switchTo": "العربية",
    "theme": { "toggle": "Toggle dark mode" }
  },
  "nav": {
    "home": "Home",
    "signIn": "Sign in",
    "account": "My account",
    "signOut": "Sign out"
  },
  "home": {
    "heroTitle": "Welcome to {storeName}",
    "heroSubtitle": "Our new collection is on its way."
  },
  "auth": {
    "signInTitle": "Sign in",
    "signUpTitle": "Create your account",
    "name": "Full name",
    "email": "Email",
    "password": "Password",
    "phone": "Phone (optional)",
    "passwordHint": "At least 8 characters",
    "submitSignIn": "Sign in",
    "submitSignUp": "Create account",
    "noAccount": "New here?",
    "createOne": "Create an account",
    "haveAccount": "Already have an account?"
  },
  "account": {
    "title": "My account",
    "greeting": "Hello, {name}"
  },
  "footer": {
    "rights": "© {year} {storeName}. All rights reserved."
  },
  "admin": {
    "loginTitle": "Admin sign in",
    "overview": "Overview",
    "welcome": "Welcome back, {name}",
    "overviewSoon": "Store metrics will appear here.",
    "goToStore": "Go to storefront",
    "signOut": "Sign out",
    "noAccess": "You don't have permission to view this page.",
    "sections": { "main": "Main" }
  },
  "errors": {
    "VALIDATION": "Please check the fields and try again.",
    "INVALID_CREDENTIALS": "Email or password is incorrect.",
    "EMAIL_TAKEN": "An account with this email already exists.",
    "RATE_LIMITED": "Too many attempts. Please try again in 15 minutes.",
    "FORBIDDEN": "You don't have permission to do that.",
    "NOT_FOUND": "Not found.",
    "UNKNOWN": "Something went wrong. Please try again."
  }
}
```

`src/i18n/messages/ar.json`:
```json
{
  "common": {
    "switchTo": "English",
    "theme": { "toggle": "تبديل الوضع الداكن" }
  },
  "nav": {
    "home": "الرئيسية",
    "signIn": "تسجيل الدخول",
    "account": "حسابي",
    "signOut": "تسجيل الخروج"
  },
  "home": {
    "heroTitle": "أهلاً بك في {storeName}",
    "heroSubtitle": "مجموعتنا الجديدة في الطريق."
  },
  "auth": {
    "signInTitle": "تسجيل الدخول",
    "signUpTitle": "إنشاء حساب جديد",
    "name": "الاسم بالكامل",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "phone": "رقم الهاتف (اختياري)",
    "passwordHint": "٨ أحرف على الأقل",
    "submitSignIn": "تسجيل الدخول",
    "submitSignUp": "إنشاء الحساب",
    "noAccount": "جديد هنا؟",
    "createOne": "أنشئ حساباً",
    "haveAccount": "لديك حساب بالفعل؟"
  },
  "account": {
    "title": "حسابي",
    "greeting": "مرحباً، {name}"
  },
  "footer": {
    "rights": "© {year} {storeName}. جميع الحقوق محفوظة."
  },
  "admin": {
    "loginTitle": "دخول الإدارة",
    "overview": "نظرة عامة",
    "welcome": "مرحباً بعودتك، {name}",
    "overviewSoon": "ستظهر مؤشرات المتجر هنا.",
    "goToStore": "الذهاب إلى المتجر",
    "signOut": "تسجيل الخروج",
    "noAccess": "ليست لديك صلاحية لعرض هذه الصفحة.",
    "sections": { "main": "الرئيسية" }
  },
  "errors": {
    "VALIDATION": "يرجى مراجعة الحقول والمحاولة مرة أخرى.",
    "INVALID_CREDENTIALS": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "EMAIL_TAKEN": "يوجد حساب بهذا البريد الإلكتروني بالفعل.",
    "RATE_LIMITED": "محاولات كثيرة. حاول مرة أخرى بعد ١٥ دقيقة.",
    "FORBIDDEN": "ليست لديك صلاحية للقيام بذلك.",
    "NOT_FOUND": "غير موجود.",
    "UNKNOWN": "حدث خطأ ما. حاول مرة أخرى."
  }
}
```

- [ ] **Step 6: Store loader, theme and locale components**

`src/server/store.ts`:
```ts
import 'server-only';
import { cache } from 'react';
import { getSettings } from '@/core/settings/settings';
import { db } from './db';

let cachedStoreId: string | undefined;

export async function getStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;
  const slug = process.env.STORE_SLUG ?? 'default';
  const store = await db.store.findUnique({ where: { slug } });
  if (!store) throw new Error(`Store "${slug}" not found. Run "npm run setup" first.`);
  cachedStoreId = store.id;
  return store.id;
}

export const getStoreSettings = cache(async () => getSettings(db, await getStoreId()));
```

`src/components/theme/theme-provider.tsx`:
```tsx
'use client';

export { ThemeProvider } from 'next-themes';
```

`src/components/theme/theme-toggle.tsx`:
```tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('common.theme');
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('toggle')}
      data-testid="theme-toggle"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
```

`src/components/i18n/locale-switcher.tsx`:
```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      data-testid="locale-switch"
      onClick={() => startTransition(() => router.replace(pathname, { locale: next }))}
    >
      {t('switchTo')}
    </Button>
  );
}
```

- [ ] **Step 7: Root layout and fonts**

`src/app/[locale]/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { isRtl } from '@/core/i18n/locales';
import { localize } from '@/core/i18n/localize';
import { buildThemeCss } from '@/core/theme/palette';
import { routing } from '@/i18n/routing';
import { getStoreSettings } from '@/server/store';
import '../globals.css';

export const dynamic = 'force-dynamic';

const latin = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-latin' });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
});

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const name = localize((await getStoreSettings()).storeName, locale);
  return { title: { default: name, template: `%s · ${name}` } };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const settings = await getStoreSettings();

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? 'rtl' : 'ltr'}
      className={`${latin.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: buildThemeCss(settings) }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

In `src/app/globals.css`, inside the existing `@theme inline { ... }` block add:
```css
  --font-sans: var(--font-latin), var(--font-arabic), ui-sans-serif, system-ui, sans-serif;
```
and at the end of the file add:
```css
[dir='rtl'] body {
  font-family: var(--font-arabic), var(--font-latin), ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 8: Verify build-level correctness**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass. (Pages arrive in Tasks 11–12; visiting `/en` now gives 404, which is expected.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(i18n): add locale routing, RTL layout, brand theme and admin route guard"
```

---

### Task 10: Server session glue and auth server actions

**Files:**
- Create: `src/server/action-result.ts`, `src/server/session.ts`, `src/server/actions/auth.ts`
- Test: `src/server/action-result.test.ts`

**Interfaces:**
- Consumes: `validateSession`, `revokeSession`, `loginAdmin`, `loginCustomer`, `registerCustomer`, `hasPermission`, `assertPermission`, `SESSION_COOKIE`, `getStoreId`, `db`
- Produces:
  - `type ActionState = { error?: ErrorCode | 'UNKNOWN'; fieldErrors?: Record<string, string[]> } | undefined`
  - `toActionState(err: unknown): NonNullable<ActionState>`
  - `setSessionCookie(realm, token, expiresAt)`, `clearSessionCookie(realm)`
  - `getCurrentAdmin(): Promise<CurrentAdmin | null>` where `CurrentAdmin = { id; name; email; storeId; role: { name; isSystem; permissions: string[] } }`
  - `getCurrentCustomer(): Promise<{ id; name; email } | null>`
  - `requireAdmin(locale: string): Promise<CurrentAdmin>` (redirects to `/{locale}/admin/login`)
  - `requireCustomer(locale: string)` (redirects to `/{locale}/auth/signin`)
  - `can(admin: CurrentAdmin, perm: Permission): boolean`, `requirePermission(perm): Promise<CurrentAdmin>` (throws `FORBIDDEN`)
  - Server actions (all `(prev: ActionState, formData: FormData) => Promise<ActionState>`, form fields `locale`, `email`, `password`, plus `name`, `phone` for sign-up): `customerSignInAction`, `customerSignUpAction`, `adminLoginAction`; and `(formData) => Promise<void>`: `customerSignOutAction`, `adminLogoutAction`

- [ ] **Step 1: Write failing test**

`src/server/action-result.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@/core/errors';
import { toActionState } from './action-result';

afterEach(() => vi.restoreAllMocks());

describe('toActionState', () => {
  it('maps domain errors to their code and field errors', () => {
    const err = new DomainError('VALIDATION', 'x', { fieldErrors: { email: ['bad'] } });
    expect(toActionState(err)).toEqual({ error: 'VALIDATION', fieldErrors: { email: ['bad'] } });
    expect(toActionState(new DomainError('RATE_LIMITED'))).toEqual({ error: 'RATE_LIMITED', fieldErrors: undefined });
  });

  it('maps unexpected errors to UNKNOWN and logs them', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(toActionState(new Error('db down'))).toEqual({ error: 'UNKNOWN' });
    expect(spy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `./action-result` not found.

- [ ] **Step 3: Implement**

`src/server/action-result.ts`:
```ts
import { type ErrorCode, isDomainError } from '@/core/errors';

export type ActionState =
  | { error?: ErrorCode | 'UNKNOWN'; fieldErrors?: Record<string, string[]> }
  | undefined;

export function toActionState(err: unknown): NonNullable<ActionState> {
  if (isDomainError(err)) return { error: err.code, fieldErrors: err.details?.fieldErrors };
  console.error(err);
  return { error: 'UNKNOWN' };
}
```

`src/server/session.ts`:
```ts
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { assertPermission, hasPermission, type Permission } from '@/core/auth/permissions';
import { type Realm, validateSession } from '@/core/auth/sessions';
import { DomainError } from '@/core/errors';
import { SESSION_COOKIE } from './cookie-names';
import { db } from './db';

export async function setSessionCookie(realm: Realm, token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE[realm], token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function readSessionToken(realm: Realm): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE[realm])?.value;
}

export async function clearSessionCookie(realm: Realm) {
  (await cookies()).delete(SESSION_COOKIE[realm]);
}

export const getCurrentAdmin = cache(async () => {
  const session = await validateSession(db, { token: await readSessionToken('ADMIN'), realm: 'ADMIN' });
  if (!session) return null;
  return db.admin.findUnique({
    where: { id: session.subjectId },
    select: {
      id: true,
      name: true,
      email: true,
      storeId: true,
      role: { select: { name: true, isSystem: true, permissions: true } },
    },
  });
});

export type CurrentAdmin = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

export const getCurrentCustomer = cache(async () => {
  const session = await validateSession(db, { token: await readSessionToken('CUSTOMER'), realm: 'CUSTOMER' });
  if (!session) return null;
  return db.customer.findUnique({
    where: { id: session.subjectId },
    select: { id: true, name: true, email: true },
  });
});

export async function requireAdmin(locale: string): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/${locale}/admin/login`);
  return admin;
}

export async function requireCustomer(locale: string) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/${locale}/auth/signin`);
  return customer;
}

export function can(admin: CurrentAdmin, perm: Permission): boolean {
  return hasPermission(admin.role, perm);
}

/** For server actions: throws FORBIDDEN instead of redirecting. */
export async function requirePermission(perm: Permission): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new DomainError('FORBIDDEN');
  assertPermission(admin.role, perm);
  return admin;
}
```

`src/server/actions/auth.ts`:
```ts
'use server';

import { redirect } from 'next/navigation';
import { loginAdmin, loginCustomer, registerCustomer } from '@/core/auth/login';
import { revokeSession } from '@/core/auth/sessions';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/core/i18n/locales';
import { type ActionState, toActionState } from '../action-result';
import { db } from '../db';
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../session';
import { getStoreId } from '../store';

function field(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === 'string' ? v : '';
}

function readLocale(fd: FormData): Locale {
  const v = field(fd, 'locale');
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export async function customerSignInAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const locale = readLocale(fd);
  try {
    const r = await loginCustomer(db, {
      storeId: await getStoreId(),
      email: field(fd, 'email'),
      password: field(fd, 'password'),
    });
    await setSessionCookie('CUSTOMER', r.token, r.expiresAt);
  } catch (err) {
    return toActionState(err);
  }
  redirect(`/${locale}/account`);
}

export async function customerSignUpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const locale = readLocale(fd);
  try {
    const r = await registerCustomer(db, {
      storeId: await getStoreId(),
      name: field(fd, 'name'),
      email: field(fd, 'email'),
      password: field(fd, 'password'),
      phone: field(fd, 'phone') || undefined,
    });
    await setSessionCookie('CUSTOMER', r.token, r.expiresAt);
  } catch (err) {
    return toActionState(err);
  }
  redirect(`/${locale}/account`);
}

export async function customerSignOutAction(fd: FormData): Promise<void> {
  const token = await readSessionToken('CUSTOMER');
  if (token) await revokeSession(db, token);
  await clearSessionCookie('CUSTOMER');
  redirect(`/${readLocale(fd)}`);
}

export async function adminLoginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const locale = readLocale(fd);
  try {
    const r = await loginAdmin(db, {
      storeId: await getStoreId(),
      email: field(fd, 'email'),
      password: field(fd, 'password'),
    });
    await setSessionCookie('ADMIN', r.token, r.expiresAt);
  } catch (err) {
    return toActionState(err);
  }
  redirect(`/${locale}/admin`);
}

export async function adminLogoutAction(fd: FormData): Promise<void> {
  const token = await readSessionToken('ADMIN');
  if (token) await revokeSession(db, token);
  await clearSessionCookie('ADMIN');
  redirect(`/${readLocale(fd)}/admin/login`);
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): add session cookies, current-user loaders and auth server actions"
```

---

### Task 11: Playwright harness + storefront shell and customer auth pages

**Files:**
- Create: `playwright.config.ts`, `scripts/e2e-server.ts`, `tests/e2e/storefront.spec.ts`, `src/components/forms/field.tsx`, `src/components/store/site-header.tsx`, `src/components/store/site-footer.tsx`, `src/components/store/sign-in-form.tsx`, `src/components/store/sign-up-form.tsx`, `src/app/[locale]/(store)/layout.tsx`, `src/app/[locale]/(store)/page.tsx`, `src/app/[locale]/(store)/auth/signin/page.tsx`, `src/app/[locale]/(store)/auth/signup/page.tsx`, `src/app/[locale]/(store)/account/page.tsx`

**Interfaces:**
- Consumes: Task 9 components/loaders, Task 10 actions and `getCurrentCustomer`/`requireCustomer`, `E2E` fixtures, `startPostgres`
- Produces: storefront routes `/{locale}`, `/{locale}/auth/signin`, `/{locale}/auth/signup`, `/{locale}/account`; `<Field>` form helper; e2e server on port 3100 with DB on 54331; test ids `store-name`, `account-link`, `form-error`, `theme-toggle`, `locale-switch`.

- [ ] **Step 1: Playwright config and e2e server**

```bash
npx playwright install chromium
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run e2e:server',
    url: `http://localhost:${PORT}/en`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
```

`scripts/e2e-server.ts`:
```ts
import { execSync, spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { E2E } from '../tests/e2e/fixtures';
import { startPostgres } from './lib/postgres';

const PORT = 3100;

async function main() {
  const dir = mkdtempSync(path.join(tmpdir(), 'shop-e2e-'));
  const { pg, url } = await startPostgres({ dir, port: 54331, database: 'shop_e2e', persistent: false });
  const env = {
    ...process.env,
    DATABASE_URL: url,
    STORE_SLUG: 'default',
    SEED_ADMIN_NAME: E2E.owner.name,
    SEED_ADMIN_EMAIL: E2E.owner.email,
    SEED_ADMIN_PASSWORD: E2E.owner.password,
    SEED_E2E_FIXTURES: '1',
  };
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npx prisma db seed', { env, stdio: 'inherit' });
  if (!process.env.E2E_SKIP_BUILD) execSync('npx next build', { env, stdio: 'inherit' });

  const app = spawn('npx', ['next', 'start', '-p', String(PORT)], { env, stdio: 'inherit', shell: true });
  const shutdown = async (code = 0) => {
    app.kill();
    await pg.stop();
    process.exit(code);
  };
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());
  app.on('exit', (code) => shutdown(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Write the failing storefront e2e spec**

`tests/e2e/storefront.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

const uniqueEmail = () => `shopper-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

test('root redirects to English home, LTR', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome to My Store');
});

test('switching to Arabic sets RTL and Arabic text', async ({ page }) => {
  await page.goto('/en');
  await page.getByTestId('locale-switch').click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('أهلاً بك في متجري');
});

test('sign up, sign out, then sign in with different email case', async ({ page }) => {
  const email = uniqueEmail();
  await page.goto('/en/auth/signup');
  await page.getByLabel('Full name').fill('Sara Ali');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('secret-pass-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByText('Hello, Sara Ali')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

  await page.goto('/en/auth/signin');
  await page.getByLabel('Email').fill(`  ${email.toUpperCase()} `);
  await page.getByLabel('Password').fill('secret-pass-1');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
});

test('wrong password shows a translated error', async ({ page }) => {
  await page.goto('/ar/auth/signin');
  await page.getByLabel('البريد الإلكتروني').fill('nobody@example.com');
  await page.getByLabel('كلمة المرور').fill('wrong-password');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page.getByTestId('form-error')).toHaveText('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
});

test('account page requires sign-in', async ({ page }) => {
  await page.goto('/en/account');
  await expect(page).toHaveURL(/\/en\/auth\/signin$/);
});

test('dark mode toggles and persists across reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/en');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
```

Run: `npm run test:e2e -- storefront`
Expected: FAIL (404 on `/en` — no pages yet).

- [ ] **Step 3: Form field helper**

`src/components/forms/field.tsx`:
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
};

export function Field({ label, name, hint, errors, id, ...inputProps }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} name={name} aria-describedby={hintId} aria-invalid={errors?.length ? true : undefined} {...inputProps} />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Header, footer, layout, home**

`src/components/store/site-header.tsx`:
```tsx
import { getLocale, getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { localize } from '@/core/i18n/localize';
import { Link } from '@/i18n/navigation';
import { getCurrentCustomer } from '@/server/session';
import { getStoreSettings } from '@/server/store';

export async function SiteHeader() {
  const [locale, t, settings, customer] = await Promise.all([
    getLocale(),
    getTranslations('nav'),
    getStoreSettings(),
    getCurrentCustomer(),
  ]);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight" data-testid="store-name">
          {localize(settings.storeName, locale)}
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            {t('home')}
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          {customer ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/account" data-testid="account-link">
                {t('account')}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/signin">{t('signIn')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
```

`src/components/store/site-footer.tsx`:
```tsx
import { getLocale, getTranslations } from 'next-intl/server';
import { localize } from '@/core/i18n/localize';
import { getStoreSettings } from '@/server/store';

export async function SiteFooter() {
  const [locale, t, settings] = await Promise.all([getLocale(), getTranslations('footer'), getStoreSettings()]);
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
        {t('rights', { year: new Date().getFullYear(), storeName: localize(settings.storeName, locale) })}
      </div>
    </footer>
  );
}
```

`src/app/[locale]/(store)/layout.tsx`:
```tsx
import { SiteFooter } from '@/components/store/site-footer';
import { SiteHeader } from '@/components/store/site-header';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
```

`src/app/[locale]/(store)/page.tsx`:
```tsx
import { getLocale, getTranslations } from 'next-intl/server';
import { localize } from '@/core/i18n/localize';
import { getStoreSettings } from '@/server/store';

export default async function HomePage() {
  const [locale, t, settings] = await Promise.all([getLocale(), getTranslations('home'), getStoreSettings()]);
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
        {t('heroTitle', { storeName: localize(settings.storeName, locale) })}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('heroSubtitle')}</p>
    </section>
  );
}
```

- [ ] **Step 5: Auth forms and pages**

`src/components/store/sign-in-form.tsx`:
```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { customerSignInAction } from '@/server/actions/auth';

export function SignInForm() {
  const [state, action, pending] = useActionState(customerSignInAction, undefined);
  const locale = useLocale();
  const t = useTranslations('auth');
  const te = useTranslations('errors');
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t('email')} name="email" type="email" autoComplete="email" required />
      <Field label={t('password')} name="password" type="password" autoComplete="current-password" required />
      {state?.error && (
        <p role="alert" data-testid="form-error" className="text-sm text-destructive">
          {te(state.error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submitSignIn')}
      </Button>
    </form>
  );
}
```

`src/components/store/sign-up-form.tsx`:
```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { customerSignUpAction } from '@/server/actions/auth';

export function SignUpForm() {
  const [state, action, pending] = useActionState(customerSignUpAction, undefined);
  const locale = useLocale();
  const t = useTranslations('auth');
  const te = useTranslations('errors');
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t('name')} name="name" autoComplete="name" required maxLength={100} errors={state?.fieldErrors?.name} />
      <Field label={t('email')} name="email" type="email" autoComplete="email" required errors={state?.fieldErrors?.email} />
      <Field
        label={t('password')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint={t('passwordHint')}
        errors={state?.fieldErrors?.password}
      />
      <Field label={t('phone')} name="phone" type="tel" autoComplete="tel" maxLength={30} />
      {state?.error && (
        <p role="alert" data-testid="form-error" className="text-sm text-destructive">
          {te(state.error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submitSignUp')}
      </Button>
    </form>
  );
}
```

`src/app/[locale]/(store)/auth/signin/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/store/sign-in-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getCurrentCustomer } from '@/server/session';

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await getCurrentCustomer()) redirect(`/${locale}/account`);
  const t = await getTranslations('auth');
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('signInTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInForm />
          <p className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/auth/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              {t('createOne')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

`src/app/[locale]/(store)/auth/signup/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/components/store/sign-up-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getCurrentCustomer } from '@/server/session';

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await getCurrentCustomer()) redirect(`/${locale}/account`);
  const t = await getTranslations('auth');
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('signUpTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignUpForm />
          <p className="text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link href="/auth/signin" className="font-medium text-primary underline-offset-4 hover:underline">
              {t('submitSignIn')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

`src/app/[locale]/(store)/account/page.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { customerSignOutAction } from '@/server/actions/auth';
import { requireCustomer } from '@/server/session';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const customer = await requireCustomer(locale);
  const [t, tn] = await Promise.all([getTranslations('account'), getTranslations('nav')]);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-lg">{t('greeting', { name: customer.name })}</p>
      <form action={customerSignOutAction}>
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="outline">
          {tn('signOut')}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Run storefront e2e**

Run: `npm run test:e2e -- storefront`
Expected: PASS, 6 tests. (The first run builds the app; allow a few minutes.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(store): add storefront shell, customer sign-in/up, account page and e2e harness"
```

---

### Task 12: Admin shell, login, overview, permission gating

**Files:**
- Create: `tests/e2e/admin.spec.ts`, `src/components/admin/nav.ts`, `src/components/admin/sidebar.tsx`, `src/components/admin/topbar.tsx`, `src/components/admin/admin-login-form.tsx`, `src/components/admin/no-access.tsx`, `src/app/[locale]/admin/login/page.tsx`, `src/app/[locale]/admin/(panel)/layout.tsx`, `src/app/[locale]/admin/(panel)/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin`, `getCurrentAdmin`, `can`, `adminLoginAction`, `adminLogoutAction`, `hasPermission`, `Permission`, `E2E`
- Produces: `ADMIN_NAV: { key: string; href: string; icon: LucideIcon; permission: Permission }[]` (message key `admin.<key>`); admin routes `/{locale}/admin/login`, `/{locale}/admin`; test ids `admin-welcome`, `no-access`, `form-error`.

- [ ] **Step 1: Write the failing admin e2e spec**

`tests/e2e/admin.spec.ts`:
```ts
import { expect, type Page, test } from '@playwright/test';
import { E2E } from './fixtures';

async function adminLogin(page: Page, email: string, password: string, locale = 'en') {
  await page.goto(`/${locale}/admin/login`);
  await page.getByLabel(locale === 'ar' ? 'البريد الإلكتروني' : 'Email').fill(email);
  await page.getByLabel(locale === 'ar' ? 'كلمة المرور' : 'Password').fill(password);
  await page.getByRole('button', { name: locale === 'ar' ? 'تسجيل الدخول' : 'Sign in' }).click();
}

test('signed-out visitor is sent to the admin login page', async ({ page }) => {
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});

test('owner signs in, sees overview, signs out', async ({ page }) => {
  await adminLogin(page, E2E.owner.email, E2E.owner.password);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByTestId('admin-welcome')).toHaveText(`Welcome back, ${E2E.owner.name}`);
  await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});

test('wrong admin password shows an error', async ({ page }) => {
  await adminLogin(page, E2E.owner.email, 'not-the-password');
  await expect(page.getByTestId('form-error')).toHaveText('Email or password is incorrect.');
});

test('a customer session does not grant admin access', async ({ page }) => {
  const email = `cust-${Date.now()}@example.com`;
  await page.goto('/en/auth/signup');
  await page.getByLabel('Full name').fill('Customer');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('secret-pass-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  // Put the customer token into the admin cookie: still rejected.
  const cookies = await page.context().cookies();
  const customer = cookies.find((c) => c.name === 'cus_session');
  expect(customer).toBeDefined();
  await page.context().addCookies([{ ...customer!, name: 'adm_session' }]);
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});

test('admin without dashboard permission sees no-access message', async ({ page }) => {
  await adminLogin(page, E2E.viewer.email, E2E.viewer.password);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByTestId('no-access')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveCount(0);
});

test('Arabic admin login is right-to-left', async ({ page }) => {
  await page.goto('/ar/admin/login');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'دخول الإدارة' })).toBeVisible();
});
```

Run: `npm run test:e2e -- admin`
Expected: FAIL (admin pages 404).

- [ ] **Step 2: Admin components**

`src/components/admin/nav.ts`:
```ts
import { LayoutDashboard, type LucideIcon } from 'lucide-react';
import type { Permission } from '@/core/auth/permissions';

/** Sidebar entries. Later milestones append items here. `key` is a message key under `admin`. */
export const ADMIN_NAV: { key: string; href: string; icon: LucideIcon; permission: Permission }[] = [
  { key: 'overview', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.read' },
];
```

`src/components/admin/sidebar.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { ADMIN_NAV } from '@/components/admin/nav';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function Sidebar({ allowedKeys }: { allowedKeys: string[] }) {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((i) => allowedKeys.includes(i.key));
  return (
    <aside className="border-b bg-card md:w-60 md:shrink-0 md:border-e md:border-b-0">
      <p className="hidden px-4 pt-6 pb-2 text-xs font-medium uppercase text-muted-foreground md:block">
        {t('sections.main')}
      </p>
      <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col">
        {items.map(({ key, href, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap',
                active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="size-4" />
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

`src/components/admin/topbar.tsx`:
```tsx
import { Store } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { localize } from '@/core/i18n/localize';
import { Link } from '@/i18n/navigation';
import { adminLogoutAction } from '@/server/actions/auth';
import { getStoreSettings } from '@/server/store';

export async function Topbar({ adminName }: { adminName: string }) {
  const [locale, t, settings] = await Promise.all([getLocale(), getTranslations('admin'), getStoreSettings()]);
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
      <span className="font-semibold">{localize(settings.storeName, locale)}</span>
      <div className="ms-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <Store className="size-4" />
            <span className="hidden sm:inline">{t('goToStore')}</span>
          </Link>
        </Button>
        <LocaleSwitcher />
        <ThemeToggle />
        <span className="hidden px-2 text-sm text-muted-foreground sm:inline">{adminName}</span>
        <form action={adminLogoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline" size="sm">
            {t('signOut')}
          </Button>
        </form>
      </div>
    </header>
  );
}
```

`src/components/admin/admin-login-form.tsx`:
```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { adminLoginAction } from '@/server/actions/auth';

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, undefined);
  const locale = useLocale();
  const t = useTranslations('auth');
  const te = useTranslations('errors');
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t('email')} name="email" type="email" autoComplete="username" required />
      <Field label={t('password')} name="password" type="password" autoComplete="current-password" required />
      {state?.error && (
        <p role="alert" data-testid="form-error" className="text-sm text-destructive">
          {te(state.error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submitSignIn')}
      </Button>
    </form>
  );
}
```

`src/components/admin/no-access.tsx`:
```tsx
import { ShieldAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function NoAccess() {
  const t = await getTranslations('admin');
  return (
    <div data-testid="no-access" className="flex flex-col items-center gap-3 py-24 text-center text-muted-foreground">
      <ShieldAlert className="size-10" />
      <p>{t('noAccess')}</p>
    </div>
  );
}
```

- [ ] **Step 3: Admin routes**

`src/app/[locale]/admin/login/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminLoginForm } from '@/components/admin/admin-login-form';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAdmin } from '@/server/session';

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (await getCurrentAdmin()) redirect(`/${locale}/admin`);
  const t = await getTranslations('admin');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-muted/40 px-4">
      <div className="flex gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>{t('loginTitle')}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

`src/app/[locale]/admin/(panel)/layout.tsx`:
```tsx
import { ADMIN_NAV } from '@/components/admin/nav';
import { Sidebar } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';
import { can, requireAdmin } from '@/server/session';

export default async function AdminPanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const admin = await requireAdmin(locale);
  const allowedKeys = ADMIN_NAV.filter((i) => can(admin, i.permission)).map((i) => i.key);
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <Topbar adminName={admin.name} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar allowedKeys={allowedKeys} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
```

`src/app/[locale]/admin/(panel)/page.tsx`:
```tsx
import { getTranslations } from 'next-intl/server';
import { NoAccess } from '@/components/admin/no-access';
import { can, requireAdmin } from '@/server/session';

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const admin = await requireAdmin(locale);
  if (!can(admin, 'dashboard.read')) return <NoAccess />;
  const t = await getTranslations('admin');
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold" data-testid="admin-welcome">
        {t('welcome', { name: admin.name })}
      </h1>
      <p className="text-muted-foreground">{t('overviewSoon')}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run all e2e tests**

Run: `npm run test:e2e`
Expected: PASS, 12 tests (6 storefront + 6 admin).

- [ ] **Step 5: Manual check in the dev server**

With `npm run db` running: `npm run dev`, open `http://localhost:3000/en/admin`, sign in with the `SEED_ADMIN_*` values from `.env`; switch to Arabic and dark mode. Expected: layout mirrors in RTL; brand orange buttons in both themes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): add admin login, panel shell, overview and permission gating"
```

---

### Task 13: CI and developer README

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (replace the create-next-app README)

**Interfaces:**
- Consumes: all npm scripts from Task 1.
- Produces: CI running lint, typecheck, unit, integration, e2e on push/PR.

- [ ] **Step 1: CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:54329/shop_dev
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run test:int
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          CI: '1'
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: |
            playwright-report
            test-results
```

- [ ] **Step 2: README**

`README.md`:
````markdown
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
| `npm test` | Unit tests (`*.test.ts`) |
| `npm run test:int` | Integration tests against a throwaway Postgres (`*.int.test.ts`) |
| `npm run test:e2e` | Playwright: builds the app, fresh DB on port 54331, app on port 3100 |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## Project layout

- `src/core` — business logic, framework-free, unit/integration tested
- `src/server` — Next.js glue: sessions, server actions, cached loaders
- `src/app/[locale]` — pages (`(store)` storefront, `admin` dashboard)
- `src/brand/brand.config.ts` — per-client defaults (name, colour, locale, currency)
- `src/i18n/messages` — English and Arabic UI text
- `prisma/` — schema, migrations, seed

## Changing the database schema

```bash
npm run db:migrate -- --name describe_change
```
````

- [ ] **Step 3: Full local verification**

Run:
```bash
npm run lint && npm run typecheck && npm test && npm run test:int && npm run test:e2e
```
Expected: every command passes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add CI workflow and developer README"
```

---

## Deferred to later milestones (explicitly not in M1)

- Password reset and emails (`Mailer`) → M3 (with order emails).
- `updateSettings`, settings UI, logo upload, encrypted provider secrets → M4 / M6.
- Customer addresses → M3 (checkout).
- Full responsive admin sidebar (drawer), global search, notifications → M4.
