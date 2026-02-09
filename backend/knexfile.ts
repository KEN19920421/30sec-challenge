import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const commonConfig: Partial<Knex.Config> = {
  client: 'pg',
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.resolve(__dirname, 'seeds'),
    extension: 'ts',
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
};

const config: Record<string, Knex.Config> = {
  development: {
    ...commonConfig,
    connection: process.env.DATABASE_URL || 'postgres://app_user:app_password@localhost:5432/video_challenge_dev',
    debug: true,
  },

  test: {
    ...commonConfig,
    connection: process.env.DATABASE_URL || 'postgres://app_user:app_password@localhost:5432/video_challenge_test',
    pool: {
      min: 1,
      max: 5,
    },
  },

  production: {
    ...commonConfig,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 5,
      max: 30,
    },
  },
};

export default config;

// Named export so knex CLI can resolve it
module.exports = config;
