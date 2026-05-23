import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { calculateJourneyRoute } from './routeCalculator.js';
import { assertRateLimit } from './rateLimit.js';
import { isPoint } from './routeSchema.js';
import { ROUTES, STOPS } from './tsrtcData.js';
import { narrateJourneyRoute } from './openAiNarrator.js';

export function createPlanJourneyFunction(openAiKey) {
  return onCall({ secrets: [openAiKey], timeoutSeconds: 30, memory: '512MiB' }, async (request) => {
    const { origin, destination, availableRoutes = ROUTES, allStops = STOPS } = request.data || {};

    if (!isPoint(origin) || !isPoint(destination)) {
      throw new HttpsError('invalid-argument', 'origin and destination must include numeric lat/lng.');
    }

    const clientKey = request.auth?.uid || request.rawRequest.ip || 'anonymous';
    const limit = assertRateLimit(`journey:${clientKey}`, { limit: 12, windowMs: 60_000 });
    if (!limit.allowed) {
      throw new HttpsError('resource-exhausted', 'Too many journey requests. Please try again shortly.', {
        retryAfterMs: limit.retryAfterMs,
      });
    }

    const routeJson = calculateJourneyRoute({
      origin: { lat: Number(origin.lat), lng: Number(origin.lng) },
      destination: { lat: Number(destination.lat), lng: Number(destination.lng) },
      availableRoutes,
      allStops,
    });

    const model = process.env.OPENAI_JOURNEY_MODEL || 'gpt-4.1-mini';
    const { narration, source } = await narrateJourneyRoute({
      apiKey: openAiKey.value(),
      routeJson,
      model,
    });

    return {
      route: routeJson,
      ...narration,
      source,
    };
  });
}
