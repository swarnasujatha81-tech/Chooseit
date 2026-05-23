import OpenAI from 'openai';
import { getCached, setCached, stableCacheKey } from './cache.js';
import { buildFallbackNarration } from './fallbackNarration.js';
import { buildJourneyNarrationPrompt, JOURNEY_NARRATOR_SYSTEM_PROMPT } from './prompts.js';
import { journeyNarrationSchema, normalizeNarration } from './routeSchema.js';

export async function narrateJourneyRoute({ apiKey, routeJson, model = 'gpt-4.1-mini' }) {
  const cacheKey = stableCacheKey({ model, routeJson });
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, cached: true };

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 420,
      response_format: {
        type: 'json_schema',
        json_schema: journeyNarrationSchema,
      },
      messages: [
        { role: 'system', content: JOURNEY_NARRATOR_SYSTEM_PROMPT },
        { role: 'user', content: buildJourneyNarrationPrompt(routeJson) },
      ],
    });

    const content = response.choices?.[0]?.message?.content || '{}';
    const narration = normalizeNarration(JSON.parse(content), routeJson);
    const result = { narration, source: 'ai', model };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error('AI journey narration failed', error);
    return {
      narration: buildFallbackNarration(routeJson),
      source: 'fallback',
      model,
    };
  }
}
