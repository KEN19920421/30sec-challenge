import path from 'path';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import compression from 'compression';

import { morganStream, db, redis } from './config';
import {
  requestId,
  helmetMiddleware,
  corsMiddleware,
  defaultLimiter,
  authLimiter,
  uploadLimiter,
  commentLimiter,
  reportBlockLimiter,
  strictVoteLimiter,
  adminLimiter,
  coinPurchaseLimiter,
  errorHandler,
} from './middleware';
import { sentryErrorHandler } from './middleware/sentry-error-handler';
import { requestTimeout } from './middleware/request-timeout';
import { apiVersionHeader } from './middleware/api-version';
import { successResponse } from './shared/types/api-response';

// Route modules
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import socialRoutes from './modules/social/social.routes';
import challengeRoutes from './modules/challenge/challenge.routes';
import submissionRoutes from './modules/submission/submission.routes';
import votingRoutes from './modules/voting/voting.routes';
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes';
import leagueRoutes from './modules/league/league.routes';
import notificationRoutes from './modules/notification/notification.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import coinRoutes from './modules/coin/coin.routes';
import giftRoutes from './modules/gift/gift.routes';
import adRoutes from './modules/ad/ad.routes';
import adminRoutes from './modules/admin/admin.routes';
import shareRoutes from './modules/share/share.routes';
import { assetLinks } from './modules/share/assetlinks';
import { appleAppSiteAssociation } from './modules/share/apple-app-site-association';
import feedRoutes from './modules/feed/feed.routes';
import boostRoutes from './modules/boost/boost.routes';
import searchRoutes from './modules/search/search.routes';
import commentRoutes from './modules/comment/comment.routes';
import appConfigRoutes from './modules/app-config/app-config.routes';
import errorLogRoutes from './modules/error-log/error-log.routes';

// ---------------------------------------------------------------------------
// Create Express application
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Global middleware (order matters)
// ---------------------------------------------------------------------------

// Assign a unique request ID to every incoming request
app.use(requestId);

// API version response header
app.use(apiVersionHeader);

// Request timeout (408 if a response is not sent within 30 s)
app.use(requestTimeout());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP response compression
app.use(compression());

// Security headers & CORS
app.use(helmetMiddleware);
app.use(corsMiddleware);

// HTTP request logging via Morgan -> Winston
app.use(
  morgan('short', {
    stream: morganStream,
    skip: (_req, _res) => {
      // Skip health-check noise in production
      return process.env.NODE_ENV === 'production' && _req.url === '/api/health';
    },
  }),
);

// Default rate limiter (applies to all routes unless overridden)
app.use(defaultLimiter);

// ---------------------------------------------------------------------------
// Static legal pages (privacy policy, terms of service)
// ---------------------------------------------------------------------------
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Friendly named routes for App Store / Play Store submission URLs
app.get('/privacy', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});
app.get('/privacy-ja', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'privacy-ja.html'));
});
app.get('/terms', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'terms.html'));
});
app.get('/terms-ja', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'terms-ja.html'));
});

// ---------------------------------------------------------------------------
// Well-known routes for deep linking verification
// ---------------------------------------------------------------------------
app.get('/.well-known/assetlinks.json', assetLinks);
app.get('/.well-known/apple-app-site-association', appleAppSiteAssociation);

// ---------------------------------------------------------------------------
// Health check (outside /api/v1 -- always available)
// ---------------------------------------------------------------------------
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await db.raw('SELECT 1');
    await redis.ping();

    res.status(200).json(
      successResponse(
        { status: 'ok', timestamp: new Date().toISOString() },
        'Service is healthy',
      ),
    );
  } catch (_err) {
    res.status(503).json({
      success: false,
      data: null,
      message: 'Service unavailable',
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
  }
});

app.get('/api/health/detailed', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  let dbStatus: 'ok' | 'error' = 'ok';
  let redisStatus: 'ok' | 'error' = 'ok';
  let dbError: string | undefined;
  let redisError: string | undefined;

  try {
    await db.raw('SELECT 1');
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : String(err);
  }

  try {
    await redis.ping();
  } catch (err) {
    redisStatus = 'error';
    redisError = err instanceof Error ? err.message : String(err);
  }

  const allHealthy = dbStatus === 'ok' && redisStatus === 'ok';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: allHealthy,
    data: {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp,
      dependencies: {
        database: {
          status: dbStatus,
          ...(dbError ? { error: dbError } : {}),
        },
        redis: {
          status: redisStatus,
          ...(redisError ? { error: redisError } : {}),
        },
      },
    },
    message: allHealthy ? 'All systems operational' : 'One or more dependencies are unavailable',
  });
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------
const v1 = '/api/v1';

app.use(`${v1}/auth`, authLimiter, authRoutes);
app.use(`${v1}/users`, userRoutes);
// reportBlockLimiter applied to social routes (follow/unfollow/block/report)
app.use(`${v1}/social`, reportBlockLimiter, socialRoutes);
app.use(`${v1}/challenges`, challengeRoutes);
app.use(`${v1}/submissions`, uploadLimiter, submissionRoutes);
// strictVoteLimiter: 30 req/15min (tighter than legacy voteLimiter of 300)
app.use(`${v1}/voting`, strictVoteLimiter, votingRoutes);
app.use(`${v1}/leaderboards`, leaderboardRoutes);
app.use(`${v1}/leagues`, defaultLimiter, leagueRoutes);
app.use(`${v1}/notifications`, notificationRoutes);
app.use(`${v1}/subscriptions`, subscriptionRoutes);
// coinPurchaseLimiter: 10 req/15min — prevents card testing attacks
app.use(`${v1}/coins`, coinPurchaseLimiter, coinRoutes);
app.use(`${v1}/gifts`, giftRoutes);
app.use(`${v1}/ads`, adRoutes);
// adminLimiter: 20 req/15min for admin endpoints
app.use(`${v1}/admin`, adminLimiter, adminRoutes);
app.use(`${v1}/share`, shareRoutes);
app.use(`${v1}/feed`, feedRoutes);
app.use(`${v1}/boosts`, boostRoutes);
// commentLimiter: 20 req/15min to prevent comment spam
app.use(`${v1}/comments`, commentLimiter, commentRoutes);
app.use(`${v1}/app`, appConfigRoutes);
app.use(`${v1}/errors`, authLimiter, errorLogRoutes);
app.use(`${v1}/search`, searchRoutes);

// ---------------------------------------------------------------------------
// 404 handler -- must come after all route registrations
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `Cannot ${_req.method} ${_req.originalUrl}`,
    error: { code: 'NOT_FOUND' },
  });
});

// ---------------------------------------------------------------------------
// Sentry error handler -- must come BEFORE the app error handler
// ---------------------------------------------------------------------------
// Captures 5xx errors and sends them to Sentry with user context.
app.use(sentryErrorHandler);

// ---------------------------------------------------------------------------
// Global error handler -- must be the very last middleware
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
