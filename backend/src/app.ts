import express, { Request, Response } from 'express';
import morgan from 'morgan';

import { morganStream } from './config';
import {
  requestId,
  helmetMiddleware,
  corsMiddleware,
  defaultLimiter,
  authLimiter,
  errorHandler,
} from './middleware';
import { successResponse } from './shared/types/api-response';

// Route modules
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import socialRoutes from './modules/social/social.routes';
import challengeRoutes from './modules/challenge/challenge.routes';
import submissionRoutes from './modules/submission/submission.routes';
import votingRoutes from './modules/voting/voting.routes';
import leaderboardRoutes from './modules/leaderboard/leaderboard.routes';
import notificationRoutes from './modules/notification/notification.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import coinRoutes from './modules/coin/coin.routes';
import giftRoutes from './modules/gift/gift.routes';
import adRoutes from './modules/ad/ad.routes';
import adminRoutes from './modules/admin/admin.routes';
import shareRoutes from './modules/share/share.routes';
import feedRoutes from './modules/feed/feed.routes';
import boostRoutes from './modules/boost/boost.routes';

// ---------------------------------------------------------------------------
// Create Express application
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Global middleware (order matters)
// ---------------------------------------------------------------------------

// Assign a unique request ID to every incoming request
app.use(requestId);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
// Health check (outside /api/v1 -- always available)
// ---------------------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json(
    successResponse(
      { status: 'ok', timestamp: new Date().toISOString() },
      'Service is healthy',
    ),
  );
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------
const v1 = '/api/v1';

app.use(`${v1}/auth`, authLimiter, authRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/social`, socialRoutes);
app.use(`${v1}/challenges`, challengeRoutes);
app.use(`${v1}/submissions`, submissionRoutes);
app.use(`${v1}/voting`, votingRoutes);
app.use(`${v1}/leaderboards`, leaderboardRoutes);
app.use(`${v1}/notifications`, notificationRoutes);
app.use(`${v1}/subscriptions`, subscriptionRoutes);
app.use(`${v1}/coins`, coinRoutes);
app.use(`${v1}/gifts`, giftRoutes);
app.use(`${v1}/ads`, adRoutes);
app.use(`${v1}/admin`, adminRoutes);
app.use(`${v1}/share`, shareRoutes);
app.use(`${v1}/feed`, feedRoutes);
app.use(`${v1}/boosts`, boostRoutes);

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
// Global error handler -- must be the very last middleware
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
