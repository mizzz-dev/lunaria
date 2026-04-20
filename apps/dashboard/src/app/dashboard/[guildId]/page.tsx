import { DashboardTopEditor } from '../../../components/DashboardTopEditor';
import { api } from '../../../lib/api';

type LayoutState = { order: string[]; hidden: string[]; updatedAt: string };

export default async function GuildOverviewPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let data: { memberCount: number; enabledPlugins: number; ruleCount: number; recentAuditLogs: unknown[] } | null = null;
  let layout: LayoutState = { order: ['members', 'plugins', 'rules', 'audit'], hidden: [], updatedAt: new Date(0).toISOString() };
  let widgets: string[] = ['members', 'plugins', 'rules', 'audit'];

  try {
    data = await api.getDashboard(guildId);
    layout = await api.getDashboardLayout(guildId);
    const widgetData = await api.getDashboardWidgets(guildId);
    widgets = widgetData.widgets.map((w) => w.key);
  } catch {
    // empty states
  }

  return <DashboardTopEditor guildId={guildId} initialData={data} initialLayout={layout} visibleWidgets={widgets} />;
}
