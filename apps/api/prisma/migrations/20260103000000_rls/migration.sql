-- ============================================================================
-- FICMS – PostgreSQL Row-Level Security (defence-in-depth)
-- ============================================================================
-- This migration adds a DB-level tenant-isolation layer on top of the existing
-- application-level (TenantGuard + PrismaService) enforcement.
--
-- SAFE-BY-DESIGN: every policy permits rows when the session variable
--   app.current_org is NOT set (i.e. current_setting(..., true) IS NULL).
--   In that state RLS is a no-op and the app behaves exactly as before, so this
--   migration cannot break a running deployment.
--
-- To ACTIVATE strict isolation, the application must set the variable per
-- request/transaction:
--   SELECT set_config('app.current_org', :orgId, true);  -- inside a txn
-- or via a connection-pooler session setting. See docs/organization-isolation.md.
--
-- Per-row rule: if app.current_org is set, a row is visible/modifiable only when
-- the row's organizationId matches it. Rows that carry no organisation
-- (organizationId IS NULL, e.g. platform-level users/audit) remain visible.
-- ============================================================================


-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Appointment" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Appointment";
CREATE POLICY "tenant_isolation" ON "public"."Appointment"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditEvent" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."AuditEvent";
CREATE POLICY "tenant_isolation" ON "public"."AuditEvent"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."BreakGlassGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BreakGlassGrant" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."BreakGlassGrant";
CREATE POLICY "tenant_isolation" ON "public"."BreakGlassGrant"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."ClinicalNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ClinicalNote" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."ClinicalNote";
CREATE POLICY "tenant_isolation" ON "public"."ClinicalNote"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Consent" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Consent";
CREATE POLICY "tenant_isolation" ON "public"."Consent"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."CounselingSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CounselingSession" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."CounselingSession";
CREATE POLICY "tenant_isolation" ON "public"."CounselingSession"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."CreditNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CreditNote" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."CreditNote";
CREATE POLICY "tenant_isolation" ON "public"."CreditNote"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."CryoPosition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CryoPosition" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."CryoPosition";
CREATE POLICY "tenant_isolation" ON "public"."CryoPosition"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."CryoStorageItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CryoStorageItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."CryoStorageItem";
CREATE POLICY "tenant_isolation" ON "public"."CryoStorageItem"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."CryoTank" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CryoTank" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."CryoTank";
CREATE POLICY "tenant_isolation" ON "public"."CryoTank"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Cycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Cycle" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Cycle";
CREATE POLICY "tenant_isolation" ON "public"."Cycle"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Department" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Department";
CREATE POLICY "tenant_isolation" ON "public"."Department"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Dispensation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Dispensation" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Dispensation";
CREATE POLICY "tenant_isolation" ON "public"."Dispensation"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."DonorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DonorProfile" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."DonorProfile";
CREATE POLICY "tenant_isolation" ON "public"."DonorProfile"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Embryo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Embryo" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Embryo";
CREATE POLICY "tenant_isolation" ON "public"."Embryo"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Encounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Encounter" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Encounter";
CREATE POLICY "tenant_isolation" ON "public"."Encounter"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Facility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Facility" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Facility";
CREATE POLICY "tenant_isolation" ON "public"."Facility"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."InstallmentPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InstallmentPlan" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."InstallmentPlan";
CREATE POLICY "tenant_isolation" ON "public"."InstallmentPlan"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InventoryItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."InventoryItem";
CREATE POLICY "tenant_isolation" ON "public"."InventoryItem"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Invoice" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Invoice";
CREATE POLICY "tenant_isolation" ON "public"."Invoice"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."InvoiceLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InvoiceLineItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."InvoiceLineItem";
CREATE POLICY "tenant_isolation" ON "public"."InvoiceLineItem"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."LabOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabOrder" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."LabOrder";
CREATE POLICY "tenant_isolation" ON "public"."LabOrder"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."LabResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabResult" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."LabResult";
CREATE POLICY "tenant_isolation" ON "public"."LabResult"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."LabSpecimen" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabSpecimen" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."LabSpecimen";
CREATE POLICY "tenant_isolation" ON "public"."LabSpecimen"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."LabTestCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LabTestCatalog" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."LabTestCatalog";
CREATE POLICY "tenant_isolation" ON "public"."LabTestCatalog"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LeaveRequest" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."LeaveRequest";
CREATE POLICY "tenant_isolation" ON "public"."LeaveRequest"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."MedicalHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MedicalHistory" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."MedicalHistory";
CREATE POLICY "tenant_isolation" ON "public"."MedicalHistory"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."MedicationCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MedicationCatalog" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."MedicationCatalog";
CREATE POLICY "tenant_isolation" ON "public"."MedicationCatalog"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Notification" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Notification";
CREATE POLICY "tenant_isolation" ON "public"."Notification"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."NursingNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."NursingNote" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."NursingNote";
CREATE POLICY "tenant_isolation" ON "public"."NursingNote"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."OrganizationSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OrganizationSetting" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."OrganizationSetting";
CREATE POLICY "tenant_isolation" ON "public"."OrganizationSetting"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Partner" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Partner";
CREATE POLICY "tenant_isolation" ON "public"."Partner"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Patient" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Patient";
CREATE POLICY "tenant_isolation" ON "public"."Patient"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."PatientDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PatientDocument" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."PatientDocument";
CREATE POLICY "tenant_isolation" ON "public"."PatientDocument"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Payment" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Payment";
CREATE POLICY "tenant_isolation" ON "public"."Payment"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Prescription" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Prescription";
CREATE POLICY "tenant_isolation" ON "public"."Prescription"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."PrescriptionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PrescriptionItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."PrescriptionItem";
CREATE POLICY "tenant_isolation" ON "public"."PrescriptionItem"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PurchaseOrder" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."PurchaseOrder";
CREATE POLICY "tenant_isolation" ON "public"."PurchaseOrder"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Refund" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Refund";
CREATE POLICY "tenant_isolation" ON "public"."Refund"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."SemenAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SemenAnalysis" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."SemenAnalysis";
CREATE POLICY "tenant_isolation" ON "public"."SemenAnalysis"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."ServiceCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ServiceCatalog" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."ServiceCatalog";
CREATE POLICY "tenant_isolation" ON "public"."ServiceCatalog"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."StaffProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StaffProfile" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."StaffProfile";
CREATE POLICY "tenant_isolation" ON "public"."StaffProfile"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StockMovement" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."StockMovement";
CREATE POLICY "tenant_isolation" ON "public"."StockMovement"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Supplier" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."Supplier";
CREATE POLICY "tenant_isolation" ON "public"."Supplier"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."TemperatureLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TemperatureLog" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."TemperatureLog";
CREATE POLICY "tenant_isolation" ON "public"."TemperatureLog"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."TreatmentPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TreatmentPackage" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."TreatmentPackage";
CREATE POLICY "tenant_isolation" ON "public"."TreatmentPackage"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."UltrasoundScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UltrasoundScan" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."UltrasoundScan";
CREATE POLICY "tenant_isolation" ON "public"."UltrasoundScan"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."User";
CREATE POLICY "tenant_isolation" ON "public"."User"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );

-- "public" is the default schema used by Prisma's Postgres provider.
ALTER TABLE "public"."VitalSign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."VitalSign" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "public"."VitalSign";
CREATE POLICY "tenant_isolation" ON "public"."VitalSign"
  FOR ALL
  USING (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.current_org', true) IS NULL
    OR "organizationId" IS NULL
    OR "organizationId"::text = current_setting('app.current_org', true)
  );
