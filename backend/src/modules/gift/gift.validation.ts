import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const sendGiftSchema = z.object({
  receiver_id: z.string().uuid('Invalid receiver ID'),
  submission_id: z.string().uuid('Invalid submission ID'),
  gift_id: z.string().uuid('Invalid gift ID'),
  message: z
    .string()
    .max(100, 'Message must be at most 100 characters')
    .optional(),
});

export const submissionGiftsParamsSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type SendGiftInput = z.infer<typeof sendGiftSchema>;
export type SubmissionGiftsParams = z.infer<typeof submissionGiftsParamsSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
