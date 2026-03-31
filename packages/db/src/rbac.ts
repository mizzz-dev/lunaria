import { prisma } from './client.js';

/** Check if a user has a specific permission in a guild. */
export async function hasPermission(
  userId: string,
  guildId: string,
  permission: string,
): Promise<boolean> {
  // Find user's memberships in this guild
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId, userId } },
    select: { id: true },
  });
  if (!membership) return false;

  // Get all roles assigned to this member
  const assignments = await prisma.guildMemberRoleAssignment.findMany({
    where: { membershipId: membership.id },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  return assignments.some((a) =>
    a.role.permissions.some((rp) => rp.permission.key === permission),
  );
}

/** Get all permissions a user has in a guild. */
export async function getUserPermissions(
  userId: string,
  guildId: string,
): Promise<string[]> {
  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId, userId } },
    select: { id: true },
  });
  if (!membership) return [];

  const assignments = await prisma.guildMemberRoleAssignment.findMany({
    where: { membershipId: membership.id },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const perms = new Set<string>();
  for (const a of assignments) {
    for (const rp of a.role.permissions) {
      perms.add(rp.permission.key);
    }
  }
  return Array.from(perms);
}
