// ============================================
// StreamZ - AI Client (Web App)
// ============================================
// Re-exports from @streamz/ai and adds web-app-specific AI functions.

export { generateCompletion, generateJSON } from '@streamz/ai';
import type { AICompletionOptions, AICompletionResult } from '@streamz/ai';
import { generateCompletion as _generateCompletion } from '@streamz/ai';

// ---- Specialized AI Functions (Web App Specific) ----

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
  const result = await _generateCompletion(
    `You are a social media content optimizer for gaming content creators.
Generate optimized content for the ${params.platform} platform.
Consider the platform's best practices, character limits, and audience expectations.
Always respond with valid JSON matching the expected schema.`,
    `Generate optimized content for a gaming clip:
- Platform: ${params.platform}
- Stream Title: ${params.clipTitle}
- Game: ${params.gameCategory || 'Unknown'}
- Clip Type: ${params.clipType}
- Duration: ${params.durationSeconds}s

Respond with JSON: { "title": "", "description": "", "tags": [], "hashtags": [], "suggestedPostTime": "" }`,
    { temperature: 0.8 }
  );

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
