import { z } from 'zod';

export const QuoteCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  author: z.string().min(1).max(100),
  authorId: z.string().optional(),
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  attachments: z.array(z.string().url()).default([]),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

export const QuoteUpdateSchema = QuoteCreateSchema.partial();

export const QuoteReportSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const QuoteIdParamSchema = z.object({
  guildId: z.string().min(1),
  quoteId: z.string().min(1),
});
