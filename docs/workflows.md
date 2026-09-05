# FICMS — End-to-End Workflows

## Workflow 1 — Reception to follow-up

```
Patient registration (MRN) → Duplicate check → Appointment schedule
  → Check-in → Consultation (Encounter + clinical note)
  → Investigation order (Lab / Ultrasound) → Result verify → Clinician release
  → Treatment (cycle / prescription) → Follow-up appointment
```
State machine: `Appointment` transitions:
`REQUESTED → SCHEDULED → CHECKED_IN → IN_PROGRESS → COMPLETED` (cancellable/
no-show paths). Optimistic lock on `version`.

## Workflow 2 — Couple & fertility assessment

```
Register partner → Link partner (Partner 1:1 both directions)
  → MedicalHistory / reproductive history
  → Fertility assessment → Clinician-approved treatment recommendation
  → Start treatment cycle
```

## Workflow 3 — IVF/ICSI/IUI cycle

State machine `Cycle`:
```
PLANNED → BASELINE_ASSESSMENT → STIMULATION → MONITORING → TRIGGER
  → RETRIEVAL → FERTILIZATION → EMBRYO_CULTURE
  → TRANSFER │ FREEZING → LUTEAL_SUPPORT → PREGNANCY_TEST
  → CLINICAL_PREGNANCY → OUTCOME
```
Plus `CANCELLED` from planned/monitoring/embryo-culture stages. Invalid
transitions are rejected by `StateMachine`. A timeline of `CycleEvent`s and
`CycleMedication`s drives the interactive visual timeline.

## Workflow 4 — Lab sample → result release

```
LabOrder created → Specimen collected (barcode) → Accessioned → Processing
  → Result entered → Verified → Released
```
Verified-before-release enforced. Critical results set `alertRaisedAt` and
generate alerts. `LabResult` carries units, reference range, abnormal/critical
flags, and author/verifier/releaser.

## Workflow 5 — Cryostorage

```
Tank → Position (collision-checked unique physical slot)
  → Store item (1 item = 1 position)
  → Renewal billing (renewalDate)
  → Thaw / Transfer / Release / Dispose  (double-witness, audited)
```
Temperature logging with alarm thresholds.

## Workflow 6 — Prescription → dispensing

```
Prescription created (PRESCRIBED) → Pharmacist verify (VERIFIED)
  → Dispense (transactional inventory deduction + issuedQuantity)
  → PARTIALLY_DISPENSED / DISPENSED
```

## Workflow 7 — Billing & payments

```
Invoice (DRAFT) → Issue (ISSUED) → Installment plan optional
  → Payment (idempotency-key protected; transaction updates amountPaid/amountDue)
  → PARTIALLY_PAID → PAID
  → Refund (transactional)
```

## Workflow 8 — Consent

```
Consent template → PENDING_SIGNATURE → Patient signature
  → WITNESSED (witness) → linked to procedure
```

## Workflow 9 — Critical lab result alert

```
Critical result verified/released → alertRaisedAt → clinical alert
  → clinician acknowledgment → audit record
```

## Workflow 10 — Appointment reminder

```
Appointment scheduled → reminder queued in BullMQ (delay)
  → worker sends in-app/email/SMS (adapter) → status tracked
  → patient response recorded
```

## State machine & concurrency guarantees

- `StateMachine.assertTransition` rejects invalid status changes.
- `assertVersion` prevents lost updates (optimistic locking).
- Transactions (`prisma.$transaction`) wrap multi-entity mutations
  (payments, inventory, dispensing, releases).
- Double-witness requires a distinct second staff member and writes an audit
  event; it cannot be bypassed without a recorded emergency/break-glass action.
