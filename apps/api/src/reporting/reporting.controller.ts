import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('reports')
@UseGuards(PermissionsGuard)
@Controller('reports')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Get('clinical/cycle-outcomes')
  @RequirePermissions('report:view')
  @ApiOperation({ summary: 'Cycle outcome statistics (denominators shown)' })
  cycleOutcomes(@CurrentUser() user: SessionUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.clinicalCycleOutcomes(user, { from, to });
  }

  @Get('financial/summary')
  @RequirePermissions('report:view')
  @ApiOperation({ summary: 'Revenue, outstanding, payment method breakdown' })
  financial(@CurrentUser() user: SessionUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.financialSummary(user, { from, to });
  }

  @Get('operational/summary')
  @RequirePermissions('report:view')
  @ApiOperation({ summary: 'Appointments, patients, low-stock operational view' })
  operational(@CurrentUser() user: SessionUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.operationalSummary(user, { from, to });
  }

  @Get('clinical/export')
  @RequirePermissions('report:export')
  @ApiOperation({ summary: 'CSV-ready cycle export (de-identified)' })
  exportClinical(@CurrentUser() user: SessionUser) {
    return this.service.exportClinical(user, {});
  }
}
