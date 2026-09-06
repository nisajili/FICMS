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
import { LabService } from './lab.service';
import {
  CreateLabOrderDto,
  CreateSpecimenDto,
  SubmitResultDto,
  VerifyResultDto,
  CreateLabTestDto,
  LabQueryDto,
} from './dto/lab.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('lab')
@UseGuards(PermissionsGuard)
@Controller('lab')
export class LabController {
  constructor(private readonly service: LabService) {}

  @Post('tests')
  @RequirePermissions('lab:create')
  @ApiOperation({ summary: 'Add a lab test to the catalogue' })
  createTest(@Body() dto: CreateLabTestDto, @CurrentUser() user: SessionUser) {
    return this.service.createTest(dto, user);
  }

  @Get('tests')
  @RequirePermissions('lab:view')
  @ApiOperation({ summary: 'List lab test catalogue' })
  listTests(@Query() q: LabQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.listTests(q, user);
  }

  @Post('orders')
  @RequirePermissions('lab:create')
  @ApiOperation({ summary: 'Create a lab order' })
  createOrder(@Body() dto: CreateLabOrderDto, @CurrentUser() user: SessionUser) {
    return this.service.createOrder(dto, user);
  }

  @Get('orders')
  @RequirePermissions('lab:view')
  @ApiOperation({ summary: 'List lab orders' })
  listOrders(@Query() q: LabQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.listOrders(q, user);
  }

  @Post('orders/:id/specimens')
  @RequirePermissions('lab:update')
  @ApiOperation({ summary: 'Accession a specimen (barcode generated)' })
  collectSpecimen(@Param('id') id: string, @Body() dto: CreateSpecimenDto, @CurrentUser() user: SessionUser) {
    return this.service.collectSpecimen(id, dto, user);
  }

  @Post('orders/:id/access')
  @RequirePermissions('lab:update')
  @ApiOperation({ summary: 'Accession a lab order' })
  access(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.access(id, user);
  }

  @Post('orders/:id/process')
  @RequirePermissions('lab:update')
  @ApiOperation({ summary: 'Mark order as processing' })
  process(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.process(id, user);
  }

  @Post('orders/:id/results')
  @RequirePermissions('lab:create')
  @ApiOperation({ summary: 'Enter a result' })
  submitResult(@Param('id') id: string, @Body() dto: SubmitResultDto, @CurrentUser() user: SessionUser) {
    return this.service.submitResult(id, dto, user);
  }

  @Post('orders/:id/verify')
  @RequirePermissions('lab:verify')
  @ApiOperation({ summary: 'Verify a result' })
  verify(@Param('id') id: string, @Body() dto: VerifyResultDto, @CurrentUser() user: SessionUser) {
    return this.service.verify(id, dto, user);
  }

  @Post('orders/:id/release')
  @RequirePermissions('lab:release')
  @ApiOperation({ summary: 'Release verified results to clinical view' })
  release(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.release(id, user);
  }
}
