import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('hr')
@UseGuards(PermissionsGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  @Post('staff')
  @RequirePermissions('hr:create')
  @ApiOperation({ summary: 'Create/update a staff profile' })
  upsertStaff(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.service.upsertStaff(body, user);
  }

  @Get('staff')
  @RequirePermissions('hr:view')
  @ApiOperation({ summary: 'List staff profiles' })
  listStaff(@CurrentUser() user: SessionUser) {
    return this.service.listStaff(user);
  }

  @Post('leave')
  @RequirePermissions('hr:create')
  @ApiOperation({ summary: 'Submit a leave request' })
  submitLeave(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.service.submitLeave(body, user);
  }

  @Post('leave/:id/decision')
  @RequirePermissions('hr:update')
  @ApiOperation({ summary: 'Approve/reject a leave request' })
  approveLeave(@Param('id') id: string, @Body('approved') approved: boolean, @CurrentUser() user: SessionUser) {
    return this.service.approveLeave(id, approved, user);
  }
}
