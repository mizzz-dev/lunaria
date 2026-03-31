// =============================================
// Dashboard API Client
// =============================================

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const json = await res.json() as { success: boolean; data?: T; error?: { code: string; message: string } };

  if (!json.success || !res.ok) {
    throw new ApiError(json.error?.code ?? 'UNKNOWN', json.error?.message ?? 'Unknown error', res.status);
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // Auth
  getMe: () => api.get<{ id: string; discordId: string; username: string; avatar: string | null }>('/auth/me'),
  getGuilds: () => api.get<Array<{ id: string; name: string; icon: string | null; botPresent: boolean }>>('/auth/guilds'),

  // Guild
  getGuild: (guildId: string) => api.get<{ id: string; name: string; icon: string | null }>(`/guilds/${guildId}`),
  getDashboard: (guildId: string) => api.get<{ memberCount: number; enabledPlugins: number; ruleCount: number; recentAuditLogs: unknown[] }>(`/guilds/${guildId}/dashboard`),
  getSettings: (guildId: string) => api.get(`/guilds/${guildId}/settings`),
  updateSettings: (guildId: string, body: unknown) => api.patch(`/guilds/${guildId}/settings`, body),

  // Plugins
  getPlugins: (guildId: string) => api.get<Array<{ pluginKey: string; name: string; description: string; enabled: boolean; billingTier: string; isStub: boolean }>>(`/guilds/${guildId}/plugins`),
  getPlugin: (guildId: string, pluginKey: string) => api.get(`/guilds/${guildId}/plugins/${pluginKey}`),
  updatePlugin: (guildId: string, pluginKey: string, config: unknown) => api.patch(`/guilds/${guildId}/plugins/${pluginKey}`, { config }),
  enablePlugin: (guildId: string, pluginKey: string) => api.post(`/guilds/${guildId}/plugins/${pluginKey}/enable`),
  disablePlugin: (guildId: string, pluginKey: string) => api.post(`/guilds/${guildId}/plugins/${pluginKey}/disable`),

  // Rules
  getRules: (guildId: string) => api.get(`/guilds/${guildId}/rules`),
  getRule: (guildId: string, ruleId: string) => api.get(`/guilds/${guildId}/rules/${ruleId}`),
  createRule: (guildId: string, body: unknown) => api.post(`/guilds/${guildId}/rules`, body),
  updateRule: (guildId: string, ruleId: string, body: unknown) => api.patch(`/guilds/${guildId}/rules/${ruleId}`, body),
  deleteRule: (guildId: string, ruleId: string) => api.delete(`/guilds/${guildId}/rules/${ruleId}`),
  testRule: (guildId: string, ruleId: string, context: unknown) => api.post(`/guilds/${guildId}/rules/${ruleId}/test`, { context }),

  // Quotes
  getQuotes: (guildId: string, params?: string) => api.get(`/guilds/${guildId}/quotes${params ? `?${params}` : ''}`),
  createQuote: (guildId: string, body: unknown) => api.post(`/guilds/${guildId}/quotes`, body),
  deleteQuote: (guildId: string, quoteId: string) => api.delete(`/guilds/${guildId}/quotes/${quoteId}`),

  // Polls
  getPolls: (guildId: string) => api.get(`/guilds/${guildId}/polls`),
  closePoll: (guildId: string, pollId: string) => api.post(`/guilds/${guildId}/polls/${pollId}/close`),

  // Events
  getEvents: (guildId: string) => api.get(`/guilds/${guildId}/events`),
  cancelEvent: (guildId: string, eventId: string) => api.post(`/guilds/${guildId}/events/${eventId}/cancel`),

  // LFG
  getLfg: (guildId: string) => api.get(`/guilds/${guildId}/lfg`),

  // Team splits
  getTeamSplits: (guildId: string) => api.get(`/guilds/${guildId}/team-splits`),

  // FAQ
  getFaqs: (guildId: string, q?: string) => api.get(`/guilds/${guildId}/faqs${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createFaq: (guildId: string, body: unknown) => api.post(`/guilds/${guildId}/faqs`, body),
  updateFaq: (guildId: string, faqId: string, body: unknown) => api.patch(`/guilds/${guildId}/faqs/${faqId}`, body),
  deleteFaq: (guildId: string, faqId: string) => api.delete(`/guilds/${guildId}/faqs/${faqId}`),

  // Reminders
  getReminders: (guildId: string) => api.get(`/guilds/${guildId}/reminders`),

  // Auto responses
  getAutoResponses: (guildId: string) => api.get(`/guilds/${guildId}/auto-responses`),
  createAutoResponse: (guildId: string, body: unknown) => api.post(`/guilds/${guildId}/auto-responses`, body),
  deleteAutoResponse: (guildId: string, id: string) => api.delete(`/guilds/${guildId}/auto-responses/${id}`),

  // Daily content
  getDailyContentJobs: (guildId: string) => api.get(`/guilds/${guildId}/daily-content/jobs`),
  getDailyContentRuns: (guildId: string) => api.get(`/guilds/${guildId}/daily-content/runs`),

  // Moderation
  getModerationRules: (guildId: string) => api.get(`/guilds/${guildId}/moderation/rules`),
  getModerationActions: (guildId: string) => api.get(`/guilds/${guildId}/moderation/actions`),

  // Audit logs
  getAuditLogs: (guildId: string, params?: string) => api.get(`/guilds/${guildId}/audit-logs${params ? `?${params}` : ''}`),

  // Config versions
  getConfigVersions: (guildId: string, scope?: string) => api.get(`/guilds/${guildId}/config-versions${scope ? `?scope=${encodeURIComponent(scope)}` : ''}`),
  rollbackConfigVersion: (guildId: string, versionId: string) => api.post(`/guilds/${guildId}/config-versions/${versionId}/rollback`),

  // Analytics
  getAnalyticsSummary: (guildId: string) => api.get(`/guilds/${guildId}/analytics/summary`),
  getAnalyticsDaily: (guildId: string) => api.get(`/guilds/${guildId}/analytics/daily`),

  // Memberships / RBAC
  getRoles: (guildId: string) => api.get(`/guilds/${guildId}/roles`),
  getMemberships: (guildId: string) => api.get(`/guilds/${guildId}/memberships`),
  getRoleOverrides: (guildId: string) => api.get(`/guilds/${guildId}/roles`),
  getGuildMembers: (guildId: string) => api.get(`/guilds/${guildId}/memberships`),
};
