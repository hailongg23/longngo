import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import {
  JwtPayload,
  TokenValidationResult,
} from '../interfaces/jwt-payload.interface';
import { TokenPair } from '../interfaces/token-pair.interface';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    // Get environment variables with logging
    const accessSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiry = this.configService.get<string>('JWT_EXPIRES_IN');
    const refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );

    // Log what we got from environment (without exposing secrets)
    this.logger.debug(`JWT_SECRET exists: ${!!accessSecret}`);
    this.logger.debug(`JWT_REFRESH_SECRET exists: ${!!refreshSecret}`);
    this.logger.debug(`JWT_EXPIRES_IN: ${accessExpiry}`);
    this.logger.debug(`JWT_REFRESH_EXPIRES_IN: ${refreshExpiry}`);

    // Set secrets with fallbacks
    this.accessTokenSecret = accessSecret || 'default-secret';
    this.refreshTokenSecret = refreshSecret || 'default-refresh-secret';

    // Validate and set expiry times with proper defaults
    this.accessTokenExpiry =
      this.validateExpiryFormat(accessExpiry || '15m') || '15m';
    this.refreshTokenExpiry =
      this.validateExpiryFormat(refreshExpiry || '7d') || '7d';

    // Log final values
    this.logger.debug(`Final access token expiry: ${this.accessTokenExpiry}`);
    this.logger.debug(`Final refresh token expiry: ${this.refreshTokenExpiry}`);
  }

  private validateExpiryFormat(expiry: string): string | null {
    if (!expiry || typeof expiry !== 'string') {
      return null;
    }

    // Check if it's a number (seconds)
    if (/^\d+$/.test(expiry)) {
      return expiry;
    }

    // Check if it's a valid time string (e.g., '15m', '7d', '1h')
    if (/^\d+[smhd]$/.test(expiry)) {
      return expiry;
    }

    return null;
  }

  async generateTokenPair(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenPair & { sessionId: string }> {
    const sessionId = this.generateSessionId();

    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      type: 'access',
      sessionId,
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      type: 'refresh',
      sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessTokenSecret,
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenExpiry,
      }),
    ]);

    // Store refresh token in Redis
    await this.storeRefreshToken(userId, refreshToken, sessionId);

    // Store session info
    await this.storeSessionInfo(sessionId, userId, email, role);

    return {
      accessToken,
      refreshToken,
      sessionId,
      accessTokenExpiresIn: this.parseExpiryToSeconds(this.accessTokenExpiry),
      refreshTokenExpiresIn: this.parseExpiryToSeconds(this.refreshTokenExpiry),
    };
  }

  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        return { isValid: false, error: 'Token is blacklisted' };
      }

      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.accessTokenSecret,
      })) as JwtPayload;

      if (payload.type !== 'access') {
        return { isValid: false, error: 'Invalid token type' };
      }

      // Check if session exists
      if (
        payload.sessionId &&
        !(await this.isSessionValid(payload.sessionId))
      ) {
        return { isValid: false, error: 'Session expired or invalid' };
      }

      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  async validateRefreshToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.refreshTokenSecret,
      })) as JwtPayload;

      if (payload.type !== 'refresh') {
        return { isValid: false, error: 'Invalid token type' };
      }

      // Check if refresh token exists in Redis
      const isStored = await this.isRefreshTokenStored(payload.sub, token);
      if (!isStored) {
        return { isValid: false, error: 'Refresh token not found or expired' };
      }

      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<TokenPair & { sessionId: string; userId: string }> {
    const validation = await this.validateRefreshToken(refreshToken);

    if (!validation.isValid || !validation.payload) {
      throw new UnauthorizedException(validation.error);
    }

    const { payload } = validation;

    // Revoke old refresh token
    await this.revokeRefreshToken(payload.sub, refreshToken);

    // Generate new token pair
    const tokenData = await this.generateTokenPair(
      payload.sub,
      payload.email,
      payload.role,
    );

    return {
      ...tokenData,
      userId: payload.sub,
    };
  }

  async blacklistToken(token: string): Promise<void> {
    this.logger.debug(`Blacklisting token: ${token.substring(0, 20)}...`);
    try {
      const payload = (await this.jwtService.decode(token)) as JwtPayload;
      if (payload && payload.exp) {
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redisService.set(`blacklist:${token}`, true, ttl);
          this.logger.debug(`Token blacklisted with TTL: ${ttl}s`);
        } else {
          this.logger.debug('Token already expired, not blacklisting');
        }
      }
    } catch (error) {
      // Token might be invalid, but we still want to blacklist it
      await this.redisService.set(`blacklist:${token}`, true, 86400); // 24 hours
      this.logger.debug('Token blacklisted with default 24h TTL');
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return await this.redisService.exists(`blacklist:${token}`);
  }

  async revokeUserSessions(userId: string): Promise<void> {
    // Remove all refresh tokens for user
    await this.redisService.flushPattern(`refresh_token:${userId}:*`);

    // Remove all sessions for user (sessions are stored as session:sessionId, not session:*:userId)
    // We need to get user sessions first then delete them
    const userSessionsKey = `user_sessions:${userId}`;
    const sessionIds = await this.redisService.get<string[]>(userSessionsKey);

    if (sessionIds && sessionIds.length > 0) {
      // Delete all sessions for this user
      for (const sessionId of sessionIds) {
        await this.redisService.del(`session:${sessionId}`);
      }
    }

    // Delete the user sessions tracking key
    await this.redisService.del(userSessionsKey);
  }
  async revokeSession(sessionId: string): Promise<void> {
    this.logger.debug(`Revoking session: ${sessionId}`);
    const sessionInfo = await this.redisService.get(`session:${sessionId}`);
    if (sessionInfo) {
      const { userId } = sessionInfo as any;
      const refreshTokenKey = `refresh_token:${userId}:${sessionId}`;

      // Delete specific refresh token for this session
      const deleted = await this.redisService.del(refreshTokenKey);
      this.logger.debug(`Deleted refresh token ${refreshTokenKey}: ${deleted}`);

      // Delete session info
      const sessionDeleted = await this.redisService.del(
        `session:${sessionId}`,
      );
      this.logger.debug(`Deleted session ${sessionId}: ${sessionDeleted}`);
    } else {
      this.logger.warn(`Session ${sessionId} not found when trying to revoke`);
    }
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    sessionId: string,
  ): Promise<void> {
    const ttl = this.parseExpiryToSeconds(this.refreshTokenExpiry);
    await this.redisService.set(
      `refresh_token:${userId}:${sessionId}`,
      refreshToken,
      ttl,
    );
  }

  private async storeSessionInfo(
    sessionId: string,
    userId: string,
    email: string,
    role: string,
  ): Promise<void> {
    const sessionInfo = {
      userId,
      email,
      role,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    const ttl = this.parseExpiryToSeconds(this.refreshTokenExpiry);
    await this.redisService.set(`session:${sessionId}`, sessionInfo, ttl);
  }

  private async isRefreshTokenStored(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const keys = await this.redisService.keys(`refresh_token:${userId}:*`);

    for (const key of keys) {
      const storedToken = await this.redisService.get(key);
      if (storedToken === refreshToken) {
        return true;
      }
    }

    return false;
  }

  private async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const keys = await this.redisService.keys(`refresh_token:${userId}:*`);

    for (const key of keys) {
      const storedToken = await this.redisService.get(key);
      if (storedToken === refreshToken) {
        await this.redisService.del(key);
        break;
      }
    }
  }

  private async isSessionValid(sessionId: string): Promise<boolean> {
    return await this.redisService.exists(`session:${sessionId}`);
  }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600; // Default 1 hour
    }
  }

  async getUserSessions(userId: string): Promise<any[]> {
    const sessionKeys = await this.redisService.keys(`session:*`);
    const sessions: any[] = [];

    for (const key of sessionKeys) {
      const sessionInfo = await this.redisService.get(key);
      if (sessionInfo && (sessionInfo as any).userId === userId) {
        const sessionId = key.split(':')[1];
        sessions.push({
          sessionId,
          ...sessionInfo,
          ttl: await this.redisService.ttl(key),
        });
      }
    }

    return sessions;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionInfo = await this.redisService.get(`session:${sessionId}`);
    if (sessionInfo) {
      const updated = {
        ...(sessionInfo as any),
        lastActivity: new Date().toISOString(),
      };
      const ttl = await this.redisService.ttl(`session:${sessionId}`);
      await this.redisService.set(
        `session:${sessionId}`,
        updated,
        ttl > 0 ? ttl : undefined,
      );
    }
  }
}
