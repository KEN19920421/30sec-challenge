import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const logAdEventSchema = z.object({
  ad_type: z.enum(['interstitial', 'rewarded', 'banner', 'native'], {
    errorMap: () => ({ message: 'Invalid ad type' }),
  }),
  placement: z.string().min(1, 'Placement is required').max(50),
  event_type: z.enum(['impression', 'click', 'completed', 'reward_granted', 'failed'], {
    errorMap: () => ({ message: 'Invalid event type' }),
  }),
  reward_type: z.string().max(50).optional(),
  reward_amount: z.number().int().min(0).optional(),
});

export const claimRewardSchema = z.object({
  ad_type: z.enum(['interstitial', 'rewarded', 'banner', 'native'], {
    errorMap: () => ({ message: 'Invalid ad type' }),
  }),
  placement: z.string().min(1, 'Placement is required').max(50),
});

export const rewardCallbackSchema = z.object({
  ad_network: z.string().optional(),
  ad_unit: z.string().optional(),
  reward_type: z.string().optional(),
  reward_amount: z.string().optional(),
  user_id: z.string().optional(),
  custom_data: z.string().optional(),
  signature: z.string().optional(),
  key_id: z.string().optional(),
  transaction_id: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type LogAdEventInput = z.infer<typeof logAdEventSchema>;
export type ClaimRewardInput = z.infer<typeof claimRewardSchema>;
export type RewardCallbackInput = z.infer<typeof rewardCallbackSchema>;
