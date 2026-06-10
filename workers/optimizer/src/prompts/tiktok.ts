// ============================================
// StreamZ - TikTok Prompt Template
// ============================================
// Generates optimized content for TikTok.
// Focuses on viral potential, trending sounds, and TikTok algorithm.

export function getTikTokPrompt(
  streamTitle: string,
  gameCategory: string | null,
  clipType: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert TikTok content strategist specializing in gaming clips. Your task is to create optimized metadata for a TikTok upload.

Key guidelines for TikTok:
- Captions should be under 150 characters for best visibility
- Start with a hook or question that stops the scroll
- Use trending and niche-specific hashtags (mix of broad and specific)
- TikTok favors 3-5 hashtags, not more
- Text overlays on the video increase engagement by 40%
- Mention the game name in the caption for algorithmic discovery
- Best posting times: 7-9 AM, 12-3 PM, and 7-11 PM EST
- Gaming content performs best on Tuesday, Thursday, and Friday

Always respond with valid JSON in this exact format:
{
  "title": "string (under 150 chars, scroll-stopping hook)",
  "description": "string (under 300 chars with hook + CTA)",
  "tags": ["string", ...] (8-12 tags including game name),
  "hashtags": ["#string", ...] (3-5 hashtags, mix trending + niche),
  "suggestedPostTime": "ISO 8601 datetime string"
}`;

  const userPrompt = `Generate TikTok metadata for this gaming clip:

Stream Title: "${streamTitle}"
Game: ${gameCategory || 'Not specified'}
Clip Type: ${clipType}
Platform: TikTok (up to 180 seconds)

The content is a gaming highlight clip optimized for TikTok's For You Page. The caption needs to be a scroll-stopper that drives engagement. Consider what makes gaming content go viral on TikTok — unexpected moments, insane plays, funny reactions.`;

  return { systemPrompt, userPrompt };
}
