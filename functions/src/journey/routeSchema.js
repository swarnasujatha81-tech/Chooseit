export const journeyNarrationSchema = {
  name: 'journey_narration',
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

export function isPoint(value) {
  return Number.isFinite(Number(value?.lat)) && Number.isFinite(Number(value?.lng));
}

export function sanitizeString(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function normalizeNarration(value, routeJson) {
  const instructions = Array.isArray(value?.instructions)
    ? value.instructions.map((item) => sanitizeString(item)).filter(Boolean).slice(0, 6)
    : [];

  return {
    summary: {
      duration: sanitizeString(value?.summary?.duration, routeJson.duration),
      fare: sanitizeString(value?.summary?.fare, `Rs ${routeJson.fare}`),
    },
    instructions: instructions.length ? instructions : fallbackInstructions(routeJson),
    last_mile: sanitizeString(value?.last_mile, routeJson.last_mile),
    travel_tip: sanitizeString(value?.travel_tip, 'Check live bus movement before boarding.'),
  };
}

export function fallbackInstructions(routeJson) {
  return routeJson.steps.map((step) => {
    if (step.type === 'walk') return step.instruction;
    if (step.type === 'bus') return `Board ${step.routes.join(' or ')} from ${step.from_stop} and get down at ${step.to_stop}.`;
    if (step.type === 'transfer') return `Transfer at ${step.from_stop} to ${step.routes.join(' or ')} toward ${step.to_stop}.`;
    return step.instruction || `Continue from ${step.from_stop || routeJson.from} to ${step.to_stop || routeJson.to}.`;
  }).filter(Boolean).slice(0, 6);
}
