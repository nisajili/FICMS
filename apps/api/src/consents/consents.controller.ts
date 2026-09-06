import type { SessionUser } from '@ficms/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { RequirePermissions } from '../common/permissions.guard';
import { ConsentsService } from './consents.service';
import {
  CreateConsentDto,
  UpdateConsentDto,
  SignConsentDto,
  WitnessConsentDto,
  RevokeConsentDto,
  ConsentQueryDto,
} from './dto/consent.dto';

/**
 * Patient consent workflow. Signed/witnessed consents are immutable; edits
 * create a new version and witnessing is a separate, non-self-actionable step.
 */
@ApiTags('consents')
@Controller('consents')
export class ConsentsController {
  constructor(private readonly service: ConsentsService) {}

  @Post()
  @RequirePermissions('medical_record:create')
  @ApiOperation({ summary: 'Create a new consent draft for a patient' })
  create(@Body() dto: CreateConsentDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions('medical_record:view')
  @ApiOperation({ summary: 'List consents (optionally filtered by patient/status)' })
  list(@Query() q: ConsentQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Get(':id')
  @RequirePermissions('medical_record:view')
  @ApiOperation({ summary: 'Get a consent (tenant-scoped)' })
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Patch(':id')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Edit a draft consent (signed consents cannot be edited)' })
  update(@Param('id') id: string, @Body() dto: UpdateConsentDto, @CurrentUser() user: SessionUser) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/sign')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Sign a consent, making it immutable (records signer + witness)' })
  sign(@Param('id') id: string, @Body() dto: SignConsentDto, @CurrentUser() user: SessionUser) {
    return this.service.sign(id, dto, user);
  }

  @Post(':id/witness')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Witness a signed consent (requires a different user than the signer)' })
  witness(@Param('id') id: string, @Body() dto: WitnessConsentDto, @CurrentUser() user: SessionUser) {
    return this.service.witness(id, dto, user);
  }

  @Post(':id/revoke')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Revoke (withdraw) a signed/witnessed consent' })
  revoke(@Param('id') id: string, @Body() dto: RevokeConsentDto, @CurrentUser() user: SessionUser) {
    return this.service.revoke(id, dto, user);
  }

  @Post(':id/version')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Create a new version of a consent (signed records are never overwritten)' })
  createVersion(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.createVersion(id, user);
  }

  @Delete(':id')
  @RequirePermissions('medical_record:update')
  @ApiOperation({ summary: 'Delete a draft consent (signed consents cannot be deleted)' })
  delete(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.delete(id, user);
  }
}
