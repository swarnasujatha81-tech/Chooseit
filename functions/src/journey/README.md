# AI Journey Planner Architecture

Frontend sends selected map marker coordinates to `planJourney`.

Backend flow:
1. Validate origin/destination.
2. Rate-limit the caller.
3. Calculate the TSRTC route JSON from local route data.
4. Cache repeated narration requests.
5. Send only the route JSON to OpenAI.
6. Validate/normalize the strict JSON response.
7. Return fallback instructions if AI fails.

OpenAI is intentionally not allowed to calculate routes or invent bus numbers.

Production scaling notes:
- Replace in-memory rate limiting with Redis, Firestore TTL docs, or Cloud Armor for multi-instance accuracy.
- Replace in-memory cache with Redis/Memorystore or Firestore for 10k+ users.
- Cache by normalized source/destination grid cell plus route JSON hash.
- Keep `max_tokens` low and use `gpt-4.1-mini` or `gpt-4o-mini`.
- Store `OPENAI_API_KEY` in Firebase Secret Manager only.
- Never expose the OpenAI key to React or React Native clients.
