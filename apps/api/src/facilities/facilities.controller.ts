import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('facilities')
@UseGuards(PermissionsGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly service: FacilitiesService) {}

  @Post()
  @RequirePermissions('admin:create')
  @ApiOperation({ summary: 'Create a clinic branch/facility' })
  create(@Body() body: { name: string; code?: string; address?: string; city?: string; phone?: string; timezone?: string }, @CurrentUser() user: SessionUser) {
    return this.service.create(body, user);
  }

  @Get()
  @RequirePermissions('admin:view')
  @ApiOperation({ summary: 'List branches for the organisation' })
  list(@CurrentUser() user: SessionUser) {
    return this.service.list(user);
  }

  @Post('departments')
  @RequirePermissions('admin:create')
  @ApiOperation({ summary: 'Create a department' })
  createDepartment(@Body() body: { name: string; code?: string; facilityId?: string }, @CurrentUser() user: SessionUser) {
    return this.service.createDepartment(body, user);
  }

  @Get('departments')
  @RequirePermissions('admin:view')
  @ApiOperation({ summary: 'List departments for the organisation' })
  listDepartments(@CurrentUser() user: SessionUser) {
    return this.service.listDepartments(user);
  }
}
