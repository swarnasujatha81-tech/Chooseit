import stopsJson from './busStops.json' with { type: 'json' };
import routesJson from './routes.json' with { type: 'json' };
import { buildGraph } from '../graph/buildGraph.js';
import type { BusRoute, BusStop, RouteIndex } from '../types.js';
import { normalizeStopName } from '../utils/normalize.js';

function assertStop(value: unknown): asserts value is BusStop {
  const stop = value as BusStop;
  if (!stop?.id || !stop?.name || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) {
    throw new Error(`Invalid bus stop record: ${JSON.stringify(value)}`);
  }
}

function assertRoute(value: unknown): asserts value is BusRoute {
  const route = value as BusRoute;
  if (!route?.route_no || !Array.isArray(route.stops) || route.stops.length < 2) {
    throw new Error(`Invalid route record: ${JSON.stringify(value)}`);
  }
}

export function loadRouteIndex(): RouteIndex {
  const stops = stopsJson as BusStop[];
  const routes = routesJson as BusRoute[];

  stops.forEach(assertStop);
  routes.forEach(assertRoute);

  const stopByName = new Map<string, BusStop>();
  for (const stop of stops) {
    const key = normalizeStopName(stop.name);
    if (stopByName.has(key)) throw new Error(`Duplicate stop name: ${stop.name}`);
    stopByName.set(key, stop);
  }

  for (const route of routes) {
    for (const stopName of route.stops) {
      if (!stopByName.has(normalizeStopName(stopName))) {
        throw new Error(`Route ${route.route_no} references missing stop: ${stopName}`);
      }
    }
  }

  const routeByNo = new Map(routes.map((route) => [route.route_no, route]));
  const routesByStop = new Map<string, BusRoute[]>();

  for (const route of routes) {
    for (const stopName of route.stops) {
      const canonicalName = stopByName.get(normalizeStopName(stopName))?.name || stopName;
      routesByStop.set(canonicalName, [...(routesByStop.get(canonicalName) || []), route]);
    }
  }

  return {
    stops,
    routes,
    graph: buildGraph(routes, stopByName),
    stopByName,
    routeByNo,
    routesByStop,
  };
}
