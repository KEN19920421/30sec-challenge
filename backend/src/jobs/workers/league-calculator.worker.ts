import { Worker, Queue, Job } from 'bullmq';
import { logger } from '../../config/logger';
import * as leagueService from '../../modules/league/league.service';

// ---------------------------------------------------------------------------
// Redis connection config
// ---------------------------------------------------------------------------

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: parsed.password } : {}),
  };
}

const connection = parseRedisUrl(REDIS_URL);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeagueCalcData {
  season_week: string;
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export const leagueCalculatorQueue = new Queue<LeagueCalcData>('league-calculator', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processLeagueCalculation(job: Job<LeagueCalcData>): Promise<void> {
  const { season_week } = job.data;
  logger.info('Processing weekly league calculation', { season_week, jobId: job.id });

  try {
    const result = await leagueService.calculateWeeklyLeague(season_week);
    logger.info('League calculation completed', { season_week, ...result });
  } catch (error) {
    logger.error('League calculation failed', {
      season_week,
      error: (error as Error).message,
      jobId: job.id,
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let worker: Worker<LeagueCalcData> | null = null;

/**
 * Starts the league calculator worker. Safe to call multiple times.
 */
export function startLeagueCalculatorWorker(): Worker<LeagueCalcData> {
  if (worker) {
    logger.warn('League calculator worker is already running');
    return worker;
  }

  worker = new Worker<LeagueCalcData>('league-calculator', processLeagueCalculation, {
    connection,
    concurrency: 1,
  });

  worker.on('completed', (job) => {
    logger.info('League calculator job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('League calculator job failed', {
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('League calculator worker error', { error: err.message });
  });

  logger.info('League calculator worker started');

  return worker;
}

/**
 * Gracefully shuts down the league calculator worker.
 */
export async function stopLeagueCalculatorWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('League calculator worker stopped');
  }
}

export default worker;
