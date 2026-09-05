# FICMS — Staff User Guide

This guide assumes you have an account created by your clinic administrator and
have logged in through the staff portal.

## Sign in

1. Go to your clinic's portal URL.
2. Enter your email and password.
3. If 2FA is enabled, enter the 6-digit code from your authenticator app.
4. You'll land on the **Dashboard**.

> If your account is suspended or locked, contact your administrator.

## Dashboard

Shows today's snapshot: active patients, today's appointments, active cycles,
outstanding balance, and the day's appointment list. Relevant cards update as
you work.

## Patients

- **Search** by name, MRN, or phone using the search box.
- **Register** a new patient with the form; an MRN is generated automatically.
- A duplicate-patient warning appears if a likely match exists.
- New patients can be **linked to a partner** to form a couple.

## Appointments

- **Schedule** an appointment (patient, start time, optional service).
- **Check in** a patient when they arrive.
- **Start** and **Complete** a visit. Status changes follow a workflow —
  invalid transitions are blocked.

## Cycles (IVF/ICSI/IUI)

- **Start a cycle** (patient, treatment type, optional protocol).
- **Advance** the cycle through its stages (the valid next step is shown).
- Each cycle has a timeline of events and stimulation medications.

## Laboratory

- **Create a lab order** for a patient (select tests from the catalogue).
- **Collect a specimen** (barcode generated), then **accession** and **process**.
- Enter results, **verify**, then **release** to clinical view. Only verified
  results can be released; critical results raise alerts.

## Billing / Inventory / Cryostorage

- **Billing**: create draft invoices, issue them, record payments (idempotent),
  and refund.
- **Inventory**: add items, set minimum stock, view low-stock alerts, and
  adjust stock.
- **Cryostorage**: create tanks, add positions, store items (collision-checked),
  log temperatures, and release items with a double-witness verification.

## Settings (administrators)

Manage branches, departments, staff invitations, and review the default role
permission matrix.

## Good practices

- Never share your password or 2FA codes.
- Log out of shared devices.
- Report suspected data issues to your administrator immediately.
