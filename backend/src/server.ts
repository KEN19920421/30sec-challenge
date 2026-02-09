import http from 'http';
import app from './app';
import { logger, destroyDatabase, disconnectRedis } from './config';

const PORT = parseInt(process.env.PORT || '3000', 10);

// ---------------------------------------------------------------------------
// Create HTTP server
// ---------------------------------------------------------------------------
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Gracefully shuts down all external connections and the HTTP server.
 *
 * Called on SIGTERM (container orchestrator) and SIGINT (Ctrl-C).
 * A hard exit is scheduled as a safety net in case teardown hangs.
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} -- starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    // Tear down external connections in parallel
    await Promise.all([
      destroyDatabase(),
      disconnectRedis(),
    ]);

    logger.info('All connections closed -- exiting');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown', { error: err });
    process.exit(1);
  }
}

// Safety net: force-kill after 10 seconds if graceful shutdown stalls
function scheduleForceExit(): void {
  setTimeout(() => {
    logger.error('Graceful shutdown timed out -- forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => {
  scheduleForceExit();
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  scheduleForceExit();
  gracefulShutdown('SIGINT');
});

export default server;
