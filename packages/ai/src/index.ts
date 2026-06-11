// ============================================
// StreamZ - Unified OpenRouter AI Client
// ============================================
// Lazy singleton OpenAI client (created on first use).
// Uses OpenRouter as a unified gateway to access Claude and other models.
// Includes exponential backoff retry, timeout protection, and JSON mode.

import OpenAI from 'openai';

// ---- Lazy Singleton OpenAI Client ----

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  _client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://streamz.app',
      'X-Title': 'StreamZ',
    },
  });

  return _client;
}

// ---- Types ----

export interface AICompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  retries?: number;
}

export interface AICompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ---- Constants ----

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_RETRIES = 2;
const TIMEOUT_MS = 60000; // 60s timeout on all API calls

// ---- Retry Logic ----

function shouldRetry(statusCode: number | undefined): boolean {
  // Don't retry on auth errors (401/403)
  if (statusCode === 401 || statusCode === 403) return false;
  // Retry on rate limits (429) and server errors (5xx)
  if (statusCode === 429 || (statusCode !== undefined && statusCode >= 500)) return true;
  // Retry on network errors (no status code)
  return statusCode === undefined;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_RETRIES
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const statusCode = err?.status || err?.statusCode;

      if (!shouldRetry(statusCode) || attempt >= retries) {
        throw lastError;
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.warn(
        `[AI] Request failed (attempt ${attempt + 1}/${retries + 1}), ` +
        `retrying in ${backoffMs}ms... Error: ${lastError.message}`
      );
      await sleep(backoffMs);
    }
  }

  throw lastError;
}

// ---- Generate Text Completion ----

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: AICompletionOptions
): Promise<AICompletionResult> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    retries = DEFAULT_RETRIES,
  } = options || {};

  return retryWithBackoff(async () => {
    const client = getClient();

    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      },
      {
        // 60s timeout to prevent hanging
        signal: AbortSignal.timeout(TIMEOUT_MS) as any,
      }
    );

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }, retries);
}

// ---- Generate JSON Completion ----

export async function generateJSON(
  systemPrompt: string,
  userPrompt: string,
  options?: AICompletionOptions
): Promise<AICompletionResult> {
  const {
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    retries = DEFAULT_RETRIES,
  } = options || {};

  return retryWithBackoff(async () => {
    const client = getClient();

    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_object' },
      },
      {
        signal: AbortSignal.timeout(TIMEOUT_MS) as any,
      }
    );

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }, retries);
}
