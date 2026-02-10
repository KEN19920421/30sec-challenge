import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const purchaseBoostSchema = z.object({
  submission_id: z.string().uuid('Invalid submission ID'),
  tier: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: 'Tier must be small, medium, or large' }),
  }),
});

export const submissionBoostsParamsSchema = z.object({
  submissionId: z.string().uuid('Invalid submission ID'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type PurchaseBoostInput = z.infer<typeof purchaseBoostSchema>;
export type SubmissionBoostsParams = z.infer<typeof submissionBoostsParamsSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
