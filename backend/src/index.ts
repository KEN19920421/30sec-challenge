// Load environment variables before anything else
import 'dotenv/config';

import { logger } from './config';

// ---------------------------------------------------------------------------
// Import server to start listening
// ---------------------------------------------------------------------------
import './server';

// ---------------------------------------------------------------------------
// Top-level error safety nets
// ---------------------------------------------------------------------------

/**
 * Catch promises that were rejected but never had a `.catch()` handler.
 * Log and exit -- the process manager (PM2, Docker, systemd) should restart.
 */
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  // Throw so the uncaughtException handler can perform a controlled exit
  throw reason;
});

/**
 * Last-resort handler for synchronous exceptions that slip through.
 * Logs the error and exits with a failure code.
 */
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception -- shutting down', {
    error: err.message,
    stack: err.stack,
  });

  // Give Winston transports a moment to flush before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000).unref();
});
