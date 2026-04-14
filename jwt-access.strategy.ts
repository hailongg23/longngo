import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from '../../security/rate-limiter.service';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../../common/decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting applied
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Create identifier (IP + User ID if available)
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.userId;
    const identifier = userId ? `${ip}:${userId}` : ip;

    // Check if user/IP is whitelisted (skip rate limiting)
    if (
      await this.rateLimiterService.isWhitelisted(
        identifier,
        rateLimitOptions.category,
      )
    ) {
      return true; // Skip rate limiting for whitelisted users
    }

    // Check if user is blocked
    if (
      await this.rateLimiterService.isBlocked(
        identifier,
        rateLimitOptions.category + '_blocked',
      )
    ) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'You are temporarily blocked due to too many failed attempts',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check rate limit
    const result = await this.rateLimiterService.checkRateLimit(
      identifier,
      rateLimitOptions,
      rateLimitOptions.category,
    );

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader(
      'X-RateLimit-Reset',
      new Date(result.resetTime).toISOString(),
    );

    if (!result.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          error: 'Too Many Requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
