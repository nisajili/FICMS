import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum PaymentMethodDto {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  INSURANCE = 'INSURANCE',
  OTHER = 'OTHER',
}

export class CreateInvoiceLineDto {
  @ApiProperty() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiProperty() @IsNumber() unitPrice!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxRate?: number;
}

export class CreateInvoiceDto {
  @ApiProperty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() lineItems?: CreateInvoiceLineDto[];
  @ApiPropertyOptional() @IsOptional() @IsArray() serviceCodes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() packageCode?: string;
}

export class IssueInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateInstallmentDto {
  @ApiProperty() @IsNumber() amountDue!: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() installmentNumber?: number;
}

export class RecordPaymentDto {
  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiProperty({ enum: PaymentMethodDto }) @IsEnum(PaymentMethodDto) method!: PaymentMethodDto;
  @ApiProperty() @IsString() idempotencyKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() provider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalRef?: string;
}

export class RefundPaymentDto {
  @ApiProperty() @IsNumber() @Min(1) amount!: number;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvedById?: string;
}

export class BillingQueryDto {
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() pageSize?: number;
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() from?: string;
  @ApiPropertyOptional() to?: string;
  @ApiPropertyOptional() patientId?: string;
}
