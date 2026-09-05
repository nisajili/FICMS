import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class PrescriptionItemDto {
  @ApiProperty() medicationName!: string;
  @ApiProperty() dosage!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() durationDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiProperty() @IsNumber() quantity!: number;
}

export class CreatePrescriptionDto {
  @ApiProperty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty() @IsArray() items!: PrescriptionItemDto[];
}

export class VerifyPrescriptionDto {
  @ApiProperty() verified!: boolean;
}

export class DispenseItemDto {
  @ApiProperty() prescriptionItemId!: string;
  @ApiProperty() @IsNumber() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() batch?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inventoryItemId?: string;
}

export class CreateMedicationDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() genericName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() form?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() strength?: string;
  @ApiPropertyOptional() @IsOptional() controlled?: boolean;
}
