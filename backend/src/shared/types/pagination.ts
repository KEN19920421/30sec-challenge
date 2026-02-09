export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  /** Current page number (1-based). Defaults to 1. */
  page: number;
  /** Number of items per page. Defaults to 20. */
  limit: number;
  /** Column/field name to sort by. */
  sort_by?: string;
  /** Sort direction. Defaults to 'asc'. */
  sort_order?: SortOrder;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Default pagination values.
 */
export const PAGINATION_DEFAULTS: Required<Pick<PaginationParams, 'page' | 'limit' | 'sort_order'>> = {
  page: 1,
  limit: 20,
  sort_order: 'asc',
} as const;

/**
 * The maximum allowed page size to prevent abuse.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Normalizes raw query parameters into safe PaginationParams,
 * applying defaults and clamping values.
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
): PaginationParams {
  const page = Math.max(1, Number(query.page) || PAGINATION_DEFAULTS.page);
  const rawLimit = Number(query.limit) || PAGINATION_DEFAULTS.limit;
  const limit = Math.min(Math.max(1, rawLimit), MAX_PAGE_SIZE);

  const sort_by = typeof query.sort_by === 'string' ? query.sort_by : undefined;
  const sort_order: SortOrder =
    query.sort_order === 'desc' ? 'desc' : PAGINATION_DEFAULTS.sort_order;

  return { page, limit, sort_by, sort_order };
}

/**
 * Calculates the SQL/ORM offset from page and limit.
 */
export function paginationToOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

/**
 * Builds a PaginatedResult from a data array and total count.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    total_pages: Math.ceil(total / params.limit) || 1,
  };
}
