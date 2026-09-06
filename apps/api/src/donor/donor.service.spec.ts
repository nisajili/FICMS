import { BadRequestException } from '@nestjs/common';
import { DonorService } from './donor.service';

type Ctx = { prisma?: any; audit?: any; records?: any };

const staff = { id: 'u1', organizationId: 'org-1', role: 'clinician' } as any;

function makeService(overrides: Ctx = {}) {
  const prisma =
    overrides.prisma ??
    (() => {
      const base = {
        donorProfile: {
          create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'd1', ...data })),
          findMany: jest.fn().mockResolvedValue([{ id: 'd1', donorCode: 'DON-2026-00001' }]),
          update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'd1', ...data })),
          count: jest.fn().mockResolvedValue(1),
        },
      };
      return base;
    })();
  const audit = overrides.audit ?? { record: jest.fn().mockResolvedValue(undefined) };
  const records = overrides.records ?? { next: jest.fn().mockResolvedValue('DON-2026-00001') };
  return { service: new DonorService(prisma, audit, records), prisma, audit, records };
}

describe('DonorService', () => {
  it('creates an anonymized donor with a generated code and audits it without PII', async () => {
    const { service, audit, records } = makeService();
    const result = await service.create({ sex: 'FEMALE', age: 28 }, staff);
    expect(result.donorCode).toBe('DON-2026-00001');
    expect(result.status).toBe('SCREENING');
    expect(result.organizationId).toBe('org-1');
    expect(records.next).toHaveBeenCalled();
    // No name/contact PII should leak into the audit record.
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'donor.create', resourceId: 'd1', after: { donorCode: 'DON-2026-00001' } }),
      staff,
    );
  });

  it('stores optional screening data on the donor profile', async () => {
    const { service, prisma } = makeService();
    await service.create({ sex: 'MALE', screening: { hiv: 'negative', bloodGroup: 'O+' } }, staff);
    expect(prisma.donorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ screening: { hiv: 'negative', bloodGroup: 'O+' }, status: 'SCREENING' }) }),
    );
  });

  it('rejects creation without an organisation context', async () => {
    const { service } = makeService();
    await expect(service.create({ sex: 'FEMALE' }, { id: 'u1' } as any)).rejects.toThrow(BadRequestException);
  });

  it('lists donors scoped to the organisation and never exposes identity fields', async () => {
    const { service, prisma } = makeService();
    const result = await service.list(staff);
    expect(result).toHaveLength(1);
    const call = prisma.donorProfile.findMany.mock.calls[0][0] as any;
    expect(call.where).toEqual({ organizationId: 'org-1' });
    // The select must not include any PII field.
    expect(call.select).toEqual(
      expect.objectContaining({ donorCode: expect.anything(), eligibility: expect.anything() }),
    );
    expect(call.select).not.toHaveProperty('email');
    expect(call.select).not.toHaveProperty('phone');
  });

  it('updates a donor eligibility and audits the change', async () => {
    const { service, prisma, audit } = makeService();
    await service.setEligibility('d1', true, staff);
    expect(prisma.donorProfile.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { eligibility: true, status: 'ELIGIBLE' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'donor.eligibility', resourceId: 'd1', after: { eligibility: true } }),
      staff,
    );
  });
});
