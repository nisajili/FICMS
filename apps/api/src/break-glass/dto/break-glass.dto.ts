import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBreakGlassRequestDto {
  @ApiProperty({ description: 'Organisation (clinic) whose clinical data is being accessed.' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ description: 'Justification for emergency access. Must be specific and auditable.' })
  @IsString()
  @MinLength(8)
  reason!: string;

  @ApiPropertyOptional({ description: 'Requested duration in minutes. Defaults to the platform maximum.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  durationMinutes?: number;
}

export class BreakGlassQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
