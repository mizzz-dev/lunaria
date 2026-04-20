export { prisma } from './client.js';
export { createAuditLog } from './audit.js';
export type { CreateAuditLogInput } from './audit.js';
export { saveConfigVersion, getConfigVersions } from './config-version.js';
export type { SaveConfigVersionInput } from './config-version.js';
export { hasPermission, getUserPermissions } from './rbac.js';

export type { Prisma } from '@prisma/client';
