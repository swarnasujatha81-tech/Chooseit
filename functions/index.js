import OpenAI from 'openai';
import { initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createPlanJourneyFunction } from './src/journey/planJourney.js';

initializeApp();

const openAiKey = defineSecret('OPENAI_API_KEY');

function crowdFromCount(count, maxCapacity = 50) {
  const ratio = count / maxCapacity;
  if (ratio < 0.3) return 'empty';
  if (ratio < 0.6) return 'available';
  if (ratio < 0.85) return 'standing';
  return 'overcrowded';
}

export const analyzeCrowdImage = onCall({ secrets: [openAiKey], timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  const { imageDataUrl, maxCapacity = 50 } = request.data || {};
  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    throw new HttpsError('invalid-argument', 'imageDataUrl must be a base64 image data URL.');
  }

  const client = new OpenAI({ apiKey: openAiKey.value() });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You count visible passengers inside buses. Return only JSON with integer count and boolean relevant.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this bus interior image. Count all visible passengers, seated or standing. Do not count the driver. If unclear, estimate from visible seats and silhouettes. Return {"count": number, "relevant": boolean}. Max capacity is ${maxCapacity}.`,
          },
          {
            type: 'image_url',
            image_url: { url: imageDataUrl },
          },
        ],
      },
    ],
  });

  let parsed = { count: 0, relevant: false };
  try {
    parsed = JSON.parse(response.choices?.[0]?.message?.content || '{}');
  } catch {
    parsed = { count: 0, relevant: false };
  }
  const count = Math.max(0, Number.parseInt(parsed.count, 10) || 0);
  return {
    count,
    relevant: parsed.relevant !== false,
    crowd_level: crowdFromCount(count, maxCapacity),
  };
});

export const planJourney = createPlanJourneyFunction(openAiKey);
