import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SecuritySettingsDto } from './dto/security-settings.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RATE_LIMIT_CONFIG } from '../common/config/rate-limit.config';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit(RATE_LIMIT_CONFIG.AUTH.REGISTER)
  async register(@Body() registerDto: RegisterDto, @Req() req: any) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.register(registerDto, userAgent, ipAddress);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(RATE_LIMIT_CONFIG.AUTH.LOGIN)
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Request() req,
  ) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit(RATE_LIMIT_CONFIG.AUTH.REFRESH_TOKEN)
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    // Extract access token from Authorization header
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1]; // Remove "Bearer " prefix

    console.log(
      'Logout request for user:',
      req.user.userId,
      'session:',
      req.user.sessionId,
    );

    await this.authService.logout(
      req.user.userId,
      req.user.sessionId,
      accessToken,
    );
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Request() req) {
    // Extract access token from Authorization header
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1]; // Remove "Bearer " prefix

    await this.authService.logoutAll(req.user.userId, accessToken);
    return { message: 'Logged out from all devices successfully' };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getUserSessions(@Request() req) {
    return this.authService.getUserSessions(req.user.userId);
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @RateLimit(RATE_LIMIT_CONFIG.AUTH.PASSWORD_RESET)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('validate-reset-token')
  async validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req,
  ) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Put('security-settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateSecuritySettings(
    @Body() securitySettingsDto: SecuritySettingsDto,
    @Request() req,
  ) {
    return this.authService.updateSecuritySettings(
      req.user.userId,
      securitySettingsDto,
    );
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @Body() deleteAccountDto: DeleteAccountDto,
    @Request() req,
  ) {
    return this.authService.deleteAccount(
      req.user.userId,
      deleteAccountDto.password,
    );
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ) {
    return this.authService.terminateSession(req.user.userId, sessionId);
  }
}
