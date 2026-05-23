import type { BusRoute, JourneyStep, RouteGraph, RouteIndex, StopName } from '../types.js';
import { normalizeStopName } from '../utils/normalize.js';

export function resolveStopName(index: RouteIndex, input: string): StopName | null {
  return index.stopByName.get(normalizeStopName(input))?.name || null;
}

export function routeContainsSegment(route: BusRoute, from: StopName, to: StopName): boolean {
  return route.stops.includes(from) && route.stops.includes(to);
}

export function segmentStops(route: BusRoute, from: StopName, to: StopName): StopName[] {
  const fromIndex = route.stops.indexOf(from);
  const toIndex = route.stops.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return [];
  return fromIndex <= toIndex
    ? route.stops.slice(fromIndex, toIndex + 1)
    : route.stops.slice(toIndex, fromIndex + 1).reverse();
}

export function countStopsInSteps(steps: JourneyStep[]): number {
  return steps.reduce((total, step) => total + Math.max(1, step.stops.length - 1), 0);
}

export function findShortestStopPath(graph: RouteGraph, from: StopName, to: StopName): StopName[] {
  if (from === to) return [from];

  const queue: StopName[] = [from];
  const visited = new Set<StopName>([from]);
  const previous = new Map<StopName, StopName>();

  while (queue.length) {
    const current = queue.shift() as StopName;
    for (const edge of graph.get(current) || []) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      previous.set(edge.to, current);
      if (edge.to === to) return reconstructPath(previous, from, to);
      queue.push(edge.to);
    }
  }

  return [];
}

function reconstructPath(previous: Map<StopName, StopName>, from: StopName, to: StopName): StopName[] {
  const path = [to];
  let current = to;

  while (current !== from) {
    const prior = previous.get(current);
    if (!prior) return [];
    path.unshift(prior);
    current = prior;
  }

  return path;
}
