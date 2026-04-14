import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export interface SessionInfo {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  lastActivity: string;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class SessionService {
  constructor(private readonly redisService: RedisService) {}

  async createSession(
    sessionId: string,
    userId: string,
    email: string,
    role: string,
    ttl: number,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    const sessionInfo: SessionInfo = {
      userId,
      email,
      role,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      userAgent,
      ipAddress,
    };

    await this.redisService.set(`session:${sessionId}`, sessionInfo, ttl);

    // Track user sessions for management
    await this.addUserSession(userId, sessionId, ttl);
  }

  async getSession(sessionId: string): Promise<SessionInfo | null> {
    return await this.redisService.get<SessionInfo>(`session:${sessionId}`);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      const ttl = await this.redisService.ttl(`session:${sessionId}`);
      await this.redisService.set(
        `session:${sessionId}`,
        session,
        ttl > 0 ? ttl : undefined,
      );
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      // Only remove from user session tracking, don't delete the session itself
      // as it's already handled by TokenService
      await this.removeUserSession(session.userId, sessionId);
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.getUserSessionIds(userId);

    // Remove all sessions
    for (const sessionId of sessionIds) {
      await this.redisService.del(`session:${sessionId}`);
    }

    // Clear user session tracking
    await this.redisService.del(`user_sessions:${userId}`);
  }

  async getUserSessions(
    userId: string,
  ): Promise<(SessionInfo & { sessionId: string; ttl: number })[]> {
    const sessionIds = await this.getUserSessionIds(userId);
    const sessions: (SessionInfo & { sessionId: string; ttl: number })[] = [];

    for (const sessionId of sessionIds) {
      const sessionInfo = await this.getSession(sessionId);
      if (sessionInfo) {
        const ttl = await this.redisService.ttl(`session:${sessionId}`);
        sessions.push({
          ...sessionInfo,
          sessionId,
          ttl,
        });
      }
    }

    return sessions;
  }

  async getUserSessionCount(userId: string): Promise<number> {
    const sessionIds = await this.getUserSessionIds(userId);
    return sessionIds.length;
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    return await this.redisService.exists(`session:${sessionId}`);
  }

  async extendSession(sessionId: string, ttl: number): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      await this.redisService.expire(`session:${sessionId}`, ttl);
      await this.extendUserSession(session.userId, sessionId, ttl);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    // This method can be called by a cron job to cleanup orphaned session tracking
    const userSessionKeys = await this.redisService.keys('user_sessions:*');

    for (const userKey of userSessionKeys) {
      const sessionIds = await this.redisService.get<string[]>(userKey);
      if (sessionIds) {
        const validSessionIds: string[] = [];

        for (const sessionId of sessionIds) {
          if (await this.isSessionValid(sessionId)) {
            validSessionIds.push(sessionId);
          }
        }

        if (validSessionIds.length !== sessionIds.length) {
          if (validSessionIds.length > 0) {
            await this.redisService.set(userKey, validSessionIds);
          } else {
            await this.redisService.del(userKey);
          }
        }
      }
    }
  }

  private async addUserSession(
    userId: string,
    sessionId: string,
    ttl: number,
  ): Promise<void> {
    const existingSessions = await this.getUserSessionIds(userId);
    const updatedSessions = [...existingSessions, sessionId];
    await this.redisService.set(
      `user_sessions:${userId}`,
      updatedSessions,
      ttl,
    );
  }

  private async removeUserSession(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const existingSessions = await this.getUserSessionIds(userId);
    const updatedSessions = existingSessions.filter((id) => id !== sessionId);

    if (updatedSessions.length > 0) {
      const ttl = await this.redisService.ttl(`user_sessions:${userId}`);
      await this.redisService.set(
        `user_sessions:${userId}`,
        updatedSessions,
        ttl > 0 ? ttl : undefined,
      );
    } else {
      await this.redisService.del(`user_sessions:${userId}`);
    }
  }

  private async extendUserSession(
    userId: string,
    sessionId: string,
    ttl: number,
  ): Promise<void> {
    const existingSessions = await this.getUserSessionIds(userId);
    if (existingSessions.includes(sessionId)) {
      await this.redisService.expire(`user_sessions:${userId}`, ttl);
    }
  }

  private async getUserSessionIds(userId: string): Promise<string[]> {
    const sessions = await this.redisService.get<string[]>(
      `user_sessions:${userId}`,
    );
    return sessions || [];
  }
}
