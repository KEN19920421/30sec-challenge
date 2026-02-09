import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * Schema for follow/unfollow route parameter.
 */
export const followParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Schema for block/unblock route parameter.
 */
export const blockParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Schema for reporting a user.
 */
export const reportUserSchema = z.object({
  reason: z.enum(
    ['spam', 'harassment', 'inappropriate_content', 'impersonation', 'other'],
    { errorMap: () => ({ message: 'Invalid report reason' }) },
  ),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .trim()
    .optional(),
});

/**
 * Schema for reporting a submission.
 */
export const reportSubmissionSchema = z.object({
  reason: z.enum(
    ['spam', 'harassment', 'inappropriate_content', 'copyright', 'other'],
    { errorMap: () => ({ message: 'Invalid report reason' }) },
  ),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .trim()
    .optional(),
});

/**
 * Schema for route params that expect a submission ID.
 */
export const submissionParamsSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID'),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type FollowParams = z.infer<typeof followParamsSchema>;
export type BlockParams = z.infer<typeof blockParamsSchema>;
export type ReportUserInput = z.infer<typeof reportUserSchema>;
export type ReportSubmissionInput = z.infer<typeof reportSubmissionSchema>;
