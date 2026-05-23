import type { RouteIndex, StopName } from '../types.js';
import { normalizeStopName } from './normalize.js';

export type GeoPoint = { lat: number; lng: number };

export function calculateDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const hav = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return Math.round(R * c);
}

export function estimateWalkingTime(distanceMeters: number, walkingKmph = 5): number {
  const metersPerMinute = (walkingKmph * 1000) / 60;
  return Math.ceil(distanceMeters / metersPerMinute);
}

export function findNearestStops(index: RouteIndex, point: GeoPoint, maxResults = 3, maxRadiusMeters = 1200) {
  const list: Array<{ stop: StopName; distance: number }> = [];
  for (const stop of index.stops) {
    const dist = calculateDistance(point, { lat: stop.lat, lng: stop.lng });
    if (dist <= maxRadiusMeters) list.push({ stop: stop.name, distance: dist });
  }

  list.sort((a, b) => a.distance - b.distance);
  return list.slice(0, maxResults).map((item) => ({ stop: item.stop as StopName, distance_m: item.distance }));
}

export function findNearestStopsByName(index: RouteIndex, name: string, maxResults = 3, maxRadiusMeters = 1200) {
  const stop = index.stopByName.get(normalizeStopName(name));
  if (!stop) return [];
  return findNearestStops(index, { lat: stop.lat, lng: stop.lng }, maxResults, maxRadiusMeters);
}

export default {
  calculateDistance,
  estimateWalkingTime,
  findNearestStops,
  findNearestStopsByName,
};
