/**
 * Centralized Logger — Pino Instance
 *
 * WHY STRUCTURED LOGGING?
 * -----------------------
 * Traditional `console.log` outputs unstructured text that is difficult to parse,
 * search, and analyze at scale. Structured logging with Pino outputs JSON lines,
 * which means every log entry is a machine-readable object. This enables:
 *
 *   - Fast searching and filtering in log aggregation tools (e.g., Datadog, ELK)
 *   - Consistent fields across all log entries (timestamp, level, message, context)
 *   - Correlation of related events using contextual properties (e.g., bookId, operation)
 *
 * WHY PINO?
 * ---------
 * Pino is one of the fastest Node.js loggers available. It achieves this by:
 *
 *   - Writing JSON directly to stdout (no formatting overhead)
 *   - Deferring pretty-printing to a separate transport process (pino-pretty)
 *   - Using minimal serialization with low memory allocation
 *
 * In production, raw JSON goes to stdout where a log collector picks it up.
 * In development, you can pipe output through `pino-pretty` for human-readable logs.
 *
 * HOW THIS MODULE WORKS
 * ---------------------
 * We export a single logger instance configured based on NODE_ENV:
 *
 *   - development: `debug` level — verbose output for local troubleshooting
 *   - production:  `info` level  — only actionable entries to reduce noise and cost
 *
 * Import this logger anywhere in the server-side codebase:
 *
 *   import { logger } from '@/lib/logger';
 *   logger.info({ bookId: '42', operation: 'create' }, 'Book created successfully');
 *
 * For scoped logging within a module, create a child logger:
 *
 *   const log = logger.child({ module: 'bookService' });
 *   log.info({ bookId }, 'Fetching book by ID');
 */

import pino from 'pino';

/**
 * Determine the log level based on the current environment.
 *
 * - `debug` in development surfaces detailed diagnostic information
 *   (query parameters, intermediate state, timing) that helps during
 *   local development but would be too noisy in production.
 *
 * - `info` in production captures meaningful operational events
 *   (requests served, books created, errors encountered) without
 *   flooding log storage with debug-level detail.
 */
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = isProduction ? 'info' : 'debug';

/**
 * The application-wide Pino logger instance.
 *
 * Configuration choices:
 *   - `level`: Controls the minimum severity that gets logged.
 *   - `timestamp`: Uses ISO 8601 format for human readability and
 *     unambiguous timezone handling across distributed systems.
 *   - `formatters.level`: Outputs the level as a string label (e.g., "info")
 *     instead of the default numeric value (e.g., 30), making logs easier
 *     to read in both raw JSON and log aggregation dashboards.
 *   - `base`: Includes `pid` for process identification but omits `hostname`
 *     since container orchestrators (Docker, K8s) already track that.
 */
export const logger = pino({
  level: logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    pid: process.pid,
  },
});
