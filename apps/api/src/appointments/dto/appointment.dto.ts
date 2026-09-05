import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export enum AppointmentStatusDto {
  REQUESTED = 'REQUESTED',
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export class CreateAppointmentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() facilityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() practitionerId?: string;
  @ApiProperty() @IsDateString() scheduledStart!: string;
  @ApiProperty() @IsDateString() scheduledEnd!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatusDto }) @IsEnum(AppointmentStatusDto) status!: AppointmentStatusDto;
  @ApiPropertyOptional() @IsOptional() @IsString() cancelledReason?: string;
  @ApiPropertyOptional() @IsOptional() version?: number;
}

export class AppointmentQueryDto {
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() pageSize?: number;
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional() sort?: string;
  @ApiPropertyOptional() order?: 'asc' | 'desc';
  @ApiPropertyOptional() status?: AppointmentStatusDto;
  @ApiPropertyOptional() from?: string;
  @ApiPropertyOptional() to?: string;
  @ApiPropertyOptional() patientId?: string;
}
