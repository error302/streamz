// ============================================
// StreamZ - Structured Logger
// ============================================
// JSON format in production, pretty-printed in development.
// Configurable via LOG_LEVEL env var.
//
// Phase 4 enhancements:
// - Performance timing helpers (time/timeEnd)
// - Context-aware logging with correlation IDs
// - Log batching for production (buffer + flush)
// - Child logger with fixed context fields

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

// ---- Correlation ID ----
let currentCorrelationId: string | undefined;

export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

export function getCorrelationId(): string | undefined {
  return currentCorrelationId;
}

export function clearCorrelationId(): void {
  currentCorrelationId = undefined;
}

// ---- Performance Timers ----
const timers = new Map<string, { start: number; context?: Record<string, unknown> }>();

// ---- Log Batching ----
interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const LOG_BATCH_SIZE = 50;
const LOG_FLUSH_INTERVAL_MS = 5000; // 5 seconds

let logBuffer: LogEntry[] = [];
let batchTimer: ReturnType<typeof setInterval> | null = null;
let batchingEnabled = process.env.LOG_BATCHING === 'true';

function startBatchTimer(): void {
  if (batchTimer) return;
  batchTimer = setInterval(() => {
    flushLogs();
  }, LOG_FLUSH_INTERVAL_MS);
  batchTimer.unref?.(); // Don't keep process alive for batch timer
}

function bufferLog(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length >= LOG_BATCH_SIZE) {
    flushLogs();
  }
}

function flushLogs(): void {
  if (logBuffer.length === 0) return;

  const batch = logBuffer.splice(0);
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // In production, output each buffered log as JSON
    for (const entry of batch) {
      const output = formatMessage(entry.level, entry.message, entry.context, entry.timestamp);
      const stream = entry.level === 'error' ? process.stderr : process.stdout;
      stream.write(output + '\n');
    }
  } else {
    // In development, output directly
    for (const entry of batch) {
      const output = formatMessage(entry.level, entry.message, entry.context, entry.timestamp);
      const stream = entry.level === 'error' ? process.stderr : process.stdout;
      stream.write(output + '\n');
    }
  }
}

// ---- Format Message ----

function formatMessage(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  timestamp?: string
): string {
  const ts = timestamp || new Date().toISOString();
  const isProduction = process.env.NODE_ENV === 'production';

  const entry: Record<string, unknown> = {
    timestamp: ts,
    level,
    message,
    ...(currentCorrelationId ? { correlationId: currentCorrelationId } : {}),
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

  const corrStr = currentCorrelationId ? ` [${currentCorrelationId.slice(0, 8)}]` : '';
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${ts}]${corrStr} ${levelStr} ${message}${contextStr}`;
}

// ---- Logger Interface ----

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  /** Start a performance timer */
  time(label: string, context?: Record<string, unknown>): void;
  /** End a performance timer and log the duration */
  timeEnd(label: string): number | undefined;
  /** Flush any buffered logs */
  flush(): void;
}

// ---- Root Logger ----

export const logger: Logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('debug')) return;
    if (batchingEnabled) {
      bufferLog({ level: 'debug', message, context, timestamp: new Date().toISOString() });
      startBatchTimer();
    } else {
      const output = formatMessage('debug', message, context);
      console.log(output);
    }
  },
  info(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('info')) return;
    if (batchingEnabled) {
      bufferLog({ level: 'info', message, context, timestamp: new Date().toISOString() });
      startBatchTimer();
    } else {
      const output = formatMessage('info', message, context);
      console.log(output);
    }
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('warn')) return;
    if (batchingEnabled) {
      bufferLog({ level: 'warn', message, context, timestamp: new Date().toISOString() });
      startBatchTimer();
    } else {
      const output = formatMessage('warn', message, context);
      console.warn(output);
    }
  },
  error(message: string, context?: Record<string, unknown>) {
    if (!shouldLog('error')) return;
    if (batchingEnabled) {
      bufferLog({ level: 'error', message, context, timestamp: new Date().toISOString() });
      startBatchTimer();
    } else {
      const output = formatMessage('error', message, context);
      console.error(output);
    }
  },
  time(label: string, context?: Record<string, unknown>) {
    timers.set(label, { start: performance.now(), context });
  },
  timeEnd(label: string): number | undefined {
    const timer = timers.get(label);
    if (!timer) {
      this.warn(`Timer '${label}' does not exist`, { timerLabel: label });
      return undefined;
    }
    timers.delete(label);
    const durationMs = performance.now() - timer.start;
    this.info(`Timer '${label}'`, {
      timerLabel: label,
      durationMs: Math.round(durationMs * 100) / 100,
      ...timer.context,
    });
    return durationMs;
  },
  flush() {
    flushLogs();
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
    time(label: string, extra?: Record<string, unknown>) {
      parent.time(label, { ...context, ...extra });
    },
    timeEnd(label: string): number | undefined {
      return parent.timeEnd(label);
    },
    flush() {
      parent.flush();
    },
  };
}

// ---- Enable / Disable Batching ----

export function enableBatching(enabled: boolean): void {
  batchingEnabled = enabled;
  if (enabled) {
    startBatchTimer();
  } else {
    flushLogs();
    if (batchTimer) {
      clearInterval(batchTimer);
      batchTimer = null;
    }
  }
}

// ---- Flush on process exit ----
process.on('beforeExit', () => {
  flushLogs();
});
