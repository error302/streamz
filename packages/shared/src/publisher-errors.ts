// ============================================
// StreamZ - Publisher Error Types
// ============================================
// Structured error types for platform publishing operations.
// Provides type guards for retryable/auth/quota/policy error classification.

// ---- Abstract Base ----

export abstract class PublisherError extends Error {
  public readonly platform: string;
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    platform: string,
    code: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.platform = platform;
    this.code = code;
    this.retryable = retryable;
  }

  /** Whether this error is transient and the operation can be retried */
  isRetryable(): boolean {
    return this.retryable;
  }

  /** Whether this error is caused by invalid/expired authentication */
  isAuthError(): boolean {
    return false;
  }
}

// ---- YouTube Errors ----

export class YouTubeQuotaExceededError extends PublisherError {
  constructor(message: string = 'YouTube API quota exceeded') {
    super(message, 'youtube', 'QUOTA_EXCEEDED', true);
  }
}

export class YouTubePolicyError extends PublisherError {
  constructor(message: string = 'YouTube policy violation') {
    super(message, 'youtube', 'POLICY_VIOLATION', false);
  }
}

export class YouTubeAuthError extends PublisherError {
  constructor(message: string = 'YouTube authentication failed') {
    super(message, 'youtube', 'AUTH_FAILED', false);
  }

  isAuthError(): boolean {
    return true;
  }
}

// ---- Instagram Errors ----

export class InstagramQuotaExceededError extends PublisherError {
  constructor(message: string = 'Instagram API quota exceeded') {
    super(message, 'instagram', 'QUOTA_EXCEEDED', true);
  }
}

export class InstagramPolicyError extends PublisherError {
  constructor(message: string = 'Instagram policy violation') {
    super(message, 'instagram', 'POLICY_VIOLATION', false);
  }
}

export class InstagramAuthError extends PublisherError {
  constructor(message: string = 'Instagram authentication failed') {
    super(message, 'instagram', 'AUTH_FAILED', false);
  }

  isAuthError(): boolean {
    return true;
  }
}

// ---- TikTok Errors ----

export class TikTokQuotaExceededError extends PublisherError {
  constructor(message: string = 'TikTok API quota exceeded') {
    super(message, 'tiktok', 'QUOTA_EXCEEDED', true);
  }
}

export class TikTokPolicyError extends PublisherError {
  constructor(message: string = 'TikTok policy violation') {
    super(message, 'tiktok', 'POLICY_VIOLATION', false);
  }
}

export class TikTokAuthError extends PublisherError {
  constructor(message: string = 'TikTok authentication failed') {
    super(message, 'tiktok', 'AUTH_FAILED', false);
  }

  isAuthError(): boolean {
    return true;
  }
}

// ---- Type Guards ----

export function isPublisherError(error: unknown): error is PublisherError {
  return error instanceof PublisherError;
}

export function isAnyAuthError(error: unknown): boolean {
  return error instanceof PublisherError && error.isAuthError();
}

export function isAnyRetryable(error: unknown): boolean {
  return error instanceof PublisherError && error.isRetryable();
}

export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof YouTubeQuotaExceededError ||
    error instanceof InstagramQuotaExceededError ||
    error instanceof TikTokQuotaExceededError
  );
}

export function isPolicyError(error: unknown): boolean {
  return (
    error instanceof YouTubePolicyError ||
    error instanceof InstagramPolicyError ||
    error instanceof TikTokPolicyError
  );
}
