import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_ROLES = ['owner', 'admin', 'moderator', 'member'] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'guild.view', 'guild.manage', 'plugin.manage', 'plugin.view',
    'rule.manage', 'rule.view', 'quote.manage', 'quote.view',
    'poll.manage', 'poll.view', 'event.manage', 'event.view',
    'lfg.manage', 'lfg.view', 'team.manage', 'team.view',
    'faq.manage', 'faq.view', 'reminder.manage', 'reminder.view',
    'moderation.manage', 'moderation.view', 'audit.view',
    'analytics.view', 'rbac.manage', 'rbac.view',
    'daily_content.manage', 'auto_response.manage', 'config.rollback',
    'template.manage', 'consent.manage', 'game_link.manage',
    'external_server.manage', 'config.view',
  ],
  admin: [
    'guild.view', 'plugin.manage', 'plugin.view',
    'rule.manage', 'rule.view', 'quote.manage', 'quote.view',
    'poll.manage', 'poll.view', 'event.manage', 'event.view',
    'lfg.manage', 'lfg.view', 'team.manage', 'team.view',
    'faq.manage', 'faq.view', 'reminder.manage', 'reminder.view',
    'moderation.manage', 'moderation.view', 'audit.view',
    'analytics.view', 'rbac.view',
    'daily_content.manage', 'auto_response.manage', 'config.rollback',
    'template.manage', 'config.view',
  ],
  moderator: [
    'guild.view', 'plugin.view', 'rule.view',
    'quote.view', 'poll.view', 'event.view', 'lfg.view',
    'team.view', 'faq.view', 'reminder.view',
    'moderation.manage', 'moderation.view', 'audit.view',
    'analytics.view', 'config.view',
  ],
  member: [
    'guild.view', 'quote.view', 'poll.view', 'event.view',
    'lfg.view', 'team.view', 'faq.view', 'reminder.view',
  ],
};

const DEV_GUILD_DISCORD_ID = '000000000000000001';
const DEV_USER_DISCORD_ID = '000000000000000002';

async function main() {
  console.log('🌱 Seeding database...');

  // Create dev user
  const devUser = await prisma.user.upsert({
    where: { discordId: DEV_USER_DISCORD_ID },
    update: {},
    create: {
      discordId: DEV_USER_DISCORD_ID,
      username: 'dev_user',
      discriminator: '0',
    },
  });
  console.log(`  ✓ Dev user: ${devUser.id}`);

  // Create dev guild
  const devGuild = await prisma.guild.upsert({
    where: { discordId: DEV_GUILD_DISCORD_ID },
    update: {},
    create: {
      discordId: DEV_GUILD_DISCORD_ID,
      name: 'Dev Guild',
      ownerId: DEV_USER_DISCORD_ID,
      active: true,
    },
  });
  console.log(`  ✓ Dev guild: ${devGuild.id}`);

  // Create guild membership with owner role
  const membership = await prisma.guildMembership.upsert({
    where: { userId_guildId: { userId: devUser.id, guildId: devGuild.id } },
    update: {},
    create: {
      userId: devUser.id,
      guildId: devGuild.id,
      systemRole: 'owner',
      discordRoles: [],
    },
  });
  console.log(`  ✓ Membership: ${membership.id}`);

  // Create RBAC roles for dev guild
  for (const roleName of SYSTEM_ROLES) {
    const permissions = ROLE_PERMISSIONS[roleName] ?? [];
    await prisma.rbacRole.upsert({
      where: { guildId_name: { guildId: devGuild.id, name: roleName } },
      update: { permissions },
      create: {
        guildId: devGuild.id,
        name: roleName,
        isSystem: true,
        permissions,
        discordRoles: [],
      },
    });
  }
  console.log(`  ✓ RBAC roles (${SYSTEM_ROLES.length})`);

  // Seed plugin settings (all plugins disabled by default)
  const PLUGIN_KEYS = [
    'quote', 'poll', 'event', 'lfg', 'team_split', 'faq',
    'reminder', 'moderation', 'daily_content', 'auto_response',
    'analytics', 'template', 'hoyolink', 'voice_consent', 'external_server',
  ];

  for (const pluginKey of PLUGIN_KEYS) {
    await prisma.guildPluginSetting.upsert({
      where: { guildId_pluginKey: { guildId: devGuild.id, pluginKey } },
      update: {},
      create: {
        guildId: devGuild.id,
        pluginKey,
        enabled: false,
        config: {},
      },
    });
  }
  console.log(`  ✓ Plugin settings (${PLUGIN_KEYS.length})`);

  // Seed sample quotes
  const sampleQuotes = [
    { content: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { content: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
    { content: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  ];

  for (const q of sampleQuotes) {
    await prisma.quote.create({
      data: {
        guildId: devGuild.id,
        content: q.content,
        author: q.author,
        addedById: devUser.id,
        tags: [],
      },
    }).catch(() => { /* ignore duplicates */ });
  }
  console.log(`  ✓ Sample quotes (${sampleQuotes.length})`);

  // Seed sample FAQs
  const sampleFaqs = [
    { question: 'How do I use the bot?', answer: 'Use /help to see all available commands.', category: 'general', order: 1 },
    { question: 'How do I set a reminder?', answer: 'Use /remind <duration> <message> to set a reminder.', category: 'reminders', order: 2 },
    { question: 'How do I create a poll?', answer: 'Use /poll <question> <option1> <option2> to create a poll.', category: 'polls', order: 3 },
  ];

  for (const f of sampleFaqs) {
    await prisma.faqArticle.create({
      data: {
        guildId: devGuild.id,
        question: f.question,
        answer: f.answer,
        category: f.category,
        order: f.order,
      },
    }).catch(() => { /* ignore duplicates */ });
  }
  console.log(`  ✓ Sample FAQs (${sampleFaqs.length})`);

  // Seed sample auto-responses
  await prisma.autoResponse.create({
    data: {
      guildId: devGuild.id,
      trigger: '!ping',
      response: 'Pong! 🏓',
      matchType: 'exact',
      enabled: true,
    },
  }).catch(() => { /* ignore duplicates */ });
  console.log('  ✓ Sample auto-response');

  // Seed daily content job
  await prisma.dailyContentJob.create({
    data: {
      guildId: devGuild.id,
      contentType: 'quote',
      channelId: '000000000000000003',
      cronExpression: '0 9 * * *',
      enabled: false,
      tags: [],
    },
  }).catch(() => { /* ignore duplicates */ });
  console.log('  ✓ Sample daily content job');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
