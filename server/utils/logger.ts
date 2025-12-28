/**
 * Structured Logging with Pino
 */

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export default logger;

// Helper: Create child logger with context
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
