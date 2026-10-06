# E-Commerce Platform (Storefront + Admin) — Design Spec

**Date:** 2026-10-06
**Status:** Draft for review

## 1. Goal and context

Build an original, rebrandable e-commerce product (customer storefront + admin dashboard) that is delivered to clients, one deployment per client. The feature set is modelled on the publicly visible feature list of the Aniq UI clothing-store demo, but **no Aniq code, branding, copy, or images are reused** — the provided zips are scraped compiled bundles of a paid template and are used only as a feature/layout reference.

### Success criteria
- A new client store can be set up (branding, languages, currency, owner admin, optional demo data) with one script in under 30 minutes.
- A customer can browse, filter, add to cart, check out with Cash on Delivery, and track the order — in English and Arabic (RTL), light and dark.
- An admin can manage catalog, orders, customers, admins/roles, coupons, campaigns, and settings, and see a live KPI dashboard.
- Payment gateways, the AI provider, and the try-on provider are swappable adapters; adding one does not touch checkout or UI code.
- The data model carries `storeId` on every business table so the product can later become multi-tenant without a schema rewrite.

### Decisions made
| Topic | Decision |
|---|---|
| Delivery model | Single-client deployments now; multi-tenant-ready schema (`storeId`) |
| Stack | Next.js (App Router, TypeScript), PostgreSQL + Prisma, Tailwind CSS, shadcn/ui |
| Structure | One Next.js app; framework-free business logic in `src/core` |
| Payments v1 | `PaymentProvider` interface + Cash on Delivery only; gateways (Paymob, Stripe, …) added later as adapters |
| v1 extras | AI admin assistant, virtual try-on, coupons/campaigns, analytics (visitors, conversion, region map) — all in v1 |
| Languages | English + Arabic (RTL); translatable fields stored as JSON `{ en, ar }` |

### Out of scope (v1)
Multi-tenant hosting/billing, mobile apps, real payment gateways beyond COD, marketplace/multi-vendor, inventory across multiple warehouses, loyalty points, blog/CMS beyond FAQ/About content.

## 2. Architecture

One Next.js application per client, containing the storefront, admin, and API route handlers, backed by one PostgreSQL database.

```
src/
  app/
    [locale]/                       # en | ar; sets <html lang dir>
      (store)/                      # storefront layout (header/footer)
        page.tsx                    # Home
        shop/  sale/  products/[slug]/  cart/  checkout/  order/[number]/
        track-order/  account/  about/  contact/  faq/
        auth/signin/  auth/signup/
      admin/                        # admin layout; permission-guarded
        login/  page.tsx            # Overview
        ai-assistant/
        products/{all,deleted,new,[id]}  categories/
        orders/  orders/[id]
        users/{all,deleted}  admins/  roles/
        coupons/  campaigns/  messages/  settings/
    api/
      payments/[provider]/webhook/
      tryon/                        # create job + poll status
      ai/chat/                      # streaming assistant endpoint
      track/                        # visit beacon
  core/                             # pure business logic, no next/* imports
    catalog/ cart/ orders/ pricing/ inventory/ coupons/ campaigns/
    payments/   PaymentProvider.ts, cod.ts, registry.ts
    tryon/      TryOnProvider.ts, <vendor>.ts, registry.ts
    ai/         tools.ts, assistant.ts
    auth/       permissions.ts, password.ts
    analytics/  storage/ (ImageStorage: local, s3)
    errors.ts                       # typed domain errors
  server/                           # Next glue: server actions, sessions, db client, settings loader
  components/ ui/ (shadcn)  store/  admin/
  i18n/ messages/en.json  messages/ar.json
  brand/brand.config.ts
prisma/ schema.prisma  seed.ts  demo-data/
scripts/ new-client.ts
```

**Layering rule:** pages and server actions authenticate, check permissions, validate input with zod, and render. All business rules live in `core`, which receives plain inputs plus a Prisma client/transaction and returns results or typed errors. `core` is the primary unit-test target.

## 3. Data model

Conventions: every business table has `id`, `storeId`, `createdAt`, `updatedAt`. Tables with a "Deleted" admin view have `deletedAt` (soft delete). Translatable text is `Json` shaped `{ en: string, ar?: string }`; a helper resolves the active locale with fallback to the store default. Money is stored as integer minor units (e.g. piastres/cents) with the currency in Settings.

### Catalog
- **Category** — slug (unique per store), name*, description*, image, parentId (one nesting level), sortOrder, isActive, deletedAt.
- **Product** — slug, sku, name*, description*, longDescription* (sanitized HTML), price, compareAtPrice?, costPrice?, categoryId, tags[], weight?, isActive, isFeatured, isBestSeller, tryOnEnabled, averageRating, reviewCount, seoTitle*?, seoDescription*?, deletedAt.
- **ProductImage** — productId, variantId?, url, alt*, sortOrder.
- **ProductOption** (e.g. Size, Colour) / **OptionValue** (S, M, L / Black, Teal; colour values may carry a hex swatch).
- **ProductVariant** — productId, sku, optionValueIds, priceOverride?, stockQuantity, trackInventory, isDefault. Stock lives on variants; option-less products have one default variant.
- **Review** — productId, customerId, rating 1–5, body, isApproved. Product rating aggregates are recomputed on approve/delete.

(* = translatable JSON)

### Commerce
- **Cart / CartItem** — cart keyed by customerId or anonymous cookie token; guest cart merges into customer cart on sign-in. CartItem: variantId, quantity.
- **Order** — number (short human-readable, unique), customerId?, guestEmail?, guestPhone?, status (`pending | confirmed | shipped | delivered | cancelled | refunded`), paymentStatus (`unpaid | paid | refunded | failed`), paymentProvider, couponCode?, campaignId?, subtotal, discountTotal, shippingTotal, taxTotal, grandTotal, currency, shippingAddress (JSON snapshot), shippingZoneId, notes?.
- **OrderItem** — snapshot of productName*, variantLabel, sku, imageUrl, unitPrice, quantity, lineTotal; variantId kept for reference.
- **OrderStatusEvent** — orderId, fromStatus, toStatus, actor (admin id / system / customer), note, createdAt. Drives the track-order timeline.
- **Payment** — orderId, provider, providerRef?, amount, status, rawPayload (JSON).
- **ShippingZone** — name*, countries/governorates list, fee, estimatedDays, isActive.
- **ContactMessage** — name, email, subject, body, readAt?.

**Allowed status transitions:** pending→confirmed|cancelled; confirmed→shipped|cancelled; shipped→delivered; delivered→refunded; confirmed→refunded (if paid). Cancel/refund restore stock.

### Marketing
- **Coupon** — code (unique, case-insensitive), type (`percent | fixed`), value, minOrderAmount?, maxDiscount?, usageLimit?, perCustomerLimit?, startsAt?, endsAt?, productIds[]?, categoryIds[]?, isActive. **CouponRedemption** — couponId, orderId, customerId?/guestEmail.
- **Campaign** — name*, type (`percent | fixed`), value, productIds[]/categoryIds[], startsAt, endsAt, isActive, bannerImage?. Active campaigns drive the Sale page and sale prices; the best single applicable campaign applies per item (no stacking between campaigns). A coupon may stack with a campaign unless the coupon is marked `excludeSaleItems`.

### People and access
- **Customer** — name, email (unique per store), phone?, passwordHash, addresses (relation **Address**), deletedAt.
- **Admin** — name, email, passwordHash, roleId, isActive, lastLoginAt.
- **Role** — name, permissions[] (strings), isSystem. The **Owner** system role holds all permissions and cannot be edited or deleted; at least one active Owner must exist.
- **Permissions** (initial set): `dashboard.read`, `products.read|write|delete`, `categories.read|write`, `orders.read|update_status|refund`, `customers.read|write|delete`, `admins.read|write`, `roles.write`, `coupons.write`, `campaigns.write`, `messages.read`, `settings.read|write`, `ai.use`, `analytics.read`.
- **AuditLog** — adminId, action, entityType, entityId, diff (JSON), createdAt.

### Analytics and AI
- **VisitEvent** — sessionId (random, cookie), path, referrer?, country (from IP/geo header; IP itself not stored), device class, createdAt.
- **DailyStat** — date, sessions, pageViews, orders, revenue, newCustomers, byCountry (JSON); computed by a scheduled job, today computed live.
- **AiConversation / AiMessage** — adminId, role, content, toolCalls (JSON), tokenUsage.
- **TryOnJob** — productId, variantId?, sessionId, status (`queued | processing | done | failed | expired`), resultUrl?, error?, expiresAt.

### Settings (single row)
storeName*, logoLight, logoDark, favicon, brand colours (primary + derived palette), radius, fonts, defaultLocale, enabledLocales, currency, taxRate, taxInclusive, contact info, social links, homepage section config (order + toggles), FAQ entries*, about content*, monthlyRevenueGoal, pendingOrderTimeoutMinutes, provider config (payments enabled, AI provider + encrypted key, try-on provider + encrypted key, try-on daily limit). Env vars override DB-stored keys. Secrets are encrypted with a key from `APP_ENCRYPTION_KEY`.

## 4. Core flows

### Pricing
A single pure function `priceCart({ items, campaigns, coupon, shippingZone, settings, customer })` returns per-line and total breakdowns plus applied discounts and any coupon rejection reason. Cart page, checkout, and order creation all use it; prices are never computed elsewhere.

### Placing an order (one DB transaction)
1. Load cart; re-run `priceCart` from current DB prices.
2. For each tracked variant, `SELECT … FOR UPDATE` and decrement stock; fail with `OutOfStock` (listing offending lines) if insufficient.
3. Create Order, OrderItems (snapshots), initial OrderStatusEvent, CouponRedemption.
4. Call `paymentProvider.initiate(order)`.
   - COD → order `confirmed`, paymentStatus `unpaid`.
   - Hosted gateway (future) → order `pending`, return `redirectUrl`; webhook later sets `paid` and `confirmed`.
5. Clear cart; send confirmation email (via `Mailer` interface; console mailer in dev, SMTP in prod).

A scheduled job cancels `pending` unpaid orders older than `pendingOrderTimeoutMinutes` and restores stock.

### PaymentProvider interface
```ts
interface PaymentProvider {
  id: string;
  initiate(order: OrderForPayment): Promise<{ status: 'confirmed' | 'pending'; redirectUrl?: string; providerRef?: string }>;
  verifyWebhook(req: Request): Promise<PaymentEvent>;   // signature-verified
  refund(payment: Payment, amount: number): Promise<RefundResult>;
}
```
Webhook handling is idempotent (keyed on providerRef + event id).

### Auth
Auth.js (credentials provider) with two separate session cookies/realms: customer (storefront) and admin (`/admin`). Argon2 password hashing, rate-limited login, password reset via emailed token. Admin route protection in middleware plus a `requirePermission(perm)` check in every admin server action and route handler.

## 5. Theming, rebranding, i18n

- `brand.config.ts` holds per-client defaults; the admin Settings page overrides them at runtime.
- All colours/radius are CSS variables generated from settings (light + dark sets); Tailwind and shadcn consume only variables. Dark mode via `next-themes`.
- `next-intl` with locale-prefixed routes (`/en`, `/ar`), `dir="rtl"` for Arabic, Tailwind logical properties throughout. Fonts: Plus Jakarta Sans (Latin), IBM Plex Sans Arabic (Arabic), via `next/font/google`.
- `ImageStorage` interface: `local` (disk, for dev/VPS) and `s3` (any S3-compatible: R2, S3, MinIO). Uploads converted to WebP at multiple widths with `sharp`.

## 6. Pages

### Storefront
Home (configurable sections: hero slider, category grid, new arrivals, best sellers, spotlight, sale banner, style pillars), Shop (URL-driven filters: category, price, size, colour, in stock; sort; pagination), Product detail (gallery, variant pickers with per-variant stock, add to cart, reviews, related products, Try-on button), Sale, Cart (coupon box), Checkout (guest or signed in; address; shipping zone; payment method), Order confirmation, Track order (number + email/phone → timeline), Account (orders, addresses, profile), Sign in / Sign up / Reset password, About, Contact (stores ContactMessage), FAQ.
SEO: per-page metadata, Product JSON-LD, `sitemap.xml`, `robots.txt`, hreflang alternates.

### Admin
Overview dashboard, AI Assistant, Products (all/deleted, create/edit with variant matrix and image manager, restore), Categories, Orders (list with filters; detail with status timeline, status change, printable invoice, refund), Customers (all/deleted, restore), Admins, Roles (permission matrix), Coupons, Campaigns, Messages, Settings (branding, store info, locales/currency/tax, shipping zones, homepage sections, FAQ/About, providers, monthly goal).
Shared: data tables with search, filters, pagination, CSV export; topbar with Ctrl+K global search, locale switch, theme toggle, notifications (new orders, low stock, new messages), "Go to storefront".

### Dashboard widgets
Total revenue (+ orders, AOV, trend vs previous period, sparkline), customer growth, weekly visitors (by day), this-week sales, monthly goal progress, conversion rate (orders ÷ sessions), recent orders, active campaigns, sales by region (world map, react-simple-maps), top products, low-stock list. All honour a date-range selector. Charts with Recharts.

## 7. AI features

### Admin AI Assistant
- Anthropic Claude via the official SDK, streamed to the UI; model configurable in Settings (default: latest Claude Sonnet).
- Tools (all call `core`, all read-only): `getSalesSummary(range)`, `getTopProducts(range, limit)`, `getLowStock(threshold)`, `searchOrders(query)`, `getOrder(number)`, `getCustomerStats(range)`.
- One drafting tool: `draftProductCopy(productId, locale, tone)` returns proposed text; the UI shows it with an **Apply** button — saving requires an explicit admin action through the normal product update path.
- Requires `ai.use`. Per-admin daily token budget; usage stored on AiMessage. Without a configured key the page shows setup instructions.

### Virtual try-on
- `TryOnProvider` interface: `submit({ personImage, garmentImage, category }) → jobRef`, `poll(jobRef) → status/resultUrl`. First adapter: a hosted try-on API (vendor chosen during planning, e.g. FASHN or a Replicate-hosted IDM-VTON model).
- Flow: consent checkbox → upload (JPEG/PNG/WebP ≤ 10 MB, validated server-side, EXIF stripped) → TryOnJob created → client polls → result shown labelled "AI preview".
- Privacy: person photos stored in a private bucket path, deleted when the job completes or fails; results expire after 24 h and are purged by a scheduled job.
- Abuse/cost control: per-session and per-IP daily limit (configurable); only on products with `tryOnEnabled` and when a provider key is configured.

## 8. Error handling

- `core/errors.ts` defines typed domain errors (`NotFound`, `Forbidden`, `ValidationError`, `OutOfStock`, `CouponInvalid(reason)`, `InvalidStatusTransition`, `PaymentFailed`, `ProviderNotConfigured`, `RateLimited`). Server actions map them to translated messages; the UI shows inline field errors or toasts.
- Unexpected errors: logged server-side (structured logger, optional Sentry DSN), generic error page to the user.
- zod schemas shared between client forms and server actions.
- External provider calls have timeouts and are never made inside the stock-locking transaction except `initiate` for COD (no network).

## 9. Testing

- **Unit (Vitest), test-first** for `core`: pricing (campaigns, coupons, stacking rules, shipping, tax inclusive/exclusive, rounding), coupon validity rules, status transitions, permission checks, stock decrement/restore.
- **Integration** against a real Postgres (Docker) test database: order placement under concurrent stock contention, coupon usage limits, webhook idempotency, soft-delete/restore, role enforcement on server actions.
- **E2E (Playwright)**: browse → cart → COD checkout → track order (EN and AR); admin creates product → visible in shop; admin without permission is blocked; theme/locale switching.
- CI (GitHub Actions): lint, typecheck, unit, integration, e2e on every push.

## 10. Deployment and client delivery

- `Dockerfile` + `docker-compose.yml` (app + Postgres + scheduled-jobs runner); documented Vercel + Neon/Supabase alternative.
- `pnpm new-client`: prompts for store name, colours, logo, default locale, currency, owner admin email → writes `brand.config.ts` and `.env`, runs migrations, creates Owner role/admin, optionally seeds original demo data.
- Demo data: original sample categories/products with placeholder imagery — no Aniq assets.
- Docs: `README.md` (dev setup), `docs/deploy.md`, `docs/new-client.md`, `docs/adding-a-payment-provider.md`.

## 11. Milestones

1. **Foundation** — scaffold, Prisma schema, auth (customer + admin, roles/permissions), settings/branding/theming, i18n + RTL, dark mode, layouts, seed.
2. **Catalog** — admin products/categories (+ soft delete, images, variants); storefront Home, Shop, Product detail, Sale.
3. **Commerce** — cart, pricing, checkout, PaymentProvider + COD, orders and status flow, track order, customer account, emails.
4. **Admin operations** — customers, admins/roles, coupons, campaigns, messages, settings pages, audit log, CSV export.
5. **Analytics** — visit tracking, DailyStat job, dashboard widgets, region map.
6. **AI** — admin assistant, then virtual try-on.
7. **Delivery kit** — Docker, `new-client` script, deployment docs, CI hardening.

Each milestone ends with passing tests and a runnable app.
