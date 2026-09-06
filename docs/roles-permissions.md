# FICMS — Roles & Permissions Matrix

## Model

RBAC (role → permissions) with attribute-based constraints (org/branch/
department/patient-assignment restrictions + field-level access) is enforced
on the backend via `PermissionsGuard` and claims carried in the access JWT.
Permissions are strings of the form `resource:action`.

## Default Roles

| # | Role | Key |
|---|------|-----|
| 1 | Platform Administrator | `platform_admin` |
| 2 | Organization Owner | `org_owner` |
| 3 | Clinic Director | `clinic_director` |
| 4 | Clinic Administrator | `clinic_admin` |
| 5 | System Administrator | `system_admin` |
| 6 | Receptionist | `receptionist` |
| 7 | Fertility Specialist | `fertility_specialist` |
| 8 | General Doctor | `general_doctor` |
| 9 | Embryologist | `embryologist` |
| 10 | Andrologist | `andrologist` |
| 11 | Laboratory Scientist | `lab_scientist` |
| 12 | Sonographer | `sonographer` |
| 13 | Nurse | `nurse` |
| 14 | Pharmacist | `pharmacist` |
| 15 | Counselor / Psychologist | `counselor` |
| 16 | Cashier | `cashier` |
| 17 | Finance Officer | `finance_officer` |
| 18 | Inventory Officer | `inventory_officer` |
| 19 | HR Officer | `hr_officer` |
| 20 | Auditor / Compliance Officer | `auditor` |
| 21 | Patient | `patient` |

## Permission Actions

`view`, `view_self`, `create`, `update`, `approve`, `verify`, `release`,
`correct`, `sign`, `export`, `print`, `archive`, `cancel`, `refund`,
`transfer`, `dispose`, `break_glass`.

## Resources

`patient`, `appointment`, `medical_record`, `consultation`, `cycle`,
`semen_analysis`, `embryo`, `cryo_tank`, `ultrasound`, `nursing`, `lab`,
`pharmacy`, `inventory`, `billing`, `payment`, `counseling`, `donor`, `hr`,
`admin`, `audit`, `report`.

## Default matrix (source of truth)

See `packages/config/src/constants.ts` → `DEFAULT_ROLE_PERMISSIONS`. Summary:

- **platform_admin, org_owner, clinic_director, clinic_admin**: `*` (full).
- **system_admin, auditor**: audit/report/admin view, no clinical write.
- **receptionist**: patient view/create/update, appointment CRUD.
- **fertility_specialist**: patient view/update, EMR, consultation, cycle,
  ultrasound, lab view/release, billing view.
- **general_doctor**: patient view/update, EMR, consultation, lab view/release.
- **embryologist**: cycle view/update, embryo view/create/update/approve, cryo.
- **andrologist / lab_scientist**: semen analysis + lab.
- **sonographer**: ultrasound.
- **nurse**: patient view, nursing, EMR view, appointments view.
- **pharmacist**: pharmacy, inventory view/update.
- **counselor**: patient view, counseling, EMR view.
- **cashier**: billing + payment create/refund.
- **finance_officer**: billing/payment + report view/export.
- **inventory_officer**: inventory CRUD/transfer.
- **hr_officer**: HR CRUD, audit/report view.
- **auditor**: audit + report view/export, patient view.
- **patient**: `patient:view_self`, own appointments, own EMR view, own billing view.

## Enforcement

- `@RequirePermissions('patient:create')` on a handler; `PermissionsGuard`
  checks the user's claims.
- Patients are restricted to self-scoped endpoints (`patient:view_self`).
- Admin-endpoints require `admin:view`/`admin:create`/`admin:update`.
- Permissions support wildcards (`*`, `resource:*`) and `resource:action`.

## Additional access controls

- **Org / branch / department restrictions**: session carries `facilityId`
  and `departmentId`; services filter by these where relevant.
- **Patient-assignment restrictions**: staff see only patients assigned to them
  (implemented via patient-assignment constraints).
- **Field-level access**: sensitive fields (e.g. counseling, donor identity)
  are gated and not exposed to patient or general staff roles.
- **Sensitive-record restrictions**: counseling and donor records are stricter.
- **Temporary delegated access & break-glass**: audited emergency paths.
- **Session timeout & suspension**: per-user `SESSION_TIMEOUT_MINUTES`,
  account lockout (5 failed → 15 min), suspension via `UserStatus`.
