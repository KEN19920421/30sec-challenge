import { z } from 'zod';

// ---------------------------------------------------------------------------
// Initiate upload
// ---------------------------------------------------------------------------

export const initiateUploadSchema = z.object({
  challenge_id: z.string().uuid('Invalid challenge ID'),
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename is too long')
    .trim(),
  content_type: z.enum(
    ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
    {
      errorMap: () => ({
        message:
          'Unsupported content type. Allowed: video/mp4, video/quicktime, video/webm, video/x-msvideo',
      }),
    },
  ),
  file_size: z
    .number()
    .int()
    .min(1, 'File size must be positive')
    .max(500 * 1024 * 1024, 'File size cannot exceed 500 MB'),
  caption: z
    .string()
    .max(500, 'Caption must be at most 500 characters')
    .trim()
    .optional(),
});

// ---------------------------------------------------------------------------
// Complete upload
// ---------------------------------------------------------------------------

export const completeUploadParamSchema = z.object({
  id: z.string().uuid('Invalid submission ID'),
});

// ---------------------------------------------------------------------------
// Get by ID
// ---------------------------------------------------------------------------

export const submissionIdParamSchema = z.object({
  id: z.string().uuid('Invalid submission ID'),
});

// ---------------------------------------------------------------------------
// Get by challenge
// ---------------------------------------------------------------------------

export const byChallengeParamSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID'),
});

// ---------------------------------------------------------------------------
// Get by user
// ---------------------------------------------------------------------------

export const byUserParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// ---------------------------------------------------------------------------
// Pagination (reusable for list endpoints)
// ---------------------------------------------------------------------------

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z
    .enum(['created_at', 'vote_count', 'view_count'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type InitiateUploadInput = z.infer<typeof initiateUploadSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
