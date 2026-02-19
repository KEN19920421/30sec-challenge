import knex, { Knex } from 'knex';
import { logger } from './logger';

const environment = (process.env.NODE_ENV || 'development') as string;

let resolvedConfig: Knex.Config;

if (environment === 'production') {
  // In production (Docker), knexfile.ts cannot be require'd without ts-node.
  // Inline the production config here.
  resolvedConfig = {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    },
    pool: { min: 5, max: 30 },
    migrations: {
      directory: './migrations',
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  };
} else if (environment === 'test') {
  // In test mode, read the connection directly from process.env to avoid
  // stale knexfile module cache (dotenv.config() in knexfile runs before
  // test setup sets DATABASE_URL, caching the dev URL instead).
  resolvedConfig = {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://app_user:app_password@localhost:5432/video_challenge_test',
    pool: { min: 1, max: 5 },
  };
} else {
  // In dev, knexfile.ts is available via ts-node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const knexConfig = require('../../knexfile');
  resolvedConfig = (knexConfig as Record<string, Knex.Config>)[environment];
}

if (!resolvedConfig) {
  throw new Error(`No Knex configuration found for environment: ${environment}`);
}

const db: Knex = knex(resolvedConfig);

// Verify connectivity on first import
db.raw('SELECT 1')
  .then(() => {
    logger.info(`Database connected successfully (${environment})`);
  })
  .catch((err: Error) => {
    logger.error('Database connection failed', { error: err.message });
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  });

// Graceful shutdown helper
export async function destroyDatabase(): Promise<void> {
  try {
    await db.destroy();
    logger.info('Database connection pool destroyed');
  } catch (err) {
    logger.error('Error destroying database connection pool', { error: err });
  }
}

export { db };
export default db;
