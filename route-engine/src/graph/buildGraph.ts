import type { BusRoute, BusStop, GraphEdge, RouteGraph } from '../types.js';
import { normalizeStopName, uniq } from '../utils/normalize.js';
import { calculateDistance } from '../utils/geoUtils.js';

function addEdge(graph: RouteGraph, from: string, to: string, routeNo: string, distanceM: number, travelTimeMin: number): void {
  const edges = graph.get(from) || [];
  const existing = edges.find((edge) => edge.to === to);

  if (existing) {
    existing.routes = uniq([...existing.routes, routeNo]).sort();
    // Keep the fastest observed travel time and smallest distance for the merged edge
    if (distanceM < (existing.distance_m ?? Infinity)) existing.distance_m = distanceM;
    if (travelTimeMin < (existing.travel_time_min ?? Infinity)) existing.travel_time_min = travelTimeMin;
    // recompute weight as integer minutes (travel time + small dwell)
    existing.weight = Math.max(1, Math.round((existing.travel_time_min ?? travelTimeMin)));
  } else {
    edges.push({ to, routes: [routeNo], distance_m: Math.round(distanceM), travel_time_min: Math.max(1, Math.round(travelTimeMin)), weight: Math.max(1, Math.round(travelTimeMin)) });
  }

  graph.set(from, edges);
}

export function buildGraph(routes: BusRoute[], stopByName: Map<string, BusStop>): RouteGraph {
  const graph: RouteGraph = new Map();

  // Conservative default speed (km/h) when route does not specify `avg_speed_kmph`.
  const DEFAULT_SPEED_KMPH = 20;
  // small dwell time per stop (seconds) to account for boarding/alighting; added to weight as minutes
  const STOP_DWELL_SEC = 20;

  for (const route of routes) {
    const speedKmph = route.avg_speed_kmph ?? DEFAULT_SPEED_KMPH;
    const metersPerMinute = (speedKmph * 1000) / 60;

    for (let i = 0; i < route.stops.length - 1; i += 1) {
      const rawFrom = route.stops[i];
      const rawTo = route.stops[i + 1];
      const from = stopByName.get(normalizeStopName(rawFrom))?.name || rawFrom;
      const to = stopByName.get(normalizeStopName(rawTo))?.name || rawTo;

      const stopA = stopByName.get(normalizeStopName(rawFrom));
      const stopB = stopByName.get(normalizeStopName(rawTo));

      // If coordinates are available, compute geographic distance; otherwise fallback to 0
      const distanceM = stopA && stopB ? calculateDistance({ lat: stopA.lat, lng: stopA.lng }, { lat: stopB.lat, lng: stopB.lng }) : 0;
      const travelTimeMin = distanceM > 0 ? Math.max(1, distanceM / metersPerMinute + STOP_DWELL_SEC / 60) : 1;

      addEdge(graph, from, to, route.route_no, distanceM, travelTimeMin);
      addEdge(graph, to, from, route.route_no, distanceM, travelTimeMin);
    }
  }

  return graph;
}

export function serializeGraph(graph: RouteGraph): Record<string, GraphEdge[]> {
  return Object.fromEntries([...graph.entries()].map(([stop, edges]) => [stop, edges.sort((a, b) => a.to.localeCompare(b.to))]));
}
