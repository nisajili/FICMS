import { DashboardService } from './dashboard.service';

type Ctx = { prisma?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'doctor' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setUTCHours(23, 59, 59, 999);
      const base = {
        patient: { count: jest.fn().mockResolvedValue(10) },
        appointment: {
          count: jest.fn().mockResolvedValue(4),
          findMany: jest.fn().mockResolvedValue([{ id: 'a1' }]),
        },
        cycle: { count: jest.fn().mockResolvedValue(3) },
        invoice: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountDue: 2500 } }) },
        labOrder: { count: jest.fn().mockResolvedValue(2) },
        organization: { count: jest.fn().mockResolvedValue(1) },
        user: { count: jest.fn().mockResolvedValue(5) },
        facility: { count: jest.fn().mockResolvedValue(2) },
      };
      return Object.assign(base, {
        $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
      });
    })();
  return { service: new DashboardService(prisma), prisma };
}

describe('DashboardService', () => {
  it('returns zeroed stats when no organisation context is available', async () => {
    const { service } = makeService();
    await expect(service.stats({ id: 'u1' } as any)).resolves.toEqual({
      patients: 0,
      appointmentsToday: 0,
      activeCycles: 0,
      outstandingBalance: 0,
      pendingLabResults: 0,
    });
  });

  it('computes org-scoped clinical and financial stats', async () => {
    const { service, prisma } = makeService();
    const result = await service.stats(staff);
    expect(result).toEqual({
      patients: 10,
      appointmentsToday: 4,
      activeCycles: 3,
      outstandingBalance: 2500,
      pendingLabResults: 2,
    });
    // All stats queries must be scoped to the user's organisation.
    expect(prisma.patient.count).toHaveBeenCalledWith({ where: { organizationId: 'org-1', status: 'ACTIVE' } });
    expect(prisma.invoice.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });

  it('scopes todays appointments to the organisation', async () => {
    const { service, prisma } = makeService();
    await service.todayAppointments(staff);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
    );
  });

  it('returns platform stats that never include patient-identifiable data', async () => {
    const { service, prisma } = makeService();
    const result = await service.platformStats();
    expect(result).toEqual({ organizations: 1, patients: 10, users: 5, facilities: 2 });
    expect(prisma.patient.count).toHaveBeenCalledWith();
  });
});
