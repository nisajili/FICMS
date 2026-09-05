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

The schema is designed to support PostgreSQL **Row-Level Security**. A
production migration should enable RLS on isolated tables and add policies of
the form:

```sql
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_patient_select ON "Patient"
  FOR SELECT USING (
    "organizationId" = current_setting('app.current_org')::uuid
  );
CREATE POLICY tenant_patient_all ON "Patient"
  FOR ALL USING (
    "organizationId" = current_setting('app.current_org')::uuid
  );
```

The application sets `app.current_org` at the start of a request/transaction.
This is a defence-in-depth layer; the app-level guards remain the primary
enforcement for correctness and usability.

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
