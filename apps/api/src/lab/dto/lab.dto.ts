import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsJson } from './is-json.validator';

export class CreateLabOrderDto {
  @ApiProperty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() requestedTests?: { testName: string; testCode?: string }[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class LabOrderStatusDto {
  @ApiProperty() status!: 'REQUESTED' | 'SPECIMEN_COLLECTED' | 'ACCESSED' | 'PROCESSING' | 'VERIFIED' | 'RELEASED' | 'INVALIDATED';
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateSpecimenDto {
  @ApiProperty() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() collectedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SubmitResultDto {
  @ApiProperty() testName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() testCode?: string;
  @ApiProperty() value!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceLow?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceHigh?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class VerifyResultDto {
  @ApiProperty() resultId!: string;
  @ApiProperty({ type: Boolean }) isCritical?: boolean;
  @ApiProperty({ type: Boolean }) isAbnormal?: boolean;
}

export class CreateLabTestDto {
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceLow?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceHigh?: string;
}

export class LabQueryDto {
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() pageSize?: number;
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional() status?: string;
  @ApiPropertyOptional() patientId?: string;
}
