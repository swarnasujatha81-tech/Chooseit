import type { BusRoute, JourneyPlan, JourneyStep, RouteIndex, StopName } from '../types.js';
import { countStopsInSteps, resolveStopName, routeContainsSegment, segmentStops } from '../graph/graphUtils.js';
import { dijkstra } from '../graph/weightedDijkstra.js';
import { TtlCache } from './cache.js';
import { normalizeStopName } from '../utils/normalize.js';

const planCache = new TtlCache<JourneyPlan>(1000 * 60 * 10);

export function findDirectBus(index: RouteIndex, fromInput: string, toInput: string): JourneyPlan | null {
  const from = resolveStopName(index, fromInput);
  const to = resolveStopName(index, toInput);
  if (!from || !to) return null;

  const directRoutes = (index.routesByStop.get(from) || [])
    .filter((route) => routeContainsSegment(route, from, to))
    .sort((a, b) => segmentStops(a, from, to).length - segmentStops(b, from, to).length);

  if (!directRoutes.length) return null;
  const route = directRoutes[0];
  const step = makeStep(route, from, to);
  const plan = makePlan('direct', from, to, [step], undefined, 'high', index);
  return plan;
}

export function findInterchangeRoute(index: RouteIndex, fromInput: string, toInput: string): JourneyPlan | null {
  const from = resolveStopName(index, fromInput);
  const to = resolveStopName(index, toInput);
  if (!from || !to) return null;

  const fromRoutes = index.routesByStop.get(from) || [];
  const toRoutes = index.routesByStop.get(to) || [];
  const candidates: Array<{ plan: JourneyPlan; score: number }> = [];

  for (const firstRoute of fromRoutes) {
    for (const secondRoute of toRoutes) {
      if (firstRoute.route_no === secondRoute.route_no) continue;
      const commonStops = firstRoute.stops.filter((stop) => secondRoute.stops.includes(stop));
      for (const interchange of commonStops) {
        const stop = index.stopByName.get(normalizeStopName(interchange));
        const interchangeBonus = stop?.is_interchange ? 0 : 4;
        const firstStep = makeStep(firstRoute, from, interchange);
        const secondStep = makeStep(secondRoute, interchange, to);
        if (!firstStep.stops.length || !secondStep.stops.length) continue;
        const plan = makePlan('interchange', from, to, [firstStep, secondStep], interchange, stop?.is_interchange ? 'high' : 'medium', index);
        candidates.push({ plan, score: scorePlan(plan) + interchangeBonus });
      }
    }
  }

  if (!candidates.length) return null;
  return candidates.sort((a, b) => a.score - b.score)[0].plan;
}

export function findShortestPath(index: RouteIndex, fromInput: string, toInput: string): JourneyPlan | null {
  const from = resolveStopName(index, fromInput);
  const to = resolveStopName(index, toInput);
  if (!from || !to) return null;
  const dij = dijkstra(index.graph, from, to);
  if (!dij.path.length) return null;

  const path = dij.path;
  const steps: JourneyStep[] = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const current = path[i];
    const next = path[i + 1];
    const routeNo = index.graph.get(current)?.find((edge) => edge.to === next)?.routes[0];
    if (!routeNo) continue;
    const last = steps[steps.length - 1];
    if (last?.route === routeNo) {
      last.to = next;
      last.stops.push(next);
    } else {
      steps.push({ route: routeNo, from: current, to: next, stops: [current, next] });
    }
  }

  const plan = makePlan(steps.length > 1 ? 'interchange' : 'multi_stop', from, to, steps, steps[1]?.from, 'medium', index);
  if (!plan.debug) plan.debug = {};
  plan.debug.algorithm = 'dijkstra';
  plan.debug.visited_nodes = dij.visited_nodes;
  plan.estimated_duration_min = Number.isFinite(dij.estimated_duration_min) ? dij.estimated_duration_min : undefined;
  return plan;
}

export function planJourney(index: RouteIndex, from: string, to: string): JourneyPlan {
  const cacheKey = `${from.toLowerCase()}::${to.toLowerCase()}`;
  const cached = planCache.get(cacheKey);
  if (cached) return cached;

  const direct = findDirectBus(index, from, to);
  const plan = direct
    || findInterchangeRoute(index, from, to)
    || findShortestPath(index, from, to)
    || {
      type: 'not_found' as const,
      from,
      to,
      steps: [],
      path: [],
      duration: 'Unavailable',
      fare: 'Unavailable',
      transfers: 0,
      confidence: 'low' as const,
    };

  planCache.set(cacheKey, plan);
  return plan;
}

function makeStep(route: BusRoute, from: StopName, to: StopName): JourneyStep {
  return {
    route: route.route_no,
    from,
    to,
    stops: segmentStops(route, from, to),
  };
}

function makePlan(type: JourneyPlan['type'], from: StopName, to: StopName, steps: JourneyStep[], interchange?: StopName, confidence: JourneyPlan['confidence'] = 'medium', index?: RouteIndex): JourneyPlan {
  const stopCount = countStopsInSteps(steps);
  const transfers = Math.max(0, steps.length - 1);
  const min = Math.max(12, stopCount * 4 + transfers * 10);
  const max = min + 18 + transfers * 6;
  const fareLow = Math.max(15, Math.round((12 + stopCount * 2.4 + transfers * 8) / 5) * 5);
  const fareHigh = fareLow + (transfers ? 10 : 5);

  const plan: JourneyPlan = {
    type,
    from,
    to,
    steps,
    interchange,
    path: steps.flatMap((step, idx) => (idx === 0 ? step.stops : step.stops.slice(1))),
    duration: `${min}-${max} min`,
    fare: `${fareLow}-${fareHigh}`,
    transfers,
    confidence,
  };

  // Add numeric estimates and scoring where possible without breaking the contract
  if (index) {
    // compute estimated duration by summing edge travel_time_min where available
    let totalMin = 0;
    const routeWaits: number[] = [];
    for (const step of steps) {
      const routeMeta = index.routeByNo.get(step.route);
      if (routeMeta && typeof routeMeta.avg_wait_min === 'number') routeWaits.push(routeMeta.avg_wait_min);

      for (let i = 0; i < step.stops.length - 1; i += 1) {
        const a = step.stops[i];
        const b = step.stops[i + 1];
        const edge = index.graph.get(a)?.find((e) => e.to === b);
        if (edge) {
          totalMin += (edge.travel_time_min ?? edge.weight ?? 1);
        } else {
          totalMin += 1;
        }
      }
    }

    plan.estimated_duration_min = Math.round(totalMin);
    const avgWait = routeWaits.length ? routeWaits.reduce((s, v) => s + v, 0) / routeWaits.length : 8; // fallback
    const waitPenalty = avgWait;
    const transferPenalty = transfers;
    const travelTime = plan.estimated_duration_min ?? min;
    plan.score = Math.round(travelTime + waitPenalty * 2 + transferPenalty * 10);

    // walking distance left undefined here; callers resolving lat/lng will set walking_distance_m
    plan.debug = plan.debug ?? {};
  }

  return plan;
}

function scorePlan(plan: JourneyPlan): number {
  return countStopsInSteps(plan.steps) + plan.transfers * 8;
}
