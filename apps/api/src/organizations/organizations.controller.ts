import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/org.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin:create')
  @ApiOperation({ summary: 'Onboard a new clinic organisation (platform admin)' })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: SessionUser) {
    return this.service.createOrganization(dto, user);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin:view')
  @ApiOperation({ summary: 'List organisations (platform admin)' })
  list(@Query() q: { page?: number; pageSize?: number; search?: string }) {
    return this.service.listOrganizations(q);
  }

  @Get('permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin:view')
  @ApiOperation({ summary: 'Get the default role → permission matrix' })
  permissions() {
    return this.service.getDefaultPermissions();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin:view')
  @ApiOperation({ summary: 'Get an organisation with settings' })
  get(@Param('id') id: string) {
    return this.service.getOrganization(id, true);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin:update')
  @ApiOperation({ summary: 'Activate / suspend / mark an organisation' })
  setStatus(@Param('id') id: string, @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'PENDING', @CurrentUser() user: SessionUser) {
    return this.service.setStatus(id, status, user);
  }
}
