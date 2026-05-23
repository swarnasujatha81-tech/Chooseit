# AI Journey Planner

## Folder Structure

```text
functions/
  index.js
  src/journey/
    cache.js
    fallbackNarration.js
    openAiNarrator.js
    planJourney.js
    prompts.js
    rateLimit.js
    routeCalculator.js
    routeSchema.js
    tsrtcData.js
src/
  api/firebaseBackend.js
  components/JourneyPlanner.jsx
```

## API Endpoint

Firebase callable:

```js
const planJourney = httpsCallable(functions, 'planJourney');

const response = await planJourney({
  origin: { lat: 17.4937, lng: 78.3934 },
  destination: { lat: 17.48, lng: 78.55 },
  availableRoutes: ROUTE_LIST,
  allStops: STOPS,
});
```

The backend calculates `route` first, then asks OpenAI to narrate it. OpenAI never receives permission to invent routes.

## Route JSON Schema

```json
{
  "from": "JNTU",
  "to": "AS Rao Nagar",
  "duration": "90-120 min",
  "fare": "45-65",
  "steps": [
    {
      "type": "walk",
      "distance": "150m",
      "instruction": "Walk to JNTU Kukatpally bus stop"
    },
    {
      "type": "bus",
      "routes": ["17H/219", "31H"],
      "from_stop": "JNTU",
      "to_stop": "Secunderabad"
    },
    {
      "type": "transfer",
      "routes": ["16A", "17H"],
      "from_stop": "Secunderabad",
      "to_stop": "AS Rao Nagar"
    }
  ]
}
```

## AI Output

```json
{
  "summary": {
    "duration": "90-120 min",
    "fare": "Rs 45-65"
  },
  "instructions": [
    "Walk 150m to JNTU Kukatpally bus stop.",
    "Board 17H/219 or 31H toward Secunderabad.",
    "At Secunderabad, transfer to 16A or 17H for AS Rao Nagar."
  ],
  "last_mile": "Walk from AS Rao Nagar stop to the destination marker.",
  "travel_tip": "Check live crowd status before boarding."
}
```

## React Native Calling Example

```js
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function getJourneyNarration(origin, destination) {
  const planJourney = httpsCallable(functions, 'planJourney');
  const { data } = await planJourney({ origin, destination });
  return data;
}
```

## Security and Scale

- Store `OPENAI_API_KEY` as a Firebase secret, never in React or React Native.
- Use `OPENAI_JOURNEY_MODEL=gpt-4.1-mini` or `gpt-4o-mini`.
- Keep prompts short and send only the calculated route JSON.
- Cache repeated route narrations by normalized route JSON.
- Replace in-memory cache/rate limit with Redis, Memorystore, Firestore TTL docs, or Cloud Armor for 10k+ users.
- Always show backend fallback instructions when OpenAI fails.
