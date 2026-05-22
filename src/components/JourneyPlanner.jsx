import { RefreshCw, X } from 'lucide-react';
import { haversine, STOPS } from '@/data';

const getNearest = (point) => STOPS
  .map((stop) => ({ ...stop, distance: haversine(point.lat, point.lng, stop.lat, stop.lng) }))
  .sort((a, b) => a.distance - b.distance)[0];

export default function JourneyPlanner({ userLocation, destinationPin, pinMode, onEnablePinMode, onClose }) {
  const origin = userLocation || { lat: 17.4937, lng: 78.3934 };
  const destination = destinationPin || { lat: 17.478, lng: 78.56 };
  const startStop = getNearest(origin);
  const endStop = getNearest(destination);

  const steps = [
    `Walk about 150m from your current location to the ${startStop.name} bus stop (on the side heading toward Secunderabad).`,
    'Look for direct bus Route 17H/219 (Miyapur to ECIL) or Route 31H (KPHB to ECIL). These will take you directly toward AS Rao Nagar.',
    'If a direct bus is not arriving, board any bus heading to Secunderabad, such as Route 219, 226, or 10H.',
    'Get down at Secunderabad Bus Station (near the railway station).',
    'From Secunderabad, transfer to Route 16A, 17H, or 37 to reach AS Rao Nagar.',
    `Alight at the ${endStop.name}. Your destination is just a short 5-minute walk from there.`,
  ];

  return (
    <section className="journey-output-card">
      <button className="journey-close" onClick={onClose}><X size={26} /></button>
      <div className="journey-output-head">
        <div className="journey-icon">📍</div>
        <div>
          <h2>Journey Planner</h2>
          <p>{destinationPin ? '📍 Pin set · AI route ready' : 'Drop a pin to generate a route'}</p>
        </div>
      </div>

      {!destinationPin && (
        <button className={pinMode ? 'planner-drop active' : 'planner-drop'} onClick={onEnablePinMode}>
          {pinMode ? 'Tap anywhere on the map to set destination' : 'Drop destination marker'}
        </button>
      )}

      {destinationPin && (
        <>
          <div className="journey-summary-grid">
            <div><span>ROUTE</span><b>RTC bus + short walk</b></div>
            <div><span>TOTAL TIME</span><b>⏱ 90 - 120 minutes</b></div>
            <div><span>FARE</span><b className="fare">₹45 - ₹65</b></div>
          </div>

          <h3 className="step-heading">STEP-BY-STEP</h3>
          <ol className="journey-steps">
            {steps.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>

          <div className="last-mile-box">
            <b>🛵 Last Mile</b>
            <p>Entirely doable by TSRTC bus and a short walk. No auto/cab required unless you have heavy luggage. 🚶</p>
          </div>

          <div className="journey-tip">
            💡 Avoid traveling between 5:00 PM and 8:30 PM, as traffic at Balanagar and Secunderabad can significantly delay your trip. Grab a window seat on the left side to stay cool! 🚌
          </div>

          <button className="replan-btn" onClick={onEnablePinMode}><RefreshCw size={18} /> Replan Journey</button>
        </>
      )}
    </section>
  );
}
