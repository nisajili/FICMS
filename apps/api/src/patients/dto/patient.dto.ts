import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum SexDto {
  FEMALE = 'FEMALE',
  MALE = 'MALE',
  OTHER = 'OTHER',
  UNKNOWN = 'UNKNOWN',
}

export class CreatePatientDto {
  @ApiProperty() @IsString() @MinLength(1) givenName!: string;
  @ApiProperty() @IsString() @MinLength(1) familyName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional({ enum: SexDto }) @IsOptional() @IsEnum(SexDto) sex?: SexDto;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyPhone?: string;
}

export class UpdatePatientDto {
  @ApiPropertyOptional() @IsOptional() @IsString() givenName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() familyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(SexDto) sex?: SexDto;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyPhone?: string;
}

export class LinkPartnerDto {
  @ApiProperty() partnerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relationshipType?: string;
}

export class PatientQueryDto {
  @ApiPropertyOptional() page?: number;
  @ApiPropertyOptional() pageSize?: number;
  @ApiPropertyOptional() search?: string;
  @ApiPropertyOptional() sort?: string;
  @ApiPropertyOptional() order?: 'asc' | 'desc';
  @ApiPropertyOptional() status?: string;
}
