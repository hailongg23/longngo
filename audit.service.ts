import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('my-logs')
  async getMyAuditLogs(
    @GetUser('id') userId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const logs = await this.auditService.getUserAuditLogs(
      userId,
      parseInt(limit),
      parseInt(offset),
    );
    return { logs };
  }

  @Get('all-logs')
  async getAllAuditLogs(
    @GetUser() user: any,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    // Only admin can view all audit logs
    if (user.role !== 'admin') {
      throw new Error('Access denied');
    }

    const logs = await this.auditService.getAuditLogs(
      parseInt(limit),
      parseInt(offset),
    );
    return { logs };
  }

  @Post('sync')
  async syncAuditLogs(@GetUser() user: any) {
    // Only admin can manually trigger sync
    if (user.role !== 'admin') {
      throw new Error('Access denied');
    }

    const result = await this.auditService.syncRedisToMongo();
    return {
      message: 'Audit logs sync completed',
      transferred: result.transferred,
      errors: result.errors,
    };
  }

  @Post('sync-user')
  async syncUserAuditLogs(
    @GetUser() user: any,
    @Query('userId') userId: string,
  ) {
    // Only admin can sync specific user logs
    if (user.role !== 'admin') {
      throw new Error('Access denied');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    const result = await this.auditService.syncUserAuditFromRedis(userId);
    return {
      message: `User ${userId} audit logs sync completed`,
      transferred: result.transferred,
      errors: result.errors,
    };
  }
}
