import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { User, UserSchema } from '../users/user.schema';
import { EmailModule } from '../email/email.module';
import { SecurityModule } from '../security/security.module';
import { RedisModule } from '../redis/redis.module';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),
    EmailModule,
    SecurityModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    RateLimitGuard,
  ],
  exports: [AuthService, TokenService, SessionService],
})
export class AuthModule {}
