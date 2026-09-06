import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsUrl,
} from 'class-validator';
import { IsSlug } from './is-slug.validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Golden Care Fertility Center' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'golden-care' })
  @IsSlug()
  slug!: string;

  @ApiPropertyOptional({ example: 'care.example.com' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({ example: 'admin@care.example.com' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminName?: string;
}

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  value!: unknown;
}
