import rateLimit from 'express-rate-limit';

/**
 * Shared configuration for the standardised response body returned
 * when a client exceeds the rate limit.
 */
const standardHeaders = true; // Return rate-limit info in `RateLimit-*` headers
const legacyHeaders = false; // Disable the `X-RateLimit-*` headers

/** Skip rate limiting entirely when RATE_LIMIT_DISABLED is set (E2E tests). */
const skipAll = process.env.RATE_LIMIT_DISABLED === 'true'
  ? () => true
  : undefined;

/**
 * Default rate limiter for general API endpoints.
 *
 * 100 requests per 15-minute window.
 */
export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders,
  legacyHeaders,
  skip: skipAll,
  message: {
    success: false,
    data: null,
    message: 'Too many requests, please try again later',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

/**
 * Stricter rate limiter for authentication endpoints (login, register, etc.).
 *
 * 20 requests per 15-minute window.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders,
  legacyHeaders,
  skip: skipAll,
  message: {
    success: false,
    data: null,
    message: 'Too many authentication attempts, please try again later',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

/**
 * Rate limiter for file/video upload endpoints.
 *
 * 10 requests per 15-minute window.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders,
  legacyHeaders,
  skip: skipAll,
  message: {
    success: false,
    data: null,
    message: 'Too many uploads, please try again later',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

/**
 * Rate limiter for vote/like endpoints (higher throughput, still bounded).
 *
 * 300 requests per 15-minute window.
 */
export const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders,
  legacyHeaders,
  skip: skipAll,
  message: {
    success: false,
    data: null,
    message: 'Too many votes, please try again later',
    error: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});
