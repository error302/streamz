// ============================================
// StreamZ - Instagram Prompt Template
// ============================================
// Generates optimized content for Instagram Reels and Stories.
// Focuses on engagement, visual appeal, and Instagram algorithm.

export function getInstagramPrompt(
  streamTitle: string,
  gameCategory: string | null,
  clipType: string,
  format: 'instagram_reels' | 'instagram_stories'
): { systemPrompt: string; userPrompt: string } {
  const isReels = format === 'instagram_reels';

  const systemPrompt = `You are an expert Instagram content strategist specializing in gaming content. Your task is to create optimized metadata for an Instagram ${isReels ? 'Reel' : 'Story'}.

Key guidelines for Instagram ${isReels ? 'Reels' : 'Stories'}:
${isReels ? `- Captions should be under 150 characters before "more" cutoff
- Use a hook in the first line that stops the scroll
- Include a call-to-action (Follow, Link in bio, etc.)
- Use 20-30 hashtags for maximum discoverability
- Mix popular and niche hashtags (70/30 split)
- Reels perform best posted 9 AM - 11 AM EST and 7 PM - 9 PM EST
- Max duration: 90 seconds` : `- Story text overlays should be under 40 characters
- Use polls, questions, or quiz stickers to drive engagement
- Keep hashtags minimal (1-3) for Stories
- Stories are great for behind-the-scenes and FOMO content
- Max duration: 15 seconds per story slide`}

Always respond with valid JSON in this exact format:
{
  "title": "string (under ${isReels ? '150' : '40'} chars)",
  "description": "string (${isReels ? '150-500 chars with CTA and line breaks' : 'under 100 chars'}),
  "tags": ["string", ...] (${isReels ? '15-25 tags' : '3-5 tags'}),
  "hashtags": ["#string", ...] (${isReels ? '20-30 hashtags' : '1-3 hashtags'}),
  "suggestedPostTime": "ISO 8601 datetime string"
}`;

  const userPrompt = `Generate Instagram ${isReels ? 'Reel' : 'Story'} metadata for this gaming clip:

Stream Title: "${streamTitle}"
Game: ${gameCategory || 'Not specified'}
Clip Type: ${clipType}
Format: Instagram ${isReels ? 'Reel' : 'Story'}
Duration: ${isReels ? 'Up to 90 seconds' : 'Up to 15 seconds'}

The content is a gaming highlight clip for Instagram's ${isReels ? 'Reels' : 'Stories'} format. ${isReels ? 'Focus on scroll-stopping hooks and discoverability through hashtags.' : 'Focus on FOMO, engagement stickers, and quick impact.'}`;

  return { systemPrompt, userPrompt };
}
