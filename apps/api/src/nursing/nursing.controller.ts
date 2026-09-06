import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NursingService } from './nursing.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('nursing')
@UseGuards(PermissionsGuard)
@Controller('nursing')
export class NursingController {
  constructor(private readonly service: NursingService) {}

  @Post('vitals')
  @RequirePermissions('nursing:create')
  @ApiOperation({ summary: 'Record vital signs' })
  vitals(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.service.recordVitals(body, user);
  }

  @Get('patients/:patientId/vitals')
  @RequirePermissions('nursing:view')
  @ApiOperation({ summary: 'List vital signs for a patient' })
  listVitals(@Param('patientId') patientId: string, @CurrentUser() user: SessionUser) {
    return this.service.listVitals(patientId, user);
  }

  @Post('notes')
  @RequirePermissions('nursing:create')
  @ApiOperation({ summary: 'Add a nursing note / discharge instructions' })
  note(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.service.addNote(body, user);
  }
}
