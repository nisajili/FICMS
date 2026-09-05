import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UltrasoundService } from './ultrasound.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('ultrasound')
@UseGuards(PermissionsGuard)
@Controller('ultrasound')
export class UltrasoundController {
  constructor(private readonly service: UltrasoundService) {}

  @Post('scans')
  @RequirePermissions('ultrasound:create')
  @ApiOperation({ summary: 'Record an ultrasound scan (follicular/pelvic/early-pregnancy)' })
  create(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.service.create(body, user);
  }

  @Get('patients/:patientId/scans')
  @RequirePermissions('ultrasound:view')
  @ApiOperation({ summary: 'List scans for a patient' })
  list(@Param('patientId') patientId: string, @CurrentUser() user: SessionUser) {
    return this.service.listForPatient(patientId, user);
  }

  @Post('scans/:id/verify')
  @RequirePermissions('ultrasound:update')
  @ApiOperation({ summary: 'Clinician verification of a scan' })
  verify(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.verify(id, user);
  }
}
