import winston from 'winston';
import path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');

/**
 * Custom format that prints a human-readable line for console output.
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }),
);

/**
 * Structured JSON format for file transports (easy to parse by log aggregators).
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports: winston.transport[] = [
  // Console transport -- always active
  new winston.transports.Console({
    format: consoleFormat,
    level: LOG_LEVEL,
  }),
];

// File transports -- only in non-test environments
if (NODE_ENV !== 'test') {
  transports.push(
    // Combined log: all levels
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      level: LOG_LEVEL,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    // Error log: error level only
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      format: fileFormat,
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'video-challenge-api' },
  transports,
  // Do not exit on uncaught exceptions; let the process manager handle it
  exitOnError: false,
});

/**
 * Morgan stream adapter so HTTP request logs flow through Winston.
 */
export const morganStream: { write: (message: string) => void } = {
  write: (message: string) => {
    // Morgan appends a newline; trim it before passing to Winston
    logger.http(message.trim());
  },
};

export { logger };
export default logger;
