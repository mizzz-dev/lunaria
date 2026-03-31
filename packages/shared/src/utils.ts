// =============================================
// Shared utility functions
// =============================================

import type { ApiOk, ApiError, PaginatedResult, PaginationQuery } from '@lunaria/types';

/** Wrap data in a standard API success envelope */
export function ok<T>(data: T): ApiOk<T> {
  return { success: true, data };
}

/** Wrap error in a standard API error envelope */
export function err(code: string, message: string, details?: unknown): ApiError {
  return { success: false, error: { code, message, details } };
}

/** Build a paginated result wrapper */
export function paginate<T>(
  items: T[],
  total: number,
  query: PaginationQuery,
): PaginatedResult<T> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

/** Sanitize pagination query params to safe numbers */
export function parsePagination(query: { page?: unknown; pageSize?: unknown }): Required<PaginationQuery> {
  const page = Number(query.page ?? 1);
  const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
  return {
    page: isNaN(page) || page < 1 ? 1 : page,
    pageSize: isNaN(pageSize) || pageSize < 1 ? 20 : pageSize,
  };
}

/** Format a Discord avatar URL */
export function discordAvatarUrl(userId: string, avatarHash: string | null, size = 128): string {
  if (!avatarHash) {
    const index = (BigInt(userId) >> BigInt(22)) % BigInt(6);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}

/** Format a Discord guild icon URL */
export function discordGuildIconUrl(
  guildId: string,
  iconHash: string | null,
  size = 128,
): string | null {
  if (!iconHash) return null;
  const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}

/** Safe JSON parse with fallback */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/** Sleep utility for retries */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a deterministic scope string for config versioning */
export function configScope(type: string, id?: string): string {
  return id ? `${type}:${id}` : type;
}

/** Check if a Discord member has ADMINISTRATOR permission */
export function hasAdminPermission(permissionsBitfield: string): boolean {
  return (BigInt(permissionsBitfield) & BigInt('8')) === BigInt('8');
}

/** Check if a Discord member has MANAGE_GUILD permission */
export function hasManageGuildPermission(permissionsBitfield: string): boolean {
  const bit = BigInt(permissionsBitfield);
  return (bit & BigInt('8')) === BigInt('8') || (bit & BigInt('32')) === BigInt('32');
}

/** Simple shuffle (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
