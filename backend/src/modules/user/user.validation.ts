import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * Schema for updating a user profile.
 */
export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name must be at least 1 character')
    .max(50, 'Display name must be at most 50 characters')
    .trim()
    .optional(),
  bio: z
    .string()
    .max(300, 'Bio must be at most 300 characters')
    .trim()
    .optional(),
  avatar_url: z
    .string()
    .url('Avatar URL must be a valid URL')
    .optional(),
});

/**
 * Schema for the search query string parameter.
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .max(100, 'Search query must be at most 100 characters')
    .trim(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
