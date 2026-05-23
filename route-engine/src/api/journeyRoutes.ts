import { Router } from 'express';
import { serializeGraph } from '../graph/buildGraph.js';
import { resolveStopName } from '../graph/graphUtils.js';
import { narrateJourney } from '../services/aiNarrationService.js';
import { findDirectBus, findInterchangeRoute, findShortestPath, planJourney } from '../services/routeFinder.js';
import { findNearestStops } from '../utils/geoUtils.js';
import type { RouteIndex } from '../types.js';
import { rateLimit } from './rateLimit.js';

type CoordinateInput = { lat: number; lng: number };
type StopInput = string | CoordinateInput;

function isCoordinateInput(value: unknown): value is CoordinateInput {
  const point = value as CoordinateInput;
  return Boolean(point) && typeof point === 'object' && Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function isStopInput(value: unknown): value is StopInput {
  return (typeof value === 'string' && Boolean(value.trim())) || isCoordinateInput(value);
}

export function createJourneyRouter(index: RouteIndex): Router {
  const router = Router();

  router.get('/stops', (_request, response) => {
    response.json({ count: index.stops.length, stops: index.stops });
  });

  router.get('/routes', (_request, response) => {
    response.json({ count: index.routes.length, routes: index.routes });
  });

  router.get('/graph', (_request, response) => {
    response.json(serializeGraph(index.graph));
  });

  router.post('/find-direct-bus', rateLimit(), (request, response) => {
    const { from, to } = request.body || {};
    if (typeof from !== 'string' || typeof to !== 'string' || !from.trim() || !to.trim()) {
      response.status(400).json({ error: 'from and to are required' });
      return;
    }
    response.json(findDirectBus(index, from, to));
  });

  router.post('/find-interchange-route', rateLimit(), (request, response) => {
    const { from, to } = request.body || {};
    if (typeof from !== 'string' || typeof to !== 'string' || !from.trim() || !to.trim()) {
      response.status(400).json({ error: 'from and to are required' });
      return;
    }
    response.json(findInterchangeRoute(index, from, to));
  });

  router.post('/find-shortest-path', rateLimit(), (request, response) => {
    const { from, to } = request.body || {};
    if (typeof from !== 'string' || typeof to !== 'string' || !from.trim() || !to.trim()) {
      response.status(400).json({ error: 'from and to are required' });
      return;
    }
    response.json(findShortestPath(index, from, to));
  });

  router.post('/plan-journey', rateLimit({ limit: 30, windowMs: 60_000 }), async (request, response) => {
    const { from, to, include_ai = true, max_walking_m = 1200 } = request.body || {};
    if (!isStopInput(from) || !isStopInput(to)) {
      response.status(400).json({ error: 'from and to must be stop names or { lat, lng } objects' });
      return;
    }

    let resolvedFrom: string | null = null;
    let resolvedTo: string | null = null;
    const debug: Record<string, unknown> = {};
    const walkingRadius = Number.isFinite(Number(max_walking_m)) ? Number(max_walking_m) : 1200;

    if (isCoordinateInput(from)) {
      const nearest = findNearestStops(index, { lat: from.lat, lng: from.lng }, 1, walkingRadius);
      if (nearest.length) {
        resolvedFrom = nearest[0].stop;
        debug.from_nearest = nearest;
      }
    } else if (typeof from === 'string') {
      resolvedFrom = resolveStopName(index, from);
    }

    if (isCoordinateInput(to)) {
      const nearest = findNearestStops(index, { lat: to.lat, lng: to.lng }, 1, walkingRadius);
      if (nearest.length) {
        resolvedTo = nearest[0].stop;
        debug.to_nearest = nearest;
      }
    } else if (typeof to === 'string') {
      resolvedTo = resolveStopName(index, to);
    }

    if (!resolvedFrom || !resolvedTo) {
      response.status(404).json({
        error: 'Unknown stop',
        from_found: Boolean(resolvedFrom),
        to_found: Boolean(resolvedTo),
        debug,
      });
      return;
    }

    const plan = planJourney(index, resolvedFrom, resolvedTo);
    if (isCoordinateInput(from) && plan.estimated_duration_min !== undefined && debug.from_nearest) {
      const fromNearest = (debug.from_nearest as Array<{ distance_m: number }>)[0];
      plan.walking_distance_m = fromNearest.distance_m;
    }
    if (isCoordinateInput(to) && debug.to_nearest) {
      const toNearest = (debug.to_nearest as Array<{ distance_m: number }>)[0];
      plan.walking_distance_m = (plan.walking_distance_m || 0) + toNearest.distance_m;
    }

    const narration = include_ai ? await narrateJourney(plan) : undefined;

    response.json({
      ...plan,
      narration,
      debug,
    });
  });

  return router;
}
