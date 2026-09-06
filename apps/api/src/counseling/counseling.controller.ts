import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CounselingService } from './counseling.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('counseling')
@UseGuards(PermissionsGuard)
@Controller('counseling')
export class CounselingController {
  constructor(private readonly service: CounselingService) {}

  @Post('sessions')
  @RequirePermissions('counseling:create')
  @ApiOperation({ summary: 'Record a counseling session (confidential)' })
  create(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.service.create(body, user);
  }

  @Get('patients/:patientId/sessions')
  @RequirePermissions('counseling:view')
  @ApiOperation({ summary: 'List counseling sessions (counselor only)' })
  list(@Param('patientId') patientId: string, @CurrentUser() user: SessionUser) {
    return this.service.list(patientId, user);
  }
}
