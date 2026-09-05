# FICMS — Security Checklist

Aligns with HIPAA-style safeguards, GDPR principles, and applicable local
health/privacy requirements. **Compliance certification requires formal
review; this repo does not claim certification.**

## Authentication & sessions
- [x] Argon2id password hashing (`@node-rs/argon2`, memory 64 MiB, t=3, p=4).
- [x] JWT access + refresh token split; refresh stored as hash in `Session`.
- [x] httpOnly, secure, sameSite=lax cookies; `COOKIE_SECURE` in prod.
- [x] TOTP 2FA (otplib) + recovery codes; setup/confirm/disable endpoints.
- [x] Login throttling (rate limit) and account lockout after 5 failures.
- [x] Configurable session timeout.
- [x] Session revocation on logout; refresh token rotation.

## Authorisation
- [x] RBAC + ABAC permission matrix enforced backend-side (`PermissionsGuard`).
- [x] Tenant isolation (`TenantGuard` + Prisma middleware + RLS).
- [x] Patient self-scope only; internal/sensitive records gated.
- [x] Field-level & sensitive-record restrictions (counseling, donor identity).
- [x] Break-glass emergency access audited (reason, time limit, audit event).
- [x] Signed clinical notes are immutable; corrections create a new revision
      (version + 1) linked via the immutable chain — the original is never
      overwritten (`/api/v1/clinical-notes/:id/correct`).
- [x] Platform admins have no clinical read access by default.

## Data protection
- [x] TLS via reverse proxy (Caddy); HSTS set.
- [x] Encryption at rest (database & object storage encryption at infra level).
- [x] Signed (presigned) private-file URLs; no public file exposure.
- [x] Sensitive-field redaction `redact()` for logs.
- [x] Immutable audit events (actor, org, action, resource, before/after, IP).

## Application security
- [x] CSRF-friendly (sameSite cookies, JSON API, no cross-site side effects).
- [x] XSS mitigated (React escaping, CSP, no dangerous interpolation).
- [x] SQLi mitigated (Prisma parameterisation; RLS as belt-and-suspenders).
- [x] SSRF posture: outbound adapters only via configured endpoints.
- [x] Helmet headers, CSP (`default-src 'none'` for API), nosniff, X-Frame DENY.
- [x] Rate limiting (per-IP).
- [x] Input validation (NestJS ValidationPipe whitelist + Zod on client).
- [x] Idempotency keys for payments (prevents double charge).
- [x] File validation (size/type), malware-scan integration hook.

## Secrets & operations
- [x] `.env.example` / `.env.prod.example`; never hard-code credentials.
- [x] Secret management via env; rotate on deploy.
- [x] Dependency & container scanning in CI (recommended; templates provided).
- [x] Automated backups & restore scripts (see `docs/backup-restore.md`).
- [x] Structured logs; OpenTelemetry tracing hook; error-monitoring integration.

## To review before production
- [ ] Penetration test of the deployed instance.
- [ ] Enforce RLS policies on all isolated tables.
- [ ] Configure real SMTP/SMS payment adapters via secrets (no hard-coding).
- [ ] Audit logging for every PHI access (already wired; review retention).
- [ ] Confirm data-retention, legal basis, and breach-notification process.
- [ ] Security headers consistent behind your specific reverse proxy.
