import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const createCommentSchema = z.object({
  submission_id: z.string().uuid('Invalid submission ID'),
  content: z.string().min(1, 'Comment cannot be empty').max(500, 'Comment must be at most 500 characters'),
  parent_id: z.string().uuid('Invalid parent comment ID').optional(),
});

export const commentIdParamsSchema = z.object({
  id: z.string().uuid('Invalid comment ID'),
});

export const submissionCommentsParamsSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CommentIdParams = z.infer<typeof commentIdParamsSchema>;
export type SubmissionCommentsParams = z.infer<typeof submissionCommentsParamsSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
