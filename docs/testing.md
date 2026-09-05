# FICMS — Testing

## Unit tests (no DB)

Pure-logic specs run without a live database:

| File | Covers |
|------|--------|
| `apps/api/src/common/state-machine.spec.ts` | Valid/invalid state transitions, version locking |
| `apps/api/src/common/pagination.spec.ts` | Pagination defaulting, clamping, ordering |
| `apps/api/src/records/record-number.service.spec.ts` | MRN/invoice/cycle number generation |
| `apps/api/src/auth/password.service.spec.ts` | Argon2id hash/verify |
| `apps/api/src/auth/totp.service.spec.ts` | TOTP secret, URL, verify, recovery codes |
| `apps/api/src/auth/roles.spec.ts` | Role → permission matrix integrity |
| `apps/web/src/components/__tests__/button.test.tsx` | UI component behaviour (RTL) |

Run: `pnpm test:unit` (or `npx jest` in each app).

## Integration / transaction / isolation tests (require Postgres)

These are defined as specs that use a test database (e.g. via Docker Compose).
Run them against a running Postgres with `TEST_DATABASE_URL`:

- **Org isolation**: verify that org A cannot read/update org B rows.
- **Permission tests**: 403 when a role lacks a required permission.
- **Billing idempotency**: same `idempotencyKey` posts exactly one payment.
- **Inventory concurrency**: parallel adjustments can't drive stock negative.
- **Cryostorage collision**: two items can't occupy the same position.
- **Double-witness**: witness must be a distinct staff member; audited.
- **Payment/refund transactions**: atomic balance updates.

## End-to-end (Playwright)

`apps/web/**/*.e2e.*` target the running stack:
- Patient registration → appointment → check-in path.
- Cycle lifecycle and state-machine guards.
- Lab order → specimen → release.
- Billing invoice → payment → receipt.
- Accessibility checks (axe) and responsive layouts.

## Security

- Unit-level security tests for auth (throttling, lockout, TOTP).
- Penetration test recommended before production (see `security-checklist.md`).

## Data

All demo/development data is **synthetic**. Never use real patient data in
tests or demo environments.
