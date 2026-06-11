// ============================================
// StreamZ - Structured Logger
// ============================================
// JSON format in production, pretty-printed in development.
// Configurable via LOG_LEVEL env var.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const configuredLevel = getConfiguredLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
}

function formatMessage(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const isProduction = process.env.NODE_ENV === 'production';

  const entry: Record<string, unknown> = {
    timestamp,
    level,
    message,
    ...context,
  };

  if (isProduction) {
    // JSON format in production (for log aggregation)
    return JSON.stringify(entry);
  }

  // Pretty-printed in development
  const contextStr = context && Object.keys(context).length > 0
    ? ' ' + Object.entries(context)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' ')
    : '';

  const levelStr = level.toUpperCase().padEnd(5);
  return `[${timestamp}] ${levelStr} ${message}${contextStr}`;
}

// ---- Logger Interface ----

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

// ---- Root Logger ----

export const logger: Logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) console.log(formatMessage('debug', message, context));
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) console.log(formatMessage('info', message, context));
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, context));
  },
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog('error')) console.error(formatMessage('error', message, context));
  },
};

// ---- Child Logger (with fixed context fields) ----

export function childLogger(
  context: Record<string, unknown>,
  parent: Logger = logger
): Logger {
  return {
    debug(message: string, extra?: Record<string, unknown>) {
      parent.debug(message, { ...context, ...extra });
    },
    info(message: string, extra?: Record<string, unknown>) {
      parent.info(message, { ...context, ...extra });
    },
    warn(message: string, extra?: Record<string, unknown>) {
      parent.warn(message, { ...context, ...extra });
    },
    error(message: string, extra?: Record<string, unknown>) {
      parent.error(message, { ...context, ...extra });
    },
  };
}
