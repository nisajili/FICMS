import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import {
  CreatePrescriptionDto,
  VerifyPrescriptionDto,
  DispenseItemDto,
  CreateMedicationDto,
} from './dto/pharmacy.dto';

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createMedication(dto: CreateMedicationDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const med = await this.prisma.medicationCatalog.create({
      data: { organizationId: org, name: dto.name, genericName: dto.genericName, form: dto.form, strength: dto.strength, controlled: dto.controlled ?? false },
    });
    await this.audit.record({ action: 'pharmacy.create_medication', resourceType: 'pharmacy', resourceId: med.id, after: { name: dto.name } }, user);
    return med;
  }

  async listMedications(q: { page?: number; pageSize?: number; search?: string }, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' as const } }, { genericName: { contains: q.search, mode: 'insensitive' as const } }];
    const [data, total] = await this.prisma.$transaction([
      this.prisma.medicationCatalog.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.medicationCatalog.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async createPrescription(dto: CreatePrescriptionDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');
    if (!dto.items.length) throw new BadRequestException('Prescription requires items.');

    const prescription = await this.prisma.prescription.create({
      data: {
        organizationId: org,
        patientId: dto.patientId,
        notes: dto.notes,
        prescribedById: user.id,
        prescribedAt: new Date(),
        status: 'PRESCRIBED',
        items: {
          create: dto.items.map((i) => ({
            organizationId: org,
            medicationName: i.medicationName,
            dosage: i.dosage,
            frequency: i.frequency,
            durationDays: i.durationDays,
            instructions: i.instructions,
            quantity: i.quantity,
            issuedQuantity: 0,
          })),
        },
      },
      include: { items: true },
    });
    await this.audit.record({ action: 'pharmacy.prescribe', resourceType: 'pharmacy', resourceId: prescription.id, after: { itemCount: dto.items.length } }, user);
    return prescription;
  }

  async verify(id: string, dto: VerifyPrescriptionDto, user: SessionUser) {
    const presc = await this.prisma.prescription.findFirst({ where: { id, organizationId: user.organizationId ?? undefined } });
    if (!presc) throw new NotFoundException('Prescription not found.');
    if (presc.status !== 'PRESCRIBED') {
      throw new ConflictException('Only prescribed prescriptions can be verified.');
    }
    const updated = await this.prisma.prescription.update({
      where: { id },
      data: { status: dto.verified ? 'VERIFIED' : 'PRESCRIBED', verifiedById: user.id, verifiedAt: new Date() },
    });
    await this.audit.record({ action: 'pharmacy.verify_prescription', resourceType: 'pharmacy', resourceId: id, after: { verified: dto.verified } }, user);
    return updated;
  }

  /**
   * Dispense a prescription item. Deducts from inventory (if linked) and
   * increments issued quantity, all in one transaction. Prevents
   * over-dispensing beyond the prescribed quantity.
   */
  async dispense(prescriptionId: string, dto: DispenseItemDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const presc = await this.prisma.prescription.findFirst({
      where: { id: prescriptionId, organizationId: org },
      include: { items: true },
    });
    if (!presc) throw new NotFoundException('Prescription not found.');
    if (presc.status !== 'VERIFIED') {
      throw new ConflictException('Prescription must be verified before dispensing.');
    }
    const item = presc.items.find((i) => i.id === dto.prescriptionItemId);
    if (!item) throw new NotFoundException('Prescription item not found.');

    const remaining = Number(item.quantity) - Number(item.issuedQuantity);
    if (dto.quantity > remaining) {
      throw new ConflictException('Cannot dispense more than the remaining prescribed quantity.');
    }

    // Verify inventory exists and is linked.
    const inventoryItemId: string | null = dto.inventoryItemId ?? null;
    if (inventoryItemId) {
      const inv = await this.prisma.inventoryItem.findFirst({ where: { id: inventoryItemId, organizationId: org } });
      if (!inv) throw new NotFoundException('Linked inventory item not found.');
      if (Number(inv.quantityOnHand) < dto.quantity) {
        throw new ConflictException('Insufficient inventory for dispensing.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const newIssued = Number(item.issuedQuantity) + dto.quantity;
      const status = newIssued >= Number(item.quantity) ? 'DISPENSED' : 'PARTIALLY_DISPENSED';
      await tx.prescriptionItem.update({ where: { id: item.id }, data: { issuedQuantity: newIssued } });
      await tx.prescription.update({ where: { id: presc.id }, data: { status } });

      if (inventoryItemId) {
        const inv = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
        if (!inv) throw new NotFoundException('Inventory item not found.');
        const newQty = Number(inv.quantityOnHand) - dto.quantity;
        if (newQty < 0) throw new BadRequestException('Insufficient stock.');
        await tx.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantityOnHand: newQty } });
        await tx.stockMovement.create({
          data: { organizationId: org, inventoryItemId, type: 'issue', quantity: dto.quantity, batch: dto.batch, reason: 'Dispensing', performedById: user.id },
        });
      }

      const dispensation = await tx.dispensation.create({
        data: {
          organizationId: org,
          prescriptionId: presc.id,
          medicationName: item.medicationName,
          quantity: dto.quantity,
          batch: dto.batch,
          dispensedById: user.id,
        },
      });
      return dispensation;
    });

    await this.audit.record({ action: 'pharmacy.dispense', resourceType: 'pharmacy', resourceId: presc.id, after: { item: item.medicationName, quantity: dto.quantity } }, user);
    return updated;
  }

  async get(id: string, user: SessionUser) {
    const presc = await this.prisma.prescription.findFirst({
      where: { id, organizationId: user.organizationId ?? undefined },
      include: { items: true, dispensations: { orderBy: { dispensedAt: 'desc' } }, patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } },
    });
    if (!presc) throw new NotFoundException('Prescription not found.');
    return presc;
  }
}
