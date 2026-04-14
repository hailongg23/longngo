import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Audit, AuditDocument } from './audit.schema';
import { RedisService } from '../redis/redis.service';

interface RedisAuditData {
  userId?: string;
  action?: string;
  resource?: string;
  metadata?: any;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string | Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(Audit.name) private auditModel: Model<AuditDocument>,
    private redisService: RedisService,
  ) {}

  async logAction(
    userId: string | Types.ObjectId,
    action: string,
    resource: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const auditLog = new this.auditModel({
        userId: new Types.ObjectId(userId),
        action,
        resource,
        metadata,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        timestamp: new Date(),
      });

      await auditLog.save();
    } catch (error) {
      console.error('Failed to save audit log:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  async getUserAuditLogs(
    userId: string | Types.ObjectId,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Audit[]> {
    return this.auditModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
      .exec();
  }

  async getAuditLogs(
    limit: number = 100,
    offset: number = 0,
  ): Promise<Audit[]> {
    return this.auditModel
      .find()
      .populate('userId', 'email fullName')
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
      .exec();
  }

  async deleteOldAuditLogs(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.auditModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });
  }

  // Sync audit logs from Redis to MongoDB
  async syncRedisToMongo(): Promise<{ transferred: number; errors: number }> {
    let transferred = 0;
    let errors = 0;

    try {
      // Get all audit keys from Redis
      const keys = await this.redisService.keys('audit:*');

      for (const key of keys) {
        try {
          const auditData = (await this.redisService.get(
            key,
          )) as RedisAuditData;

          if (auditData && typeof auditData === 'object') {
            // Create audit log in MongoDB
            const auditLog = new this.auditModel({
              userId: new Types.ObjectId(
                auditData.userId || '000000000000000000000000',
              ),
              action: auditData.action || 'unknown',
              resource: auditData.resource || 'unknown',
              metadata: auditData.metadata || auditData.details || {},
              ipAddress: auditData.ipAddress || 'unknown',
              userAgent: auditData.userAgent || 'unknown',
              timestamp: auditData.timestamp
                ? new Date(auditData.timestamp)
                : new Date(),
            });

            await auditLog.save();

            // Remove from Redis after successful save
            await this.redisService.del(key);
            transferred++;
          }
        } catch (error) {
          console.error(`Error processing audit key ${key}:`, error);
          errors++;
        }
      }

      console.log(
        `Audit sync completed: ${transferred} transferred, ${errors} errors`,
      );
      return { transferred, errors };
    } catch (error) {
      console.error('Error during audit sync:', error);
      return { transferred, errors };
    }
  }

  // Sync specific user's audit logs from Redis to MongoDB
  async syncUserAuditFromRedis(
    userId: string,
  ): Promise<{ transferred: number; errors: number }> {
    let transferred = 0;
    let errors = 0;

    try {
      // Get user-specific audit keys from Redis
      const keys = await this.redisService.keys(`audit:${userId}:*`);

      for (const key of keys) {
        try {
          const auditData = (await this.redisService.get(
            key,
          )) as RedisAuditData;

          if (auditData && typeof auditData === 'object') {
            const auditLog = new this.auditModel({
              userId: new Types.ObjectId(userId),
              action: auditData.action || 'unknown',
              resource: auditData.resource || 'unknown',
              metadata: auditData.metadata || auditData.details || {},
              ipAddress: auditData.ipAddress || 'unknown',
              userAgent: auditData.userAgent || 'unknown',
              timestamp: auditData.timestamp
                ? new Date(auditData.timestamp)
                : new Date(),
            });

            await auditLog.save();
            await this.redisService.del(key);
            transferred++;
          }
        } catch (error) {
          console.error(`Error processing user audit key ${key}:`, error);
          errors++;
        }
      }

      return { transferred, errors };
    } catch (error) {
      console.error(`Error syncing user ${userId} audit logs:`, error);
      return { transferred, errors };
    }
  }

  // Scheduled job to sync audit logs from Redis to MongoDB every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleAuditSync() {
    this.logger.log('Starting scheduled audit log sync from Redis to MongoDB');

    try {
      const result = await this.syncRedisToMongo();
      this.logger.log(
        `Audit sync completed. Transferred: ${result.transferred}, Errors: ${result.errors}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to sync audit logs from Redis to MongoDB',
        error,
      );
    }
  }
}
