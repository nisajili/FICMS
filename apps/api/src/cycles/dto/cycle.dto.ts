import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsJson } from './is-json.validator';

export enum CycleStatusDto {
  PLANNED = 'PLANNED',
  BASELINE_ASSESSMENT = 'BASELINE_ASSESSMENT',
  STIMULATION = 'STIMULATION',
  MONITORING = 'MONITORING',
  TRIGGER = 'TRIGGER',
  RETRIEVAL = 'RETRIEVAL',
  FERTILIZATION = 'FERTILIZATION',
  EMBRYO_CULTURE = 'EMBRYO_CULTURE',
  TRANSFER = 'TRANSFER',
  FREEZING = 'FREEZING',
  LUTEAL_SUPPORT = 'LUTEAL_SUPPORT',
  PREGNANCY_TEST = 'PREGNANCY_TEST',
  CLINICAL_PREGNANCY = 'CLINICAL_PREGNANCY',
  OUTCOME = 'OUTCOME',
  CANCELLED = 'CANCELLED',
}

export enum TreatmentTypeDto {
  IVF = 'IVF',
  ICSI = 'ICSI',
  IUI = 'IUI',
  OTHER = 'OTHER',
}

export class CreateCycleDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() partnerId?: string;
  @ApiProperty({ enum: TreatmentTypeDto }) @IsEnum(TreatmentTypeDto) treatmentType!: TreatmentTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsString() protocolTemplate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CycleStatusDtoInput {
  @ApiProperty({ enum: CycleStatusDto }) @IsEnum(CycleStatusDto) status!: CycleStatusDto;
  @ApiPropertyOptional() @IsOptional() version?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() outcome?: string;
}

export class CreateCycleEventDto {
  @ApiProperty() eventType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateCycleMedicationDto {
  @ApiProperty() name!: string;
  @ApiProperty() dose!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional() @IsOptional() dayFrom?: number;
  @ApiPropertyOptional() @IsOptional() dayTo?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
}

export class CycleQueryDto {
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() pageSize?: number;
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional() status?: CycleStatusDto;
  @ApiPropertyOptional() patientId?: string;
}
