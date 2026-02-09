import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /**
     * The authenticated user attached by auth middleware.
     * Will be `undefined` for unauthenticated routes.
     */
    user?: {
      id: string;
      email: string;
      role: string;
      subscription_tier: string;
    };

    /**
     * A unique identifier assigned to every incoming request,
     * typically set by a request-id middleware for tracing/logging.
     */
    requestId?: string;
  }
}
