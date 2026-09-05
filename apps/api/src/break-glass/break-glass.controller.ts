import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BreakGlassService } from './break-glass.service';
import { CurrentUser } from '../common/decorators';
import { RequirePermissions } from '../common/permissions.guard';
import { CreateBreakGlassRequestDto, BreakGlassQueryDto } from './dto/break-glass.dto';
import type { SessionUser } from '@ficms/types';

/**
 * Platform-admin break-glass emergency access. These endpoints are gated by
 * the global tenant/permission guards AND enforce an active, approved,
 * unexpired grant inside the service before exposing any clinical data.
 */
@ApiTags('admin / break-glass')
@Controller('admin/break-glass')
export class BreakGlassController {
  constructor(private readonly service: BreakGlassService) {}

  @Post('requests')
  @RequirePermissions('admin:break_glass')
  @ApiOperation({ summary: 'Request emergency break-glass access to an organisation' })
  request(@Body() dto: CreateBreakGlassRequestDto, @CurrentUser() user: SessionUser) {
    return this.service.request(dto, user);
  }

  @Get('requests')
  @RequirePermissions('admin:break_glass')
  @ApiOperation({ summary: 'List break-glass access requests (audit trail)' })
  list(@Query() q: BreakGlassQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Post('requests/:id/approve')
  @RequirePermissions('admin:break_glass')
  @ApiOperation({ summary: 'Approve a pending break-glass request (requires second admin)' })
  approve(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.approve(id, user);
  }

  @Post('requests/:id/revoke')
  @RequirePermissions('admin:break_glass')
  @ApiOperation({ summary: 'Revoke an active/pending break-glass grant' })
  revoke(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.revoke(id, user);
  }

  @Get('organizations/:organizationId/emergency')
  @RequirePermissions('admin:break_glass')
  @ApiOperation({ summary: 'Read a bounded emergency clinical summary for an organisation' })
  emergency(@Param('organizationId') organizationId: string, @CurrentUser() user: SessionUser) {
    return this.service.emergency(organizationId, user);
  }
}
