import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const purchaseCoinsSchema = z.object({
  package_id: z.string().uuid('Invalid package ID'),
  platform: z.enum(['apple', 'google'], {
    errorMap: () => ({ message: 'Platform must be "apple" or "google"' }),
  }),
  receipt_data: z.string().min(1, 'Receipt data is required'),
});

export const transactionHistorySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type PurchaseCoinsInput = z.infer<typeof purchaseCoinsSchema>;
export type TransactionHistoryInput = z.infer<typeof transactionHistorySchema>;
