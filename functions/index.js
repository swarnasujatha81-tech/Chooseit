import OpenAI from 'openai';
import { initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

initializeApp();

const openAiKey = defineSecret('OPENAI_API_KEY');

const ROUTES = [
  '10H Secunderabad - Kondapur',
  '10K Secunderabad - Kukatpally',
  '16A Secunderabad - ECIL',
  '17H Uppal - Mehdipatnam',
  '25S Suchitra - Chandrayangutta',
  '27E Jubilee Bus Station - ECIL',
  '49 Secunderabad - Afzalgunj',
  '65 Charminar - Mehdipatnam',
  '90L LB Nagar - Secunderabad',
  '113M Uppal - Lingampally',
  '127K Koti - Kondapur',
  '218D Dilsukhnagar - Patancheru',
  '222A Patancheru - Charminar',
  '300 Uppal - Mehdipatnam',
];

function crowdFromCount(count, maxCapacity = 50) {
  const ratio = count / maxCapacity;
  if (ratio < 0.3) return 'empty';
  if (ratio < 0.6) return 'available';
  if (ratio < 0.85) return 'standing';
  return 'overcrowded';
}

function normalizeJourneyStep(step) {
  if (typeof step === 'string') return step;
  if (step?.text) return String(step.text);
  if (step?.instruction) return String(step.instruction);
  if (step?.description) return String(step.description);
  return '';
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

export const planJourney = onCall({ secrets: [openAiKey], timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  const {
    origin,
    destination,
    startStop,
    endStop,
    activeBuses = [],
    availableRoutes = ROUTES,
    allStops = [],
  } = request.data || {};
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng || !startStop?.name || !endStop?.name) {
    throw new HttpsError('invalid-argument', 'origin, destination, startStop and endStop are required.');
  }

  const busContext = activeBuses.slice(0, 12).map((bus) => ({
    bus_number: bus.bus_number || 'Bus',
    route_name: bus.route_name || 'Unknown route',
    crowd_level: bus.crowd_level || 'unknown',
    passenger_count: bus.passenger_count || 0,
  }));

  const client = new OpenAI({ apiKey: openAiKey.value() });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: [
          'You are a Hyderabad TSRTC journey planner.',
          'Use only the supplied stops, routes, and live bus context.',
          'Always guide the passenger to the pinned destination by RTC/TSRTC bus first.',
          'Your steps must include nearest boarding stop, suitable bus route names when supplied, bus change or interchange if required, where to get down, and what to do after getting down.',
          'Do not invent exact route numbers. If no direct listed route is suitable, recommend a transfer via a listed major interchange or a generic TSRTC service from the nearest stop.',
          'Never make walking the main recommendation when any walking segment is more than 10 minutes.',
          'Fallback priority after RTC must be: short walk, share auto, then Rapido/bike taxi only as the last option.',
          'Return compact JSON only with routeTitle, totalTime, fare, steps, lastMile, tip, confidence.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          origin,
          destination,
          startStop,
          endStop,
          availableRoutes,
          knownStops: allStops,
          liveBuses: busContext,
          constraints: 'Start with RTC bus guidance to the pinned destination. Include nearest stop, suitable buses, transfers, alighting stop, and last-mile action. For walks over 10 minutes, recommend short walk only if reasonable, then share auto, and Rapido only as last priority.',
        }),
      },
    ],
  });

  try {
    const plan = JSON.parse(response.choices?.[0]?.message?.content || '{}');
    return {
      routeTitle: String(plan.routeTitle || 'TSRTC bus + local fallback'),
      totalTime: String(plan.totalTime || 'Estimate unavailable'),
      fare: String(plan.fare || 'Fare varies'),
      steps: Array.isArray(plan.steps) ? plan.steps.slice(0, 8).map(normalizeJourneyStep).filter(Boolean) : [],
      lastMile: String(plan.lastMile || `Walk from ${endStop.name} to your destination.`),
      tip: String(plan.tip || 'Check the live map before boarding because service and traffic can change.'),
      confidence: String(plan.confidence || 'medium'),
    };
  } catch {
    throw new HttpsError('internal', 'Could not parse journey plan.');
  }
});
