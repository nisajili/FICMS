import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty() name!: string;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantityOnHand?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minimumStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() batch?: string;
}

export class AdjustStockDto {
  @ApiProperty() type!: 'receipt' | 'issue' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return';
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class InventoryQueryDto {
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() pageSize?: number;
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional() category?: string;
}
