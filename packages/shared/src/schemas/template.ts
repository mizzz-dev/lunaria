import { z } from 'zod';

export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['rule', 'auto_response', 'poll', 'event', 'faq', 'moderation']),
  body: z.record(z.unknown()),
  tags: z.array(z.string().max(50)).max(10).default([]),
  visibility: z.enum(['official', 'community', 'private']).default('private'),
});

export const TemplateIdParamSchema = z.object({
  guildId: z.string().min(1),
  templateId: z.string().min(1),
});
