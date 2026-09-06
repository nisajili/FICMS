-- FICMS baseline migration
-- Generated to match apps/api/prisma/schema.prisma.
-- Apply with: pnpm db:deploy  (prisma migrate deploy)

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE','SUSPENDED','PENDING');
CREATE TYPE "FacilityStatus" AS ENUM ('ACTIVE','CLOSED');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','SUSPENDED','DISABLED','PENDING');
CREATE TYPE "Sex" AS ENUM ('FEMALE','MALE','OTHER','UNKNOWN');
CREATE TYPE "PatientStatus" AS ENUM ('ACTIVE','ARCHIVED','DECEASED');
CREATE TYPE "PatientDocumentType" AS ENUM ('ID','SCAN','REPORT','CONSENT','OTHER');
CREATE TYPE "ConsentStatus" AS ENUM ('DRAFT','PENDING_SIGNATURE','SIGNED','WITNESSED','REVOKED');
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED','SCHEDULED','CHECKED_IN','IN_PROGRESS','COMPLETED','NO_SHOW','CANCELLED');
CREATE TYPE "AppointmentPriority" AS ENUM ('ROUTINE','URGENT','EMERGENCY');
CREATE TYPE "CycleStatus" AS ENUM ('PLANNED','BASELINE_ASSESSMENT','STIMULATION','MONITORING','TRIGGER','RETRIEVAL','FERTILIZATION','EMBRYO_CULTURE','TRANSFER','FREEZING','LUTEAL_SUPPORT','PREGNANCY_TEST','CLINICAL_PREGNANCY','OUTCOME','CANCELLED');
CREATE TYPE "TreatmentType" AS ENUM ('IVF','ICSI','IUI','OTHER');
CREATE TYPE "SemenAnalysisStatus" AS ENUM ('REQUESTED','COLLECTED','PROCESSING','VERIFIED','RELEASED');
CREATE TYPE "EmbryoStatus" AS ENUM ('OOCYTE','FERTILIZED','CULTURING','TRANSFERRED','FROZEN','DISCARDED','BIOPSIED','WARMED','THAWED');
CREATE TYPE "StorageItemType" AS ENUM ('EMBRYO','OOCYTE','SPERM','TISSUE');
CREATE TYPE "StorageItemStatus" AS ENUM ('STORED','RELEASED','THAWED','TRANSFERRED','DISPOSED','EXPIRED');
CREATE TYPE "LabOrderStatus" AS ENUM ('REQUESTED','SPECIMEN_COLLECTED','ACCESSED','PROCESSING','VERIFIED','RELEASED','INVALIDATED');
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT','PRESCRIBED','VERIFIED','DISPENSED','PARTIALLY_DISPENSED','CANCELLED');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','CANCELLED','REFUNDED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH','BANK_TRANSFER','CARD','MOBILE_MONEY','INSURANCE','OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','SUCCEEDED','FAILED','REFUNDED','PARTIALLY_REFUNDED');
CREATE TYPE "DonorStatus" AS ENUM ('SCREENING','ELIGIBLE','INELIGIBLE','ACTIVE','INACTIVE');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED');
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED','SENT','DELIVERED','FAILED','READ');

-- ============================================================
-- Tenancy & structure
-- ============================================================
CREATE TABLE "Organization" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "domain" TEXT,
  "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
  "logoKey" TEXT,
  "faviconKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

CREATE TABLE "OrganizationSetting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  CONSTRAINT "OrganizationSetting_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrganizationSetting_organizationId_key" ON "OrganizationSetting"("organizationId", "key");

CREATE TABLE "Facility" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "phone" TEXT,
  "timezone" TEXT,
  "status" "FacilityStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Facility_organizationId_code_key" ON "Facility"("organizationId","code");
CREATE INDEX "Facility_organizationId_idx" ON "Facility"("organizationId");

CREATE TABLE "Department" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "facilityId" UUID,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Department_organizationId_code_key" ON "Department"("organizationId","code");
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Users / sessions
-- ============================================================
CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "facilityId" UUID,
  "departmentId" UUID,
  "email" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "passwordHash" TEXT,
  "mfaSecret" TEXT,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "passwordResetToken" TEXT,
  "passwordResetAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_role_idx" ON "User"("role");
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Session" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Patients
-- ============================================================
CREATE TABLE "Patient" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "medicalRecordNumber" TEXT NOT NULL,
  "givenName" TEXT NOT NULL,
  "familyName" TEXT NOT NULL,
  "preferredName" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "emergencyName" TEXT,
  "emergencyPhone" TEXT,
  "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" UUID,
  CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Patient_medicalRecordNumber_key" ON "Patient"("medicalRecordNumber");
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");
CREATE INDEX "Patient_organizationId_medicalRecordNumber_idx" ON "Patient"("organizationId","medicalRecordNumber");
CREATE INDEX "Patient_organizationId_familyName_givenName_idx" ON "Patient"("organizationId","familyName","givenName");
CREATE INDEX "Patient_organizationId_phone_idx" ON "Patient"("organizationId","phone");
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Partner" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "partnerId" UUID NOT NULL,
  "relationshipType" TEXT NOT NULL DEFAULT 'partner',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Partner_patientId_partnerId_key" ON "Partner"("patientId","partnerId");
CREATE INDEX "Partner_organizationId_idx" ON "Partner"("organizationId");
CREATE INDEX "Partner_partnerId_idx" ON "Partner"("partnerId");
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PatientDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "type" "PatientDocumentType" NOT NULL DEFAULT 'OTHER',
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "description" TEXT,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientDocument_organizationId_patientId_idx" ON "PatientDocument"("organizationId","patientId");
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Consent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "templateKey" TEXT,
  "status" "ConsentStatus" NOT NULL DEFAULT 'DRAFT',
  "signedAt" TIMESTAMP(3),
  "signedByName" TEXT,
  "signedById" TEXT,
  "witnessName" TEXT,
  "witnessId" TEXT,
  "evidenceKey" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Consent_organizationId_patientId_idx" ON "Consent"("organizationId","patientId");
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Appointments
-- ============================================================
CREATE TABLE "Appointment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "facilityId" UUID,
  "code" TEXT NOT NULL,
  "patientId" UUID NOT NULL,
  "practitionerId" TEXT,
  "scheduledStart" TIMESTAMP(3) NOT NULL,
  "scheduledEnd" TIMESTAMP(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
  "priority" "AppointmentPriority" NOT NULL DEFAULT 'ROUTINE',
  "serviceType" TEXT,
  "queueNumber" TEXT,
  "checkInAt" TIMESTAMP(3),
  "checkOutAt" TIMESTAMP(3),
  "notes" TEXT,
  "source" TEXT,
  "cancelledReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Appointment_code_key" ON "Appointment"("code");
CREATE INDEX "Appointment_organizationId_scheduledStart_idx" ON "Appointment"("organizationId","scheduledStart");
CREATE INDEX "Appointment_organizationId_patientId_idx" ON "Appointment"("organizationId","patientId");
CREATE INDEX "Appointment_organizationId_status_idx" ON "Appointment"("organizationId","status");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- Medical records
-- ============================================================
CREATE TABLE "Encounter" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "appointmentId" TEXT,
  "clinicianId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'consultation',
  "chiefComplaint" TEXT,
  "notesSummary" TEXT,
  "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Encounter_organizationId_patientId_idx" ON "Encounter"("organizationId","patientId");
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClinicalNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "encounterId" UUID,
  "patientId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'clinical',
  "body" TEXT NOT NULL,
  "signed" BOOLEAN NOT NULL DEFAULT false,
  "signedById" TEXT,
  "signedAt" TIMESTAMP(3),
  "supersededById" TEXT,
  "previousId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClinicalNote_organizationId_patientId_idx" ON "ClinicalNote"("organizationId","patientId");
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MedicalHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "allergies" JSONB,
  "familyHistory" JSONB,
  "socialHistory" JSONB,
  "surgicalHistory" JSONB,
  "reproductiveHistory" JSONB,
  "obstetricHistory" JSONB,
  "medications" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MedicalHistory_organizationId_patientId_idx" ON "MedicalHistory"("organizationId","patientId");
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Cycles & events
-- ============================================================
CREATE TABLE "Cycle" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "partnerId" UUID,
  "cycleNumber" TEXT NOT NULL,
  "treatmentType" "TreatmentType" NOT NULL,
  "protocolTemplate" TEXT,
  "status" "CycleStatus" NOT NULL DEFAULT 'PLANNED',
  "diagnosis" TEXT,
  "startDate" TIMESTAMP(3),
  "triggerAt" TIMESTAMP(3),
  "retrievalAt" TIMESTAMP(3),
  "transferAt" TIMESTAMP(3),
  "pregnancyTestAt" TIMESTAMP(3),
  "outcome" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Cycle_organizationId_cycleNumber_key" ON "Cycle"("organizationId","cycleNumber");
CREATE INDEX "Cycle_organizationId_patientId_idx" ON "Cycle"("organizationId","patientId");
CREATE INDEX "Cycle_organizationId_status_idx" ON "Cycle"("organizationId","status");
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CycleMedication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cycleId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "dose" TEXT NOT NULL,
  "route" TEXT,
  "dayFrom" INTEGER,
  "dayTo" INTEGER,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CycleMedication_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CycleMedication" ADD CONSTRAINT "CycleMedication_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CycleEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cycleId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CycleEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "CycleEvent" ADD CONSTRAINT "CycleEvent_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Andrology
-- ============================================================
CREATE TABLE "SemenAnalysis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "cycleId" UUID,
  "status" "SemenAnalysisStatus" NOT NULL DEFAULT 'REQUESTED',
  "collectionDate" TIMESTAMP(3),
  "abstinenceDays" DOUBLE PRECISION,
  "volumeMl" DOUBLE PRECISION,
  "concentrationM" DOUBLE PRECISION,
  "totalCountM" DOUBLE PRECISION,
  "motilityPercent" DOUBLE PRECISION,
  "progressiveMotilityPercent" DOUBLE PRECISION,
  "morphologyPercent" DOUBLE PRECISION,
  "ph" DOUBLE PRECISION,
  "notes" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "releasedById" TEXT,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SemenAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SemenAnalysis_organizationId_patientId_idx" ON "SemenAnalysis"("organizationId","patientId");

-- ============================================================
-- Embryology
-- ============================================================
CREATE TABLE "Embryo" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "cycleId" UUID NOT NULL,
  "patientId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "EmbryoStatus" NOT NULL DEFAULT 'OOCYTE',
  "dayObserved" INTEGER,
  "grade" TEXT,
  "development" TEXT,
  "location" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "witnessedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Embryo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Embryo_organizationId_cycleId_idx" ON "Embryo"("organizationId","cycleId");
ALTER TABLE "Embryo" ADD CONSTRAINT "Embryo_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmbryoObservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "embryoId" UUID NOT NULL,
  "day" INTEGER NOT NULL,
  "cellCount" INTEGER,
  "grade" TEXT,
  "fragmentationPercent" DOUBLE PRECISION,
  "notes" TEXT,
  "observedById" TEXT,
  "witnessedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmbryoObservation_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "EmbryoObservation" ADD CONSTRAINT "EmbryoObservation_embryoId_fkey" FOREIGN KEY ("embryoId") REFERENCES "Embryo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Cryostorage
-- ============================================================
CREATE TABLE "CryoTank" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "facilityId" UUID,
  "name" TEXT NOT NULL,
  "label" TEXT,
  "capacity" INTEGER NOT NULL,
  "currentTempC" DOUBLE PRECISION,
  "alarmLowC" DOUBLE PRECISION,
  "alarmHighC" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CryoTank_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CryoTank_organizationId_idx" ON "CryoTank"("organizationId");

CREATE TABLE "CryoPosition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "tankId" UUID NOT NULL,
  "room" TEXT,
  "canister" TEXT,
  "cane" TEXT,
  "goblet" TEXT,
  "rack" TEXT,
  "position" TEXT,
  "label" TEXT,
  CONSTRAINT "CryoPosition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CryoPosition_tankId_canister_cane_goblet_rack_position_key" ON "CryoPosition"("tankId","canister","cane","goblet","rack","position");
CREATE INDEX "CryoPosition_organizationId_tankId_idx" ON "CryoPosition"("organizationId","tankId");
ALTER TABLE "CryoPosition" ADD CONSTRAINT "CryoPosition_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "CryoTank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CryoStorageItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "positionId" UUID NOT NULL,
  "patientId" TEXT NOT NULL,
  "cycleId" UUID,
  "type" "StorageItemType" NOT NULL,
  "label" TEXT NOT NULL,
  "status" "StorageItemStatus" NOT NULL DEFAULT 'STORED',
  "frozenAt" TIMESTAMP(3),
  "thawedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "disposedAt" TIMESTAMP(3),
  "consentStatus" TEXT,
  "agreementSignedAt" TIMESTAMP(3),
  "renewalDate" TIMESTAMP(3),
  "storedById" TEXT,
  "witnessedById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CryoStorageItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CryoStorageItem_positionId_key" ON "CryoStorageItem"("positionId");
CREATE INDEX "CryoStorageItem_organizationId_patientId_idx" ON "CryoStorageItem"("organizationId","patientId");
CREATE INDEX "CryoStorageItem_organizationId_status_idx" ON "CryoStorageItem"("organizationId","status");
ALTER TABLE "CryoStorageItem" ADD CONSTRAINT "CryoStorageItem_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "CryoPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TemperatureLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "tankId" UUID NOT NULL,
  "tempC" DOUBLE PRECISION NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "deviceId" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isAlarm" BOOLEAN NOT NULL DEFAULT false,
  "recordedById" TEXT,
  CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TemperatureLog_organizationId_tankId_recordedAt_idx" ON "TemperatureLog"("organizationId","tankId","recordedAt");
ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "CryoTank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Ultrasound
-- ============================================================
CREATE TABLE "UltrasoundScan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "cycleId" UUID,
  "type" TEXT NOT NULL,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endometrialThicknessMm" DOUBLE PRECISION,
  "leftOvaryFollicles" JSONB,
  "rightOvaryFollicles" JSONB,
  "report" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "imagesKey" JSONB,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UltrasoundScan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UltrasoundScan_organizationId_patientId_idx" ON "UltrasoundScan"("organizationId","patientId");
ALTER TABLE "UltrasoundScan" ADD CONSTRAINT "UltrasoundScan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Nursing
-- ============================================================
CREATE TABLE "VitalSign" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "temperatureC" DOUBLE PRECISION,
  "pulseBpm" INTEGER,
  "bpSystolic" INTEGER,
  "bpDiastolic" INTEGER,
  "respiratoryRate" INTEGER,
  "spo2" INTEGER,
  "weightKg" DOUBLE PRECISION,
  "heightCm" DOUBLE PRECISION,
  "recordedById" TEXT,
  CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VitalSign_organizationId_patientId_idx" ON "VitalSign"("organizationId","patientId");
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NursingNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "administeredMedication" TEXT,
  "procedure" TEXT,
  "checklist" JSONB,
  "observation" TEXT,
  "dischargeInstructions" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NursingNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NursingNote_organizationId_patientId_idx" ON "NursingNote"("organizationId","patientId");

-- ============================================================
-- Laboratory
-- ============================================================
CREATE TABLE "LabTestCatalog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT,
  "unit" TEXT,
  "referenceLow" TEXT,
  "referenceHigh" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabTestCatalog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LabTestCatalog_organizationId_code_key" ON "LabTestCatalog"("organizationId","code");

CREATE TABLE "LabOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "status" "LabOrderStatus" NOT NULL DEFAULT 'REQUESTED',
  "orderedById" TEXT,
  "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "priority" TEXT NOT NULL DEFAULT 'routine',
  "requestedTests" JSONB,
  "alertRaisedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LabOrder_orderNumber_key" ON "LabOrder"("orderNumber");
CREATE INDEX "LabOrder_organizationId_patientId_idx" ON "LabOrder"("organizationId","patientId");
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LabSpecimen" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "labOrderId" UUID NOT NULL,
  "barcode" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "collectedAt" TIMESTAMP(3),
  "collectedById" TEXT,
  "receivedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'collected',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabSpecimen_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LabSpecimen_barcode_key" ON "LabSpecimen"("barcode");
ALTER TABLE "LabSpecimen" ADD CONSTRAINT "LabSpecimen_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LabResult" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "labOrderId" UUID NOT NULL,
  "testName" TEXT NOT NULL,
  "testCode" TEXT,
  "value" TEXT NOT NULL,
  "unit" TEXT,
  "referenceLow" TEXT,
  "referenceHigh" TEXT,
  "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
  "isCritical" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'result',
  "enteredById" TEXT,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "releasedById" TEXT,
  "releasedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LabResult_organizationId_labOrderId_idx" ON "LabResult"("organizationId","labOrderId");
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Pharmacy
-- ============================================================
CREATE TABLE "MedicationCatalog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "genericName" TEXT,
  "form" TEXT,
  "strength" TEXT,
  "controlled" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicationCatalog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MedicationCatalog_organizationId_idx" ON "MedicationCatalog"("organizationId");

CREATE TABLE "Prescription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
  "prescribedById" TEXT,
  "prescribedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Prescription_organizationId_patientId_idx" ON "Prescription"("organizationId","patientId");
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PrescriptionItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "prescriptionId" UUID NOT NULL,
  "medicationName" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "frequency" TEXT,
  "durationDays" INTEGER,
  "instructions" TEXT,
  "quantity" INTEGER NOT NULL,
  "issuedQuantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Dispensation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "prescriptionId" UUID NOT NULL,
  "medicationName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "batch" TEXT,
  "expiryDate" TIMESTAMP(3),
  "dispensedById" TEXT,
  "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Dispensation_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Inventory
-- ============================================================
CREATE TABLE "InventoryItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "facilityId" UUID,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "category" TEXT,
  "unit" TEXT,
  "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
  "minimumStock" INTEGER NOT NULL DEFAULT 0,
  "expiryDate" TIMESTAMP(3),
  "batch" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryItem_organizationId_sku_idx" ON "InventoryItem"("organizationId","sku");
CREATE INDEX "InventoryItem_organizationId_expiryDate_idx" ON "InventoryItem"("organizationId","expiryDate");

CREATE TABLE "StockMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "inventoryItemId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "batch" TEXT,
  "reason" TEXT,
  "performedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockMovement_organizationId_inventoryItemId_idx" ON "StockMovement"("organizationId","inventoryItemId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Supplier" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "supplierId" UUID,
  "poNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- ============================================================
-- Billing
-- ============================================================
CREATE TABLE "ServiceCatalog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT,
  "taxable" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceCatalog_organizationId_code_key" ON "ServiceCatalog"("organizationId","code");

CREATE TABLE "TreatmentPackage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT,
  "services" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreatmentPackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TreatmentPackage_organizationId_code_key" ON "TreatmentPackage"("organizationId","code");

CREATE TABLE "Invoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "amountDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "dueDate" TIMESTAMP(3),
  "notes" TEXT,
  "approvedById" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_organizationId_patientId_idx" ON "Invoice"("organizationId","patientId");
CREATE INDEX "Invoice_organizationId_status_idx" ON "Invoice"("organizationId","status");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InvoiceLineItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "totalPrice" DECIMAL(12,2) NOT NULL,
  "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InstallmentPlan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "installmentNumber" INTEGER NOT NULL,
  "amountDue" DECIMAL(12,2) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Payment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceId" UUID,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "reference" TEXT,
  "provider" TEXT,
  "externalRef" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "paidById" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_organizationId_invoiceId_idx" ON "Payment"("organizationId","invoiceId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Refund" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "paymentId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT,
  "approvedById" TEXT,
  "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CreditNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceId" UUID,
  "creditNumber" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT,
  "issuedById" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreditNote_creditNumber_key" ON "CreditNote"("creditNumber");

-- ============================================================
-- Counseling / Donor / HR
-- ============================================================
CREATE TABLE "CounselingSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "sessionType" TEXT NOT NULL,
  "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "counselorId" TEXT,
  "summary" TEXT,
  "confidential" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CounselingSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CounselingSession_organizationId_patientId_idx" ON "CounselingSession"("organizationId","patientId");
ALTER TABLE "CounselingSession" ADD CONSTRAINT "CounselingSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DonorProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "donorCode" TEXT NOT NULL,
  "status" "DonorStatus" NOT NULL DEFAULT 'SCREENING',
  "sex" "Sex" NOT NULL DEFAULT 'UNKNOWN',
  "age" INTEGER,
  "anonymousRef" TEXT,
  "screening" JSONB,
  "eligibility" BOOLEAN NOT NULL DEFAULT false,
  "consentSignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DonorProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DonorProfile_donorCode_key" ON "DonorProfile"("donorCode");
CREATE INDEX "DonorProfile_organizationId_idx" ON "DonorProfile"("organizationId");

CREATE TABLE "StaffProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "userId" UUID,
  "employeeNumber" TEXT,
  "jobTitle" TEXT,
  "department" TEXT,
  "qualification" TEXT,
  "licenseNumber" TEXT,
  "licenseExpiry" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");
CREATE INDEX "StaffProfile_organizationId_idx" ON "StaffProfile"("organizationId");

CREATE TABLE "LeaveRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'annual',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeaveRequest_organizationId_userId_idx" ON "LeaveRequest"("organizationId","userId");

-- ============================================================
-- Audit & notifications
-- ============================================================
CREATE TABLE "AuditEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID,
  "facilityId" UUID,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_organizationId_timestamp_idx" ON "AuditEvent"("organizationId","timestamp");
CREATE INDEX "AuditEvent_organizationId_resourceType_resourceId_idx" ON "AuditEvent"("organizationId","resourceType","resourceId");

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'general',
  "channel" TEXT,
  "subject" TEXT,
  "body" TEXT,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_organizationId_userId_idx" ON "Notification"("organizationId","userId");

-- ============================================================
-- Foreign keys not yet attached
-- ============================================================
ALTER TABLE "OrganizationSetting" ADD CONSTRAINT "OrganizationSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Note: gen_random_uuid() is built into PostgreSQL 13+ (pgcrypto not required).
