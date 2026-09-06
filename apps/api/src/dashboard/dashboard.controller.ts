import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('dashboard')
@UseGuards(PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @RequirePermissions('report:view')
  @ApiOperation({ summary: 'Clinic dashboard stats (counts only, no PHI)' })
  stats(@CurrentUser() user: SessionUser) {
    return this.service.stats(user);
  }

  @Get('today-appointments')
  @RequirePermissions('appointment:view')
  @ApiOperation({ summary: "Today's appointment schedule" })
  today(@CurrentUser() user: SessionUser) {
    return this.service.todayAppointments(user);
  }

  @Get('platform')
  @RequirePermissions('admin:view')
  @ApiOperation({ summary: 'Platform-level usage stats (no patient data)' })
  platform(@CurrentUser() user: SessionUser) {
    return this.service.platformStats();
  }
}
