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
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, AdjustStockDto, InventoryQueryDto } from './dto/inventory.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('inventory')
@UseGuards(PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Post('items')
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Add an inventory item' })
  create(@Body() dto: CreateInventoryItemDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user);
  }

  @Get('items')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List inventory items with search/pagination' })
  list(@Query() q: InventoryQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Get('items/low-stock')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List items at or below minimum stock' })
  lowStock(@CurrentUser() user: SessionUser) {
    return this.service.lowStock(user);
  }

  @Get('items/:id/movements')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Stock movement ledger for an item' })
  movements(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.movements(id, user);
  }

  @Post('items/:id/adjust')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Adjust stock (receipt/issue/adjustment) in a transaction' })
  adjust(@Param('id') id: string, @Body() dto: AdjustStockDto, @CurrentUser() user: SessionUser) {
    return this.service.adjust(id, dto, user);
  }
}
