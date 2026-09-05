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
import { EmbryologyService } from './embryology.service';
import { CreateEmbryoDto, EmbryoObservationDto, DoubleWitnessDto, EmbryoQueryDto } from './dto/embryology.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('embryology')
@UseGuards(PermissionsGuard)
@Controller('embryology')
export class EmbryologyController {
  constructor(private readonly service: EmbryologyService) {}

  @Post('embryos')
  @RequirePermissions('embryo:create')
  @ApiOperation({ summary: 'Create/identify an embryo in a cycle' })
  create(@Body() dto: CreateEmbryoDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user);
  }

  @Get('embryos')
  @RequirePermissions('embryo:view')
  @ApiOperation({ summary: 'List embryos for the org/cycle' })
  list(@Query() q: EmbryoQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Post('embryos/:id/observations')
  @RequirePermissions('embryo:update')
  @ApiOperation({ summary: 'Record a day-by-day embryo observation' })
  observe(@Param('id') id: string, @Body() dto: EmbryoObservationDto, @CurrentUser() user: SessionUser) {
    return this.service.addObservation(id, dto, user);
  }

  @Post('embryos/:id/verify-transfer')
  @RequirePermissions('embryo:approve')
  @ApiOperation({ summary: 'Double-witness verify an embryo transfer' })
  verifyTransfer(@Param('id') id: string, @Body() dto: DoubleWitnessDto, @CurrentUser() user: SessionUser) {
    return this.service.verifyWithWitness(id, dto, 'transfer', user);
  }

  @Post('embryos/:id/verify-freeze')
  @RequirePermissions('embryo:approve')
  @ApiOperation({ summary: 'Double-witness verify embryo freezing' })
  verifyFreeze(@Param('id') id: string, @Body() dto: DoubleWitnessDto, @CurrentUser() user: SessionUser) {
    return this.service.verifyWithWitness(id, dto, 'freeze', user);
  }

  @Patch('embryos/:id/status')
  @RequirePermissions('embryo:update')
  @ApiOperation({ summary: 'Update embryo status' })
  status(@Param('id') id: string, @Body('status') status: string, @CurrentUser() user: SessionUser) {
    return this.service.transitionStatus(id, status, user);
  }
}
