import { Prisma } from './__generated__/prisma/index.js';
import { prisma } from './client.js';

export interface CreateAuditLogInput {
  guildId: string;
  actorId?: string | null;
  actorType?: 'user' | 'bot' | 'system';
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Write an audit log entry. Never throws — logs to stderr on failure. */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: input.guildId,
        actorId: input.actorId ?? null,
        actorType: input.actorType ?? 'user',
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        before: input.before as Prisma.InputJsonValue ?? Prisma.JsonNull,
        after: input.after as Prisma.InputJsonValue ?? Prisma.JsonNull,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
