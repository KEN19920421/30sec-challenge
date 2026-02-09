import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createChallengeSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters')
    .trim(),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category must be at most 100 characters')
    .trim(),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be "easy", "medium", or "hard"' }),
  }),
  starts_at: z
    .string()
    .datetime({ message: 'starts_at must be a valid ISO 8601 datetime' }),
  ends_at: z
    .string()
    .datetime({ message: 'ends_at must be a valid ISO 8601 datetime' }),
  voting_ends_at: z
    .string()
    .datetime({ message: 'voting_ends_at must be a valid ISO 8601 datetime' }),
  thumbnail_url: z
    .string()
    .url('thumbnail_url must be a valid URL')
    .optional(),
  is_premium_early_access: z
    .boolean()
    .default(false),
  early_access_hours: z
    .number()
    .int()
    .min(0)
    .max(72)
    .default(2),
}).refine(
  (data) => new Date(data.ends_at) > new Date(data.starts_at),
  { message: 'ends_at must be after starts_at', path: ['ends_at'] },
).refine(
  (data) => new Date(data.voting_ends_at) > new Date(data.ends_at),
  { message: 'voting_ends_at must be after ends_at', path: ['voting_ends_at'] },
);

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export const updateChallengeSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters')
    .trim()
    .optional(),
  category: z
    .string()
    .min(1)
    .max(100)
    .trim()
    .optional(),
  difficulty: z
    .enum(['easy', 'medium', 'hard'])
    .optional(),
  starts_at: z
    .string()
    .datetime()
    .optional(),
  ends_at: z
    .string()
    .datetime()
    .optional(),
  voting_ends_at: z
    .string()
    .datetime()
    .optional(),
  thumbnail_url: z
    .string()
    .url()
    .optional()
    .nullable(),
  is_premium_early_access: z
    .boolean()
    .optional(),
  early_access_hours: z
    .number()
    .int()
    .min(0)
    .max(72)
    .optional(),
  status: z
    .enum(['draft', 'scheduled', 'active', 'voting', 'completed', 'cancelled'])
    .optional(),
});

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------

export const challengeHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'starts_at', 'ends_at', 'title']).default('ends_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  category: z.string().optional(),
});

export const challengeResultsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const challengeIdParamSchema = z.object({
  id: z.string().uuid('Invalid challenge ID'),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type ChallengeHistoryQuery = z.infer<typeof challengeHistoryQuerySchema>;
export type ChallengeResultsQuery = z.infer<typeof challengeResultsQuerySchema>;
