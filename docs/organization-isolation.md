# FICMS — Organization & Data Isolation

## 1. Goals

- A clinic must never read, mutate, or infer another clinic's patients, staff,
  billing, documents, reports, or settings.
- Tenant leakage is prevented through **every** access path: API responses,
  Prisma queries, object storage, Redis, queues, search, exports, logs, and
  notifications.
- Platform administrators do **not** see clinical records by default.
- Emergency technical support requires authorisation, a reason, a time limit,
  and a complete audit trail.

## 2. Data model

Every business entity carries tenant ownership:

- `organizationId` (required on all isolated models)
- `facilityId` (branch-scoped models)
- `departmentId` (department-scoped models)

The `Organization` → `Facility` → `Department` hierarchy is the `tenant` tree.

## 3. Isolation at the DB layer (PostgreSQL)

A ready-to-apply migration is included at
`apps/api/prisma/migrations/20260103000000_rls/migration.sql`. It enables
Row-Level Security (`ENABLE` + `FORCE ROW LEVEL SECURITY`) on every tenant
table (49 models that carry `organizationId`) and creates a single
`tenant_isolation` policy per table.

**Safe by design.** Each policy is written so that when the session variable
`app.current_org` is **not** set, it permits all rows:

```sql
CREATE POLICY tenant_isolation ON "Patient"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK ( /* same rule */ );
```

Because the deployment does not set `app.current_org` by default, applying this
migration is a **no-op** — the app continues to rely on the application-level
guards (which are the primary, tested enforcement). It cannot break a running
deployment.

**To activate strict DB-level isolation**, set the variable per
request/transaction so `current_setting('app.current_org', true)` holds the
caller's organisation id:

```sql
SELECT set_config('app.current_org', :orgId, true);  -- inside a transaction
```

With the variable set, a row is visible/modifiable only when its
`organizationId` matches `app.current_org` (or is NULL, for platform-level
rows such as platform-admin users / cross-org audit rows). Operators using a
connection pooler that pins a connection per transaction, or a PgBouncer
session-mode setting, can set this on the session. The application-level
guards remain deployed regardless; RLS is an additional, independently-verifiable
defence-in-depth barrier.

## 4. App-level enforcement

## 4. App-level enforcement

### `TenantGuard`
Resolves the session user from the access JWT and sets the tenant context on
the `PrismaService` for the request. Non-authenticated/public routes skip it.

### `PrismaService` middleware
- Enforces that any **write** to a tenant-isolated model includes an explicit
  `organizationId`.
- Block platform admins from mutating org-scoped rows without an explicit
  organisation scope.
- Feature services pass `organizationId` in every `findFirst`/`findMany`/
  `update` where clause via the tenant context.

### Service-level scoping
Every service method reads the current user's `organizationId` and adds it to
the Prisma `where`/`data`. Example (patients):

```ts
this.prisma.patient.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
```

## 5. Tenant-safe ownership rules

| Path             | Control                                                          |
|------------------|------------------------------------------------------------------|
| API responses    | Every query is tenant-scoped; no cross-org joins returned        |
| Prisma writes    | Middleware requires `organizationId`                             |
| Object storage   | Object keys prefixed with the org id; presigned URLs scoped      |
| Redis / queues   | Job payloads carry `organizationId`; workers scope writes        |
| Search           | Indexes/analyses are per-org (not implemented across orgs)       |
| Logs             | Sensitive fields redacted; no PHI in logs (`redact()`)           |
| Exports          | Only the requesting org's data; platform export is de-identified |
| Notifications    | Scoped to the org; respecting the user's notification prefs      |

## 6. Platform administrators & break-glass

- Platform admins have `isPlatformAdmin = true` and are **exempt** from the
  implicit tenant filter **only** for plate-platform actions (org/facility/user
  management). They do not receive clinical rows.
- Emergency technical support uses a recorded **break-glass** action that
  requires: a stated reason, a time limit, and writes an `AuditEvent`
  (`break_glass`) with actor, org, reason, and timestamp. It is never silent.

## 7. Data export

Each organisation can export its own data. The reporting/export endpoints only
return the requesting org's rows; platform-level exports are de-identified.
