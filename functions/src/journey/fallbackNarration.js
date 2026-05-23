import { fallbackInstructions } from './routeSchema.js';

export function buildFallbackNarration(routeJson) {
  return {
    summary: {
      duration: routeJson.duration,
      fare: `Rs ${routeJson.fare}`,
    },
    instructions: fallbackInstructions(routeJson),
    last_mile: routeJson.last_mile,
    travel_tip: 'Check the live map before boarding because traffic and bus availability can change.',
  };
}
