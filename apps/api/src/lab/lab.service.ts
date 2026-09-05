import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecordNumberService } from '../records/record-number.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import {
  CreateLabOrderDto,
  CreateSpecimenDto,
  SubmitResultDto,
  VerifyResultDto,
  CreateLabTestDto,
  LabQueryDto,
} from './dto/lab.dto';

@Injectable()
export class LabService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly records: RecordNumberService,
  ) {}

  async createTest(dto: CreateLabTestDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const test = await this.prisma.labTestCatalog.create({
      data: { organizationId: org, name: dto.name, code: dto.code, category: dto.category, unit: dto.unit, referenceLow: dto.referenceLow, referenceHigh: dto.referenceHigh },
    });
    await this.audit.record({ action: 'lab.create_test', resourceType: 'lab', resourceId: test.id, after: { code: dto.code } }, user);
    return test;
  }

  async createOrder(dto: CreateLabOrderDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');
    const orderNumber = await this.records.next(
      () => this.prisma.labOrder.count({ where: { organizationId: org } }),
      { prefix: 'LAB' },
    );
    const order = await this.prisma.labOrder.create({
      data: {
        organizationId: org,
        orderNumber,
        patientId: dto.patientId,
        priority: dto.priority ?? 'routine',
        requestedTests: dto.requestedTests ? (dto.requestedTests as object) : undefined,
        orderedById: user.id,
        createdBy: user.id,
      },
    });
    await this.audit.record({ action: 'lab.create_order', resourceType: 'lab', resourceId: order.id, after: { orderNumber } }, user);
    return order;
  }

  async collectSpecimen(orderId: string, dto: CreateSpecimenDto, user: SessionUser) {
    const order = await this.requireOrder(orderId, user);
    const barcode = `SPK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const spec = await this.prisma.labSpecimen.create({
      data: {
        organizationId: user.organizationId!,
        labOrderId: order.id,
        barcode,
        type: dto.type,
        collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : new Date(),
        collectedById: user.id,
        status: 'collected',
        notes: dto.notes,
      },
    });
    await this.prisma.labOrder.update({ where: { id: order.id }, data: { status: 'SPECIMEN_COLLECTED' } });
    await this.audit.record({ action: 'lab.collect_specimen', resourceType: 'lab', resourceId: order.id, after: { barcode } }, user);
    return spec;
  }

  async access(orderId: string, user: SessionUser) {
    const order = await this.requireOrder(orderId, user);
    await this.prisma.labOrder.update({ where: { id: order.id }, data: { status: 'ACCESSED' } });
    return { status: 'ACCESSED' };
  }

  async process(orderId: string, user: SessionUser) {
    const order = await this.requireOrder(orderId, user);
    await this.prisma.labOrder.update({ where: { id: order.id }, data: { status: 'PROCESSING' } });
    return { status: 'PROCESSING' };
  }

  async submitResult(orderId: string, dto: SubmitResultDto, user: SessionUser) {
    const order = await this.requireOrder(orderId, user);
    const isAbnormal = this.evalRange(dto.value, dto.referenceLow, dto.referenceHigh);
    const result = await this.prisma.labResult.create({
      data: {
        organizationId: user.organizationId!,
        labOrderId: order.id,
        testName: dto.testName,
        testCode: dto.testCode,
        value: dto.value,
        unit: dto.unit,
        referenceLow: dto.referenceLow,
        referenceHigh: dto.referenceHigh,
        isAbnormal,
        enteredById: user.id,
        notes: dto.notes,
      },
    });
    await this.audit.record({ action: 'lab.submit_result', resourceType: 'lab', resourceId: order.id, after: { testName: dto.testName } }, user);
    return result;
  }

  async verify(orderId: string, dto: VerifyResultDto, user: SessionUser) {
    const order = await this.requireOrder(orderId, user);
    const result = await this.prisma.labResult.findFirst({ where: { id: dto.resultId, labOrderId: order.id, organizationId: user.organizationId ?? undefined } });
    if (!result) throw new NotFoundException('Result not found.');
    const updated = await this.prisma.labResult.update({
      where: { id: result.id },
      data: {
        isCritical: dto.isCritical ?? false,
        isAbnormal: dto.isAbnormal ?? result.isAbnormal,
        verifiedById: user.id,
        verifiedAt: new Date(),
        status: 'verified',
      },
    });
    await this.audit.record({ action: 'lab.verify_result', resourceType: 'lab', resourceId: order.id, after: { verified: true } }, user);
    return updated;
  }

  async release(orderId: string, user: SessionUser) {
    const order = await this.requireOrder(orderId, user);
    // Only allow release when at least one result is verified.
    const verified = await this.prisma.labResult.findFirst({ where: { labOrderId: order.id, verifiedAt: { not: null } } });
    if (!verified) throw new BadRequestException('At least one result must be verified before release.');
    const updated = await this.prisma.labOrder.update({
      where: { id: order.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
    await this.audit.record({ action: 'lab.release_order', resourceType: 'lab', resourceId: order.id, after: { released: true } }, user);
    // Raise critical alert if any result is critical.
    const critical = await this.prisma.labResult.count({ where: { labOrderId: order.id, isCritical: true } });
    if (critical > 0) {
      await this.prisma.labOrder.update({ where: { id: order.id }, data: { alertRaisedAt: new Date() } });
    }
    return updated;
  }

  async listOrders(q: LabQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.status) where.status = q.status;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.labOrder.findMany({ where, skip, take, orderBy: orderBy ?? { updatedAt: 'desc' }, include: { patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } }, results: true, specimens: true } }),
      this.prisma.labOrder.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async listTests(q: LabQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.labTestCatalog.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.labTestCatalog.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  private async requireOrder(id: string, user: SessionUser) {
    const order = await this.prisma.labOrder.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!order) throw new NotFoundException('Lab order not found.');
    return order;
  }

  private evalRange(value: string, low?: string, high?: string): boolean {
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    if (low && num < Number(low)) return true;
    if (high && num > Number(high)) return true;
    return false;
  }
}
