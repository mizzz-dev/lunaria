import { z } from 'zod';

export const EventCreateSchema = z.object({
  channelId: z.string().optional(),
  title: z.string().min(1).max(256),
  description: z.string().max(2000).optional(),
  location: z.string().max(256).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  maxParticipants: z.number().int().positive().optional(),
  visibility: z.enum(['public', 'role_restricted']).default('public'),
  allowedRoles: z.array(z.string()).default([]),
});

export const EventUpdateSchema = EventCreateSchema.partial();

export const EventIdParamSchema = z.object({
  guildId: z.string().min(1),
  eventId: z.string().min(1),
});

export const EventParticipantStatusSchema = z.object({
  status: z.enum(['going', 'maybe', 'declined']),
});
