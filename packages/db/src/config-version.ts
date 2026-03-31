import type { Prisma } from '@prisma/client';
import { prisma } from './client.js';

export interface SaveConfigVersionInput {
  guildId: string;
  scope: string;
  snapshot: unknown;
  changedBy: string;
  changeNote?: string;
}

/** Save a new config version and return the new version number. */
export async function saveConfigVersion(input: SaveConfigVersionInput): Promise<number> {
  // Get current max version for this scope
  const latest = await prisma.configVersion.findFirst({
    where: { guildId: input.guildId, scope: input.scope },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const nextVersion = (latest?.version ?? 0) + 1;

  await prisma.configVersion.create({
    data: {
      guildId: input.guildId,
      scope: input.scope,
      version: nextVersion,
      snapshot: input.snapshot as Prisma.InputJsonValue,
      changedBy: input.changedBy,
      changeNote: input.changeNote ?? null,
    },
  });

  return nextVersion;
}

/** Get config version history for a scope */
export async function getConfigVersions(
  guildId: string,
  scope: string,
  limit = 20,
) {
  return prisma.configVersion.findMany({
    where: { guildId, scope },
    orderBy: { version: 'desc' },
    take: limit,
  });
}
