import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const verifyReceiptSchema = z.object({
  platform: z.enum(['apple', 'google'], {
    errorMap: () => ({ message: 'Platform must be "apple" or "google"' }),
  }),
  receipt_data: z.string().min(1, 'Receipt data is required'),
});

export const restoreSchema = z.object({
  platform: z.enum(['apple', 'google'], {
    errorMap: () => ({ message: 'Platform must be "apple" or "google"' }),
  }),
  receipt_data: z.string().min(1, 'Receipt data is required'),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type VerifyReceiptInput = z.infer<typeof verifyReceiptSchema>;
export type RestoreInput = z.infer<typeof restoreSchema>;
