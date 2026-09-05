import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { DEFAULT_ROLE_PERMISSIONS } from '@ficms/config';
import type { SessionUser } from '@ficms/types';
import { CreateOrganizationDto } from './dto/org.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authService: AuthService,
  ) {}

  /** Onboard a new clinic organisation + default facility + admin. */
  async createOrganization(dto: CreateOrganizationDto, actor?: SessionUser) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new BadRequestException('An organisation with this slug already exists.');
    }

    const admin = await this.authService.createUser({
      email: dto.adminEmail,
      password: dto.adminPassword,
      name: dto.adminName ?? 'Clinic Administrator',
      role: 'org_owner',
      organizationId: null, // set after org created
    });

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain ?? null,
        status: 'ACTIVE',
      },
    });

    // Default facility + department.
    const facility = await this.prisma.facility.create({
      data: {
        organizationId: org.id,
        name: 'Main Clinic',
        code: 'MAIN',
        status: 'ACTIVE',
      },
    });
    const dept = await this.prisma.department.create({
      data: { organizationId: org.id, facilityId: facility.id, name: 'Administration', code: 'ADMIN' },
    });

    await this.prisma.user.update({
      where: { id: admin.id },
      data: { organizationId: org.id, facilityId: facility.id, departmentId: dept.id },
    });

    // Seed default settings (brand-neutral placeholders).
    await this.prisma.organizationSetting.createMany({
      data: [
        { organizationId: org.id, key: 'CLINIC_NAME', value: dto.name },
        { organizationId: org.id, key: 'COUNTRY', value: '' },
        { organizationId: org.id, key: 'CURRENCY', value: '' },
        { organizationId: org.id, key: 'TIMEZONE', value: 'UTC' },
        { organizationId: org.id, key: 'PRIMARY_LANGUAGE', value: 'en' },
        { organizationId: org.id, key: 'PRIMARY_COLOR', value: '#0f766e' },
      ],
    });

    // Seed a starter service catalog.
    await this.prisma.serviceCatalog.createMany({
      data: [
        { organizationId: org.id, name: 'Initial Consultation', code: 'CONSULT', price: 0, currency: '' },
        { organizationId: org.id, name: 'IVF Cycle', code: 'IVF', price: 0, currency: '' },
        { organizationId: org.id, name: 'ICSI Cycle', code: 'ICSI', price: 0, currency: '' },
        { organizationId: org.id, name: 'IUI Cycle', code: 'IUI', price: 0, currency: '' },
      ],
    });

    await this.audit.record(
      {
        action: 'org.create',
        resourceType: 'organization',
        resourceId: org.id,
        after: { name: dto.name, slug: dto.slug },
      },
      actor,
    );
    await this.audit.record(
      { action: 'org.create_admin', resourceType: 'user', resourceId: admin.id, after: { role: 'org_owner' } },
      actor,
    );

    return { organization: org, facility, adminUserId: admin.id };
  }

  async listOrganizations(q: { page?: number; pageSize?: number; search?: string }) {
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 25));
    const where = q.search
      ? { OR: [{ name: { contains: q.search, mode: 'insensitive' as const } }, { slug: { contains: q.search } }] }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.organization.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  async getOrganization(id: string, isPlatformAdmin = false) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { facilities: true, departments: true },
    });
    if (!org) throw new NotFoundException('Organisation not found.');
    return { ...org, settings: await this.getSettings(org.id) };
  }

  async getSettings(organizationId: string) {
    const rows = await this.prisma.organizationSetting.findMany({ where: { organizationId } });
    const obj: Record<string, unknown> = {};
    for (const r of rows) obj[r.key] = r.value;
    return obj;
  }

  async updateSetting(organizationId: string, key: string, value: unknown, actor?: SessionUser) {
    await this.prisma.organizationSetting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value: value as object },
      update: { value: value as object },
    });
    await this.audit.record(
      { action: 'org.setting_update', resourceType: 'organization', resourceId: organizationId, after: { key, value } },
      actor,
    );
    return { key, value };
  }

  async setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING', actor?: SessionUser) {
    const org = await this.prisma.organization.update({ where: { id }, data: { status } });
    await this.audit.record(
      { action: `org.${status.toLowerCase()}`, resourceType: 'organization', resourceId: id, after: { status } },
      actor,
    );
    return org;
  }

  async getDefaultPermissions() {
    return DEFAULT_ROLE_PERMISSIONS;
  }
}
