import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { parsePagination, toPaginated } from '../common/pagination';
import type { SessionUser } from '@ficms/types';
import { CreateInventoryItemDto, AdjustStockDto, InventoryQueryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateInventoryItemDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const item = await this.prisma.inventoryItem.create({
      data: {
        organizationId: org,
        facilityId: user.facilityId,
        name: dto.name,
        sku: dto.sku,
        category: dto.category,
        unit: dto.unit,
        quantityOnHand: dto.quantityOnHand ?? 0,
        minimumStock: dto.minimumStock ?? 0,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        batch: dto.batch,
      },
    });
    if (dto.quantityOnHand && dto.quantityOnHand > 0) {
      await this.prisma.stockMovement.create({
        data: {
          organizationId: org,
          inventoryItemId: item.id,
          type: 'receipt',
          quantity: dto.quantityOnHand,
          batch: dto.batch,
          reason: 'Initial stock',
          performedById: user.id,
        },
      });
    }
    await this.audit.record({ action: 'inventory.create_item', resourceType: 'inventory', resourceId: item.id, after: { sku: dto.sku } }, user);
    return item;
  }

  /**
   * Stock adjustment. Quantity may be negative for issues. Uses a transaction
   * so the movement ledger and the on-hand quantity update atomically, and a
   * CHECK (in the schema/application) prevents negative stock.
   */
  async adjust(itemId: string, dto: AdjustStockDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: itemId, organizationId: org } });
    if (!item) throw new NotFoundException('Inventory item not found.');

    const delta =
      dto.type === 'issue' ? -Math.abs(dto.quantity)
      : dto.type === 'transfer_out' ? -Math.abs(dto.quantity)
      : Math.abs(dto.quantity);

    const newQty = Number(item.quantityOnHand) + delta;
    if (newQty < 0) {
      throw new BadRequestException('Insufficient stock for this movement.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantityOnHand: newQty, updatedAt: new Date() },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: org,
          inventoryItemId: itemId,
          type: dto.type,
          quantity: dto.quantity,
          batch: dto.batch,
          reason: dto.reason,
          performedById: user.id,
        },
      });
      await this.audit.record(
        { action: `inventory.${dto.type}`, resourceType: 'inventory', resourceId: itemId, before: { quantityOnHand: item.quantityOnHand }, after: { quantityOnHand: newQty } },
        user,
      );
      return updated;
    });
  }

  async list(q: InventoryQueryDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) return { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
    const { page, pageSize, skip, take } = parsePagination(q);
    const where: Record<string, unknown> = { organizationId: org };
    if (q.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' as const } }, { sku: { contains: q.search } }];
    if (q.category) where.category = q.category;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' } }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    return toPaginated(data, total, { page, pageSize });
  }

  async lowStock(user: SessionUser) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId: user.organizationId ?? undefined },
    });
    return items.filter((i: any) => Number(i.quantityOnHand) <= Number(i.minimumStock));
  }

  async movements(itemId: string, user: SessionUser) {
    return this.prisma.stockMovement.findMany({
      where: { inventoryItemId: itemId, organizationId: user.organizationId ?? undefined },
      orderBy: { createdAt: 'desc' },
    });
  }
}
