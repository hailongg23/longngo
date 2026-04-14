import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from '../users/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SecuritySettingsDto } from './dto/security-settings.dto';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { RedisService } from '../redis/redis.service';
import { AuthResponse } from './interfaces/token-pair.interface';
import { EmailService } from '../email/email.service';
import { RateLimiterService } from '../security/rate-limiter.service';
import { AuditService } from '../security/audit.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private redisService: RedisService,
    private emailService: EmailService,
    private rateLimiterService: RateLimiterService,
    private auditService: AuditService,
  ) {}

  async register(
    registerDto: RegisterDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const { name, email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new this.userModel({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Log registration
    await this.auditService.logRegister(
      (user._id as any).toString(),
      user.email,
      ipAddress,
      userAgent,
    );

    // Generate token pair
    const tokenData = await this.tokenService.generateTokenPair(
      (user._id as any).toString(),
      user.email,
      user.role,
    );

    // Create session
    await this.sessionService.createSession(
      tokenData.sessionId,
      (user._id as any).toString(),
      user.email,
      user.role,
      tokenData.refreshTokenExpiresIn,
      userAgent,
      ipAddress,
    );

    return {
      user: {
        id: (user._id as any).toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        accessTokenExpiresIn: tokenData.accessTokenExpiresIn,
        refreshTokenExpiresIn: tokenData.refreshTokenExpiresIn,
      },
      sessionId: tokenData.sessionId,
    };
  }

  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const { email, password } = loginDto;

    try {
      // Check if IP is blocked due to failed attempts
      if (
        await this.rateLimiterService.isBlocked(
          ipAddress || 'unknown',
          'login_blocked',
        )
      ) {
        await this.auditService.logFailedAuthentication(
          'LOGIN',
          email,
          ipAddress,
          'IP blocked due to failed attempts',
        );
        throw new UnauthorizedException(
          'Too many failed login attempts. Please try again later.',
        );
      }

      // Find user by email
      const user = await this.userModel.findOne({ email });
      if (!user) {
        await this.rateLimiterService.recordFailedLogin(ipAddress || 'unknown');
        await this.auditService.logFailedAuthentication(
          'LOGIN',
          email,
          ipAddress,
          'User not found',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        await this.rateLimiterService.recordFailedLogin(ipAddress || 'unknown');
        await this.auditService.logFailedAuthentication(
          'LOGIN',
          email,
          ipAddress,
          'Invalid password',
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Clear failed login attempts on successful login
      await this.rateLimiterService.clearFailedLogins(ipAddress || 'unknown');

      // Generate token pair
      const tokenData = await this.tokenService.generateTokenPair(
        (user._id as any).toString(),
        user.email,
        user.role,
      );

      // Create session
      await this.sessionService.createSession(
        tokenData.sessionId,
        (user._id as any).toString(),
        user.email,
        user.role,
        tokenData.refreshTokenExpiresIn,
        userAgent,
        ipAddress,
      );

      // Log successful login
      await this.auditService.logLogin(
        (user._id as any).toString(),
        true,
        ipAddress,
        userAgent,
      );

      return {
        user: {
          id: (user._id as any).toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        tokens: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          accessTokenExpiresIn: tokenData.accessTokenExpiresIn,
          refreshTokenExpiresIn: tokenData.refreshTokenExpiresIn,
        },
        sessionId: tokenData.sessionId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      await this.auditService.logFailedAuthentication(
        'LOGIN',
        email,
        ipAddress,
        error.message,
      );
      throw new UnauthorizedException('Login failed');
    }
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: (user._id as any).toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      securitySettings: user.securitySettings || {
        emailNotifications: true,
        sessionTimeout: true,
        deviceTracking: true,
      },
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      dateOfBirth?: string;
    },
  ) {
    const { name, email, phone, address, dateOfBirth } = updateProfileDto;

    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await this.userModel.findOne({ email });
      if (existingUser) {
        throw new ConflictException('Email is already taken');
      }
    }

    // Update user profile
    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;
    if (dateOfBirth && dateOfBirth.trim()) {
      // Validate date format and create Date object
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateOfBirth)) {
        throw new BadRequestException(
          'Date of birth must be in YYYY-MM-DD format',
        );
      }

      const date = new Date(dateOfBirth);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date of birth');
      }

      // Check if date is not in the future
      if (date > new Date()) {
        throw new BadRequestException('Date of birth cannot be in the future');
      }

      updateFields.dateOfBirth = date;
    }
    updateFields.updatedAt = new Date();

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, select: '-password' },
    );

    if (!updatedUser) {
      throw new UnauthorizedException('Failed to update user');
    }

    // Log audit event
    await this.auditService.logEvent({
      userId,
      action: 'profile_update',
      ipAddress: 'system',
      userAgent: 'system',
      details: `Profile updated: ${Object.keys(updateProfileDto).join(', ')}`,
      success: true,
    });

    return {
      message: 'Profile updated successfully',
      user: {
        id: (updatedUser._id as any).toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        dateOfBirth: updatedUser.dateOfBirth,
        role: updatedUser.role,
      },
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    const tokenData = await this.tokenService.refreshTokens(refreshToken);

    // Get user info for response
    const user = await this.userModel
      .findById(tokenData.userId)
      .select('-password');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: (user._id as any).toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        accessTokenExpiresIn: tokenData.accessTokenExpiresIn,
        refreshTokenExpiresIn: tokenData.refreshTokenExpiresIn,
      },
      sessionId: tokenData.sessionId,
    };
  }

  async logout(
    userId: string,
    sessionId?: string,
    accessToken?: string,
  ): Promise<void> {
    // Blacklist the access token if provided
    if (accessToken) {
      await this.tokenService.blacklistToken(accessToken);
    }

    if (sessionId) {
      // Logout specific session
      // First revoke refresh token and session from TokenService
      await this.tokenService.revokeSession(sessionId);
      // Then revoke session from SessionService (handles user session tracking)
      await this.sessionService.revokeSession(sessionId);
      await this.auditService.logLogout(userId, sessionId);
    } else {
      // Logout all sessions
      await this.tokenService.revokeUserSessions(userId);
      await this.sessionService.revokeAllUserSessions(userId);
      await this.auditService.logLogout(userId);
    }
  }

  async logoutAll(userId: string, accessToken?: string): Promise<void> {
    // Blacklist the current access token if provided
    if (accessToken) {
      await this.tokenService.blacklistToken(accessToken);
    }

    await this.sessionService.revokeAllUserSessions(userId);
    await this.tokenService.revokeUserSessions(userId);
    await this.auditService.logLogout(userId, 'all_sessions');
  }

  async getUserSessions(userId: string) {
    return await this.sessionService.getUserSessions(userId);
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in Redis (more secure than database)
    await this.redisService.set(
      `password_reset:${resetToken}`,
      {
        userId: (user._id as any).toString(),
        email: user.email,
        createdAt: new Date().toISOString(),
      },
      3600, // 1 hour TTL
    );

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      // Log error but don't expose to user
      console.error('Failed to send reset email:', error);
    }

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Validate reset token
    const resetData = await this.redisService.get(`password_reset:${token}`);
    if (!resetData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const { userId } = resetData as any;

    // Find user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    // Remove reset token
    await this.redisService.del(`password_reset:${token}`);

    // Revoke all existing sessions for security
    await this.logoutAll(userId); // No access token needed for account deletion

    // Send success email
    try {
      await this.emailService.sendPasswordResetSuccessEmail(user.email);
    } catch (error) {
      console.error('Failed to send password reset success email:', error);
    }

    return {
      message: 'Password has been reset successfully. Please log in again.',
    };
  }

  async validateResetToken(token: string): Promise<{ valid: boolean }> {
    const resetData = await this.redisService.get(`password_reset:${token}`);
    return { valid: !!resetData };
  }

  async changePassword(
    userId: string,
    changePasswordDto: { currentPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
      updatedAt: new Date(),
    });

    // Log audit event
    await this.auditService.logEvent({
      userId,
      action: 'password_change',
      ipAddress: 'system',
      userAgent: 'system',
      details: 'Password changed successfully',
      success: true,
    });

    // Revoke all existing sessions for security (except current one)
    await this.tokenService.revokeUserSessions(userId);

    // Send security notification email
    try {
      await this.emailService.sendSecurityAlert(
        user.email,
        'Password Changed',
        "Your password has been changed successfully. If this wasn't you, please contact support immediately.",
      );
    } catch (error) {
      console.error('Failed to send password change notification:', error);
    }

    return {
      message:
        'Password changed successfully. Please log in again on other devices.',
    };
  }

  async updateSecuritySettings(
    userId: string,
    securitySettingsDto: SecuritySettingsDto,
  ): Promise<{ message: string; securitySettings: any }> {
    // Get user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update security settings
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'securitySettings.emailNotifications':
            securitySettingsDto.emailNotifications ??
            user.securitySettings?.emailNotifications ??
            true,
          'securitySettings.sessionTimeout':
            securitySettingsDto.sessionTimeout ??
            user.securitySettings?.sessionTimeout ??
            true,
          'securitySettings.deviceTracking':
            securitySettingsDto.deviceTracking ??
            user.securitySettings?.deviceTracking ??
            true,
        },
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new UnauthorizedException('Failed to update security settings');
    }

    // Log audit event
    await this.auditService.logEvent({
      userId,
      action: 'security_settings_update',
      ipAddress: 'system',
      userAgent: 'system',
      details: `Security settings updated: ${Object.keys(securitySettingsDto).join(', ')}`,
      success: true,
    });

    return {
      message: 'Security settings updated successfully',
      securitySettings: updatedUser.securitySettings,
    };
  }

  async deleteAccount(
    userId: string,
    password: string,
  ): Promise<{ message: string }> {
    // Get user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Log audit event before deletion
    await this.auditService.logEvent({
      userId,
      action: 'account_deletion',
      ipAddress: 'system',
      userAgent: 'system',
      details: 'User account deleted',
      success: true,
    });

    // Revoke all sessions
    await this.tokenService.revokeUserSessions(userId);

    // Delete user
    await this.userModel.findByIdAndDelete(userId);

    // Send confirmation email
    try {
      await this.emailService.sendSecurityAlert(
        user.email,
        'Account Deleted',
        'Your account has been permanently deleted. All your data has been removed from our system.',
      );
    } catch (error) {
      console.error('Failed to send account deletion notification:', error);
    }

    return {
      message: 'Account deleted successfully',
    };
  }

  async terminateSession(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    // Verify the session belongs to the user
    const session = await this.sessionService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException(
        'Session not found or does not belong to user',
      );
    }

    // Revoke the session
    await this.sessionService.revokeSession(sessionId);

    // Log audit event
    await this.auditService.logEvent({
      userId,
      action: 'session_termination',
      ipAddress: 'system',
      userAgent: 'system',
      details: `Session ${sessionId} terminated by user`,
      success: true,
    });

    return {
      message: 'Session terminated successfully',
    };
  }
}
