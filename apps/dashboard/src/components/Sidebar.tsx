'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '', label: 'Overview', icon: '🏠' },
  { href: '/plugins', label: 'Plugins', icon: '🧩' },
  { href: '/rules', label: 'Rules', icon: '⚡' },
  { href: '/auto-responses', label: 'Auto Responses', icon: '💬' },
  { href: '/daily-content', label: 'Daily Content', icon: '📅' },
  { href: '/quotes', label: 'Quotes', icon: '💬' },
  { href: '/polls', label: 'Polls', icon: '📊' },
  { href: '/events', label: 'Events', icon: '🗓' },
  { href: '/lfg', label: 'LFG', icon: '🎮' },
  { href: '/team-splits', label: 'Teams', icon: '⚔️' },
  { href: '/faqs', label: 'FAQ', icon: '📚' },
  { href: '/reminders', label: 'Reminders', icon: '⏰' },
  { href: '/moderation', label: 'Moderation', icon: '🛡' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/audit-logs', label: 'Audit Logs', icon: '📋' },
  { href: '/config-versions', label: 'Config History', icon: '🕐' },
  { href: '/rbac', label: 'Roles & Perms', icon: '🔑' },
];

interface SidebarProps { guildId: string; guildName?: string }

export function Sidebar({ guildId, guildName }: SidebarProps) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <span className="text-xl">🌙</span>
        <span className="text-sm font-semibold text-zinc-100 truncate">{guildName ?? 'Lunaria'}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const href = `${base}${item.href}`;
          const active = item.href === '' ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-zinc-800 p-3">
        <Link href="/dashboard" className="block rounded-md px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300">
          ← All Servers
        </Link>
      </div>
    </nav>
  );
}
