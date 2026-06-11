// ============================================
// StreamZ - YouTube VOD Prompt Template
// ============================================
// Generates optimized content for YouTube VOD uploads.
// Focuses on SEO, discoverability, and watch time.

export function getYoutubeVODPrompt(
  streamTitle: string,
  gameCategory: string | null,
  clipType: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert YouTube content strategist specializing in gaming content. Your task is to create optimized metadata for a YouTube VOD (Video on Demand) upload of a gaming stream highlight.

Key guidelines for YouTube VOD:
- Titles should be 50-70 characters, keyword-rich but natural
- Use power words that drive clicks without being clickbait
- Descriptions should be 200-500 words with relevant keywords in the first 2 lines
- Include timestamps if the clip is long enough
- Tags should include game name, streamer context, and content type
- Hashtags should be 3-5 relevant ones (YouTube shows 3 above the title)
- Suggest optimal posting time (typically 2-5 PM EST on weekdays, 10 AM-1 PM EST on weekends)

Always respond with valid JSON in this exact format:
{
  "title": "string (50-70 chars)",
  "description": "string (200-500 words with links, timestamps, keywords)",
  "tags": ["string", ...] (10-15 tags),
  "hashtags": ["#string", ...] (3-5 hashtags),
  "suggestedPostTime": "ISO 8601 datetime string"
}`;

  const userPrompt = `Generate YouTube VOD metadata for this gaming content:

Stream Title: "${streamTitle}"
Game: ${gameCategory || 'Not specified'}
Clip Type: ${clipType}
Platform: YouTube VOD (full-length video)

The content is a gaming stream highlight that will be uploaded as a VOD. Make the title attention-grabbing and SEO-friendly. Include a compelling description that encourages viewers to watch the full video.`;

  return { systemPrompt, userPrompt };
}
