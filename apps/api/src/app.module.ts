import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { TenantGuard } from './common/tenant.guard';
import { PermissionsGuard } from './common/permissions.guard';
import { OrganizationsModule } from './organizations/organizations.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CyclesModule } from './cycles/cycles.module';
import { LabModule } from './lab/lab.module';
import { EmbryologyModule } from './embryology/embryology.module';
import { CryostorageModule } from './cryostorage/cryostorage.module';
import { UltrasoundModule } from './ultrasound/ultrasound.module';
import { NursingModule } from './nursing/nursing.module';
import { BillingModule } from './billing/billing.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { InventoryModule } from './inventory/inventory.module';
import { CounselingModule } from './counseling/counseling.module';
import { DonorModule } from './donor/donor.module';
import { HrModule } from './hr/hr.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportingModule } from './reporting/reporting.module';
import { UsersModule } from './users/users.module';
import { RecordsModule } from './records/records.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { BreakGlassModule } from './break-glass/break-glass.module';
import { ClinicalNotesModule } from './clinical-notes/clinical-notes.module';
import { ConsentsModule } from './consents/consents.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    FacilitiesModule,
    PatientsModule,
    AppointmentsModule,
    CyclesModule,
    LabModule,
    EmbryologyModule,
    CryostorageModule,
    UltrasoundModule,
    NursingModule,
    BillingModule,
    PharmacyModule,
    InventoryModule,
    CounselingModule,
    DonorModule,
    HrModule,
    DashboardModule,
    ReportingModule,
    UsersModule,
    RecordsModule,
    QueueModule,
    NotificationsModule,
    PaymentsModule,
    BreakGlassModule,
    ClinicalNotesModule,
    ConsentsModule,
    DocumentsModule,
    StorageModule,
  ],
  providers: [
    // Order matters: resolve tenant scope first, then permissions.
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
