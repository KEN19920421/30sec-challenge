import Redis, { RedisOptions } from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: true,
  retryStrategy(times: number): number | null {
    if (times > 20) {
      logger.error('Redis: max reconnection attempts reached, giving up');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 5000);
    logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  reconnectOnError(err: Error): boolean | 1 | 2 {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
    if (targetErrors.some((e) => err.message.includes(e))) {
      return 2; // Reconnect and resend failed command
    }
    return false;
  },
};

/**
 * Primary Redis client for caching and general operations.
 */
const redis = new Redis(REDIS_URL, redisOptions);

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (err: Error) => {
  logger.error('Redis client error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis client connection closed');
});

/**
 * Creates a new, independent Redis connection.
 * Useful for BullMQ workers or subscribers that need their own connection.
 */
export function createRedisConnection(): Redis {
  return new Redis(REDIS_URL, redisOptions);
}

/**
 * Gracefully disconnect the primary Redis client.
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis client disconnected gracefully');
  } catch (err) {
    logger.error('Error disconnecting Redis client', { error: err });
    redis.disconnect();
  }
}

export { redis };
export default redis;
