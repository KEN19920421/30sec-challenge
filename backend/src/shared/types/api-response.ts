import type { PaginatedResult } from './pagination';

/**
 * Standard envelope for every API response.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message?: string;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

/**
 * Creates a successful API response.
 */
export function successResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>,
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message !== undefined && { message }),
    ...(meta !== undefined && { meta }),
  };
}

/**
 * Creates an error API response.
 */
export function errorResponse(
  message: string,
  code: string = 'INTERNAL_ERROR',
  details?: unknown,
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    error: {
      code,
      ...(details !== undefined && { details }),
    },
  };
}

/**
 * Creates a successful API response that includes pagination metadata.
 */
export function paginatedResponse<T>(
  result: PaginatedResult<T>,
  message?: string,
): ApiResponse<T[]> {
  return {
    success: true,
    data: result.data,
    ...(message !== undefined && { message }),
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      total_pages: result.total_pages,
    },
  };
}
