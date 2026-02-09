import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors';
import { errorResponse } from '../shared/types/api-response';
import { logger } from '../config/logger';

/**
 * Converts Zod validation issues into a flat array of field errors
 * consistent with the project's `FieldError` shape.
 */
function formatZodErrors(error: ZodError): Array<{
  field: string;
  message: string;
  value?: unknown;
}> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Global Express error-handling middleware.
 *
 * Must be registered **after** all routes. It handles:
 *
 * 1. `AppError` (and its subclasses) -- returns the error's own status and code.
 * 2. `ZodError`                       -- returns 400 with field-level details.
 * 3. Unexpected / unknown errors      -- returns 500, logs the full error.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ------- AppError (operational) -------
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational AppError', {
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
        code: err.code,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn('Operational error', {
        requestId: req.requestId,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
      });
    }

    const body = errorResponse(err.message, err.code, err.toJSON().fieldErrors);

    res.status(err.statusCode).json(body);
    return;
  }

  // ------- Zod validation errors -------
  if (err instanceof ZodError) {
    const details = formatZodErrors(err);

    logger.warn('Zod validation error', {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      issues: details,
    });

    res.status(400).json(
      errorResponse('Validation failed', 'VALIDATION_ERROR', details),
    );
    return;
  }

  // ------- Unexpected / programmer errors -------
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    name: err.name,
    path: req.path,
    method: req.method,
  });

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  res.status(500).json(errorResponse(message, 'INTERNAL_ERROR'));
}
