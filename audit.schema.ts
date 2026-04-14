import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditService } from './audit.service';

@Injectable()
export class AuditCleanupService {
  constructor(private readonly auditService: AuditService) {}

  // Run cleanup every day at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldAuditLogs() {
    console.log('Running audit logs cleanup...');
    await this.auditService.deleteOldAuditLogs(90); // Keep 90 days
    console.log('Audit logs cleanup completed');
  }
}
