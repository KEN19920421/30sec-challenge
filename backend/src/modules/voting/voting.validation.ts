import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * Validates the body of a cast-vote request.
 */
export const castVoteSchema = z.object({
  submission_id: z.string().uuid('submission_id must be a valid UUID'),
  value: z
    .union([z.literal(1), z.literal(-1)], {
      errorMap: () => ({ message: 'value must be 1 or -1' }),
    }),
  is_super_vote: z.boolean().optional().default(false),
  source: z
    .enum(['organic', 'rewarded_ad'], {
      errorMap: () => ({ message: 'source must be "organic" or "rewarded_ad"' }),
    })
    .optional()
    .default('organic'),
});

/**
 * Validates query parameters for fetching the vote queue.
 */
export const getQueueSchema = z.object({
  challenge_id: z.string().uuid('challenge_id must be a valid UUID'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CastVoteInput = z.infer<typeof castVoteSchema>;
export type GetQueueInput = z.infer<typeof getQueueSchema>;
