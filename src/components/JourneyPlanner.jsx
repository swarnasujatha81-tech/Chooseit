import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MapPin, RefreshCw, Route, X } from 'lucide-react';
import { haversine, STOPS } from '@/data';

const DEFAULT_ORIGIN = { lat: 17.4937, lng: 78.3934 };
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const DEFAULT_BACKEND_PORTS = [8080, 8081, 8082, 8083, 8084, 8085];

const getNearest = (point) => STOPS
  .map((stop) => ({ ...stop, distance: haversine(point.lat, point.lng, stop.lat, stop.lng) }))
  .sort((a, b) => a.distance - b.distance)[0];

const routeLabel = (steps = []) => {
  const routes = [...new Set(steps.map((step) => step?.route).filter(Boolean))];
  return routes.length ? routes.join('/') : 'RTC route';
};

const formatFare = (fare) => {
  if (!fare) return 'Fare unavailable';
  const value = String(fare).replace(/rs\.?\s*/i, '').replace(/₹/g, '').trim();
  if (value.toLowerCase() === 'unavailable') return 'Fare unavailable';
  return `₹${value.replaceAll('-', ' - ₹')}`;
};

const formatDuration = (duration, estimatedDuration) => {
  const raw = duration || (estimatedDuration ? `${estimatedDuration} min` : '');
  if (!raw) return 'Time unavailable';
  return String(raw)
    .replace(/\bmin\b/g, 'minutes')
    .replace(/-/g, ' - ');
};

const stopsCount = (step) => Math.max(0, (Array.isArray(step?.stops) ? step.stops.length : 2) - 1);

const humanStep = (step, index, totalSteps) => {
  if (!step?.route || !step?.from || !step?.to) {
    if (typeof step === 'string') return step;
    return 'Follow the RTC guidance shown for this part of the trip.';
  }

  const count = stopsCount(step);
  const stopText = count > 1 ? ` Stay on the bus for around ${count} stops.` : '';

  if (index === 0 && totalSteps === 1) {
    return `Board Route ${step.route} from ${step.from} toward ${step.to}.${stopText}`;
  }

  if (index === 0) {
    return `Board Route ${step.route} from ${step.from} toward ${step.to}.${stopText}`;
  }

  if (index === totalSteps - 1) {
    return `At ${step.from}, change to Route ${step.route} toward ${step.to}. Get down near ${step.to}.${stopText}`;
  }

  return `At ${step.from}, continue by Route ${step.route} toward ${step.to}.${stopText}`;
};

const makeRouteTitle = (data) => {
  const title = routeLabel(data?.steps);
  if (data?.interchange) return `${title} via ${data.interchange}`;
  if ((data?.transfers || 0) > 0 && data?.steps?.[1]?.from) return `${title} via ${data.steps[1].from}`;
  return title;
};

const makeLastMile = (data) => {
  const stop = data?.to || 'the destination stop';
  const walkDistance = Number(data?.walking_distance_m || 0);
  const walkText = walkDistance > 0
    ? `Your destination is about ${Math.max(2, Math.round(walkDistance / 75))} minutes from ${stop}.`
    : `Your destination is close to ${stop}.`;

  return `${walkText} A short walk is the first choice. Use a share auto if you have luggage or the lane is crowded, and keep Rapido only as the last option.`;
};

const makeTravelTip = (data) => {
  const names = [data?.from, data?.to, data?.interchange, ...(data?.path || [])].filter(Boolean).join(' ').toLowerCase();
  if (names.includes('secunderabad')) return 'Avoid Secunderabad interchange after 6 PM when platforms and approach roads get busy.';
  if (names.includes('kukatpally') || names.includes('jntu')) return 'Kukatpally and JNTU stops get crowded during office hours, so board from the first clear bay you see.';
  if (names.includes('koti')) return 'Koti routes move slower in market traffic; keep a few extra minutes if you are travelling in the evening.';
  if (names.includes('hitech') || names.includes('madhapur')) return 'Hitech City traffic builds up after office hours, so prefer the earliest direct RTC service.';
  if ((data?.transfers || 0) > 1) return 'For this trip, stay alert at each interchange and confirm the route number before boarding the next bus.';
  return 'Direct RTC buses are usually the easiest option; check the live map once before walking to the stop.';
};

const makeAlerts = (data, activeBusCount) => {
  const alerts = [];
  if ((data?.transfers || 0) > 1) alerts.push(`Multiple changes are involved. Keep ${data?.interchange || 'the first interchange'} as your main checkpoint.`);
  if (activeBusCount === 0) alerts.push('No live buses are visible right now, so wait times may vary at the stop.');
  if (data?.score > 100) alerts.push('This route has a higher travel score, so expect slower movement or more changes.');
  return alerts.slice(0, 2);
};

const normalizeJourneyPlan = (data, activeBusCount) => {
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const narration = data?.narration || {};
  return {
    routeTitle: makeRouteTitle(data),
    timeRange: formatDuration(narration.summary?.duration || data?.duration, data?.estimated_duration_min),
    fareRange: formatFare(narration.summary?.fare || data?.fare),
    steps: steps.length
      ? steps.map((step, index) => humanStep(step, index, steps.length))
      : (narration.instructions || ['No connected RTC route was found for these stops. Try a nearby major stop.']),
    alerts: makeAlerts(data, activeBusCount),
    travelTip: makeTravelTip(data),
    lastMile: makeLastMile(data),
    activeBuses: activeBusCount,
    score: data?.score,
    transfers: data?.transfers || 0,
    aiAssisted: Boolean(data?.narration),
    fallback: data?.type === 'not_found',
    raw: data,
  };
};

const getApiErrorMessage = (error, baseUrl = API_BASE_URL) => {
  if (error?.name === 'AbortError') return '';
  return `Route engine is not reachable. Start the backend on ${baseUrl} and retry.`;
};

export default function JourneyPlanner({ buses = [], userLocation, destinationPin, pinMode, onEnablePinMode, onClose }) {
  const origin = userLocation || DEFAULT_ORIGIN;
  const destination = destinationPin;
  const activeBusCount = useMemo(
    () => buses.filter((bus) => bus.is_active && bus.latitude && bus.longitude).length,
    [buses],
  );
  const startStop = useMemo(() => getNearest(origin), [origin]);
  const endStop = useMemo(() => (destination ? getNearest(destination) : null), [destination]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [apiBase, setApiBase] = useState(API_BASE_URL);
  const [healthNonce, setHealthNonce] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHealthNonce((value) => value + 1);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let aborted = false;
    (async () => {
      setBackendStatus('checking');
      // candidate URLs: configured VITE_API_URL first, then localhost ports
      const candidates = [];
      if (import.meta.env.VITE_API_URL) candidates.push(import.meta.env.VITE_API_URL.replace(/\/$/, ''));
      DEFAULT_BACKEND_PORTS.forEach((p) => candidates.push(`http://localhost:${p}`));

      for (const base of candidates) {
        if (aborted) return;
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(`${base}/health`, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            setApiBase(base);
            setBackendConnected(true);
            setBackendStatus('connected');
            return;
          }
        } catch (e) {
          // try next
        }
      }
      setBackendConnected(false);
      setBackendStatus('disconnected');
    })();

    return () => { aborted = true; };
  }, [healthNonce]);

  useEffect(() => {
    if (!destination) {
      setPlan(null);
      setError('');
      return undefined;
    }

    // If origin and destination's nearest major stop are the same, avoid calling backend
    if (endStop && startStop && endStop.name === startStop.name) {
      setPlan(null);
      setLoading(false);
      setError('Destination is the same as your origin. Drop a destination marker farther away or choose a different stop.');
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPlan(null);

    fetch(`${apiBase}/plan-journey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: origin,
        to: destination,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        console.log('Journey API Response:', data);

        if (!response.ok) {
          throw new Error(data?.error || `Journey API failed with ${response.status}`);
        }

        return data;
      })
      .then((data) => {
        setBackendConnected(true);
        setBackendStatus('connected');
        setPlan(normalizeJourneyPlan(data, activeBusCount));
      })
      .catch((apiError) => {
        if (apiError.name === 'AbortError') return;
        console.error('Journey API Error:', apiError);
        setBackendConnected(false);
        setBackendStatus('disconnected');
        setError(getApiErrorMessage(apiError, apiBase));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [activeBusCount, destination, origin, retryNonce]);

  return (
    <section className="journey-output-card">
      <button className="journey-close" onClick={onClose} aria-label="Close journey planner"><X size={22} /></button>
      <div className="journey-output-head">
        <div className="journey-icon"><Route size={25} /></div>
        <div>
          <h2>Journey Planner</h2>
          <p>{destinationPin ? `${startStop.name} → ${endStop?.name}` : 'Drop a destination marker on the map'}</p>
        </div>
      </div>

      <div className="journey-status-row">
        <span className={backendConnected ? 'journey-status' : 'journey-status warning'}>
          {backendStatus === 'checking' && <RefreshCw size={15} />}
          {backendStatus === 'connected' && <CheckCircle2 size={15} />}
          {backendStatus === 'disconnected' && <AlertCircle size={15} />}
          {backendConnected ? 'Backend Connected' : 'Backend Disconnected'}
        </span>
        <button className="journey-health-retry" onClick={() => setHealthNonce((value) => value + 1)} disabled={backendStatus === 'checking'}>
          <RefreshCw size={15} /> Retry connection
        </button>
      </div>

      {!destinationPin && (
        <button className={pinMode ? 'planner-drop active' : 'planner-drop'} onClick={onEnablePinMode}>
          <MapPin size={18} />
          {pinMode ? 'Tap the map to set destination' : 'Drop destination marker'}
        </button>
      )}

      {destinationPin && loading && !plan && (
        <div className="journey-ai-wait">
          <RefreshCw size={20} />
          <span>Finding the best RTC route...</span>
        </div>
      )}

      {destinationPin && error && !plan && (
        <>
          <div className="journey-alert-banner">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
          <button className="replan-btn" onClick={() => setRetryNonce((value) => value + 1)} disabled={loading}>
            <RefreshCw size={18} /> Retry Journey
          </button>
          <button className="replan-btn" onClick={onEnablePinMode}><MapPin size={18} /> Change Destination</button>
        </>
      )}

      {destinationPin && plan && (
        <>
          <div className="journey-chip-row">
            <span>Route ready</span>
            {plan.activeBuses > 0 && <span>{plan.activeBuses} active buses</span>}
            {plan.aiAssisted && <span>AI assisted</span>}
            {plan.fallback && <span>RTC fallback route</span>}
          </div>

          <div className="journey-summary-grid">
            <div><span>ROUTE</span><b>{plan.routeTitle}</b></div>
            <div><span>TOTAL TIME</span><b>{plan.timeRange}</b></div>
            <div><span>FARE</span><b className="fare">{plan.fareRange}</b></div>
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

          <div className="journey-tip">
            <b>Smart travel tip</b>
            <p>{plan.travelTip}</p>
          </div>

          {plan.alerts.length > 0 && (
            <div className="journey-alerts">
              {plan.alerts.map((alert) => (
                <div key={alert} className="journey-alert-banner">
                  <AlertCircle size={16} />
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          )}

          <button className="replan-btn" onClick={() => setRetryNonce((value) => value + 1)} disabled={loading}>
            <RefreshCw size={18} /> Replan Journey
          </button>
          <button className="replan-btn" onClick={onEnablePinMode}><MapPin size={18} /> Change Destination</button>
        </>
      )}
    </section>
  );
}
