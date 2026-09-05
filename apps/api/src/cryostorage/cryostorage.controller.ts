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
import { CryostorageService } from './cryostorage.service';
import { CreateTankDto, CreatePositionDto, CreateStorageItemDto, ReleaseItemDto, LogTemperatureDto } from './dto/cryostorage.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('cryostorage')
@UseGuards(PermissionsGuard)
@Controller('cryostorage')
export class CryostorageController {
  constructor(private readonly service: CryostorageService) {}

  @Post('tanks')
  @RequirePermissions('cryo_tank:create')
  @ApiOperation({ summary: 'Create a cryostorage tank' })
  createTank(@Body() dto: CreateTankDto, @CurrentUser() user: SessionUser) {
    return this.service.createTank(dto, user);
  }

  @Get('tanks')
  @RequirePermissions('cryo_tank:view')
  @ApiOperation({ summary: 'List cryostorage tanks' })
  listTanks(@CurrentUser() user: SessionUser) {
    return this.service.listTanks(user);
  }

  @Post('positions')
  @RequirePermissions('cryo_tank:create')
  @ApiOperation({ summary: 'Create a storage position (collision-checked)' })
  createPosition(@Body() dto: CreatePositionDto, @CurrentUser() user: SessionUser) {
    return this.service.createPosition(dto, user);
  }

  @Get('tanks/:id/map')
  @RequirePermissions('cryo_tank:view')
  @ApiOperation({ summary: 'Interactive cryostorage map for a tank' })
  map(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.storageMap(id, user);
  }

  @Post('items')
  @RequirePermissions('cryo_tank:create')
  @ApiOperation({ summary: 'Store an item (double-checked occupancy)' })
  store(@Body() dto: CreateStorageItemDto, @CurrentUser() user: SessionUser) {
    return this.service.store(dto, user);
  }

  @Get('items')
  @RequirePermissions('cryo_tank:view')
  @ApiOperation({ summary: 'List stored items' })
  listItems(@Query('status') status: string | undefined, @CurrentUser() user: SessionUser) {
    return this.service.listItems(user, status);
  }

  @Post('items/:id/release')
  @RequirePermissions('cryo_tank:update')
  @ApiOperation({ summary: 'Release a stored item with double witness' })
  release(@Param('id') id: string, @Body() dto: ReleaseItemDto, @CurrentUser() user: SessionUser) {
    return this.service.release(id, dto, user);
  }

  @Post('temperature')
  @RequirePermissions('cryo_tank:update')
  @ApiOperation({ summary: 'Log tank temperature (manual/device)' })
  logTemperature(@Body() dto: LogTemperatureDto, @CurrentUser() user: SessionUser) {
    return this.service.logTemperature(dto, user);
  }
}
