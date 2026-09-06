import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@clinic.example' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class VerifyMfaDto {
  @ApiProperty()
  @IsString()
  mfaToken!: string;

  @ApiProperty()
  @IsString()
  code!: string;
}

export class RefreshDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class TotpSetupStartResponse {
  @ApiProperty()
  secret!: string;
  @ApiProperty()
  otpauthUrl!: string;
  @ApiProperty()
  qrCodeDataUrl!: string;
}

export class TotpVerifyDto {
  @ApiProperty()
  @IsString()
  code!: string;
}
