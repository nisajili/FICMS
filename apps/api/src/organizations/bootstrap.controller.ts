import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/org.dto';

class BootstrapPlatformAdminDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() name!: string;
  @IsString() token!: string;
}

class BootstrapOrgDto extends CreateOrganizationDto {
  @IsString() token!: string;
}

/**
 * One-time bootstrap endpoints. The platform bootstrap token must be set as an
 * environment variable and rotated after first use. These allow initial
 * platform-admin creation and initial org onboarding without a prior account.
 */
@ApiTags('bootstrap')
@Controller('bootstrap')
export class BootstrapController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  private verifyToken(token: string) {
    if (token !== process.env.PLATFORM_BOOTSTRAP_TOKEN) {
      throw new UnauthorizedException('Invalid bootstrap token.');
    }
  }

  @Post('platform-admin')
  @ApiOperation({ summary: 'Create the initial platform administrator' })
  async createPlatformAdmin(@Body() dto: BootstrapPlatformAdminDto) {
    this.verifyToken(dto.token);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (existing) throw new UnauthorizedException('A user already exists with that email.');
    const user = await this.authService.createUser({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: 'platform_admin',
      organizationId: null,
    });
    return { success: true, data: { id: user.id, email: user.email } };
  }

  @Post('organization')
  @ApiOperation({ summary: 'Onboard an organisation during initial setup (org_owner admin)' })
  async createOrg(@Body() dto: BootstrapOrgDto) {
    this.verifyToken(dto.token);
    const result = await this.organizationsService.createOrganization({
      name: dto.name,
      slug: dto.slug,
      domain: dto.domain,
      adminEmail: dto.adminEmail,
      adminPassword: dto.adminPassword,
      adminName: dto.adminName,
    });
    return { success: true, data: result };
  }
}
