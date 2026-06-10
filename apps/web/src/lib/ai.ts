// ============================================
// StreamZ - AI Client (OpenRouter)
// ============================================

// Using OpenRouter as a unified gateway to access Claude and other models
// OpenRouter provides an OpenAI-compatible API

interface AICompletionOptions {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface AICompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateCompletion(
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const {
    model = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-20250514',
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'StreamZ',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content ?? '',
    model: data.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}

// ---- Specialized AI Functions ----

export async function generateContentForPlatform(params: {
  platform: string;
  clipTitle: string;
  gameCategory: string | null;
  clipType: string;
  durationSeconds: number;
}): Promise<{
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  suggestedPostTime: string;
}> {
  // TODO: Implement platform-specific prompt templates
  // For now, use a generic prompt
  const result = await generateCompletion({
    systemPrompt: `You are a social media content optimizer for gaming content creators.
Generate optimized content for the ${params.platform} platform.
Consider the platform's best practices, character limits, and audience expectations.
Always respond with valid JSON matching the expected schema.`,
    userPrompt: `Generate optimized content for a gaming clip:
- Platform: ${params.platform}
- Stream Title: ${params.clipTitle}
- Game: ${params.gameCategory || 'Unknown'}
- Clip Type: ${params.clipType}
- Duration: ${params.durationSeconds}s

Respond with JSON: { "title": "", "description": "", "tags": [], "hashtags": [], "suggestedPostTime": "" }`,
    temperature: 0.8,
  });

  try {
    return JSON.parse(result.content);
  } catch {
    // Fallback if AI doesn't return valid JSON
    return {
      title: params.clipTitle,
      description: `Gaming highlight from ${params.gameCategory || 'stream'}`,
      tags: ['gaming', 'highlights', params.clipType],
      hashtags: ['#gaming', '#highlights'],
      suggestedPostTime: new Date().toISOString(),
    };
  }
}
