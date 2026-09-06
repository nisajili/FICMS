import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '@ficms/types';
import type { DashboardStats } from '@ficms/types';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(user: SessionUser): Promise<DashboardStats> {
    const org = user.organizationId;
    if (!org) {
      return { patients: 0, appointmentsToday: 0, activeCycles: 0, outstandingBalance: 0, pendingLabResults: 0 };
    }
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [patients, appointmentsToday, activeCycles, outstanding, pendingLab] = await this.prisma.$transaction([
      this.prisma.patient.count({ where: { organizationId: org, status: 'ACTIVE' } }),
      this.prisma.appointment.count({ where: { organizationId: org, scheduledStart: { gte: todayStart, lte: todayEnd }, status: { in: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'REQUESTED'] } } }),
      this.prisma.cycle.count({ where: { organizationId: org, status: { in: ['PLANNED', 'BASELINE_ASSESSMENT', 'STIMULATION', 'MONITORING', 'TRIGGER', 'RETRIEVAL', 'FERTILIZATION', 'EMBRYO_CULTURE', 'TRANSFER', 'FREEZING', 'LUTEAL_SUPPORT', 'PREGNANCY_TEST', 'CLINICAL_PREGNANCY'] } } }),
      this.prisma.invoice.aggregate({ where: { organizationId: org }, _sum: { amountDue: true } }),
      this.prisma.labOrder.count({ where: { organizationId: org, status: { in: ['REQUESTED', 'SPECIMEN_COLLECTED', 'ACCESSED', 'PROCESSING', 'VERIFIED'] } } }),
    ]);

    return {
      patients,
      appointmentsToday,
      activeCycles,
      outstandingBalance: Number(outstanding._sum.amountDue ?? 0),
      pendingLabResults: pendingLab,
    };
  }

  async todayAppointments(user: SessionUser) {
    const org = user.organizationId;
    if (!org) return [];
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);
    return this.prisma.appointment.findMany({
      where: { organizationId: org, scheduledStart: { gte: todayStart, lte: todayEnd } },
      include: { patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async platformStats() {
    const [orgs, patients, users, facilities] = await this.prisma.$transaction([
      this.prisma.organization.count(),
      this.prisma.patient.count(),
      this.prisma.user.count(),
      this.prisma.facility.count(),
    ]);
    // Platform-level stats never expose patient-identifiable data.
    return { organizations: orgs, patients, users, facilities };
  }
}
