# FICMS — Database ERD Overview

Entity-relationship overview. Full definitions (types, constraints, indexes)
are in `apps/api/prisma/schema.prisma` and the baseline migration SQL. All IDs
are UUIDv4. `*` indicates required tenant ownership (`organizationId`).

## Tenancy tree
```
Organization *1 ──< Facility *1 ──< Department
     │                 │
     ├── OrganizationSetting
     ├── User
     └── Patient
```

## Module clusters

```
Users/Auth
  User ──< Session
  User ──  Patient (optional 1:1 link)

Patients & couples
  Patient ──< Partner (self-referential couple link)
  Patient ──< PatientDocument
  Patient ──< Consent
  Patient ──< Encounter ──< ClinicalNote
  Patient ──< MedicalHistory

Appointments
  Patient ──< Appointment ── Facility

Cycles (IVF/ICSI/IUI/ART)
  Patient ──< Cycle ──< CycleMedication
                    ──< CycleEvent
                    ──< UltrasoundScan
                    ──< Embryo ──< EmbryoObservation
                    ──< CryoStorageItem

Andrology & Lab
  Patient ──< SemenAnalysis ── Cycle
  Patient ──< LabOrder ──< LabSpecimen
                       ──< LabResult

Cryostorage
  CryoTank ──< CryoPosition ──1:1── CryoStorageItem
  CryoTank ──< TemperatureLog

Nursing / Ultrasound / Counseling
  Patient ──< VitalSign
  Patient ──< NursingNote
  Patient ──< UltrasoundScan
  Patient ──< CounselingSession (confidential)

Pharmacy & Inventory
  Patient ──< Prescription ──< PrescriptionItem ──< Dispensation
  InventoryItem ──< StockMovement
  Supplier ──< PurchaseOrder

Billing & Finance
  Patient ──< Invoice ──< InvoiceLineItem
                    ──< InstallmentPlan
                    ──< Payment ──< Refund
                    ──< CreditNote
  ServiceCatalog / TreatmentPackage (org-configured)

HR / Donor
  User ──< StaffProfile
  User ──< LeaveRequest
  DonorProfile (anonymized; identity restricted)

Audit / Notifications
  AuditEvent (immutable)
  Notification
```

## Key integrity rules

- `Partner(patientId, partnerId)` unique — a couple link is unique per pair.
- `CryoPosition(tankId, canister, cane, goblet, rack, position)` unique —
  two items can't occupy the same physical slot.
- `CryoStorageItem.positionId` unique — one stored item per position.
- `Payment.idempotencyKey` unique — idempotent payments.
- `Invoice.invoiceNumber`, `Patient.medicalRecordNumber`,
  `LabOrder.orderNumber`, `Cycle.organizationId+cycleNumber` unique.
- `AuditEvent` is append-only (never updated/deleted).
- Signed medical records (`ClinicalNote.signed`) are never silently
  overwritten — corrections create a new version linked via `previousId`.

## Optimistic locking

Mutable records (`Patient`, `Appointment`, `Cycle`, `Invoice`, etc.) carry a
`version` integer. Updates compare-and-swap on `version` via `assertVersion()`,
throwing `ConflictException` on concurrent modification.
