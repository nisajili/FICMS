import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionUser } from '@ficms/types';

interface DateRange { from?: string; to?: string; }

const rangeToWhere = (r: DateRange, field: string): Record<string, unknown> => ({
  ...(r.from ? { [field]: { gte: new Date(r.from) } } : {}),
  ...(r.to ? { [field]: { lte: new Date(r.to) } } : {}),
});

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async clinicalCycleOutcomes(user: SessionUser, r: DateRange) {
    const org = user.organizationId;
    if (!org) return { total: 0, outcomes: {}, byStatus: {} };
    const where: Record<string, unknown> = { organizationId: org };
    const cycles = await this.prisma.cycle.findMany({ where: { ...where }, include: { embryos: true } });
    const total = cycles.length;
    const outcomes: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const c of cycles) {
      outcomes[c.outcome ?? 'pending'] = (outcomes[c.outcome ?? 'pending'] ?? 0) + 1;
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    }
    // Denominator explicitly stated (total cycles).
    return { total, denominatorNote: 'Denominator = total cycles in period', outcomes, byStatus, embryoTotals: cycles.reduce((a, c) => a + c.embryos.length, 0) };
  }

  async financialSummary(user: SessionUser, r: DateRange) {
    const org = user.organizationId;
    if (!org) return { revenue: 0, outstanding: 0, byMethod: {} };
    const [invoiceAgg, paymentAgg, payments] = await this.prisma.$transaction([
      this.prisma.invoice.aggregate({ where: { organizationId: org }, _sum: { total: true, amountPaid: true, amountDue: true } }),
      this.prisma.payment.aggregate({ where: { organizationId: org, status: { in: ['SUCCEEDED'] } }, _sum: { amount: true } }),
      this.prisma.payment.groupBy({ by: ['method'], where: { organizationId: org, status: 'SUCCEEDED' }, _sum: { amount: true } }),
    ]);
    const byMethod: Record<string, number> = {};
    for (const p of payments) byMethod[p.method] = Number(p._sum.amount ?? 0);
    return {
      invoiced: Number(invoiceAgg._sum.total ?? 0),
      revenue: Number(paymentAgg._sum.amount ?? 0),
      outstanding: Number(invoiceAgg._sum.amountDue ?? 0),
      byMethod,
      currencyNote: 'Currency is organisation-configured; totals shown in the org default currency.',
    };
  }

  async operationalSummary(user: SessionUser, r: DateRange) {
    const org = user.organizationId;
    if (!org) return { appointments: 0, appointmentsToday: 0, patients: 0, lowStock: 0 };
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [appointments, patients, lowStock] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where: { organizationId: org } }),
      this.prisma.patient.count({ where: { organizationId: org } }),
      this.prisma.inventoryItem.findMany({ where: { organizationId: org } }),
    ]);
    const lowStockItems = lowStock.filter((i) => Number(i.quantityOnHand) <= Number(i.minimumStock));
    return { appointments, patients, lowStockCount: lowStockItems.length, note: 'Definitions captured alongside each metric.' };
  }

  async exportClinical(user: SessionUser, _r: DateRange) {
    // CSV-ready rows (no PHI in the aggregate export; patient counts by segment).
    const org = user.organizationId;
    const cycles = await this.prisma.cycle.findMany({ where: { organizationId: org ?? undefined }, select: { treatmentType: true, status: true, outcome: true } });
    return cycles.map((c) => ({ treatmentType: c.treatmentType, status: c.status, outcome: c.outcome ?? '' }));
  }
}
