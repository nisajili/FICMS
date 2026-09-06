import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, VerifyMfaDto, RefreshDto, LogoutDto, TotpVerifyDto } from './dto/auth.dto';
import { CurrentUser, Public } from '../common/decorators';
import { PermissionsGuard, RequirePermissions } from '../common/permissions.guard';
import type { SessionUser } from '@ficms/types';

const ACCESS_COOKIE = 'ficms_access';
const REFRESH_COOKIE = 'ficms_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const secure = process.env.COOKIE_SECURE === 'true';
    const base = {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
    res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Authenticate with email + password' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (result.requiresMfa) {
      return { success: true, data: { requiresMfa: true, mfaToken: result.mfaToken } };
    }
    this.setCookies(res, result.accessToken, result.refreshToken ?? '');
    return { success: true, data: { requiresMfa: false, user: result.user } };
  }

  @Post('mfa/verify')
  @Public()
  @ApiOperation({ summary: 'Complete 2FA challenge after password login' })
  async verifyMfa(@Body() dto: VerifyMfaDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyMfa(dto.mfaToken, dto.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setCookies(res, result.accessToken, result.refreshToken ?? '');
    return { success: true, data: { requiresMfa: false, user: result.user } };
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token from refresh cookie/token' })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = dto.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    if (!token) throw new UnauthorizedException('No refresh token.');
    const result = await this.authService.refresh(token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setCookies(res, result.accessToken, result.refreshToken ?? '');
    return { success: true, data: { user: result.user } };
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(@Body() dto: LogoutDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = dto.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    await this.authService.logout(token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.clearCookies(res);
    return { success: true, data: { loggedOut: true } };
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the current session user (any authenticated user)' })
  async me(@CurrentUser() user: SessionUser) {
    const fresh = await this.authService.getSessionUser(user.id);
    return { success: true, data: fresh ?? user };
  }

  @Post('mfa/setup')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin:update')
  @ApiOperation({ summary: 'Begin TOTP setup' })
  async startTotp(@CurrentUser() user: SessionUser) {
    return { success: true, data: await this.authService.beginTotpSetup(user.id, user.email) };
  }

  @Post('mfa/confirm')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin:update')
  @ApiOperation({ summary: 'Confirm TOTP setup' })
  async confirmTotp(@CurrentUser() user: SessionUser, @Body() dto: TotpVerifyDto) {
    await this.authService.confirmTotpSetup(user.id, dto.code);
    return { success: true, data: { enabled: true } };
  }
}
