import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateConsentDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Consent template identifier (e.g. ivf_treatment)' })
  @IsOptional()
  @IsString()
  templateKey?: string;
}

export class UpdateConsentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateKey?: string;
}

export class SignConsentDto {
  @ApiProperty({ description: 'Name of the person signing (patient or guardian).' })
  @IsString()
  @MinLength(1)
  signedByName!: string;

  @ApiPropertyOptional({ description: 'Witness name (double-witness verification).' })
  @IsOptional()
  @IsString()
  witnessName?: string;

  @ApiPropertyOptional({ description: 'Witness staff/user id.' })
  @IsOptional()
  @IsUUID()
  witnessId?: string;

  @ApiPropertyOptional({ description: 'Document/evidence id or storage key for the signed copy.' })
  @IsOptional()
  @IsString()
  evidenceKey?: string;
}

export class WitnessConsentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  witnessName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  witnessId?: string;
}

export class RevokeConsentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ConsentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'WITNESSED', 'REVOKED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'WITNESSED', 'REVOKED'])
  status?: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'WITNESSED' | 'REVOKED';
}
