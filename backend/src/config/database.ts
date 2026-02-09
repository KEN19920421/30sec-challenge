import knex, { Knex } from 'knex';
import { logger } from './logger';

// knexfile lives outside src/ (rootDir), so use require to avoid TS6059
// eslint-disable-next-line @typescript-eslint/no-var-requires
const knexConfig = require('../../knexfile');

const environment = (process.env.NODE_ENV || 'development') as string;

const resolvedConfig: Knex.Config = (knexConfig as Record<string, Knex.Config>)[environment];

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
