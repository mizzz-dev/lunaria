import { z } from 'zod';

export const FaqCreateSchema = z.object({
  title: z.string().min(1).max(256),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string().max(50)).max(10).default([]),
  status: z.enum(['published', 'draft', 'archived']).default('published'),
});

export const FaqUpdateSchema = FaqCreateSchema.partial();

export const FaqIdParamSchema = z.object({
  guildId: z.string().min(1),
  faqId: z.string().min(1),
});

export const FaqFeedbackSchema = z.object({
  rating: z.enum(['helpful', 'not_helpful']),
  comment: z.string().max(500).optional(),
});
