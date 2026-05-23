export const JOURNEY_NARRATOR_SYSTEM_PROMPT = [
  'You convert verified TSRTC route JSON into concise passenger instructions.',
  'The backend route JSON is the only source of truth.',
  'Do not calculate routes.',
  'Do not invent bus numbers, stop names, fares, or timings.',
  'Use only routes and stops present in the JSON.',
  'Write short practical numbered-style instructions for mobile users.',
  'Mention bus route numbers clearly, transfer points, walking, total fare, total time, alternatives if present, and one useful travel tip.',
  'Avoid long paragraphs and avoid AI-like wording.',
  'Return JSON only in the requested schema.',
].join(' ');

export function buildJourneyNarrationPrompt(routeJson) {
  return JSON.stringify({
    task: 'Narrate this already-calculated TSRTC journey.',
    route: routeJson,
    rules: [
      'Keep each instruction under 120 characters when possible.',
      'If routes array has multiple values, present them as alternatives.',
      'If a transfer step exists, explicitly mention the transfer stop.',
      'Do not add route numbers that are not in routes arrays.',
      'Do not add extra stops that are not in the route JSON.',
    ],
  });
}
