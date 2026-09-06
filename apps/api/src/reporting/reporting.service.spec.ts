import { ReportingService } from './reporting.service';

type Ctx = { prisma?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'doctor' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        cycle: {
          findMany: jest.fn().mockResolvedValue([
            { treatmentType: 'IVF', outcome: 'CLINICAL_PREGNANCY', status: 'OUTCOME', embryos: [{ id: 'e1' }, { id: 'e2' }] },
            { treatmentType: 'ICSI', outcome: 'pending', status: 'STIMULATION', embryos: [] },
          ]),
        },
        invoice: { aggregate: jest.fn().mockResolvedValue({ _sum: { total: 1000, amountPaid: 400, amountDue: 600 } }) },
        payment: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 400 } }),
          groupBy: jest.fn().mockResolvedValue([{ method: 'CARD', _sum: { amount: 400 } }]),
        },
        appointment: { count: jest.fn().mockResolvedValue(7) },
        patient: { count: jest.fn().mockResolvedValue(15) },
        inventoryItem: { findMany: jest.fn().mockResolvedValue([{ quantityOnHand: 2, minimumStock: 5 }]) },
      };
      return Object.assign(base, {
        $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
      });
    })();
  return { service: new ReportingService(prisma), prisma };
}

describe('ReportingService', () => {
  it('aggregates clinical cycle outcomes and embryos scoped to the org', async () => {
    const { service, prisma } = makeService();
    const result = await service.clinicalCycleOutcomes(staff, {});
    expect(result.total).toBe(2);
    expect(result.outcomes).toEqual({ CLINICAL_PREGNANCY: 1, pending: 1 });
    expect(result.byStatus).toEqual({ OUTCOME: 1, STIMULATION: 1 });
    expect(result.embryoTotals).toBe(2);
    expect(prisma.cycle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
    );
  });

  it('returns an empty clinical report when no org context is present', async () => {
    const { service } = makeService();
    await expect(service.clinicalCycleOutcomes({ id: 'u1' } as any, {})).resolves.toEqual({ total: 0, outcomes: {}, byStatus: {} });
  });

  it('aggregates a financial summary by status and method', async () => {
    const { service } = makeService();
    const result = await service.financialSummary(staff, {});
    expect(result).toEqual({
      invoiced: 1000,
      revenue: 400,
      outstanding: 600,
      byMethod: { CARD: 400 },
      currencyNote: expect.any(String),
    });
  });

  it('reports low-stock items from the operational summary', async () => {
    const { service } = makeService();
    const result = await service.operationalSummary(staff, {});
    expect(result.appointments).toBe(7);
    expect(result.patients).toBe(15);
    expect(result.lowStockCount).toBe(1);
  });

  it('exports clinical rows without PHI fields', async () => {
    const { service } = makeService();
    const rows = await service.exportClinical(staff, {});
    expect(rows).toEqual([
      { treatmentType: 'IVF', status: 'OUTCOME', outcome: 'CLINICAL_PREGNANCY' },
      { treatmentType: 'ICSI', status: 'STIMULATION', outcome: 'pending' },
    ]);
  });
});
