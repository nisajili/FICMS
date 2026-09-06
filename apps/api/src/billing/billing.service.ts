import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RecordNumberService } from '../records/record-number.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import {
  CreateInvoiceDto,
  CreateInvoiceLineDto,
  RecordPaymentDto,
  RefundPaymentDto,
  BillingQueryDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly records: RecordNumberService,
  ) {}

  async createInvoice(dto: CreateInvoiceDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');

    const currency = dto.currency ?? '';
    const lineItems: CreateInvoiceLineDto[] = [];
    if (dto.lineItems?.length) lineItems.push(...dto.lineItems);

    // Pull configured service prices from the catalogue.
    if (dto.serviceCodes?.length) {
      const services = await this.prisma.serviceCatalog.findMany({
        where: { organizationId: org, code: { in: dto.serviceCodes } },
      });
      for (const s of services) {
        lineItems.push({ description: s.name, quantity: 1, unitPrice: Number(s.price), taxRate: 0 });
      }
    }
    // Pull package price.
    if (dto.packageCode) {
      const pkg = await this.prisma.treatmentPackage.findFirst({ where: { organizationId: org, code: dto.packageCode } });
      if (pkg) {
        lineItems.push({ description: pkg.name, quantity: 1, unitPrice: Number(pkg.price), taxRate: 0 });
      }
    }
    if (!lineItems.length) {
      throw new BadRequestException('Invoice requires at least one line item, service code, or package code.');
    }

    const invoiceNumber = await this.records.next(
      () => this.prisma.invoice.count({ where: { organizationId: org } }),
      { prefix: 'INV' },
    );

    let subtotal = 0;
    let taxTotal = 0;
    const computed = lineItems.map((l) => {
      const qty = l.quantity ?? 1;
      const totalPrice = qty * l.unitPrice;
      const tax = totalPrice * ((l.taxRate ?? 0) / 100);
      subtotal += totalPrice;
      taxTotal += tax;
      return { ...l, quantity: qty, totalPrice, taxRate: l.taxRate ?? 0 };
    });
    const total = subtotal + taxTotal;

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId: org,
        patientId: dto.patientId,
        invoiceNumber,
        currency,
        subtotal,
        taxTotal,
        total,
        amountDue: total,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        version: 1,
        lineItems: {
          create: computed.map((l) => ({
            organizationId: org,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalPrice: l.totalPrice,
            taxRate: l.taxRate,
          })),
        },
      },
      include: { lineItems: true },
    });

    await this.audit.record({ action: 'billing.create_invoice', resourceType: 'billing', resourceId: invoice.id, after: { invoiceNumber, total } }, user);
    return invoice;
  }

  async issue(invoiceId: string, user: SessionUser) {
    const org = user.organizationId;
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: org ?? undefined } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    if (invoice.status !== 'DRAFT') {
      throw new ConflictException('Only draft invoices can be issued.');
    }
    const updated = await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'ISSUED' } });
    await this.audit.record({ action: 'billing.issue_invoice', resourceType: 'billing', resourceId: invoiceId, before: { status: invoice.status }, after: { status: 'ISSUED' } }, user);
    return updated;
  }

  async list(q: BillingQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take, orderBy } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.status) where.status = q.status;
    if (q.patientId) where.patientId = q.patientId;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({ where, skip, take, orderBy: orderBy ?? { createdAt: 'desc' }, include: { patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } } }),
      this.prisma.invoice.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async get(invoiceId: string, user: SessionUser) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: user.organizationId ?? undefined },
      include: { lineItems: true, payments: true, installmentPlans: true, patient: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  async addInstallment(invoiceId: string, amount: number, dueDate: string | undefined, installmentNumber: number | undefined, user: SessionUser) {
    const org = user.organizationId;
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: org ?? undefined } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    const count = await this.prisma.installmentPlan.count({ where: { invoiceId } });
    const installment = await this.prisma.installmentPlan.create({
      data: {
        organizationId: org!,
        invoiceId,
        amountDue: amount,
        dueDate: dueDate ? new Date(dueDate) : null,
        installmentNumber: installmentNumber ?? count + 1,
        status: 'pending',
      },
    });
    await this.audit.record({ action: 'billing.add_installment', resourceType: 'billing', resourceId: invoiceId, after: { amount, installmentNumber: installment.installmentNumber } }, user);
    return installment;
  }

  /**
   * Idempotent payment. The `idempotencyKey` unique constraint prevents double
   * charging. Runs in a transaction: the payment row + invoice balance update
   * commit atomically, and concurrent requests for the same key are serialised.
   */
  async recordPayment(invoiceId: string, dto: RecordPaymentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: org } });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') {
      throw new ConflictException('Cannot record payment against a cancelled/refunded invoice.');
    }

    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) {
      return { ...existing, alreadyProcessed: true };
    }

    return this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction (defence against concurrency).
      const again = await tx.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (again) return { ...again, alreadyProcessed: true };

      const payment = await tx.payment.create({
        data: {
          organizationId: org,
          invoiceId,
          amount: dto.amount,
          currency: invoice.currency,
          method: dto.method,
          status: 'SUCCEEDED',
          idempotencyKey: dto.idempotencyKey,
          reference: dto.reference,
          provider: dto.provider,
          externalRef: dto.externalRef,
          paidById: user.id,
          paidAt: new Date(),
        },
      });

      const amountPaid = Number(invoice.amountPaid) + dto.amount;
      const amountDue = Math.max(0, Number(invoice.total) - amountPaid);
      const status = amountDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
      await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid, amountDue, status, version: { increment: 1 } } });

      await this.audit.record({ action: 'billing.payment', resourceType: 'billing', resourceId: invoiceId, after: { amount: dto.amount, method: dto.method } }, user);
      return payment;
    });
  }

  async refund(paymentId: string, dto: RefundPaymentDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, organizationId: org } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== 'SUCCEEDED') {
      throw new ConflictException('Only succeeded payments can be refunded.');
    }
    if (dto.amount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount exceeds payment amount.');
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: { organizationId: org, paymentId, amount: dto.amount, reason: dto.reason, approvedById: dto.approvedById ?? user.id },
      });
      const refundedTotal = dto.amount;
      const newPaymentStatus = refundedTotal >= Number(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await tx.payment.update({ where: { id: paymentId }, data: { status: newPaymentStatus } });

      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
        if (invoice) {
          const newPaid = Math.max(0, Number(invoice.amountPaid) - dto.amount);
          const newDue = Number(invoice.total) - newPaid;
          await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: newPaid, amountDue: newDue, status: newDue === 0 ? 'PAID' : 'PARTIALLY_PAID', version: { increment: 1 } } });
        }
      }
      await this.audit.record({ action: 'billing.refund', resourceType: 'billing', resourceId: paymentId, after: { amount: dto.amount, reason: dto.reason } }, user);
      return refund;
    });
  }
}
