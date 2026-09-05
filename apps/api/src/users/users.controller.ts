import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser, TenantRole } from '@ficms/types';

@ApiTags('users')
@UseGuards(PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post('invite')
  @RequirePermissions('admin:create')
  @ApiOperation({ summary: 'Invite a staff member (temp password generated)' })
  invite(@Body() body: { email: string; name: string; role: TenantRole; facilityId?: string; departmentId?: string }, @CurrentUser() user: SessionUser) {
    return this.service.invite(body, user);
  }

  @Get()
  @RequirePermissions('admin:view')
  @ApiOperation({ summary: 'List staff users' })
  list(@Query() q: { page?: number; pageSize?: number; search?: string; role?: string }, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Patch(':id/status')
  @RequirePermissions('admin:update')
  @ApiOperation({ summary: 'Activate/suspend/disable a user account' })
  setStatus(@Param('id') id: string, @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING', @CurrentUser() user: SessionUser) {
    return this.service.setStatus(id, status, user);
  }

  @Patch(':id/role')
  @RequirePermissions('admin:update')
  @ApiOperation({ summary: 'Change a user role' })
  setRole(@Param('id') id: string, @Body('role') role: TenantRole, @CurrentUser() user: SessionUser) {
    return this.service.updateRole(id, role, user);
  }
}
