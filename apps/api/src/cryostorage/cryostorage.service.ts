import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionUser } from '@ficms/types';
import {
  CreateTankDto,
  CreatePositionDto,
  CreateStorageItemDto,
  WitnessDto,
  ReleaseItemDto,
  LogTemperatureDto,
} from './dto/cryostorage.dto';

@Injectable()
export class CryostorageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createTank(dto: CreateTankDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const tank = await this.prisma.cryoTank.create({
      data: { organizationId: org, facilityId: user.facilityId, name: dto.name, label: dto.label, capacity: dto.capacity ?? 0, alarmLowC: dto.alarmLowC, alarmHighC: dto.alarmHighC },
    });
    await this.audit.record({ action: 'cryo.create_tank', resourceType: 'cryo_tank', resourceId: tank.id, after: { name: dto.name } }, user);
    return tank;
  }

  async listTanks(user: SessionUser) {
    return this.prisma.cryoTank.findMany({
      where: { organizationId: user.organizationId ?? undefined },
      include: { _count: { select: { positions: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPosition(dto: CreatePositionDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const tank = await this.prisma.cryoTank.findFirst({ where: { id: dto.tankId, organizationId: org } });
    if (!tank) throw new NotFoundException('Tank not found.');

    const posArgs = {
      organizationId: org,
      tankId: dto.tankId,
      room: dto.room,
      canister: dto.canister,
      cane: dto.cane,
      goblet: dto.goblet,
      rack: dto.rack,
      position: dto.position,
      label: dto.label,
    };
    // Composite unique prevents two positions in the same physical slot.
    const position = await this.prisma.cryoPosition.create({ data: posArgs }).catch((e: any) => {
      // Detect the Postgres unique-violation (P2002) without depending on the
      // generated client's error class so the module compiles against both a
      // fresh and a bootstrapped client.
      if (e && e.code === 'P2002') {
        throw new ConflictException('A storage position already exists at that physical location.');
      }
      throw e;
    });
    await this.audit.record({ action: 'cryo.create_position', resourceType: 'cryo_tank', resourceId: dto.tankId, after: { label: dto.label } }, user);
    return position;
  }

  async storageMap(tankId: string, user: SessionUser) {
    const tank = await this.prisma.cryoTank.findFirst({
      where: { id: tankId, organizationId: user.organizationId ?? undefined },
      include: {
        positions: {
          include: { storageItem: true },
          orderBy: { label: 'asc' },
        },
        temperatureLogs: { orderBy: { recordedAt: 'desc' }, take: 20 },
      },
    });
    if (!tank) throw new NotFoundException('Tank not found.');
    return tank;
  }

  /**
   * Store an item. The DB unique constraint on `positionId` guarantees that two
   * items cannot occupy the same active storage position; we also check the
   * item is not already stored in another position (one item = one position).
   */
  async store(dto: CreateStorageItemDto, actUser: SessionUser) {
    const org = actUser.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const position = await this.prisma.cryoPosition.findFirst({ where: { id: dto.positionId, organizationId: org } });
    if (!position) throw new NotFoundException('Storage position not found.');
    if (position.storageItem) {
      throw new ConflictException('That storage position is already occupied.');
    }
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId: org } });
    if (!patient) throw new NotFoundException('Patient not found.');

    const item = await this.prisma.cryoStorageItem.create({
      data: {
        organizationId: org,
        positionId: dto.positionId,
        patientId: dto.patientId,
        cycleId: dto.cycleId ?? null,
        type: dto.type,
        label: dto.label,
        frozenAt: dto.frozenAt ? new Date(dto.frozenAt) : null,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : null,
        notes: dto.notes,
        storedById: actUser.id,
      },
    });
    await this.audit.record({ action: 'cryo.store_item', resourceType: 'cryo_tank', resourceId: dto.positionId, after: { label: dto.label } }, actUser);
    return item;
  }

  async listItems(user: SessionUser, status?: string) {
    return this.prisma.cryoStorageItem.findMany({
      where: { organizationId: user.organizationId ?? undefined, ...(status ? { status: status as never } : {}) },
      include: { position: { include: { tank: true } }, patient: { select: { id: true, givenName: true, familyName: true, medicalRecordNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async release(itemId: string, dto: ReleaseItemDto, actUser: SessionUser) {
    const org = actUser.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const item = await this.prisma.cryoStorageItem.findFirst({ where: { id: itemId, organizationId: org } });
    if (!item) throw new NotFoundException('Storage item not found.');
    if (item.status !== 'STORED') {
      throw new ConflictException('Only stored items can be released.');
    }
    const witness = await this.prisma.user.findFirst({ where: { id: dto.witnessId, organizationId: org, status: 'ACTIVE' } });
    if (!witness) throw new NotFoundException('Witness not found.');
    if (witness.id === actUser.id) throw new ConflictException('Witness must be a different staff member.');

    const updated = await this.prisma.cryoStorageItem.update({
      where: { id: item.id },
      data: { status: 'RELEASED', releasedAt: new Date(), witnessedById: dto.witnessId, notes: dto.note },
    });
    await this.audit.record(
      { action: 'cryo.release_item', resourceType: 'cryo_tank', resourceId: item.id, after: { reason: dto.reason, witness: dto.witnessId }, reason: dto.reason },
      actUser,
    );
    return updated;
  }

  async logTemperature(dto: LogTemperatureDto, user: SessionUser) {
    const org = user.organizationId;
    if (!org) throw new BadRequestException('Organisation context required.');
    const tank = await this.prisma.cryoTank.findFirst({ where: { id: dto.tankId, organizationId: org } });
    if (!tank) throw new NotFoundException('Tank not found.');
    const isAlarm =
      (tank.alarmLowC !== null && tank.alarmLowC !== undefined && dto.tempC < tank.alarmLowC) ||
      (tank.alarmHighC !== null && tank.alarmHighC !== undefined && dto.tempC > tank.alarmHighC);
    const log = await this.prisma.temperatureLog.create({
      data: {
        organizationId: org,
        tankId: dto.tankId,
        tempC: dto.tempC,
        source: dto.source ?? 'manual',
        deviceId: dto.deviceId,
        isAlarm,
        recordedById: user.id,
      },
    });
    await this.prisma.cryoTank.update({ where: { id: dto.tankId }, data: { currentTempC: dto.tempC } });
    await this.audit.record({ action: 'cryo.temperature_log', resourceType: 'cryo_tank', resourceId: dto.tankId, after: { tempC: dto.tempC, isAlarm } }, user);
    return log;
  }
}
