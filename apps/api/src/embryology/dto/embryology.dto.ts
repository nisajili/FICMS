import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEmbryoDto {
  @ApiProperty() cycleId!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() label!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() dayObserved?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() development?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class EmbryoObservationDto {
  @ApiProperty() day!: number;
  @ApiPropertyOptional() @IsOptional() cellCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional() @IsOptional() fragmentationPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class DoubleWitnessDto {
  @ApiProperty({ description: 'Secondary staff member confirming identity-sensitive event' })
  witnessId!: string;
  @ApiProperty({ description: 'Witness digital signature confirmation token' })
  witnessSignature?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class EmbryoStatusDto {
  @ApiProperty() status!: 'OOCYTE' | 'FERTILIZED' | 'CULTURING' | 'TRANSFERRED' | 'FROZEN' | 'DISCARDED' | 'BIOPSIED';
}

export class EmbryoQueryDto {
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() pageSize?: number;
  @ApiPropertyOptional() cycleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() patientId?: string;
  @ApiPropertyOptional() status?: string;
}
