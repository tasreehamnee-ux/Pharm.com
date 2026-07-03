# نظام الصيدلية الذكي (Smart Pharmacy Management System)

A desktop-style pharmacy management web app (Arabic, RTL) for managing medicine inventory, point-of-sale checkout, sales history, purchases from suppliers, customers, and suppliers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API spec (source of truth for endpoints/types): `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/` (medicines, customers, suppliers, sales + saleItems, purchases + purchaseItems)
- API routes: `artifacts/api-server/src/routes/` (medicines, customers, suppliers, sales, purchases, dashboard)
- Frontend pages: `artifacts/pharmacy/src/pages/` (Dashboard, POS, Medicines, Sales, Purchases, Customers, Suppliers)
- Seed script: `scripts/src/seed.ts` (run with `pnpm --filter @workspace/scripts run seed`)

## Architecture decisions

- Single artifact (free-tier constraint): `artifacts/pharmacy` is the only web app; `artifacts/api-server` serves the backend at `/api`.
- Sale creation decrements medicine stock per line item inside a DB transaction (rejects if insufficient stock); deleting/voiding a sale restores stock. Purchase creation increments stock.
- Prices/totals are stored as Postgres `numeric` (strings via Drizzle) but exposed as JS numbers over the API — each route file has a `serialize*` helper that converts before Zod validation.

## Product

- Dashboard: today's sales/revenue, low-stock and expiring-soon alerts, recent sales.
- POS: search medicines, build a cart, choose customer/payment method, checkout (auto-decrements stock).
- Medicines: full CRUD inventory management with stock/expiry tracking.
- Sales: history of past invoices, view details, void (restores stock).
- Purchases: record incoming stock from suppliers (auto-increments stock).
- Customers & Suppliers: full CRUD contact management.

## User preferences

- User communicates in Arabic; UI defaults to Arabic with RTL layout.

## Gotchas

- Postgres `numeric` columns come back as strings from Drizzle — always convert to `Number()` before validating against the generated Zod response schemas (see `.agents/memory/drizzle-gotchas.md`).
- Use Drizzle's `inArray()` for "match any of these IDs" queries — raw `sql\`ANY(${array})\`` fails with the node-postgres driver.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
