import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PatientsService } from './patients.service';
import { UpdatePatientDto } from './dto/patient.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

class RequestAppointmentDto {
  @IsOptional() @IsString() scheduledStart?: string;
  @IsOptional() @IsString() serviceType?: string;
}

/**
 * Patient self-service endpoints. Every route is guarded by `patient:view_self`
 * and operates exclusively on the patient record linked to the session user.
 * Sensitive/internal clinical data (notes, counseling, embryology, HR, donor
 * identity, unreleased results) is never exposed here.
 */
@ApiTags('me')
@UseGuards(PermissionsGuard)
@Controller('me')
export class PatientSelfController {
  constructor(private readonly service: PatientsService) {}

  @Get()
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'Get my own patient profile, partners and consent status' })
  get(@CurrentUser() user: SessionUser) {
    return this.service.getSelf(user);
  }

  @Patch()
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'Update permitted profile fields only' })
  update(@Body() dto: UpdatePatientDto, @CurrentUser() user: SessionUser) {
    return this.service.updateSelf(dto, user);
  }

  @Get('appointments')
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'My appointments' })
  appointments(@CurrentUser() user: SessionUser) {
    return this.service.selfAppointments(user);
  }

  @Post('appointments')
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'Request an appointment (clinic confirms)' })
  requestAppointment(@Body() dto: RequestAppointmentDto, @CurrentUser() user: SessionUser) {
    return this.service.requestSelfAppointment(dto, user);
  }

  @Get('results')
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'My released clinical/lab results (only released)' })
  results(@CurrentUser() user: SessionUser) {
    return this.service.selfResults(user);
  }

  @Get('invoices')
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'My invoices and installments' })
  invoices(@CurrentUser() user: SessionUser) {
    return this.service.selfInvoices(user);
  }

  @Get('prescriptions')
  @RequirePermissions('patient:view_self')
  @ApiOperation({ summary: 'My prescriptions' })
  prescriptions(@CurrentUser() user: SessionUser) {
    return this.service.selfPrescriptions(user);
  }
}
