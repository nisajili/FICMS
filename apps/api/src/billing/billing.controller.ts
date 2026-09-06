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
import { BillingService } from './billing.service';
import { CreateInvoiceDto, RecordPaymentDto, RefundPaymentDto, BillingQueryDto, CreateInstallmentDto } from './dto/billing.dto';
import { CurrentUser } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

@ApiTags('billing')
@UseGuards(PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Post('invoices')
  @RequirePermissions('billing:create')
  @ApiOperation({ summary: 'Create a draft invoice (services/package/line items)' })
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: SessionUser) {
    return this.service.createInvoice(dto, user);
  }

  @Get('invoices')
  @RequirePermissions('billing:view')
  @ApiOperation({ summary: 'List invoices' })
  list(@Query() q: BillingQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.list(q, user);
  }

  @Get('invoices/:id')
  @RequirePermissions('billing:view')
  @ApiOperation({ summary: 'Get an invoice with lines, payments, installments' })
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  @Patch('invoices/:id/issue')
  @RequirePermissions('billing:update')
  @ApiOperation({ summary: 'Issue a draft invoice' })
  issue(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.issue(id, user);
  }

  @Post('invoices/:id/installments')
  @RequirePermissions('billing:update')
  @ApiOperation({ summary: 'Add an installment plan line' })
  addInstallment(@Param('id') id: string, @Body() dto: CreateInstallmentDto, @CurrentUser() user: SessionUser) {
    return this.service.addInstallment(id, dto.amountDue, dto.dueDate, dto.installmentNumber, user);
  }

  @Post('invoices/:id/payments')
  @RequirePermissions('payment:create')
  @ApiOperation({ summary: 'Record a payment (idempotency-key protected)' })
  pay(@Param('id') id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: SessionUser) {
    return this.service.recordPayment(id, dto, user);
  }

  @Post('payments/:id/refund')
  @RequirePermissions('payment:refund')
  @ApiOperation({ summary: 'Refund a payment' })
  refund(@Param('id') id: string, @Body() dto: RefundPaymentDto, @CurrentUser() user: SessionUser) {
    return this.service.refund(id, dto, user);
  }
}
