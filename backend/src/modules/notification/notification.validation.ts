import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * Schema for the notification ID route parameter.
 */
export const notificationIdSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

/**
 * Schema for updating notification preferences.
 */
export const updatePreferencesSchema = z.object({
  follows: z.boolean().optional(),
  likes: z.boolean().optional(),
  comments: z.boolean().optional(),
  challenge_reminders: z.boolean().optional(),
  system: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
});

/**
 * Schema for registering a push device token.
 */
export const registerDeviceSchema = z.object({
  token: z
    .string()
    .min(1, 'Device token is required')
    .max(512, 'Device token is too long'),
  platform: z.enum(['ios', 'android', 'web'], {
    errorMap: () => ({ message: 'Platform must be "ios", "android", or "web"' }),
  }),
});

/**
 * Schema for unregistering a push device token.
 */
export const unregisterDeviceSchema = z.object({
  token: z
    .string()
    .min(1, 'Device token is required')
    .max(512, 'Device token is too long'),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type NotificationIdParams = z.infer<typeof notificationIdSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type UnregisterDeviceInput = z.infer<typeof unregisterDeviceSchema>;
