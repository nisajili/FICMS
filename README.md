# FICMS — Fertility & IVF Clinic Management System

A vendor-neutral, white-label, secure, production-ready web platform for any
independent fertility clinic, IVF centre, hospital fertility department, or
multi-branch healthcare organisation.

No clinic name, logo, address, country, currency, contact details, treatment
protocol, payment provider, language, or branding is hard-coded. Everything is
driven by per-organisation configuration in the database.

---

## What this repo contains

```
apps/web       Next.js 14 (App Router) — Staff portal (/portal), Patient portal
               (/patient-portal), and Platform Admin portal (/admin)
apps/api       NestJS 10 — versioned REST API under /api/v1 + OpenAPI/Swagger
apps/worker    BullMQ background worker (reminders, notifications, reports)
packages/ui    Shared white-label UI primitives (Tailwind + shadcn-style)
packages/types Shared DTOs / domain types (contract with Prisma)
packages/config Env validation (zod), constants, permission matrix, state machines
packages/tsconfig, packages/eslint-config  Tooling
```

---

## Quick start (development)

Required: Node 20+, pnpm 9, and a PostgreSQL 13+ + Redis instance (or Docker).

```bash
# 1. Install
pnpm install

# 2. Set up environment
cp .env.example .env
#   Fill in DATABASE_URL, JWT secrets, etc.

# 3. Generate the Prisma client, run migrations and seed demo data
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Run everything (web + api + worker)
pnpm dev
```

Or use Docker Compose for a full local stack (Postgres + Redis + MinIO + API +
worker + web):

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

### Default demo login (development only)

The seed creates a demo organisation with:

| Role  | Email                | Password     |
|-------|----------------------|--------------|
| Owner | `admin@demo.example` | `Demo@2026!` |
| Doctor| `doctor@demo.example`| `Demo@2026!` |

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md), [`docs/database-erd.md`](docs/database-erd.md),
[`docs/roles-permissions.md`](docs/roles-permissions.md), and
[`docs/workflows.md`](docs/workflows.md).

Highlights:

- **TypeScript monorepo** (pnpm workspaces + Turbo).
- **Tenant isolation**: every business table carries `organizationId` (and
  `facilityId`/`departmentId` where applicable). The API's `PrismaService`
  middleware + `TenantGuard` enforce scoping in code, and PostgreSQL RLS per
  the `docs/organization-isolation.md` model. Platform admins have no
  read access to clinical data except via audited break-glass.
- **Auth & security**: Argon2id password hashing, JWT access + refresh cookies
  (httpOnly, secure, sameSite), TOTP 2FA + recovery codes, login throttling and
  lockout, RBAC/ABAC permission matrix, immutable audit events, Helmet/CSP,
  CSRF-friendly cookies, rate limiting, signed private-file URLs (see
  `docs/security-checklist.md`).
- **Workflows**: explicit state machines for appointments, treatment cycles,
  and lab result release; optimistic locking (`version`) to prevent silent
  overwrites; transactional billing/payment idempotency; transactional
  inventory; collision-safe cryostorage positions; double-witness for
  identity-sensitive lab events.

---

## Environment variables

All configuration is via environment variables validated by
[`packages/config`](packages/config/src/env.ts). See `.env.example` and
`.env.prod.example`. Secrets are never hard-coded; provider credentials are
supplied externally.

---

## Scripts

| Command                | Purpose                                     |
|------------------------|---------------------------------------------|
| `pnpm dev`             | Run web + api + worker (Turbo, concurrent)  |
| `pnpm build`           | Build all apps/packages                     |
| `pnpm typecheck`       | Type-check all packages                     |
| `pnpm lint`            | Lint all packages                           |
| `pnpm test`            | Run all unit tests                          |
| `pnpm db:migrate`      | Apply Prisma migrations (dev)               |
| `pnpm db:deploy`       | Apply migrations in production              |
| `pnpm db:seed`         | Seed synthetic demo data                    |
| `pnpm db:generate`     | Generate the Prisma client                  |

---

## Deployment

See [`docs/deployment.md`](docs/deployment.md), [`docs/backup-restore.md`](docs/backup-restore.md),
and [`docs/rollback.md`](docs/rollback.md). Reference Docker Compose for
development and production is in `docker-compose.dev.yml` / `docker-compose.prod.yml`,
with a Caddy TLS reverse proxy in `deploy/Caddyfile`.

### Bootstrap commands (first-time setup)

After deploying, create the platform admin and the first clinic organisation via
the one-time bootstrap endpoints (using `PLATFORM_BOOTSTRAP_TOKEN`):

```bash
curl -X POST $API_URL/api/v1/bootstrap/platform-admin \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Strong!Password1","name":"Platform Admin","token":"<BOOTSTRAP_TOKEN>"}'

curl -X POST $API_URL/api/v1/bootstrap/organization \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Clinic","slug":"my-clinic","adminEmail":"admin@clinic.example","adminPassword":"Strong!Password1","token":"<BOOTSTRAP_TOKEN>"}'
```

---

## Testing

- Unit tests: `pnpm test:unit`
- API integration, DB transaction, org-isolation, permission, security,
  payment-idempotency, inventory-concurrency, cryostorage-collision, and
  double-witness tests are defined as specs under `apps/api/src/**/*.spec.ts`;
  they require a live Postgres via Docker Compose (the pure-logic specs run
  without a DB).
- End-to-end: `apps/web/**/*.e2e.*` (Playwright) — see `docs/testing.md`.

---

## Documentation set

- `docs/architecture.md` — system architecture
- `docs/workflows.md` — end-to-end workflows & state machines
- `docs/database-erd.md` — entity-relationship overview
- `docs/organization-isolation.md` — tenant data isolation model
- `docs/roles-permissions.md` — roles & permission matrix
- `docs/security-checklist.md` — security & hardening
- `docs/compliance-checklist.md` — what to review before claiming compliance
- `docs/deployment.md` — deployment / DevOps
- `docs/backup-restore.md` — backup & disaster recovery
- `docs/rollback.md` — deployment rollback
- `docs/staff-guide.md` — staff user guide
- `docs/patient-guide.md` — patient portal guide
- `docs/admin-guide.md` — system-administrator guide
- `docs/testing.md` — testing strategy

---

## License / disclaimer

This is reference software. It is **not** certified for a regulatory standard
(HIPAA/GDPR/etc.) or FDA/CE clinical use without formal review. Synthetic
demonstration data only; never use real patient data in development or demo
environments.
