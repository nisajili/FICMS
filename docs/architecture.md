# FICMS — System Architecture

## 1. Overview

FICMS is a three-tier, TypeScript monorepo application. It is designed to be
deployed either as a **standalone single-clinic instance** or as a
**multi-organisation platform** serving many independent clinics with strict
data isolation.

```
┌────────────────────────────────────────────────────────────────┐
│                         Browsers / Devices                      │
│   Staff Portal    Patient Portal    Platform Admin Portal       │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTPS (TLS)
                    ┌───────▼────────┐
                    │  Reverse proxy │  (Caddy / nginx / LB)
                    │  TLS, CSP, HSTS│
                    └───────┬────────┘
            ┌───────────────┴───────────────┐
            │                               │
   ┌────────▼────────┐              ┌───────▼─────────┐
   │  apps/web       │              │  apps/api       │
   │  Next.js 14     │   /api/v1    │  NestJS 10      │
   │  App Router     │──────────────▶  REST + OpenAPI │
   └─────────────────┘  httpOnly     └───────┬─────────┘
                           cookies           │
                                            │
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                 ┌────────▼──────┐  ┌───────▼──────┐  ┌───────▼───────┐
                 │ apps/worker   │  │  PostgreSQL  │  │    Redis      │
                 │ BulkMQ prod.  │  │  (Prisma ORM)│  │ (queue/rate)  │
                 └───────────────┘  └───────┬──────┘  └───────────────┘
                                            │
                                   ┌────────▼────────┐
                                   │  S3-compatible  │
                                   │  object storage │ (private files)
                                   └─────────────────┘
```

## 2. Repository structure

```
apps/web        Next.js App Router; three portals under /portal/* & /login
apps/api        NestJS modules under src/<module>; versioned API
apps/worker     BullMQ consumer for asynchronous tasks
packages/ui     Shared React primitives (Button, Card, Table, Badge…)
packages/types  Shared DTOs & domain contracts
packages/config Env validation, constants, permission + state machines
```

## 3. Request lifecycle (API)

1. Request hits the reverse proxy → TLS terminated.
2. `TenantGuard` (APP_GUARD) extracts the access JWT (cookie or bearer),
   verifies it, and sets the **tenant context** on the `PrismaService`
   (`organizationId`, `facilityId`, `isPlatformAdmin`).
3. `PermissionsGuard` checks the required `resource:action` perms from the
   JWT permission claims (RBAC/ABAC).
4. Controller → Service → `PrismaService` (tenant-scoped) → PostgreSQL.
5. A Prisma middleware rejects any tenant-scoped write that omits
   `organizationId`, and platform admins may not mutate org-scoped rows without
   an explicit org scope.
6. `AuditService` writes an immutable `AuditEvent` for sensitive actions.
7. `TransformInterceptor` wraps responses in `{ success: true, data }`;
   `AllExceptionsFilter` normalises errors.

## 4. Portals

### A. Platform Administration
Multi-clinic only. Register/activate/suspend organisations, manage domains,
monitor health, review platform-level usage stats (no patient-identifiable
data), manage authorised technical-support (break-glass) access, review audit
events. Platform admins have no read access to clinical records by default.

### B. Clinic Staff
Role-scoped workbench: reception, EMR, fertility consultation, cycles,
andrology/embryology, cryostorage, ultrasound, nursing, general lab, pharmacy,
inventory, billing, counseling, donor, HR, reporting, admin.

### C. Patient Portal
Invitation or approved self-registration; update permitted profile; request/view
appointments; complete forms; view treatment timeline; sign consent; view
released results; view invoices & installments; make supported payments;
download receipts; control notifications. Never exposes internal clinical
notes, counseling, donor identity, embryology notes, HR, or unreleased results.

## 5. Technology decisions

| Concern         | Choice                                 |
|-----------------|----------------------------------------|
| Frontend        | Next.js 14, React 18, Tailwind, TanStack Query, React Hook Form + Zod |
| Backend         | NestJS 10, Prisma ORM                  |
| Database        | PostgreSQL 16                          |
| Cache/Queue     | Redis, BullMQ                          |
| Object storage  | S3-compatible (private)                |
| Auth            | JWT (access+refresh) cookies, Argon2id, TOTP |
| API docs        | OpenAPI / Swagger at `/api/v1/docs`    |
| Isolation       | App-level tenant middleware + Prisma middleware + PostgreSQL RLS |
| Deployment      | Docker Compose (dev & prod), Caddy TLS |

## 6. Configuration & white-labeling

Per-org settings are stored in `OrganizationSetting` keyed by `BRANDING_KEYS`
(`CLINIC_NAME`, `CLINIC_LOGO`, `COUNTRY`, `CURRENCY`, `TIMEZONE`,
`PRIMARY_LANGUAGE`, `PRIMARY_COLOR`, `CLINIC_CONTACTS`, …). The web app reads
these at runtime and applies brand colors to CSS variables — no clinic-specific
string, color, or domain lives in source.
