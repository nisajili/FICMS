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
- **Manage authorised technical-support (break-glass) access** — requires a
  reason, a time limit, and writes an audit event.
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
