import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple'], {
    errorMap: () => ({ message: 'Provider must be "google" or "apple"' }),
  }),
  id_token: z.string().min(1, 'ID token is required'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refresh_token: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type SocialLoginInput = z.infer<typeof socialLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
