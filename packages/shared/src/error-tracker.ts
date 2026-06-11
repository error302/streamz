// ============================================
// StreamZ - Error Tracker (Sentry-style)
// ============================================
// Structured error tracking without external dependency.
// Provides error grouping, rate tracking, context enrichment,
// breadcrumb tracking, and a job processor wrapper.
//
// Phase 4: Monitoring & Logging

import { logger } from './logger.js';

// ---- Types ----

interface ErrorContext {
  workerName?: string;
  jobId?: string;
  streamId?: string;
  platform?: string;
  [key: string]: unknown;
}

interface Breadcrumb {
  category: string;
  message: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  data?: Record<string, unknown>;
}

interface ErrorGroup {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  contexts: ErrorContext[];
}

interface ErrorRecord {
  error: Error;
  fingerprint: string;
  context?: ErrorContext;
  breadcrumbs: Breadcrumb[];
  capturedAt: Date;
}

// ---- Error Rate Tracking ----

interface RateWindow {
  count: number;
  startTime: number;
}

// ---- ErrorTracker Class ----

export class ErrorTracker {
  private errors: ErrorRecord[] = [];
  private errorGroups: Map<string, ErrorGroup> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;
  private maxErrors: number;
  private rateWindows: Map<string, RateWindow[]> = new Map();
  private rateWindowMs: number;
  private staticContext: ErrorContext;

  constructor(options?: {
    maxBreadcrumbs?: number;
    maxErrors?: number;
    rateWindowMs?: number;
    staticContext?: ErrorContext;
  }) {
    this.maxBreadcrumbs = options?.maxBreadcrumbs ?? 50;
    this.maxErrors = options?.maxErrors ?? 1000;
    this.rateWindowMs = options?.rateWindowMs ?? 60000; // 1 minute windows
    this.staticContext = options?.staticContext ?? {};
  }

  /**
   * Capture an exception with optional context.
   * Groups errors by message pattern for tracking recurring issues.
   */
  captureException(error: Error | unknown, context?: ErrorContext): void {
    const normalizedError = error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : String(error));

    const fingerprint = this.computeFingerprint(normalizedError);
    const fullContext: ErrorContext = { ...this.staticContext, ...context };

    const record: ErrorRecord = {
      error: normalizedError,
      fingerprint,
      context: fullContext,
      breadcrumbs: [...this.breadcrumbs], // Snapshot current breadcrumbs
      capturedAt: new Date(),
    };

    // Store error
    this.errors.push(record);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift(); // Ring buffer
    }

    // Update error group
    this.updateErrorGroup(fingerprint, normalizedError, fullContext);

    // Track error rate
    this.trackRate(fingerprint);

    // Log the error
    logger.error(normalizedError.message, {
      errorFingerprint: fingerprint,
      errorName: normalizedError.name,
      errorStack: normalizedError.stack?.slice(0, 500),
      ...fullContext,
    });
  }

  /**
   * Add a breadcrumb for error context.
   * Breadcrumbs track the sequence of events leading up to an error.
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const entry: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Get the current error rate for a specific fingerprint or overall.
   * Returns errors per minute.
   */
  getErrorRate(fingerprint?: string): number {
    const now = Date.now();
    const windowStart = now - this.rateWindowMs;

    if (fingerprint) {
      const windows = this.rateWindows.get(fingerprint) ?? [];
      const recentWindows = windows.filter((w) => w.startTime >= windowStart);
      const totalErrors = recentWindows.reduce((sum, w) => sum + w.count, 0);
      return totalErrors; // Errors in the last minute
    }

    // Overall error rate
    let totalErrors = 0;
    for (const windows of this.rateWindows.values()) {
      const recentWindows = windows.filter((w) => w.startTime >= windowStart);
      totalErrors += recentWindows.reduce((sum, w) => sum + w.count, 0);
    }
    return totalErrors;
  }

  /**
   * Get all error groups sorted by frequency.
   */
  getErrorGroups(): ErrorGroup[] {
    return Array.from(this.errorGroups.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get recent errors, optionally filtered by fingerprint.
   */
  getRecentErrors(limit: number = 20, fingerprint?: string): ErrorRecord[] {
    let filtered = fingerprint
      ? this.errors.filter((e) => e.fingerprint === fingerprint)
      : this.errors;

    return filtered.slice(-limit);
  }

  /**
   * Get error group details by fingerprint.
   */
  getErrorGroup(fingerprint: string): ErrorGroup | undefined {
    return this.errorGroups.get(fingerprint);
  }

  /**
   * Clear breadcrumbs (e.g., at the start of a new job).
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Update the static context (e.g., when a new job starts).
   */
  setContext(context: ErrorContext): void {
    this.staticContext = { ...this.staticContext, ...context };
  }

  /**
   * Get a summary of all tracked errors for health reporting.
   */
  getSummary(): {
    totalErrors: number;
    uniqueErrors: number;
    errorsPerMinute: number;
    topErrors: Array<{ fingerprint: string; message: string; count: number }>;
  } {
    const topErrors = this.getErrorGroups()
      .slice(0, 10)
      .map((g) => ({
        fingerprint: g.fingerprint,
        message: g.message,
        count: g.count,
      }));

    return {
      totalErrors: this.errors.length,
      uniqueErrors: this.errorGroups.size,
      errorsPerMinute: this.getErrorRate(),
      topErrors,
    };
  }

  // ---- Private Helpers ----

  private computeFingerprint(error: Error): string {
    // Group errors by: name + first line of message + first line of stack
    const name = error.name || 'Error';
    const message = error.message?.split('\n')[0] || 'Unknown';

    // Extract the function/file from the first stack frame for better grouping
    let location = '';
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      // Find the first frame that's not the error constructor
      for (const line of stackLines) {
        if (line.includes('at ') && !line.includes('Error.') && !line.includes('new ')) {
          location = line.trim().slice(0, 100);
          break;
        }
      }
    }

    // Simple hash-like fingerprint
    const raw = `${name}:${message}:${location}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${name}_${Math.abs(hash).toString(36)}`;
  }

  private updateErrorGroup(fingerprint: string, error: Error, context: ErrorContext): void {
    const existing = this.errorGroups.get(fingerprint);

    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
      // Keep up to 5 unique contexts per group
      if (existing.contexts.length < 5) {
        const isDuplicate = existing.contexts.some(
          (c) => JSON.stringify(c) === JSON.stringify(context)
        );
        if (!isDuplicate) {
          existing.contexts.push(context);
        }
      }
    } else {
      this.errorGroups.set(fingerprint, {
        fingerprint,
        message: error.message?.split('\n')[0] || 'Unknown error',
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        contexts: [context],
      });
    }
  }

  private trackRate(fingerprint: string): void {
    const now = Date.now();
    const windows = this.rateWindows.get(fingerprint) ?? [];

    // Find or create the current window (1-minute buckets)
    const currentWindow = windows.find(
      (w) => w.startTime > now - this.rateWindowMs
    );

    if (currentWindow) {
      currentWindow.count++;
    } else {
      windows.push({ count: 1, startTime: now });
    }

    // Clean up old windows
    const cleaned = windows.filter((w) => w.startTime > now - this.rateWindowMs * 5);
    this.rateWindows.set(fingerprint, cleaned);
  }
}

// ---- Singleton Export ----

export const errorTracker = new ErrorTracker({
  maxBreadcrumbs: 50,
  maxErrors: 1000,
  rateWindowMs: 60000,
});

// ---- Job Processor Wrapper ----

/**
 * Wraps a job processor function with error tracking.
 * Automatically adds breadcrumbs for job lifecycle events
 * and captures exceptions with job context.
 */
export function withErrorTracking<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
  options?: {
    workerName?: string;
    getJobContext?: (input: TInput) => ErrorContext;
  }
): (input: TInput) => Promise<TResult> {
  return async (input: TInput) => {
    const jobContext = options?.getJobContext?.(input) ?? {};
    const context: ErrorContext = {
      workerName: options?.workerName ?? 'unknown',
      ...jobContext,
    };

    // Set context for breadcrumbs
    errorTracker.setContext(context);
    errorTracker.clearBreadcrumbs();
    errorTracker.addBreadcrumb({
      category: 'job',
      message: 'Job processing started',
      level: 'info',
      data: context,
    });

    try {
      const result = await fn(input);

      errorTracker.addBreadcrumb({
        category: 'job',
        message: 'Job processing completed',
        level: 'info',
      });

      return result;
    } catch (error) {
      errorTracker.addBreadcrumb({
        category: 'job',
        message: 'Job processing failed',
        level: 'error',
        data: { errorMessage: error instanceof Error ? error.message : String(error) },
      });

      errorTracker.captureException(error, context);
      throw error;
    }
  };
}
