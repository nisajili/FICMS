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
import { CyclesService } from './cycles.service';
import { CreateCycleDto, CycleStatusDtoInput, CreateCycleEventDto, CreateCycleMedicationDto, CycleQueryDto } from './dto/cycle.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('cycles')
@UseGuards(PermissionsGuard)
@Controller('cycles')
export class CyclesController {
  constructor(private readonly service: CyclesService) {}

  @Post()
  @RequirePermissions('cycle:create')
  @ApiOperation({ summary: 'Start a treatment cycle (IVF/ICSI/IUI)' })
  create(@Body() dto: CreateCycleDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @RequirePermissions('cycle:view')
  @ApiOperation({ summary: 'List cycles' })
  list(@Query() q: CycleQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Get(':id')
  @RequirePermissions('cycle:view')
  @ApiOperation({ summary: 'Get cycle with timeline, meds, embryos' })
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Get(':id/timeline')
  @RequirePermissions('cycle:view')
  @ApiOperation({ summary: 'Interactive cycle timeline' })
  timeline(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.timeline(id, user);
  }

  @Patch(':id/status')
  @RequirePermissions('cycle:update')
  @ApiOperation({ summary: 'Transition cycle status (state machine)' })
  transition(@Param('id') id: string, @Body() dto: CycleStatusDtoInput, @CurrentUser() user: SessionUser) {
    return this.service.transition(id, dto, user);
  }

  @Post(':id/events')
  @RequirePermissions('cycle:update')
  @ApiOperation({ summary: 'Add a timeline event to a cycle' })
  addEvent(@Param('id') id: string, @Body() dto: CreateCycleEventDto, @CurrentUser() user: SessionUser) {
    return this.service.addEvent(id, dto, user);
  }

  @Post(':id/medications')
  @RequirePermissions('cycle:update')
  @ApiOperation({ summary: 'Add a stimulation medication to a cycle' })
  addMedication(@Param('id') id: string, @Body() dto: CreateCycleMedicationDto, @CurrentUser() user: SessionUser) {
    return this.service.addMedication(id, dto, user);
  }
}
