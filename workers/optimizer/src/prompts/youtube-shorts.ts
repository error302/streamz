// ============================================
// StreamZ - YouTube Shorts Prompt Template
// ============================================
// Generates optimized content for YouTube Shorts.
// Focuses on viral hooks, trending sounds, and short-form engagement.

export function getYoutubeShortsPrompt(
  streamTitle: string,
  gameCategory: string | null,
  clipType: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert YouTube Shorts content strategist specializing in gaming clips. Your task is to create optimized metadata for a YouTube Shorts upload.

Key guidelines for YouTube Shorts:
- Titles should be UNDER 60 characters, punchy and hook-driven
- The first 3 seconds of the title appear in the feed — make them count
- Use brackets or emojis strategically to stand out [INSANE], 🎮, 🔥
- Descriptions should be short (under 200 chars) with a call-to-action
- Tags should target trending gaming terms and the specific game
- Use 3-5 hashtags including #shorts #gaming
- Shorts perform best posted between 12-3 PM EST and 7-10 PM EST

Always respond with valid JSON in this exact format:
{
  "title": "string (under 60 chars, hook-driven)",
  "description": "string (under 200 chars with CTA)",
  "tags": ["string", ...] (8-12 tags),
  "hashtags": ["#shorts", "#gaming", ...] (3-5 hashtags),
  "suggestedPostTime": "ISO 8601 datetime string"
}`;

  const userPrompt = `Generate YouTube Shorts metadata for this gaming clip:

Stream Title: "${streamTitle}"
Game: ${gameCategory || 'Not specified'}
Clip Type: ${clipType}
Duration: Under 60 seconds (Shorts format)

The content is a short gaming highlight clip optimized for vertical viewing. Make the title a scroll-stopping hook that makes viewers want to watch. Keep it punchy and exciting.`;

  return { systemPrompt, userPrompt };
}
