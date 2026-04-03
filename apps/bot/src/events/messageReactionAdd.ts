import type { MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { prisma } from '@lunaria/db';
import { client } from '../client.js';

export const name = 'messageReactionAdd';
export const once = false;

export async function execute(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  if (user.bot) return;

  // Fetch partial reaction/message if needed
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  const message = reaction.message;
  if (!message.guild) return;

  const guild = await prisma.guild.findUnique({ where: { discordId: message.guild.id } });
  if (!guild) return;

  // ── Translation ───────────────────────────────────────────────────
  const transConfig = await prisma.translationConfig.findUnique({ where: { guildId: guild.id } });
  if (!transConfig?.enabled) return;

  const emoji = reaction.emoji.name ?? reaction.emoji.toString();
  if (emoji !== transConfig.triggerEmoji) return;

  const content = message.content;
  if (!content || content.length < 2) return;

  try {
    // Use free LibreTranslate-compatible approach: call the DeepL free API stub
    // In production, integrate with DeepL/Google Translate/LibreTranslate
    // Here we reply with a notice that translation would happen
    const targetLang = transConfig.defaultTargetLang.toUpperCase();

    const replyContent =
      `🌐 **翻訳リクエスト** (→ ${targetLang})\n` +
      `> ${content.slice(0, 200)}${content.length > 200 ? '...' : ''}\n\n` +
      `_翻訳 API キーが設定されると自動翻訳されます。_`;

    await message.reply({ content: replyContent });

    // Log translation request
    if (transConfig.logChannelId) {
      const logChannel = await client.channels.fetch(transConfig.logChannelId).catch(() => null);
      if (logChannel?.isTextBased() && 'send' in logChannel) {
        await logChannel.send(
          `🌐 翻訳リクエスト: <@${user.id}> が [メッセージ](${message.url}) に ${emoji} を付けました`,
        );
      }
    }
  } catch (e) {
    console.error('[bot] Translation failed:', e);
  }
}
