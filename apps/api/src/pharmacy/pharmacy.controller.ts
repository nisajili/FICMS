import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service';
import { CreatePrescriptionDto, VerifyPrescriptionDto, DispenseItemDto, CreateMedicationDto } from './dto/pharmacy.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('pharmacy')
@UseGuards(PermissionsGuard)
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly service: PharmacyService) {}

  @Post('medications')
  @RequirePermissions('pharmacy:create')
  @ApiOperation({ summary: 'Add a medication to the catalogue' })
  createMedication(@Body() dto: CreateMedicationDto, @CurrentUser() user: SessionUser) {
    return this.service.createMedication(dto, user);
  }

  @Get('medications')
  @RequirePermissions('pharmacy:view')
  @ApiOperation({ summary: 'List medication catalogue' })
  listMedications(@Query() q: { page?: number; pageSize?: number; search?: string }, @CurrentUser() user: SessionUser) {
    return this.service.listMedications(q, user);
  }

  @Post('prescriptions')
  @RequirePermissions('pharmacy:create')
  @ApiOperation({ summary: 'Create a prescription' })
  createPrescription(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: SessionUser) {
    return this.service.createPrescription(dto, user);
  }

  @Get('prescriptions/:id')
  @RequirePermissions('pharmacy:view')
  @ApiOperation({ summary: 'Get a prescription' })
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Post('prescriptions/:id/verify')
  @RequirePermissions('pharmacy:approve')
  @ApiOperation({ summary: 'Pharmacist verification of a prescription' })
  verify(@Param('id') id: string, @Body() dto: VerifyPrescriptionDto, @CurrentUser() user: SessionUser) {
    return this.service.verify(id, dto, user);
  }

  @Post('prescriptions/:id/dispense')
  @RequirePermissions('pharmacy:update')
  @ApiOperation({ summary: 'Dispense an item (transactional inventory deduction)' })
  dispense(@Param('id') id: string, @Body() dto: DispenseItemDto, @CurrentUser() user: SessionUser) {
    return this.service.dispense(id, dto, user);
  }
}
