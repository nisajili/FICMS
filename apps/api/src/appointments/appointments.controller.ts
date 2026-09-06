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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentStatusDto, AppointmentQueryDto } from './dto/appointment.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('appointments')
@UseGuards(PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  @RequirePermissions('appointment:create')
  @ApiOperation({ summary: 'Schedule an appointment' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions('appointment:view')
  @ApiOperation({ summary: 'List appointments' })
  list(@Query() q: AppointmentQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Get(':id')
  @RequirePermissions('appointment:view')
  @ApiOperation({ summary: 'Get an appointment' })
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Patch(':id/status')
  @RequirePermissions('appointment:update')
  @ApiOperation({ summary: 'Transition appointment status (state machine)' })
  transition(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto, @CurrentUser() user: SessionUser) {
    return this.service.transition(id, dto, user);
  }

  @Post(':id/check-in')
  @RequirePermissions('appointment:update')
  @ApiOperation({ summary: 'Check a patient in' })
  checkIn(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.checkIn(id, user);
  }
}
