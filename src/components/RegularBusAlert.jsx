import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const ALERT_KEY = 'chooseit_regular_alerts';

export default function RegularBusAlert({ buses, open, onClose }) {
  const [alerts, setAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ALERT_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [busNumber, setBusNumber] = useState('');

  useEffect(() => {
    localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
  }, [alerts]);

  if (!open) return null;

  const matches = alerts
    .map((alert) => buses.find((bus) => bus.bus_number?.toLowerCase() === alert.toLowerCase()))
    .filter(Boolean);

  return (
    <section className="floating-panel alert-panel">
      <button className="close-btn" onClick={onClose}><X size={17} /></button>
      <h2><Bell size={18} /> Regular Bus Alert</h2>
      <p>Save buses you ride often and check if they are live.</p>
      <div className="alert-form">
        <input value={busNumber} onChange={(e) => setBusNumber(e.target.value.toUpperCase())} placeholder="Bus number" />
        <button onClick={() => {
          if (!busNumber.trim()) return;
          setAlerts((old) => [...new Set([...old, busNumber.trim()])]);
          setBusNumber('');
        }}>Add</button>
      </div>
      <div className="alert-list">
        {alerts.map((alert) => (
          <button key={alert} onClick={() => setAlerts((old) => old.filter((item) => item !== alert))}>
            {alert}<X size={13} />
          </button>
        ))}
      </div>
      {matches.length ? matches.map((bus) => <div key={bus.id} className="alert-hit">{bus.bus_number} is live on {bus.route_name}</div>) : <small>No saved bus is live right now.</small>}
    </section>
  );
}
