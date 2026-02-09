import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError, type FieldError } from '../shared/errors';

/**
 * The part of the request that should be validated.
 */
export type ValidationSource = 'body' | 'query' | 'params';

/**
 * Returns Express middleware that validates the specified part of the
 * incoming request against the provided Zod schema.
 *
 * On success the validated (and potentially transformed) data is written
 * back to `req[source]`, so downstream handlers always receive clean data.
 *
 * On failure a `ValidationError` is thrown, which will be caught by the
 * global error handler.
 *
 * @param schema  A Zod schema to validate against.
 * @param source  Which part of the request to validate (`'body'` by default).
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { validate } from '../middleware/validator';
 *
 * const CreatePostSchema = z.object({
 *   title: z.string().min(1).max(200),
 *   description: z.string().optional(),
 * });
 *
 * router.post('/posts', validate(CreatePostSchema), postController.create);
 * ```
 */
export function validate(
  schema: ZodSchema,
  source: ValidationSource = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (result.success) {
      // Overwrite with parsed / transformed data
      (req as unknown as Record<string, unknown>)[source] = result.data;
      next();
      return;
    }

    const fieldErrors: FieldError[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    next(new ValidationError('Validation failed', fieldErrors));
  };
}
