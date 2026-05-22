import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MapPin, RefreshCw, Route, X } from 'lucide-react';
import { backend } from '@/api/firebaseBackend';
import { haversine, ROUTE_LIST, STOPS } from '@/data';

const DEFAULT_ORIGIN = { lat: 17.4937, lng: 78.3934 };

const getNearest = (point) => STOPS
  .map((stop) => ({ ...stop, distance: haversine(point.lat, point.lng, stop.lat, stop.lng) }))
  .sort((a, b) => a.distance - b.distance)[0];

const placeKey = (name) => name.toLowerCase().replace(/ bus (stand|station|stop)/g, '').trim();

const routesForStop = (stop) => {
  const key = placeKey(stop.name);
  return ROUTE_LIST.filter((route) => route.toLowerCase().includes(key));
};

const routeNames = (routes) => (routes.length ? routes.slice(0, 2).join(' or ') : 'the next suitable TSRTC bus');

const buildLocalPlan = ({ startStop, endStop, origin, destination, activeBusCount = 0 }) => {
  const directRoutes = routesForStop(startStop).filter((route) => routesForStop(endStop).includes(route));
  const startRoutes = routesForStop(startStop);
  const endRoutes = routesForStop(endStop);
  const roadDistance = haversine(origin.lat, origin.lng, destination.lat, destination.lng);
  const walkToStart = Math.max(2, Math.round(startStop.distance * 12));
  const walkFromEnd = Math.max(2, Math.round(endStop.distance * 12));
  const shouldAvoidWalkOnly = roadDistance * 14 > 10;
  const noUsefulRtcHint = activeBusCount === 0 && !directRoutes.length;
  const busMinutes = Math.max(15, Math.round(roadDistance * 4.2));
  const totalMin = walkToStart + busMinutes + walkFromEnd + (directRoutes.length ? 8 : 18);
  const fareLow = Math.max(15, Math.round(roadDistance * 2.1 / 5) * 5);
  const fareHigh = fareLow + (directRoutes.length ? 10 : 20);

  if (startStop.name === endStop.name) {
    const walkMinutes = Math.max(3, Math.round(roadDistance * 14));
    if (walkMinutes > 10) {
      const rideFare = Math.max(25, Math.round(roadDistance * 18 / 10) * 10);
      return {
        routeTitle: 'RTC nearest stop + fallback',
        totalTime: `${Math.max(8, Math.round(roadDistance * 4))} - ${Math.max(14, Math.round(roadDistance * 6))} min`,
        fare: `Rs ${rideFare} - Rs ${rideFare + 50}`,
        steps: [
          `Go to the nearest RTC stop: ${startStop.name}.`,
          `Ask for a TSRTC bus heading closest to ${endStop.name}; if needed, change at a major stop such as Secunderabad Bus Stand.`,
          `Get down at ${endStop.name}, the closest known RTC stop to your pinned destination.`,
          `The pinned place is still about ${walkMinutes} minutes by walking from ${startStop.name}.`,
          'For this last stretch, take a short walk only if the route is comfortable; otherwise prefer a share auto.',
          'Use Rapido/bike taxi only if RTC and share auto are not practical.',
        ],
        lastMile: `Avoid walking the full ${roadDistance.toFixed(1)} km unless you are comfortable with the route.`,
        tip: 'RTC gets you to the nearest stop; share auto is the better fallback for a long last mile, with Rapido last.',
        confidence: 'medium',
        source: 'local',
      };
    }
    return {
      routeTitle: 'Short walk',
      totalTime: `${walkMinutes} - ${walkMinutes + 6} min`,
      fare: 'Rs 0',
      steps: [
        `Your nearest RTC stop is ${startStop.name}.`,
        `The pinned destination is also closest to ${endStop.name}, so an RTC bus is not useful for this short distance.`,
        `Walk toward the marker location from ${endStop.name}.`,
      ],
      lastMile: `The marker is about ${roadDistance.toFixed(1)} km from your current location by straight-line distance.`,
      tip: 'A bus is probably unnecessary for this short hop unless the walking route is blocked.',
      confidence: 'high',
      source: 'local',
    };
  }

  const steps = [
    walkToStart > 10
      ? `Reach your nearest RTC boarding stop, ${startStop.name}. If walking there takes about ${walkToStart} minutes, use a share auto first; Rapido only if needed.`
      : `Walk about ${walkToStart} minutes to your nearest RTC boarding stop, ${startStop.name}.`,
  ];

  if (noUsefulRtcHint && shouldAvoidWalkOnly) {
    const rideFare = Math.max(30, Math.round(roadDistance * 18 / 10) * 10);
    steps.push(`First try RTC from ${startStop.name} toward a major interchange such as ${STOPS[0].name}.`);
    steps.push(`From the interchange, ask for a TSRTC bus toward ${endStop.name}, then get down there.`);
    steps.push('If the RTC wait is too long, take a share auto from the nearest main road toward the destination.');
    steps.push('Use Rapido/bike taxi only as the last fallback.');
    steps.push(`After getting down near ${endStop.name}, continue to the pinned marker by short walk or share auto depending on distance.`);
    return {
      routeTitle: 'RTC first, fallback if unavailable',
      totalTime: `${Math.max(12, Math.round(roadDistance * 4))} - ${Math.max(20, Math.round(roadDistance * 6))} min`,
      fare: `Rs ${rideFare} - Rs ${rideFare + 60}`,
      steps,
      lastMile: `The marker is nearest to ${endStop.name}; use a short walk only when it is under 10 minutes, otherwise share auto before Rapido.`,
      tip: 'RTC is the first option. If buses are not available soon, share auto is next and Rapido is last priority.',
      confidence: 'medium',
      source: 'local',
    };
  }

  if (directRoutes.length) {
    steps.push(`Board ${routeNames(directRoutes)} toward ${endStop.name}.`);
    steps.push(`Stay on the bus until ${endStop.name}, the closest known stop to your pinned destination.`);
  } else {
    const interchange = STOPS.find((stop) => stop.name === 'Secunderabad Bus Stand') || STOPS[0];
    steps.push(startRoutes.length
      ? `Board ${routeNames(startRoutes)} from ${startStop.name} toward a major interchange such as ${interchange.name}.`
      : `Board the next TSRTC service from ${startStop.name} toward a major interchange such as ${interchange.name}.`);
    steps.push(endRoutes.length
      ? `From there, transfer to ${routeNames(endRoutes)} toward ${endStop.name}.`
      : `From there, take a local TSRTC connection toward ${endStop.name}.`);
  }

  steps.push(`Get down at ${endStop.name}.`);
  steps.push(walkFromEnd > 10
    ? `From ${endStop.name}, take a share auto for the last mile; use Rapido only if no share auto is available.`
    : `Walk about ${walkFromEnd} minutes from ${endStop.name} to the marker location.`);

  return {
    routeTitle: directRoutes.length ? directRoutes[0] : 'TSRTC bus with one transfer',
    totalTime: `${Math.max(20, totalMin - 10)} - ${totalMin + 15} min`,
    fare: `Rs ${fareLow} - Rs ${fareHigh}`,
    steps,
    lastMile: walkFromEnd > 10
      ? `Last mile from ${endStop.name} is about ${walkFromEnd} minutes on foot, so prefer share auto and use Rapido as fallback.`
      : `The marker is nearest to ${endStop.name}, about ${endStop.distance.toFixed(1)} km away by straight-line distance.`,
    tip: noUsefulRtcHint
      ? 'If RTC is not available nearby, share auto is the next best choice; book Rapido only when needed.'
      : 'Use the live map before boarding; traffic and running buses can change the best choice.',
    confidence: directRoutes.length ? 'high' : 'medium',
    source: 'local',
  };
};

const normalizeStep = (step) => {
  if (typeof step === 'string') return step;
  if (step?.text) return String(step.text);
  if (step?.instruction) return String(step.instruction);
  if (step?.description) return String(step.description);
  return '';
};

const normalizePlan = (plan, fallback) => {
  const steps = Array.isArray(plan?.steps)
    ? plan.steps.map(normalizeStep).filter(Boolean)
    : [];

  return {
    routeTitle: plan?.routeTitle || fallback.routeTitle,
    totalTime: plan?.totalTime || fallback.totalTime,
    fare: plan?.fare || fallback.fare,
    steps: steps.length ? steps : fallback.steps,
    lastMile: plan?.lastMile || fallback.lastMile,
    tip: plan?.tip || fallback.tip,
    confidence: plan?.confidence || fallback.confidence,
    source: steps.length ? (plan?.source || 'ai') : fallback.source,
  };
};

export default function JourneyPlanner({ buses = [], userLocation, destinationPin, pinMode, onEnablePinMode, onClose }) {
  const origin = userLocation || DEFAULT_ORIGIN;
  const destination = destinationPin;
  const activeBuses = useMemo(() => buses.filter((bus) => bus.is_active && bus.latitude && bus.longitude), [buses]);
  const startStop = useMemo(() => getNearest(origin), [origin]);
  const endStop = useMemo(() => (destination ? getNearest(destination) : null), [destination]);
  const fallbackPlan = useMemo(() => {
    if (!destination || !endStop) return null;
    return buildLocalPlan({ startStop, endStop, origin, destination, activeBusCount: activeBuses.length });
  }, [activeBuses.length, destination, endStop, origin, startStop]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!destination || !fallbackPlan) {
      setPlan(null);
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setPlan(null);

    backend.ai.planJourney({ origin, destination, startStop, endStop, activeBuses, availableRoutes: ROUTE_LIST, allStops: STOPS })
      .then((aiPlan) => {
        if (!cancelled) setPlan(normalizePlan(aiPlan, fallbackPlan));
      })
      .catch(() => {
        if (!cancelled) {
          setPlan(fallbackPlan);
          setError('AI planner unavailable. Showing RTC fallback steps.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeBuses, destination, endStop, fallbackPlan, origin, startStop]);

  return (
    <section className="journey-output-card">
      <button className="journey-close" onClick={onClose} aria-label="Close journey planner"><X size={22} /></button>
      <div className="journey-output-head">
        <div className="journey-icon"><Route size={25} /></div>
        <div>
          <h2>Journey Planner</h2>
          <p>{destinationPin ? `${startStop.name} to ${endStop?.name}` : 'Drop a destination marker on the map'}</p>
        </div>
      </div>

      {!destinationPin && (
        <button className={pinMode ? 'planner-drop active' : 'planner-drop'} onClick={onEnablePinMode}>
          <MapPin size={18} />
          {pinMode ? 'Tap the map to set destination' : 'Drop destination marker'}
        </button>
      )}

      {destinationPin && loading && !plan && (
        <div className="journey-ai-wait">
          <RefreshCw size={18} />
          <span>Planning RTC journey with AI...</span>
        </div>
      )}

      {destinationPin && plan && (
        <>
          <div className="journey-status-row">
            <span className={loading ? 'journey-status loading' : 'journey-status'}>
              {loading ? <RefreshCw size={15} /> : <CheckCircle2 size={15} />}
              {loading ? 'Checking AI route' : `${plan.source === 'local' ? 'Local' : 'AI'} route ready`}
            </span>
            {error && <span className="journey-status warning"><AlertCircle size={15} /> {error}</span>}
          </div>

          <div className="journey-summary-grid">
            <div><span>ROUTE</span><b>{plan.routeTitle}</b></div>
            <div><span>TOTAL TIME</span><b>{plan.totalTime}</b></div>
            <div><span>FARE</span><b className="fare">{plan.fare}</b></div>
          </div>

          <h3 className="step-heading">STEP-BY-STEP</h3>
          <ol className="journey-steps">
            {plan.steps.map((step, index) => (
              <li key={`${index}-${step}`}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>

          <div className="last-mile-box">
            <b>Last mile</b>
            <p>{plan.lastMile}</p>
          </div>

          <div className="journey-tip">{plan.tip}</div>

          <button className="replan-btn" onClick={onEnablePinMode}><RefreshCw size={18} /> Replan Journey</button>
        </>
      )}
    </section>
  );
}
