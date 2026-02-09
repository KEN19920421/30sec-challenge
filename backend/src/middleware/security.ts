import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';

/**
 * Helmet middleware configured with sensible production defaults.
 *
 * Cross-Origin-Embedder-Policy is disabled so that external assets
 * (video thumbnails, CDN resources) are not blocked.
 */
export const helmetMiddleware: RequestHandler = helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https:'],
      frameSrc: ["'none'"],
    },
  },
});

/**
 * Parses CORS_ORIGIN from the environment.
 *
 * Supports:
 *  - A single origin   ("https://example.com")
 *  - Multiple origins   ("https://a.com,https://b.com")
 *  - A wildcard         ("*")
 *  - Absent / empty     falls back to "*" in development, blocks all in production.
 */
function parseCorsOrigin(): cors.CorsOptions['origin'] {
  const raw = process.env.CORS_ORIGIN;

  if (!raw || raw.trim() === '') {
    return process.env.NODE_ENV === 'production' ? false : '*';
  }

  const trimmed = raw.trim();

  if (trimmed === '*') {
    return '*';
  }

  // Multiple origins separated by commas
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((o) => o.trim());
  }

  return trimmed;
}

/**
 * CORS middleware configured via the `CORS_ORIGIN` environment variable.
 */
export const corsMiddleware: RequestHandler = cors({
  origin: parseCorsOrigin(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-Requested-With',
  ],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24 hours
});
