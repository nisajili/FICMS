# FICMS — System Administrator Guide

## Overview

The administrator role configures the clinic and its users. In a multi-clinic
deployment, there is also a **Platform Administration** function for the
operator (see below).

## Clinic administration

### Organisation & branding
- The clinic name, logo, colors, country, currency, timezone, languages, and
  contacts are stored as `OrganizationSetting` (white-label). Set these in the
  database via the API/settings; no source change is required.
- Brand colors are applied automatically to the portal at runtime.

### Branches & departments
- Create branches (facilities) and departments under `Facilities`.
- Assign staff to a branch/department.

### Users & roles
- **Invite staff** under Settings (a temporary password is generated; in
  production a reset/invite email is queued).
- Assign roles. Changing roles is audited.
- Suspend/disable accounts when staff leave or for security incidents.
- Review the **default role → permission matrix** and adjust custom roles as
  needed; all enforcement is backend-side.

### Services, packages, lab tests, medications
- Configure the service and treatment-package catalogue (prices, currency).
- Add lab test definitions with units and reference ranges.
- Add medications to the catalog (mark controlled drugs as such).

## Platform administration (multi-clinic)

- **Onboard organisations** via the authenticated `admin:create` endpoint or
  the bootstrap endpoint during initial setup.
- **Activate/suspend** clinics.
- **Manage clinic domains** and subdomains (routing is per-org).
- **Monitor platform health** (`/api/v1/health`, `/healthz`) and usage
  statistics — platform stats never expose patient-identifiable data.
- **Manage authorised technical-support (break-glass) access** via
  `POST /api/v1/admin/break-glass/requests`. A request requires a specific
  `organizationId`, a `reason` (min 8 chars), and a bounded `durationMinutes`
  (defaults to `BREAK_GLASS_MAX_MINUTES`, capped at 120). The request must be
  **approved by a second platform administrator** (`POST .../requests/:id/approve`)
  before any clinical data is visible. Grants auto-expire after their window,
  can be revoked (`POST .../requests/:id/revoke`), and every request, approval,
  revocation and clinical read is written to the immutable audit trail.
- **Read an emergency clinical summary** with `GET /api/v1/admin/break-glass/organizations/:organizationId/emergency`,
  but only while an approved, unexpired grant is active. The response is a
  *bounded* snapshot (patients, recent results, active prescriptions) — it does
  not expose the full clinical API to platform admins.
- **Review platform audit events.**

## Troubleshooting

- **Login blocked**: check `UserStatus`, `lockedUntil`, and `mfaEnabled`.
- **Permission denied**: verify the user's role and the permission matrix.
- **Appointments/cycles won't transition**: the state machine rejects invalid
  transitions — use a valid next step.
- **Payments not recording**: confirm the `idempotencyKey` is unique and the
  invoice isn't cancelled/refunded; check the transaction succeeded.
- **Cryostorage collision**: a unique physical slot may already be occupied.
- **Issues with async reminders**: check the worker and Redis are healthy.

## Security & compliance

- Keep `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` strong and rotated.
- Keep `PLATFORM_BOOTSTRAP_TOKEN` secret and rotate after first use.
- See `docs/security-checklist.md` and `docs/compliance-checklist.md`.
- Never grant platform admins routine clinical access; use audited break-glass.
