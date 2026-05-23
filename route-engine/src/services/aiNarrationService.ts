import type { AiNarration, JourneyPlan } from '../types.js';
import { AIProviderManager } from './ai/AIProviderManager.js';
import type { NarrationResponse } from './ai/AIProvider.js';

const providerManager = new AIProviderManager();

const responseSchema = {
  name: 'tsrtc_journey_narration',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'instructions', 'last_mile', 'travel_tip'],
    properties: {
      summary: {
        type: 'object',
        additionalProperties: false,
        required: ['duration', 'fare'],
        properties: {
          duration: { type: 'string' },
          fare: { type: 'string' },
        },
      },
      instructions: {
        type: 'array',
        items: { type: 'string' },
      },
      last_mile: { type: 'string' },
      travel_tip: { type: 'string' },
    },
  },
};

const systemPrompt = [
  'You narrate verified TSRTC route results for mobile users.',
  'The route engine is the only source of truth.',
  'Do not calculate routes.',
  'Do not invent bus numbers, stops, fares, or durations.',
  'Use only the supplied JSON.',
  'Mention bus route numbers clearly, transfer points, walking/last-mile guidance, total fare, total time, and one useful tip.',
  'Keep the response concise and practical.',
  'Return JSON only in the requested schema.',
].join(' ');

export async function narrateJourney(plan: JourneyPlan): Promise<AiNarration> {
  if (plan.type === 'not_found') return fallbackNarration(plan);

  try {
    const resp: NarrationResponse = await providerManager.generateNarration(plan, systemPrompt, responseSchema, { timeoutMs: 8000, maxRetries: 1 });
    if (!resp.ok || !resp.content) {
      return fallbackNarration(plan);
    }

    const normalized = normalizeNarration(resp.content, plan);
    return normalized;
  } catch (err) {
    console.error('AI narration pipeline failed', err);
    return fallbackNarration(plan);
  }
}

export function fallbackNarration(plan: JourneyPlan): AiNarration {
  if (plan.type === 'not_found') {
    return {
      summary: { duration: 'Unavailable', fare: 'Unavailable' },
      instructions: ['No connected TSRTC route was found for these stops. Try a nearby interchange stop.'],
      last_mile: 'Select a nearby known bus stop and retry.',
      travel_tip: 'Choose major interchanges like Secunderabad, Koti, Ameerpet, Uppal, LB Nagar, or Mehdipatnam.',
    };
  }

  return {
    summary: {
      duration: plan.duration,
      fare: `Rs ${plan.fare}`,
    },
    instructions: plan.steps.map((step) => `Take ${step.route} from ${step.from} to ${step.to}.`),
    last_mile: `Get down at ${plan.to} and walk or use a short local ride to the exact destination.`,
    travel_tip: plan.interchange
      ? `Change buses at ${plan.interchange}; it is the key transfer point for this trip.`
      : 'Check live bus status before boarding.',
  };
}

function normalizeNarration(value: unknown, plan: JourneyPlan): AiNarration {
  const narration = value as Partial<AiNarration>;
  const instructions = Array.isArray(narration.instructions)
    ? narration.instructions.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
    : [];

  return {
    summary: {
      duration: String(narration.summary?.duration || plan.duration),
      fare: String(narration.summary?.fare || `Rs ${plan.fare}`),
    },
    instructions: instructions.length ? instructions : fallbackNarration(plan).instructions,
    last_mile: String(narration.last_mile || fallbackNarration(plan).last_mile),
    travel_tip: String(narration.travel_tip || fallbackNarration(plan).travel_tip),
  };
}
