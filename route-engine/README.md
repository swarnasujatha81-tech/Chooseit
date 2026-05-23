# TSRTC Route Graph Engine

Production-ready TypeScript route engine for Hyderabad bus journey planning.

## What It Does

- Stores Hyderabad bus stops in `src/data/busStops.json`.
- Stores TSRTC-style routes in `src/data/routes.json`.
- Builds a bidirectional stop graph.
- Finds direct buses.
- Finds one-interchange routes.
- Falls back to BFS shortest path.
- Exposes an Express API.
- Sends calculated route results to AI only for narration.

AI does not calculate routes and cannot invent bus numbers.

## Folder Structure

```text
route-engine/
  src/
    api/
      journeyRoutes.ts
      rateLimit.ts
    data/
      busStops.json
      routes.json
      dataLoader.ts
    examples/
      reactNativeJourneyClient.tsx
    graph/
      buildGraph.ts
      graphUtils.ts
    services/
      aiNarrationService.ts
      cache.ts
      routeFinder.ts
    utils/
      normalize.ts
    server.ts
    types.ts
```

## Run

```powershell
cd route-engine
npm install
npm run dev
```

Health check:

```text
GET http://localhost:8080/health
```

## API

### POST `/plan-journey`

Request:

```json
{
  "from": "Kukatpally",
  "to": "ECIL"
}
```

Response:

```json
{
  "type": "interchange",
  "steps": [
    {
      "route": "10H",
      "from": "Kukatpally",
      "to": "Secunderabad"
    },
    {
      "route": "16A",
      "from": "Secunderabad",
      "to": "ECIL"
    }
  ],
  "duration": "55-75 min",
  "fare": "35-45"
}
```

Other endpoints:

- `GET /stops`
- `GET /routes`
- `GET /graph`
- `POST /find-direct-bus`
- `POST /find-interchange-route`
- `POST /find-shortest-path`

## AI Integration

`src/services/aiNarrationService.ts` receives the already-calculated `JourneyPlan`.

Rules:

- AI only narrates route results.
- AI never calculates routes.
- AI never invents route numbers.
- Fallback narration is returned if OpenAI fails or no API key is configured.

## Scaling Path

Current:

- JSON seed database.
- In-memory graph.
- In-memory TTL cache.
- In-memory IP rate limiter.

Later:

- Move stops/routes to PostgreSQL or MongoDB.
- Store route graph snapshots in Redis.
- Use Dijkstra/A* with live bus delay weights.
- Move rate limiting to Redis or API gateway.
- Cache route plans by normalized stop-pair key.
- Cache AI narration by route plan hash.
