import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DonorService } from './donor.service';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('donors')
@UseGuards(PermissionsGuard)
@Controller('donors')
export class DonorController {
  constructor(private readonly service: DonorService) {}

  @Post()
  @RequirePermissions('donor:create')
  @ApiOperation({ summary: 'Register an anonymized donor profile' })
  create(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.service.create(body, user);
  }

  @Get()
  @RequirePermissions('donor:view')
  @ApiOperation({ summary: 'List anonymized donors (no identity data)' })
  list(@CurrentUser() user: SessionUser) {
    return this.service.list(user);
  }

  @Patch(':id/eligibility')
  @RequirePermissions('donor:update')
  @ApiOperation({ summary: 'Set donor eligibility' })
  eligibility(@Param('id') id: string, @Body('eligibility') eligibility: boolean, @CurrentUser() user: SessionUser) {
    return this.service.setEligibility(id, eligibility, user);
  }
}
