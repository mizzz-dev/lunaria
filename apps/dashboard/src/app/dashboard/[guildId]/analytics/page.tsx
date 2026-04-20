import { api } from '../../../../lib/api';
import { AnalyticsLive } from '../../../../components/analytics/AnalyticsLive';

interface Summary { memberCount: number; messageCount: number; moderationCount: number; pollCount: number; eventCount: number; lfgCount: number }

export default async function AnalyticsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let summary: Summary | null = null;
  try { summary = await api.getAnalyticsSummary(guildId) as Summary; } catch { /* empty */ }
  return <AnalyticsLive guildId={guildId} initialSummary={summary} />;
}
