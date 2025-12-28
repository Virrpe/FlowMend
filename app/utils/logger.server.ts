/**
 * Structured Logging with Pino
 */

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export default logger;

// Helper: Create child logger with context
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
