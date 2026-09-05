import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTankDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() alarmLowC?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() alarmHighC?: number;
}

export class CreatePositionDto {
  @ApiProperty() tankId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() room?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() canister?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cane?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() goblet?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rack?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
}

export class CreateStorageItemDto {
  @ApiProperty() positionId!: string;
  @ApiProperty() patientId!: string;
  @ApiPropertyOptional() @IsOptional() cycleId?: string;
  @ApiProperty() type!: 'EMBRYO' | 'OOCYTE' | 'SPERM' | 'TISSUE';
  @ApiProperty() label!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() frozenAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() renewalDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class WitnessDto {
  @ApiProperty() witnessId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ReleaseItemDto {
  @ApiProperty() witnessId!: string;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class LogTemperatureDto {
  @ApiProperty() tankId!: string;
  @ApiProperty() @IsNumber() tempC!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceId?: string;
}
