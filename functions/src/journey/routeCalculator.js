import { ROUTES, STOPS } from './tsrtcData.js';

function haversine(lat1, lng1, lat2, lng2) {
  const toRad = (n) => (n * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestStop(point, stops = STOPS) {
  return stops
    .map((stop) => ({ ...stop, distance: haversine(point.lat, point.lng, stop.lat, stop.lng) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function placeKey(name) {
  return String(name).toLowerCase().replace(/ bus (stand|station|stop)/g, '').trim();
}

function routesForStop(stop, routes = ROUTES) {
  const key = placeKey(stop.name);
  return routes.filter((route) => route.toLowerCase().includes(key));
}

function routeNumbers(routes) {
  return routes.map((route) => route.split(' ')[0]).filter(Boolean);
}

function moneyRange(low, high) {
  return `${low}-${high}`;
}

export function calculateJourneyRoute({ origin, destination, availableRoutes = ROUTES, allStops = STOPS }) {
  const startStop = nearestStop(origin, allStops);
  const endStop = nearestStop(destination, allStops);
  const directRoutes = routesForStop(startStop, availableRoutes).filter((route) => routesForStop(endStop, availableRoutes).includes(route));
  const startRoutes = routesForStop(startStop, availableRoutes);
  const endRoutes = routesForStop(endStop, availableRoutes);
  const roadDistance = haversine(origin.lat, origin.lng, destination.lat, destination.lng);
  const walkToStartMeters = Math.max(80, Math.round(startStop.distance * 1000));
  const walkFromEndMeters = Math.max(80, Math.round(endStop.distance * 1000));
  const busMinutes = Math.max(15, Math.round(roadDistance * 4.2));
  const transferMinutes = directRoutes.length ? 8 : 18;
  const totalMinutes = Math.max(20, Math.round(walkToStartMeters / 80) + busMinutes + Math.round(walkFromEndMeters / 80) + transferMinutes);
  const fareLow = Math.max(15, Math.round(roadDistance * 2.1 / 5) * 5);
  const fareHigh = fareLow + (directRoutes.length ? 10 : 20);

  const steps = [
    {
      type: 'walk',
      distance: `${walkToStartMeters}m`,
      instruction: `Walk to ${startStop.name}`,
    },
  ];

  if (startStop.name === endStop.name) {
    steps.push({
      type: 'walk',
      distance: `${walkFromEndMeters}m`,
      instruction: `Continue from ${endStop.name} to the destination marker`,
    });
  } else if (directRoutes.length) {
    steps.push({
      type: 'bus',
      routes: routeNumbers(directRoutes.slice(0, 3)),
      from_stop: startStop.name,
      to_stop: endStop.name,
    });
  } else {
    const interchange = allStops.find((stop) => stop.name === 'Secunderabad Bus Stand') || allStops[0];
    steps.push({
      type: 'bus',
      routes: routeNumbers(startRoutes.slice(0, 3)),
      from_stop: startStop.name,
      to_stop: interchange.name,
    });
    steps.push({
      type: 'transfer',
      routes: routeNumbers(endRoutes.slice(0, 3)),
      from_stop: interchange.name,
      to_stop: endStop.name,
    });
  }

  if (startStop.name !== endStop.name) {
    steps.push({
      type: 'walk',
      distance: `${walkFromEndMeters}m`,
      instruction: `Walk from ${endStop.name} to the destination marker`,
    });
  }

  return {
    from: startStop.name,
    to: endStop.name,
    duration: `${Math.max(15, totalMinutes - 10)}-${totalMinutes + 15} min`,
    fare: moneyRange(fareLow, fareHigh),
    distance_km: Number(roadDistance.toFixed(1)),
    transfer_required: !directRoutes.length && startStop.name !== endStop.name,
    steps,
    last_mile: walkFromEndMeters > 800
      ? `From ${endStop.name}, prefer share auto for the last ${walkFromEndMeters}m; use bike taxi only if needed.`
      : `Walk about ${walkFromEndMeters}m from ${endStop.name} to the destination marker.`,
  };
}
