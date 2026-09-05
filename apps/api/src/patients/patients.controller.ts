import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto, LinkPartnerDto, PatientQueryDto } from './dto/patient.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('patients')
@UseGuards(PermissionsGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Post()
  @RequirePermissions('patient:create')
  @ApiOperation({ summary: 'Register a new patient (MRN generated)' })
  register(@Body() dto: CreatePatientDto, @CurrentUser() user: SessionUser) {
    return this.service.register(dto, user);
  }

  @Get()
  @RequirePermissions('patient:view')
  @ApiOperation({ summary: 'List patients in the organisation' })
  list(@Query() q: PatientQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Get(':id')
  @RequirePermissions('patient:view')
  @ApiOperation({ summary: 'Get a patient with record, consents, appointments' })
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Patch(':id')
  @RequirePermissions('patient:update')
  @ApiOperation({ summary: 'Update permitted patient fields (versioned)' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: SessionUser) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/partner')
  @RequirePermissions('patient:update')
  @ApiOperation({ summary: 'Link a partner to a patient (couple)' })
  linkPartner(@Param('id') id: string, @Body() dto: LinkPartnerDto, @CurrentUser() user: SessionUser) {
    return this.service.linkPartner(id, dto.partnerId, dto.relationshipType ?? 'partner', user);
  }

  @Get(':id/partners')
  @RequirePermissions('patient:view')
  @ApiOperation({ summary: 'List linked partners for a patient' })
  partners(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.listPartners(id, user);
  }
}
